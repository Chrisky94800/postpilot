// PostPilot — Edge Function : linkedin-oauth-callback
// Callback OAuth2 LinkedIn. LinkedIn redirige ici après autorisation de l'utilisateur.
//
// Flow :
//   1. LinkedIn redirige vers cette URL avec ?code=xxx&state=<organization_id>
//   2. On échange le code contre access_token + refresh_token
//   3. On fetche le profil LinkedIn via OIDC userinfo
//   4. On upsert dans la table platforms
//   5. On redirige vers l'app PostPilot : /settings?linkedin=connected
//
// Variables d'environnement requises (Supabase Secrets) :
//   LINKEDIN_CLIENT_ID       — Client ID de l'app LinkedIn PostPilot
//   LINKEDIN_CLIENT_SECRET   — Client Secret de l'app LinkedIn PostPilot
//   LINKEDIN_REDIRECT_URI    — URL de cette Edge Function (déclarée dans l'app LinkedIn)
//   SUPABASE_URL             — Injecté automatiquement par Supabase
//   SUPABASE_SERVICE_ROLE_KEY — Injecté automatiquement par Supabase
//   APP_URL                  — https://postpilot.lovable.app

import { createClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'npm:zod@3'

// ─── Constantes LinkedIn ──────────────────────────────────────────────────────

const LINKEDIN_TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken'
const LINKEDIN_USERINFO_URL = 'https://api.linkedin.com/v2/userinfo'

// ─── Validation des query params ──────────────────────────────────────────────

const CallbackParamsSchema = z.object({
  /** Code d'autorisation retourné par LinkedIn */
  code: z.string().min(1, 'code manquant'),
  /** base64 JSON {org, origin} ou UUID brut (rétrocompat) */
  state: z.string().min(1, 'state manquant'),
})

// ─── Types des réponses LinkedIn ──────────────────────────────────────────────

interface LinkedInTokenResponse {
  access_token: string
  expires_in: number        // secondes (~5 183 944 ≈ 60 jours)
  refresh_token?: string
  refresh_token_expires_in?: number
  token_type: 'Bearer'
  scope: string
}

interface LinkedInUserInfo {
  sub: string               // LinkedIn member ID (ex: "XXXXXXXXXXX")
  name?: string             // "Jean Dupont" (si scope profile)
  given_name?: string
  family_name?: string
  picture?: string
  email?: string
  locale?: string | { language: string; country: string }
}

interface LinkedInPage {
  urn: string   // ex: "urn:li:organization:12345"
  id: string    // ex: "12345"
  name: string  // ex: "Rocket Solution"
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function redirectTo(url: string): Response {
  return new Response(null, {
    status: 302,
    headers: { Location: url },
  })
}

function errorRedirect(appUrl: string, reason: string): Response {
  return redirectTo(`${appUrl}/settings?linkedin=error&reason=${encodeURIComponent(reason)}`)
}

// ─── Échange du code contre les tokens ───────────────────────────────────────

async function exchangeCodeForTokens(params: {
  code: string
  clientId: string
  clientSecret: string
  redirectUri: string
}): Promise<LinkedInTokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: params.code,
    redirect_uri: params.redirectUri,
    client_id: params.clientId,
    client_secret: params.clientSecret,
  })

  const res = await fetch(LINKEDIN_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`LinkedIn token exchange failed (${res.status}): ${text}`)
  }

  const data = await res.json()

  // Validation minimale de la réponse
  if (!data.access_token) {
    throw new Error('LinkedIn response missing access_token')
  }

  return data as LinkedInTokenResponse
}

// ─── Récupération du profil LinkedIn via OIDC userinfo ────────────────────────

async function fetchLinkedInUserInfo(
  accessToken: string,
): Promise<LinkedInUserInfo> {
  const res = await fetch(LINKEDIN_USERINFO_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`LinkedIn userinfo failed (${res.status}): ${text}`)
  }

  return res.json() as Promise<LinkedInUserInfo>
}

// ─── Récupération des pages entreprise LinkedIn ───────────────────────────────

