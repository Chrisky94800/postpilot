// PostPilot — Edge Function : linkedin-oauth-url
// Génère l'URL d'autorisation OAuth2 LinkedIn et la retourne au frontend.
//
// Variables d'environnement requises (Supabase Secrets) :
//   LINKEDIN_CLIENT_ID       — Client ID de l'app LinkedIn PostPilot
//   LINKEDIN_REDIRECT_URI    — URL du callback (linkedin-oauth-callback)
//
// Scopes demandés (produits activés sur l'app LinkedIn) :
//   Sign In with LinkedIn using OpenID Connect → openid, profile, email
//   Share on LinkedIn → w_member_social, w_organization_social, r_organization_social

import { z } from 'npm:zod@3'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const RequestSchema = z.object({
  organization_id: z.string().uuid('organization_id invalide'),
  app_origin: z.string().url().optional(),
})

// Scopes des deux produits activés sur l'app LinkedIn PostPilot.
// Note : r_organization_social appartient au Marketing Developer Platform (non standard).
// Retiré car il provoque le rejet "Bummer" si non approuvé. La sync de pages
// entreprise reste fonctionnelle — le 403 est géré gracieusement côté backend.
const LINKEDIN_SCOPES = [
  'openid',             // Sign In with LinkedIn using OpenID Connect
  'profile',            // Sign In with LinkedIn using OpenID Connect
  'email',              // Sign In with LinkedIn using OpenID Connect
  'w_member_social',    // Share on LinkedIn — posts compte personnel
  'w_organization_social', // Share on LinkedIn — posts pages entreprise
]

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS })
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  try {
    // ── Lecture des secrets ───────────────────────────────────────────────────
    const clientId   = Deno.env.get('LINKEDIN_CLIENT_ID')
    const redirectUri = Deno.env.get('LINKEDIN_REDIRECT_URI')

    if (!clientId || !redirectUri) {
      console.error('[linkedin-oauth-url] Missing LINKEDIN_CLIENT_ID or LINKEDIN_REDIRECT_URI')
      return new Response(
        JSON.stringify({ error: 'LinkedIn non configuré — contactez l\'administrateur' }),
        { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      )
    }

    // ── Validation du body ────────────────────────────────────────────────────
    const body = await req.json().catch(() => ({}))
    const parsed = RequestSchema.safeParse(body)
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      )
    }

    const { organization_id, app_origin } = parsed.data

    // ── Résolution de l'origine de l'app ─────────────────────────────────────
    // Priorité : body.app_origin → Origin header → Referer → APP_URL env var
    const originFromHeader = (() => {
      const origin = req.headers.get('Origin') ?? ''
      if (origin && origin !== 'null') return origin
      const referer = req.headers.get('Referer') ?? ''
      try { return new URL(referer).origin } catch { return '' }
    })()

    const resolvedOrigin = app_origin || originFromHeader || Deno.env.get('APP_URL') || ''

    console.log(`[linkedin-oauth-url] app_origin=${app_origin}, header_origin=${originFromHeader}, resolved=${resolvedOrigin}`)

    // ── Construction de l'URL OAuth LinkedIn ─────────────────────────────────
    // On encode {org, origin} en base64 dans le state pour que le callback
    // puisse rediriger vers l'URL exacte de l'app qui a initié le flow.
    const statePayload = btoa(JSON.stringify({
      org: organization_id,
      origin: resolvedOrigin,
    }))

    // Construire l'URL manuellement pour utiliser %20 (plus fiable que + avec LinkedIn)
    const baseParams = new URLSearchParams({
      response_type: 'code',
      client_id:     clientId,
      redirect_uri:  redirectUri,
      state:         statePayload,
    })
    const scopeParam = `scope=${LINKEDIN_SCOPES.join('%20')}`
    const oauth_url = `https://www.linkedin.com/oauth/v2/authorization?${baseParams.toString()}&${scopeParam}`

    console.log(`[linkedin-oauth-url] OAuth URL generated for org=${organization_id}`)

    return new Response(
      JSON.stringify({ oauth_url }),
      { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('[linkedin-oauth-url] ERROR', err)
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    )
  }
})
