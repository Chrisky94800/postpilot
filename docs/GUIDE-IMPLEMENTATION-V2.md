# 🔧 PostPilot V2 — Guide d'implémentation pas à pas

Tu as déjà les Sprints 0-4 en place. Voici comment implémenter la refonte.

---

## Étape 1 : Mettre à jour le CLAUDE.md (2 minutes)

Dans VS Code, ouvre `~/postpilot/CLAUDE.md`.

Ajoute ce bloc à la fin du fichier (avant les notes pour Claude Code) :

```
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
```

Puis copie le fichier `SPEC-V2-REFONTE-UX.md` dans ton projet :

```bash
cp ~/Downloads/SPEC-V2-REFONTE-UX.md ~/postpilot/docs/
```

---

## Étape 2 : Migration SQL (5 minutes)

Ouvre Claude Code dans VS Code. Prompt :

```
Lis docs/SPEC-V2-REFONTE-UX.md section 12 "MIGRATION SQL".

Crée le fichier supabase/migrations/007_programs_and_conversations.sql exactement comme spécifié :
- Table programs avec RLS
- Table ai_conversations avec RLS
- ALTER TABLE posts : ajouter program_id, position_in_program, publication_time, ai_conversation_id
- Index sur les nouvelles colonnes
```

Une fois le fichier généré :
1. Ouvre Supabase → SQL Editor
2. Copie-colle le contenu → Run ▶️
3. Vérifie dans Table Editor : `programs` et `ai_conversations` apparaissent

---

## Étape 3 : Nouveau prompt IA (5 minutes)

Dans Claude Code :

```
Lis docs/SPEC-V2-REFONTE-UX.md section 9 "PROMPT SYSTÈME DU CHAT ASSISTANT".

Crée le fichier prompts/assistant-communication.md avec le prompt complet.

Puis mets à jour prompts/redaction-linkedin.md selon la section 10 :
- Ajouter la gestion des brand_overrides
- Ajouter les 3 instructions selon le source_type (free_writing, url, document avec mode synthesis/surprise_me)
- Ajouter l'intégration de la conversation_history
```

---

## Étape 4 : Nouveaux workflows n8n (15 minutes)

### 4a — Workflow Chat IA

```
Lis docs/SPEC-V2-REFONTE-UX.md section 8, workflow 10.

Crée n8n/workflows/10-chat-ia-assistant.json :

Trigger : Webhook POST /webhook/ai-chat
Body attendu : { organization_id, conversation_id (nullable), message }

Étapes :
1. Fetch brand_profile depuis Supabase
2. Fetch programmes existants (SELECT * FROM programs WHERE organization_id AND status IN ('active','draft'))
3. Fetch analytics récentes (top 3 posts par engagement)
4. Si conversation_id est null → INSERT ai_conversations → récupérer l'ID
5. Sinon → SELECT messages FROM ai_conversations WHERE id = conversation_id
6. Ajouter le message user dans le tableau messages
7. Construire le prompt avec le template prompts/assistant-communication.md
8. Appel Claude API avec tout l'historique de messages
9. Parser la réponse : chercher [PROGRAM_PROPOSAL]...[/PROGRAM_PROPOSAL]
   - Si trouvé → extraire le JSON, l'ajouter dans extracted_items
10. Ajouter la réponse assistant dans messages
11. UPDATE ai_conversations SET messages = nouveau_messages, extracted_items = nouveau_items
12. Respond : { response: "texte", program_proposal: {...} ou null, conversation_id }
```

### 4b — Workflow Création Programme

```
Lis docs/SPEC-V2-REFONTE-UX.md section 8, workflow 09.

Crée n8n/workflows/09-creation-programme.json :

Trigger : Webhook POST /webhook/create-program
Body : { organization_id, conversation_id, program: { title, start_date, end_date, posts_per_week, posts: [{title, week, day_of_week}] } }

Étapes :
1. INSERT INTO programs (organization_id, title, start_date, end_date, posts_per_week, status='active', ai_conversation_id)
2. Pour chaque post dans program.posts :
   - Calculer scheduled_at :
     start_date + ((week - 1) * 7) + offset_jour (monday=0, tuesday=1, wednesday=2, thursday=3, friday=4)
   - INSERT INTO posts (organization_id, program_id, title, status='waiting', scheduled_at, publication_time='09:00', position_in_program)
3. Mettre à jour ai_conversations.extracted_items → marquer le programme comme validated=true
4. Créer notification "Programme '{title}' créé avec {nb} posts"
5. Respond : { success: true, program_id, posts_created: nb }
```

### 4c — Modifier le workflow 01 (rédaction)

```
Modifie n8n/workflows/01-redaction-ia.json :

Le webhook reçoit maintenant des champs supplémentaires :
- source_type : 'free_writing' | 'url' | 'document'
- source_content : { text } ou { url } ou { document_id, mode }
- conversation_history : [...] messages précédents
- brand_overrides : { ... } overrides optionnels

Dans le node de construction du prompt :
- Fetch brand_profile
- Si brand_overrides non vide → fusionner (overrides prennent priorité)
- Charger le bon template selon source_type
- Inclure la conversation_history
- Tout le reste du workflow reste identique (RAG, Claude API, save, notify)
```

