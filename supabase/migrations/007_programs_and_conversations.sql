-- PostPilot — Migration 007 : Programmes de communication & Conversations IA
-- Sprint V2 : Refonte UX assistant conversationnel

-- ─── 1. ai_conversations (créée avant programs car programs y fait référence) ──

CREATE TABLE ai_conversations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) NOT NULL,
  context         text NOT NULL DEFAULT 'program_planning', -- 'program_planning' | 'post_editing'
  title           text,
  messages        jsonb NOT NULL DEFAULT '[]', -- [{role: 'user'|'assistant', content: '...', timestamp: '...'}]
  extracted_items jsonb DEFAULT '[]',           -- [{type: 'program', data: {...}, validated: bool}]
  is_active       boolean DEFAULT true,
  created_at      timestamp DEFAULT NOW(),
  updated_at      timestamp DEFAULT NOW()
);

ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conversations_org_access" ON ai_conversations
  USING (organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  ));

CREATE INDEX idx_conversations_org ON ai_conversations(organization_id);

-- ─── 2. programs ──────────────────────────────────────────────────────────────

CREATE TABLE programs (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id    uuid REFERENCES organizations(id) NOT NULL,
  title              text NOT NULL,
  description        text,
  start_date         date NOT NULL,
  end_date           date NOT NULL,
  posts_per_week     int NOT NULL DEFAULT 2,
  status             text NOT NULL DEFAULT 'draft', -- 'draft' | 'active' | 'paused' | 'completed'
  ai_conversation_id uuid REFERENCES ai_conversations(id),
  created_by         uuid REFERENCES auth.users(id),
  created_at         timestamp DEFAULT NOW(),
  updated_at         timestamp DEFAULT NOW()
);

ALTER TABLE programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "programs_org_access" ON programs
  USING (organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  ));

CREATE INDEX idx_programs_org    ON programs(organization_id);
CREATE INDEX idx_programs_status ON programs(status);

-- ─── 3. Modifier la table posts ───────────────────────────────────────────────

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS program_id            uuid REFERENCES programs(id),
  ADD COLUMN IF NOT EXISTS position_in_program   int,
  ADD COLUMN IF NOT EXISTS publication_time      time DEFAULT '09:00',
  ADD COLUMN IF NOT EXISTS ai_conversation_id    uuid REFERENCES ai_conversations(id);

CREATE INDEX idx_posts_program ON posts(program_id);

-- ─── 4. Statut 'waiting' ──────────────────────────────────────────────────────
-- Pas de contrainte CHECK : géré côté application.
-- Valeurs : waiting | draft | pending_review | approved | scheduled | published | failed
-- V2 simplifie : waiting | draft | approved | published | failed
