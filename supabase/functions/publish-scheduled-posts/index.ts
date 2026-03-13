// PostPilot — Edge Function : publish-scheduled-posts
// Publie sur LinkedIn tous les posts avec status='approved' et scheduled_at <= NOW().
// Appelée par le cron n8n (workflow 03, toutes les 5 min) ou manuellement.

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

// Supprime le markdown non supporté par LinkedIn avant publication.
// LinkedIn affiche le texte tel quel — les ** et @[Name] apparaissent littéralement.
function cleanContentForLinkedIn(content: string): string {
  return content
    // **gras** → texte brut (sans les astérisques)
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    // *italique* → texte brut
    .replace(/\*([^*]+)\*/g, '$1')
    // _italique_ → texte brut
    .replace(/_([^_]+)_/g, '$1')
    // @[Nom Prénom] → @Nom Prénom (LinkedIn ne supporte pas les crochets)
    .replace(/@\[([^\]]+)\]/g, '@$1')
    // Nettoyer les espaces multiples et espaces en fin de ligne
    .replace(/ +$/gm, '')
    .trim()
}

// ─── Upload d'image vers LinkedIn ─────────────────────────────────────────────

async function uploadImageToLinkedIn(
  imageUrl: string,
  personId: string,
  accessToken: string,
): Promise<string | null> {
  try {
    // Étape 1 : Enregistrer l'upload
    const registerRes = await fetch('https://api.linkedin.com/v2/assets?action=registerUpload', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'X-Restli-Protocol-Version': '2.0.0',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        registerUploadRequest: {
          owner: `urn:li:person:${personId}`,
          recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
          serviceRelationships: [{
            identifier: 'urn:li:userGeneratedContent',
            relationshipType: 'OWNER',
          }],
        },
      }),
    })

    if (!registerRes.ok) {
      console.warn(`[publish] registerUpload failed ${registerRes.status}: ${await registerRes.text()}`)
      return null
    }

    const registerData = await registerRes.json() as {
      value: {
        asset: string
        uploadMechanism: {
          'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest': {
            uploadUrl: string
          }
        }
      }
    }

    const assetUrn = registerData.value.asset
    const uploadUrl = registerData.value.uploadMechanism[
      'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'
    ]?.uploadUrl

    if (!assetUrn || !uploadUrl) {
      console.warn('[publish] Missing asset URN or uploadUrl in register response')
      return null
    }

    // Étape 2 : Télécharger l'image depuis Supabase Storage et l'envoyer à LinkedIn
    const imgRes = await fetch(imageUrl)
    if (!imgRes.ok) {
      console.warn(`[publish] Failed to fetch image ${imageUrl}: ${imgRes.status}`)
      return null
    }

    const imgBytes = await imgRes.arrayBuffer()
    const contentType = imgRes.headers.get('content-type') ?? 'image/jpeg'

    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': contentType,
      },
      body: imgBytes,
    })

    if (!uploadRes.ok) {
      console.warn(`[publish] Image upload failed ${uploadRes.status}: ${await uploadRes.text()}`)
      return null
    }

    console.log(`[publish] Image uploaded → asset ${assetUrn}`)
    return assetUrn
  } catch (e) {
    console.error('[publish] uploadImageToLinkedIn error', e)
    return null
  }
}

// ─── Publication LinkedIn ──────────────────────────────────────────────────────

async function publishToLinkedIn(
  content: string,
  authorUrn: string,    // ex: "urn:li:person:XXXX" ou "urn:li:organization:12345"
  accessToken: string,
  mediaUrls: string[],
  mediaType: string,
): Promise<{ success: boolean; postId?: string; error?: string }> {

  const cleanContent = cleanContentForLinkedIn(content)

  // Pour l'upload image, on a besoin du personId (l'owner des assets est toujours la personne)
  const personIdMatch = authorUrn.match(/urn:li:person:(.+)/)
  const personId = personIdMatch?.[1] ?? authorUrn

  // Uploader les images si présentes
  const mediaAssets: string[] = []
  if (mediaType === 'image' && mediaUrls.length > 0) {
    for (const url of mediaUrls) {
      const assetUrn = await uploadImageToLinkedIn(url, personId, accessToken)
      if (assetUrn) mediaAssets.push(assetUrn)
    }
  }

  // Construire le payload ugcPost
  const shareContent: Record<string, unknown> = {
    shareCommentary: { text: cleanContent },
    shareMediaCategory: mediaAssets.length > 0 ? 'IMAGE' : 'NONE',
  }

  if (mediaAssets.length > 0) {
    shareContent.media = mediaAssets.map((assetUrn) => ({
      status: 'READY',
      description: { text: '' },
      media: assetUrn,
      title: { text: '' },
    }))
  }

  const body = {
    author: authorUrn,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': shareContent,
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
      .select('id, content, organization_id, created_by, platform_type, media_urls, media_type, posting_as')
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
        const mediaUrls = Array.isArray(post.media_urls) ? post.media_urls as string[] : []
        const mediaType = (post.media_type as string) ?? 'none'

        // Déterminer l'auteur : posting_as (page entreprise) ou compte personnel
        const postingAs = post.posting_as as { type?: string; urn?: string } | null
        const authorUrn = (postingAs?.type === 'organization' && postingAs?.urn)
          ? postingAs.urn
          : `urn:li:person:${tokens.linkedin_person_id}`

        const result = await publishToLinkedIn(
          post.content as string,
          authorUrn,
          tokens.access_token,
          mediaUrls,
          mediaType,
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
