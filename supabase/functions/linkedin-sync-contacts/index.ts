// PostPilot — Edge Function : linkedin-sync-contacts
// Synchronise depuis LinkedIn :
//   1. Les pages entreprise que l'utilisateur gère (via /v2/organizationAcls)
//   2. Stocke chaque entreprise dans la table contacts (type='company')
//
// Note LinkedIn API :
//   - La liste de connexions personnes (/v2/connections) est réservée aux
//     Marketing Developer Partners — indisponible pour les apps standard.
//   - Seules les pages entreprise gérées par l'utilisateur peuvent être
//     récupérées automatiquement (scope r_organization_social).
//
// Variables d'environnement requises :
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (auto-injectés par Supabase)

import { createClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'npm:zod@3'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const RequestSchema = z.object({
  organization_id: z.string().uuid(),
})

// ─── Types LinkedIn ───────────────────────────────────────────────────────────

interface OrgAclElement {
  role: string
  state: string
  organization: string  // ex: "urn:li:organization:12345678"
}

interface OrgAclResponse {
  elements: OrgAclElement[]
  paging: { count: number; start: number; total: number }
}

interface LinkedInOrganization {
  localizedName?: string
  vanityName?: string
  id?: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Extrait l'ID numérique d'un URN LinkedIn : "urn:li:organization:12345" → "12345" */
function urnToId(urn: string): string | null {
  const match = urn.match(/:(\d+)$/)
  return match?.[1] ?? null
}

/** Récupère les organisations où l'utilisateur est admin */
async function fetchOrganizationAcls(
  accessToken: string,
): Promise<OrgAclElement[]> {
  const res = await fetch(
    'https://api.linkedin.com/v2/organizationAcls?q=roleAssignee&count=100&state=APPROVED',
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'X-Restli-Protocol-Version': '2.0.0',
      },
    },
  )

  if (res.status === 403) {
    // Scope r_organization_social absent — l'utilisateur n'a pas de pages entreprise
    // ou la scope n'est pas accordée (app non vérifiée)
    console.warn('[linkedin-sync-contacts] 403 on organizationAcls — scope r_organization_social manquant')
    return []
  }

  if (!res.ok) {
    const text = await res.text()
    console.error(`[linkedin-sync-contacts] organizationAcls error ${res.status}: ${text}`)
    return []
  }

  const data = await res.json() as OrgAclResponse
  return data.elements ?? []
}

/** Récupère les détails d'une organisation LinkedIn par son URN */
async function fetchOrganizationDetails(
  orgUrn: string,
  accessToken: string,
): Promise<{ name: string; vanityName: string | null; urn: string } | null> {
  const orgId = urnToId(orgUrn)
  if (!orgId) return null

  const res = await fetch(
    `https://api.linkedin.com/v2/organizations/${orgId}?projection=(localizedName,vanityName)`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'X-Restli-Protocol-Version': '2.0.0',
      },
    },
  )

  if (!res.ok) {
    console.warn(`[linkedin-sync-contacts] Cannot fetch org ${orgId}: ${res.status}`)
    return null
  }

  const data = await res.json() as LinkedInOrganization
  if (!data.localizedName) return null

  return {
    name:       data.localizedName,
    vanityName: data.vanityName ?? null,
    urn:        orgUrn,
  }
}

// ─── Handler principal ────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS })
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  try {
    // ── Validation ────────────────────────────────────────────────────────────
    const body = await req.json().catch(() => ({}))
    const parsed = RequestSchema.safeParse(body)
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      )
    }

    const { organization_id } = parsed.data

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // ── Récupération du token LinkedIn ────────────────────────────────────────
    const { data: platform, error: platformError } = await supabase
      .from('platforms')
      .select('oauth_tokens')
      .eq('organization_id', organization_id)
      .eq('platform_type', 'linkedin')
      .eq('is_active', true)
      .maybeSingle()

    if (platformError || !platform?.oauth_tokens) {
      return new Response(
        JSON.stringify({ error: 'Compte LinkedIn non connecté' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      )
    }

    const accessToken = (platform.oauth_tokens as { access_token: string }).access_token
    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: 'Token LinkedIn invalide' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      )
    }

    // ── Récupération des pages entreprise ─────────────────────────────────────
    const acls = await fetchOrganizationAcls(accessToken)
    const adminOrgs = acls.filter((a) => a.role === 'ADMINISTRATOR' && a.state === 'APPROVED')

    console.log(`[linkedin-sync-contacts] Found ${adminOrgs.length} managed organizations for org=${organization_id}`)

    // ── Récupération des détails de chaque organisation ───────────────────────
    const orgDetails = await Promise.all(
      adminOrgs.map((acl) => fetchOrganizationDetails(acl.organization, accessToken)),
    )

    const validOrgs = orgDetails.filter(Boolean) as {
      name: string
      vanityName: string | null
      urn: string
    }[]

    if (validOrgs.length === 0) {
      return new Response(
        JSON.stringify({
          synced: 0,
          message: 'Aucune page entreprise LinkedIn trouvée. Assurez-vous d\'être administrateur d\'au moins une page entreprise LinkedIn.',
        }),
        { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      )
    }

    // ── Upsert des contacts dans Supabase ─────────────────────────────────────
    const now = new Date().toISOString()

    const contactsToUpsert = validOrgs.map((org) => ({
      organization_id,
      name:         org.name,
      linkedin_url: org.vanityName
        ? `https://www.linkedin.com/company/${org.vanityName}`
        : null,
      linkedin_urn: org.urn,
      type:         'company' as const,
      updated_at:   now,
    }))

    // Upsert par (organization_id, linkedin_urn) — on identifie par URN unique
    const { error: upsertError } = await supabase
      .from('contacts')
      .upsert(contactsToUpsert, {
        onConflict: 'organization_id,linkedin_urn',
        ignoreDuplicates: false,
      })

    if (upsertError) {
      // Si la contrainte unique sur linkedin_urn n'existe pas encore, on tente un insert simple
      console.warn('[linkedin-sync-contacts] Upsert with conflict failed, trying insert:', upsertError.message)

      // Supprimer les anciens contacts company LinkedIn pour cette org puis réinsérer
      await supabase
        .from('contacts')
        .delete()
        .eq('organization_id', organization_id)
        .eq('type', 'company')
        .not('linkedin_urn', 'is', null)

      const { error: insertError } = await supabase
        .from('contacts')
        .insert(contactsToUpsert)

      if (insertError) {
        console.error('[linkedin-sync-contacts] Insert error:', insertError)
        return new Response(
          JSON.stringify({ error: 'Erreur lors de la synchronisation des contacts' }),
          { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
        )
      }
    }

    console.log(`[linkedin-sync-contacts] Synced ${validOrgs.length} companies for org=${organization_id}`)

    return new Response(
      JSON.stringify({
        synced:    validOrgs.length,
        companies: validOrgs.map((o) => ({ name: o.name, urn: o.urn })),
      }),
      { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('[linkedin-sync-contacts] ERROR', err)
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    )
  }
})
