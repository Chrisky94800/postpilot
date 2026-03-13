# SPEC TECHNIQUE — Dashboard PostPilot V2

> Ce fichier est la référence pour Claude Code. Chaque élément du dashboard est décrit avec sa source de données, son comportement et ses interactions.
> Le mockup visuel de référence est dans `docs/dashboard-v2-mockup.jsx`.

---

## LAYOUT GÉNÉRAL

```
┌─────────────────────────────────────────────────────────────────┐
│  [SIDEBAR existante — ne pas modifier]     │  MAIN CONTENT      │
│                                            │                    │
│                                            │  [TOP BAR]         │
│                                            │  [NOM ENTREPRISE]  │
│                                            │  [4 KPI CARDS]     │
│                                            │  [2 COLONNES]      │
│                                            │    gauche: Actions  │
│                                            │    droite: Posts    │
│                                            │  [PROGRAMMES]      │
│                                            │                    │
│                                            │  [CHAT DRAWER →]   │
└─────────────────────────────────────────────────────────────────┘
```

La sidebar reste **exactement comme elle est aujourd'hui**. On ne touche qu'au contenu principal (zone droite).

---

## 1. TOP BAR

### Éléments
- Titre : `"Tableau de bord"` (texte statique)
- Icône cloche (notifications)
- Avatar + nom user

### Données
- **Cloche** : affiche un badge rouge avec le nombre de notifications non lues
  ```sql
  SELECT COUNT(*) FROM notifications
  WHERE organization_id = {org_id}
  AND user_id = auth.uid()
  AND read_at IS NULL
  ```
- **Nom user** : depuis `auth.getUser()` → `user.email` tronqué, ou `user.user_metadata.full_name` si disponible

### Comportement
- Clic cloche → navigate vers `/notifications`
- Clic avatar → dropdown (Profil, Paramètres, Déconnexion) OU navigate vers `/settings`

---

## 2. NOM ENTREPRISE

### Éléments
- Ligne 1 : nom de l'organisation (gras, 18px)
- Ligne 2 : `"Assistant de communication LinkedIn"` (texte statique, gris)

### Données
```sql
SELECT name FROM organizations
WHERE id = {org_id}
```
Via le hook `useOrganization()` qui existe déjà.

---

## 3. LES 4 KPI CARDS

**Design** : 4 cartes en ligne, fond blanc, border grise, pas d'icône. Chaque carte a : un label (gris, 13px), une valeur (noir, 30px, bold), un sous-texte (gris clair, 12px).

### KPI 1 : "Publiés ce mois"

**Ce que ça mesure** : Le nombre de posts effectivement publiés sur LinkedIn ce mois-ci.

**Donnée** :
```sql
SELECT COUNT(*) as published_count
FROM posts
WHERE organization_id = {org_id}
AND status = 'published'
AND published_at >= date_trunc('month', CURRENT_DATE)
AND published_at < date_trunc('month', CURRENT_DATE) + interval '1 month'
```

**Sous-texte** : `"sur {max_posts_per_month} disponibles"`
```sql
SELECT max_posts_per_month FROM organizations WHERE id = {org_id}
```

**Affichage** :
- Valeur : `"3"` (le count)
- Sous-texte : `"sur 8 disponibles"` (ou 30 pour Pro, illimité pour Business)
- Si aucun post ce mois : valeur = `"0"`

---

### KPI 2 : "À rédiger"

**Ce que ça mesure** : Le nombre de posts qui sont planifiés dans les 7 prochains jours mais qui n'ont pas encore de contenu (status `waiting` ou `draft`).

**Donnée** :
```sql
SELECT COUNT(*) as to_write_count
FROM posts
WHERE organization_id = {org_id}
AND status IN ('waiting', 'draft')
AND scheduled_at >= CURRENT_DATE
AND scheduled_at < CURRENT_DATE + interval '7 days'
```

**Sous-texte** : `"cette semaine"`

**Affichage** :
- Valeur : `"2"` (le count)
- Si 0 : valeur = `"0"`, sous-texte = `"rien de prévu cette semaine"` → c'est un signal pour inciter à créer un programme

