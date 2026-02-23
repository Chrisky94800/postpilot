-- ============================================================
-- PostPilot — Fix RLS Policies (v2)
-- À coller dans : Supabase Dashboard → SQL Editor → New Query
-- ============================================================
-- Ce script crée les fonctions helper, le trigger et toutes
-- les politiques RLS sans restriction de rôle (TO authenticated).
-- Les checks auth.uid() / is_member_of() bloquent les anonymes
-- indépendamment du claim "role" du JWT.
-- Idempotent : peut être relancé plusieurs fois sans erreur.
-- ============================================================

-- ── Fonctions helper (SECURITY DEFINER) ──────────────────────────────────────

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

-- ── Trigger bootstrap : owner membership ─────────────────────────────────────

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
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_organization_created'
  ) THEN
    CREATE TRIGGER on_organization_created
        AFTER INSERT ON public.organizations
        FOR EACH ROW
        EXECUTE FUNCTION public.handle_new_organization();
  END IF;
END $$;

-- ── Policies : organizations ──────────────────────────────────────────────────

DROP POLICY IF EXISTS "org_select" ON public.organizations;
DROP POLICY IF EXISTS "org_insert" ON public.organizations;
DROP POLICY IF EXISTS "org_update" ON public.organizations;
DROP POLICY IF EXISTS "org_delete" ON public.organizations;

CREATE POLICY "org_select" ON public.organizations FOR SELECT
    USING (public.is_member_of(id) AND deleted_at IS NULL);

-- INSERT : tout utilisateur avec un auth.uid() valide peut créer une org
-- (pas de restriction TO authenticated — couvre les JWTs avec role=anon mais sub valide)
CREATE POLICY "org_insert" ON public.organizations FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "org_update" ON public.organizations FOR UPDATE
    USING (public.is_admin_or_owner_of(id))
    WITH CHECK (public.is_admin_or_owner_of(id));

CREATE POLICY "org_delete" ON public.organizations FOR DELETE
    USING (public.is_owner_of(id));

-- ── Policies : organization_members ──────────────────────────────────────────

DROP POLICY IF EXISTS "members_select" ON public.organization_members;
DROP POLICY IF EXISTS "members_insert" ON public.organization_members;
DROP POLICY IF EXISTS "members_update" ON public.organization_members;
DROP POLICY IF EXISTS "members_delete" ON public.organization_members;

CREATE POLICY "members_select" ON public.organization_members FOR SELECT
    USING (public.is_member_of(organization_id));

CREATE POLICY "members_insert" ON public.organization_members FOR INSERT
    WITH CHECK (public.is_admin_or_owner_of(organization_id));

CREATE POLICY "members_update" ON public.organization_members FOR UPDATE
    USING (public.is_admin_or_owner_of(organization_id))
    WITH CHECK (public.is_admin_or_owner_of(organization_id));

CREATE POLICY "members_delete" ON public.organization_members FOR DELETE
    USING (public.is_admin_or_owner_of(organization_id) OR user_id = auth.uid());

-- ── Policies : brand_profiles ─────────────────────────────────────────────────

DROP POLICY IF EXISTS "brand_profiles_select" ON public.brand_profiles;
DROP POLICY IF EXISTS "brand_profiles_insert" ON public.brand_profiles;
DROP POLICY IF EXISTS "brand_profiles_update" ON public.brand_profiles;
DROP POLICY IF EXISTS "brand_profiles_delete" ON public.brand_profiles;

CREATE POLICY "brand_profiles_select" ON public.brand_profiles FOR SELECT
    USING (public.is_member_of(organization_id));

CREATE POLICY "brand_profiles_insert" ON public.brand_profiles FOR INSERT
    WITH CHECK (public.is_member_of(organization_id));

CREATE POLICY "brand_profiles_update" ON public.brand_profiles FOR UPDATE
    USING (public.is_member_of(organization_id))
    WITH CHECK (public.is_member_of(organization_id));

CREATE POLICY "brand_profiles_delete" ON public.brand_profiles FOR DELETE
    USING (public.is_admin_or_owner_of(organization_id));

-- ── Policies : documents ──────────────────────────────────────────────────────

DROP POLICY IF EXISTS "documents_select" ON public.documents;
DROP POLICY IF EXISTS "documents_insert" ON public.documents;
DROP POLICY IF EXISTS "documents_update" ON public.documents;
DROP POLICY IF EXISTS "documents_delete" ON public.documents;

