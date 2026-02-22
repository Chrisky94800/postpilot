-- ============================================================
-- PostPilot — Migration 001 : Schéma initial
-- ============================================================
-- Extensions requises
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ============================================================
-- TABLE : organizations
-- ============================================================

CREATE TABLE organizations (
    id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name                  text NOT NULL,
    slug                  text UNIQUE,
    subscription_plan     text NOT NULL DEFAULT 'starter',  -- 'starter', 'pro', 'business'
    max_posts_per_month   int  NOT NULL DEFAULT 8,
    stripe_customer_id    text,
    stripe_subscription_id text,
    created_at            timestamp with time zone NOT NULL DEFAULT NOW(),
    updated_at            timestamp with time zone NOT NULL DEFAULT NOW(),
    deleted_at            timestamp with time zone  -- soft delete
);

CREATE INDEX idx_organizations_slug ON organizations (slug);
CREATE INDEX idx_organizations_deleted_at ON organizations (deleted_at);

-- ============================================================
-- TABLE : organization_members
-- ============================================================

CREATE TABLE organization_members (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    user_id         uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    role            text NOT NULL DEFAULT 'member',  -- 'owner', 'admin', 'member'
    created_at      timestamp with time zone NOT NULL DEFAULT NOW(),
    UNIQUE (organization_id, user_id)
);

CREATE INDEX idx_organization_members_organization_id ON organization_members (organization_id);
CREATE INDEX idx_organization_members_user_id          ON organization_members (user_id);

-- ============================================================
-- TABLE : brand_profiles
-- ============================================================

