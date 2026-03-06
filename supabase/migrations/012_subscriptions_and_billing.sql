-- PostPilot — Migration 012 : Système de facturation & Stripe
--
-- 1. Table subscriptions (source de vérité pour les plans)
-- 2. Table usage_tracking (comptage mensuel des posts IA)
-- 3. ALTER organizations : ajout max_active_programs + migration des plans existants
-- 4. Functions : check_ai_post_limit, increment_ai_post_usage
-- 5. RLS policies
-- 6. pg_cron : expiration automatique des trials

-- ── 1. Table subscriptions ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id        uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- Plan actuel
  plan_id                text NOT NULL DEFAULT 'free'
                           CHECK (plan_id IN ('free', 'solo', 'pro')),
  billing_cycle          text CHECK (billing_cycle IN ('monthly', 'yearly')),

  -- Trial
  trial_ends_at          timestamptz,
  trial_used             boolean NOT NULL DEFAULT false,

  -- Stripe (NULL tant que le user n'a pas payé)
  stripe_customer_id     text,
  stripe_subscription_id text,
  stripe_price_id        text,

  -- Statut
  status                 text NOT NULL DEFAULT 'trialing'
                           CHECK (status IN ('trialing', 'active', 'past_due', 'canceled', 'free')),

  current_period_start   timestamptz,
  current_period_end     timestamptz,

  created_at             timestamptz NOT NULL DEFAULT NOW(),
  updated_at             timestamptz NOT NULL DEFAULT NOW(),

  UNIQUE (organization_id)
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_org
  ON public.subscriptions (organization_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer
  ON public.subscriptions (stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_sub
  ON public.subscriptions (stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_trial_ends_at
  ON public.subscriptions (trial_ends_at)
  WHERE status = 'trialing';

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscriptions_read_own_org"
  ON public.subscriptions FOR SELECT
  TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

-- Trigger updated_at
CREATE TRIGGER set_updated_at_subscriptions
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

-- ── 2. Table usage_tracking ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.usage_tracking (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  period_start    date NOT NULL,   -- 1er du mois
  period_end      date NOT NULL,   -- dernier jour du mois

  ai_posts_used   int  NOT NULL DEFAULT 0,
  ai_posts_limit  int  NOT NULL,   -- 1, 8 ou 25 selon le plan

  created_at      timestamptz NOT NULL DEFAULT NOW(),
  updated_at      timestamptz NOT NULL DEFAULT NOW(),

  UNIQUE (organization_id, period_start)
);

CREATE INDEX IF NOT EXISTS idx_usage_tracking_org
  ON public.usage_tracking (organization_id);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_period
  ON public.usage_tracking (organization_id, period_start DESC);

ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usage_read_own_org"
  ON public.usage_tracking FOR SELECT
  TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

-- Trigger updated_at
CREATE TRIGGER set_updated_at_usage_tracking
  BEFORE UPDATE ON public.usage_tracking
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

-- ── 3. ALTER organizations ────────────────────────────────────────────────────

-- Ajout de max_active_programs (1 pour solo, 3 pour pro, 0 pour free)
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS max_active_programs int NOT NULL DEFAULT 0;

-- Mettre max_posts_per_month par défaut à 1 (plan free) pour les nouvelles orgs
-- (les existantes seront migrées ci-dessous)

-- Migration des plans existants vers les nouveaux codes
UPDATE public.organizations
SET
  subscription_plan     = CASE subscription_plan
    WHEN 'starter'  THEN 'solo'
    WHEN 'business' THEN 'pro'
    ELSE subscription_plan  -- 'free', 'solo', 'pro' déjà corrects
  END,
  max_posts_per_month   = CASE subscription_plan
    WHEN 'starter'  THEN 8
    WHEN 'pro'      THEN 25
    WHEN 'business' THEN 25
    ELSE 1   -- free
  END,
  max_active_programs   = CASE subscription_plan
    WHEN 'starter'  THEN 1
    WHEN 'pro'      THEN 3
    WHEN 'business' THEN 3
    ELSE 0   -- free
  END;

-- ── 4. Function check_ai_post_limit ──────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.check_ai_post_limit(org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_sub        record;
  v_limit      int;
  v_used       int;
BEGIN
  -- Récupérer la subscription
  SELECT * INTO v_sub
  FROM public.subscriptions
  WHERE organization_id = org_id;

  IF NOT FOUND THEN
    -- Pas de subscription → traiter comme free
    RETURN jsonb_build_object(
      'used',          0,
      'limit',         1,
      'remaining',     1,
      'can_generate',  true,
      'plan_id',       'free',
      'status',        'free',
      'trial_ends_at', NULL
    );
  END IF;

  -- Déterminer la limite selon le plan et le statut
  v_limit := CASE
    WHEN v_sub.status = 'trialing' AND v_sub.trial_ends_at > NOW() THEN 8  -- trial = limites solo
    WHEN v_sub.plan_id = 'solo'    THEN 8
    WHEN v_sub.plan_id = 'pro'     THEN 25
    ELSE 1  -- free ou trial expiré
  END;

  -- Usage du mois en cours
  SELECT COALESCE(ai_posts_used, 0) INTO v_used
  FROM public.usage_tracking
  WHERE organization_id = org_id
    AND period_start = date_trunc('month', CURRENT_DATE)::date;

  IF NOT FOUND THEN
    v_used := 0;
  END IF;

  RETURN jsonb_build_object(
    'used',          v_used,
    'limit',         v_limit,
    'remaining',     GREATEST(v_limit - v_used, 0),
    'can_generate',  v_used < v_limit,
    'plan_id',       v_sub.plan_id,
    'status',        v_sub.status,
    'trial_ends_at', v_sub.trial_ends_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_ai_post_limit(uuid) TO authenticated;

-- ── 5. Function increment_ai_post_usage ──────────────────────────────────────

CREATE OR REPLACE FUNCTION public.increment_ai_post_usage(org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_can_gen  boolean;
  v_limit    int;
  v_sub      record;
BEGIN
  -- Vérifier la limite
  SELECT (public.check_ai_post_limit(org_id)->>'can_generate')::boolean INTO v_can_gen;

  IF NOT v_can_gen THEN
    RETURN false;
  END IF;

  -- Déterminer la limite pour l'upsert
  SELECT * INTO v_sub FROM public.subscriptions WHERE organization_id = org_id;
  v_limit := CASE
    WHEN v_sub.status = 'trialing' AND v_sub.trial_ends_at > NOW() THEN 8
    WHEN v_sub.plan_id = 'solo'    THEN 8
    WHEN v_sub.plan_id = 'pro'     THEN 25
    ELSE 1
  END;

  -- Incrémenter ou créer l'entrée du mois
  INSERT INTO public.usage_tracking (
    organization_id,
    period_start,
    period_end,
    ai_posts_used,
    ai_posts_limit
  ) VALUES (
    org_id,
    date_trunc('month', CURRENT_DATE)::date,
    (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day')::date,
    1,
    v_limit
  )
  ON CONFLICT (organization_id, period_start)
  DO UPDATE SET
    ai_posts_used = public.usage_tracking.ai_posts_used + 1,
    updated_at    = NOW();

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_ai_post_usage(uuid) TO authenticated;

-- ── 6. Function init_trial_subscription ──────────────────────────────────────
-- Appelée après la création d'une nouvelle organisation (onboarding)

CREATE OR REPLACE FUNCTION public.init_trial_subscription(org_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_month_start date := date_trunc('month', CURRENT_DATE)::date;
  v_month_end   date := (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day')::date;
BEGIN
  -- Créer la subscription trial Solo 30 jours
  INSERT INTO public.subscriptions (
    organization_id,
    plan_id,
    status,
    trial_ends_at,
    trial_used
  ) VALUES (
    org_id,
    'solo',
    'trialing',
    NOW() + INTERVAL '30 days',
    true
  )
  ON CONFLICT (organization_id) DO NOTHING;

  -- Mettre à jour les limites de l'organisation
  UPDATE public.organizations
  SET
    max_posts_per_month = 8,
    max_active_programs = 1,
    subscription_plan   = 'solo'
  WHERE id = org_id;

  -- Initialiser le tracking du mois courant
  INSERT INTO public.usage_tracking (
    organization_id,
    period_start,
    period_end,
    ai_posts_used,
    ai_posts_limit
  ) VALUES (
    org_id,
    v_month_start,
    v_month_end,
    0,
    8
  )
  ON CONFLICT (organization_id, period_start) DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION public.init_trial_subscription(uuid) TO authenticated;

-- ── 7. Créer les subscriptions pour les organisations existantes ──────────────
-- (organisations sans subscription = traiter comme trial expiré → free)

INSERT INTO public.subscriptions (
  organization_id,
  plan_id,
  status,
  trial_used
)
SELECT
  o.id,
  CASE o.subscription_plan
    WHEN 'solo' THEN 'solo'
    WHEN 'pro'  THEN 'pro'
    ELSE 'free'
  END,
  CASE o.subscription_plan
    WHEN 'solo' THEN 'active'
    WHEN 'pro'  THEN 'active'
    ELSE 'free'
  END,
  true   -- trial_used = true pour les orgs existantes
FROM public.organizations o
WHERE o.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.subscriptions s WHERE s.organization_id = o.id
  );

-- Initialiser usage_tracking pour les organisations existantes (mois courant)
INSERT INTO public.usage_tracking (
  organization_id,
  period_start,
  period_end,
  ai_posts_used,
  ai_posts_limit
)
SELECT
  o.id,
  date_trunc('month', CURRENT_DATE)::date,
  (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day')::date,
  -- Compter les posts publiés ce mois comme usage existant
  (
    SELECT COUNT(*)::int FROM public.posts p
    WHERE p.organization_id = o.id
      AND p.status = 'published'
      AND p.published_at >= date_trunc('month', CURRENT_DATE)
      AND p.deleted_at IS NULL
  ),
  o.max_posts_per_month
FROM public.organizations o
WHERE o.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.usage_tracking ut
    WHERE ut.organization_id = o.id
      AND ut.period_start = date_trunc('month', CURRENT_DATE)::date
  );

-- ── 8. pg_cron : expiration automatique des trials (chaque jour à 02:00 UTC) ──
-- Nécessite l'extension pg_cron activée dans Supabase (Integrations → pg_cron)
-- Si pg_cron n'est pas disponible, cette partie peut être exécutée manuellement.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) THEN
    PERFORM cron.schedule(
      'expire-trials',
      '0 2 * * *',
      $cron$
        -- Basculer les trials expirés sur le plan Free
        UPDATE public.subscriptions
        SET
          status    = 'free',
          plan_id   = 'free',
          updated_at = NOW()
        WHERE status = 'trialing'
          AND trial_ends_at < NOW();

        -- Synchroniser les limites dans organizations
        UPDATE public.organizations o
        SET
          max_posts_per_month = 1,
          max_active_programs = 0,
          subscription_plan   = 'free'
        FROM public.subscriptions s
        WHERE s.organization_id = o.id
          AND s.plan_id = 'free'
          AND s.status  = 'free'
          AND (o.max_posts_per_month != 1 OR o.max_active_programs != 0);
      $cron$
    );
  END IF;
END;
$$;

-- ── Note : si pg_cron non disponible, exécuter manuellement ce cron via n8n ──
-- Workflow n8n "Expire Trials" (schedule quotidien) appelle la RPC expire_trials()

CREATE OR REPLACE FUNCTION public.expire_trials()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.subscriptions
  SET status = 'free', plan_id = 'free', updated_at = NOW()
  WHERE status = 'trialing' AND trial_ends_at < NOW();

  UPDATE public.organizations o
  SET
    max_posts_per_month = 1,
    max_active_programs = 0,
    subscription_plan   = 'free'
  FROM public.subscriptions s
  WHERE s.organization_id = o.id
    AND s.plan_id  = 'free'
    AND s.status   = 'free'
    AND (o.max_posts_per_month != 1 OR o.max_active_programs != 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.expire_trials() TO authenticated;