CREATE POLICY "documents_select" ON public.documents FOR SELECT
    USING (public.is_member_of(organization_id) AND deleted_at IS NULL);

CREATE POLICY "documents_insert" ON public.documents FOR INSERT
    WITH CHECK (public.is_member_of(organization_id));

CREATE POLICY "documents_update" ON public.documents FOR UPDATE
    USING (public.is_member_of(organization_id))
    WITH CHECK (public.is_member_of(organization_id));

CREATE POLICY "documents_delete" ON public.documents FOR DELETE
    USING (public.is_member_of(organization_id));

-- ── Policies : platforms ──────────────────────────────────────────────────────

DROP POLICY IF EXISTS "platforms_select" ON public.platforms;
DROP POLICY IF EXISTS "platforms_insert" ON public.platforms;
DROP POLICY IF EXISTS "platforms_update" ON public.platforms;
DROP POLICY IF EXISTS "platforms_delete" ON public.platforms;

CREATE POLICY "platforms_select" ON public.platforms FOR SELECT
    USING (public.is_member_of(organization_id));

CREATE POLICY "platforms_insert" ON public.platforms FOR INSERT
    WITH CHECK (public.is_admin_or_owner_of(organization_id));

CREATE POLICY "platforms_update" ON public.platforms FOR UPDATE
    USING (public.is_admin_or_owner_of(organization_id))
    WITH CHECK (public.is_admin_or_owner_of(organization_id));

CREATE POLICY "platforms_delete" ON public.platforms FOR DELETE
    USING (public.is_admin_or_owner_of(organization_id));

-- ── Policies : posts ──────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "posts_select" ON public.posts;
DROP POLICY IF EXISTS "posts_insert" ON public.posts;
DROP POLICY IF EXISTS "posts_update" ON public.posts;
DROP POLICY IF EXISTS "posts_delete" ON public.posts;

CREATE POLICY "posts_select" ON public.posts FOR SELECT
    USING (public.is_member_of(organization_id) AND deleted_at IS NULL);

CREATE POLICY "posts_insert" ON public.posts FOR INSERT
    WITH CHECK (public.is_member_of(organization_id));

CREATE POLICY "posts_update" ON public.posts FOR UPDATE
    USING (public.is_member_of(organization_id))
    WITH CHECK (public.is_member_of(organization_id));

CREATE POLICY "posts_delete" ON public.posts FOR DELETE
    USING (public.is_member_of(organization_id));

-- ── Policies : post_versions ──────────────────────────────────────────────────

DROP POLICY IF EXISTS "post_versions_select" ON public.post_versions;
DROP POLICY IF EXISTS "post_versions_insert" ON public.post_versions;

CREATE POLICY "post_versions_select" ON public.post_versions FOR SELECT
    USING (public.is_member_of(organization_id));

CREATE POLICY "post_versions_insert" ON public.post_versions FOR INSERT
    WITH CHECK (public.is_member_of(organization_id));

-- ── Policies : post_analytics ─────────────────────────────────────────────────

DROP POLICY IF EXISTS "post_analytics_select" ON public.post_analytics;

CREATE POLICY "post_analytics_select" ON public.post_analytics FOR SELECT
    USING (public.is_member_of(organization_id));

-- ── Policies : post_feedback ──────────────────────────────────────────────────

DROP POLICY IF EXISTS "post_feedback_select" ON public.post_feedback;
DROP POLICY IF EXISTS "post_feedback_insert" ON public.post_feedback;

CREATE POLICY "post_feedback_select" ON public.post_feedback FOR SELECT
    USING (public.is_member_of(organization_id));

CREATE POLICY "post_feedback_insert" ON public.post_feedback FOR INSERT
    WITH CHECK (public.is_member_of(organization_id));

-- ── Policies : rss_feeds ──────────────────────────────────────────────────────

DROP POLICY IF EXISTS "rss_feeds_select" ON public.rss_feeds;
DROP POLICY IF EXISTS "rss_feeds_insert" ON public.rss_feeds;
DROP POLICY IF EXISTS "rss_feeds_update" ON public.rss_feeds;
DROP POLICY IF EXISTS "rss_feeds_delete" ON public.rss_feeds;

CREATE POLICY "rss_feeds_select" ON public.rss_feeds FOR SELECT
    USING (public.is_member_of(organization_id));

CREATE POLICY "rss_feeds_insert" ON public.rss_feeds FOR INSERT
    WITH CHECK (public.is_admin_or_owner_of(organization_id));

