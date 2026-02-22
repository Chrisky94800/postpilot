# 🚀 LinkedIn AI Agent — Plan d'exécution Claude Code

## Nom de projet : **PostPilot** (ou à définir)

---

## Architecture validée

```
LOVABLE (Frontend) → Supabase (Backend + Auth + DB + pgvector) → N8N (Orchestration + LLM) → Ayrshare (Publication multi-canal)
```

---

## SPRINT 0 — Setup & Fondations (Jour 1-2)

### 0.1 — Initialisation Supabase

**Prompt Claude Code :**
> "Crée le projet Supabase avec le schéma SQL suivant. Active pgvector, configure RLS sur toutes les tables, et crée les policies multi-tenant basées sur organization_id."

**Tables à créer :**

```sql
-- Auth géré par Supabase Auth nativement

-- Organisations (multi-tenant)
organizations (
  id uuid PK,
  name text,
  slug text UNIQUE,
  created_at timestamp,
  subscription_plan text DEFAULT 'starter', -- starter, pro, enterprise
  ayrshare_profile_key text, -- clé Ayrshare par client
  max_posts_per_month int DEFAULT 8
)

-- Membres d'une organisation
organization_members (
  id uuid PK,
  organization_id uuid FK → organizations,
  user_id uuid FK → auth.users,
  role text DEFAULT 'member', -- owner, admin, member
  created_at timestamp
)

-- Profil de marque (personnalisation IA)
brand_profiles (
  id uuid PK,
  organization_id uuid FK → organizations,
  company_name text,
  company_description text,
  industry text,
  target_audience text,
  tone text, -- 'expert_formel', 'accessible_friendly', 'provocateur_decale', 'inspirant', 'educatif'
  writing_style_notes text, -- instructions libres du client
  keywords_to_use text[], -- mots-clés à favoriser
  keywords_to_avoid text[], -- mots-clés interdits
  hashtag_strategy text, -- 'minimal', 'moderate', 'aggressive'
  preferred_hashtags text[],
  language text DEFAULT 'fr', -- fr, en, es, de...
  example_posts_liked jsonb, -- [{text, why_liked}]
  example_posts_disliked jsonb,
  cta_preferences text, -- type de CTA préférés
  emoji_usage text DEFAULT 'moderate', -- 'none', 'minimal', 'moderate', 'frequent'
  post_length_preference text DEFAULT 'medium', -- 'short', 'medium', 'long'
  signature_line text, -- ex: "— Jean, fondateur de X"
  updated_at timestamp
)

-- Base documentaire (RAG)
documents (
  id uuid PK,
  organization_id uuid FK → organizations,
  title text,
  content text,
  content_type text, -- 'pdf', 'article', 'notes', 'presentation'
  source_url text,
  embedding vector(1536),
  metadata jsonb,
  created_at timestamp
)

-- Plateformes connectées
platforms (
  id uuid PK,
  organization_id uuid FK → organizations,
  platform_type text, -- 'linkedin', 'instagram', 'tiktok', 'twitter'
  is_active boolean DEFAULT true,
  connected_at timestamp,
  platform_metadata jsonb -- infos spécifiques par plateforme
)

-- Posts (cœur du produit)
posts (
  id uuid PK,
  organization_id uuid FK → organizations,
  platform_id uuid FK → platforms,
  status text DEFAULT 'draft', -- 'idea', 'draft', 'pending_review', 'approved', 'scheduled', 'published', 'failed'
  content text,
  media_urls text[],
  scheduled_at timestamp,
  published_at timestamp,
  source_type text, -- 'theme', 'url', 'document', 'rss', 'recycle', 'event', 'vocal'
  source_content jsonb, -- {theme: "...", url: "...", doc_id: "..."}
  tone_override text, -- si différent du brand_profile
  language_override text,
  generation_prompt text, -- le prompt utilisé pour générer
  ayrshare_post_id text, -- ID retourné par Ayrshare
  created_by uuid FK → auth.users,
  created_at timestamp,
  updated_at timestamp
)

-- Versions de brouillons
post_versions (
  id uuid PK,
  post_id uuid FK → posts,
  version_number int,
  content text,
  feedback text, -- retour du client sur cette version
  generated_by text, -- 'ai', 'human', 'ai_revised'
  created_at timestamp
)

-- Analytics par post
post_analytics (
  id uuid PK,
  post_id uuid FK → posts,
  impressions int DEFAULT 0,
  likes int DEFAULT 0,
  comments int DEFAULT 0,
  shares int DEFAULT 0,
  clicks int DEFAULT 0,
  engagement_rate decimal,
  fetched_at timestamp
)

-- Feedback client (apprentissage)
post_feedback (
  id uuid PK,
  post_id uuid FK → posts,
  organization_id uuid FK → organizations,
  rating int, -- 1-5
  feedback_text text,
  created_at timestamp
)

-- Sources RSS / veille
rss_feeds (
  id uuid PK,
  organization_id uuid FK → organizations,
  feed_url text,
  feed_name text,
  is_active boolean DEFAULT true,
  last_checked_at timestamp
)

-- Événements calendrier
calendar_events (
  id uuid PK,
  organization_id uuid FK → organizations,
  event_name text,
  event_date date,
  event_type text, -- 'journee_mondiale', 'secteur', 'entreprise', 'custom'
  description text,
  auto_generate boolean DEFAULT false -- générer un post auto
)

-- Notifications
notifications (
  id uuid PK,
  organization_id uuid FK → organizations,
  user_id uuid FK → auth.users,
  type text, -- 'draft_ready', 'review_needed', 'publication_soon', 'published', 'analytics_update'
  title text,
  message text,
  is_read boolean DEFAULT false,
  post_id uuid FK → posts,
  created_at timestamp
)
```

**RLS Policies :**
```sql
-- Chaque table filtrée par organization_id
-- L'utilisateur ne voit que les données de son/ses organisations
-- Basé sur organization_members.user_id = auth.uid()
```

**Supabase Edge Functions à créer :**
- `generate-embedding` : reçoit du texte, appelle l'API embeddings, stocke le vecteur
- `scrape-url` : reçoit une URL, extrait le contenu (utiliser cheerio/readability)
- `webhook-from-n8n` : reçoit les callbacks de n8n (draft prêt, post publié)
- `send-notification` : crée la notif in-app + envoie l'email via Resend/Supabase

### 0.2 — Initialisation Lovable

**Prompt Claude Code :**
> "Génère le code React/Lovable pour un SaaS multi-tenant avec Supabase Auth. Structure de pages ci-dessous."

**Pages à créer :**
- `/login` — Auth (email + Google OAuth)
- `/onboarding` — Wizard 4 étapes
- `/dashboard` — Vue d'ensemble
- `/calendar` — Calendrier éditorial
- `/posts/:id` — Éditeur de post
- `/documents` — Base documentaire
- `/analytics` — Performances
- `/settings` — Paramètres compte + marque
- `/notifications` — Centre de notifications

---

## SPRINT 1 — Onboarding & Profil de marque (Jour 3-5)

### 1.1 — Wizard d'onboarding (Lovable)

**Étape 1 : Votre entreprise**
- Nom de l'entreprise
- Description (textarea avec placeholder guidant)
- Secteur d'activité (dropdown avec options + "autre")
- Public cible (textarea)

**Étape 2 : Votre style**
- Ton éditorial : sélection visuelle avec exemples
  - 🎓 Expert & Formel → exemple : "Les dernières données montrent que..."
  - 😊 Accessible & Friendly → exemple : "Vous savez quoi ? On a découvert un truc génial..."
  - 🔥 Provocateur & Décalé → exemple : "Arrêtez tout. Ce que vous faites sur LinkedIn ne sert à rien."
  - ✨ Inspirant & Storytelling → exemple : "Il y a 3 ans, on était 2 dans un garage..."
  - 📚 Éducatif & Pédagogue → exemple : "Voici 5 choses que j'aurais aimé savoir avant de..."
- Utilisation des emojis (slider : jamais → beaucoup)
- Longueur préférée (court ~500 / moyen ~1000 / long ~1500 caractères)
- Signature de fin de post (optionnel)

**Étape 3 : Vos mots**
- Mots-clés à utiliser (tags input)
- Mots-clés à éviter (tags input)
- Hashtags préférés (tags input)
- Stratégie hashtags (peu / modéré / beaucoup)
- CTA préférés (sélection multiple : poser une question, inviter à commenter, lien vers site, aucun)

**Étape 4 : Vos exemples**
- Collez 2-3 posts LinkedIn que vous aimez (textarea × 3)
- Pourquoi vous les aimez ? (optionnel par post)
- Upload de documents (PDF, docs) pour la base de connaissances

**Action finale :** Sauvegarde dans `brand_profiles` + `documents` + génération des embeddings via Edge Function.