Importe les nouveaux workflows dans n8n (Import from File).

---

## Étape 5 : Refonte Dashboard (20 minutes)

```
Lis docs/SPEC-V2-REFONTE-UX.md section 3 "PAGE DASHBOARD".

Refonte complète de lovable/src/pages/Dashboard.tsx :

Layout : 
- Haut : 4 KPICards (publiés ce mois, en attente, programmés, post max/mois)
- Bas gauche (60%) : AIChatPanel
- Bas droite (40%) : ProgramSidebar

Crée les composants :

1. lovable/src/components/dashboard/KPICards.tsx
   - 4 cartes avec données depuis Supabase (COUNT posts par statut)

2. lovable/src/components/dashboard/AIChatPanel.tsx
   - Zone de messages scrollable (AIChatMessage pour chaque message)
   - Message d'accueil au premier chargement
   - 3 boutons de suggestion : "Créer un programme", "Préparer un post", "Analyser mes perfs"
   - Input en bas avec bouton envoyer
   - Appel webhook /webhook/ai-chat à chaque message
   - Quand la réponse contient program_proposal → afficher ProgramExtractCard

3. lovable/src/components/dashboard/AIChatMessage.tsx
   - Bulle user (alignée à droite, fond bleu)
   - Bulle assistant (alignée à gauche, fond gris clair)
   - Support du markdown dans les messages assistant

4. lovable/src/components/dashboard/AIChatInput.tsx
   - Textarea auto-resize
   - Bouton envoyer (icône flèche)
   - Enter pour envoyer, Shift+Enter pour retour à la ligne

5. lovable/src/components/dashboard/ProgramExtractCard.tsx
   - Affiche le programme proposé par l'IA : titre, durée, posts/semaine, liste des posts
   - Bouton "✅ Valider ce programme" → appelle /webhook/create-program
   - Bouton "✏️ Modifier" → renvoie un message dans le chat "Je voudrais modifier..."
   - Quand validé : la carte passe en mode "Programme créé ✅" (non cliquable)

6. lovable/src/components/dashboard/ProgramSidebar.tsx
   - Titre "Mes programmes"
   - Liste de ProgramCards
   - Bouton "+ Nouveau programme" (focus le chat et écrit "Je voudrais créer un nouveau programme")
   - Données : SELECT * FROM programs WHERE organization_id ORDER BY created_at DESC

7. lovable/src/components/dashboard/ProgramCard.tsx
   - Titre, durée, posts/sem, barre de progression (publiés / total)
   - Badge statut (actif/pause/terminé)
   - Click → navigate /programs/:id
```

---

## Étape 6 : Pages Programmes (10 minutes)

```
Lis docs/SPEC-V2-REFONTE-UX.md section 4.

Crée lovable/src/pages/Programs.tsx :
- Liste des programmes avec ProgramList
- Chaque programme : titre, durée, progression, badge statut
- Click → /programs/:id

Crée lovable/src/pages/ProgramDetail.tsx :
- Titre, dates, posts/semaine
- Timeline visuelle par semaine
- Chaque post : carte avec titre, date, statut (icône couleur)
- Click sur un post → /posts/:id
- Actions : Pause, Reprendre, Supprimer

Ajoute les routes dans App.tsx :
- /programs → Programs.tsx
- /programs/:id → ProgramDetail.tsx
Ajoute "Programmes" dans la Sidebar.
```

---

## Étape 7 : Modifier le Calendrier (10 minutes)

```
Lis docs/SPEC-V2-REFONTE-UX.md section 5.

Modifie lovable/src/pages/Calendar.tsx :

Changement principal : quand on clique sur une date, afficher en dessous la liste des posts prévus ce jour-là.

Layout :
- Haut : la grille calendrier (existante)
- Bas : panneau "Posts du [date sélectionnée]"
  - Liste des posts ce jour-là (depuis la table posts WHERE DATE(scheduled_at) = selected_date)
  - Pour chaque post : titre, heure, programme associé, statut (badge couleur)
  - Bouton "Rédiger ce post →" (si status=waiting ou draft) → /posts/:id
  - Bouton "Voir le post →" (si status=approved ou published) → /posts/:id
  - Bouton "+ Ajouter un post hors programme" → crée un post indépendant

Ajoute les pastilles de couleur dans les cellules du calendrier :
- Gris : waiting
- Jaune : draft
- Vert : approved
- Bleu : published
- Rouge : failed
```

---

## Étape 8 : Refonte Éditeur de Post (20 minutes)

