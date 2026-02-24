// PostPilot — Edge Function : webhook-from-n8n
// Reçoit les callbacks des workflows n8n. Authentifié par X-N8N-Api-Key.
// Met à jour les posts, insère les versions, crée les notifications.

import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'npm:zod@3'

// ─── CORS (n8n appelle depuis le serveur → pas de CORS navigateur requis,
//          mais on l'ajoute pour la cohérence et les tests manuels) ───────────

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, x-n8n-api-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// ─── Schémas des actions (discriminated union) ────────────────────────────────

const PostGeneratedSchema = z.object({
  action: z.literal('post_generated'),
  post_id: z.string().uuid(),
  content: z.string().min(1),
  version_number: z.number().int().positive(),
})

const PostRevisedSchema = z.object({
  action: z.literal('post_revised'),
  post_id: z.string().uuid(),
  content: z.string().min(1),
  version_number: z.number().int().positive(),
  feedback: z.string().optional(),
})

const PostPublishedSchema = z.object({
  action: z.literal('post_published'),
  post_id: z.string().uuid(),
  platform_post_id: z.string().min(1),
  published_at: z.string().datetime(),
})

const PostFailedSchema = z.object({
  action: z.literal('post_failed'),
  post_id: z.string().uuid(),
  error_message: z.string().optional(),
})

const AnalyticsCollectedSchema = z.object({
  action: z.literal('analytics_collected'),
  post_id: z.string().uuid(),
  organization_id: z.string().uuid(),
  platform_type: z.string().default('linkedin'),
  metrics: z.object({
    likes_count: z.number().int().min(0).default(0),
    comments_count: z.number().int().min(0).default(0),
    shares_count: z.number().int().min(0).default(0),
    impressions_count: z.number().int().min(0).default(0),
    clicks_count: z.number().int().min(0).default(0),
    engagement_rate: z.number().min(0).optional(),
  }),
})

const TokenExpiredSchema = z.object({
  action: z.literal('token_expired'),
  organization_id: z.string().uuid(),
  platform_type: z.string().default('linkedin'),
})

const RssArticleFoundSchema = z.object({
  action: z.literal('rss_article_found'),
  organization_id: z.string().uuid(),
  article_title: z.string().min(1),
  article_url: z.string().url(),
  article_summary: z.string().optional(),
  feed_title: z.string().optional(),
})

const EventReminderSchema = z.object({
  action: z.literal('event_reminder'),
  organization_id: z.string().uuid(),
  event_id: z.string().uuid(),
  event_title: z.string().min(1),
  event_date: z.string().min(1),
  days_until: z.number().int().min(0),
})

const InsightsGeneratedSchema = z.object({
  action: z.literal('insights_generated'),
  organization_id: z.string().uuid(),
  insights: z.array(z.string()).min(1).max(10),
  period_days: z.number().int().positive().default(30),
})

const ActionSchema = z.discriminatedUnion('action', [
  PostGeneratedSchema,
  PostRevisedSchema,
  PostPublishedSchema,
  PostFailedSchema,
  AnalyticsCollectedSchema,
  TokenExpiredSchema,
  RssArticleFoundSchema,
  EventReminderSchema,
  InsightsGeneratedSchema,
])

type Action = z.infer<typeof ActionSchema>

// ─── Helpers ──────────────────────────────────────────────────────────────────

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

/** Récupère le post et ses champs utiles (organization_id, created_by, title) */
async function fetchPost(
  supabase: SupabaseClient,
  postId: string,
) {
  const { data, error } = await supabase
    .from('posts')
    .select('id, organization_id, created_by, title, platform_type')
    .eq('id', postId)
    .single()

  if (error || !data) throw new Error(`Post not found: ${postId}`)
  return data
}

/** Insère une notification pour un utilisateur donné */
async function insertNotification(
  supabase: SupabaseClient,
  params: {
    organization_id: string
    user_id: string
    type: string
    title: string
    message: string
    metadata?: Record<string, unknown>
  },
) {
  const { error } = await supabase.from('notifications').insert(params)
  if (error) console.error('[webhook-from-n8n] notification insert error', error)
}

// ─── Handlers par action ──────────────────────────────────────────────────────

async function handlePostGenerated(
  supabase: SupabaseClient,
  data: z.infer<typeof PostGeneratedSchema>,
) {
  const post = await fetchPost(supabase, data.post_id)

  // 1. Mise à jour du post : statut → pending_review + contenu généré
  const { error: updateError } = await supabase
    .from('posts')
    .update({ status: 'pending_review', content: data.content })
    .eq('id', data.post_id)

  if (updateError) throw updateError

  // 2. Insertion de la version
  const { error: versionError } = await supabase.from('post_versions').insert({
    post_id: data.post_id,
    organization_id: post.organization_id,
    version_number: data.version_number,
    content: data.content,
    created_by: post.created_by,
  })
  if (versionError) console.error('[webhook-from-n8n] version insert error', versionError)

  // 3. Notification au créateur du post
  if (post.created_by) {
    await insertNotification(supabase, {
      organization_id: post.organization_id,
      user_id: post.created_by,
      type: 'post_ready',
      title: 'Votre post est prêt pour révision',
      message: `Le post "${post.title ?? 'Sans titre'}" a été généré par l'IA et attend votre validation.`,
      metadata: { post_id: data.post_id },
    })
  }
}

