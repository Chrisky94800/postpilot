// ============================================================
// PostPilot — Constantes partagées
// ============================================================

import type {
  PostStatus,
  SourceType,
  PlatformType,
  MemberRole,
  FeedbackScope,
  NotificationType,
} from '@/types/database'

// ─── Statuts de post ──────────────────────────────────────────────────────────

export const POST_STATUSES: Record<
  PostStatus,
  { label: string; color: string; description: string }
> = {
  waiting: {
    label: 'En attente',
    color: 'bg-gray-100 text-gray-500',
    description: 'Post créé par un programme, pas encore rédigé',
  },
  draft: {
    label: 'Brouillon',
    color: 'bg-gray-100 text-gray-700',
    description: 'En cours de rédaction',
  },
  pending_review: {
    label: 'En attente',
    color: 'bg-amber-100 text-amber-700',
    description: "Généré par l'IA, en attente de validation",
  },
  approved: {
    label: 'Approuvé',
    color: 'bg-blue-100 text-blue-700',
    description: 'Validé, prêt à programmer',
  },
  scheduled: {
    label: 'Programmé',
    color: 'bg-purple-100 text-purple-700',
    description: 'Publication programmée',
  },
  published: {
    label: 'Publié',
    color: 'bg-green-100 text-green-700',
    description: 'Publié sur LinkedIn',
  },
  failed: {
    label: 'Échec',
    color: 'bg-red-100 text-red-700',
    description: 'Erreur lors de la publication',
  },
}

// ─── Types de source ──────────────────────────────────────────────────────────

export const SOURCE_TYPES: Record<
  SourceType,
  { label: string; icon: string; description: string }
> = {
  manual: {
    label: 'Rédaction libre',
    icon: '✍️',
    description: 'Rédigez votre post de A à Z',
  },
  url: {
    label: 'URL / Article',
    icon: '🔗',
    description: "Inspirez-vous d'un article ou d'une page web",
  },
  vocal: {
    label: 'Message vocal',
    icon: '🎙️',
    description: "Dictez votre idée, l'IA la transcrit et rédige",
  },
  document: {
    label: 'Document',
    icon: '📄',
    description: 'Basé sur un de vos documents importés',
  },
  rss: {
    label: 'Article RSS',
    icon: '📰',
    description: 'Réagissez à un article de votre veille',
  },
  calendar_event: {
    label: 'Événement',
    icon: '📅',
    description: 'Valorisez un événement de votre calendrier',
  },
}

// ─── Plateformes ──────────────────────────────────────────────────────────────

export const PLATFORMS: Record<
  PlatformType,
  { label: string; color: string; phase: 1 | 2 }
> = {
  linkedin: {
    label: 'LinkedIn',
    color: '#0077B5',
    phase: 1,
  },
  instagram: {
    label: 'Instagram',
    color: '#E1306C',
    phase: 2,
  },
  tiktok: {
    label: 'TikTok',
    color: '#010101',
    phase: 2,
  },
}

// ─── Tons de marque ───────────────────────────────────────────────────────────

export const TONE_OPTIONS: { value: string; label: string }[] = [
  { value: 'professionnel', label: 'Professionnel' },
  { value: 'expert', label: 'Expert' },
  { value: 'bienveillant', label: 'Bienveillant' },
  { value: 'inspirant', label: 'Inspirant' },
  { value: 'pedagogique', label: 'Pédagogique' },
  { value: 'direct', label: 'Direct' },
  { value: 'humoristique', label: 'Humoristique' },
  { value: 'storytelling', label: 'Storytelling' },
  { value: 'analytique', label: 'Analytique' },
  { value: 'engageant', label: 'Engageant' },
]

// ─── Jours de la semaine ──────────────────────────────────────────────────────