### 1.2 — Page Settings (Lovable)

Même champs que l'onboarding mais éditables à tout moment, avec :
- Connexion Ayrshare (OAuth flow) → sauvegarde `ayrshare_profile_key`
- Gestion des plateformes actives
- Gestion de l'abonnement (Stripe intégration future)

---

## SPRINT 2 — Calendrier éditorial & Création de posts (Jour 6-10)

### 2.1 — Calendrier éditorial (Lovable)

**Vue mensuelle :**
- Grille calendrier avec posts positionnés par date
- Code couleur par statut : gris (idée), jaune (brouillon), orange (en attente de review), vert (validé), bleu (publié)
- Drag & drop pour déplacer un post
- Click sur une date vide → créer un nouveau post
- Click sur un post → ouvrir l'éditeur

**Vue liste :**
- Tableau filtrable par statut, plateforme, date
- Actions rapides : approuver, supprimer, dupliquer

### 2.2 — Création d'un post (Lovable)

**Formulaire de création :**
- Date et heure de publication (datetime picker)
- Plateforme(s) cible(s) (checkbox : LinkedIn, Instagram...)
- Source du contenu (tabs) :
  - 📝 **Thème libre** : textarea pour décrire le sujet
  - 🔗 **URL / Article** : input URL + bouton "Extraire le contenu"
  - 📄 **Document** : sélection depuis la base documentaire
  - 🔄 **Recycler** : sélection d'un ancien post performant
  - 📅 **Événement** : sélection depuis le calendrier d'événements
  - 🎤 **Vocal** : bouton enregistrement audio (Whisper transcription)
- Overrides optionnels :
  - Ton (si différent du profil)
  - Langue (si différent du profil)
  - Instructions spécifiques pour ce post

**Bouton "Générer avec l'IA"** → appel n8n webhook → spinner → affichage du brouillon

### 2.3 — Éditeur de post (Lovable)

**Zone principale :**
- Éditeur de texte riche (le contenu généré)
- Compteur de caractères avec indicateur LinkedIn (3000 max)
- Preview LinkedIn (simulation de rendu)
- Upload média (images)

**Panneau latéral :**
- Historique des versions (accordéon cliquable)
- Pour chaque version : contenu + date + "généré par IA" ou "modifié par humain"
- Zone de feedback : "Dites à l'IA ce que vous voulez changer"
  - Boutons rapides : "Raccourcis", "Plus percutant", "Ajoute un CTA", "Change le ton"
  - Textarea pour instruction libre
  - Bouton "Régénérer"
- Bouton "Régénérer seulement l'intro / le corps / la conclusion"

