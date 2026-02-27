# PostPilot V2 — Refonte UX : Assistant de Communication Conversationnel

## Ce qui change (résumé pour Claude Code)

PostPilot passe d'un "outil de publication" à un **assistant personnel de communication**.
Le cœur du produit devient une **conversation avec l'IA** qui accompagne le user dans la création de ses programmes de communication et la rédaction de ses posts.

---

## 1. NOUVELLES TABLES SUPABASE

### Table `programs` (NOUVELLE)

```sql
CREATE TABLE programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) NOT NULL,
  title text NOT NULL,                          -- ex: "Lancement produit X", "Thought leadership Q1"
  description text,                             -- description libre du programme
  start_date date NOT NULL,
  end_date date NOT NULL,
  posts_per_week int NOT NULL DEFAULT 2,        -- nombre de posts par semaine
  status text NOT NULL DEFAULT 'draft',         -- 'draft', 'active', 'paused', 'completed'
  ai_conversation_id uuid,                      -- lien vers la conversation IA qui a généré ce programme
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp DEFAULT NOW(),
  updated_at timestamp DEFAULT NOW()
);

-- RLS : même pattern, filtré par organization_id
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
```

### Table `ai_conversations` (NOUVELLE)

```sql
CREATE TABLE ai_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) NOT NULL,
  context text NOT NULL DEFAULT 'program_planning',  -- 'program_planning', 'post_editing'
  title text,                                         -- titre auto-généré ou manuel
  messages jsonb NOT NULL DEFAULT '[]',               -- [{role: 'user'|'assistant', content: '...', timestamp: '...'}]
  extracted_items jsonb DEFAULT '[]',                  -- [{type: 'program'|'post_idea', data: {...}, validated: bool}]
  is_active boolean DEFAULT true,
  created_at timestamp DEFAULT NOW(),
  updated_at timestamp DEFAULT NOW()
);

ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
```

### Table `posts` (MODIFIÉE)

```sql
-- Ajouter ces colonnes à posts :
ALTER TABLE posts ADD COLUMN program_id uuid REFERENCES programs(id);
ALTER TABLE posts ADD COLUMN position_in_program int;   -- ordre dans le programme (semaine 1 post 1, etc.)
ALTER TABLE posts ADD COLUMN publication_time time DEFAULT '09:00';  -- heure de publication par défaut
ALTER TABLE posts ADD COLUMN ai_conversation_id uuid REFERENCES ai_conversations(id);  -- conversation de rédaction
-- La colonne source_type existante garde ses valeurs : 'free_writing', 'url', 'document'
```

---

## 2. ARCHITECTURE DES PAGES (MODIFIÉE)

### Vue d'ensemble des pages

```
/dashboard          → KPIs + Chat IA (Assistant de communication)
/programs           → Liste des programmes de communication
/programs/:id       → Détail d'un programme (timeline des posts)
/calendar           → Calendrier éditorial (vue globale)
/calendar/:date     → Vue jour avec les posts prévus
/posts/:id          → Éditeur de post (nouveau design)
/documents          → Base documentaire
/analytics          → Analytics & performances
/settings           → Paramètres & profil de marque
/notifications      → Centre de notifications
```

---

## 3. PAGE DASHBOARD (REFONTE)

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│  DASHBOARD                                                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │ Publiés  │ │En attente│ │Programmés│ │Post max  │       │
│  │ ce mois  │ │          │ │          │ │ /mois    │       │
│  │    12    │ │    5     │ │    8     │ │  12/30   │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
│                                                              │
│  ┌──────────────────────────┐ ┌─────────────────────────┐   │
│  │                          │ │  MES PROGRAMMES          │   │
│  │   ASSISTANT DE           │ │                          │   │
│  │   COMMUNICATION          │ │  ▸ Lancement produit X   │   │
│  │                          │ │    3 posts/sem · actif   │   │
│  │   💬 Chat IA             │ │                          │   │
│  │                          │ │  ▸ Thought leadership    │   │
│  │   Bonjour ! Je suis      │ │    2 posts/sem · actif   │   │
│  │   votre assistant de     │ │                          │   │
│  │   communication.         │ │  ▸ + Nouveau programme   │   │
│  │   Comment puis-je vous   │ │                          │   │
│  │   aider aujourd'hui ?    │ │                          │   │
│  │                          │ │                          │   │
│  │   ○ Créer un programme   │ │                          │   │
│  │   ○ Préparer un post     │ │                          │   │
│  │   ○ Analyser mes perfs   │ │                          │   │
│  │                          │ │                          │   │
│  │  [Votre message...]  ➤  │ │                          │   │
│  └──────────────────────────┘ └─────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Comportement du Chat IA

