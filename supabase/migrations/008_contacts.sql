-- PostPilot — Migration 008 : Contacts fréquents (mentions LinkedIn)
-- Table pour stocker les contacts/entreprises que l'utilisateur mentionne souvent.
-- Phase 1 : stockage nom + URL LinkedIn (texte @[Nom])
-- Phase 2 : résolution URN LinkedIn pour les vraies annotations API

CREATE TABLE IF NOT EXISTS contacts (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  name             text NOT NULL,
  linkedin_url     text,
  linkedin_urn     text,            -- urn:li:person:XXXX ou urn:li:organization:XXXX (Phase 2)
  type             text NOT NULL DEFAULT 'person',  -- 'person' | 'company'
  created_by       uuid REFERENCES auth.users(id),
  created_at       timestamp WITH TIME ZONE DEFAULT NOW(),
  updated_at       timestamp WITH TIME ZONE DEFAULT NOW()
);

-- Index
CREATE INDEX idx_contacts_org ON contacts(organization_id);

-- RLS
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contacts_org_access" ON contacts
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );
