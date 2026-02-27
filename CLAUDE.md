# PostPilot — Agent IA de publication LinkedIn (puis multi-canal)

## 🎯 Vision du projet

SaaS B2B pour TPE : un agent IA autonome qui rédige et publie des posts LinkedIn professionnels, personnalisés à la marque du client, avec validation humaine. Scalable, multi-tenant, multi-canal (LinkedIn d'abord, puis Instagram/TikTok).

## 🏗️ Stack technique

| Composant | Technologie | Rôle |
|-----------|------------|------|
| Frontend | **Lovable** (React + Tailwind + Supabase SDK) | Interface utilisateur SaaS |
| Backend | **Supabase** (PostgreSQL + Auth + RLS + Edge Functions + pgvector + Realtime + Storage) | Données, auth, RAG, notifications |
| Orchestration | **n8n** (workflows JSON) | Automatisation : rédaction IA, publication, analytics, veille |
| Publication | **n8n LinkedIn Node** (OAuth2 direct) | Poster sur LinkedIn via le node natif n8n. Pas de service tiers. |
| LLM | **Claude API** (Sonnet) via n8n | Rédaction, révision, analyse |
| Embeddings | **OpenAI text-embedding-3-small** ou **Voyage AI** | RAG sur la base documentaire client |
| Transcription | **Whisper API** | Vocal → texte |
| Emails | **Resend** | Notifications email transactionnelles |
| Paiement | **Stripe** | Abonnements Starter/Pro/Business |

### Stratégie publication multi-canal

**Phase 1 (MVP)** : Publication LinkedIn via le **node LinkedIn natif de n8n**. Chaque client connecte son compte LinkedIn via OAuth2 directement dans n8n. Les tokens OAuth sont stockés dans la table `platforms` (champ `oauth_tokens`).

**Phase 2 (Scale, quand >15 clients + ajout Instagram/TikTok)** : Migrer vers un service tiers type **Ayrshare** ou **Buffer API** pour gérer tous les canaux via une seule API. La table `platforms` et l'architecture sont déjà prévues pour cette migration — seul le workflow `03-publication` changera.

### Comment fonctionne le LinkedIn OAuth dans n8n

1. Tu crées une **LinkedIn App** sur https://developer.linkedin.com (une seule app pour tout PostPilot)
2. Cette app a un **Client ID** et **Client Secret**
3. Dans n8n, tu crées UN credential "LinkedIn OAuth2 API" avec ces identifiants
4. Pour chaque client : un workflow n8n génère l'URL OAuth2 → le client autorise → callback reçoit access_token + refresh_token
5. Ces tokens sont stockés dans Supabase table `platforms` (champ `oauth_tokens jsonb`)
6. Le workflow de publication utilise le token du client pour poster en son nom via l'API LinkedIn REST
7. Un workflow de maintenance (08) rafraîchit les tokens avant expiration (LinkedIn tokens expirent après 60 jours)

## 📁 Structure du projet

```
/Users/christopher/postpilot/
├── CLAUDE.md                    ← CE FICHIER (instructions projet)
├── README.md                    ← Documentation projet
├── .claude/
│   └── mcp.json                 ← Config MCP (hérite du global + spécifique)
│
├── supabase/
│   ├── migrations/
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_rls_policies.sql
│   │   ├── 003_pgvector_setup.sql
│   │   ├── 004_functions.sql
│   │   └── 005_seed_data.sql
│   ├── functions/
│   │   ├── generate-embedding/index.ts
│   │   ├── scrape-url/index.ts
│   │   ├── webhook-from-n8n/index.ts
│   │   ├── send-notification/index.ts
│   │   └── linkedin-oauth-callback/index.ts   ← gère le retour OAuth LinkedIn
│   └── config.toml
│
├── lovable/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Login.tsx
│   │   │   ├── Onboarding.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Calendar.tsx
│   │   │   ├── PostEditor.tsx
│   │   │   ├── Documents.tsx
│   │   │   ├── Analytics.tsx
│   │   │   ├── Settings.tsx
│   │   │   ├── Notifications.tsx
│   │   │   └── Landing.tsx
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   ├── Navbar.tsx
│   │   │   │   └── NotificationBell.tsx
│   │   │   ├── calendar/
│   │   │   │   ├── CalendarGrid.tsx
│   │   │   │   ├── CalendarDayCell.tsx
│   │   │   │   └── PostCard.tsx
│   │   │   ├── editor/
│   │   │   │   ├── PostEditor.tsx
│   │   │   │   ├── LinkedInPreview.tsx
│   │   │   │   ├── VersionHistory.tsx
│   │   │   │   ├── FeedbackPanel.tsx
│   │   │   │   └── SourceSelector.tsx
│   │   │   ├── onboarding/
│   │   │   │   ├── StepCompany.tsx
│   │   │   │   ├── StepStyle.tsx
│   │   │   │   ├── StepKeywords.tsx
│   │   │   │   └── StepExamples.tsx
│   │   │   ├── analytics/
│   │   │   │   ├── OverviewCards.tsx
│   │   │   │   ├── EngagementChart.tsx
│   │   │   │   └── PostPerformance.tsx
│   │   │   └── documents/
│   │   │       ├── DocumentUpload.tsx
│   │   │       └── DocumentList.tsx
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   ├── useOrganization.ts
│   │   │   ├── usePosts.ts
│   │   │   ├── useNotifications.ts
│   │   │   └── useRealtimeNotifications.ts
│   │   ├── lib/
│   │   │   ├── supabase.ts
│   │   │   ├── api.ts                 ← appels vers n8n webhooks
│   │   │   └── constants.ts
│   │   └── types/
│   │       └── database.ts            ← types TypeScript générés depuis Supabase
│   └── package.json
│
├── n8n/
│   ├── workflows/
│   │   ├── 01-redaction-ia.json
│   │   ├── 02-revision-ia.json
│   │   ├── 03-publication-programmee.json     ← node HTTP Request vers API LinkedIn
│   │   ├── 04-collecte-analytics.json         ← node HTTP Request vers API LinkedIn
│   │   ├── 05-veille-rss.json
│   │   ├── 06-evenements-calendrier.json
│   │   ├── 07-scraping-url.json
│   │   └── 08-refresh-linkedin-tokens.json    ← cron : rafraîchit les tokens OAuth
│   ├── credentials/                    ← NE PAS COMMITTER (gitignored)
│   │   └── .gitkeep
│   └── README.md                       ← Documentation des workflows
│
├── prompts/
│   ├── redaction-linkedin.md           ← Prompt maître de rédaction
│   ├── revision.md                     ← Prompt de révision
│   ├── evaluation-pertinence-rss.md    ← Prompt pour filtrer les articles RSS
│   └── insights-analytics.md           ← Prompt pour les insights IA
│
├── docs/
│   ├── architecture.md
│   ├── api-contracts.md                ← Contrats d'API entre Lovable ↔ n8n ↔ Supabase
│   ├── linkedin-oauth-setup.md         ← Guide de config LinkedIn App
│   ├── onboarding-flow.md
│   └── deployment.md
│
├── scripts/
│   ├── setup-supabase.sh               ← Script d'init Supabase (migrations + seed)
│   ├── import-n8n-workflows.sh         ← Import des workflows dans n8n
│   └── generate-types.sh               ← Génère les types TS depuis Supabase
│
└── .gitignore
```

## 📐 Conventions & Règles

### Général
- **Langue du code** : anglais (variables, fonctions, commentaires)
- **Langue du contenu / UI** : français (labels, messages, prompts)
- **Tous les timestamps** : UTC en base, conversion côté frontend
- **IDs** : UUID v4 partout (généré par Supabase `gen_random_uuid()`)

### Supabase
- **Multi-tenant obligatoire** : CHAQUE table métier a une colonne `organization_id` (sauf `organizations` et `organization_members`)
- **RLS activé sur TOUTES les tables** : aucune exception
- **Pattern RLS** : les policies vérifient que `auth.uid()` est membre de l'`organization_id` de la row via `organization_members`
- **Naming** : snake_case pour tables et colonnes
- **Soft delete** : utiliser `deleted_at timestamp` plutôt que DELETE physique sur les tables critiques (posts, organizations)
- **Edge Functions** : TypeScript, Deno runtime, toujours valider les inputs avec Zod

### Lovable / React
- **Composants** : functional components + hooks uniquement
- **State management** : React Query (TanStack Query) pour le server state, useState/useReducer pour le local state
- **Routing** : React Router v6
- **Styling** : Tailwind CSS uniquement, pas de CSS custom
- **Supabase client** : un seul client initialisé dans `lib/supabase.ts`, utilisé partout
- **Types** : générer les types depuis Supabase CLI (`supabase gen types typescript`)
- **Toasts** : pour les actions utilisateur (succès/erreur), via Sonner ou similaire
- **Composants UI** : shadcn/ui quand disponible dans Lovable

### N8N
- **Référencer les skills n8n globales** : se référer au CLAUDE.md global (`/Users/christopher/CLAUDE.md`) pour les conventions n8n, les patterns de workflow, et les skills MCP déjà configurées
- **Naming des workflows** : `[PostPilot] XX - Nom du workflow`
- **Error handling** : chaque workflow a un error trigger qui notifie (log + alerte)
- **Credentials** : JAMAIS en dur dans les workflows JSON, toujours via le credential store n8n
- **Webhook URLs** : stockées comme variables d'environnement dans Lovable (VITE_N8N_WEBHOOK_REDACTION, etc.)
- **Idempotence** : les workflows de publication doivent être idempotents (pas de double publication)
- **LinkedIn OAuth** : un seul credential "LinkedIn OAuth2 API" dans n8n (Client ID + Client Secret de la LinkedIn App). Les tokens par client sont dans Supabase `platforms.oauth_tokens`, PAS dans les credentials n8n.

### Publication LinkedIn — Détail technique

Le workflow de publication (`03-publication-programmee`) fonctionne ainsi :

1. Cron toutes les 5 minutes
2. Query Supabase : posts `approved` + `scheduled_at <= NOW()`
3. Pour chaque post, fetch le `oauth_tokens` du client depuis `platforms`
4. Vérifier que le token n'est pas expiré (sinon → notification "Reconnectez votre LinkedIn")
5. Appel **API LinkedIn directement** via node HTTP Request n8n :
   ```
   POST https://api.linkedin.com/v2/ugcPosts
   Headers:
     Authorization: Bearer {access_token du client}
     X-Restli-Protocol-Version: 2.0.0
   Body: {
     "author": "urn:li:person:{linkedin_person_id}",
     "lifecycleState": "PUBLISHED",
     "specificContent": {
       "com.linkedin.ugc.ShareContent": {
         "shareCommentary": { "text": "{contenu du post}" },
         "shareMediaCategory": "NONE"
       }
     },
     "visibility": {
       "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
     }
   }
   ```
6. Stocker le `linkedin_post_id` retourné dans `posts.platform_post_id`
7. Si erreur 401 (token expiré) → tenter un refresh → si échec → status = 'failed' + notification

Pour la collecte d'analytics (`04-collecte-analytics`) :
```
GET https://api.linkedin.com/v2/socialActions/{post_urn}/likes
GET https://api.linkedin.com/v2/socialActions/{post_urn}/comments  
```

Le workflow de refresh tokens (`08-refresh-linkedin-tokens`) :
1. Cron quotidien
2. Query `platforms WHERE token_expires_at < NOW() + INTERVAL '7 days'`
3. Pour chaque token : appel LinkedIn refresh endpoint
4. Update du token dans Supabase
5. Si refresh échoue → notification "Votre LinkedIn est déconnecté, reconnectez-le"

### Prompts IA
- **Les prompts sont des fichiers Markdown** dans `/prompts/` — PAS en dur dans n8n
- **N8N lit les prompts** depuis ces fichiers (ou ils sont copiés dans les nodes n8n lors du build)
- **Variables dans les prompts** : `{variable_name}` — remplacées par n8n à l'exécution
- **Chaque prompt a** : un system prompt (rôle + contexte) + un user prompt (instruction spécifique)
- **Version control** : les prompts sont versionnés dans Git, chaque modif = un commit explicite

### API Contracts (Lovable ↔ N8N)
Les webhooks n8n exposent des endpoints REST consommés par le frontend :

| Endpoint (webhook n8n) | Méthode | Payload | Réponse |
|------------------------|---------|---------|---------|
| `/webhook/generate-post` | POST | `{post_id, organization_id}` | `{content, version_id}` |
| `/webhook/revise-post` | POST | `{post_id, feedback, scope}` | `{content, version_id}` |
| `/webhook/scrape-url` | POST | `{url}` | `{title, summary, content}` |
| `/webhook/transcribe-vocal` | POST | `{audio_base64}` | `{transcription}` |
| `/webhook/linkedin-connect` | POST | `{organization_id}` | `{oauth_url}` |

Le frontend appelle ces webhooks via `lib/api.ts`. Les webhooks sont protégés par un header `X-API-Key` partagé.

## 🔒 Sécurité

- **Auth** : Supabase Auth (email + Google OAuth)
- **RLS** : obligatoire, testé pour chaque table
- **Webhooks n8n** : protégés par API key dans le header
- **LinkedIn OAuth tokens** : stockés dans Supabase `platforms.oauth_tokens`. Chiffrement recommandé via `pgcrypto` en production.
- **CORS** : configuré pour le domaine Lovable uniquement
- **Rate limiting** : côté n8n, limiter à 10 requêtes/minute/organisation
- **Fichiers uploadés** : validés côté Edge Function (type MIME, taille max 10MB)
- **Tokens LinkedIn** : refresh automatique avant expiration (workflow `08-refresh-linkedin-tokens`)

## 🗄️ Tables clés (modifiées vs Ayrshare)

### Table `platforms`

```sql
platforms (
  id uuid PK DEFAULT gen_random_uuid(),
  organization_id uuid FK → organizations,
  platform_type text NOT NULL,         -- 'linkedin', 'instagram', 'tiktok'
  is_active boolean DEFAULT true,
  connected_at timestamp,
  oauth_tokens jsonb,                  -- { access_token, refresh_token, expires_at, linkedin_person_id }
  token_expires_at timestamp,          -- pour le cron de refresh
  platform_user_id text,               -- LinkedIn URN "urn:li:person:xxxxx"
  platform_user_name text,             -- "Jean Dupont" (pour affichage)
  platform_metadata jsonb
)
```

### Table `organizations` (sans Ayrshare)

```sql
organizations (
  id uuid PK DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE,
  created_at timestamp DEFAULT NOW(),
  subscription_plan text DEFAULT 'starter',
  max_posts_per_month int DEFAULT 8,
  stripe_customer_id text,
  stripe_subscription_id text
)
```

### Table `posts`

```sql
posts (
  ...
  platform_post_id text,    -- ID du post côté LinkedIn (ex: "urn:li:share:xxxxx")
  ...
)
```

## 🚀 Sprints de développement

### Sprint 0 — Setup (Jour 1-2)
- [ ] Créer le repo Git avec la structure ci-dessus
- [ ] Initialiser Supabase : schéma SQL complet + RLS + pgvector
- [ ] Scaffold Lovable : layout principal, routing, auth
- [ ] Créer la LinkedIn App sur developer.linkedin.com
- [ ] Configurer n8n : credentials Supabase + Claude API + LinkedIn OAuth2 (Client ID/Secret)
- [ ] Tester la connexion Lovable ↔ Supabase

### Sprint 1 — Onboarding & Profil de marque (Jour 3-5)
- [ ] Wizard d'onboarding 4 étapes (Lovable)
- [ ] Page Settings avec édition du brand_profile
- [ ] Upload de documents + génération d'embeddings (Edge Function)
- [ ] Connexion LinkedIn OAuth dans Settings (bouton "Connecter LinkedIn" → OAuth flow → stocke tokens dans platforms)
- [ ] Edge Function `linkedin-oauth-callback` pour gérer le retour OAuth

### Sprint 2 — Calendrier & Éditeur de posts (Jour 6-10)
- [ ] Calendrier éditorial (vue mois + vue liste)
- [ ] Formulaire de création de post (6 types de sources)
- [ ] Éditeur de post avec preview LinkedIn
- [ ] Historique des versions
- [ ] Panel de feedback + régénération partielle
- [ ] Workflow n8n "Rédaction IA" (01)
- [ ] Workflow n8n "Révision IA" (02)
- [ ] Workflow n8n "Scraping URL" (07)

### Sprint 3 — Publication & Notifications (Jour 11-16)
- [ ] Workflow n8n "Publication programmée" (03) — via API LinkedIn directe (HTTP Request)
- [ ] Workflow n8n "Collecte Analytics" (04) — via API LinkedIn directe
- [ ] Workflow n8n "Refresh LinkedIn Tokens" (08) — cron quotidien
- [ ] Système de notifications in-app (Supabase Realtime)
- [ ] Notifications email (Resend)
- [ ] Statuts de post : draft → pending_review → approved → scheduled → published
- [ ] Gestion erreur token expiré → notification "Reconnectez votre LinkedIn"

### Sprint 4 — Intelligence & Analytics (Jour 17-22)
- [ ] RAG complet avec pgvector (recherche sémantique dans les docs client)
- [ ] Dashboard Analytics (graphiques, métriques, top posts)
- [ ] Système de feedback & apprentissage (few-shot learning)
- [ ] Workflow n8n "Veille RSS" (05)
- [ ] Workflow n8n "Événements calendrier" (06)
- [ ] Insights IA ("vos posts du mardi performent mieux")

### Sprint 5 — Polish & Lancement (Jour 23-28)
- [ ] Landing page
- [ ] Intégration Stripe (3 plans)
- [ ] Tests end-to-end
- [ ] Monitoring & error handling
- [ ] Documentation déploiement
- [ ] ⚠️ PRÉPARER la migration vers Ayrshare/Buffer quand >15 clients ou ajout Instagram/TikTok

## 📝 Notes pour Claude Code

### Quand tu travailles sur ce projet :
1. **Toujours lire le CLAUDE.md global** (`/Users/christopher/CLAUDE.md`) pour les conventions n8n et les skills MCP
2. **Respecter la structure de fichiers** définie ci-dessus — ne pas créer de fichiers en dehors
3. **Chaque sprint = un ensemble de tâches cohérent** — ne pas mélanger les sprints
4. **Tester après chaque étape** : vérifier que Supabase RLS fonctionne, que les webhooks répondent, que le frontend affiche les données
5. **Committer régulièrement** avec des messages clairs : `feat(sprint-1): add onboarding wizard step 2`
6. **Pour les workflows n8n** : générer le JSON exportable, documenté, prêt à importer. Utiliser les skills n8n du CLAUDE.md global.
7. **Pour Lovable** : générer des composants autonomes et testables. Utiliser les types TypeScript générés depuis Supabase.
8. **Pour les Edge Functions** : inclure la validation Zod, le error handling, et les CORS headers.
9. **LinkedIn OAuth** : les tokens par client sont dans Supabase `platforms.oauth_tokens`, PAS dans les credentials n8n. Les credentials n8n ne contiennent que le Client ID + Client Secret de la LinkedIn App PostPilot (communs à tous les clients).

### Ordre d'exécution recommandé pour chaque sprint :
1. **SQL d'abord** → créer/modifier les tables dans `supabase/migrations/`
2. **Types ensuite** → regénérer les types TS
3. **Backend** → Edge Functions si nécessaire
4. **N8N** → workflows JSON
5. **Frontend en dernier** → pages et composants Lovable
6. **Test** → vérifier le flux complet

### Dépendances entre composants :
```
Supabase Schema → Edge Functions → N8N Workflows → Lovable Frontend
     ↓                                    ↓              ↓
   RLS Policies                     Prompts (/prompts/)  Types TS
```

Le frontend ne doit JAMAIS appeler Claude API directement. Tout passe par n8n (via webhooks) qui orchestre les appels LLM.
Le frontend ne doit JAMAIS appeler l'API LinkedIn directement. Tout passe par n8n.

## ⚡ REFONTE V2 — Assistant Conversationnel

Voir le fichier docs/SPEC-V2-REFONTE-UX.md pour les spécifications complètes.

Points clés :
- Le Dashboard intègre un chat IA conversationnel
- Les "programmes de communication" remplacent la création manuelle de posts
- L'éditeur de post a 3 modes : rédaction libre, URL, document
- Le profil de marque est affiché en sidebar de l'éditeur (overridable par post)
- Nouvelles tables : programs, ai_conversations
- Nouveaux workflows : 09-creation-programme, 10-chat-ia-assistant
- Nouveaux statuts : waiting (post créé par programme, pas encore rédigé)