**Le chat est le point d'entrée principal.** L'IA connaît :
- Le `brand_profile` du client (ton, mots-clés, audience, etc.)
- Les programmes existants
- Les posts récents et leurs performances
- La base documentaire

**Flux de création d'un programme via chat :**

```
IA : "Bonjour ! Comment puis-je vous aider ?"

User : "Je voudrais préparer une campagne pour le lancement de notre nouveau service de consulting"

IA : "Super ! Organisons ça ensemble. Quelques questions :
     1. Sur quelle durée souhaitez-vous communiquer ? (ex: 4 semaines, 2 mois...)
     2. À quel rythme ? (ex: 2 posts par semaine, 3 fois par semaine...)
     3. Quels angles souhaitez-vous couvrir ?"

User : "6 semaines, 3 posts par semaine. Je veux couvrir : l'annonce, les bénéfices, des témoignages, et un CTA final."

IA : "Parfait ! Voici ce que je propose :

     📋 Programme : Lancement Service Consulting
     ⏱️ 6 semaines · 3 posts/semaine · 18 posts au total
     
     Semaine 1 — Teasing
     • Post 1 : Teaser mystère (storytelling)
     • Post 2 : Les coulisses de la création
     • Post 3 : Annonce officielle
     
     Semaine 2 — La proposition de valeur
     • Post 4 : Le problème que vous résolvez
     • Post 5 : Votre approche unique
     • Post 6 : Un cas concret / exemple
     
     [...]
     
     ✅ Valider ce programme ?"

User : "Parfait, mais remplace le post 2 par quelque chose sur notre expertise"

IA : "Modifié ! 
     • Post 2 : 15 ans d'expertise — ce qui nous différencie
     
     ✅ Valider ce programme ?"

User : "Valide !"

→ L'IA crée le programme dans Supabase
→ Les 18 posts sont créés en statut "en attente" (waiting)
→ Ils sont répartis dans le calendrier aux bonnes dates
→ Le panneau "Mes programmes" se met à jour en temps réel
```

**Extraction automatique :** Quand l'IA propose un programme et que le user valide, le système :
1. INSERT dans `programs` (titre, durée, posts_per_week)
2. INSERT 18 posts dans `posts` (status='waiting', program_id, scheduled_at calculé, title du post)
3. Les posts apparaissent dans le calendrier

### Composants à créer

```
lovable/src/components/dashboard/
├── KPICards.tsx                    -- 4 cartes KPI en haut
├── AIChatPanel.tsx                 -- Le chat conversationnel principal
├── AIChatMessage.tsx               -- Un message (user ou assistant)
├── AIChatInput.tsx                 -- Input + boutons suggestions
├── ProgramExtractCard.tsx          -- Carte affichée quand l'IA propose un programme (avec bouton Valider)
├── ProgramSidebar.tsx              -- Panneau "Mes programmes" à droite
└── ProgramCard.tsx                 -- Carte compacte d'un programme
```

---

## 4. PAGE PROGRAMMES (NOUVELLE)

### /programs — Liste

