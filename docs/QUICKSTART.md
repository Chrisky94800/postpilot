# 🚀 PostPilot — Guide de démarrage rapide

## Ce que tu as reçu

| Fichier | Rôle |
|---------|------|
| `CLAUDE.md` | Instructions complètes pour Claude Code (le "cerveau" du projet) |
| `init-postpilot.sh` | Script bash qui crée toute l'arborescence du projet |
| `plan-execution.md` | Plan d'exécution détaillé (référence technique) |
| `postpilot-analyse-couts.xlsx` | Analyse financière avec 3 onglets |

## Comment démarrer

### Étape 1 : Initialiser le projet

```bash
# Copier les fichiers reçus quelque part de temporaire
# Puis exécuter le script d'init :
chmod +x init-postpilot.sh
./init-postpilot.sh
```

Ce script crée :
- `/Users/christopher/postpilot/` avec toute l'arborescence
- Tous les dossiers (supabase, lovable, n8n, prompts, docs, scripts)
- Les fichiers de base (.gitignore, README, .env.example, prompts, docs)
- Un repo Git initialisé avec un premier commit

### Étape 2 : Placer le CLAUDE.md

```bash
# Le script crée le dossier, maintenant copier le CLAUDE.md dedans
cp CLAUDE.md ~/postpilot/CLAUDE.md
```

### Étape 3 : Lancer Claude Code

```bash
cd ~/postpilot
claude
```

Claude Code va :
1. **Lire ton CLAUDE.md global** (`/Users/christopher/CLAUDE.md`) → tes conventions n8n, MCP, etc.
2. **Lire le CLAUDE.md local** (`/Users/christopher/postpilot/CLAUDE.md`) → les spécifications PostPilot
3. **Avoir tout le contexte** pour travailler sur le projet

### Étape 4 : Commencer Sprint 0

Dis à Claude Code :

> "Commence le Sprint 0. Crée le fichier SQL `supabase/migrations/001_initial_schema.sql` avec toutes les tables définies dans le CLAUDE.md. Active pgvector. Puis crée `002_rls_policies.sql` avec les policies RLS multi-tenant."

## Comment la hiérarchie CLAUDE.md fonctionne

```
/Users/christopher/
├── CLAUDE.md                        ← GLOBAL : conventions n8n, MCP, règles générales
│                                       (lu automatiquement par Claude Code)
└── postpilot/
    ├── CLAUDE.md                    ← LOCAL : spécifications PostPilot
    │                                   (lu automatiquement quand tu es dans ce dossier)
    └── ...
```

Quand tu lances `claude` depuis `~/postpilot/`, il lit **les deux** CLAUDE.md :
- Le global lui donne tes conventions n8n, tes skills MCP, ton style de travail
- Le local lui donne l'architecture PostPilot, les tables, les conventions spécifiques

**Il n'y a rien à configurer** — Claude Code fait la fusion automatiquement.

## Prompts clés pour chaque Sprint

### Sprint 0 — Setup
```
"Crée 001_initial_schema.sql avec toutes les tables du CLAUDE.md. 
Inclus les extensions uuid-ossp et pgvector."

"Crée 002_rls_policies.sql. Pattern : chaque table filtrée par 
organization_id via organization_members."

"Crée 003_pgvector_setup.sql avec l'index HNSW sur documents.embedding."

"Scaffold le projet Lovable avec le layout principal : Sidebar, Navbar, 
routing vers les 9 pages listées dans le CLAUDE.md."
```

### Sprint 1 — Onboarding
```
"Crée le composant Onboarding.tsx avec les 4 étapes définies dans le 
CLAUDE.md : StepCompany, StepStyle, StepKeywords, StepExamples. 
Utilise un stepper avec état local. À la fin, insert dans brand_profiles 
et documents via Supabase."
```

### Sprint 2 — Calendrier & Éditeur
```
"Crée le calendrier éditorial. Vue mensuelle avec grille, code couleur 
par statut, click pour créer/ouvrir un post. Utilise les données de la 
table posts via React Query."

"Crée le workflow n8n 01-redaction-ia.json. Utilise le prompt depuis 
prompts/redaction-linkedin.md. Étapes : webhook trigger → fetch 
brand_profile → RAG pgvector → build prompt → Claude API → save draft 
→ notification."
```

### Sprint 3 — Publication
```
"Crée le workflow n8n 03-publication-programmee.json. Cron 5min, query 
les posts approved et dus, publie via Ayrshare API, update le statut, 
notifie le client."

"Implémente les notifications in-app avec Supabase Realtime. 
Composant NotificationBell dans la Navbar avec badge compteur. 
Subscribe au channel notifications filtré par organization_id."
```

### Sprint 4 — Intelligence
```
"Crée l'Edge Function generate-embedding. Reçoit du texte, chunk en 
morceaux de 500 tokens, appelle l'API embeddings OpenAI, stocke les 
vecteurs dans la table documents."

"Crée le Dashboard Analytics avec les métriques définies dans le 
CLAUDE.md : posts publiés, engagement moyen, meilleur post, graphique 
d'évolution. Utilise Recharts."
```

## Tips pour être efficace avec Claude Code

1. **Un sprint à la fois** — ne pas demander tout d'un coup
2. **SQL d'abord** — toujours partir des migrations Supabase
3. **Tester au fur et à mesure** — vérifier chaque table, chaque RLS, chaque webhook
4. **Committer après chaque feature** — Claude Code peut le faire pour toi
5. **Référencer le CLAUDE.md** — si Claude dérive, rappelle-lui de relire le CLAUDE.md