**Pourquoi ce KPI** : C'est l'indicateur d'action. Il dit au user "tu as X trucs à faire cette semaine". C'est ce qui crée l'engagement avec l'outil.

---

### KPI 3 : "Vues LinkedIn"

**Ce que ça mesure** : Le nombre total d'impressions/vues sur les posts LinkedIn publiés ce mois-ci.

**Donnée** :
```sql
SELECT COALESCE(SUM(impressions), 0) as total_views
FROM post_analytics pa
JOIN posts p ON pa.post_id = p.id
WHERE p.organization_id = {org_id}
AND pa.fetched_at >= date_trunc('month', CURRENT_DATE)
```

**Sous-texte** :
- Si des données existent le mois précédent : `"↑ +23% vs mois dernier"` ou `"↓ -12% vs mois dernier"` ou `"→ stable vs mois dernier"`
  ```sql
  -- Comparaison mois précédent
  SELECT COALESCE(SUM(impressions), 0) as prev_views
  FROM post_analytics pa
  JOIN posts p ON pa.post_id = p.id
  WHERE p.organization_id = {org_id}
  AND pa.fetched_at >= date_trunc('month', CURRENT_DATE) - interval '1 month'
  AND pa.fetched_at < date_trunc('month', CURRENT_DATE)
  ```
  Calcul : `((current - prev) / prev) * 100` → arrondi à l'entier
- Si aucune donnée : sous-texte = `"aucune donnée encore"`

**Affichage** :
- Si données : valeur formatée `"1 247"` (avec séparateur de milliers)
- Si aucune donnée : valeur = `"—"` (tiret long), sous-texte = `"aucune donnée encore"`

**Pourquoi ce KPI** : C'est la métrique de visibilité. Le client TPE veut savoir "est-ce qu'on me voit ?".

---

### KPI 4 : "Engagement"

**Ce que ça mesure** : Le taux d'engagement moyen sur les posts publiés ce mois-ci. L'engagement = (likes + comments + shares) / impressions * 100.

**Donnée** :
```sql
SELECT
  CASE
    WHEN SUM(impressions) > 0
    THEN ROUND((SUM(likes + comments + shares)::numeric / SUM(impressions)) * 100, 1)
    ELSE NULL
  END as engagement_rate
FROM post_analytics pa
JOIN posts p ON pa.post_id = p.id
WHERE p.organization_id = {org_id}
AND pa.fetched_at >= date_trunc('month', CURRENT_DATE)
```

**Sous-texte** : même logique de comparaison mois précédent que KPI 3.

**Affichage** :
- Si données : valeur = `"4.2%"` (avec le symbole %)
- Si aucune donnée : valeur = `"—"`, sous-texte = `"aucune donnée encore"`
- Un bon engagement LinkedIn est >2%. Si >3% on peut afficher en vert.

**Pourquoi ce KPI** : C'est la métrique de ROI. Plus que les vues, c'est l'engagement qui génère des leads.

---

### Hook React pour les KPIs

Créer un hook `useDashboardKPIs(organizationId)` qui retourne :

```typescript
type DashboardKPIs = {
  publishedThisMonth: number;
  maxPostsPerMonth: number;
  toWriteThisWeek: number;
  viewsThisMonth: number | null;       // null = pas de données
  viewsTrend: number | null;           // % de variation, null = pas de données
  engagementRate: number | null;       // en %, null = pas de données
  engagementTrend: number | null;      // % de variation
  isLoading: boolean;
};
```

Ce hook fait UNE requête Supabase RPC (function PostgreSQL) pour tout récupérer d'un coup, pas 4 requêtes séparées. Créer la function SQL :