CREATE TABLE brand_profiles (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id   uuid NOT NULL REFERENCES organizations (id) ON DELETE CASCADE UNIQUE,
    company_name      text,
    industry          text,
    description       text,
    target_audience   text,
    tone              text[],          -- ex: ['professionnel', 'bienveillant', 'expert']
    keywords          text[],          -- mots-clés importants de la marque
    example_posts     text[],          -- exemples de posts validés (few-shot)
    posting_frequency int DEFAULT 3,   -- posts par semaine cible
    preferred_days    text[],          -- ex: ['monday', 'wednesday', 'friday']
    preferred_time    time,            -- heure préférée de publication (UTC)
    created_at        timestamp with time zone NOT NULL DEFAULT NOW(),
    updated_at        timestamp with time zone NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_brand_profiles_organization_id ON brand_profiles (organization_id);

-- ============================================================
-- TABLE : documents
-- (base documentaire RAG par client)
-- ============================================================

CREATE TABLE documents (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    title           text NOT NULL,
    content         text,
    file_url        text,           -- URL Supabase Storage
    file_type       text,           -- 'pdf', 'docx', 'txt', 'url', etc.
    file_size       int,            -- taille en octets
    embedding       vector(1536),   -- OpenAI text-embedding-3-small (1536 dimensions)
    created_at      timestamp with time zone NOT NULL DEFAULT NOW(),
    deleted_at      timestamp with time zone  -- soft delete
);

CREATE INDEX idx_documents_organization_id ON documents (organization_id);
CREATE INDEX idx_documents_deleted_at      ON documents (deleted_at);

-- Index HNSW pour la recherche sémantique (RAG)
CREATE INDEX idx_documents_embedding_hnsw
    ON documents
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- ============================================================
-- TABLE : platforms
-- (comptes réseaux sociaux connectés par client)
-- ============================================================

CREATE TABLE platforms (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id     uuid NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    platform_type       text NOT NULL,      -- 'linkedin', 'instagram', 'tiktok'
    is_active           boolean NOT NULL DEFAULT true,
    connected_at        timestamp with time zone,
    oauth_tokens        jsonb,              -- { access_token, refresh_token, expires_at, linkedin_person_id }
    token_expires_at    timestamp with time zone,  -- pour le cron de refresh (workflow 08)
    platform_user_id    text,              -- LinkedIn URN ex: "urn:li:person:xxxxx"
    platform_user_name  text,              -- "Jean Dupont" (affichage)
    platform_metadata   jsonb,
    created_at          timestamp with time zone NOT NULL DEFAULT NOW(),
    updated_at          timestamp with time zone NOT NULL DEFAULT NOW(),
    UNIQUE (organization_id, platform_type)
);

CREATE INDEX idx_platforms_organization_id   ON platforms (organization_id);
CREATE INDEX idx_platforms_platform_type     ON platforms (platform_type);
CREATE INDEX idx_platforms_token_expires_at  ON platforms (token_expires_at);  -- pour le cron de refresh

-- ============================================================
-- TABLE : posts
-- ============================================================

CREATE TABLE posts (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id   uuid NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    brand_profile_id  uuid REFERENCES brand_profiles (id) ON DELETE SET NULL,
    title             text,
    content           text NOT NULL,
    status            text NOT NULL DEFAULT 'draft',
    -- statuts : 'draft' | 'pending_review' | 'approved' | 'scheduled' | 'published' | 'failed'
    source_type       text,
    -- types : 'manual' | 'url' | 'vocal' | 'document' | 'rss' | 'calendar_event'
    source_url        text,
    source_content    text,           -- contenu brut de la source (transcription, résumé URL, etc.)
    scheduled_at      timestamp with time zone,
    published_at      timestamp with time zone,
    platform_type     text NOT NULL DEFAULT 'linkedin',
    platform_post_id  text,           -- ID du post côté LinkedIn ex: "urn:li:share:xxxxx"
    created_by        uuid REFERENCES auth.users (id) ON DELETE SET NULL,
    created_at        timestamp with time zone NOT NULL DEFAULT NOW(),
    updated_at        timestamp with time zone NOT NULL DEFAULT NOW(),
    deleted_at        timestamp with time zone  -- soft delete
);

CREATE INDEX idx_posts_organization_id ON posts (organization_id);
CREATE INDEX idx_posts_status          ON posts (status);
CREATE INDEX idx_posts_scheduled_at    ON posts (scheduled_at);
CREATE INDEX idx_posts_published_at    ON posts (published_at);
CREATE INDEX idx_posts_deleted_at      ON posts (deleted_at);
CREATE INDEX idx_posts_created_by      ON posts (created_by);

-- Index composite pour le workflow de publication programmée (cron toutes les 5 min)
CREATE INDEX idx_posts_approved_scheduled
    ON posts (organization_id, scheduled_at)
    WHERE status = 'approved' AND deleted_at IS NULL;

-- ============================================================
-- TABLE : post_versions
-- (historique des versions d'un post)
-- ============================================================

CREATE TABLE post_versions (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id         uuid NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
    organization_id uuid NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    version_number  int  NOT NULL,
    content         text NOT NULL,
    feedback        text,            -- feedback qui a déclenché cette révision
    created_by      uuid REFERENCES auth.users (id) ON DELETE SET NULL,
    created_at      timestamp with time zone NOT NULL DEFAULT NOW(),
    UNIQUE (post_id, version_number)
);

CREATE INDEX idx_post_versions_post_id         ON post_versions (post_id);
CREATE INDEX idx_post_versions_organization_id ON post_versions (organization_id);

-- ============================================================
-- TABLE : post_analytics
-- (métriques collectées par le workflow 04)
-- ============================================================

CREATE TABLE post_analytics (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id           uuid NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
    organization_id   uuid NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    platform_type     text NOT NULL DEFAULT 'linkedin',
    likes_count       int  NOT NULL DEFAULT 0,
    comments_count    int  NOT NULL DEFAULT 0,
    shares_count      int  NOT NULL DEFAULT 0,
    impressions_count int  NOT NULL DEFAULT 0,
    clicks_count      int  NOT NULL DEFAULT 0,
    engagement_rate   numeric(5, 2),
    collected_at      timestamp with time zone NOT NULL DEFAULT NOW(),
    raw_data          jsonb  -- réponse brute de l'API LinkedIn
);

CREATE INDEX idx_post_analytics_post_id         ON post_analytics (post_id);
CREATE INDEX idx_post_analytics_organization_id ON post_analytics (organization_id);
CREATE INDEX idx_post_analytics_collected_at    ON post_analytics (collected_at);

-- ============================================================
-- TABLE : post_feedback
-- (feedbacks utilisateur sur les posts générés)
-- ============================================================

CREATE TABLE post_feedback (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id         uuid NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
    organization_id uuid NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    feedback_text   text NOT NULL,
    scope           text NOT NULL DEFAULT 'full',
    -- scopes : 'full' | 'opening' | 'closing' | 'tone' | 'length' | 'keywords'
    created_by      uuid REFERENCES auth.users (id) ON DELETE SET NULL,
    created_at      timestamp with time zone NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_post_feedback_post_id         ON post_feedback (post_id);
CREATE INDEX idx_post_feedback_organization_id ON post_feedback (organization_id);

-- ============================================================
-- TABLE : rss_feeds
-- (sources RSS configurées par organisation)
-- ============================================================

CREATE TABLE rss_feeds (
    id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id       uuid NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    url                   text NOT NULL,
    title                 text,
    description           text,
    is_active             boolean NOT NULL DEFAULT true,
    last_fetched_at       timestamp with time zone,
    fetch_frequency_hours int  NOT NULL DEFAULT 24,
    created_at            timestamp with time zone NOT NULL DEFAULT NOW(),
    UNIQUE (organization_id, url)
);

CREATE INDEX idx_rss_feeds_organization_id ON rss_feeds (organization_id);
CREATE INDEX idx_rss_feeds_is_active       ON rss_feeds (is_active);

-- ============================================================
-- TABLE : calendar_events
-- (événements du calendrier éditorial)
-- ============================================================

CREATE TABLE calendar_events (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id  uuid NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    title            text NOT NULL,
    description      text,
    event_date       date NOT NULL,
    event_type       text,
    -- types : 'conference', 'webinar', 'product_launch', 'holiday', 'custom'
    post_generated   boolean NOT NULL DEFAULT false,
    post_id          uuid REFERENCES posts (id) ON DELETE SET NULL,
    created_at       timestamp with time zone NOT NULL DEFAULT NOW(),
    updated_at       timestamp with time zone NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_calendar_events_organization_id ON calendar_events (organization_id);
CREATE INDEX idx_calendar_events_event_date       ON calendar_events (event_date);
CREATE INDEX idx_calendar_events_post_generated   ON calendar_events (post_generated);

-- ============================================================
-- TABLE : notifications
-- (notifications in-app — consommées via Supabase Realtime)
-- ============================================================

CREATE TABLE notifications (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    user_id         uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    type            text NOT NULL,
    -- types : 'post_ready' | 'post_published' | 'post_failed' | 'token_expired' |
    --         'token_refreshed' | 'analytics_ready' | 'rss_found' | 'error'
    title           text NOT NULL,
    message         text,
    is_read         boolean NOT NULL DEFAULT false,
    metadata        jsonb,          -- données contextuelles (post_id, platform_type, etc.)
    created_at      timestamp with time zone NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_organization_id ON notifications (organization_id);
CREATE INDEX idx_notifications_user_id         ON notifications (user_id);
CREATE INDEX idx_notifications_is_read         ON notifications (is_read);
CREATE INDEX idx_notifications_created_at      ON notifications (created_at DESC);

-- ============================================================
-- TRIGGERS : updated_at automatique
-- ============================================================

CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_organizations
    BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_brand_profiles
    BEFORE UPDATE ON brand_profiles
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_platforms
    BEFORE UPDATE ON platforms
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_posts
    BEFORE UPDATE ON posts
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_calendar_events
    BEFORE UPDATE ON calendar_events
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- RLS : activation sur toutes les tables
-- (les policies sont définies dans 002_rls_policies.sql)
-- ============================================================

ALTER TABLE organizations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents            ENABLE ROW LEVEL SECURITY;
ALTER TABLE platforms            ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts                ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_versions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_analytics       ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_feedback        ENABLE ROW LEVEL SECURITY;
ALTER TABLE rss_feeds            ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events      ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications        ENABLE ROW LEVEL SECURITY;
