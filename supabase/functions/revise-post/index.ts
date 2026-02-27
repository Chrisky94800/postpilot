// PostPilot — Edge Function : revise-post
// Remplace le workflow n8n 02-revision-ia.
// Reçoit { post_id, feedback, scope }, révise le post via Claude API,
// sauvegarde la version et retourne { content, version_id }.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'npm:zod@3'

// ─── CORS ─────────────────────────────────────────────────────────────────────

const CORS = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// ─── Validation ───────────────────────────────────────────────────────────────

const RequestSchema = z.object({
  post_id: z.string().uuid(),
  organization_id: z.string().uuid(),
  feedback: z.string().min(1),
  scope: z.enum(['full', 'opening', 'closing', 'tone', 'length', 'keywords']).default('full'),
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

function scopeInstruction(scope: string): string {
  switch (scope) {
    case 'opening': return "Ne modifie QUE la première ligne (accroche). Garde le reste strictement identique."
    case 'closing': return "Ne modifie QUE la conclusion et le CTA. Garde le reste strictement identique."
    case 'tone': return "Modifie uniquement le ton du post. Conserve la structure et le contenu."
    case 'length': return "Ajuste uniquement la longueur selon le feedback. Conserve le fond."
    case 'keywords': return "Intègre ou retire les mots-clés demandés. Conserve la structure générale."
    default: return "Révise l'intégralité du post selon le feedback."
  }
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
    const { post_id, organization_id, feedback, scope } = RequestSchema.parse(raw)

    console.log(`[revise-post] post_id=${post_id} org=${organization_id} scope=${scope}`)

    // ── 1. Fetch post (with org isolation check) ──────────────────────────────
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('id, organization_id, content, title, created_by')
      .eq('id', post_id)
      .eq('organization_id', organization_id)   // ← isolation multi-tenant
      .single()

    if (postError || !post) {
      return jsonResponse({ error: 'Post introuvable' }, 404)
    }

    // ── 2. Fetch brand profile ────────────────────────────────────────────────
    const { data: brand } = await supabase
      .from('brand_profiles')
      .select('tone, keywords, keywords_avoid')
      .eq('organization_id', post.organization_id)
      .single()

    // ── 3. Appel Claude API ───────────────────────────────────────────────────
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!anthropicKey) throw new Error('ANTHROPIC_API_KEY non configuré')

    const tone = brand?.tone ? (Array.isArray(brand.tone) ? brand.tone.join(', ') : brand.tone) : 'professionnel'
    const keywords = brand?.keywords ? (Array.isArray(brand.keywords) ? brand.keywords.join(', ') : '') : ''
    const keywordsAvoid = brand?.keywords_avoid ? (Array.isArray(brand.keywords_avoid) ? brand.keywords_avoid.join(', ') : '') : ''

    const system = `Tu es un expert en rédaction LinkedIn. Tu révises un post existant selon le feedback du client.
Tu respectes scrupuleusement le profil de marque et les instructions de révision.`

    const userPrompt = `Post actuel :
${post.content}

Feedback du client :
${feedback}

Portée de la révision : ${scopeInstruction(scope)}

Profil de marque (rappel) :
- Ton : ${tone}
- Mots-clés à intégrer : ${keywords}
- Mots-clés interdits : ${keywordsAvoid}

Révise le post en appliquant le feedback. Retourne uniquement le post révisé, sans commentaire.`

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
        system,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    })

    if (!claudeRes.ok) {
      const err = await claudeRes.text()
      throw new Error(`Claude API error: ${claudeRes.status} ${err}`)
    }

    const claudeData = await claudeRes.json() as { content: { text: string }[] }
    const content = claudeData.content[0]?.text ?? ''

    if (!content) throw new Error('Claude a retourné une réponse vide')

    // ── 4. Version number ─────────────────────────────────────────────────────
    const { count } = await supabase
      .from('post_versions')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', post_id)

    const versionNumber = (count ?? 0) + 1

    // ── 5. Insérer la version ─────────────────────────────────────────────────
    const { data: version, error: versionError } = await supabase
      .from('post_versions')
      .insert({
        post_id,
        organization_id: post.organization_id,
        version_number: versionNumber,
        content,
        feedback,
        created_by: post.created_by,
      })
      .select('id')
      .single()

    if (versionError) console.error('[revise-post] version insert error', versionError)

    // ── 6. Mettre à jour le contenu du post ───────────────────────────────────
    await supabase
      .from('posts')
      .update({ content })
      .eq('id', post_id)

    // ── 7. Notification ───────────────────────────────────────────────────────
    if (post.created_by) {
      await supabase.from('notifications').insert({
        organization_id: post.organization_id,
        user_id: post.created_by,
        type: 'post_ready',
        title: 'Votre post révisé est prêt',
        message: `La révision du post "${post.title ?? 'Sans titre'}" est disponible.`,
        metadata: { post_id, version_number: versionNumber },
      })
    }

    console.log(`[revise-post] OK version=${versionNumber}`)

    return jsonResponse({ content, version_id: version?.id ?? '' })
  } catch (err) {
    console.error('[revise-post] ERROR', err)

    if (err instanceof z.ZodError) {
      return jsonResponse({ error: 'Validation failed', details: err.flatten() }, 400)
    }

    return jsonResponse({ error: (err as Error).message ?? 'Internal server error' }, 500)
  }
})