async function fetchLinkedInPages(accessToken: string): Promise<LinkedInPage[]> {
  try {
    // 1. Récupérer les organisations dont l'user est ADMINISTRATOR
    const aclRes = await fetch(
      'https://api.linkedin.com/v2/organizationalEntityAcls?q=roleAssignee&state=APPROVED&role=ADMINISTRATOR&count=50',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'X-Restli-Protocol-Version': '2.0.0',
        },
      },
    )

    if (!aclRes.ok) {
      console.warn(`[linkedin-oauth-callback] organizationalEntityAcls failed (${aclRes.status})`)
      return []
    }

    const aclData = await aclRes.json() as {
      elements?: { organizationalTarget: string }[]
    }

    if (!aclData.elements?.length) return []

    // 2. Extraire les IDs numériques depuis les URNs "urn:li:organization:XXXX"
    const orgEntries = aclData.elements
      .map((el) => {
        const match = el.organizationalTarget.match(/urn:li:organization:(\d+)/)
        return match ? { urn: el.organizationalTarget, id: match[1] } : null
      })
      .filter(Boolean) as { urn: string; id: string }[]

    if (!orgEntries.length) return []

    // 3. Récupérer les noms des organisations (batch via ids=List(...))
    const idList = orgEntries.map((e) => e.id).join(',')
    const orgsRes = await fetch(
      `https://api.linkedin.com/v2/organizations?ids=List(${idList})&fields=id,localizedName`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'X-Restli-Protocol-Version': '2.0.0',
        },
      },
    )

    if (!orgsRes.ok) {
      console.warn(`[linkedin-oauth-callback] organizations batch failed (${orgsRes.status})`)
      // Fallback : retourner les URNs sans nom
      return orgEntries.map((e) => ({ ...e, name: `Organisation ${e.id}` }))
    }

    const orgsData = await orgsRes.json() as {
      results?: Record<string, { id: number; localizedName?: string }>
    }

    const pages: LinkedInPage[] = orgEntries.map((entry) => {
      const orgInfo = orgsData.results?.[entry.id]
      return {
        urn: entry.urn,
        id: entry.id,
        name: orgInfo?.localizedName ?? `Organisation ${entry.id}`,
      }
    })

    console.log(`[linkedin-oauth-callback] Found ${pages.length} company page(s): ${pages.map((p) => p.name).join(', ')}`)
    return pages
  } catch (e) {
    console.error('[linkedin-oauth-callback] fetchLinkedInPages error', e)
    return []
  }
}

