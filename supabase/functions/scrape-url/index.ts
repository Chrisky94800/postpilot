// PostPilot — Edge Function : scrape-url
// Reçoit { url }, fetch la page HTML, extrait titre + contenu principal.
// Retourne { title, summary, content } (content max 3 000 chars).

import { z } from 'npm:zod@3'

// ─── CORS ────────────────────────────────────────────────────────────────────

const CORS = {
  'Access-Control-Allow-Origin':
    Deno.env.get('ALLOWED_ORIGIN') ?? 'https://postpilot.lovable.app',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// ─── Validation ───────────────────────────────────────────────────────────────

const RequestSchema = z.object({
  url: z.string().url('URL invalide'),
})

// ─── SSRF guard ───────────────────────────────────────────────────────────────
// Bloque les URLs pointant vers des ressources internes / privées.

const BLOCKED_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  'metadata.google.internal',
])

// Vérifie les plages d'IPs privées (regex simplifiée pour les cas courants)
const PRIVATE_IP_RE =
  /^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.)/

function assertUrlSafe(url: URL): void {
  const { hostname } = url

  if (BLOCKED_HOSTS.has(hostname)) {
    throw new Error('URL not allowed (private host)')
  }
  if (PRIVATE_IP_RE.test(hostname)) {
    throw new Error('URL not allowed (private IP range)')
  }
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('Only HTTP/HTTPS URLs are allowed')
  }
}

// ─── Extraction du contenu HTML ───────────────────────────────────────────────
// Approche regex : plus simple et fiable dans un environnement edge sans DOM
// complet. Extrait titre, description meta, contenu principal.

interface ExtractedContent {
  title: string
  description: string
  content: string
}

function extractContent(html: string): ExtractedContent {
  // Titre
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i)
  const title = titleMatch
    ? titleMatch[1].replace(/\s+/g, ' ').trim()
    : ''

  // Meta description
  const descMatch = html.match(
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i,
  ) ?? html.match(
    /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i,
  )
  const description = descMatch ? descMatch[1].trim() : ''

  // Suppression des blocs non pertinents
  let body = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<svg[\s\S]*?<\/svg>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<aside[\s\S]*?<\/aside>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')

  // Extraction du contenu sémantique principal (ordre de priorité)
  const semanticMatch =
    body.match(/<article[^>]*>([\s\S]*?)<\/article>/i) ??
    body.match(/<main[^>]*>([\s\S]*?)<\/main>/i) ??
    body.match(/<div[^>]+(?:class|id)=["'][^"']*(?:content|article|post|entry|text)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i) ??
    body.match(/<body[^>]*>([\s\S]*?)<\/body>/i)

  const rawContent = semanticMatch ? semanticMatch[1] : body

  // Conversion des balises block en sauts de ligne
  const withLineBreaks = rawContent
    .replace(/<\/?(p|div|h[1-6]|li|br|tr)[^>]*>/gi, '\n')

  // Strip de toutes les balises restantes + décodage des entités HTML courantes
  const plainText = withLineBreaks
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/[ \t]+/g, ' ')       // espaces multiples
    .replace(/\n{3,}/g, '\n\n')    // sauts de ligne multiples
    .trim()

  return { title, description, content: plainText }
}

// ─── Helper réponses JSON ─────────────────────────────────────────────────────

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
    const raw = await req.json()
    const { url: rawUrl } = RequestSchema.parse(raw)

    const parsed = new URL(rawUrl)
    assertUrlSafe(parsed)

    // Fetch avec timeout de 10 s
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10_000)

    console.log(`[scrape-url] Fetching: ${rawUrl}`)

    const response = await fetch(rawUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'PostPilot/1.0 (content-reader; +https://postpilot.lovable.app)',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'fr,en;q=0.8',
      },
    }).finally(() => clearTimeout(timeout))

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`)
    }

    const contentType = response.headers.get('content-type') ?? ''
    if (!contentType.includes('text/html') && !contentType.includes('xhtml')) {
      throw new Error(`Type non supporté : ${contentType.split(';')[0]}`)
    }

    // Limite la lecture à 1 MB pour éviter les abus
    const MAX_BYTES = 1_048_576
    const reader = response.body?.getReader()
    if (!reader) throw new Error('Empty response body')

    const chunks: Uint8Array[] = []
    let totalBytes = 0

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
      totalBytes += value.length
      if (totalBytes > MAX_BYTES) {
        reader.cancel()
        break
      }
    }

    const html = new TextDecoder().decode(
      chunks.reduce((acc, c) => {
        const merged = new Uint8Array(acc.length + c.length)
        merged.set(acc)
        merged.set(c, acc.length)
        return merged
      }, new Uint8Array(0)),
    )

    const { title, description, content } = extractContent(html)

    // Résumé = meta description OU premiers 200 chars du contenu
    const summary = description || content.slice(0, 200)
    const truncatedContent = content.slice(0, 3_000)

    console.log(
      `[scrape-url] OK url=${rawUrl} title="${title}" content_length=${truncatedContent.length}`,
    )

    return jsonResponse({
      title,
      summary,
      content: truncatedContent,
    })
  } catch (err) {
    console.error('[scrape-url] ERROR', err)

    const error = err as Error

    if (err instanceof z.ZodError) {
      return jsonResponse({ error: 'Validation failed', details: err.flatten() }, 400)
    }
    if (error.name === 'AbortError') {
      return jsonResponse({ error: 'Timeout : la page a mis plus de 10 s à répondre' }, 504)
    }
    if (error.message.startsWith('URL not allowed')) {
      return jsonResponse({ error: error.message }, 403)
    }
    if (error.message.startsWith('HTTP ')) {
      return jsonResponse({ error: error.message }, 502)
    }

    return jsonResponse({ error: error.message ?? 'Internal server error' }, 500)
  }
})