async function handlePostRevised(
  supabase: SupabaseClient,
  data: z.infer<typeof PostRevisedSchema>,
) {
  const post = await fetchPost(supabase, data.post_id)

  // 1. Mise à jour du contenu (statut reste pending_review)
  const { error: updateError } = await supabase
    .from('posts')
    .update({ content: data.content })
    .eq('id', data.post_id)

  if (updateError) throw updateError

  // 2. Nouvelle version avec le feedback qui l'a déclenché
  const { error: versionError } = await supabase.from('post_versions').insert({
    post_id: data.post_id,
    organization_id: post.organization_id,
    version_number: data.version_number,
    content: data.content,
    feedback: data.feedback,
    created_by: post.created_by,
  })
  if (versionError) console.error('[webhook-from-n8n] version insert error', versionError)

  // 3. Notification de révision disponible
  if (post.created_by) {
    await insertNotification(supabase, {
      organization_id: post.organization_id,
      user_id: post.created_by,
      type: 'post_ready',
      title: 'Votre post révisé est prêt',
      message: `La révision du post "${post.title ?? 'Sans titre'}" est disponible.`,
      metadata: { post_id: data.post_id, version_number: data.version_number },
    })
  }
}

async function handlePostPublished(
  supabase: SupabaseClient,
  data: z.infer<typeof PostPublishedSchema>,
) {
  const post = await fetchPost(supabase, data.post_id)

  // 1. Mise à jour du post : published + platform_post_id
  const { error } = await supabase
    .from('posts')
    .update({
      status: 'published',
      platform_post_id: data.platform_post_id,
      published_at: data.published_at,
    })
    .eq('id', data.post_id)

  if (error) throw error

  // 2. Notification de publication réussie
  if (post.created_by) {
    await insertNotification(supabase, {
      organization_id: post.organization_id,
      user_id: post.created_by,
      type: 'post_published',
      title: 'Post publié avec succès',
      message: `"${post.title ?? 'Votre post'}" a été publié sur ${post.platform_type}.`,
      metadata: {
        post_id: data.post_id,
        platform_post_id: data.platform_post_id,
        platform_type: post.platform_type,
      },
    })
  }
}

async function handlePostFailed(
  supabase: SupabaseClient,
  data: z.infer<typeof PostFailedSchema>,
) {
  const post = await fetchPost(supabase, data.post_id)

  // 1. Statut → failed
  const { error } = await supabase
    .from('posts')
    .update({ status: 'failed' })
    .eq('id', data.post_id)

  if (error) throw error

  // 2. Notification d'échec
  if (post.created_by) {
    await insertNotification(supabase, {
      organization_id: post.organization_id,
      user_id: post.created_by,
      type: 'post_failed',
      title: 'Échec de publication',
      message:
        data.error_message ??
        `La publication de "${post.title ?? 'votre post'}" a échoué. Vérifiez votre connexion ${post.platform_type}.`,
      metadata: {
        post_id: data.post_id,
        error: data.error_message,
      },
    })
  }
}

async function handleAnalyticsCollected(
  supabase: SupabaseClient,
  data: z.infer<typeof AnalyticsCollectedSchema>,
) {
  const { metrics, post_id, organization_id, platform_type } = data

  // Calcul du taux d'engagement si non fourni
  const engagement_rate =
    metrics.engagement_rate ??
    (metrics.impressions_count > 0
      ? Number(
          (
            ((metrics.likes_count + metrics.comments_count + metrics.shares_count) /
              metrics.impressions_count) *
            100
          ).toFixed(2),
        )
      : null)

  const { error } = await supabase.from('post_analytics').insert({
    post_id,
    organization_id,
    platform_type,
    ...metrics,
    engagement_rate,
  })

  if (error) throw error
}

