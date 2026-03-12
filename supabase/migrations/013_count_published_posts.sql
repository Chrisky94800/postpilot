-- Migration 013 : Compter les posts publiés ce mois (et non les générations IA)
--
-- Avant : check_ai_post_limit lisait usage_tracking.ai_posts_used
--         incrémenté à chaque appel à generate-post
-- Après : compte directement posts.status = 'published' ce mois calendaire
--         → plus intuitif : le quota = posts effectivement publiés

CREATE OR REPLACE FUNCTION public.check_ai_post_limit(org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_sub   record;
  v_limit int;
  v_used  int;
BEGIN
  -- Récupérer la subscription
  SELECT * INTO v_sub
  FROM public.subscriptions
  WHERE organization_id = org_id;

  IF NOT FOUND THEN
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

  -- Limite selon le plan
  v_limit := CASE
    WHEN v_sub.status = 'trialing' AND v_sub.trial_ends_at > NOW() THEN 8
    WHEN v_sub.plan_id = 'solo'    THEN 8
    WHEN v_sub.plan_id = 'pro'     THEN 25
    ELSE 1
  END;

  -- Compter les posts publiés ce mois calendaire
  SELECT COUNT(*) INTO v_used
  FROM public.posts
  WHERE organization_id = org_id
    AND status = 'published'
    AND published_at >= date_trunc('month', CURRENT_DATE)
    AND published_at <  date_trunc('month', CURRENT_DATE) + INTERVAL '1 month'
    AND deleted_at IS NULL;

  RETURN jsonb_build_object(
    'used',          v_used,
    'limit',         v_limit,
    'remaining',     GREATEST(0, v_limit - v_used),
    'can_generate',  v_used < v_limit,
    'plan_id',       v_sub.plan_id,
    'status',        v_sub.status,
    'trial_ends_at', v_sub.trial_ends_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_ai_post_limit(uuid) TO authenticated;
