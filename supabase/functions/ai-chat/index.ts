// PostPilot — Edge Function : ai-chat
// Remplace le workflow n8n 11-chat-ia-assistant.
// Reçoit { organization_id, message, conversation_history? },
// retourne { reply, conversation_id, extracted_items, conversation_history }.

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
    const [brandRes, programsRes, analyticsRes] = await Promise.all([
      supabase
        .from('brand_profiles')
        .select('company_name, description, industry, target_audience, tone, keywords, post_length')
        .eq('organization_id', organization_id)
        .single(),
      supabase
        .from('programs')
        .select('title, status, start_date, end_date, posts_per_week')
        .eq('organization_id', organization_id)
        .in('status', ['draft', 'active'])
        .limit(10),
      supabase
        .from('post_analytics')
        .select('likes_count, comments_count, impressions_count, engagement_rate')
        .eq('organization_id', organization_id)
        .limit(20),
    ])

    const brand = brandRes.data
    const programs = programsRes.data ?? []
    const analytics = analyticsRes.data ?? []

    // ── 2. Construire le prompt système ───────────────────────────────────────
    const companyName = brand?.company_name ?? 'votre entreprise'
    const industry = brand?.industry ?? 'votre secteur'
    const tone = Array.isArray(brand?.tone) ? brand.tone.join(', ') : (brand?.tone ?? 'professionnel')
    const targetAudience = brand?.target_audience ?? 'votre audience'

    const programsCtx = programs.length > 0
      ? programs.map(p => `- ${p.title} (${p.status}, ${p.start_date} → ${p.end_date}, ${p.posts_per_week} posts/sem)`).join('\n')
      : 'Aucun programme actif.'

    const avgEngagement = analytics.length > 0
      ? (analytics.reduce((s, a) => s + (parseFloat(String(a.engagement_rate)) || 0), 0) / analytics.length).toFixed(2)
      : 'N/A'

    const systemPrompt = `Tu es l'assistant de communication LinkedIn de ${companyName}, une entreprise de ${industry}.
Tu aides à planifier des programmes de publication LinkedIn stratégiques.

CONTEXTE DE LA MARQUE :
- Entreprise : ${companyName}
- Secteur : ${industry}
- Ton : ${tone}
- Audience cible : ${targetAudience}

PROGRAMMES EN COURS :
${programsCtx}

ANALYTICS (engagement moyen sur les derniers posts) : ${avgEngagement}%

INSTRUCTIONS :
- Réponds en français, sois concis et actionnable
- Propose des idées créatives et adaptées au profil de la marque
- Quand l'utilisateur valide un programme, utilise EXACTEMENT ce format JSON dans ta réponse :

[PROGRAM_PROPOSAL]
{
  "title": "Titre du programme",
  "description": "Description courte",
  "start_date": "YYYY-MM-DD",
  "end_date": "YYYY-MM-DD",
  "posts_per_week": 2,
  "posts": [
    {"week": 1, "day_of_week": "monday", "title": "Titre du post semaine 1", "theme": "Thème"},
    {"week": 1, "day_of_week": "thursday", "title": "Titre du post semaine 1", "theme": "Thème"},
    {"week": 2, "day_of_week": "monday", "title": "Titre du post semaine 2", "theme": "Thème"},
    {"week": 2, "day_of_week": "thursday", "title": "Titre du post semaine 2", "theme": "Thème"}
  ]
}
[/PROGRAM_PROPOSAL]

N'utilise ce format QUE si l'utilisateur demande explicitement à créer/valider un programme.`

    // ── 3. Appel Claude API ───────────────────────────────────────────────────
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
        max_tokens: 2048,
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

    // ── 4. Parser les propositions de programme ───────────────────────────────
    type ExtractedItem = { type: 'program'; data: Record<string, unknown> }
    const extractedItems: ExtractedItem[] = []

    const programMatch = reply.match(/\[PROGRAM_PROPOSAL\]([\s\S]*?)\[\/PROGRAM_PROPOSAL\]/)
    if (programMatch) {
      try {
        const programData = JSON.parse(programMatch[1].trim())
        extractedItems.push({ type: 'program', data: programData })
      } catch {
        // JSON malformé — on ignore
      }
    }

    // ── 5. Mettre à jour l'historique ─────────────────────────────────────────
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
