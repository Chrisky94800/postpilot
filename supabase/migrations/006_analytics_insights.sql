-- ============================================================
-- PostPilot — Migration 006 : Table analytics_insights
-- Stocke les insights IA générés par le workflow 09 (hebdo)
-- ============================================================

CREATE TABLE analytics_insights (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id  uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    insights         text[] NOT NULL,
    period_days      int NOT NULL DEFAULT 30,
    generated_at     timestamp with time zone NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_analytics_insights_org_id
    ON analytics_insights (organization_id);

CREATE INDEX idx_analytics_insights_generated_at
    ON analytics_insights (generated_at DESC);

-- RLS : lecture seule pour les membres de l'organisation
ALTER TABLE analytics_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY analytics_insights_select ON analytics_insights
    FOR SELECT TO authenticated
    USING (
        organization_id IN (
            SELECT organization_id
            FROM organization_members
            WHERE user_id = auth.uid()
        )
    );