async function handleTokenExpired(
  supabase: SupabaseClient,
  data: z.infer<typeof TokenExpiredSchema>,
) {
  const { organization_id, platform_type } = data

  // 1. Désactivation du compte plateforme
  const { error } = await supabase
    .from('platforms')
    .update({ is_active: false })
    .eq('organization_id', organization_id)
    .eq('platform_type', platform_type)

  if (error) throw error

  // 2. Notification à tous les owners et admins de l'organisation
  const { data: members, error: membersError } = await supabase
    .from('organization_members')
    .select('user_id')
    .eq('organization_id', organization_id)
    .in('role', ['owner', 'admin'])

  if (membersError) throw membersError

  if (members && members.length > 0) {
    const platformLabel =
      platform_type.charAt(0).toUpperCase() + platform_type.slice(1)

    const { error: notifError } = await supabase.from('notifications').insert(
      members.map((m) => ({
        organization_id,
        user_id: m.user_id,
        type: 'token_expired',
        title: `Reconnectez votre compte ${platformLabel}`,
        message: `Votre connexion ${platformLabel} a expiré. Reconnectez votre compte dans les paramètres pour continuer à publier.`,
        metadata: { platform_type, organization_id },
      })),
    )
    if (notifError) console.error('[webhook-from-n8n] notif batch error', notifError)
  }
}

async function handleRssArticleFound(
  supabase: SupabaseClient,
  data: z.infer<typeof RssArticleFoundSchema>,
) {
  const { organization_id, article_title, article_url, article_summary, feed_title } = data

  const { data: members, error: membersError } = await supabase
    .from('organization_members')
    .select('user_id')
    .eq('organization_id', organization_id)
    .in('role', ['owner', 'admin'])

  if (membersError) throw membersError
  if (!members || members.length === 0) return

  const { error } = await supabase.from('notifications').insert(
    members.map((m) => ({
      organization_id,
      user_id: m.user_id,
      type: 'rss_found',
      title: 'Nouvel article pertinent trouvé',
      message: `"${article_title}" — ${feed_title ?? 'RSS'}`,
      metadata: { article_url, article_title, article_summary },
    })),
  )
  if (error) console.error('[webhook-from-n8n] rss notification error', error)
}

async function handleEventReminder(
  supabase: SupabaseClient,
  data: z.infer<typeof EventReminderSchema>,
) {
  const { organization_id, event_title, event_date, days_until, event_id } = data

  const { data: members, error: membersError } = await supabase
    .from('organization_members')
    .select('user_id')
    .eq('organization_id', organization_id)
    .in('role', ['owner', 'admin'])

  if (membersError) throw membersError
  if (!members || members.length === 0) return

  const { error } = await supabase.from('notifications').insert(
    members.map((m) => ({
      organization_id,
      user_id: m.user_id,
      type: 'event_reminder',
      title: `Événement dans ${days_until}j : ${event_title}`,
      message: `Pensez à créer un post pour "${event_title}" prévu le ${event_date}.`,
      metadata: { event_id, event_title, event_date, days_until },
    })),
  )
  if (error) console.error('[webhook-from-n8n] event_reminder notification error', error)
}

async function handleInsightsGenerated(
  supabase: SupabaseClient,
  data: z.infer<typeof InsightsGeneratedSchema>,
) {
  const { organization_id, insights, period_days } = data

  const { error } = await supabase.from('analytics_insights').insert({
    organization_id,
    insights,
    period_days,
  })
  if (error) throw error
}

// ─── Dispatch ─────────────────────────────────────────────────────────────────

async function dispatch(supabase: SupabaseClient, action: Action) {
  switch (action.action) {
    case 'post_generated':
      return handlePostGenerated(supabase, action)
    case 'post_revised':
      return handlePostRevised(supabase, action)
    case 'post_published':
      return handlePostPublished(supabase, action)
    case 'post_failed':
      return handlePostFailed(supabase, action)
    case 'analytics_collected':
      return handleAnalyticsCollected(supabase, action)
    case 'token_expired':
      return handleTokenExpired(supabase, action)
    case 'rss_article_found':
      return handleRssArticleFound(supabase, action)
    case 'event_reminder':
      return handleEventReminder(supabase, action)
    case 'insights_generated':
      return handleInsightsGenerated(supabase, action)
  }
}

// ─── Handler principal ────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    // ── Auth : X-N8N-Api-Key ──────────────────────────────────────────────────
    const expectedKey = Deno.env.get('N8N_API_KEY')
    if (!expectedKey) throw new Error('N8N_API_KEY not configured')

    const receivedKey = req.headers.get('x-n8n-api-key')
    if (receivedKey !== expectedKey) {
      return jsonResponse({ error: 'Unauthorized' }, 401)
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // ── Validation ────────────────────────────────────────────────────────────
    const raw = await req.json()
    const action = ActionSchema.parse(raw)

    console.log(`[webhook-from-n8n] action=${action.action}`)

    // ── Dispatch ──────────────────────────────────────────────────────────────
    await dispatch(supabase, action)

    console.log(`[webhook-from-n8n] OK action=${action.action}`)

    return jsonResponse({ success: true, action: action.action })
  } catch (err) {
    console.error('[webhook-from-n8n] ERROR', err)

    if (err instanceof z.ZodError) {
      return jsonResponse(
        { error: 'Validation failed', details: err.flatten() },
        400,
      )
    }

    return jsonResponse(
      { error: (err as Error).message ?? 'Internal server error' },
      500,
    )
  }
})
