// PostPilot — Edge Function: stripe-webhook
// Reçoit les événements Stripe et met à jour la table subscriptions.
// Événements gérés :
//   - checkout.session.completed      → activation abonnement post-paiement
//   - customer.subscription.updated   → changement de plan, renouvellement
//   - customer.subscription.deleted   → annulation
//   - invoice.payment_failed          → passage en past_due

const STRIPE_API = 'https://api.stripe.com/v1'

Deno.serve(async (req) => {
  const STRIPE_SECRET_KEY     = Deno.env.get('STRIPE_SECRET_KEY')!
  const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET')!
  const SUPABASE_URL          = Deno.env.get('SUPABASE_URL')!
  const SERVICE_KEY           = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  // ── 1. Vérification signature Stripe ────────────────────────────────────────
  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    return new Response('Missing stripe-signature', { status: 400 })
  }

  const body = await req.text()

  const isValid = await verifyStripeSignature(body, signature, STRIPE_WEBHOOK_SECRET)
  if (!isValid) {
    return new Response('Invalid signature', { status: 400 })
  }

  const event = JSON.parse(body)
  const db = { url: SUPABASE_URL, key: SERVICE_KEY }

  try {
    switch (event.type) {

      // ── Paiement Checkout réussi ──────────────────────────────────────────
      case 'checkout.session.completed': {
        const session = event.data.object
        const customerId     = session.customer
        const subscriptionId = session.subscription
        const orgId          = session.metadata?.organization_id

        if (!orgId || !subscriptionId) break

        const sub = await fetchStripe(`${STRIPE_API}/subscriptions/${subscriptionId}`, STRIPE_SECRET_KEY)

        await upsertSubscription(db, orgId, {
          stripe_customer_id:     customerId,
          stripe_subscription_id: subscriptionId,
          stripe_price_id:        sub.items.data[0]?.price?.id ?? null,
          plan_id:                getPlanFromPrice(sub.items.data[0]?.price?.id),
          billing_cycle:          sub.items.data[0]?.price?.recurring?.interval === 'year' ? 'yearly' : 'monthly',
          status:                 'active',
          trial_ends_at:          null,
          current_period_start:   new Date(sub.current_period_start * 1000).toISOString(),
          current_period_end:     new Date(sub.current_period_end * 1000).toISOString(),
        })
        break
      }

      // ── Subscription mise à jour (renouvellement, changement plan) ─────────
      case 'customer.subscription.updated': {
        const sub  = event.data.object
        const orgId = await getOrgIdByCustomer(db, sub.customer)
        if (!orgId) break

        await upsertSubscription(db, orgId, {
          stripe_subscription_id: sub.id,
          stripe_price_id:        sub.items.data[0]?.price?.id ?? null,
          plan_id:                getPlanFromPrice(sub.items.data[0]?.price?.id),
          billing_cycle:          sub.items.data[0]?.price?.recurring?.interval === 'year' ? 'yearly' : 'monthly',
          status:                 mapStripeStatus(sub.status),
          current_period_start:   new Date(sub.current_period_start * 1000).toISOString(),
          current_period_end:     new Date(sub.current_period_end * 1000).toISOString(),
        })
        break
      }

      // ── Subscription annulée ──────────────────────────────────────────────
      case 'customer.subscription.deleted': {
        const sub  = event.data.object
        const orgId = await getOrgIdByCustomer(db, sub.customer)
        if (!orgId) break

        await upsertSubscription(db, orgId, {
          stripe_subscription_id: sub.id,
          plan_id:                'free',
          status:                 'canceled',
          current_period_end:     new Date(sub.current_period_end * 1000).toISOString(),
        })
        break
      }

      // ── Paiement échoué ───────────────────────────────────────────────────
      case 'invoice.payment_failed': {
        const invoice = event.data.object
        const orgId   = await getOrgIdByCustomer(db, invoice.customer)
        if (!orgId) break

        await upsertSubscription(db, orgId, { status: 'past_due' })
        break
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Webhook error:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})

// ── Helpers ──────────────────────────────────────────────────────────────────

async function verifyStripeSignature(body: string, header: string, secret: string): Promise<boolean> {
  try {
    const parts     = Object.fromEntries(header.split(',').map(p => p.split('=')))
    const timestamp = parts['t']
    const sig       = parts['v1']
    const signed    = `${timestamp}.${body}`
    // Strip 'whsec_' prefix and base64-decode to get the raw HMAC key bytes
    const keyPart   = secret.startsWith('whsec_') ? secret.slice(6) : secret
    const keyBytes  = Uint8Array.from(atob(keyPart), c => c.charCodeAt(0))
    const key = await crypto.subtle.importKey(
      'raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    )
    const computed = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signed))
    const hex = Array.from(new Uint8Array(computed)).map(b => b.toString(16).padStart(2, '0')).join('')
    return hex === sig
  } catch {
    return false
  }
}

async function fetchStripe(url: string, key: string) {
  const res = await fetch(url, { headers: { 'Authorization': `Bearer ${key}` } })
  return res.json()
}

async function upsertSubscription(
  db: { url: string; key: string },
  orgId: string,
  data: Record<string, unknown>
) {
  const existing = await fetch(
    `${db.url}/rest/v1/subscriptions?organization_id=eq.${orgId}&select=id`,
    { headers: { apikey: db.key, Authorization: `Bearer ${db.key}` } }
  ).then(r => r.json())

  const payload = { ...data, organization_id: orgId, updated_at: new Date().toISOString() }

  if (existing.length > 0) {
    await fetch(`${db.url}/rest/v1/subscriptions?organization_id=eq.${orgId}`, {
      method: 'PATCH',
      headers: { apikey: db.key, Authorization: `Bearer ${db.key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
  } else {
    await fetch(`${db.url}/rest/v1/subscriptions`, {
      method: 'POST',
      headers: {
        apikey: db.key, Authorization: `Bearer ${db.key}`,
        'Content-Type': 'application/json', Prefer: 'return=minimal',
      },
      body: JSON.stringify(payload),
    })
  }
}

async function getOrgIdByCustomer(db: { url: string; key: string }, customerId: string): Promise<string | null> {
  const res = await fetch(
    `${db.url}/rest/v1/subscriptions?stripe_customer_id=eq.${customerId}&select=organization_id&limit=1`,
    { headers: { apikey: db.key, Authorization: `Bearer ${db.key}` } }
  ).then(r => r.json())
  return res[0]?.organization_id ?? null
}

function getPlanFromPrice(priceId: string | null | undefined): string {
  if (!priceId) return 'free'
  if (priceId.includes('pro')) return 'pro'
  if (priceId.includes('solo')) return 'solo'
  return 'solo'
}

function mapStripeStatus(status: string): string {
  const map: Record<string, string> = {
    active:             'active',
    trialing:           'trialing',
    past_due:           'past_due',
    canceled:           'canceled',
    incomplete:         'past_due',
    incomplete_expired: 'canceled',
    unpaid:             'past_due',
  }
  return map[status] ?? 'active'
}