```sql
CREATE OR REPLACE FUNCTION get_dashboard_kpis(org_id uuid)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
  published_count int;
  max_posts int;
  to_write int;
  views_current bigint;
  views_previous bigint;
  eng_current numeric;
  eng_previous numeric;
BEGIN
  -- Publiés ce mois
  SELECT COUNT(*) INTO published_count
  FROM posts WHERE organization_id = org_id
  AND status = 'published'
  AND published_at >= date_trunc('month', CURRENT_DATE);

  -- Max posts
  SELECT max_posts_per_month INTO max_posts
  FROM organizations WHERE id = org_id;

  -- À rédiger cette semaine
  SELECT COUNT(*) INTO to_write
  FROM posts WHERE organization_id = org_id
  AND status IN ('waiting', 'draft')
  AND scheduled_at >= CURRENT_DATE
  AND scheduled_at < CURRENT_DATE + interval '7 days';

  -- Vues ce mois
  SELECT COALESCE(SUM(pa.impressions), 0) INTO views_current
  FROM post_analytics pa JOIN posts p ON pa.post_id = p.id
  WHERE p.organization_id = org_id
  AND pa.fetched_at >= date_trunc('month', CURRENT_DATE);

  -- Vues mois précédent
  SELECT COALESCE(SUM(pa.impressions), 0) INTO views_previous
  FROM post_analytics pa JOIN posts p ON pa.post_id = p.id
  WHERE p.organization_id = org_id
  AND pa.fetched_at >= date_trunc('month', CURRENT_DATE) - interval '1 month'
  AND pa.fetched_at < date_trunc('month', CURRENT_DATE);

  -- Engagement ce mois
  SELECT CASE WHEN SUM(pa.impressions) > 0
    THEN ROUND((SUM(pa.likes + pa.comments + pa.shares)::numeric / SUM(pa.impressions)) * 100, 1)
    ELSE NULL END INTO eng_current
  FROM post_analytics pa JOIN posts p ON pa.post_id = p.id
  WHERE p.organization_id = org_id
  AND pa.fetched_at >= date_trunc('month', CURRENT_DATE);

  -- Engagement mois précédent
  SELECT CASE WHEN SUM(pa.impressions) > 0
    THEN ROUND((SUM(pa.likes + pa.comments + pa.shares)::numeric / SUM(pa.impressions)) * 100, 1)
    ELSE NULL END INTO eng_previous
  FROM post_analytics pa JOIN posts p ON pa.post_id = p.id
  WHERE p.organization_id = org_id
  AND pa.fetched_at >= date_trunc('month', CURRENT_DATE) - interval '1 month'
  AND pa.fetched_at < date_trunc('month', CURRENT_DATE);

  result := jsonb_build_object(
    'published_this_month', published_count,
    'max_posts_per_month', max_posts,
    'to_write_this_week', to_write,
    'views_this_month', CASE WHEN views_current > 0 THEN views_current ELSE NULL END,
    'views_trend', CASE WHEN views_previous > 0 THEN ROUND(((views_current - views_previous)::numeric / views_previous) * 100) ELSE NULL END,
    'engagement_rate', eng_current,
    'engagement_trend', CASE WHEN eng_previous > 0 AND eng_current IS NOT NULL THEN ROUND(((eng_current - eng_previous) / eng_previous) * 100) ELSE NULL END
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

Appel depuis le frontend :
```typescript
const { data } = await supabase.rpc('get_dashboard_kpis', { org_id: organizationId });
```

---

## 4. SECTION "ACTIONS RAPIDES" (colonne gauche)

4 boutons empilés verticalement. Le premier est en bleu foncé (primary), les autres en blanc avec bordure.

### Bouton 1 : "Parler à mon assistant" (PRIMARY)
- **Icône** : 💬
- **Description** : `"Planifier une campagne, préparer un post, avoir des idées..."`
- **Action** : ouvre le panneau chat latéral (drawer qui slide depuis la droite)

### Bouton 2 : "Rédiger un post maintenant"
- **Icône** : ✍️
- **Description** : `"À partir d'une idée, d'un article ou d'un document"`
- **Action** : `navigate('/posts/new')` → ouvre l'éditeur de post en mode création

### Bouton 3 : "Créer un programme"
- **Icône** : 📋
- **Description** : `"Planifier plusieurs semaines de publications"`
- **Action** : ouvre le chat latéral avec un message pré-rempli : `"Je voudrais créer un nouveau programme de communication"`

### Bouton 4 : "Connecter LinkedIn"
- **Icône** : 🔗
- **Description** : `"Activer la publication automatique"`
- **Action** : `navigate('/settings?tab=platforms')` → ouvre les paramètres onglet Plateformes
- **Condition d'affichage** : ce bouton ne s'affiche QUE si aucune plateforme LinkedIn n'est connectée
  ```sql
  SELECT COUNT(*) FROM platforms
  WHERE organization_id = {org_id}
  AND platform_type = 'linkedin'
  AND is_active = true
  ```
  Si count > 0 → ne PAS afficher ce bouton. Afficher à la place un bouton "Voir mes analytics" qui pointe vers `/analytics`.

---

## 5. SECTION "PROCHAINS POSTS" (colonne droite)

### En-tête
- Titre : `"Prochains posts"`
- Lien : `"Voir le calendrier →"` → `navigate('/calendar')`

### Liste des posts

Affiche les **3 prochains posts** planifiés (toutes les statuts sauf `published`), triés par date.

**Donnée** :
```sql
SELECT
  p.id,
  p.title,
  p.scheduled_at,
  p.publication_time,
  p.status,
  pr.title as program_title
