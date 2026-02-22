// PostPilot — Edge Function : generate-embedding
// Reçoit { document_id, text }, chunk le texte, appelle OpenAI
// text-embedding-3-small et stocke l'embedding moyenné dans documents.

import { createClient } from 'npm:@supabase/supabase-js@2'
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
  /** UUID du document déjà créé dans la table documents */
  document_id: z.string().uuid(),
  /** Texte brut à embedder (max ~50 000 tokens / 200 000 chars) */
  text: z.string().min(1).max(200_000),
})

// ─── Chunking ────────────────────────────────────────────────────────────────
// Découpe le texte en segments de ~2 000 chars (~500 tokens) en respectant
// les limites de paragraphes. Max 20 chunks (= 40 000 chars ~10 000 tokens).

function chunkText(text: string, maxChars = 2_000): string[] {
  const chunks: string[] = []
  const paragraphs = text.split(/\n\n+/)
  let current = ''

  for (const para of paragraphs) {
    if ((current + para).length > maxChars && current.length > 0) {
      chunks.push(current.trim())
      current = ''
    }
    if (para.length > maxChars) {
      // Découpe dure pour les paragraphes très longs
      for (let i = 0; i < para.length; i += maxChars) {
        chunks.push(para.slice(i, i + maxChars))
      }
    } else {
      current += (current ? '\n\n' : '') + para
    }
  }
  if (current.trim()) chunks.push(current.trim())

  return chunks.slice(0, 20)
}

// ─── Mean pooling ─────────────────────────────────────────────────────────────
// Moyenne les vecteurs de chaque chunk en un seul vecteur représentatif.

function averageEmbeddings(embeddings: number[][]): number[] {
  const dims = embeddings[0].length
  const sum = new Array<number>(dims).fill(0)
  for (const emb of embeddings) {
    for (let i = 0; i < dims; i++) sum[i] += emb[i]
  }
  return sum.map((v) => v / embeddings.length)
}

// ─── OpenAI embeddings ────────────────────────────────────────────────────────

async function fetchEmbeddings(
  texts: string[],
  apiKey: string,
): Promise<number[][]> {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small', // 1536 dimensions — cohérent avec vector(1536)
      input: texts,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`OpenAI error ${res.status}: ${body}`)
  }

  const { data } = (await res.json()) as {
    data: { index: number; embedding: number[] }[]
  }

  // Tri sur index pour garantir l'ordre (batch API peut retourner en désordre)
  return data
    .sort((a, b) => a.index - b.index)
    .map((d) => d.embedding)
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
    const openaiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiKey) throw new Error('OPENAI_API_KEY not configured')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Validation de l'input
    const raw = await req.json()
    const { document_id, text } = RequestSchema.parse(raw)

    // Chunking
    const chunks = chunkText(text)
    console.log(
      `[generate-embedding] document=${document_id} chunks=${chunks.length}`,
    )

    // Appels OpenAI en batches de 10 (limite API)
    const allEmbeddings: number[][] = []
    for (let i = 0; i < chunks.length; i += 10) {
      const batch = chunks.slice(i, i + 10)
      const embs = await fetchEmbeddings(batch, openaiKey)
      allEmbeddings.push(...embs)
    }

    // Mean pooling si plusieurs chunks
    const embedding =
      allEmbeddings.length === 1
        ? allEmbeddings[0]
        : averageEmbeddings(allEmbeddings)

    // Mise à jour du document (content + embedding)
    const { error } = await supabase
      .from('documents')
      .update({ content: text, embedding })
      .eq('id', document_id)

    if (error) throw error

    console.log(
      `[generate-embedding] OK document=${document_id} dims=${embedding.length}`,
    )

    return jsonResponse({ success: true, chunks_processed: chunks.length })
  } catch (err) {
    console.error('[generate-embedding] ERROR', err)

    if (err instanceof z.ZodError) {
      return jsonResponse({ error: 'Validation failed', details: err.flatten() }, 400)
    }

    return jsonResponse(
      { error: (err as Error).message ?? 'Internal server error' },
      500,
    )
  }
})
