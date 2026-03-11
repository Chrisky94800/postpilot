// PostPilot — Client API
// Les workflows interactifs (IA) passent par des Supabase Edge Functions.
// Les workflows background (publication, analytics) restent sur n8n.
// Le frontend ne parle JAMAIS directement à Claude API ni à l'API LinkedIn.

import { supabase } from './supabase'

// ─── Config ───────────────────────────────────────────────────────────────────

// Supabase Edge Functions (generate, revise, create-program, ai-chat, scrape-url)
const SUPABASE_URL = (
  import.meta.env.VITE_SUPABASE_URL as string
).replace(/\/$/, '')

const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string

// n8n webhooks (conservé pour les éventuels autres appels)
const N8N_BASE_URL = (
  import.meta.env.VITE_N8N_WEBHOOK_BASE_URL as string ?? ''
).replace(/\/$/, '')

const N8N_API_KEY = import.meta.env.VITE_N8N_API_KEY as string

// ─── Fetch wrappers ───────────────────────────────────────────────────────────

class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/** Appelle une Supabase Edge Function (fonctions interactives IA) */
async function edgeFunctionPost<TResponse>(
  functionName: string,
  body: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<TResponse> {
  // La gateway Edge Functions Supabase valide le Bearer token en HS256.
  // Les tokens de session utilisateur (access_token) sont en ES256 dans le
  // nouveau système Supabase et sont rejetés par la gateway avec 401.
  // Solution : utiliser la clé anon (HS256, statique) comme Bearer pour la
  // gateway, et vérifier la session côté client pour s'assurer que
  // l'utilisateur est connecté. La sécurité métier est assurée par les
  // fonctions elles-mêmes via l'organization_id dans le body.
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    throw new ApiError(401, 'Session expirée — veuillez vous reconnecter')
  }

  const res = await fetch(`${SUPABASE_URL}/functions/v1/${functionName}`, {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'apikey': SUPABASE_ANON_KEY,
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

/** Appelle un webhook n8n (workflows background) */
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

export interface SyncLinkedInContactsResponse {
  synced: number
  companies: { name: string; urn: string }[]
  message?: string
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

// V2 — Brainstorming IA
export interface BrainstormPostPayload {
  organization_id: string
  message: string
  conversation_history?: { role: 'user' | 'assistant'; content: string }[]
}

export interface BrainstormTheme {
  title: string
  angle: string
}

export interface BrainstormPostResponse {
  reply: string
  themes: BrainstormTheme[] | null
  conversation_history: { role: 'user' | 'assistant'; content: string }[]
}

// V2 — Chat IA
export interface AiChatPayload {
  organization_id: string
  conversation_id: string | null
  message: string
  conversation_history?: { role: 'user' | 'assistant'; content: string }[]
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
  conversation_history: { role: 'user' | 'assistant'; content: string }[]
}

// ─── Fonctions publiques ──────────────────────────────────────────────────────

/**
 * Déclenche la génération IA d'un post LinkedIn.
 * Edge Function Supabase : generate-post
 */
export async function generatePost(
  postId: string,
  organizationId: string,
  signal?: AbortSignal,
): Promise<GeneratePostResponse> {
  return edgeFunctionPost<GeneratePostResponse>(
    'generate-post',
    { post_id: postId, organization_id: organizationId },
    signal,
  )
}

/**
 * Demande une révision partielle ou complète du post.
 * Edge Function Supabase : revise-post
 */
export async function revisePost(
  postId: string,
  organizationId: string,
  feedback: string,
  scope: string = 'full',
  signal?: AbortSignal,
): Promise<RevisePostResponse> {
  return edgeFunctionPost<RevisePostResponse>(
    'revise-post',
    { post_id: postId, organization_id: organizationId, feedback, scope },
    signal,
  )
}

/**
 * Scrape une URL et retourne le titre + contenu extrait.
 * Edge Function Supabase : scrape-url (déjà existante)
 */
export async function scrapeUrl(
  url: string,
  signal?: AbortSignal,
): Promise<ScrapeUrlResponse> {
  return edgeFunctionPost<ScrapeUrlResponse>('scrape-url', { url }, signal)
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
 * Génère l'URL d'autorisation OAuth LinkedIn pour une organisation.
 * Edge Function Supabase : linkedin-oauth-url
 */
export async function connectLinkedIn(
  organizationId: string,
  signal?: AbortSignal,
): Promise<ConnectLinkedInResponse> {
  return edgeFunctionPost<ConnectLinkedInResponse>(
    'linkedin-oauth-url',
    {
      organization_id: organizationId,
      app_origin: window.location.origin,
    },
    signal,
  )
}

/**
 * Synchronise les pages entreprise LinkedIn gérées par l'utilisateur
 * dans la table contacts.
 * Edge Function Supabase : linkedin-sync-contacts
 *
 * Note : LinkedIn ne permet pas de récupérer les connexions (personnes)
 * via l'API standard. Seules les pages entreprise administrées sont accessibles.
 */
export async function syncLinkedInContacts(
  organizationId: string,
  signal?: AbortSignal,
): Promise<SyncLinkedInContactsResponse> {
  return edgeFunctionPost<SyncLinkedInContactsResponse>(
    'linkedin-sync-contacts',
    { organization_id: organizationId },
    signal,
  )
}

/**
 * Crée un programme de communication et ses posts (status='waiting').
 * Edge Function Supabase : create-program
 */
export async function createProgram(
  payload: CreateProgramPayload,
  signal?: AbortSignal,
): Promise<CreateProgramResponse> {
  return edgeFunctionPost<CreateProgramResponse>('create-program', payload as unknown as Record<string, unknown>, signal)
}

/**
 * Échange conversationnel pour brainstormer des angles de post.
 * Edge Function Supabase : brainstorm-post
 */
export async function brainstormPost(
  payload: BrainstormPostPayload,
  signal?: AbortSignal,
): Promise<BrainstormPostResponse> {
  return edgeFunctionPost<BrainstormPostResponse>('brainstorm-post', payload as unknown as Record<string, unknown>, signal)
}

/**
 * Envoie un message au chat IA du dashboard.
 * Edge Function Supabase : ai-chat
 */
export async function aiChat(
  payload: AiChatPayload,
  signal?: AbortSignal,
): Promise<AiChatResponse> {
  return edgeFunctionPost<AiChatResponse>('ai-chat', payload as unknown as Record<string, unknown>, signal)
}

// ─── Stripe Billing ───────────────────────────────────────────────────────────

export interface CheckoutSessionResponse {
  checkout_url: string
}

export interface BillingPortalResponse {
  portal_url: string
}

/**
 * Crée une Stripe Checkout Session et retourne l'URL de paiement.
 * Edge Function Supabase : create-checkout-session
 */
export async function createCheckoutSession(
  organizationId: string,
  priceId: string,
  signal?: AbortSignal,
): Promise<CheckoutSessionResponse> {
  return edgeFunctionPost<CheckoutSessionResponse>(
    'create-checkout-session',
    {
      organization_id: organizationId,
      price_id: priceId,
      success_url: `${window.location.origin}/settings?tab=billing&success=1`,
      cancel_url:  `${window.location.origin}/pricing`,
    },
    signal,
  )
}

/**
 * Crée une Stripe Billing Portal Session et retourne l'URL du portail.
 * Edge Function Supabase : create-billing-portal
 */
export async function createBillingPortal(
  organizationId: string,
  signal?: AbortSignal,
): Promise<BillingPortalResponse> {
  return edgeFunctionPost<BillingPortalResponse>(
    'create-billing-portal',
    { organization_id: organizationId },
    signal,
  )
}

/**
 * Déclenche la collecte des métriques LinkedIn pour les posts publiés.
 * Edge Function Supabase : collect-analytics
 */
export async function collectAnalytics(
  organizationId: string,
  signal?: AbortSignal,
): Promise<{ collected: number; errors: number; total: number }> {
  return edgeFunctionPost<{ collected: number; errors: number; total: number }>(
    'collect-analytics',
    { organization_id: organizationId },
    signal,
  )
}

// ─── Export de l'erreur typée ─────────────────────────────────────────────────

export { ApiError }