FROM posts p
LEFT JOIN programs pr ON p.program_id = pr.id
WHERE p.organization_id = {org_id}
AND p.status IN ('waiting', 'draft', 'approved')
AND p.scheduled_at >= CURRENT_DATE
ORDER BY p.scheduled_at ASC
LIMIT 3
```

### Par post, afficher :
- **Titre** : `p.title` (gras, 13px). Si null ou vide (post waiting sans titre) → afficher `"Post sans titre"` en italique gris.
- **Badge statut** :
  - `waiting` → badge jaune clair, texte `"À rédiger"`
  - `draft` → badge jaune, texte `"Brouillon"`
  - `approved` → badge vert clair, texte `"Validé"`
- **Date + heure** : formater `scheduled_at` en `"Mar 4 mars"` (jour abrégé + numéro + mois) + `publication_time` formaté en `"9h00"`
- **Programme** : `program_title`. Si null (post hors programme) → ne rien afficher.

### Comportement
- Clic sur un post :
  - Si `status = 'waiting'` ou `'draft'` → `navigate('/posts/{id}')` (ouvre l'éditeur)
  - Si `status = 'approved'` → `navigate('/posts/{id}')` (ouvre l'éditeur en mode lecture)

### Bouton en bas
- `"+ Ajouter un post hors programme"` (bordure pointillée)
- Action : `navigate('/posts/new')` → ouvre l'éditeur en mode création, sans programme associé

### Si aucun post planifié
Afficher un état vide :
```
Aucun post planifié.
Créez un programme ou rédigez un post pour commencer.
[Créer un programme →]
```

---

## 6. SECTION "MES PROGRAMMES"

### En-tête
- Titre : `"Mes programmes"`
- Lien : `"Voir tout →"` → `navigate('/programs')`

### Données

Affiche les programmes actifs ou en draft (maximum 2), plus une carte "Nouveau programme".

```sql
SELECT
  pr.id,
  pr.title,
  pr.posts_per_week,
  pr.start_date,
  pr.end_date,
  pr.status,
  COUNT(p.id) FILTER (WHERE p.status = 'published') as published_count,
  COUNT(p.id) as total_posts
FROM programs pr
LEFT JOIN posts p ON p.program_id = pr.id
WHERE pr.organization_id = {org_id}
AND pr.status IN ('active', 'draft')
GROUP BY pr.id
ORDER BY pr.created_at DESC
LIMIT 2
```

### Par programme, afficher :
- **Pastille couleur** : alterner entre vert (`#10B981`), bleu (`#2563EB`), orange (`#F97316`), violet (`#8B5CF6`) selon l'index
- **Titre** : `pr.title`
- **Sous-texte** : `"{posts_per_week} posts/sem · {durée} semaines"`
  - Durée = `CEIL((end_date - start_date) / 7)`
