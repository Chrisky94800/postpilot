// PostPilot — Edge Function : generate-post
// Remplace le workflow n8n 01-redaction-ia.
// Reçoit { post_id, organization_id }, génère un post LinkedIn via Claude API,
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
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

function buildPrompt(post: Record<string, unknown>, brand: Record<string, unknown>): { system: string; user: string } {
  const companyName = (brand.company_name as string) ?? 'Notre entreprise'
  const industry = (brand.industry as string) ?? 'notre secteur'
  const tone = (Array.isArray(brand.tone) ? brand.tone.join(', ') : brand.tone as string) ?? 'professionnel'
  const targetAudience = (brand.target_audience as string) ?? 'notre audience'
  const keywords = (Array.isArray(brand.keywords) ? brand.keywords.join(', ') : '') ?? ''
  const keywordsAvoid = (Array.isArray(brand.keywords_avoid) ? brand.keywords_avoid.join(', ') : '') ?? ''
  const postLength = (brand.post_length as string) ?? 'medium'
  const hashtagStrategy = (brand.hashtag_strategy as string) ?? 'few'
  const signature = (brand.signature as string) ?? ''

  const lengthTarget = postLength === 'short' ? '~600' : postLength === 'long' ? '~2000' : '~1200'

  const system = `Tu es un expert en rédaction de posts LinkedIn pour ${companyName}, une entreprise de ${industry}.
Tu rédiges des contenus professionnels, engageants et authentiques qui reflètent la voix de la marque.

Profil de marque :
- Audience cible : ${targetAudience}
- Ton : ${tone}
- Mots-clés à intégrer : ${keywords}
- Mots-clés interdits : ${keywordsAvoid}
- Longueur cible : ${lengthTarget} caractères
- Hashtags : stratégie "${hashtagStrategy}"${signature ? `\n- Signature : ${signature}` : ''}`

  const sourceType = (post.source_type as string) ?? 'manual'
  const sourceContent = (post.source_content as string) ?? ''
  const sourceUrl = (post.source_url as string) ?? ''
  const title = (post.title as string) ?? ''

  let sourceInstruction = ''
  if (sourceType === 'url' && sourceUrl) {
    sourceInstruction = `Article extrait de : ${sourceUrl}
Contenu : ${sourceContent}
Rédige un post LinkedIn ORIGINAL inspiré de cet article. Apporte la perspective unique de ${companyName}.`
  } else if (sourceType === 'document') {
    sourceInstruction = `Document uploadé par le client.
Contenu : ${sourceContent}
Rédige un post LinkedIn qui synthétise les points clés en les adaptant à l'audience LinkedIn.`
  } else if (sourceType === 'manual' && (post.content as string)) {
    sourceInstruction = `Le client a rédigé ce brouillon :
${post.content as string}
Optimise-le pour LinkedIn : améliore le hook, la structure et les hashtags. Conserve la voix originale.`
  } else {
    sourceInstruction = title
      ? `Sujet du post : ${title}\nRédige un post LinkedIn engageant sur ce sujet.`
      : `Rédige un post LinkedIn généraliste valorisant l'expertise de ${companyName}.`
  }

  const user = `${sourceInstruction}

Consignes :
1. Accroche percutante en première ligne (avant "...voir plus")
2. Structure avec sauts de ligne pour la lisibilité LinkedIn
3. CTA en fin de post
4. Hashtags selon la stratégie définie
5. Longueur : ${lengthTarget} caractères
6. Langue : français

Génère uniquement le post LinkedIn, sans commentaire ni explication.`

  return { system, user }
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
    const { post_id, organization_id } = RequestSchema.parse(raw)

    console.log(`[generate-post] post_id=${post_id} org=${organization_id}`)

    // ── 1. Fetch post ─────────────────────────────────────────────────────────
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('*')
      .eq('id', post_id)
      .eq('organization_id', organization_id)
      .single()

    if (postError || !post) {
      return jsonResponse({ error: 'Post introuvable' }, 404)
    }

    // ── 2. Fetch brand profile ────────────────────────────────────────────────
    const { data: brand } = await supabase
      .from('brand_profiles')
      .select('*')
      .eq('organization_id', organization_id)
      .single()

    // ── 3. Appel Claude API ───────────────────────────────────────────────────
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!anthropicKey) throw new Error('ANTHROPIC_API_KEY non configuré')

    const { system, user } = buildPrompt(post, brand ?? {})

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
        messages: [{ role: 'user', content: user }],
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
        organization_id,
        version_number: versionNumber,
        content,
        created_by: post.created_by,
      })
      .select('id')
      .single()

    if (versionError) console.error('[generate-post] version insert error', versionError)

    // ── 6. Mettre à jour le post ──────────────────────────────────────────────
    await supabase
      .from('posts')
      .update({ status: 'pending_review', content })
      .eq('id', post_id)

    // ── 7. Notification ───────────────────────────────────────────────────────
    if (post.created_by) {
      await supabase.from('notifications').insert({
        organization_id,
        user_id: post.created_by,
        type: 'post_ready',
        title: 'Votre post est prêt',
        message: `Le post "${post.title ?? 'Sans titre'}" a été généré et attend votre validation.`,
        metadata: { post_id },
      })
    }

    console.log(`[generate-post] OK version=${versionNumber}`)

    return jsonResponse({ content, version_id: version?.id ?? '' })
  } catch (err) {
    console.error('[generate-post] ERROR', err)

    if (err instanceof z.ZodError) {
      return jsonResponse({ error: 'Validation failed', details: err.flatten() }, 400)
    }

    return jsonResponse({ error: (err as Error).message ?? 'Internal server error' }, 500)
  }
})