// ─── Handler principal ────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // Cette fonction répond à des redirections navigateur (GET) → pas de CORS
  if (req.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  const appUrl = Deno.env.get('APP_URL') ?? 'https://postpilot.lovable.app'

  try {
    // ── Récupération des secrets ──────────────────────────────────────────────
    const clientId = Deno.env.get('LINKEDIN_CLIENT_ID')
    const clientSecret = Deno.env.get('LINKEDIN_CLIENT_SECRET')
    const redirectUri = Deno.env.get('LINKEDIN_REDIRECT_URI')

    if (!clientId || !clientSecret || !redirectUri) {
      console.error('[linkedin-oauth-callback] Missing LinkedIn env vars')
      return errorRedirect(appUrl, 'configuration_error')
    }

    // ── Extraction et validation des query params ─────────────────────────────
    const url = new URL(req.url)

    // LinkedIn peut retourner une erreur dans les params (ex: accès refusé)
    const linkedinError = url.searchParams.get('error')
    if (linkedinError) {
      const desc = url.searchParams.get('error_description') ?? linkedinError
      console.warn(`[linkedin-oauth-callback] LinkedIn error: ${desc}`)
      return errorRedirect(appUrl, linkedinError)
    }

    const rawParams = {
      code: url.searchParams.get('code') ?? '',
      state: url.searchParams.get('state') ?? '',
    }

    // Validation Zod
    const parseResult = CallbackParamsSchema.safeParse(rawParams)
    if (!parseResult.success) {
      console.error(
        '[linkedin-oauth-callback] Invalid params',
        parseResult.error.flatten(),
      )
      return errorRedirect(appUrl, 'invalid_params')
    }

    const { code, state: rawState } = parseResult.data

    // ── Décodage du state (base64 JSON ou UUID brut pour rétrocompat) ─────────
    let organizationId: string
    try {
      const stateData = JSON.parse(atob(rawState))
      organizationId = stateData.org
      if (stateData.origin) {
        // Utiliser l'origine de l'app qui a initié le flow (self-configuring)
        Object.defineProperty(globalThis, '_appUrlOverride', {
          value: stateData.origin,
          configurable: true,
        })
      }
    } catch {
      // Rétrocompat : state = UUID brut
      organizationId = rawState
    }

    // Résoudre l'URL de l'app : priorité à l'origine encodée dans le state
    const resolvedAppUrl = (() => {
      try {
        const stateData = JSON.parse(atob(rawState))
        return stateData.origin || appUrl
      } catch {
        return appUrl
      }
    })()

    console.log(
      `[linkedin-oauth-callback] code received for org=${organizationId}, redirect to ${resolvedAppUrl}`,
    )

    // ── Vérification que l'organisation existe ────────────────────────────────
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id')
      .eq('id', organizationId)
      .is('deleted_at', null)
      .single()

    if (orgError || !org) {
      console.error(
        `[linkedin-oauth-callback] Organization not found: ${organizationId}`,
      )
      return errorRedirect(resolvedAppUrl, 'invalid_organization')
    }

    // ── Échange du code contre les tokens LinkedIn ────────────────────────────
    const tokens = await exchangeCodeForTokens({
      code,
      clientId,
      clientSecret,
      redirectUri,
    })

    console.log(
      `[linkedin-oauth-callback] Tokens obtained, expires_in=${tokens.expires_in}s`,
    )

    // ── Récupération du profil LinkedIn ───────────────────────────────────────
    const userInfo = await fetchLinkedInUserInfo(tokens.access_token)

    const linkedinPersonId = userInfo.sub
    const linkedinUrn = `urn:li:person:${linkedinPersonId}`

    // Nom complet : priorité à "name", sinon construction first+last
    const displayName =
      userInfo.name ??
      [userInfo.given_name, userInfo.family_name].filter(Boolean).join(' ') ??
      'Utilisateur LinkedIn'

    console.log(
      `[linkedin-oauth-callback] Profile fetched: ${displayName} (${linkedinUrn})`,
    )

    // ── Récupération des pages entreprise LinkedIn ────────────────────────────
    const linkedinPages = await fetchLinkedInPages(tokens.access_token)

    // ── Calcul de la date d'expiration du token ───────────────────────────────
    const tokenExpiresAt = new Date(
      Date.now() + tokens.expires_in * 1000,
    ).toISOString()

    // ── Upsert dans la table platforms ────────────────────────────────────────
    const { error: upsertError } = await supabase
      .from('platforms')
      .upsert(
        {
          organization_id: organizationId,
          platform_type: 'linkedin',
          is_active: true,
          connected_at: new Date().toISOString(),
          oauth_tokens: {
            access_token: tokens.access_token,
            // Stockage conditionnel du refresh_token (LinkedIn le fournit
            // uniquement avec le scope offline_access)
            ...(tokens.refresh_token
              ? {
                  refresh_token: tokens.refresh_token,
                  refresh_token_expires_at: tokens.refresh_token_expires_in
                    ? new Date(
                        Date.now() + tokens.refresh_token_expires_in * 1000,
                      ).toISOString()
                    : null,
                }
              : {}),
            linkedin_person_id: linkedinPersonId,
          },
          token_expires_at: tokenExpiresAt,
          platform_user_id: linkedinUrn,
          platform_user_name: displayName,
          linkedin_pages: linkedinPages,
          platform_metadata: {
            scope: tokens.scope,
            locale:
              typeof userInfo.locale === 'string'
                ? userInfo.locale
                : userInfo.locale
                ? `${userInfo.locale.language}_${userInfo.locale.country}`
                : null,
            picture: userInfo.picture ?? null,
          },
        },
        {
          onConflict: 'organization_id,platform_type',
          ignoreDuplicates: false, // on veut mettre à jour si ça existe
        },
      )

    if (upsertError) {
      console.error(
        '[linkedin-oauth-callback] Upsert error',
        upsertError,
      )
      return errorRedirect(resolvedAppUrl, 'database_error')
    }

    console.log(
      `[linkedin-oauth-callback] OK org=${organizationId} user=${linkedinUrn}`,
    )

    // ── Notification de connexion réussie ─────────────────────────────────────
    // On notifie tous les owners de l'org (sans email, juste in-app)
    const { data: owners } = await supabase
      .from('organization_members')
      .select('user_id')
      .eq('organization_id', organizationId)
      .eq('role', 'owner')

    if (owners?.length) {
      await supabase.from('notifications').insert(
        owners.map((o) => ({
          organization_id: organizationId,
          user_id: o.user_id,
          type: 'token_refreshed',
          title: 'LinkedIn connecté avec succès',
          message: `Le compte LinkedIn de ${displayName} a été connecté à PostPilot.`,
          metadata: {
            platform_type: 'linkedin',
            platform_user_name: displayName,
          },
        })),
      )
    }

    // ── Redirection vers l'app ────────────────────────────────────────────────
    return redirectTo(
      `${resolvedAppUrl}/settings?linkedin=connected&name=${encodeURIComponent(displayName)}`,
    )
  } catch (err) {
    console.error('[linkedin-oauth-callback] ERROR', err)
    return errorRedirect(appUrl, 'internal_error')
  }
})
