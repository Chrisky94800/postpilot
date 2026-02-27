// PostPilot — Edge Function : brainstorm-post
// Échange conversationnel pour trouver le bon angle de post LinkedIn.
// Input:  { organization_id, message, conversation_history? }
// Output: { reply, themes?, conversation_history }
//
// Quand l'IA a assez de contexte, elle propose des thèmes dans :
// [THEMES][{"title":"...", "angle":"..."}][/THEMES]

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
  conversation_history: z.array(MessageSchema).optional().default([]),
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

// ─── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const raw = await req.json()
    const { organization_id, message, conversation_history } = RequestSchema.parse(raw)

    console.log(`[brainstorm-post] org=${organization_id} msg_length=${message.length}`)

    // ── 1. Fetch profil de marque ─────────────────────────────────────────────
    const { data: brand } = await supabase
      .from('brand_profiles')
      .select('company_name, industry, tone, keywords, post_length, target_audience')
      .eq('organization_id', organization_id)
      .single()

    const companyName = brand?.company_name ?? 'votre entreprise'
    const industry = brand?.industry ?? 'votre secteur'
    const tone = Array.isArray(brand?.tone) && brand.tone.length > 0
      ? brand.tone.join(', ')
      : 'professionnel'
    const keywords = Array.isArray(brand?.keywords) && brand.keywords.length > 0
      ? brand.keywords.slice(0, 8).join(', ')
      : ''
    const targetAudience = brand?.target_audience ?? ''
    const postLength = brand?.post_length ?? 'medium'

    // ── 2. Prompt système ─────────────────────────────────────────────────────
    const systemPrompt = `Tu es un stratège de contenu LinkedIn pour ${companyName} (${industry}).

TON RÔLE : aider l'utilisateur à trouver le meilleur angle pour son prochain post LinkedIn.

PROFIL DE MARQUE :
- Ton : ${tone}
- Longueur cible : ${postLength}${targetAudience ? `\n- Audience : ${targetAudience}` : ''}${keywords ? `\n- Mots-clés sectoriels : ${keywords}` : ''}

COMPORTEMENT :
1. Si l'idée est vague ou incomplète, pose UNE question courte et précise (ex: "C'est pour partager votre expérience ou informer sur la réglementation ?")
2. Dès que tu as l'idée principale, propose 4-5 angles distincts et concrets
3. Chaque angle doit être différent dans SON APPROCHE NARRATIVE, pas seulement dans le titre :
   - Témoignage/vécu personnel avec détail concret
   - Données chiffrées et analyse
   - Guide pratique étape par étape
   - Prise de position / opinion tranchée
   - Mythe vs réalité / idée reçue déconstruite
   - Before/after ou transformation
   - Question rhétorique provocante
4. Les angles doivent rester STRICTEMENT sur le sujet demandé — ne pas dériver vers des thèmes connexes génériques

QUALITÉ DES ANGLES :
- L'angle dans "angle" doit préciser : le type de contenu, l'exemple ou la donnée envisagée, la structure narrative
- Exemple MAUVAIS : "angle": "Parlons des avantages de la facturation électronique"
- Exemple BON : "angle": "Partage 3 erreurs concrètes commises lors de la migration vers la facture électronique, avec les solutions trouvées à chaque fois. Structure : erreur → conséquence → solution → leçon."

FORMAT OBLIGATOIRE pour proposer des angles (utilise-le dès que tu as assez de contexte) :

[THEMES]
[
  { "title": "Titre accrocheur du post (hook potentiel)", "angle": "Description précise : type de contenu, exemples ou données envisagés, structure narrative suggérée (3-4 phrases)." },
  { "title": "...", "angle": "..." }
]
[/THEMES]

RÈGLES :
- Réponds TOUJOURS en français
- Max 2 phrases d'intro avant les angles
- Si l'utilisateur demande d'autres angles, propose 4-5 NOUVEAUX angles différents dans l'approche`

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
        max_tokens: 1024,
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

    // ── 4. Parser les thèmes proposés ─────────────────────────────────────────
    type Theme = { title: string; angle: string }
    let themes: Theme[] | null = null

    const themesMatch = reply.match(/\[THEMES\]([\s\S]*?)\[\/THEMES\]/)
    if (themesMatch) {
      try {
        themes = JSON.parse(themesMatch[1].trim()) as Theme[]
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

    console.log(`[brainstorm-post] OK reply_length=${reply.length} themes=${themes?.length ?? 0}`)

    return jsonResponse({
      reply,
      themes,
      conversation_history: updatedHistory,
    })
  } catch (err) {
    console.error('[brainstorm-post] ERROR', err)

    if (err instanceof z.ZodError) {
      return jsonResponse({ error: 'Validation failed', details: err.flatten() }, 400)
    }

    return jsonResponse({ error: (err as Error).message ?? 'Internal server error' }, 500)
  }
})