- **Progression** : `"{published_count}/{total_posts} publiés"`
- **Barre de progression** : largeur = `(published_count / total_posts) * 100` %
- **Pourcentage** : affiché à droite de la barre

### Carte "Nouveau programme"
- Toujours affichée en dernière position
- Bordure pointillée, fond gris très clair
- Texte : `"+"` + `"Nouveau programme"` + `"via l'assistant IA"`
- **Action** : ouvre le chat latéral avec le message pré-rempli `"Je voudrais créer un nouveau programme de communication"`

### Comportement
- Clic sur un programme → `navigate('/programs/{id}')`

### Si aucun programme
Afficher seulement la carte "Nouveau programme" en pleine largeur, avec un message d'encouragement :
```
Vous n'avez pas encore de programme.
L'assistant IA peut vous aider à planifier vos publications en quelques minutes.
[Créer mon premier programme →]
```

---

## 7. PANNEAU CHAT LATÉRAL (DRAWER)

### Comportement
- S'ouvre en **glissant depuis la droite** (animation translateX)
- Largeur fixe : **420px**
- Se superpose au contenu (position fixed, z-index 100)
- Ombre portée à gauche
- Se ferme en cliquant sur ✕ ou en cliquant en dehors (optionnel)

### En-tête du drawer
- Titre : `"Assistant PostPilot"`
- Sous-titre : `"Votre copilote LinkedIn"`
- Bouton fermer ✕

### Zone de messages
- Scrollable verticalement
- Messages user : bulle bleue, alignée à droite, coin bas-droit carré
- Messages assistant : bulle gris clair, alignée à gauche, coin bas-gauche carré
- Support du markdown basique dans les messages assistant (gras, listes à puces, retours à la ligne)

### Premier message (automatique)
Quand le drawer s'ouvre pour la première fois de la session :
```
Bonjour {prenom} ! Vous avez {to_write_this_week} posts à rédiger cette semaine. On s'y met ?
```
- `{prenom}` : depuis `user.user_metadata.full_name` (premier mot) ou `"Chris"` en fallback
- `{to_write_this_week}` : même donnée que le KPI 2

### Suggestions (boutons sous le premier message)
3 boutons pills (bordure arrondie, fond blanc) :
1. `"Créer un programme de 4 semaines"`
2. `"Une idée de post pour demain"`
3. `"Analyser mes performances"`

Clic sur une suggestion → envoie le texte comme message user.
Les suggestions disparaissent dès qu'un message est envoyé.

