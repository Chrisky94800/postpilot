-- PostPilot — Migration 011 : Back-office administrateur
--
-- 1. Table admin_users (liste blanche des admins)
-- 2. Colonne status sur organizations ('active' | 'suspended')
-- 3. Fonctions SECURITY DEFINER pour le back-office

-- ── 1. Table admin_users ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.admin_users (
  user_id    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT NOW()
);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Un admin peut voir s'il est dans la table (pour is_admin())
CREATE POLICY "admin_users_self"
  ON public.admin_users FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- ── 2. Colonne status sur organizations ─────────────────────────────────────

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';
-- Valeurs : 'active' | 'suspended'

-- ── 3. Fonction helper is_admin() ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()
  );
$$;

-- ── 4. get_admin_stats ──────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin requis';
  END IF;

  SELECT jsonb_build_object(
    'total_organizations',      COUNT(*),
    'active_organizations',     COUNT(*) FILTER (WHERE status = 'active'),
    'suspended_organizations',  COUNT(*) FILTER (WHERE status = 'suspended'),
    'new_this_month',           COUNT(*) FILTER (
                                  WHERE created_at >= date_trunc('month', CURRENT_DATE)
                                ),
    'plan_starter',             COUNT(*) FILTER (WHERE subscription_plan = 'starter'),
    'plan_pro',                 COUNT(*) FILTER (WHERE subscription_plan = 'pro'),
    'plan_business',            COUNT(*) FILTER (WHERE subscription_plan = 'business'),
    'total_posts_published',    (SELECT COUNT(*) FROM public.posts WHERE status = 'published' AND deleted_at IS NULL),
    'posts_published_this_month', (
      SELECT COUNT(*) FROM public.posts
      WHERE status = 'published'
        AND published_at >= date_trunc('month', CURRENT_DATE)
        AND deleted_at IS NULL
    ),
    'linkedin_connected',       (
      SELECT COUNT(DISTINCT organization_id) FROM public.platforms
      WHERE platform_type = 'linkedin' AND is_active = true
    ),
    'recent_registrations', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'id',           o.id,
          'name',         o.name,
          'plan',         o.subscription_plan,
          'status',       o.status,
          'created_at',   o.created_at,
          'owner_email',  (
            SELECT u.email
            FROM auth.users u
            JOIN public.organization_members m ON m.user_id = u.id
            WHERE m.organization_id = o.id AND m.role = 'owner'
            LIMIT 1
          )
        ) ORDER BY o.created_at DESC
      ), '[]'::jsonb)
      FROM (
        SELECT * FROM public.organizations
        WHERE deleted_at IS NULL
        ORDER BY created_at DESC LIMIT 8
      ) o
    )
  ) INTO result
  FROM public.organizations
  WHERE deleted_at IS NULL;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_stats() TO authenticated;

-- ── 5. get_admin_organizations ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_admin_organizations(
  p_search text DEFAULT NULL,
  p_plan   text DEFAULT NULL,
  p_status text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin requis';
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id',                     o.id,
      'name',                   o.name,
      'slug',                   o.slug,
      'subscription_plan',      o.subscription_plan,
      'max_posts_per_month',    o.max_posts_per_month,
      'status',                 o.status,
      'created_at',             o.created_at,
      'owner_email', (
        SELECT u.email
        FROM auth.users u
        JOIN public.organization_members m ON m.user_id = u.id
        WHERE m.organization_id = o.id AND m.role = 'owner'
        LIMIT 1
      ),
      'member_count', (
        SELECT COUNT(*) FROM public.organization_members
        WHERE organization_id = o.id
      ),
      'post_count', (
        SELECT COUNT(*) FROM public.posts
        WHERE organization_id = o.id AND deleted_at IS NULL
      ),
      'posts_published_this_month', (
        SELECT COUNT(*) FROM public.posts
        WHERE organization_id = o.id
          AND status = 'published'
          AND published_at >= date_trunc('month', CURRENT_DATE)
          AND deleted_at IS NULL
      ),
      'linkedin_connected', (
        SELECT COUNT(*) > 0 FROM public.platforms
        WHERE organization_id = o.id
          AND platform_type = 'linkedin'
          AND is_active = true
      )
    ) ORDER BY o.created_at DESC
  ), '[]'::jsonb) INTO result
  FROM public.organizations o
  WHERE o.deleted_at IS NULL
    AND (p_search IS NULL OR o.name ILIKE '%' || p_search || '%'
                          OR o.slug ILIKE '%' || p_search || '%')
    AND (p_plan IS NULL OR p_plan = '' OR o.subscription_plan = p_plan)
    AND (p_status IS NULL OR p_status = '' OR o.status = p_status);

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_organizations(text, text, text) TO authenticated;

