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
  // ── Profil de marque ──────────────────────────────────────────────────────
  const companyName    = (brand.company_name as string) ?? 'Notre entreprise'
  const description    = (brand.description as string) ?? ''
  const industry       = (brand.industry as string) ?? 'notre secteur'
  const tone           = (Array.isArray(brand.tone) ? (brand.tone as string[]).join(', ') : (brand.tone as string)) ?? 'professionnel'
  const targetAudience = (brand.target_audience as string) ?? 'professionnels LinkedIn'
  // keywords = contexte sur l'entreprise uniquement, jamais forcés dans le post
  const keywordsContext = Array.isArray(brand.keywords) && (brand.keywords as string[]).length > 0
    ? (brand.keywords as string[]).join(', ')
    : ''
  const keywordsAvoid  = Array.isArray(brand.keywords_avoid) ? (brand.keywords_avoid as string[]).join(', ') : ''
  const postLength     = (brand.post_length as string) ?? 'medium'
  // hashtagCount : le profil définit COMBIEN de hashtags, pas lesquels (ils doivent venir du sujet du post)
  const hashtagStrategy = (brand.hashtag_strategy as string) ?? 'few'
  const hashtagCount   = hashtagStrategy === 'none' ? '0' : hashtagStrategy === 'few' ? '2 à 3' : hashtagStrategy === 'many' ? '7 à 10' : '4 à 6'
  const signature      = (brand.signature as string) ?? ''
  const examplePosts   = Array.isArray(brand.example_posts) && (brand.example_posts as string[]).length > 0
    ? (brand.example_posts as string[]).slice(0, 2).join('\n\n---\n\n')
    : ''

  const lengthTarget = postLength === 'short' ? '~600' : postLength === 'long' ? '~2000' : '~1200'

  // ── Données du post ────────────────────────────────────────────────────────
  const sourceType      = (post.source_type as string) ?? 'manual'
  const sourceContent   = (post.source_content as string) ?? ''   // angle brainstormé ou doc
  const sourceUrl       = (post.source_url as string) ?? ''
  const title           = (post.title as string) ?? ''
  const existingContent = (post.content as string) ?? ''           // brouillon libre

  // ── System prompt ─────────────────────────────────────────────────────────
  const system = `Tu rédiges des posts LinkedIn au nom de ${companyName}${description ? ` (${description})` : ''}, actif dans le secteur ${industry}.

STYLE D'ÉCRITURE (profil de marque) :
- Ton : ${tone}
- Audience cible : ${targetAudience}
- Longueur : ${lengthTarget} caractères
- Hashtags : ${hashtagCount} hashtag(s) — choisis en fonction du sujet EXACT du post, pas des thèmes généraux de l'entreprise${keywordsAvoid ? `\n- Vocabulaire à bannir : ${keywordsAvoid}` : ''}${signature ? `\n- Signature : ${signature}` : ''}
${keywordsContext ? `\nCONTEXTE ENTREPRISE (pour comprendre le positionnement — NE PAS forcer ces termes dans le post) :\n${keywordsContext}` : ''}${examplePosts ? `\nEXEMPLES DE STYLE APPRÉCIÉ :\n${examplePosts}` : ''}

RÈGLE FONDAMENTALE — SUJET DU POST :
Le contenu, les exemples et les hashtags doivent être déterminés par le SUJET SPÉCIFIQUE fourni ci-dessous.
Le profil de marque donne le style d'écriture — il ne détermine PAS le sujet ni les hashtags.

STANDARDS DE QUALITÉ :
- SUBSTANCE : chiffres réels, dates réglementaires, exemples concrets, étapes actionnables, noms d'acteurs — pas de généralités
- EXPERTISE : écrire en expert qui maîtrise son sujet, pas en communicant qui "parle de" quelque chose
- AUTHENTICITÉ : interdire les formules vides ("Dans un monde où…", "Plus que jamais…", "Il est crucial de…")
- STRUCTURE : hook fort en 1ère ligne, corps aéré avec sauts de ligne, CTA final`

  // ── User prompt selon la source ────────────────────────────────────────────
  let sourceInstruction = ''

  if (sourceType === 'url' && sourceUrl) {
    sourceInstruction = `SOURCE : article extrait de ${sourceUrl}
CONTENU EXTRAIT : ${sourceContent}

MISSION : rédige un post LinkedIn original sur CE sujet précis — pas un résumé, une prise de position ou un insight concret.
Les hashtags doivent correspondre au thème de cet article.`

  } else if (sourceType === 'document') {
    sourceInstruction = `SOURCE : document fourni
CONTENU : ${sourceContent}

MISSION : synthétise les points clés de CE document en un post LinkedIn expert. Les hashtags viennent du contenu du document.`

  } else if (existingContent.trim()) {
    sourceInstruction = `BROUILLON À OPTIMISER :
${existingContent}

MISSION : améliore ce brouillon pour LinkedIn (hook, structure, lisibilité). Ne change pas les idées ni le sujet. Conserve la voix de l'auteur.`

  } else if (sourceContent.trim()) {
    // Brainstorm ou post waiting avec angle défini — la source_content est la directive principale
    sourceInstruction = `SUJET ET ANGLE DU POST :
${sourceContent}

MISSION : rédige un post LinkedIn expert et substantiel sur CE sujet, en suivant CET angle précis.
- Traite uniquement ce sujet — ne le noie pas dans des considérations générales sur l'entreprise
- Mobilise des données factuelles, des exemples réels ou des étapes concrètes propres à CE domaine
- Les hashtags doivent refléter le sujet du post, pas les thèmes habituels de la marque`

  } else {
    sourceInstruction = title
      ? `SUJET : ${title}\n\nMISSION : rédige un post LinkedIn expert sur ce sujet.`
      : `MISSION : rédige un post LinkedIn valorisant l'expertise de ${companyName}.`
  }

  const user = `${sourceInstruction}

Format final :
- Longueur : ${lengthTarget} caractères
- Langue : français${signature ? `\n- Terminer par la signature : ${signature}` : ''}

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
