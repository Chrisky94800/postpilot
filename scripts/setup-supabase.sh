#!/bin/bash
# Exécute toutes les migrations Supabase dans l'ordre
set -e
echo "🗄️  Application des migrations Supabase..."
for migration in supabase/migrations/*.sql; do
  echo "  → Applying $migration"
  supabase db push --db-url "$SUPABASE_DB_URL" < "$migration"
done
echo "✅ Migrations appliquées avec succès"
