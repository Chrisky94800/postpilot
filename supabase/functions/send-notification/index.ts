// PostPilot — Edge Function : send-notification
// Insère une notification en base ET envoie un email via Resend.
// Appelée par n8n (service_role) ou directement par d'autres Edge Functions.
//
// Variables d'environnement requises :
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//   RESEND_API_KEY   (optionnel — si absent, DB uniquement, pas d'email)
//   RESEND_FROM      (optionnel — ex: "PostPilot <notifications@postpilot.app>")
//   N8N_API_KEY      (clé partagée avec n8n pour authentifier les appels)
//   APP_URL          (URL de l'app, ex: https://postpilot.lovable.app)

import { createClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'npm:zod@3'

// ─── CORS ────────────────────────────────────────────────────────────────────

const CORS = {
  'Access-Control-Allow-Origin':
    Deno.env.get('ALLOWED_ORIGIN') ?? 'https://postpilot.lovable.app',
  'Access-Control-Allow-Headers':
    'authorization, content-type, x-n8n-api-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// ─── Validation ───────────────────────────────────────────────────────────────

const RequestSchema = z.object({
  organization_id: z.string().uuid(),
  user_id: z.string().uuid(),
  type: z.enum([
    'post_ready',
    'post_published',
    'post_failed',
    'token_expired',
    'token_refreshed',
    'analytics_ready',
    'rss_found',
    'error',
  ]),
  title: z.string().min(1).max(200),
  message: z.string().max(1000).optional(),
  metadata: z.record(z.unknown()).optional(),
  /** Si renseigné, le lien dans l'email pointe vers ce post */
  post_id: z.string().uuid().optional(),
  /** Si true, ne pas envoyer d'email (DB seulement) */
  db_only: z.boolean().default(false),
})

// ─── Templates email HTML ────────────────────────────────────────────────────

interface EmailTemplateParams {
  type: string
  title: string
  message: string
  appUrl: string
  postId?: string
}

function buildEmailHtml({
  type,
  title,
  message,
  appUrl,
  postId,
}: EmailTemplateParams): string {
  const ctaHref = postId
    ? `${appUrl}/posts/${postId}`
    : type === 'token_expired'
    ? `${appUrl}/settings?tab=connections`
    : `${appUrl}/dashboard`

  const ctaLabel =
    type === 'post_ready' || type === 'post_published'
      ? 'Voir le post'
      : type === 'token_expired'
      ? 'Reconnecter mon compte'
      : 'Accéder à PostPilot'

  // Icône selon le type
  const iconMap: Record<string, string> = {
    post_ready: '✍️',
    post_published: '🚀',
    post_failed: '⚠️',
    token_expired: '🔗',
    token_refreshed: '✅',
    analytics_ready: '📊',
    rss_found: '📰',
    error: '❌',
  }
  const icon = iconMap[type] ?? '💬'

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#0077B5 0%,#005885 100%);padding:32px 40px;">
              <p style="margin:0;font-size:24px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">
                PostPilot
              </p>
              <p style="margin:4px 0 0;font-size:13px;color:rgba(255,255,255,0.75);">
                Votre agent LinkedIn IA
              </p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <p style="font-size:32px;margin:0 0 16px;">${icon}</p>
              <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#111827;line-height:1.3;">
                ${title}
              </h1>
              ${
                message
                  ? `<p style="margin:0 0 28px;font-size:15px;color:#6b7280;line-height:1.6;">${message}</p>`
                  : ''
              }
              <a href="${ctaHref}"
                 style="display:inline-block;padding:14px 28px;background:#0077B5;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">
                ${ctaLabel}
              </a>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;border-top:1px solid #f3f4f6;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                Vous recevez cet email car vous êtes membre d'une organisation PostPilot.<br>
                <a href="${appUrl}/settings?tab=notifications" style="color:#6b7280;">
                  Gérer mes préférences de notification
                </a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

// ─── Envoi email via Resend REST API ──────────────────────────────────────────

async function sendEmail(params: {
  to: string
  subject: string
  html: string
  resendKey: string
  from: string
}): Promise<void> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: params.from,
      to: [params.to],
      subject: params.subject,
      html: params.html,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    // On log l'erreur sans faire échouer toute la function :
    // l'important est que la notification DB soit créée.
    console.error(`[send-notification] Resend error ${res.status}: ${body}`)
  } else {
    const { id } = await res.json()
    console.log(`[send-notification] Email sent id=${id}`)
  }
}

// ─── Helper réponses JSON ─────────────────────────────────────────────────────

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

// ─── Vérification de l'authentification ──────────────────────────────────────
// Accepte :
//   • X-N8N-Api-Key : clé partagée avec n8n
//   • Authorization: Bearer <service_role_key> : appel direct service_role

function isAuthorized(req: Request): boolean {
  const n8nKey = Deno.env.get('N8N_API_KEY')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  const receivedN8nKey = req.headers.get('x-n8n-api-key')
  const authHeader = req.headers.get('authorization')
  const bearerToken = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : null

  return (
    (!!n8nKey && receivedN8nKey === n8nKey) ||
    (!!serviceRoleKey && bearerToken === serviceRoleKey)
  )
}

// ─── Handler principal ────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    // ── Auth ──────────────────────────────────────────────────────────────────
    if (!isAuthorized(req)) {
      return jsonResponse({ error: 'Unauthorized' }, 401)
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // ── Validation ────────────────────────────────────────────────────────────
    const raw = await req.json()
    const input = RequestSchema.parse(raw)

    console.log(
      `[send-notification] user=${input.user_id} type=${input.type}`,
    )

    // ── Insertion en base ─────────────────────────────────────────────────────
    const { data: notification, error: dbError } = await supabase
      .from('notifications')
      .insert({
        organization_id: input.organization_id,
        user_id: input.user_id,
        type: input.type,
        title: input.title,
        message: input.message,
        metadata: {
          ...(input.metadata ?? {}),
          ...(input.post_id ? { post_id: input.post_id } : {}),
        },
      })
      .select('id')
      .single()

    if (dbError) throw dbError

    // ── Email via Resend (optionnel) ──────────────────────────────────────────
    const resendKey = Deno.env.get('RESEND_API_KEY')

    if (resendKey && !input.db_only) {
      // Récupération de l'email de l'utilisateur via Supabase Auth Admin API
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.admin.getUserById(input.user_id)

      if (userError || !user?.email) {
        console.warn(
          `[send-notification] Could not fetch email for user=${input.user_id}`,
        )
      } else {
        const appUrl =
          Deno.env.get('APP_URL') ?? 'https://postpilot.lovable.app'
        const from =
          Deno.env.get('RESEND_FROM') ??
          'PostPilot <notifications@postpilot.app>'

        const html = buildEmailHtml({
          type: input.type,
          title: input.title,
          message: input.message ?? '',
          appUrl,
          postId: input.post_id,
        })

        await sendEmail({
          to: user.email,
          subject: input.title,
          html,
          resendKey,
          from,
        })
      }
    }

    console.log(
      `[send-notification] OK notification_id=${notification.id} email=${!input.db_only && !!resendKey}`,
    )

    return jsonResponse({ success: true, notification_id: notification.id })
  } catch (err) {
    console.error('[send-notification] ERROR', err)

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