-- ── 6. get_admin_organization_detail ────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_admin_organization_detail(p_org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin requis';
  END IF;

  SELECT jsonb_build_object(
    'organization', (
      SELECT jsonb_build_object(
        'id',                  o.id,
        'name',                o.name,
        'slug',                o.slug,
        'subscription_plan',   o.subscription_plan,
        'max_posts_per_month', o.max_posts_per_month,
        'status',              o.status,
        'created_at',          o.created_at,
        'stripe_customer_id',  o.stripe_customer_id
      ) FROM public.organizations o WHERE o.id = p_org_id
    ),
    'members', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'user_id',    m.user_id,
          'role',       m.role,
          'created_at', m.created_at,
          'email',      u.email,
          'full_name',  u.raw_user_meta_data->>'full_name'
        ) ORDER BY m.created_at
      ), '[]'::jsonb)
      FROM public.organization_members m
      JOIN auth.users u ON u.id = m.user_id
      WHERE m.organization_id = p_org_id
    ),
    'recent_posts', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'id',           p.id,
          'title',        p.title,
          'status',       p.status,
          'created_at',   p.created_at,
          'published_at', p.published_at,
          'scheduled_at', p.scheduled_at
        ) ORDER BY p.created_at DESC
      ), '[]'::jsonb)
      FROM (
        SELECT * FROM public.posts
        WHERE organization_id = p_org_id AND deleted_at IS NULL
        ORDER BY created_at DESC LIMIT 10
      ) p
    ),
    'linkedin', (
      SELECT jsonb_build_object(
        'is_active',          pl.is_active,
        'connected_at',       pl.connected_at,
        'token_expires_at',   pl.token_expires_at,
        'platform_user_id',   pl.platform_user_id,
        'platform_user_name', pl.platform_user_name
      )
      FROM public.platforms pl
      WHERE pl.organization_id = p_org_id AND pl.platform_type = 'linkedin'
      LIMIT 1
    ),
    'stats', jsonb_build_object(
      'total_posts', (
        SELECT COUNT(*) FROM public.posts
        WHERE organization_id = p_org_id AND deleted_at IS NULL
      ),
      'published_this_month', (
        SELECT COUNT(*) FROM public.posts
        WHERE organization_id = p_org_id
          AND status = 'published'
          AND published_at >= date_trunc('month', CURRENT_DATE)
          AND deleted_at IS NULL
      ),
      'total_programs', (
        SELECT COUNT(*) FROM public.programs
        WHERE organization_id = p_org_id
      )
    )
  ) INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_organization_detail(uuid) TO authenticated;

-- ── 7. admin_set_plan ───────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.admin_set_plan(p_org_id uuid, p_plan text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_max_posts int;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin requis';
  END IF;

  v_max_posts := CASE p_plan
    WHEN 'starter'  THEN 8
    WHEN 'pro'      THEN 30
    WHEN 'business' THEN 60
    ELSE 8
  END;

  UPDATE public.organizations
  SET subscription_plan    = p_plan,
      max_posts_per_month  = v_max_posts,
      updated_at           = NOW()
  WHERE id = p_org_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_plan(uuid, text) TO authenticated;

-- ── 8. admin_set_status ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.admin_set_status(p_org_id uuid, p_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin requis';
  END IF;

  IF p_status NOT IN ('active', 'suspended') THEN
    RAISE EXCEPTION 'Statut invalide : %', p_status;
  END IF;

  UPDATE public.organizations
  SET status     = p_status,
      updated_at = NOW()
  WHERE id = p_org_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_status(uuid, text) TO authenticated;

-- ── 9. admin_revoke_linkedin ─────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.admin_revoke_linkedin(p_org_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin requis';
  END IF;

  UPDATE public.platforms
  SET is_active        = false,
      oauth_tokens     = NULL,
      token_expires_at = NULL,
      updated_at       = NOW()
  WHERE organization_id = p_org_id
    AND platform_type   = 'linkedin';
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_revoke_linkedin(uuid) TO authenticated;

-- ── Note d'initialisation ───────────────────────────────────────────────────
-- Pour créer le premier administrateur, exécuter dans le SQL Editor :
--
-- INSERT INTO public.admin_users (user_id)
-- VALUES ('<uuid-de-votre-user>');
--
-- Trouver l'UUID via : SELECT id, email FROM auth.users WHERE email = 'votre@email.com';
