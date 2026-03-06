// PostPilot — Edge Function : create-checkout-session
// Crée une Stripe Checkout Session et retourne l'URL de paiement.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'npm:zod@3'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const RequestSchema = z.object({
  organization_id: z.string().uuid(),
  price_id:        z.string().min(1),
  success_url:     z.string().url(),
  cancel_url:      z.string().url(),
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

    const { organization_id, price_id, success_url, cancel_url } = parsed.data

    const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')
    if (!STRIPE_SECRET_KEY) {
      return new Response(
        JSON.stringify({ error: 'Stripe non configuré' }),
        { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } },
      )
    }

    // Récupérer le stripe_customer_id existant
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: sub } = await (supabase as any)
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('organization_id', organization_id)
      .single()

    // Construire les params Stripe (form-encoded)
    const params = new URLSearchParams()
    params.append('mode', 'subscription')
    params.append('line_items[0][price]', price_id)
    params.append('line_items[0][quantity]', '1')
    params.append('success_url', success_url)
    params.append('cancel_url', cancel_url)
    params.append('metadata[organization_id]', organization_id)
    params.append('allow_promotion_codes', 'true')
    params.append('billing_address_collection', 'auto')

    if (sub?.stripe_customer_id) {
      params.append('customer', sub.stripe_customer_id)
    }

    const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })

    const session = await stripeRes.json()
    if (!stripeRes.ok) {
      const errMsg = (session as { error?: { message?: string } }).error?.message ?? 'Stripe error'
      return new Response(
        JSON.stringify({ error: errMsg }),
        { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } },
      )
    }

    return new Response(
      JSON.stringify({ checkout_url: (session as { url: string }).url }),
      { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } },
    )
  }
})