**Actions :**
- Sauvegarder en brouillon
- Soumettre pour review (si workflow d'approbation)
- Approuver & Planifier
- Publier maintenant

---

## SPRINT 3 — Workflows N8N (Jour 11-16)

### 3.1 — Workflow "Rédaction IA"

**Trigger :** Webhook depuis Lovable (bouton "Générer avec l'IA")

**Étapes :**
1. **Recevoir la requête** : post_id, source_type, source_content, organization_id
2. **Fetch brand_profile** : requête Supabase → récupérer ton, mots-clés, style, exemples
3. **Fetch source content** :
   - Si URL → scrape via Edge Function → résumé
   - Si document → fetch depuis Supabase
   - Si thème → utiliser tel quel
   - Si recycle → fetch ancien post + analytics
   - Si vocal → transcription Whisper
4. **RAG** : query pgvector avec le sujet → récupérer les 3-5 documents les plus pertinents
5. **Fetch posts performants** : récupérer les 3 meilleurs posts du client (par engagement_rate) comme exemples few-shot
6. **Fetch feedbacks négatifs récents** : pour éviter de reproduire ce que le client n'a pas aimé
7. **Construire le prompt** :

```
SYSTEM:
Tu es un expert en rédaction LinkedIn pour {company_name}, une entreprise de {industry}.

PROFIL DE MARQUE:
- Description : {company_description}
- Audience cible : {target_audience}
- Ton : {tone} — {writing_style_notes}
- Mots-clés à intégrer naturellement : {keywords_to_use}
- Mots-clés interdits : {keywords_to_avoid}
- Emojis : {emoji_usage}
- Longueur : {post_length_preference}
- Hashtags : {hashtag_strategy}, préférés : {preferred_hashtags}
- CTA : {cta_preferences}
- Signature : {signature_line}

EXEMPLES DE POSTS APPRÉCIÉS PAR LE CLIENT:
{example_posts_liked}

POSTS RÉCENTS PERFORMANTS (à s'inspirer du style):
{top_performing_posts}

CE QUE LE CLIENT N'AIME PAS:
{negative_feedback_summary}

CONTEXTE DOCUMENTAIRE (base de connaissances):
{rag_results}

SOURCE POUR CE POST:
Type: {source_type}
Contenu: {source_content}

{tone_override ? "OVERRIDE DE TON: " + tone_override : ""}
{language_override ? "LANGUE: " + language_override : ""}
{specific_instructions ? "INSTRUCTIONS SPÉCIFIQUES: " + specific_instructions : ""}

CONSIGNES DE RÉDACTION:
1. Rédige un post LinkedIn professionnel et engageant
2. Structure : accroche percutante (1ère ligne = hook) → développement → conclusion avec CTA
3. Utilise les sauts de ligne pour la lisibilité LinkedIn
4. Intègre les hashtags selon la stratégie définie
5. Reste authentique et aligné avec la voix de la marque
6. Ne fais jamais de plagiat — reformule et apporte une perspective unique
7. Adapte la longueur selon la préférence ({post_length_preference})

Génère le post.
```

8. **Appel Claude API** (via n8n HTTP Request node ou Claude node)
9. **Sauvegarder le brouillon** : update `posts` (content, status='draft') + insert `post_versions`
10. **Créer notification** : insert dans `notifications` (type='draft_ready')
11. **Envoyer email** : via Resend/Supabase → "Votre brouillon est prêt !"
12. **Retourner le contenu** au frontend via webhook response

### 3.2 — Workflow "Révision IA"

**Trigger :** Webhook (bouton "Régénérer" avec feedback)

**Étapes :**
1. Recevoir : post_id, feedback, scope (full/intro/body/conclusion)
2. Fetch post actuel + brand_profile
3. Construire prompt de révision :

```
Voici le post actuel:
{current_content}

Feedback du client:
{feedback}

{scope == 'intro' ? "Ne modifie QUE l'introduction, garde le reste identique." : ""}
{scope == 'conclusion' ? "Ne modifie QUE la conclusion, garde le reste identique." : ""}

Révise en respectant le profil de marque.
```

4. Appel Claude API
5. Sauvegarder nouvelle version
6. Retourner au frontend

### 3.3 — Workflow "Publication programmée"

**Trigger :** Cron toutes les 5 minutes

**Étapes :**
1. Query Supabase : `posts WHERE status='approved' AND scheduled_at <= NOW()`
2. Pour chaque post :
   a. Fetch `ayrshare_profile_key` de l'organisation
   b. Appel API Ayrshare :
   ```
   POST https://app.ayrshare.com/api/post
   Headers: Authorization: Bearer {profile_key}
   Body: {
     "post": content,
     "platforms": ["linkedin"],
     "mediaUrls": media_urls,
     "scheduleDate": null // publication immédiate car déjà l'heure
   }
   ```
   c. Update post : status='published', ayrshare_post_id, published_at
   d. Créer notification : "Votre post a été publié !"
   e. Envoyer email de confirmation
3. Gestion d'erreur : si échec → status='failed' + notification d'erreur

### 3.4 — Workflow "Collecte Analytics"

**Trigger :** Cron quotidien (6h du matin)

**Étapes :**
1. Query tous les posts publiés des 30 derniers jours
2. Pour chaque post avec ayrshare_post_id :
   a. Appel API Ayrshare : `GET /api/analytics/post/{id}`
   b. Upsert dans `post_analytics`
   c. Calculer engagement_rate = (likes + comments + shares) / impressions
3. Identifier les top performers par organisation (pour le few-shot learning)

### 3.5 — Workflow "Veille RSS"

**Trigger :** Cron toutes les 6 heures

**Étapes :**
1. Fetch tous les `rss_feeds` actifs
2. Pour chaque feed : parser le RSS, comparer avec last_checked_at
3. Pour chaque nouvel article :
   a. Scrape le contenu
   b. Évaluer la pertinence (appel LLM rapide : "Cet article est-il pertinent pour {industry} ?")
   c. Si pertinent → créer un post en statut 'idea' avec source_type='rss'
   d. Notification : "Nouvel article détecté, voulez-vous en faire un post ?"
4. Update last_checked_at

### 3.6 — Workflow "Événements à venir"

**Trigger :** Cron quotidien

**Étapes :**
1. Fetch `calendar_events WHERE event_date BETWEEN NOW() AND NOW()+7days AND auto_generate=true`
2. Pour chaque événement sans post associé :
   a. Créer un post en statut 'idea' avec source_type='event'
   b. Déclencher le workflow de rédaction
   c. Notification : "Un post a été pré-rédigé pour {event_name}"

### 3.7 — Workflow "Scraping URL"

**Trigger :** Webhook (bouton "Extraire le contenu" dans le formulaire)

**Étapes :**
1. Recevoir l'URL
2. Appel Edge Function `scrape-url` (ou directement dans n8n avec HTTP Request + Cheerio)
3. Extraction : titre, contenu principal, meta description, images
4. Résumé via LLM (pour ne pas stocker tout l'article)
5. Retourner le résumé au frontend pour confirmation

---

## SPRINT 4 — Analytics, RAG & Intelligence (Jour 17-22)

### 4.1 — Dashboard Analytics (Lovable)

**Métriques globales :**
- Posts publiés ce mois / quota
- Engagement moyen
- Meilleur post du mois
- Évolution semaine par semaine (graphique)

**Par post :**
- Impressions, likes, commentaires, partages
- Taux d'engagement
- Comparaison avec la moyenne du compte

**Insights IA (bonus) :**
- "Vos posts du mardi performent 40% mieux"
- "Le ton éducatif génère plus d'engagement pour vous"
- "Suggestion : postez plus souvent sur {sujet}"

### 4.2 — RAG avec pgvector

**Upload de documents :**
1. Client upload un fichier (PDF, DOCX, TXT) via Lovable
2. Fichier stocké dans Supabase Storage
3. Edge Function déclenché :
   a. Extraction du texte (pdf-parse, mammoth pour docx)
   b. Chunking (500 tokens par chunk avec overlap de 50)
   c. Embedding via API OpenAI (text-embedding-3-small) ou Voyage AI
   d. Stockage : chaque chunk = 1 ligne dans `documents` avec son vecteur

**Recherche RAG dans le workflow de rédaction :**
```sql
SELECT content, title, 1 - (embedding <=> query_embedding) as similarity
FROM documents
WHERE organization_id = $1
ORDER BY embedding <=> query_embedding
LIMIT 5
```

### 4.3 — Système de feedback & apprentissage

**Dans l'éditeur (Lovable) :**
- Après publication : widget "Comment s'est passé ce post ?" (1-5 étoiles + commentaire optionnel)
- Bouton rapide "Ce post me ressemble" / "Ce post ne me ressemble pas"

**Dans n8n :**
- Les posts avec rating >= 4 sont marqués comme "exemples positifs"
- Les posts avec rating <= 2 + feedback sont utilisés comme "anti-exemples"
- Le prompt de rédaction évolue automatiquement

### 4.4 — Notifications in-app + email

**In-app (Lovable) :**
- Icône cloche dans la navbar avec badge compteur
- Page `/notifications` avec liste chronologique
- Click sur une notif → redirige vers le post concerné
- Realtime via Supabase Realtime (subscription sur la table notifications)

**Email (via Resend ou Supabase) :**
- Templates : brouillon prêt, rappel de validation, post publié, rapport hebdo
- Fréquence configurable dans les settings

---

## SPRINT 5 — Polish & Lancement (Jour 23-28)

### 5.1 — Landing page (Lovable)
- Hero section avec value prop
- Démo/screenshots
- Pricing (3 plans)
- CTA inscription

### 5.2 — Stripe intégration
- 3 plans : Starter (29€), Pro (79€), Business (199€)
- Supabase webhook pour activer/désactiver features

### 5.3 — Tests & hardening
- Tests des workflows n8n avec données réelles
- Gestion des erreurs partout
- Rate limiting API
- Monitoring (Supabase logs + n8n execution history)

---

## Résumé des commandes Claude Code

Pour chaque sprint, la logique est :

1. **Claude Code génère le SQL** → tu l'exécutes dans Supabase
2. **Claude Code génère le code React** → tu le déploies dans Lovable
3. **Claude Code génère les workflows n8n** → tu les importes (format JSON)
4. **Claude Code génère les Edge Functions** → tu les déploies via Supabase CLI

L'avantage de ta stack : tout est déclaratif ou low-code, Claude Code peut te générer 90% du produit.