```
┌─────────────────────────────────────────────────┐
│  MES PROGRAMMES DE COMMUNICATION                 │
│                                                   │
│  ┌─────────────────────────────────────────────┐ │
│  │ 🟢 Lancement Service Consulting              │ │
│  │ 6 semaines · 3 posts/sem · 12/18 publiés    │ │
│  │ ████████████░░░░░░ 67%                       │ │
│  │ Prochaine publication : Mar 25 fév, 9h00    │ │
│  └─────────────────────────────────────────────┘ │
│                                                   │
│  ┌─────────────────────────────────────────────┐ │
│  │ 🔵 Thought Leadership T1 2026               │ │
│  │ 12 semaines · 2 posts/sem · 4/24 publiés    │ │
│  │ ███░░░░░░░░░░░░░░░ 17%                      │ │
│  └─────────────────────────────────────────────┘ │
│                                                   │
│  [+ Nouveau programme] ← ouvre le chat IA        │
│                                                   │
└─────────────────────────────────────────────────┘
```

### /programs/:id — Détail

```
┌─────────────────────────────────────────────────┐
│  📋 Lancement Service Consulting                 │
│  6 semaines · 3 posts/sem · 12/18 publiés       │
│  Du 10 fév au 23 mars 2026                      │
│                                                   │
│  Semaine 1 — Teasing                             │
│  ┌─────┐ ┌─────┐ ┌─────┐                        │
│  │✅   │ │✅   │ │🟡   │                        │
│  │Pub. │ │Pub. │ │Att. │                        │
│  │10/02│ │12/02│ │14/02│                        │
│  └──┬──┘ └──┬──┘ └──┬──┘                        │
│     │       │       └── Click → /posts/:id       │
│                                                   │
│  Semaine 2 — La proposition de valeur            │
│  ┌─────┐ ┌─────┐ ┌─────┐                        │
│  │⏳   │ │⏳   │ │⏳   │                        │
│  │Prog.│ │Prog.│ │Prog.│                        │
│  │17/02│ │19/02│ │21/02│                        │
│  └─────┘ └─────┘ └─────┘                        │
│  [...]                                            │
│                                                   │
│  [⏸ Mettre en pause] [🗑 Supprimer]              │
└─────────────────────────────────────────────────┘
```

---

## 5. PAGE CALENDRIER (MODIFIÉE)

### Changement principal

Quand on clique sur une date dans le calendrier :

```
┌──────────────────────────────────────────────────────────────┐
│  CALENDRIER                                 [< Fév 2026 >]  │
│                                                               │
│  Lu    Ma    Me    Je    Ve    Sa    Di                       │
│  ...   ...   ...   ...   ...   ...   ...                     │
│  23    [24]  25    26    27    28    ...                      │
│        ↑ selected                                             │
│                                                               │
├──────────────────────────────────────────────────────────────┤
│  📅 Mardi 24 février 2026                                    │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ 🟡 09:00 — Lancement Service Consulting                  │ │
│  │ "15 ans d'expertise — ce qui nous différencie"          │ │
│  │ Statut : En attente · Programme : Lancement Consulting  │ │
│  │ [Rédiger ce post →]                                      │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ 🟢 14:00 — Thought Leadership                           │ │
│  │ "L'IA va-t-elle remplacer les consultants ?"            │ │
│  │ Statut : Validé · Publication dans 4h                   │ │
│  │ [Voir le post →]                                         │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  [+ Ajouter un post hors programme]                          │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

---

## 6. ÉDITEUR DE POST (REFONTE COMPLÈTE)

### Layout

```
┌──────────────────────────────────────────────────────────────────────────┐
│  RÉDACTION — "15 ans d'expertise..."           [Brouillon] [✅ Valider] │
├────────────────────────────────────────────────┬─────────────────────────┤
│                                                │  PROFIL DE MARQUE       │
│  SOURCE DU POST                                │  (rappel — éditable     │
│  ┌────────┐ ┌────────┐ ┌────────┐             │   pour ce post)         │
│  │📝 Libre│ │🔗 URL  │ │📄 Doc  │             │                         │
│  └────────┘ └────────┘ └────────┘             │  🏢 {company_name}      │
│                                                │  📝 {description}       │
│  ═══════════════════════════════════           │  👥 {audience}          │
│                                                │  🎭 Ton : {tone}        │
│  [Si Libre]                                    │  😊 Emojis : {usage}    │
│  ┌──────────────────────────────┐             │  📏 Longueur : {pref}   │
│  │ Textarea : écrivez votre     │             │  ✍️ Signature : {sig}    │
│  │ post ici...                  │             │  #️⃣ Hashtags : {list}    │
│  │                              │             │  🎯 CTA : {pref}        │
│  │                              │             │  📌 Exemples aimés :     │
│  └──────────────────────────────┘             │     "Il y a 3 ans..."   │
│  [🤖 Soumettre à l'IA pour optimisation]      │                         │
│                                                │  ──────────────────     │
│  [Si URL]                                      │  ⚠️ Modifications ici   │
│  ┌──────────────────────────────┐             │  = uniquement ce post.  │
│  │ 🔗 URL : [________________] │             │  Vos paramètres de base │
│  │            [Générer avec IA] │             │  restent inchangés.     │
│  └──────────────────────────────┘             │                         │
│                                                │  📅 Publication         │
│  [Si Document]                                 │  Date : 24/02/2026      │
│  ┌──────────────────────────────┐             │  Heure : [09:00] ✏️     │
│  │ 📄 [Uploader un document]   │             │  (modifiable par post)  │
│  │                              │             │                         │
│  │ Que souhaitez-vous ?         │             │                         │
│  │ ○ Une synthèse de ce doc    │             │                         │
│  │ ○ Surprenez-moi (IA libre) │             │                         │
│  │           [Générer avec IA]  │             │                         │
│  └──────────────────────────────┘             │                         │
│                                                │                         │
│  ═══════════════════════════════               │                         │
│                                                │                         │
│  ZONE D'ÉCHANGE AVEC L'IA                      │                         │
│  ┌──────────────────────────────┐             │                         │
│  │ 🤖 Voici ma proposition :    │             │                         │
│  │                              │             │                         │
│  │ "Il y a 15 ans, nous avons  │             │                         │
│  │ démarré avec une conviction │             │                         │
│  │ simple : [...]"             │             │                         │
│  │                              │             │                         │
│  │ 👤 Plus percutant en intro  │             │                         │
│  │                              │             │                         │
│  │ 🤖 Voici la version révisée:│             │                         │
│  │ "Personne n'y croyait. [...]"│             │                         │
│  │                              │             │                         │
│  │ [Message...]            ➤   │             │                         │
│  └──────────────────────────────┘             │                         │
├────────────────────────────────────────────────┴─────────────────────────┤
│  PREVIEW LINKEDIN                                                        │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │ 👤 {company_name} · 1er                                           │  │
│  │ Personne n'y croyait. Il y a 15 ans, nous avons démarré avec...  │  │
│  │ ...voir plus                                                       │  │
│  │ 👍 💬 ↗️                                                           │  │
│  └────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
```

### Les 3 modes de source

**📝 Rédaction libre :**
1. Le user écrit son post dans le textarea
2. Il clique "Soumettre à l'IA pour optimisation"
3. L'IA analyse et propose des améliorations dans la zone d'échange
4. Échange conversationnel jusqu'à satisfaction
5. Le user valide ou sauvegarde en brouillon

**🔗 URL / Article :**
1. Le user colle une URL
2. Il clique "Générer avec l'IA"
3. L'IA scrape l'article, le résume, et génère un post LinkedIn
4. Le post apparaît dans la zone d'échange
5. Échange conversationnel pour affiner
6. Valider ou brouillon

**📄 Document :**
1. Le user upload un document (PDF, DOCX, TXT)
2. Deux options s'affichent :
   - **"Une synthèse de ce document"** → l'IA génère un post basé sur une synthèse
   - **"Surprenez-moi"** → l'IA choisit un angle original, une stat marquante, un insight clé
3. L'IA génère le post dans la zone d'échange
4. Échange conversationnel pour affiner
5. Valider ou brouillon

### Actions finales

| Action | Effet |
|--------|-------|
| **Valider** | status = 'approved', l'heure de publication est celle affichée dans le panneau droit (modifiable). Le post sera publié automatiquement par le cron. |
| **Sauvegarder en brouillon** | status = 'draft', reste dans le calendrier en jaune, peut être repris plus tard. |

---

## 7. NOUVEAUX STATUTS DE POST

```
waiting       → Créé par un programme, pas encore rédigé (gris clair)
draft         → Brouillon en cours de rédaction (jaune)
approved      → Validé, prêt à être publié à l'heure prévue (vert)
published     → Publié sur LinkedIn (bleu)
failed        → Erreur de publication (rouge)
```

Le statut `pending_review` et `scheduled` sont supprimés. Simplification :
- `waiting` = le post existe dans le programme mais n'a pas encore de contenu
- `draft` = le user a commencé à rédiger
- `approved` = validé → sera publié automatiquement à `scheduled_at`

---

## 8. WORKFLOWS N8N (MODIFIÉS)

### Workflow 01 — Rédaction IA (modifié)

Le workflow reçoit maintenant un **contexte conversationnel** :

```
POST /webhook/generate-post
Body: {
  post_id: "uuid",
  organization_id: "uuid",
  source_type: "free_writing" | "url" | "document",
  source_content: {
    // Si free_writing : { text: "le texte du user" }
    // Si url : { url: "https://..." }
    // Si document : { document_id: "uuid", mode: "synthesis" | "surprise_me" }
  },
  conversation_history: [...],   // messages précédents de l'échange
  brand_overrides: { ... }       // overrides du profil de marque pour ce post uniquement
}
```

Le prompt doit intégrer :
1. Le `brand_profile` complet (depuis Supabase)
2. Les `brand_overrides` s'ils existent (pour ce post)
3. Le `source_content` selon le type
4. La `conversation_history` pour le contexte de l'échange
5. Les documents RAG pertinents

### Workflow 09 — Création de programme (NOUVEAU)

```
POST /webhook/create-program
Body: {
  organization_id: "uuid",
  program: {
    title: "Lancement Service Consulting",
    start_date: "2026-02-10",
    end_date: "2026-03-23",
    posts_per_week: 3,
    posts: [
      { title: "Teaser mystère", week: 1, day_of_week: "monday" },
      { title: "15 ans d'expertise", week: 1, day_of_week: "wednesday" },
      ...
    ]
  }
}

Étapes :
1. INSERT program dans Supabase
2. Pour chaque post du programme :
   - Calculer scheduled_at en fonction de week, day_of_week, start_date
   - INSERT post avec status='waiting', program_id, title, scheduled_at, publication_time='09:00'
3. Retourner le programme créé + les posts
```

### Workflow 10 — Chat IA Assistant (NOUVEAU)

C'est le workflow qui gère la conversation du dashboard :

```
POST /webhook/ai-chat
Body: {
  organization_id: "uuid",
  conversation_id: "uuid" (ou null si nouvelle conversation),
  message: "Je voudrais préparer une campagne...",
}

Étapes :
1. Fetch brand_profile + programmes existants + analytics récentes
2. Fetch ou créer ai_conversation
3. Ajouter le message user dans messages
4. Construire le prompt système :
   - Tu es l'assistant de communication de {company_name}
   - Tu connais leur profil : {brand_profile}
   - Programmes en cours : {programs}
   - Performances récentes : {recent_analytics}
   - Tu aides à planifier des programmes de communication
   - Quand tu proposes un programme, structure-le en JSON dans un bloc spécial pour extraction
5. Appel Claude API avec conversation_history
6. Parser la réponse :
   - Si contient un programme structuré → extraire dans extracted_items
   - Sinon → réponse conversationnelle simple
7. Sauvegarder la réponse dans ai_conversations.messages
8. Retourner la réponse + extracted_items éventuels
```

**Format d'extraction dans le prompt :**

L'IA est instruite de formater les programmes proposés ainsi dans sa réponse :

```
[PROGRAM_PROPOSAL]
{
  "title": "Lancement Service Consulting",
  "duration_weeks": 6,
  "posts_per_week": 3,
  "posts": [
    {"title": "Teaser mystère", "week": 1, "theme": "storytelling"},
    {"title": "15 ans d'expertise", "week": 1, "theme": "expertise"},
    ...
  ]
}
[/PROGRAM_PROPOSAL]
```

Le frontend parse ce bloc et affiche un `ProgramExtractCard` avec un bouton "Valider ce programme".

---

## 9. PROMPT SYSTÈME DU CHAT ASSISTANT

```markdown
# System Prompt — Assistant de Communication PostPilot

Tu es l'assistant personnel de communication de {company_name}.

## Ton rôle
Tu accompagnes le client dans la planification et la préparation de ses campagnes de communication sur LinkedIn.

## Ce que tu sais du client
- Entreprise : {company_name} — {company_description}
- Secteur : {industry}
- Audience cible : {target_audience}
- Ton éditorial : {tone}
- Style : {writing_style_notes}

## Programmes en cours
{programs_summary}

## Performances récentes
{analytics_summary}

## Tes capacités
1. **Créer un programme de communication** : tu poses les bonnes questions (durée, fréquence, thèmes) puis tu proposes un plan structuré
2. **Donner des conseils** : quand publier, quels sujets aborder, comment améliorer l'engagement
3. **Analyser les performances** : interpréter les stats et suggérer des ajustements

## Règles
- Sois proactif : pose des questions pour mieux comprendre les besoins
- Sois concret : propose toujours des titres de posts précis, pas des thèmes vagues
- Quand tu proposes un programme validable, utilise OBLIGATOIREMENT le format :
  [PROGRAM_PROPOSAL]
  { "title": "...", "duration_weeks": N, "posts_per_week": N, "posts": [...] }
  [/PROGRAM_PROPOSAL]
- Ne propose ce format QUE quand le client est prêt à valider (après discussion)
- Parle en français
- Adapte-toi au ton du client ({tone})
```

---

## 10. PROMPT RÉDACTION DE POST (MIS À JOUR)

Le prompt de rédaction intègre maintenant les overrides :

```markdown
## Profil de marque
{brand_profile}

## Overrides pour CE post (priorité sur le profil de base)
{brand_overrides si présents, sinon "Aucun override — utiliser le profil de base"}

## Source
Type : {source_type}
{source_content}

## Conversation précédente sur ce post
{conversation_history}

## Instructions selon le type de source

[Si free_writing]
Le client a rédigé un post. Ton rôle : l'optimiser pour LinkedIn.
- Améliore le hook (première ligne)
- Suggère des reformulations plus percutantes
- Vérifie la structure (lisibilité LinkedIn avec sauts de ligne)
- Propose des hashtags
- NE RÉÉCRIS PAS tout — améliore ce qui existe

[Si url]
Un article a été extrait de {url}.
Résumé : {scraped_content}
Rédige un post LinkedIn original inspiré de cet article.
Le post doit apporter la perspective unique de {company_name}, pas un simple résumé.

[Si document + mode synthesis]
Document uploadé : {document_content}
Rédige un post LinkedIn qui synthétise les points clés de ce document.
Adapte au ton de la marque et à l'audience LinkedIn.

[Si document + mode surprise_me]
Document uploadé : {document_content}
Choisis l'angle le plus original, une stat surprenante, un insight contre-intuitif.
Rédige un post LinkedIn accrocheur basé sur cet élément.
```

---

## 11. COMPOSANTS À CRÉER / MODIFIER

### Nouveaux composants

```
lovable/src/components/
├── dashboard/
│   ├── KPICards.tsx
│   ├── AIChatPanel.tsx              ← Chat principal
│   ├── AIChatMessage.tsx            ← Message individuel
│   ├── AIChatInput.tsx              ← Input + suggestions
│   ├── ProgramExtractCard.tsx       ← Programme proposé par l'IA (validable)
│   ├── ProgramSidebar.tsx           ← Liste des programmes
│   └── ProgramCard.tsx              ← Carte programme compacte
├── programs/
│   ├── ProgramList.tsx
│   ├── ProgramDetail.tsx
│   └── ProgramTimeline.tsx          ← Timeline visuelle des posts
├── editor/
│   ├── PostEditor.tsx               ← REFONTE : layout 2 colonnes
│   ├── SourceFreeWriting.tsx        ← Mode rédaction libre
│   ├── SourceURL.tsx                ← Mode URL
│   ├── SourceDocument.tsx           ← Mode document
│   ├── AIExchangePanel.tsx          ← Zone de conversation IA (dans l'éditeur)
│   ├── BrandProfileSidebar.tsx      ← Profil de marque (lecture + override)
│   ├── LinkedInPreview.tsx          ← Preview (inchangé)
│   └── PublicationSettings.tsx      ← Date/heure de publication
```

### Pages modifiées

```
lovable/src/pages/
├── Dashboard.tsx        ← REFONTE : KPIs + Chat IA + Programmes sidebar
├── Calendar.tsx         ← MODIFIÉ : click sur date → affiche posts en dessous
├── PostEditor.tsx       ← REFONTE COMPLÈTE : 3 modes source + chat IA + profil sidebar
├── Programs.tsx         ← NOUVEAU : liste des programmes
└── ProgramDetail.tsx    ← NOUVEAU : détail d'un programme
```

---

## 12. MIGRATION SQL

```sql
-- Fichier : supabase/migrations/007_programs_and_conversations.sql

-- 1. Table programs
CREATE TABLE programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) NOT NULL,
  title text NOT NULL,
  description text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  posts_per_week int NOT NULL DEFAULT 2,
  status text NOT NULL DEFAULT 'draft',
  ai_conversation_id uuid,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp DEFAULT NOW(),
  updated_at timestamp DEFAULT NOW()
);

ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "programs_org_access" ON programs
  USING (organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  ));

