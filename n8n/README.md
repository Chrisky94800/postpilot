# PostPilot — Workflows n8n

## Installation n8n (local)

```bash
# Option A : npx (sans installation globale)
npx n8n

# Option B : installation globale
npm install -g n8n
n8n start
```

Ouvrir http://localhost:5678 et créer un compte admin.

---

## Variables d'environnement n8n

Dans n8n : **Settings → Environment Variables**

| Variable | Valeur |
|----------|--------|
| `SUPABASE_URL` | `https://<ref>.supabase.co` (même que `VITE_SUPABASE_URL`) |
| `SUPABASE_ANON_KEY` | Clé anon Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé service role (Supabase Dashboard → Settings → API) |
| `ANTHROPIC_API_KEY` | Clé API Anthropic |
| `N8N_API_KEY` | Clé partagée avec le frontend (même valeur que `VITE_N8N_API_KEY` dans `.env.local`) |

> `SUPABASE_SERVICE_ROLE_KEY` a accès complet à la base — ne jamais l'exposer côté frontend.

---

## Credential Header Auth (sécurité webhooks)

1. **Credentials → Add Credential → Header Auth**
2. Nom : `PostPilot API Key`
3. Name : `X-API-Key`
4. Value : valeur de `N8N_API_KEY`

---

## Import des workflows

1. **Workflows → Import from file**
2. Importer dans l'ordre :
   - `workflows/01-redaction-ia.json`
   - `workflows/02-revision-ia.json`
   - `workflows/07-scraping-url.json`
3. Pour chaque workflow : vérifier le credential webhook → **Activate**

---

## Liste des workflows

| # | Fichier | Trigger | Statut |
|---|---------|---------|--------|
| 01 | `01-redaction-ia.json` | Webhook `POST /webhook/generate-post` | ✅ Sprint 2 |
| 02 | `02-revision-ia.json` | Webhook `POST /webhook/revise-post` | ✅ Sprint 2 |
| 07 | `07-scraping-url.json` | Webhook `POST /webhook/scrape-url` | ✅ Sprint 2 |
| 03 | `03-publication-programmee.json` | Cron (5 min) | Sprint 3 |
| 04 | `04-collecte-analytics.json` | Cron (quotidien) | Sprint 4 |
| 05 | `05-veille-rss.json` | Cron (6h) | Sprint 4 |
| 06 | `06-evenements-calendrier.json` | Cron (quotidien) | Sprint 4 |
| 08 | `08-refresh-linkedin-tokens.json` | Cron (quotidien) | Sprint 3 |

---

## Workflow 01 — Rédaction IA

**Payload** : `{ post_id, organization_id }`

**Flux** :
1. Fetch post depuis Supabase (source_type, source_url, content)
2. Fetch brand_profile depuis Supabase
3. Si `source_type === 'url'` → appel Edge Function `scrape-url`
4. Construction du prompt (system + user) avec toutes les variables du brand_profile
5. Appel Claude API (`claude-sonnet-4-6`)
6. POST webhook-from-n8n → action `post_generated` → post passe en `pending_review`
7. Réponse : `{ content, version_id }`

---

## Workflow 02 — Révision IA

**Payload** : `{ post_id, feedback, scope }`

**Scopes disponibles** :
- `full` — révision complète
- `opening` — accroche uniquement
- `closing` — conclusion/CTA uniquement
- `tone` — ton uniquement
- `length` — longueur uniquement
- `keywords` — intégration mots-clés uniquement

**Flux** : Fetch post → Fetch brand_profile → Build prompt avec scope → Claude API → webhook-from-n8n (action `post_revised`)

---

## Workflow 07 — Scraping URL

**Payload** : `{ url }`

Proxy simple vers la Supabase Edge Function `scrape-url` (gère SSRF, timeout 10s, parsing HTML).

**Réponse** : `{ title, summary, content }`

---

## Notes importantes

⚠️ Les tokens OAuth LinkedIn **PAR CLIENT** sont dans Supabase (`platforms.oauth_tokens`), **PAS** dans les credentials n8n.
Les credentials n8n ne contiennent que le Client ID + Client Secret de la LinkedIn App PostPilot (communs à tous les clients).

---

## Vérification end-to-end

```bash
# Terminal 1 — Frontend
cd lovable && npm run dev

# Terminal 2 — n8n
npx n8n
```

1. Créer un post → **Générer avec l'IA** → statut `pending_review` avec contenu
2. Feedback → **Réviser** → nouvelle version dans l'historique
3. Source URL → coller une URL → contenu scrapé utilisé pour la génération