export const WEEK_DAYS: { value: string; label: string; short: string }[] = [
  { value: 'monday', label: 'Lundi', short: 'Lun' },
  { value: 'tuesday', label: 'Mardi', short: 'Mar' },
  { value: 'wednesday', label: 'Mercredi', short: 'Mer' },
  { value: 'thursday', label: 'Jeudi', short: 'Jeu' },
  { value: 'friday', label: 'Vendredi', short: 'Ven' },
  { value: 'saturday', label: 'Samedi', short: 'Sam' },
  { value: 'sunday', label: 'Dimanche', short: 'Dim' },
]

// ─── Rôles membres ────────────────────────────────────────────────────────────

export const MEMBER_ROLES: Record<MemberRole, { label: string; description: string }> = {
  owner: {
    label: 'Propriétaire',
    description: "Accès complet, gestion de l'abonnement",
  },
  admin: {
    label: 'Administrateur',
    description: "Gestion de l'équipe et des paramètres",
  },
  member: {
    label: 'Membre',
    description: 'Création et édition de posts',
  },
}

// ─── Plans d'abonnement ───────────────────────────────────────────────────────

export type PlanId = 'free' | 'solo' | 'pro'

export const SUBSCRIPTION_PLANS: Record<
  PlanId,
  {
    label: string
    priceMonthly: number    // €/mois
    priceYearly: number     // €/mois facturé annuellement
    priceYearlyTotal: number // €/an
    maxPosts: number
    maxPrograms: number
    features: string[]
    missingFeatures: string[] // features NON incluses (pour afficher les cadenas)
  }
> = {
  free: {
    label: 'Gratuit',
    priceMonthly: 0,
    priceYearly: 0,
    priceYearlyTotal: 0,
    maxPosts: 1,
    maxPrograms: 0,
    features: [
      '1 post IA / mois',
      'Assistant conversationnel',
      'Rédaction libre + optimisation IA',
      'Publication auto LinkedIn',
      'Profil de marque complet',
      'Support email',
    ],
    missingFeatures: [
      'Génération depuis URL',
      'Génération depuis document',
      'Programmes de communication',
      'Calendrier éditorial',
      'Analytics & tendances',
      'Heures de publication perso',
    ],
  },
  solo: {
    label: 'Solo',
    priceMonthly: 9,
    priceYearly: 7,
    priceYearlyTotal: 84,
    maxPosts: 8,
    maxPrograms: 1,
    features: [
      '8 posts IA / mois',
      'Assistant conversationnel',
      'Rédaction libre + optimisation IA',
      'Génération depuis URL',
      '1 programme de communication',
      'Calendrier éditorial',
      'Heures de publication perso',
      'Publication auto LinkedIn',
      'Profil de marque + override par post',
      'Analytics & tendances',
      'Support email',
    ],
    missingFeatures: [
      'Génération depuis document',
    ],
  },
  pro: {
    label: 'Pro',
    priceMonthly: 19,
    priceYearly: 15,
    priceYearlyTotal: 180,
    maxPosts: 25,
    maxPrograms: 3,
    features: [
      '25 posts IA / mois',
      'Assistant conversationnel',
      'Rédaction libre + optimisation IA',
      'Génération depuis URL',
      'Génération depuis document',
      '3 programmes de communication',
      'Calendrier éditorial',
      'Heures de publication perso',
      'Publication auto LinkedIn',
      'Profil de marque + override par post',
      'Analytics & tendances',
      'Support prioritaire',
      'Onboarding personnalisé (30 min offert)',
    ],
    missingFeatures: [],
  },
}

// Limites détaillées par plan (utilisé par usePlanLimits)
export const PLAN_LIMITS = {
  free: {
    posts: 1,
    programs: 0,
    canUseUrl: false,
    canUseDocument: false,
    canUseSkill: false,
    canCreateProgram: false,
    canUseCalendar: false,
    canCustomizeTime: false,
    canOverrideProfile: false,
    canViewAnalytics: false,
    canViewTrends: false,
    hasPrioritySupport: false,
    hasOnboarding: false,
  },
  solo: {
    posts: 8,
    programs: 1,
    canUseUrl: true,
    canUseDocument: false,
    canUseSkill: true,
    canCreateProgram: true,
    canUseCalendar: true,
    canCustomizeTime: true,
    canOverrideProfile: true,
    canViewAnalytics: true,
    canViewTrends: true,
    hasPrioritySupport: false,
    hasOnboarding: false,
  },
  pro: {
    posts: 25,
    programs: 3,
    canUseUrl: true,
    canUseDocument: true,
    canUseSkill: true,
    canCreateProgram: true,
    canUseCalendar: true,
    canCustomizeTime: true,
    canOverrideProfile: true,
    canViewAnalytics: true,
    canViewTrends: true,
    hasPrioritySupport: true,
    hasOnboarding: true,
  },
} as const