-- 2. Table ai_conversations
CREATE TABLE ai_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) NOT NULL,
  context text NOT NULL DEFAULT 'program_planning',
  title text,
  messages jsonb NOT NULL DEFAULT '[]',
  extracted_items jsonb DEFAULT '[]',
  is_active boolean DEFAULT true,
  created_at timestamp DEFAULT NOW(),
  updated_at timestamp DEFAULT NOW()
);

ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "conversations_org_access" ON ai_conversations
  USING (organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  ));

-- 3. Modifier posts
ALTER TABLE posts ADD COLUMN IF NOT EXISTS program_id uuid REFERENCES programs(id);
ALTER TABLE posts ADD COLUMN IF NOT EXISTS position_in_program int;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS publication_time time DEFAULT '09:00';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS ai_conversation_id uuid REFERENCES ai_conversations(id);

-- 4. Ajouter le statut 'waiting'
-- (pas de contrainte CHECK, c'est géré côté app)

-- 5. FK pour ai_conversations dans programs
ALTER TABLE programs ADD CONSTRAINT fk_program_conversation
  FOREIGN KEY (ai_conversation_id) REFERENCES ai_conversations(id);

-- 6. Index
CREATE INDEX idx_programs_org ON programs(organization_id);
CREATE INDEX idx_programs_status ON programs(status);
CREATE INDEX idx_posts_program ON posts(program_id);
CREATE INDEX idx_conversations_org ON ai_conversations(organization_id);
```

---

## 13. INSTRUCTIONS POUR CLAUDE CODE

Pour implémenter cette refonte, suis cet ordre :

### Étape 1 : Migration SQL
Crée et exécute `supabase/migrations/007_programs_and_conversations.sql`

### Étape 2 : Nouveaux workflows n8n
- `09-creation-programme.json` — webhook qui crée un programme + ses posts
- `10-chat-ia-assistant.json` — webhook qui gère la conversation IA du dashboard

### Étape 3 : Prompt files
- Créer `prompts/assistant-communication.md` — prompt système du chat
- Modifier `prompts/redaction-linkedin.md` — ajouter les overrides et les 3 modes de source

### Étape 4 : Nouveaux composants frontend
En suivant l'ordre des sections 3 à 6 ci-dessus.

### Étape 5 : Modifier le calendrier
Click sur date → affiche les posts prévus en dessous.

### Étape 6 : Refonte de l'éditeur de post
3 modes source + profil de marque sidebar + zone d'échange IA.