### Input
- Textarea (pas input) pour supporter le multiligne
- Placeholder : `"Votre message..."`
- Envoi : clic sur le bouton ➤ OU touche Entrée
- Shift+Entrée = retour à la ligne (pas d'envoi)
- Bouton ➤ : gris quand input vide, bleu quand il y a du texte

### Appel API
Chaque message user déclenche :
```
POST /webhook/ai-chat
Body: {
  organization_id: {org_id},
  conversation_id: {id de la conversation en cours, null si première},
  message: {texte du user}
}
```

Pendant l'attente de la réponse :
- Afficher un indicateur de frappe (3 points animés) dans une bulle assistant
- Désactiver le bouton d'envoi

Quand la réponse arrive :
- Remplacer l'indicateur par le message réel
- Si la réponse contient un `program_proposal` → afficher un composant `ProgramExtractCard` inline dans le chat (voir section 8)

### Persistance
- `conversation_id` est stocké dans le state React du drawer
- Si le user ferme et rouvre le drawer dans la même session → reprendre la même conversation
- Si nouvelle session (rechargement page) → nouvelle conversation

---

## 8. PROGRAM EXTRACT CARD (dans le chat)

Quand le webhook `/ai-chat` retourne un `program_proposal` dans sa réponse, afficher une carte spéciale dans le chat :

### Données reçues
```json
{
  "program_proposal": {
    "title": "Transformation digitale des TPE",
    "duration_weeks": 4,
    "posts_per_week": 2,
    "posts": [
      { "title": "80% des TPE n'ont pas de stratégie digitale", "week": 1, "theme": "constat" },
      { "title": "Mon client a perdu 30% de CA en ignorant LinkedIn", "week": 1, "theme": "storytelling" },
      ...
    ]
  }
}
```

### Affichage
Carte avec fond blanc, bordure bleue fine, coins arrondis :
```
📋 Programme proposé

Transformation digitale des TPE
4 semaines · 2 posts/sem · 8 posts au total

Sem 1 : "80% des TPE n'ont pas de stratégie digitale"
         "Mon client a perdu 30% de CA..."
Sem 2 : ...
[liste scrollable si >6 posts]

[✅ Valider ce programme]  [✏️ Modifier]
```

### Actions
- **Valider** : appelle `POST /webhook/create-program` avec les données du programme → crée le programme et les posts dans Supabase → la carte passe en état "Programme créé ✅" (boutons désactivés) → la section "Mes programmes" du dashboard se met à jour (invalidate query)
- **Modifier** : envoie un message automatique dans le chat : `"Je voudrais modifier ce programme"` → la conversation continue

---

## 9. ÉTAT INITIAL (NOUVEAU USER)

Quand un user vient de s'inscrire et n'a encore aucune donnée :

### KPIs
- Publiés : `0` / `"sur 8 disponibles"`
- À rédiger : `0` / `"rien de prévu cette semaine"`
- Vues : `—` / `"aucune donnée encore"`
- Engagement : `—` / `"aucune donnée encore"`

### Prochains posts
→ État vide avec message d'encouragement + bouton "Créer un programme"

### Programmes
→ Seulement la carte "Nouveau programme" en large

### Actions rapides
→ Le bouton "Connecter LinkedIn" est visible (pas de plateforme connectée)

L'ensemble doit donner une impression claire de "voici par où commencer" — pas un dashboard vide et déprimant.

---

## 10. FICHIERS À CRÉER / MODIFIER

### Nouveau fichier SQL
```
supabase/migrations/008_dashboard_kpis_function.sql
→ Contient la function get_dashboard_kpis(org_id)
```

### Nouveaux composants
```
lovable/src/components/dashboard/KPICards.tsx
lovable/src/components/dashboard/QuickActions.tsx
lovable/src/components/dashboard/NextPosts.tsx
lovable/src/components/dashboard/ProgramsPreview.tsx
lovable/src/components/dashboard/ChatDrawer.tsx
lovable/src/components/dashboard/ChatMessage.tsx
lovable/src/components/dashboard/ChatInput.tsx
lovable/src/components/dashboard/ProgramExtractCard.tsx
```

### Nouveau hook
```
lovable/src/hooks/useDashboardKPIs.ts
lovable/src/hooks/useAIChat.ts
```

### Fichier modifié
```
lovable/src/pages/Dashboard.tsx → refonte complète avec les nouveaux composants
lovable/src/lib/api.ts → ajouter aiChat(), createProgram()
```

---

## 11. ORDRE D'IMPLÉMENTATION

1. **SQL** : créer `008_dashboard_kpis_function.sql` → exécuter dans Supabase
2. **Hook** : `useDashboardKPIs.ts` (appelle la RPC function)
3. **Composants statiques** : KPICards, QuickActions, NextPosts, ProgramsPreview
4. **Dashboard.tsx** : assembler les composants
5. **Chat** : ChatDrawer, ChatMessage, ChatInput, useAIChat
6. **ProgramExtractCard** : carte de programme validable dans le chat
7. **Tester** : vérifier chaque KPI avec des données réelles

---

## 12. RESPONSIVE

- **< 1200px** : les 4 KPIs passent sur 2 lignes (grille 2x2)
- **< 1024px** : les 2 colonnes (Actions + Posts) passent en 1 colonne empilée
- **< 768px** : les programmes passent en 1 colonne
- **Chat drawer** : sur mobile, le drawer prend toute la largeur (100vw)