```
Lis docs/SPEC-V2-REFONTE-UX.md section 6 "ÉDITEUR DE POST".

Refonte complète de lovable/src/pages/PostEditor.tsx :

Layout 2 colonnes :
- Gauche (65%) : Source + Zone d'échange IA + Preview LinkedIn
- Droite (35%) : Profil de marque sidebar + Publication settings

Crée les composants :

1. lovable/src/components/editor/SourceFreeWriting.tsx
   - Textarea pour écrire le post
   - Bouton "🤖 Soumettre à l'IA pour optimisation"
   - L'IA ne remplace pas le texte, elle propose dans la zone d'échange

2. lovable/src/components/editor/SourceURL.tsx
   - Input URL + bouton "Générer avec l'IA"
   - Indicateur de chargement pendant le scraping
   - Le résultat apparaît dans la zone d'échange

3. lovable/src/components/editor/SourceDocument.tsx
   - Zone d'upload (drag & drop, PDF/DOCX/TXT, max 10MB)
   - Après upload, 2 boutons radio :
     - "📋 Une synthèse de ce document"
     - "✨ Surprenez-moi (angle original)"
   - Bouton "Générer avec l'IA"

4. lovable/src/components/editor/AIExchangePanel.tsx
   - Zone de messages scrollable (comme le chat du dashboard mais dans l'éditeur)
   - La dernière proposition de l'IA est le contenu "actuel" du post
   - Le user peut répondre pour affiner
   - Chaque réponse IA met à jour la preview LinkedIn

5. lovable/src/components/editor/BrandProfileSidebar.tsx
   - Affiche TOUS les champs du brand_profile en lecture seule
   - Chaque champ a un petit bouton ✏️ pour l'éditer POUR CE POST UNIQUEMENT
   - Quand un champ est modifié, il passe en surbrillance (bleu) avec mention "modifié pour ce post"
   - Les modifications sont stockées dans brand_overrides (local state, envoyé au webhook)
   - Encadré d'avertissement : "⚠️ Les modifications ici s'appliquent uniquement à ce post."

6. lovable/src/components/editor/PublicationSettings.tsx
   - Date de publication (pré-remplie depuis scheduled_at du post)
   - Heure de publication (pré-remplie depuis publication_time, par défaut 09:00)
   - L'heure est modifiable via un time picker
   - Programme associé (lecture seule, avec lien)

7. lovable/src/components/editor/LinkedInPreview.tsx
   - Inchangé sur le fond, mais se met à jour en temps réel
   - Source : la dernière proposition IA de la zone d'échange

Actions en haut de page :
- Bouton "Sauvegarder en brouillon" → status='draft'
- Bouton "✅ Valider" → status='approved', scheduled_at = date+heure choisies
  - Affiche un mini-résumé avant validation : "Ce post sera publié le [date] à [heure]. Confirmer ?"
```

---

## Étape 9 : Mettre à jour lib/api.ts (5 minutes)

```
Ajoute les nouvelles fonctions dans lovable/src/lib/api.ts :

- aiChat(organizationId, conversationId, message) → POST /webhook/ai-chat
- createProgram(organizationId, conversationId, program) → POST /webhook/create-program
- Les fonctions existantes (generatePost, revisePost...) sont modifiées pour accepter
  les nouveaux paramètres (source_type, conversation_history, brand_overrides)
```

---

## Étape 10 : Tester le flux complet

### Test 1 : Création de programme via chat
1. Dashboard → chat IA → "Je veux préparer une campagne de 4 semaines sur le thème X"
2. L'IA pose des questions → tu réponds → l'IA propose un programme
3. ProgramExtractCard s'affiche → clique "Valider"
4. Vérifie : Supabase → table programs (1 row) + table posts (N rows en status='waiting')
5. Calendrier → les posts apparaissent aux bonnes dates en gris

### Test 2 : Rédaction d'un post "waiting"
1. Calendrier → clique sur une date avec un post waiting → "Rédiger ce post"
2. Éditeur → choisis "URL" → colle un lien → "Générer avec l'IA"
3. L'IA génère un post → échange conversationnel → affine
4. Profil de marque visible à droite → modifie le ton pour ce post
5. Preview LinkedIn se met à jour en temps réel
6. Clique "Valider" → le post passe en approved → sera publié à l'heure prévue

### Test 3 : Rédaction libre
1. Éditeur → mode "Rédaction libre" → écris un post
2. "Soumettre à l'IA" → l'IA propose des optimisations
3. Échange → valide

---

## Résumé de l'ordre d'exécution

```
1. Copier SPEC-V2-REFONTE-UX.md dans ~/postpilot/docs/
2. Mettre à jour CLAUDE.md
3. Migration SQL (007)                          → Supabase SQL Editor
4. Nouveau prompt (assistant-communication.md)  → fichier local
5. Workflows n8n (09, 10, modifier 01)          → Import dans n8n
6. Dashboard refonte                            → Lovable
7. Pages Programmes                             → Lovable
8. Calendrier modifié                           → Lovable
9. Éditeur de post refonte                      → Lovable
10. api.ts mis à jour                           → Lovable
11. TESTER
12. git commit -m "feat(v2): conversational AI assistant, programs, post editor refonte"
```