CREATE POLICY "rss_feeds_update" ON public.rss_feeds FOR UPDATE
    USING (public.is_admin_or_owner_of(organization_id))
    WITH CHECK (public.is_admin_or_owner_of(organization_id));

CREATE POLICY "rss_feeds_delete" ON public.rss_feeds FOR DELETE
    USING (public.is_admin_or_owner_of(organization_id));

-- ── Policies : calendar_events ────────────────────────────────────────────────

DROP POLICY IF EXISTS "calendar_events_select" ON public.calendar_events;
DROP POLICY IF EXISTS "calendar_events_insert" ON public.calendar_events;
DROP POLICY IF EXISTS "calendar_events_update" ON public.calendar_events;
DROP POLICY IF EXISTS "calendar_events_delete" ON public.calendar_events;

CREATE POLICY "calendar_events_select" ON public.calendar_events FOR SELECT
    USING (public.is_member_of(organization_id));

CREATE POLICY "calendar_events_insert" ON public.calendar_events FOR INSERT
    WITH CHECK (public.is_member_of(organization_id));

CREATE POLICY "calendar_events_update" ON public.calendar_events FOR UPDATE
    USING (public.is_member_of(organization_id))
    WITH CHECK (public.is_member_of(organization_id));

CREATE POLICY "calendar_events_delete" ON public.calendar_events FOR DELETE
    USING (public.is_member_of(organization_id));

-- ── Policies : notifications ──────────────────────────────────────────────────

DROP POLICY IF EXISTS "notifications_select" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update" ON public.notifications;
DROP POLICY IF EXISTS "notifications_delete" ON public.notifications;

CREATE POLICY "notifications_select" ON public.notifications FOR SELECT
    USING (public.is_member_of(organization_id) AND user_id = auth.uid());

CREATE POLICY "notifications_update" ON public.notifications FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "notifications_delete" ON public.notifications FOR DELETE
    USING (user_id = auth.uid());

-- ── Fonction SECURITY DEFINER : contournement auth.uid() ES256 ───────────────
-- Sur les nouveaux projets Supabase 2025 (JWT ES256), auth.uid() peut retourner
-- NULL dans les policies RLS malgré un JWT valide. Cette fonction SECURITY DEFINER
-- s'exécute avec les droits du propriétaire (postgres) et contourne le problème.

CREATE OR REPLACE FUNCTION public.create_my_organization(p_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id  uuid;
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'auth.uid() est NULL — vérifiez la configuration JWT Supabase'
      USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.organizations (name)
  VALUES (p_name)
  RETURNING id INTO v_org_id;

  RETURN v_org_id;
END;
$$;

-- Accorder l'exécution aux rôles authenticated ET anon
-- (le token ES256 peut être reconnu comme anon par PostgREST même si le JWT est valide)
GRANT EXECUTE ON FUNCTION public.create_my_organization(text) TO authenticated, anon;

-- ── Storage : bucket "documents" ─────────────────────────────────────────────
-- Bucket privé pour les documents uploadés par les clients.
-- Idempotent : ON CONFLICT DO NOTHING.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false,
  10485760,  -- 10 MB
  ARRAY['application/pdf','text/plain','application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies : seuls les membres de l'organisation peuvent lire/écrire
-- Le chemin de stockage est : {organization_id}/{timestamp}-{filename}
-- On extrait l'organization_id depuis le premier segment du path.

DROP POLICY IF EXISTS "documents_storage_select" ON storage.objects;
DROP POLICY IF EXISTS "documents_storage_insert" ON storage.objects;
DROP POLICY IF EXISTS "documents_storage_delete" ON storage.objects;

CREATE POLICY "documents_storage_select" ON storage.objects FOR SELECT
    USING (
      bucket_id = 'documents'
      AND public.is_member_of((storage.foldername(name))[1]::uuid)
    );

CREATE POLICY "documents_storage_insert" ON storage.objects FOR INSERT
    WITH CHECK (
      bucket_id = 'documents'
      AND auth.uid() IS NOT NULL
      AND public.is_member_of((storage.foldername(name))[1]::uuid)
    );

CREATE POLICY "documents_storage_delete" ON storage.objects FOR DELETE
    USING (
      bucket_id = 'documents'
      AND public.is_member_of((storage.foldername(name))[1]::uuid)
    );

-- ── FIN ───────────────────────────────────────────────────────────────────────
