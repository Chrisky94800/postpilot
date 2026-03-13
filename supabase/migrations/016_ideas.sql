-- Migration 016: Boîte à idées
-- Table pour stocker les idées de posts générées par le chat IA ou manuellement.

CREATE TABLE IF NOT EXISTS ideas (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title           text NOT NULL,
  description     text,
  source          text NOT NULL DEFAULT 'ai_chat',   -- 'ai_chat' | 'manual'
  status          text NOT NULL DEFAULT 'saved',     -- 'saved' | 'converted'
  post_id         uuid REFERENCES posts(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz
);

CREATE INDEX IF NOT EXISTS ideas_organization_id_idx ON ideas (organization_id);
CREATE INDEX IF NOT EXISTS ideas_status_idx ON ideas (status) WHERE deleted_at IS NULL;

ALTER TABLE ideas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ideas: members can select"
  ON ideas FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "ideas: members can insert"
  ON ideas FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "ideas: members can update"
  ON ideas FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );
