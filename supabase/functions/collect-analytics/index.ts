// PostPilot — Edge Function : collect-analytics
// Collecte les métriques LinkedIn (likes, comments, shares, impressions) pour tous les
// posts publiés d'une organisation. Peut être appelée manuellement depuis l'UI ou
// par le cron n8n quotidien (workflow 04).
//
// Stratégie LinkedIn API :
//   1. Tente l'API moderne /rest/posts/{id} → retourne impressions + clicks
//   2. Fallback : /v2/socialActions/{urn}   → likes + comments + shares seulement

import { createClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'npm:zod@3'

// ─── CORS ─────────────────────────────────────────────────────────────────────

const CORS = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// ─── Validation ───────────────────────────────────────────────────────────────

const RequestSchema = z.object({
  organization_id: z.string().uuid().optional(), // absent = toutes les orgs
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

interface LinkedInStats {
  likes_count: number
  comments_count: number
  shares_count: number
  impressions_count: number
  clicks_count: number
}

async function fetchLinkedInStats(postUrn: string, accessToken: string): Promise<LinkedInStats | null> {
  // ── Tentative 1 : API moderne /rest/posts (LinkedIn-Version 202405) ────────
  // Retourne statistics.impressionCount, clickCount, likeCount, commentCount, repostCount
  try {
    const res = await fetch(
      `https://api.linkedin.com/rest/posts/${encodeURIComponent(postUrn)}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'LinkedIn-Version': '202405',
          'X-Restli-Protocol-Version': '2.0.0',
        },
      },
    )
    if (res.ok) {
      const data = await res.json() as {
        statistics?: {
          impressionCount?: number
          clickCount?: number
          likeCount?: number
          commentCount?: number
          repostCount?: number
        }
      }
      if (data.statistics) {
        console.log(`[collect-analytics] posts API OK for ${postUrn}`, data.statistics)
        return {
          likes_count:       data.statistics.likeCount      ?? 0,
          comments_count:    data.statistics.commentCount   ?? 0,
          shares_count:      data.statistics.repostCount    ?? 0,
          impressions_count: data.statistics.impressionCount ?? 0,
          clicks_count:      data.statistics.clickCount     ?? 0,
        }
      }
    } else {
      console.warn(`[collect-analytics] posts API ${res.status} for ${postUrn}`)
    }
  } catch (e) {
    console.warn('[collect-analytics] posts API exception', e)
  }

  // ── Tentative 2 : /v2/socialActions (likes + comments + shares) ────────────
  try {
    const res = await fetch(
      `https://api.linkedin.com/v2/socialActions/${encodeURIComponent(postUrn)}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'X-Restli-Protocol-Version': '2.0.0',
        },
      },
    )
    if (res.ok) {
      const data = await res.json() as {
        likes?:    { paging?: { total?: number }; totalElements?: number }
        comments?: { paging?: { total?: number }; totalElements?: number }
        shares?:   { paging?: { total?: number }; totalElements?: number }
      }
      console.log(`[collect-analytics] socialActions OK for ${postUrn}`)
      return {
        likes_count:       data.likes?.paging?.total    ?? data.likes?.totalElements    ?? 0,
        comments_count:    data.comments?.paging?.total ?? data.comments?.totalElements ?? 0,
        shares_count:      data.shares?.paging?.total   ?? data.shares?.totalElements   ?? 0,
        impressions_count: 0, // non disponible via socialActions
        clicks_count:      0,
      }
    } else {
      console.warn(`[collect-analytics] socialActions ${res.status} for ${postUrn}`)
    }
  } catch (e) {
    console.warn('[collect-analytics] socialActions exception', e)
  }

  return null
}

// ─── Handler principal ────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const raw = await req.json().catch(() => ({}))
    const { organization_id } = RequestSchema.parse(raw)

    console.log(`[collect-analytics] start org=${organization_id ?? 'all'}`)

    // ── 1. Posts publiés avec un platform_post_id ──────────────────────────────
    let query = supabase
      .from('posts')
      .select('id, organization_id, platform_post_id, platform_type')
      .eq('status', 'published')
      .not('platform_post_id', 'is', null)
      .is('deleted_at', null)
      .limit(100)

    if (organization_id) {
      query = query.eq('organization_id', organization_id)
    }

    const { data: posts, error: postsError } = await query
    if (postsError) throw postsError

    if (!posts || posts.length === 0) {
      return jsonResponse({ collected: 0, errors: 0, message: 'Aucun post publié à analyser' })
    }

    let collected = 0
    let errors = 0

    for (const post of posts) {
      try {
        // ── 2. Token LinkedIn de l'organisation ────────────────────────────────
        const { data: platform } = await supabase
          .from('platforms')
          .select('oauth_tokens')
          .eq('organization_id', post.organization_id)
          .eq('platform_type', 'linkedin')
          .eq('is_active', true)
          .maybeSingle()

        const accessToken = (platform?.oauth_tokens as Record<string, string> | null)?.access_token
        if (!accessToken) {
          console.warn(`[collect-analytics] No LinkedIn token for org ${post.organization_id}`)
          errors++
          continue
        }

        // ── 3. Stats LinkedIn ──────────────────────────────────────────────────
        const stats = await fetchLinkedInStats(post.platform_post_id as string, accessToken)
        if (!stats) {
          errors++
          continue
        }

        // ── 4. Taux d'engagement ───────────────────────────────────────────────
        const engagement_rate =
          stats.impressions_count > 0
            ? Number(
                (
                  ((stats.likes_count + stats.comments_count + stats.shares_count) /
                    stats.impressions_count) *
                  100
                ).toFixed(2),
              )
            : null

        // ── 5. Insert analytics (une ligne par collecte, pas d'upsert) ─────────
        const { error: insertError } = await supabase.from('post_analytics').insert({
          post_id:           post.id,
          organization_id:   post.organization_id,
          platform_type:     (post.platform_type as string) ?? 'linkedin',
          likes_count:       stats.likes_count,
          comments_count:    stats.comments_count,
          shares_count:      stats.shares_count,
          impressions_count: stats.impressions_count,
          clicks_count:      stats.clicks_count,
          engagement_rate,
        })

        if (insertError) {
          console.error(`[collect-analytics] insert error for post ${post.id}`, insertError)
          errors++
        } else {
          collected++
          console.log(`[collect-analytics] saved post ${post.id} likes=${stats.likes_count}`)
        }
      } catch (err) {
        console.error(`[collect-analytics] error for post ${post.id}`, err)
        errors++
      }
    }

    console.log(`[collect-analytics] done collected=${collected} errors=${errors}`)
    return jsonResponse({ collected, errors, total: posts.length })
  } catch (err) {
    console.error('[collect-analytics] ERROR', err)
    if (err instanceof z.ZodError) {
      return jsonResponse({ error: 'Validation failed', details: err.flatten() }, 400)
    }
    return jsonResponse({ error: (err as Error).message ?? 'Internal server error' }, 500)
  }
})
