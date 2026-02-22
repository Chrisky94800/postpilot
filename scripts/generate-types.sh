#!/bin/bash
# Génère les types TypeScript depuis le schéma Supabase
set -e
echo "📝 Génération des types TypeScript..."
supabase gen types typescript --project-id "$SUPABASE_PROJECT_ID" > lovable/src/types/database.ts
echo "✅ Types générés dans lovable/src/types/database.ts"