// Price IDs Stripe (valeurs injectées via variables d'environnement Vite)
export const STRIPE_PRICES = {
  solo: {
    monthly: import.meta.env.VITE_STRIPE_PRICE_SOLO_MONTHLY as string,
    yearly:  import.meta.env.VITE_STRIPE_PRICE_SOLO_YEARLY  as string,
  },
  pro: {
    monthly: import.meta.env.VITE_STRIPE_PRICE_PRO_MONTHLY as string,
    yearly:  import.meta.env.VITE_STRIPE_PRICE_PRO_YEARLY  as string,
  },
}

// ─── Scopes de feedback ───────────────────────────────────────────────────────

export const FEEDBACK_SCOPES: Record<FeedbackScope, { label: string; description: string }> = {
  full: { label: 'Tout réécrire', description: 'Reformuler entièrement le post' },
  opening: { label: 'Accroche', description: 'Modifier uniquement la première ligne' },
  closing: { label: 'Conclusion', description: 'Modifier le call-to-action final' },
  tone: { label: 'Ton', description: 'Ajuster le registre de langage' },
  length: { label: 'Longueur', description: 'Raccourcir ou allonger le post' },
  keywords: { label: 'Mots-clés', description: 'Intégrer des mots-clés spécifiques' },
}

// ─── Types de notifications ───────────────────────────────────────────────────

export const NOTIFICATION_TYPES: Record<
  NotificationType,
  { label: string; icon: string }
> = {
  post_ready: { label: 'Post prêt', icon: '✍️' },
  post_published: { label: 'Post publié', icon: '🚀' },
  post_failed: { label: 'Échec de publication', icon: '⚠️' },
  token_expired: { label: 'Connexion expirée', icon: '🔗' },
  token_refreshed: { label: 'Connexion renouvelée', icon: '✅' },
  analytics_ready: { label: 'Analytics disponibles', icon: '📊' },
  rss_found: { label: 'Nouveau contenu RSS', icon: '📰' },
  event_reminder: { label: 'Rappel événement', icon: '📅' },
  error: { label: 'Erreur', icon: '❌' },
}

// ─── Industries ───────────────────────────────────────────────────────────────

export const INDUSTRIES: string[] = [
  'Conseil & Management',
  'Technologies & SaaS',
  'Marketing & Communication',
  'Finance & Comptabilité',
  'Ressources Humaines',
  'Immobilier',
  'Santé & Bien-être',
  'Formation & Coaching',
  'Droit & Juridique',
  'Commerce & Distribution',
  'BTP & Industrie',
  'Événementiel',
  'Autre',
]

// ─── Types d'événements calendrier ───────────────────────────────────────────

export const EVENT_TYPES: { value: string; label: string }[] = [
  { value: 'conference', label: 'Conférence' },
  { value: 'webinar', label: 'Webinaire' },
  { value: 'product_launch', label: 'Lancement produit' },
  { value: 'holiday', label: 'Jour férié / Fête' },
  { value: 'trade_show', label: 'Salon professionnel' },
  { value: 'publication', label: 'Publication / Article' },
  { value: 'custom', label: 'Autre' },
]

// ─── Longueur max d'un post LinkedIn ─────────────────────────────────────────

export const LINKEDIN_POST_MAX_LENGTH = 3000

// ─── Nombre de posts max affichés dans le feed notification ──────────────────

export const NOTIFICATION_PREVIEW_COUNT = 5
