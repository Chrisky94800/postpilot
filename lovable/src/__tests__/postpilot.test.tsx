/**
 * PostPilot — Suite de tests unitaires complète
 *
 * Testé en se mettant dans la peau d'un utilisateur :
 *   1. Utils             — Formatage dates, classes CSS, troncature
 *   2. Constantes        — Statuts, limites, plans, types
 *   3. API Client        — ApiError, fetch mocking, endpoints
 *   4. Logique Posts     — Validation, statuts, modes source
 *   5. Logique Programmes — Timeline, calcul semaines, progression
 *   6. Logique Calendrier — Grille, navigation, sélection de jour
 *   7. Plans & Quotas    — Limites d'abonnement
 *   8. Composants UI     — Rendu HTML des composants clés
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// ─── Imports sous test ────────────────────────────────────────────────────────

import { cn, formatDate, formatDateTime, formatRelative, truncate } from '@/lib/utils'
import {
  POST_STATUSES,
  SOURCE_TYPES,
  LINKEDIN_POST_MAX_LENGTH,
  SUBSCRIPTION_PLANS,
  TONE_OPTIONS,
  WEEK_DAYS,
  MEMBER_ROLES,
  FEEDBACK_SCOPES,
  NOTIFICATION_TYPES,
  INDUSTRIES,
  EVENT_TYPES,
  PLATFORMS,
  NOTIFICATION_PREVIEW_COUNT,
} from '@/lib/constants'
import {
  ApiError,
  generatePost,
  revisePost,
  scrapeUrl,
  createProgram,
  aiChat,
  transcribeVocal,
  connectLinkedIn,
} from '@/lib/api'

// ─── Wrapper React Query pour les tests de composants ─────────────────────────

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>{children}</MemoryRouter>
      </QueryClientProvider>
    )
  }
}

// ─── Helpers pour mocker fetch ────────────────────────────────────────────────

function mockFetchOk(body: unknown) {
  vi.mocked(global.fetch).mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve(body),
  } as Response)
}

function mockFetchError(status: number, errorBody?: unknown) {
  vi.mocked(global.fetch).mockResolvedValue({
    ok: false,
    status,
    json: () => Promise.resolve(errorBody ?? {}),
  } as Response)
}

// =============================================================================
// ─── 1. UTILS ─────────────────────────────────────────────────────────────────
// =============================================================================

describe('Utils — cn()', () => {
  it('retourne une chaîne vide sans arguments', () => {
    expect(cn()).toBe('')
  })

  it('retourne une classe unique', () => {
    expect(cn('text-red-500')).toBe('text-red-500')
  })

  it('fusionne plusieurs classes', () => {
    expect(cn('px-4', 'py-2')).toBe('px-4 py-2')
  })

  it('ignore les valeurs undefined/null/false', () => {
    expect(cn('base', undefined, null, false, 'other')).toBe('base other')
  })

  it('résout les conflits Tailwind (la dernière gagne)', () => {
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500')
  })

  it('gère les classes conditionnelles (objet)', () => {
    expect(cn({ 'font-bold': true, 'text-sm': false })).toBe('font-bold')
  })
})

describe('Utils — formatDate()', () => {
  it("retourne '—' pour null", () => {
    expect(formatDate(null)).toBe('—')
  })

  it("retourne '—' pour undefined", () => {
    expect(formatDate(undefined)).toBe('—')
  })

  it("retourne '—' pour une chaîne vide", () => {
    expect(formatDate('')).toBe('—')
  })

  it('formate une date ISO en français', () => {
    const result = formatDate('2026-03-15T10:00:00.000Z')
    expect(result).toMatch(/15/)
    expect(result).toMatch(/2026/)
    // Mars en français
    expect(result.toLowerCase()).toMatch(/mars/)
  })

  it('formate correctement le 1er janvier', () => {
    const result = formatDate('2026-01-01T00:00:00.000Z')
    expect(result).toMatch(/2026/)
    expect(result.toLowerCase()).toMatch(/janvier/)
  })
})

describe('Utils — formatDateTime()', () => {
  it("retourne '—' pour null", () => {
    expect(formatDateTime(null)).toBe('—')
  })

  it("retourne '—' pour undefined", () => {
    expect(formatDateTime(undefined)).toBe('—')
  })

  it('inclut la date et l\'heure', () => {
    const result = formatDateTime('2026-03-15T14:30:00.000Z')
    expect(result).toMatch(/2026/)
    // Devrait contenir une heure
    expect(result).toMatch(/\d{2}:\d{2}/)
  })
})

describe('Utils — formatRelative()', () => {
  const FIXED_NOW = new Date('2026-02-15T12:00:00.000Z').getTime()

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(FIXED_NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("retourne '—' pour null", () => {
    expect(formatRelative(null)).toBe('—')
  })

  it("retourne '—' pour undefined", () => {
    expect(formatRelative(undefined)).toBe('—')
  })

  it("retourne \"à l'instant\" pour 0ms", () => {
    expect(formatRelative('2026-02-15T12:00:00.000Z')).toBe("à l'instant")
  })

  it('retourne "il y a X minutes" pour un passé récent', () => {
    // 3 minutes avant
    expect(formatRelative('2026-02-15T11:57:00.000Z')).toBe('il y a 3 minutes')
  })

  it('retourne "il y a 1 minute" au singulier', () => {
    expect(formatRelative('2026-02-15T11:59:00.000Z')).toBe('il y a 1 minute')
  })

  it('retourne "il y a X heures" pour 2h passées', () => {
    // 2 heures avant
    expect(formatRelative('2026-02-15T10:00:00.000Z')).toBe('il y a 2 heures')
  })

  it('retourne "dans X minutes" pour le futur', () => {
    // 5 minutes dans le futur
    expect(formatRelative('2026-02-15T12:05:00.000Z')).toBe('dans 5 minutes')
  })

  it('retourne "dans X heures" pour un futur de quelques heures', () => {
    // 3 heures dans le futur
    expect(formatRelative('2026-02-15T15:00:00.000Z')).toBe('dans 3 heures')
  })
})

describe('Utils — truncate()', () => {
  it('retourne le texte inchangé si inférieur à la limite', () => {
    expect(truncate('court', 10)).toBe('court')
  })

  it('retourne le texte inchangé si exactement à la limite', () => {
    expect(truncate('exactement', 10)).toBe('exactement')
  })

  it('tronque et ajoute une ellipse si supérieur à la limite', () => {
    const result = truncate('texte trop long', 5)
    expect(result).toMatch(/…$/)
    expect(result.length).toBeLessThanOrEqual(6) // 5 chars + ellipse
  })

  it('supprime les espaces finaux avant l\'ellipse', () => {
    const result = truncate('hello world!', 8)
    expect(result).not.toMatch(/ …$/)
    expect(result).toMatch(/…$/)
  })

  it('gère une chaîne vide', () => {
    expect(truncate('', 10)).toBe('')
  })
})

// =============================================================================
// ─── 2. CONSTANTES ───────────────────────────────────────────────────────────
// =============================================================================

describe('Constantes — POST_STATUSES', () => {
  const EXPECTED_STATUSES = ['waiting', 'draft', 'pending_review', 'approved', 'scheduled', 'published', 'failed'] as const

  it('contient exactement 7 statuts', () => {
    expect(Object.keys(POST_STATUSES)).toHaveLength(7)
  })

  EXPECTED_STATUSES.forEach((status) => {
    it(`"${status}" a un label, une couleur et une description`, () => {
      const s = POST_STATUSES[status]
      expect(s).toBeDefined()
      expect(s.label).toBeTruthy()
      expect(s.color).toMatch(/^bg-/)
      expect(s.description).toBeTruthy()
    })
  })

  it('"waiting" représente un post non rédigé créé par un programme', () => {
    expect(POST_STATUSES.waiting.label).toBe('En attente')
  })

  it('"published" a une couleur verte', () => {
    expect(POST_STATUSES.published.color).toMatch(/green/)
  })

  it('"failed" a une couleur rouge', () => {
    expect(POST_STATUSES.failed.color).toMatch(/red/)
  })
})

describe('Constantes — LINKEDIN_POST_MAX_LENGTH', () => {
  it('vaut exactement 3000', () => {
    expect(LINKEDIN_POST_MAX_LENGTH).toBe(3000)
  })
})

describe('Constantes — SOURCE_TYPES', () => {
  const EXPECTED = ['manual', 'url', 'vocal', 'document', 'rss', 'calendar_event'] as const

  it('contient exactement 6 types', () => {
    expect(Object.keys(SOURCE_TYPES)).toHaveLength(6)
  })

  EXPECTED.forEach((type) => {
    it(`"${type}" a un label, une icône et une description`, () => {
      const s = SOURCE_TYPES[type]
      expect(s.label).toBeTruthy()
      expect(s.icon).toBeTruthy()
      expect(s.description).toBeTruthy()
    })
  })
})

describe('Constantes — SUBSCRIPTION_PLANS', () => {
  it('contient 3 plans', () => {
    expect(Object.keys(SUBSCRIPTION_PLANS)).toHaveLength(3)
  })

  it('Starter : 8 posts/mois', () => {
    expect(SUBSCRIPTION_PLANS.starter.maxPosts).toBe(8)
  })

  it('Pro : 20 posts/mois', () => {
    expect(SUBSCRIPTION_PLANS.pro.maxPosts).toBe(20)
  })

  it('Business : 60 posts/mois', () => {
    expect(SUBSCRIPTION_PLANS.business.maxPosts).toBe(60)
  })

  it('les quotas sont croissants : Starter < Pro < Business', () => {
    expect(SUBSCRIPTION_PLANS.starter.maxPosts)
      .toBeLessThan(SUBSCRIPTION_PLANS.pro.maxPosts)
    expect(SUBSCRIPTION_PLANS.pro.maxPosts)
      .toBeLessThan(SUBSCRIPTION_PLANS.business.maxPosts)
  })

  it('chaque plan a au moins 4 fonctionnalités', () => {
    Object.values(SUBSCRIPTION_PLANS).forEach((plan) => {
      expect(plan.features.length).toBeGreaterThanOrEqual(4)
    })
  })

  it('les prix contiennent le symbole €', () => {
    Object.values(SUBSCRIPTION_PLANS).forEach((plan) => {
      expect(plan.price).toMatch(/€/)
    })
  })
})

describe('Constantes — TONE_OPTIONS', () => {
  it('contient exactement 10 options de ton', () => {
    expect(TONE_OPTIONS).toHaveLength(10)
  })

  it('chaque option a une value et un label', () => {
    TONE_OPTIONS.forEach((tone) => {
      expect(tone.value).toBeTruthy()
      expect(tone.label).toBeTruthy()
    })
  })

  it('contient l\'option "professionnel"', () => {
    expect(TONE_OPTIONS.find((t) => t.value === 'professionnel')).toBeDefined()
  })
})

describe('Constantes — WEEK_DAYS', () => {
  it('contient 7 jours', () => {
    expect(WEEK_DAYS).toHaveLength(7)
  })

  it('commence par lundi', () => {
    expect(WEEK_DAYS[0].value).toBe('monday')
  })

  it('se termine par dimanche', () => {
    expect(WEEK_DAYS[6].value).toBe('sunday')
  })

  it('chaque jour a une version courte (3 lettres)', () => {
    WEEK_DAYS.forEach((day) => {
      expect(day.short).toHaveLength(3)
    })
  })
})

describe('Constantes — NOTIFICATION_TYPES', () => {
  const EXPECTED = [
    'post_ready', 'post_published', 'post_failed',
    'token_expired', 'token_refreshed', 'analytics_ready',
    'rss_found', 'event_reminder', 'error',
  ] as const

  it('contient exactement 9 types', () => {
    expect(Object.keys(NOTIFICATION_TYPES)).toHaveLength(9)
  })

  EXPECTED.forEach((type) => {
    it(`"${type}" a un label et une icône`, () => {
      const n = NOTIFICATION_TYPES[type]
      expect(n.label).toBeTruthy()
      expect(n.icon).toBeTruthy()
    })
  })
})

describe('Constantes — FEEDBACK_SCOPES', () => {
  it('contient exactement 6 scopes', () => {
    expect(Object.keys(FEEDBACK_SCOPES)).toHaveLength(6)
  })

  it('contient "full" pour une réécriture complète', () => {
    expect(FEEDBACK_SCOPES.full).toBeDefined()
    expect(FEEDBACK_SCOPES.full.label).toBeTruthy()
  })
})

describe('Constantes — PLATFORMS', () => {
  it('LinkedIn est en Phase 1', () => {
    expect(PLATFORMS.linkedin.phase).toBe(1)
  })

  it('Instagram et TikTok sont en Phase 2', () => {
    expect(PLATFORMS.instagram.phase).toBe(2)
    expect(PLATFORMS.tiktok.phase).toBe(2)
  })

  it('la couleur LinkedIn est #0077B5', () => {
    expect(PLATFORMS.linkedin.color).toBe('#0077B5')
  })
})

describe('Constantes — INDUSTRIES', () => {
  it('contient exactement 13 secteurs', () => {
    expect(INDUSTRIES).toHaveLength(13)
  })

  it('se termine par "Autre"', () => {
    expect(INDUSTRIES[INDUSTRIES.length - 1]).toBe('Autre')
  })
})

describe('Constantes — NOTIFICATION_PREVIEW_COUNT', () => {
  it('vaut 5', () => {
    expect(NOTIFICATION_PREVIEW_COUNT).toBe(5)
  })
})

// =============================================================================
// ─── 3. API CLIENT ───────────────────────────────────────────────────────────
// =============================================================================

describe('API — ApiError', () => {
  it('hérite de Error', () => {
    const err = new ApiError(404, 'Not found')
    expect(err).toBeInstanceOf(Error)
  })

  it('a un nom "ApiError"', () => {
    const err = new ApiError(401, 'Unauthorized')
    expect(err.name).toBe('ApiError')
  })

  it('stocke le statut HTTP', () => {
    const err = new ApiError(500, 'Server error')
    expect(err.status).toBe(500)
  })

  it('stocke le message', () => {
    const err = new ApiError(403, 'Forbidden')
    expect(err.message).toBe('Forbidden')
  })

  it('peut être catchable par instanceof', () => {
    try {
      throw new ApiError(429, 'Too many requests')
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError)
      expect((e as ApiError).status).toBe(429)
    }
  })
})

describe('API — generatePost()', () => {
  it('appelle le bon endpoint avec le bon payload', async () => {
    mockFetchOk({ content: 'Post généré', version_id: 'v-123' })

    const result = await generatePost('post-id', 'org-id')

    expect(global.fetch).toHaveBeenCalledOnce()
    const [url, options] = vi.mocked(global.fetch).mock.calls[0]
    expect(String(url)).toMatch('/functions/v1/generate-post')
    const body = JSON.parse(options!.body as string)
    expect(body.post_id).toBe('post-id')
    expect(body.organization_id).toBe('org-id')
  })

  it('retourne content et version_id', async () => {
    mockFetchOk({ content: 'Post IA', version_id: 'v-1' })
    const result = await generatePost('p1', 'o1')
    expect(result.content).toBe('Post IA')
    expect(result.version_id).toBe('v-1')
  })

  it('inclut le header Authorization (Supabase)', async () => {
    mockFetchOk({ content: '', version_id: '' })
    await generatePost('p1', 'o1')
    const [, options] = vi.mocked(global.fetch).mock.calls[0]
    const headers = options!.headers as Record<string, string>
    expect(headers['Authorization']).toMatch(/^Bearer /)
  })

  it('lance ApiError pour une réponse 401', async () => {
    mockFetchError(401, { error: 'Unauthorized' })
    await expect(generatePost('p1', 'o1')).rejects.toBeInstanceOf(ApiError)
  })

  it('lance ApiError avec le bon statut HTTP', async () => {
    mockFetchError(429, { error: 'Rate limit' })
    try {
      await generatePost('p1', 'o1')
    } catch (e) {
      expect((e as ApiError).status).toBe(429)
    }
  })

  it('utilise le message d\'erreur du body JSON', async () => {
    mockFetchError(400, { error: 'post_id manquant' })
    try {
      await generatePost('', '')
    } catch (e) {
      expect((e as ApiError).message).toBe('post_id manquant')
    }
  })

  it('utilise "HTTP 500" si pas de message dans le body', async () => {
    mockFetchError(500, {})
    try {
      await generatePost('p1', 'o1')
    } catch (e) {
      expect((e as ApiError).message).toBe('HTTP 500')
    }
  })

  it('passe le signal AbortController', async () => {
    mockFetchOk({ content: '', version_id: '' })
    const controller = new AbortController()
    await generatePost('p1', 'o1', controller.signal)
    const [, options] = vi.mocked(global.fetch).mock.calls[0]
    expect(options!.signal).toBe(controller.signal)
  })
})

describe('API — revisePost()', () => {
  it('appelle /webhook/revise-post', async () => {
    mockFetchOk({ content: 'Post révisé', version_id: 'v-2' })
    await revisePost('p1', 'Rends-le plus court', 'length')
    const [url] = vi.mocked(global.fetch).mock.calls[0]
    expect(String(url)).toMatch('/functions/v1/revise-post')
  })

  it('envoie post_id, feedback et scope', async () => {
    mockFetchOk({ content: '', version_id: '' })
    await revisePost('post-abc', 'Changer le ton', 'tone')
    const [, options] = vi.mocked(global.fetch).mock.calls[0]
    const body = JSON.parse(options!.body as string)
    expect(body.post_id).toBe('post-abc')
    expect(body.feedback).toBe('Changer le ton')
    expect(body.scope).toBe('tone')
  })

  it('scope par défaut est "full"', async () => {
    mockFetchOk({ content: '', version_id: '' })
    await revisePost('p1', 'feedback')
    const [, options] = vi.mocked(global.fetch).mock.calls[0]
    const body = JSON.parse(options!.body as string)
    expect(body.scope).toBe('full')
  })
})

describe('API — scrapeUrl()', () => {
  it('appelle /webhook/scrape-url avec l\'URL', async () => {
    mockFetchOk({ title: 'Article', summary: 'Résumé', content: 'Contenu' })
    await scrapeUrl('https://example.com/article')
    const [url, options] = vi.mocked(global.fetch).mock.calls[0]
    expect(String(url)).toMatch('/functions/v1/scrape-url')
    const body = JSON.parse(options!.body as string)
    expect(body.url).toBe('https://example.com/article')
  })

  it('retourne title, summary et content', async () => {
    mockFetchOk({ title: 'Mon article', summary: 'En bref', content: 'Le texte' })
    const result = await scrapeUrl('https://example.com')
    expect(result.title).toBe('Mon article')
    expect(result.summary).toBe('En bref')
    expect(result.content).toBe('Le texte')
  })
})

describe('API — createProgram()', () => {
  it('appelle /webhook/create-program', async () => {
    mockFetchOk({
      program: { id: 'prog-1', title: 'Prog test', start_date: '2026-03-01', end_date: '2026-04-01' },
      posts: [],
    })
    await createProgram({
      organization_id: 'org-1',
      program: {
        title: 'Programme test',
        start_date: '2026-03-01',
        end_date: '2026-04-01',
        posts_per_week: 2,
        posts: [{ title: 'Post 1', week: 1 }],
      },
    })
    const [url] = vi.mocked(global.fetch).mock.calls[0]
    expect(String(url)).toMatch('/functions/v1/create-program')
  })
})

describe('API — aiChat()', () => {
  it('appelle /webhook/ai-chat', async () => {
    mockFetchOk({ reply: 'Réponse IA', conversation_id: 'conv-1', extracted_items: [] })
    await aiChat({ organization_id: 'org-1', conversation_id: null, message: 'Bonjour' })
    const [url] = vi.mocked(global.fetch).mock.calls[0]
    expect(String(url)).toMatch('/functions/v1/ai-chat')
  })

  it('retourne reply, conversation_id et extracted_items', async () => {
    mockFetchOk({ reply: 'Je vais vous aider', conversation_id: 'conv-42', extracted_items: [] })
    const result = await aiChat({ organization_id: 'org-1', conversation_id: null, message: 'Hello' })
    expect(result.reply).toBe('Je vais vous aider')
    expect(result.conversation_id).toBe('conv-42')
    expect(result.extracted_items).toEqual([])
  })
})

// =============================================================================
// ─── 4. LOGIQUE MÉTIER — POSTS ────────────────────────────────────────────────
// =============================================================================

describe('Posts — Comptage de caractères LinkedIn', () => {
  // La limite est LINKEDIN_POST_MAX_LENGTH (3000)

  it('un post vide a 0 caractères', () => {
    expect(''.length).toBe(0)
  })

  it('un post de 2999 chars est sous la limite', () => {
    const content = 'a'.repeat(2999)
    expect(content.length > LINKEDIN_POST_MAX_LENGTH).toBe(false)
  })

  it('un post de 3000 chars est exactement à la limite', () => {
    const content = 'a'.repeat(3000)
    expect(content.length > LINKEDIN_POST_MAX_LENGTH).toBe(false)
  })

  it('un post de 3001 chars dépasse la limite', () => {
    const content = 'a'.repeat(3001)
    expect(content.length > LINKEDIN_POST_MAX_LENGTH).toBe(true)
  })

  it('le décompte est exact pour un texte multilignes', () => {
    const content = 'Bonjour\nMonde\nPostPilot'
    expect(content.length).toBe(23) // 7 + 1 + 5 + 1 + 9
  })
})

describe('Posts — Mapping mode source → source_type', () => {
  // Logique tirée de PostEditor.tsx
  const modeToSourceType: Record<string, string> = {
    free_writing: 'manual',
    url: 'url',
    document: 'document',
  }

  it('free_writing → manual', () => {
    expect(modeToSourceType['free_writing']).toBe('manual')
  })

  it('url → url', () => {
    expect(modeToSourceType['url']).toBe('url')
  })

  it('document → document', () => {
    expect(modeToSourceType['document']).toBe('document')
  })
})

describe('Posts — Statut "canEdit" (peut être rédigé)', () => {
  // Un post peut être rédigé si status = 'waiting' ou 'draft'
  // Logique tirée de ProgramTimeline.tsx et Calendar.tsx

  function canEdit(status: string): boolean {
    return status === 'waiting' || status === 'draft'
  }

  it('"waiting" peut être rédigé', () => {
    expect(canEdit('waiting')).toBe(true)
  })

  it('"draft" peut être rédigé', () => {
    expect(canEdit('draft')).toBe(true)
  })

  it('"pending_review" ne peut pas être rédigé', () => {
    expect(canEdit('pending_review')).toBe(false)
  })

  it('"approved" ne peut pas être rédigé', () => {
    expect(canEdit('approved')).toBe(false)
  })

  it('"published" ne peut pas être rédigé', () => {
    expect(canEdit('published')).toBe(false)
  })

  it('"failed" ne peut pas être rédigé', () => {
    expect(canEdit('failed')).toBe(false)
  })
})

describe('Posts — Affichage du titre (fallback)', () => {
  // Logique : post.title ?? (post.content ? content.slice(0,60) + '…' : 'Sans titre')

  function getDisplayTitle(title: string | null, content: string | null): string {
    return title ?? (content ? content.slice(0, 60) + '…' : 'Sans titre')
  }

  it('affiche le titre si présent', () => {
    expect(getDisplayTitle('Mon titre', 'Du contenu')).toBe('Mon titre')
  })

  it('affiche les 60 premiers chars du contenu si pas de titre', () => {
    const content = 'a'.repeat(80)
    const result = getDisplayTitle(null, content)
    expect(result).toBe('a'.repeat(60) + '…')
  })

  it('affiche "Sans titre" si ni titre ni contenu', () => {
    expect(getDisplayTitle(null, null)).toBe('Sans titre')
  })

  it('affiche "Sans titre" si contenu vide', () => {
    expect(getDisplayTitle(null, '')).toBe('Sans titre')
  })
})

// =============================================================================
// ─── 5. LOGIQUE MÉTIER — PROGRAMMES ──────────────────────────────────────────
// =============================================================================

describe('Programmes — Calcul de la progression', () => {
  function calcProgress(published: number, total: number): number {
    return total > 0 ? Math.round((published / total) * 100) : 0
  }

  it('0 post publié sur 5 = 0%', () => {
    expect(calcProgress(0, 5)).toBe(0)
  })

  it('0 post total = 0% (pas de division par 0)', () => {
    expect(calcProgress(0, 0)).toBe(0)
  })

  it('2 posts publiés sur 5 = 40%', () => {
    expect(calcProgress(2, 5)).toBe(40)
  })

  it('5 posts publiés sur 5 = 100%', () => {
    expect(calcProgress(5, 5)).toBe(100)
  })

  it('arrondit correctement', () => {
    expect(calcProgress(1, 3)).toBe(33) // 33.33...
  })
})

describe('Programmes — Groupement par semaine (Timeline)', () => {
  // Logique de ProgramTimeline.tsx :
  // weekNum = Math.floor((postDate - firstDate) / (7 * 86400000)) + 1

  function calcWeekNum(firstDateISO: string, postDateISO: string): number {
    const firstDate = new Date(firstDateISO)
    const postDate = new Date(postDateISO)
    return Math.floor((postDate.getTime() - firstDate.getTime()) / (7 * 86400000)) + 1
  }

  it('le 1er post = semaine 1', () => {
    expect(calcWeekNum('2026-03-02', '2026-03-02')).toBe(1)
  })

  it('un post 3 jours après = semaine 1', () => {
    expect(calcWeekNum('2026-03-02', '2026-03-05')).toBe(1)
  })

  it('un post 7 jours après = semaine 2', () => {
    expect(calcWeekNum('2026-03-02', '2026-03-09')).toBe(2)
  })

  it('un post 13 jours après = semaine 2', () => {
    expect(calcWeekNum('2026-03-02', '2026-03-15')).toBe(2)
  })

  it('un post 14 jours après = semaine 3', () => {
    expect(calcWeekNum('2026-03-02', '2026-03-16')).toBe(3)
  })
})

describe('Programmes — Durée calculée', () => {
  // Vérifie que duration_weeks * 7 jours donne la bonne end_date

  function calcEndDate(startDate: string, durationWeeks: number): string {
    const start = new Date(startDate)
    start.setDate(start.getDate() + durationWeeks * 7)
    return start.toISOString().slice(0, 10)
  }

  it('4 semaines depuis 2026-03-01 → 2026-03-29', () => {
    expect(calcEndDate('2026-03-01', 4)).toBe('2026-03-29')
  })

  it('2 semaines depuis 2026-01-15 → 2026-01-29', () => {
    expect(calcEndDate('2026-01-15', 2)).toBe('2026-01-29')
  })

  it('8 semaines = environ 2 mois', () => {
    const end = calcEndDate('2026-01-01', 8)
    expect(end).toBe('2026-02-26')
  })
})

// =============================================================================
// ─── 6. LOGIQUE CALENDRIER ───────────────────────────────────────────────────
// =============================================================================

describe('Calendrier — isSameDay()', () => {
  // Logique tirée de Calendar.tsx
  function isSameDay(a: Date, b: Date): boolean {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    )
  }

  it('deux fois la même date → true', () => {
    expect(isSameDay(new Date('2026-03-15'), new Date('2026-03-15'))).toBe(true)
  })

  it('dates différentes → false', () => {
    expect(isSameDay(new Date('2026-03-15'), new Date('2026-03-16'))).toBe(false)
  })

  it('même jour, mois différent → false', () => {
    expect(isSameDay(new Date('2026-03-15'), new Date('2026-04-15'))).toBe(false)
  })

  it('même jour et mois, année différente → false', () => {
    expect(isSameDay(new Date('2026-03-15'), new Date('2025-03-15'))).toBe(false)
  })

  it('début et fin du même jour → true', () => {
    expect(isSameDay(
      new Date('2026-03-15T00:00:00'),
      new Date('2026-03-15T23:59:59'),
    )).toBe(true)
  })
})

describe('Calendrier — getDaysInMonth() — grille 42 cases', () => {
  // Logique tirée de Calendar.tsx : la grille affiche toujours 42 cases (6 semaines)
  function getDaysInMonth(year: number, month: number): Date[] {
    const days: Date[] = []
    const firstDay = new Date(year, month, 1)
    let startDay = firstDay.getDay() - 1
    if (startDay < 0) startDay = 6
    for (let i = startDay; i > 0; i--) {
      days.push(new Date(year, month, 1 - i))
    }
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(new Date(year, month, d))
    }
    while (days.length < 42) {
      days.push(new Date(year, month + 1, days.length - daysInMonth - startDay + 1))
    }
    return days
  }

  it('génère toujours exactement 42 cases', () => {
    // Testé pour plusieurs mois
    expect(getDaysInMonth(2026, 0).length).toBe(42) // Janvier 2026
    expect(getDaysInMonth(2026, 1).length).toBe(42) // Février 2026
    expect(getDaysInMonth(2026, 5).length).toBe(42) // Juin 2026
    expect(getDaysInMonth(2024, 1).length).toBe(42) // Février 2024 (bissextile)
  })

  it('le 1er jour du mois est inclus', () => {
    const days = getDaysInMonth(2026, 2) // Mars 2026
    const firstOfMarch = days.find(
      (d) => d.getMonth() === 2 && d.getDate() === 1,
    )
    expect(firstOfMarch).toBeDefined()
  })

  it('le dernier jour du mois est inclus', () => {
    const days = getDaysInMonth(2026, 2) // Mars 2026 (31 jours)
    const lastOfMarch = days.find(
      (d) => d.getMonth() === 2 && d.getDate() === 31,
    )
    expect(lastOfMarch).toBeDefined()
  })
})

describe('Calendrier — Navigation de mois', () => {
  // Logique de navigation prev/next mois (Calendar.tsx)
  function prevMonth(year: number, month: number): { year: number; month: number } {
    if (month === 0) return { year: year - 1, month: 11 }
    return { year, month: month - 1 }
  }

  function nextMonth(year: number, month: number): { year: number; month: number } {
    if (month === 11) return { year: year + 1, month: 0 }
    return { year, month: month + 1 }
  }

  it('précédent depuis janvier → décembre de l\'année précédente', () => {
    expect(prevMonth(2026, 0)).toEqual({ year: 2025, month: 11 })
  })

  it('suivant depuis décembre → janvier de l\'année suivante', () => {
    expect(nextMonth(2026, 11)).toEqual({ year: 2027, month: 0 })
  })

  it('navigation normale (pas aux extrêmes)', () => {
    expect(prevMonth(2026, 5)).toEqual({ year: 2026, month: 4 })
    expect(nextMonth(2026, 5)).toEqual({ year: 2026, month: 6 })
  })
})

// =============================================================================
// ─── 7. PLANS & QUOTAS ───────────────────────────────────────────────────────
// =============================================================================

describe('Plans & Quotas — Vérification de quota post', () => {
  // Un utilisateur peut poster si posts_publiés_ce_mois < plan.maxPosts

  function isQuotaReached(publishedThisMonth: number, plan: 'starter' | 'pro' | 'business'): boolean {
    return publishedThisMonth >= SUBSCRIPTION_PLANS[plan].maxPosts
  }

  it('Starter : atteint le quota à 8 posts', () => {
    expect(isQuotaReached(8, 'starter')).toBe(true)
    expect(isQuotaReached(7, 'starter')).toBe(false)
  })

  it('Pro : atteint le quota à 20 posts', () => {
    expect(isQuotaReached(20, 'pro')).toBe(true)
    expect(isQuotaReached(19, 'pro')).toBe(false)
  })

  it('Business : atteint le quota à 60 posts', () => {
    expect(isQuotaReached(60, 'business')).toBe(true)
    expect(isQuotaReached(59, 'business')).toBe(false)
  })

  it('0 posts publiés = quota non atteint quel que soit le plan', () => {
    expect(isQuotaReached(0, 'starter')).toBe(false)
    expect(isQuotaReached(0, 'pro')).toBe(false)
    expect(isQuotaReached(0, 'business')).toBe(false)
  })
})

describe('Plans & Quotas — Calcul du nombre de posts restants', () => {
  function remainingPosts(publishedThisMonth: number, plan: 'starter' | 'pro' | 'business'): number {
    return Math.max(0, SUBSCRIPTION_PLANS[plan].maxPosts - publishedThisMonth)
  }

  it('Starter : 8 - 3 = 5 posts restants', () => {
    expect(remainingPosts(3, 'starter')).toBe(5)
  })

  it('Ne descend pas en dessous de 0', () => {
    expect(remainingPosts(100, 'starter')).toBe(0)
  })

  it('Pro avec 0 publié = 20 restants', () => {
    expect(remainingPosts(0, 'pro')).toBe(20)
  })
})

// =============================================================================
// ─── 8. COMPOSANTS UI ────────────────────────────────────────────────────────
// =============================================================================

describe('Composant — LinkedInPreview', () => {
  // Composant simple défini dans PostEditor.tsx (sans dépendances externes)
  // On le teste en l'important directement

  it('affiche le contenu du post', async () => {
    const { LinkedInPreview } = await import('@/pages/PostEditor')
    const Wrapper = createWrapper()
    render(
      <Wrapper>
        <LinkedInPreview content="Mon super post LinkedIn" userName="Jean Dupont" />
      </Wrapper>,
    )
    expect(screen.getByText('Mon super post LinkedIn')).toBeDefined()
  })

  it('affiche le nom de l\'utilisateur', async () => {
    const { LinkedInPreview } = await import('@/pages/PostEditor')
    const Wrapper = createWrapper()
    render(
      <Wrapper>
        <LinkedInPreview content="Contenu" userName="Marie Martin" />
      </Wrapper>,
    )
    expect(screen.getByText('Marie Martin')).toBeDefined()
  })

  it('affiche les initiales dans l\'avatar (2 lettres en majuscules)', async () => {
    const { LinkedInPreview } = await import('@/pages/PostEditor')
    const Wrapper = createWrapper()
    render(
      <Wrapper>
        <LinkedInPreview content="Contenu" userName="Sophie" />
      </Wrapper>,
    )
    expect(screen.getByText('SO')).toBeDefined()
  })
})

describe('Composant — SourceFreeWriting', () => {
  it('affiche un textarea pour la rédaction libre', async () => {
    const SourceFreeWriting = (await import('@/components/editor/SourceFreeWriting')).default
    const Wrapper = createWrapper()
    render(
      <Wrapper>
        <SourceFreeWriting
          content=""
          onChange={vi.fn()}
          onSubmitToAI={vi.fn()}
          loading={false}
        />
      </Wrapper>,
    )
    expect(screen.getByRole('textbox')).toBeDefined()
  })

  it('désactive le bouton IA si le contenu est vide', async () => {
    const SourceFreeWriting = (await import('@/components/editor/SourceFreeWriting')).default
    const Wrapper = createWrapper()
    render(
      <Wrapper>
        <SourceFreeWriting
          content=""
          onChange={vi.fn()}
          onSubmitToAI={vi.fn()}
          loading={false}
        />
      </Wrapper>,
    )
    const button = screen.getByRole('button') as HTMLButtonElement
    expect(button.disabled).toBe(true)
  })

  it('active le bouton IA si le contenu est présent', async () => {
    const SourceFreeWriting = (await import('@/components/editor/SourceFreeWriting')).default
    const Wrapper = createWrapper()
    render(
      <Wrapper>
        <SourceFreeWriting
          content="Mon idée de post"
          onChange={vi.fn()}
          onSubmitToAI={vi.fn()}
          loading={false}
        />
      </Wrapper>,
    )
    const button = screen.getByRole('button') as HTMLButtonElement
    expect(button.disabled).toBe(false)
  })

  it('affiche le texte "Optimisation en cours…" pendant le chargement', async () => {
    const SourceFreeWriting = (await import('@/components/editor/SourceFreeWriting')).default
    const Wrapper = createWrapper()
    render(
      <Wrapper>
        <SourceFreeWriting
          content="Contenu"
          onChange={vi.fn()}
          onSubmitToAI={vi.fn()}
          loading={true}
        />
      </Wrapper>,
    )
    expect(screen.getByText('Optimisation en cours…')).toBeDefined()
  })

  it('appelle onChange quand l\'utilisateur tape', async () => {
    const SourceFreeWriting = (await import('@/components/editor/SourceFreeWriting')).default
    const Wrapper = createWrapper()
    const handleChange = vi.fn()
    const user = userEvent.setup()

    render(
      <Wrapper>
        <SourceFreeWriting
          content=""
          onChange={handleChange}
          onSubmitToAI={vi.fn()}
          loading={false}
        />
      </Wrapper>,
    )

    await user.type(screen.getByRole('textbox'), 'Hello')
    expect(handleChange).toHaveBeenCalled()
  })
})

describe('Composant — AIExchangePanel', () => {
  it('n\'affiche rien sans messages ni chargement', async () => {
    const AIExchangePanel = (await import('@/components/editor/AIExchangePanel')).default
    const Wrapper = createWrapper()
    const { container } = render(
      <Wrapper>
        <AIExchangePanel messages={[]} onSendRevision={vi.fn()} loading={false} />
      </Wrapper>,
    )
    // Le panel se masque lui-même quand il n'y a rien
    expect(container.firstChild).toBeNull()
  })

  it('affiche les messages IA', async () => {
    const AIExchangePanel = (await import('@/components/editor/AIExchangePanel')).default
    const Wrapper = createWrapper()
    render(
      <Wrapper>
        <AIExchangePanel
          messages={[
            { role: 'assistant', content: 'Voici votre post généré.' },
            { role: 'user', content: 'Rends-le plus court.' },
          ]}
          onSendRevision={vi.fn()}
          loading={false}
        />
      </Wrapper>,
    )
    expect(screen.getByText('Voici votre post généré.')).toBeDefined()
    expect(screen.getByText('Rends-le plus court.')).toBeDefined()
  })
})
