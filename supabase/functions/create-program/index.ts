// PostPilot — Edge Function : create-program
// Remplace le workflow n8n 10-creation-programme.
// Reçoit { organization_id, program }, crée le programme et ses posts (status='waiting').
// Retourne { program, posts }.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'npm:zod@3'

// ─── CORS ─────────────────────────────────────────────────────────────────────

const CORS = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// ─── Validation ───────────────────────────────────────────────────────────────

const ProgramPostSchema = z.object({
  title: z.string().min(1),
  week: z.number().int().positive(),
  theme: z.string().optional(),
  day_of_week: z.string().optional().default('monday'),
})

const RequestSchema = z.object({
  organization_id: z.string().uuid(),
  program: z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    posts_per_week: z.number().int().min(1).max(7).default(2),
    posts: z.array(ProgramPostSchema).default([]),
  }),
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

const DAY_INDEX: Record<string, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
  thursday: 4, friday: 5, saturday: 6,
}

function calculatePostDate(startDate: Date, weekNumber: number, dayOfWeek: string): Date {
  const weekOffset = (weekNumber - 1) * 7
  const startDay = startDate.getDay()
  const targetDay = DAY_INDEX[dayOfWeek.toLowerCase()] ?? 1

  let dayDiff = targetDay - startDay
  if (dayDiff < 0) dayDiff += 7

  const postDate = new Date(startDate)
  postDate.setDate(postDate.getDate() + weekOffset + dayDiff)
  return postDate
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
    const { organization_id, program: programData } = RequestSchema.parse(raw)

    console.log(`[create-program] org=${organization_id} title="${programData.title}"`)

    // ── 1. Créer le programme ─────────────────────────────────────────────────
    const { data: program, error: programError } = await supabase
      .from('programs')
      .insert({
        organization_id,
        title: programData.title,
        description: programData.description ?? null,
        start_date: programData.start_date,
        end_date: programData.end_date,
        posts_per_week: programData.posts_per_week,
        status: 'active',
      })
      .select()
      .single()

    if (programError || !program) {
      throw new Error(`Erreur création programme: ${programError?.message}`)
    }

    // ── 2. Calculer les dates et créer les posts ───────────────────────────────
    const startDate = new Date(programData.start_date + 'T09:00:00Z')
    const createdPosts: { id: string; title: string; scheduled_at: string }[] = []

    for (let i = 0; i < programData.posts.length; i++) {
      const postDef = programData.posts[i]
      const postDate = calculatePostDate(startDate, postDef.week, postDef.day_of_week ?? 'monday')

      const { data: createdPost, error: postError } = await supabase
        .from('posts')
        .insert({
          organization_id,
          program_id: program.id,
          title: postDef.title,
          content: '',
          status: 'waiting',
          scheduled_at: postDate.toISOString(),
          publication_time: '09:00',
          position_in_program: i + 1,
          platform_type: 'linkedin',
        })
        .select('id, title, scheduled_at')
        .single()

      if (postError) {
        console.error(`[create-program] post insert error (pos ${i + 1})`, postError)
        continue
      }

      if (createdPost) {
        createdPosts.push({
          id: createdPost.id,
          title: createdPost.title ?? postDef.title,
          scheduled_at: createdPost.scheduled_at ?? postDate.toISOString(),
        })
      }
    }

    console.log(`[create-program] OK program_id=${program.id} posts=${createdPosts.length}`)

    return jsonResponse({ program, posts: createdPosts })
  } catch (err) {
    console.error('[create-program] ERROR', err)

    if (err instanceof z.ZodError) {
      return jsonResponse({ error: 'Validation failed', details: err.flatten() }, 400)
    }

    return jsonResponse({ error: (err as Error).message ?? 'Internal server error' }, 500)
  }
})
