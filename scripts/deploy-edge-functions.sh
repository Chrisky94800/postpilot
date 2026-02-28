#!/usr/bin/env bash
# PostPilot — Deploy Edge Functions to Supabase Cloud
#
# Ce script déploie toutes les Edge Functions.
# Les fonctions marquées --no-verify-jwt ne requièrent pas de JWT utilisateur :
#   - linkedin-oauth-callback : redirect navigateur depuis LinkedIn
#   - webhook-from-n8n        : appelé par n8n (X-N8N-Api-Key, pas de JWT user)
#   - send-notification       : appelé par n8n (X-N8N-Api-Key, pas de JWT user)
#
# PRÉREQUIS :
#   1. npx supabase login   (ouvre le navigateur pour s'authentifier)
#   2. Puis lancer ce script

set -euo pipefail

PROJECT_REF="tplgbskcvimemwtwpxyk"
FUNCTIONS_DIR="$(dirname "$0")/../supabase/functions"

echo "=== PostPilot — Déploiement Edge Functions ==="
echo "Projet : $PROJECT_REF"
echo ""

# ── Fonctions qui nécessitent verify_jwt = false ──────────────────────────────

NO_JWT_FUNCTIONS=(
  "linkedin-oauth-callback"
  "webhook-from-n8n"
  "send-notification"
)

for fn in "${NO_JWT_FUNCTIONS[@]}"; do
  echo "Deploying $fn (--no-verify-jwt)..."
  npx supabase functions deploy "$fn" \
    --project-ref "$PROJECT_REF" \
    --no-verify-jwt
  echo "  ✓ $fn déployé"
done

# ── Fonctions standard (JWT obligatoire) ─────────────────────────────────────

JWT_FUNCTIONS=(
  "generate-post"
  "revise-post"
  "scrape-url"
  "brainstorm-post"
  "ai-chat"
  "create-program"
  "linkedin-oauth-url"
  "linkedin-sync-contacts"
  "generate-embedding"
)

for fn in "${JWT_FUNCTIONS[@]}"; do
  echo "Deploying $fn..."
  npx supabase functions deploy "$fn" \
    --project-ref "$PROJECT_REF"
  echo "  ✓ $fn déployé"
done

echo ""
echo "=== Déploiement terminé ==="
echo ""
echo "Fonctions sans JWT (verify_jwt = false) :"
for fn in "${NO_JWT_FUNCTIONS[@]}"; do
  echo "  - $fn"
done
echo ""
echo "Vérification : teste le callback OAuth LinkedIn en te rendant dans Settings → Connecter LinkedIn"
