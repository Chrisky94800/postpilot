// PostPilot — Client API n8n
// Toutes les interactions avec les webhooks n8n passent par ce fichier.
// Le frontend ne parle JAMAIS directement à Claude API ni à l'API LinkedIn.

// ─── Config ───────────────────────────────────────────────────────────────────

const N8N_BASE_URL = (
  import.meta.env.VITE_N8N_WEBHOOK_BASE_URL as string
).replace(/\/$/, '')

const N8N_API_KEY = import.meta.env.VITE_N8N_API_KEY as string

if (!N8N_BASE_URL) {
  console.warn(
    '[api] VITE_N8N_WEBHOOK_BASE_URL non défini — les appels n8n échoueront',
  )
}

// ─── Fetch wrapper ────────────────────────────────────────────────────────────

class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function n8nPost<TResponse>(
  path: string,
  body: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<TResponse> {
  const res = await fetch(`${N8N_BASE_URL}${path}`, {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': N8N_API_KEY,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const payload = await res.json().catch(() => ({}))
    throw new ApiError(
      res.status,
      (payload as { error?: string }).error ?? `HTTP ${res.status}`,
    )
  }

  return res.json() as Promise<TResponse>
}

// ─── Types des réponses n8n ───────────────────────────────────────────────────

export interface GeneratePostResponse {
  content: string
  version_id: string
}

export interface RevisePostResponse {
  content: string
  version_id: string
}

export interface ScrapeUrlResponse {
  title: string
  summary: string
  content: string
}

export interface TranscribeVocalResponse {
  transcription: string
}

export interface ConnectLinkedInResponse {
  oauth_url: string
}

// V2 — Programmes
export interface ProgramPost {
  title: string
  week: number
  theme?: string
  day_of_week?: string
}

export interface CreateProgramPayload {
  organization_id: string
  program: {
    title: string
    description?: string
    start_date: string
    end_date: string
    posts_per_week: number
    posts: ProgramPost[]
  }
}

export interface CreateProgramResponse {
  program: { id: string; title: string; start_date: string; end_date: string }
  posts: { id: string; title: string; scheduled_at: string }[]
}

// V2 — Chat IA
export interface AiChatPayload {
  organization_id: string
  conversation_id: string | null
  message: string
}

export interface AiChatResponse {
  reply: string
  conversation_id: string
  extracted_items: {
    type: 'program'
    data: {
      title: string
      duration_weeks: number
      posts_per_week: number
      posts: ProgramPost[]
    }
  }[]
}

// ─── Fonctions publiques ──────────────────────────────────────────────────────

/**
 * Déclenche la génération IA d'un post LinkedIn.
 * Workflow n8n : 01-redaction-ia
 */
export async function generatePost(
  postId: string,
  organizationId: string,
  signal?: AbortSignal,
): Promise<GeneratePostResponse> {
  return n8nPost<GeneratePostResponse>(
    '/webhook/generate-post',
    { post_id: postId, organization_id: organizationId },
    signal,
  )
}

/**
 * Demande une révision partielle ou complète du post.
 * Workflow n8n : 02-revision-ia
 */
export async function revisePost(
  postId: string,
  feedback: string,
  scope: string = 'full',
  signal?: AbortSignal,
): Promise<RevisePostResponse> {
  return n8nPost<RevisePostResponse>(
    '/webhook/revise-post',
    { post_id: postId, feedback, scope },
    signal,
  )
}

/**
 * Scrape une URL et retourne le titre + contenu extrait.
 * Workflow n8n : 07-scraping-url
 */
export async function scrapeUrl(
  url: string,
  signal?: AbortSignal,
): Promise<ScrapeUrlResponse> {
  return n8nPost<ScrapeUrlResponse>('/webhook/scrape-url', { url }, signal)
}

/**
 * Transcrit un audio base64 en texte via Whisper.
 * Workflow n8n : (partie de 01-redaction-ia)
 */
export async function transcribeVocal(
  audioBase64: string,
  signal?: AbortSignal,
): Promise<TranscribeVocalResponse> {
  return n8nPost<TranscribeVocalResponse>(
    '/webhook/transcribe-vocal',
    { audio_base64: audioBase64 },
    signal,
  )
}

/**
 * Initie le flow OAuth LinkedIn pour une organisation.
 * Retourne l'URL d'autorisation LinkedIn vers laquelle rediriger l'utilisateur.
 * Workflow n8n : linkedin-oauth-flow
 */
export async function connectLinkedIn(
  organizationId: string,
  signal?: AbortSignal,
): Promise<ConnectLinkedInResponse> {
  return n8nPost<ConnectLinkedInResponse>(
    '/webhook/linkedin-connect',
    { organization_id: organizationId },
    signal,
  )
}

/**
 * Crée un programme de communication et ses posts (status='waiting').
 * Workflow n8n : 10-creation-programme
 */
export async function createProgram(
  payload: CreateProgramPayload,
  signal?: AbortSignal,
): Promise<CreateProgramResponse> {
  return n8nPost<CreateProgramResponse>('/webhook/create-program', payload as unknown as Record<string, unknown>, signal)
}

/**
 * Envoie un message au chat IA du dashboard.
 * Workflow n8n : 11-chat-ia-assistant
 */
export async function aiChat(
  payload: AiChatPayload,
  signal?: AbortSignal,
): Promise<AiChatResponse> {
  return n8nPost<AiChatResponse>('/webhook/ai-chat', payload as unknown as Record<string, unknown>, signal)
}

// ─── Export de l'erreur typée ─────────────────────────────────────────────────

export { ApiError }
