// PostPilot — Edge Function : create-billing-portal
// Crée une Stripe Billing Portal Session et retourne l'URL du portail.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'npm:zod@3'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const RequestSchema = z.object({
  organization_id: z.string().uuid(),
})

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

  try {
    const body = await req.json()
    const parsed = RequestSchema.safeParse(body)
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: parsed.error.issues[0].message }),
        { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } },
      )
    }

    const { organization_id } = parsed.data

    const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')
    if (!STRIPE_SECRET_KEY) {
      return new Response(
        JSON.stringify({ error: 'Stripe non configuré' }),
        { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } },
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: sub, error } = await (supabase as any)
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('organization_id', organization_id)
      .single()

    if (error || !sub?.stripe_customer_id) {
      return new Response(
        JSON.stringify({ error: 'Aucun abonnement Stripe trouvé pour cette organisation' }),
        { status: 404, headers: { ...CORS, 'Content-Type': 'application/json' } },
      )
    }

    const params = new URLSearchParams()
    params.append('customer', sub.stripe_customer_id)
    params.append('return_url', `${req.headers.get('origin') ?? 'https://postpilot.rocket-solution.fr'}/settings?tab=billing`)

    const stripeRes = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })

    const portal = await stripeRes.json()
    if (!stripeRes.ok) {
      const errMsg = (portal as { error?: { message?: string } }).error?.message ?? 'Stripe error'
      return new Response(
        JSON.stringify({ error: errMsg }),
        { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } },
      )
    }

    return new Response(
      JSON.stringify({ portal_url: (portal as { url: string }).url }),
      { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } },
    )
  }
})
