# PostPilot 🤖✍️

Agent IA autonome de publication LinkedIn pour TPE.

## Stack
- **Frontend** : Lovable (React + Tailwind + Supabase SDK)
- **Backend** : Supabase (PostgreSQL + Auth + RLS + pgvector + Edge Functions)
- **Orchestration** : n8n (publication LinkedIn via node natif OAuth2)
- **LLM** : Claude API (Sonnet)

## Setup

```bash
# 1. Configurer Supabase
cd supabase && supabase init && supabase db push

# 2. Configurer les variables d'environnement
cp .env.example .env.local

# 3. Créer la LinkedIn App sur developer.linkedin.com
# Voir docs/linkedin-oauth-setup.md

# 4. Lancer le développement
# → Lovable : via l'interface Lovable
# → n8n : importer les workflows depuis n8n/workflows/
```

## Structure
Voir `CLAUDE.md` pour la documentation complète du projet.
