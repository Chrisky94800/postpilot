// PostPilot — Edge Function : ai-chat
// Reçoit { organization_id, message, conversation_history? },
// retourne { reply, conversation_id, extracted_items, conversation_history }.
// Deux missions : créer un programme OU générer des idées de posts.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'npm:zod@3'

// ─── CORS ─────────────────────────────────────────────────────────────────────

const CORS = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// ─── Validation ───────────────────────────────────────────────────────────────

const MessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
})

const RequestSchema = z.object({
  organization_id: z.string().uuid(),
  message: z.string().min(1),
  conversation_id: z.string().nullable().optional(),
  conversation_history: z.array(MessageSchema).optional().default([]),
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

const DAY_LABELS: Record<string, string> = {
  monday: 'lundi', tuesday: 'mardi', wednesday: 'mercredi',
  thursday: 'jeudi', friday: 'vendredi', saturday: 'samedi', sunday: 'dimanche',
}

const PLAN_LABELS: Record<string, string> = {
  starter: 'Starter', pro: 'Pro', business: 'Business',
}

// ─── Handler principal ────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const raw = await req.json()
    const { organization_id, message, conversation_id, conversation_history } = RequestSchema.parse(raw)

    console.log(`[ai-chat] org=${organization_id} msg_length=${message.length}`)

    // ── 1. Fetch contexte en parallèle ────────────────────────────────────────
    const [brandRes, orgRes, programsRes] = await Promise.all([
      supabase
        .from('brand_profiles')
        .select('company_name, industry, posting_frequency, preferred_days, tone_of_voice, target_audience')
        .eq('organization_id', organization_id)
        .single(),
      supabase
        .from('organizations')
        .select('subscription_plan, max_posts_per_month')
        .eq('id', organization_id)
        .single(),
      supabase
        .from('programs')
        .select('title, status, start_date, end_date, posts_per_week')
        .eq('organization_id', organization_id)
        .in('status', ['draft', 'active'])
        .limit(5),
    ])

    const brand = brandRes.data
    const org = orgRes.data
    const programs = programsRes.data ?? []

    // ── 2. Construire le contexte ─────────────────────────────────────────────
    const companyName = brand?.company_name ?? 'votre entreprise'
    const industry = brand?.industry ?? 'votre secteur'
    const postingFrequency = brand?.posting_frequency ?? 2
    const maxPostsPerMonth = org?.max_posts_per_month ?? 8
    const subscriptionPlan = PLAN_LABELS[org?.subscription_plan ?? 'starter'] ?? 'Starter'
    const toneOfVoice = brand?.tone_of_voice ?? 'professionnel'
    const targetAudience = brand?.target_audience ?? 'professionnels'

    const preferredDays = Array.isArray(brand?.preferred_days) && brand.preferred_days.length > 0
      ? brand.preferred_days.map((d: string) => DAY_LABELS[d] ?? d).join(', ')
      : 'lundi, jeudi'

    const today = new Date().toISOString().split('T')[0]

    const programsCtx = programs.length > 0
      ? `Programmes déjà créés :\n${programs.map(p => `- "${p.title}" (${p.status}, ${p.start_date} → ${p.end_date})`).join('\n')}`
      : 'Aucun programme en cours.'

    // ── 3. Prompt système dual-mode ───────────────────────────────────────────
    const systemPrompt = `Tu es l'assistant LinkedIn de ${companyName} (${industry}).

PROFIL DE MARQUE (ne jamais redemander) :
- Ton : ${toneOfVoice}
- Audience cible : ${targetAudience}
- Fréquence : ${postingFrequency} post(s)/semaine, jours préférés : ${preferredDays}
- Plan ${subscriptionPlan} : quota de ${maxPostsPerMonth} posts/mois

${programsCtx}

TES DEUX MISSIONS — détecte l'intention de l'utilisateur :

══════════════════════════════════════════
MODE 1 — PROGRAMME DE PUBLICATION
══════════════════════════════════════════
Déclenché si l'utilisateur veut planifier plusieurs semaines.

ÉTAPES dans l'ordre :
1. Demande le TITRE du programme (1 question courte)
2. Demande la DURÉE en semaines (1 question courte)
3. Confirme la fréquence (${postingFrequency} post(s)/semaine) — oui/non
   → Si ça dépasse ${maxPostsPerMonth} posts/mois, signale-le
4. Dès que titre + durée + fréquence confirmés → génère immédiatement :

[PROGRAM_PROPOSAL]
{
  "title": "Titre exact",
  "description": "Programme de X semaines pour ${companyName}",
  "start_date": "YYYY-MM-DD",
  "end_date": "YYYY-MM-DD",
  "posts_per_week": ${postingFrequency},
  "posts": [
    {"week": 1, "day_of_week": "monday", "title": "Post 1 — Semaine 1"},
    {"week": 1, "day_of_week": "thursday", "title": "Post 2 — Semaine 1"}
  ]
}
[/PROGRAM_PROPOSAL]

start_date = prochain lundi après aujourd'hui (${today})
end_date = start_date + (durée × 7 jours)

══════════════════════════════════════════
MODE 2 — IDÉES DE POSTS
══════════════════════════════════════════
Déclenché si l'utilisateur demande des idées, de l'inspiration, des sujets ou des angles de posts.

→ Génère 3 à 5 idées de posts percutantes, adaptées à ${companyName} dans ${industry}.
→ Chaque idée a un titre accrocheur et une description courte (1-2 phrases) expliquant l'angle.
→ Dès que tu as les idées, génère immédiatement :

[IDEAS_PROPOSAL]
[
  {
    "title": "Titre accrocheur du post",
    "description": "L'angle et ce que ce post va apporter à l'audience."
  }
]
[/IDEAS_PROPOSAL]

RÈGLES GÉNÉRALES :
- Réponds TOUJOURS en français
- Maximum 2-3 phrases par réponse (hors propositions JSON)
- Sois direct et efficace`

    // ── 4. Appel Claude API ───────────────────────────────────────────────────
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!anthropicKey) throw new Error('ANTHROPIC_API_KEY non configuré')

    const claudeMessages = [
      ...conversation_history.map(m => ({ role: m.role, content: m.content })),
      { role: 'user' as const, content: message },
    ]

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1500,
        system: systemPrompt,
        messages: claudeMessages,
      }),
    })

    if (!claudeRes.ok) {
      const err = await claudeRes.text()
      throw new Error(`Claude API error: ${claudeRes.status} ${err}`)
    }

    const claudeData = await claudeRes.json() as { content: { text: string }[] }
    const reply = claudeData.content[0]?.text ?? ''

    // ── 5. Parser les propositions ────────────────────────────────────────────
    type ExtractedItem =
      | { type: 'program'; data: Record<string, unknown> }
      | { type: 'idea'; data: { title: string; description: string } }

    const extractedItems: ExtractedItem[] = []

    // Parser programme
    const programMatch = reply.match(/\[PROGRAM_PROPOSAL\]([\s\S]*?)\[\/PROGRAM_PROPOSAL\]/)
    if (programMatch) {
      try {
        const programData = JSON.parse(programMatch[1].trim())
        extractedItems.push({ type: 'program', data: programData })
      } catch {
        // JSON malformé — on ignore
      }
    }

    // Parser idées
    const ideasMatch = reply.match(/\[IDEAS_PROPOSAL\]([\s\S]*?)\[\/IDEAS_PROPOSAL\]/)
    if (ideasMatch) {
      try {
        const ideasData = JSON.parse(ideasMatch[1].trim())
        if (Array.isArray(ideasData)) {
          for (const idea of ideasData) {
            if (idea.title && idea.description) {
              extractedItems.push({ type: 'idea', data: { title: idea.title, description: idea.description } })
            }
          }
        }
      } catch {
        // JSON malformé — on ignore
      }
    }

    // ── 6. Mettre à jour l'historique ─────────────────────────────────────────
    const updatedHistory = [
      ...conversation_history,
      { role: 'user' as const, content: message },
      { role: 'assistant' as const, content: reply },
    ]

    console.log(`[ai-chat] OK reply_length=${reply.length} extracted=${extractedItems.length}`)

    return jsonResponse({
      reply,
      conversation_id: conversation_id ?? null,
      extracted_items: extractedItems,
      conversation_history: updatedHistory,
    })
  } catch (err) {
    console.error('[ai-chat] ERROR', err)

    if (err instanceof z.ZodError) {
      return jsonResponse({ error: 'Validation failed', details: err.flatten() }, 400)
    }

    return jsonResponse({ error: (err as Error).message ?? 'Internal server error' }, 500)
  }
})
