-- Migration 017: Boîte à idées — champs source URL + fichier
-- Permet d'associer une URL ou un fichier (document/image) à une idée.

ALTER TABLE ideas
  ADD COLUMN IF NOT EXISTS source_url       text,
  ADD COLUMN IF NOT EXISTS source_file_url  text,
  ADD COLUMN IF NOT EXISTS source_file_name text,
  ADD COLUMN IF NOT EXISTS source_file_type text;
