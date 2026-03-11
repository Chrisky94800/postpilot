-- Migration 012 — LinkedIn Company Pages
-- Ajoute :
--   platforms.linkedin_pages  → pages entreprise LinkedIn auxquelles l'user a accès admin
--   posts.posting_as          → depuis quel compte poster (personne ou entreprise)

ALTER TABLE platforms
  ADD COLUMN IF NOT EXISTS linkedin_pages jsonb DEFAULT '[]';

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS posting_as jsonb;

COMMENT ON COLUMN platforms.linkedin_pages IS
  'Liste des pages entreprise LinkedIn (admin). Format : [{ "urn": "urn:li:organization:12345", "id": "12345", "name": "Rocket Solution" }]';

COMMENT ON COLUMN posts.posting_as IS
  'Compte LinkedIn depuis lequel publier. Format : { "type": "person"|"organization", "urn": "urn:li:...", "name": "..." }. Null = compte personnel par défaut.';
