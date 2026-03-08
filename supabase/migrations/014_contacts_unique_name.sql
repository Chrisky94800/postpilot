-- Migration 014 — Contrainte unique sur (organization_id, name) pour la table contacts
-- Permet le upsert sans doublons lors de l'import CSV LinkedIn

ALTER TABLE contacts
  ADD CONSTRAINT contacts_org_name_unique UNIQUE (organization_id, name);

-- Index composé pour les recherches de mentions (autocomplete)
CREATE INDEX IF NOT EXISTS idx_contacts_org_name ON contacts (organization_id, lower(name));
