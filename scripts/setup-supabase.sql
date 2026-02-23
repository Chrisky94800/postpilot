-- ============================================================
-- PostPilot — Script SQL d'initialisation complet
-- À coller dans : Supabase Dashboard → SQL Editor → New Query
-- ============================================================
-- Ordre d'exécution : 001 → 002 → 003
-- ============================================================

-- ============================================================
-- MIGRATION 001 : Schéma initial
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- TABLE : organizations
CREATE TABLE IF NOT EXISTS organizations (
    id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name                  text NOT NULL,
    slug                  text UNIQUE,
    subscription_plan     text NOT NULL DEFAULT 'starter',
    max_posts_per_month   int  NOT NULL DEFAULT 8,
    stripe_customer_id    text,
    stripe_subscription_id text,
    created_at            timestamp with time zone NOT NULL DEFAULT NOW(),
    updated_at            timestamp with time zone NOT NULL DEFAULT NOW(),
    deleted_at            timestamp with time zone
);

CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations (slug);
CREATE INDEX IF NOT EXISTS idx_organizations_deleted_at ON organizations (deleted_at);

-- TABLE : organization_members
CREATE TABLE IF NOT EXISTS organization_members (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    user_id         uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    role            text NOT NULL DEFAULT 'member',
    created_at      timestamp with time zone NOT NULL DEFAULT NOW(),
    UNIQUE (organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_organization_members_organization_id ON organization_members (organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_user_id          ON organization_members (user_id);

-- TABLE : brand_profiles
CREATE TABLE IF NOT EXISTS brand_profiles (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id   uuid NOT NULL REFERENCES organizations (id) ON DELETE CASCADE UNIQUE,
    company_name      text,
    industry          text,
    description       text,
    target_audience   text,
    tone              text[],
    keywords          text[],
    example_posts     text[],
    posting_frequency int DEFAULT 3,
    preferred_days    text[],
    preferred_time    time,
    created_at        timestamp with time zone NOT NULL DEFAULT NOW(),
    updated_at        timestamp with time zone NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_brand_profiles_organization_id ON brand_profiles (organization_id);

-- TABLE : documents
CREATE TABLE IF NOT EXISTS documents (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    title           text NOT NULL,
    content         text,
    file_url        text,
    file_type       text,
    file_size       int,
    embedding       vector(1536),
    created_at      timestamp with time zone NOT NULL DEFAULT NOW(),
    deleted_at      timestamp with time zone
);

CREATE INDEX IF NOT EXISTS idx_documents_organization_id ON documents (organization_id);
CREATE INDEX IF NOT EXISTS idx_documents_deleted_at      ON documents (deleted_at);

-- Index HNSW pour pgvector — activez d'abord l'extension dans
-- Dashboard → Database → Extensions → "vector" avant d'exécuter ce script.
-- Si pgvector n'est pas disponible, l'index est ignoré (pas d'erreur fatale).
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_documents_embedding_hnsw
      ON documents
      USING hnsw (embedding vector_cosine_ops)
      WITH (m = 16, ef_construction = 64);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Index HNSW ignoré (pgvector non activé) : %', SQLERRM;
END $$;

-- TABLE : platforms
CREATE TABLE IF NOT EXISTS platforms (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id     uuid NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    platform_type       text NOT NULL,
    is_active           boolean NOT NULL DEFAULT true,
    connected_at        timestamp with time zone,
    oauth_tokens        jsonb,
    token_expires_at    timestamp with time zone,
    platform_user_id    text,
    platform_user_name  text,
    platform_metadata   jsonb,
    created_at          timestamp with time zone NOT NULL DEFAULT NOW(),
    updated_at          timestamp with time zone NOT NULL DEFAULT NOW(),
    UNIQUE (organization_id, platform_type)
);

CREATE INDEX IF NOT EXISTS idx_platforms_organization_id   ON platforms (organization_id);
CREATE INDEX IF NOT EXISTS idx_platforms_platform_type     ON platforms (platform_type);
CREATE INDEX IF NOT EXISTS idx_platforms_token_expires_at  ON platforms (token_expires_at);

-- TABLE : posts
CREATE TABLE IF NOT EXISTS posts (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id   uuid NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    brand_profile_id  uuid REFERENCES brand_profiles (id) ON DELETE SET NULL,
    title             text,
    content           text NOT NULL,
    status            text NOT NULL DEFAULT 'draft',
    source_type       text,
    source_url        text,
    source_content    text,
    scheduled_at      timestamp with time zone,
    published_at      timestamp with time zone,
    platform_type     text NOT NULL DEFAULT 'linkedin',
    platform_post_id  text,
    created_by        uuid REFERENCES auth.users (id) ON DELETE SET NULL,
    created_at        timestamp with time zone NOT NULL DEFAULT NOW(),
    updated_at        timestamp with time zone NOT NULL DEFAULT NOW(),
    deleted_at        timestamp with time zone
);

CREATE INDEX IF NOT EXISTS idx_posts_organization_id ON posts (organization_id);
CREATE INDEX IF NOT EXISTS idx_posts_status          ON posts (status);
CREATE INDEX IF NOT EXISTS idx_posts_scheduled_at    ON posts (scheduled_at);
CREATE INDEX IF NOT EXISTS idx_posts_published_at    ON posts (published_at);
CREATE INDEX IF NOT EXISTS idx_posts_deleted_at      ON posts (deleted_at);
CREATE INDEX IF NOT EXISTS idx_posts_created_by      ON posts (created_by);
CREATE INDEX IF NOT EXISTS idx_posts_approved_scheduled
    ON posts (organization_id, scheduled_at)
    WHERE status = 'approved' AND deleted_at IS NULL;

-- TABLE : post_versions
CREATE TABLE IF NOT EXISTS post_versions (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id         uuid NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
    organization_id uuid NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    version_number  int  NOT NULL,
    content         text NOT NULL,
    feedback        text,
    created_by      uuid REFERENCES auth.users (id) ON DELETE SET NULL,
    created_at      timestamp with time zone NOT NULL DEFAULT NOW(),
    UNIQUE (post_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_post_versions_post_id         ON post_versions (post_id);
CREATE INDEX IF NOT EXISTS idx_post_versions_organization_id ON post_versions (organization_id);

-- TABLE : post_analytics
CREATE TABLE IF NOT EXISTS post_analytics (
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
    raw_data          jsonb
);

CREATE INDEX IF NOT EXISTS idx_post_analytics_post_id         ON post_analytics (post_id);
CREATE INDEX IF NOT EXISTS idx_post_analytics_organization_id ON post_analytics (organization_id);
CREATE INDEX IF NOT EXISTS idx_post_analytics_collected_at    ON post_analytics (collected_at);

-- TABLE : post_feedback
CREATE TABLE IF NOT EXISTS post_feedback (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id         uuid NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
    organization_id uuid NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    feedback_text   text NOT NULL,
    scope           text NOT NULL DEFAULT 'full',
    created_by      uuid REFERENCES auth.users (id) ON DELETE SET NULL,
    created_at      timestamp with time zone NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_post_feedback_post_id         ON post_feedback (post_id);
CREATE INDEX IF NOT EXISTS idx_post_feedback_organization_id ON post_feedback (organization_id);

-- TABLE : rss_feeds
CREATE TABLE IF NOT EXISTS rss_feeds (
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

CREATE INDEX IF NOT EXISTS idx_rss_feeds_organization_id ON rss_feeds (organization_id);
CREATE INDEX IF NOT EXISTS idx_rss_feeds_is_active       ON rss_feeds (is_active);

-- TABLE : calendar_events
CREATE TABLE IF NOT EXISTS calendar_events (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id  uuid NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    title            text NOT NULL,
    description      text,
    event_date       date NOT NULL,
    event_type       text,
    post_generated   boolean NOT NULL DEFAULT false,
    post_id          uuid REFERENCES posts (id) ON DELETE SET NULL,
    created_at       timestamp with time zone NOT NULL DEFAULT NOW(),
    updated_at       timestamp with time zone NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_calendar_events_organization_id ON calendar_events (organization_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_event_date       ON calendar_events (event_date);
CREATE INDEX IF NOT EXISTS idx_calendar_events_post_generated   ON calendar_events (post_generated);

-- TABLE : notifications
CREATE TABLE IF NOT EXISTS notifications (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    user_id         uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    type            text NOT NULL,
    title           text NOT NULL,
    message         text,
    is_read         boolean NOT NULL DEFAULT false,
    metadata        jsonb,
    created_at      timestamp with time zone NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_organization_id ON notifications (organization_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id         ON notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read         ON notifications (is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at      ON notifications (created_at DESC);

-- TRIGGERS : updated_at automatique
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_organizations') THEN
    CREATE TRIGGER set_updated_at_organizations
        BEFORE UPDATE ON organizations
        FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_brand_profiles') THEN
    CREATE TRIGGER set_updated_at_brand_profiles
        BEFORE UPDATE ON brand_profiles
        FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_platforms') THEN
    CREATE TRIGGER set_updated_at_platforms
        BEFORE UPDATE ON platforms
        FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_posts') THEN
    CREATE TRIGGER set_updated_at_posts
        BEFORE UPDATE ON posts
        FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_calendar_events') THEN
    CREATE TRIGGER set_updated_at_calendar_events
        BEFORE UPDATE ON calendar_events
        FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
  END IF;
END $$;

-- RLS : activation sur toutes les tables
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

-- ============================================================
-- MIGRATION 002 : RLS Policies
-- ============================================================

-- Fonctions helper (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.is_member_of(org_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.organization_members
        WHERE organization_id = org_id
          AND user_id         = auth.uid()
    );
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_owner_of(org_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.organization_members
        WHERE organization_id = org_id
          AND user_id         = auth.uid()
          AND role IN ('owner', 'admin')
    );
$$;

CREATE OR REPLACE FUNCTION public.is_owner_of(org_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.organization_members
        WHERE organization_id = org_id
          AND user_id         = auth.uid()
          AND role            = 'owner'
    );
$$;

-- Trigger bootstrap : owner membership
CREATE OR REPLACE FUNCTION public.handle_new_organization()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    INSERT INTO public.organization_members (organization_id, user_id, role)
    VALUES (NEW.id, auth.uid(), 'owner');
    RETURN NEW;
END;
$$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_organization_created') THEN
    CREATE TRIGGER on_organization_created
        AFTER INSERT ON public.organizations
        FOR EACH ROW
        EXECUTE FUNCTION public.handle_new_organization();
  END IF;
END $$;

-- Policies organizations
DROP POLICY IF EXISTS "org_select" ON public.organizations;
DROP POLICY IF EXISTS "org_insert" ON public.organizations;
DROP POLICY IF EXISTS "org_update" ON public.organizations;
DROP POLICY IF EXISTS "org_delete" ON public.organizations;

CREATE POLICY "org_select" ON public.organizations FOR SELECT TO authenticated
    USING (public.is_member_of(id) AND deleted_at IS NULL);
CREATE POLICY "org_insert" ON public.organizations FOR INSERT TO authenticated
    WITH CHECK (true);
CREATE POLICY "org_update" ON public.organizations FOR UPDATE TO authenticated
    USING (public.is_admin_or_owner_of(id)) WITH CHECK (public.is_admin_or_owner_of(id));
CREATE POLICY "org_delete" ON public.organizations FOR DELETE TO authenticated
    USING (public.is_owner_of(id));

-- Policies organization_members
DROP POLICY IF EXISTS "members_select" ON public.organization_members;
DROP POLICY IF EXISTS "members_insert" ON public.organization_members;
DROP POLICY IF EXISTS "members_update" ON public.organization_members;
DROP POLICY IF EXISTS "members_delete" ON public.organization_members;

CREATE POLICY "members_select" ON public.organization_members FOR SELECT TO authenticated
    USING (public.is_member_of(organization_id));
CREATE POLICY "members_insert" ON public.organization_members FOR INSERT TO authenticated
    WITH CHECK (public.is_admin_or_owner_of(organization_id));
CREATE POLICY "members_update" ON public.organization_members FOR UPDATE TO authenticated
    USING (public.is_admin_or_owner_of(organization_id)) WITH CHECK (public.is_admin_or_owner_of(organization_id));
CREATE POLICY "members_delete" ON public.organization_members FOR DELETE TO authenticated
    USING (public.is_admin_or_owner_of(organization_id) OR user_id = auth.uid());

-- Policies brand_profiles
DROP POLICY IF EXISTS "brand_profiles_select" ON public.brand_profiles;
DROP POLICY IF EXISTS "brand_profiles_insert" ON public.brand_profiles;
DROP POLICY IF EXISTS "brand_profiles_update" ON public.brand_profiles;
DROP POLICY IF EXISTS "brand_profiles_delete" ON public.brand_profiles;

CREATE POLICY "brand_profiles_select" ON public.brand_profiles FOR SELECT TO authenticated
    USING (public.is_member_of(organization_id));
CREATE POLICY "brand_profiles_insert" ON public.brand_profiles FOR INSERT TO authenticated
    WITH CHECK (public.is_member_of(organization_id));
CREATE POLICY "brand_profiles_update" ON public.brand_profiles FOR UPDATE TO authenticated
    USING (public.is_member_of(organization_id)) WITH CHECK (public.is_member_of(organization_id));
CREATE POLICY "brand_profiles_delete" ON public.brand_profiles FOR DELETE TO authenticated
    USING (public.is_admin_or_owner_of(organization_id));

-- Policies documents
DROP POLICY IF EXISTS "documents_select" ON public.documents;
DROP POLICY IF EXISTS "documents_insert" ON public.documents;
DROP POLICY IF EXISTS "documents_update" ON public.documents;
DROP POLICY IF EXISTS "documents_delete" ON public.documents;

CREATE POLICY "documents_select" ON public.documents FOR SELECT TO authenticated
    USING (public.is_member_of(organization_id) AND deleted_at IS NULL);
CREATE POLICY "documents_insert" ON public.documents FOR INSERT TO authenticated
    WITH CHECK (public.is_member_of(organization_id));
CREATE POLICY "documents_update" ON public.documents FOR UPDATE TO authenticated
    USING (public.is_member_of(organization_id)) WITH CHECK (public.is_member_of(organization_id));
CREATE POLICY "documents_delete" ON public.documents FOR DELETE TO authenticated
    USING (public.is_member_of(organization_id));

-- Policies platforms
DROP POLICY IF EXISTS "platforms_select" ON public.platforms;
DROP POLICY IF EXISTS "platforms_insert" ON public.platforms;
DROP POLICY IF EXISTS "platforms_update" ON public.platforms;
DROP POLICY IF EXISTS "platforms_delete" ON public.platforms;

CREATE POLICY "platforms_select" ON public.platforms FOR SELECT TO authenticated
    USING (public.is_member_of(organization_id));
CREATE POLICY "platforms_insert" ON public.platforms FOR INSERT TO authenticated
    WITH CHECK (public.is_admin_or_owner_of(organization_id));
CREATE POLICY "platforms_update" ON public.platforms FOR UPDATE TO authenticated
    USING (public.is_admin_or_owner_of(organization_id)) WITH CHECK (public.is_admin_or_owner_of(organization_id));
CREATE POLICY "platforms_delete" ON public.platforms FOR DELETE TO authenticated
    USING (public.is_admin_or_owner_of(organization_id));

-- Policies posts
DROP POLICY IF EXISTS "posts_select" ON public.posts;
DROP POLICY IF EXISTS "posts_insert" ON public.posts;
DROP POLICY IF EXISTS "posts_update" ON public.posts;
DROP POLICY IF EXISTS "posts_delete" ON public.posts;

CREATE POLICY "posts_select" ON public.posts FOR SELECT TO authenticated
    USING (public.is_member_of(organization_id) AND deleted_at IS NULL);
CREATE POLICY "posts_insert" ON public.posts FOR INSERT TO authenticated
    WITH CHECK (public.is_member_of(organization_id));
CREATE POLICY "posts_update" ON public.posts FOR UPDATE TO authenticated
    USING (public.is_member_of(organization_id)) WITH CHECK (public.is_member_of(organization_id));
CREATE POLICY "posts_delete" ON public.posts FOR DELETE TO authenticated
    USING (public.is_member_of(organization_id));

-- Policies post_versions
DROP POLICY IF EXISTS "post_versions_select" ON public.post_versions;
DROP POLICY IF EXISTS "post_versions_insert" ON public.post_versions;

CREATE POLICY "post_versions_select" ON public.post_versions FOR SELECT TO authenticated
    USING (public.is_member_of(organization_id));
CREATE POLICY "post_versions_insert" ON public.post_versions FOR INSERT TO authenticated
    WITH CHECK (public.is_member_of(organization_id));

-- Policies post_analytics
DROP POLICY IF EXISTS "post_analytics_select" ON public.post_analytics;

CREATE POLICY "post_analytics_select" ON public.post_analytics FOR SELECT TO authenticated
    USING (public.is_member_of(organization_id));

-- Policies post_feedback
DROP POLICY IF EXISTS "post_feedback_select" ON public.post_feedback;
DROP POLICY IF EXISTS "post_feedback_insert" ON public.post_feedback;

CREATE POLICY "post_feedback_select" ON public.post_feedback FOR SELECT TO authenticated
    USING (public.is_member_of(organization_id));
CREATE POLICY "post_feedback_insert" ON public.post_feedback FOR INSERT TO authenticated
    WITH CHECK (public.is_member_of(organization_id));

-- Policies rss_feeds
DROP POLICY IF EXISTS "rss_feeds_select" ON public.rss_feeds;
DROP POLICY IF EXISTS "rss_feeds_insert" ON public.rss_feeds;
DROP POLICY IF EXISTS "rss_feeds_update" ON public.rss_feeds;
DROP POLICY IF EXISTS "rss_feeds_delete" ON public.rss_feeds;

CREATE POLICY "rss_feeds_select" ON public.rss_feeds FOR SELECT TO authenticated
    USING (public.is_member_of(organization_id));
CREATE POLICY "rss_feeds_insert" ON public.rss_feeds FOR INSERT TO authenticated
    WITH CHECK (public.is_admin_or_owner_of(organization_id));
CREATE POLICY "rss_feeds_update" ON public.rss_feeds FOR UPDATE TO authenticated
    USING (public.is_admin_or_owner_of(organization_id)) WITH CHECK (public.is_admin_or_owner_of(organization_id));
CREATE POLICY "rss_feeds_delete" ON public.rss_feeds FOR DELETE TO authenticated
    USING (public.is_admin_or_owner_of(organization_id));

-- Policies calendar_events
DROP POLICY IF EXISTS "calendar_events_select" ON public.calendar_events;
DROP POLICY IF EXISTS "calendar_events_insert" ON public.calendar_events;
DROP POLICY IF EXISTS "calendar_events_update" ON public.calendar_events;
DROP POLICY IF EXISTS "calendar_events_delete" ON public.calendar_events;

CREATE POLICY "calendar_events_select" ON public.calendar_events FOR SELECT TO authenticated
    USING (public.is_member_of(organization_id));
CREATE POLICY "calendar_events_insert" ON public.calendar_events FOR INSERT TO authenticated
    WITH CHECK (public.is_member_of(organization_id));
CREATE POLICY "calendar_events_update" ON public.calendar_events FOR UPDATE TO authenticated
    USING (public.is_member_of(organization_id)) WITH CHECK (public.is_member_of(organization_id));
CREATE POLICY "calendar_events_delete" ON public.calendar_events FOR DELETE TO authenticated
    USING (public.is_member_of(organization_id));

-- Policies notifications
DROP POLICY IF EXISTS "notifications_select" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update" ON public.notifications;
DROP POLICY IF EXISTS "notifications_delete" ON public.notifications;

CREATE POLICY "notifications_select" ON public.notifications FOR SELECT TO authenticated
    USING (public.is_member_of(organization_id) AND user_id = auth.uid());
CREATE POLICY "notifications_update" ON public.notifications FOR UPDATE TO authenticated
    USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "notifications_delete" ON public.notifications FOR DELETE TO authenticated
    USING (user_id = auth.uid());

-- ============================================================
-- MIGRATION 003 : brand_profile_extras
-- ============================================================

ALTER TABLE brand_profiles
  ADD COLUMN IF NOT EXISTS emoji_style         smallint     NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS post_length         text         NOT NULL DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS signature           text,
  ADD COLUMN IF NOT EXISTS keywords_avoid      text[]       NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS hashtags_preferred  text[]       NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS hashtag_strategy    text         NOT NULL DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS ctas_preferred      text[]       NOT NULL DEFAULT '{}';

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_post_length'
  ) THEN
    ALTER TABLE brand_profiles
      ADD CONSTRAINT chk_post_length CHECK (post_length IN ('short', 'medium', 'long'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_hashtag_strategy'
  ) THEN
    ALTER TABLE brand_profiles
      ADD CONSTRAINT chk_hashtag_strategy CHECK (hashtag_strategy IN ('none', 'few', 'medium', 'many'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_emoji_style'
  ) THEN
    ALTER TABLE brand_profiles
      ADD CONSTRAINT chk_emoji_style CHECK (emoji_style BETWEEN 0 AND 5);
  END IF;
END $$;

COMMENT ON COLUMN brand_profiles.emoji_style        IS '0 = aucun emoji, 5 = beaucoup';
COMMENT ON COLUMN brand_profiles.post_length        IS 'short | medium | long';
COMMENT ON COLUMN brand_profiles.signature          IS 'Accroche / signature finale du post';
COMMENT ON COLUMN brand_profiles.keywords_avoid     IS 'Mots à éviter dans les posts';
COMMENT ON COLUMN brand_profiles.hashtags_preferred IS 'Hashtags favoris (sans #)';
COMMENT ON COLUMN brand_profiles.hashtag_strategy   IS 'none | few | medium | many';
COMMENT ON COLUMN brand_profiles.ctas_preferred     IS 'Formules CTA préférées';

-- ============================================================
-- FIN DU SCRIPT — Vérifier dans Table Editor que les tables
-- organizations, posts, brand_profiles, platforms sont créées.
-- ============================================================
