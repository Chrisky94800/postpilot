// PostPilot — Edge Function : publish-scheduled-posts
// Publie sur LinkedIn tous les posts avec status='approved' et scheduled_at <= NOW().
// Appelée par le cron n8n (workflow 03, toutes les 5 min) ou manuellement.
// Remplace la logique complexe n8n qui échouait à cause du placeholder service role key.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'npm:zod@3'

// ─── CORS ─────────────────────────────────────────────────────────────────────

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-n8n-api-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface OAuthTokens {
  access_token: string
  refresh_token?: string
  expires_at?: string
  linkedin_person_id?: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

// ─── Publication LinkedIn ──────────────────────────────────────────────────────

async function publishToLinkedIn(
  content: string,
  personId: string,
  accessToken: string,
): Promise<{ success: boolean; postId?: string; error?: string }> {
  const body = {
    author: `urn:li:person:${personId}`,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: { text: content },
        shareMediaCategory: 'NONE',
      },
    },
    visibility: {
      'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
    },
  }

  const res = await fetch('https://api.linkedin.com/v2/ugcPosts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'X-Restli-Protocol-Version': '2.0.0',
      'LinkedIn-Version': '202402',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (res.ok) {
    const data = await res.json() as { id?: string }
    return { success: true, postId: data.id }
  }

  const errText = await res.text()
  console.error(`[publish] LinkedIn API ${res.status}: ${errText}`)
  return { success: false, error: `LinkedIn API ${res.status}: ${errText}` }
}

// ─── Handler principal ─────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    console.log('[publish-scheduled-posts] start')

    // ── 1. Posts approuvés dont l'heure est passée ─────────────────────────────
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select('id, content, organization_id, created_by, platform_type')
      .eq('status', 'approved')
      .lte('scheduled_at', new Date().toISOString())
      .is('deleted_at', null)
      .limit(20)

    if (postsError) throw postsError

    if (!posts || posts.length === 0) {
      console.log('[publish-scheduled-posts] no posts to publish')
      return jsonResponse({ published: 0, failed: 0, message: 'Aucun post à publier' })
    }

    console.log(`[publish-scheduled-posts] ${posts.length} post(s) à publier`)

    let published = 0
    let failed = 0

    for (const post of posts) {
      try {
        // ── 2. Token LinkedIn de l'organisation ──────────────────────────────────
        const { data: platform } = await supabase
          .from('platforms')
          .select('oauth_tokens, token_expires_at, is_active')
          .eq('organization_id', post.organization_id)
          .eq('platform_type', 'linkedin')
          .eq('is_active', true)
          .maybeSingle()

        if (!platform?.oauth_tokens) {
          console.warn(`[publish] No LinkedIn token for org ${post.organization_id}`)
          await markFailed(supabase, post.id, post.organization_id, post.created_by, 'Aucun compte LinkedIn connecté')
          failed++
          continue
        }

        const tokens = platform.oauth_tokens as OAuthTokens

        // ── 3. Vérifier expiration du token ──────────────────────────────────────
        if (platform.token_expires_at && new Date(platform.token_expires_at) <= new Date()) {
          console.warn(`[publish] Token expired for org ${post.organization_id}`)
          await supabase.from('notifications').insert({
            organization_id: post.organization_id,
            user_id: post.created_by,
            type: 'token_expired',
            title: 'LinkedIn déconnecté',
            message: 'Votre token LinkedIn a expiré. Reconnectez votre compte dans les Paramètres.',
            metadata: { post_id: post.id },
          })
          await markFailed(supabase, post.id, post.organization_id, post.created_by, 'Token LinkedIn expiré')
          failed++
          continue
        }

        if (!tokens.access_token || !tokens.linkedin_person_id) {
          await markFailed(supabase, post.id, post.organization_id, post.created_by, 'Token LinkedIn invalide (access_token ou person_id manquant)')
          failed++
          continue
        }

        // ── 4. Publication LinkedIn ───────────────────────────────────────────────
        const result = await publishToLinkedIn(
          post.content as string,
          tokens.linkedin_person_id,
          tokens.access_token,
        )

        if (result.success) {
          // ── 5a. Succès → update post + notification ──────────────────────────
          await supabase
            .from('posts')
            .update({
              status: 'published',
              published_at: new Date().toISOString(),
              platform_post_id: result.postId ?? null,
            })
            .eq('id', post.id)

          if (post.created_by) {
            await supabase.from('notifications').insert({
              organization_id: post.organization_id,
              user_id: post.created_by,
              type: 'post_published',
              title: 'Post publié sur LinkedIn',
              message: 'Votre post a été publié avec succès sur LinkedIn.',
              metadata: { post_id: post.id, platform_post_id: result.postId },
            })
          }

          console.log(`[publish] OK post=${post.id} linkedin_id=${result.postId}`)
          published++
        } else {
          // ── 5b. Échec LinkedIn API ───────────────────────────────────────────
          await markFailed(supabase, post.id, post.organization_id, post.created_by, result.error ?? 'Erreur LinkedIn inconnue')
          failed++
        }
      } catch (err) {
        console.error(`[publish] Unhandled error for post ${post.id}:`, err)
        await markFailed(supabase, post.id, post.organization_id, post.created_by, (err as Error).message)
        failed++
      }
    }

    console.log(`[publish-scheduled-posts] done published=${published} failed=${failed}`)
    return jsonResponse({ published, failed, total: posts.length })
  } catch (err) {
    console.error('[publish-scheduled-posts] ERROR', err)
    if (err instanceof z.ZodError) {
      return jsonResponse({ error: 'Validation failed', details: err.flatten() }, 400)
    }
    return jsonResponse({ error: (err as Error).message ?? 'Internal server error' }, 500)
  }
})

// ─── Helper : marquer un post comme failed + notification ────────────────────

async function markFailed(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  postId: string,
  organizationId: string,
  createdBy: string | null,
  reason: string,
) {
  await supabase.from('posts').update({ status: 'failed' }).eq('id', postId)

  if (createdBy) {
    await supabase.from('notifications').insert({
      organization_id: organizationId,
      user_id: createdBy,
      type: 'post_failed',
      title: 'Échec de publication',
      message: `Votre post n'a pas pu être publié : ${reason}`,
      metadata: { post_id: postId },
    })
  }

  console.warn(`[publish] FAILED post=${postId} reason=${reason}`)
}
