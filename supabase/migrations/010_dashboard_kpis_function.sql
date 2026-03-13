-- PostPilot — Migration 010 : Fonction get_dashboard_kpis
--
-- Retourne tous les KPIs du dashboard en une seule requête RPC.
-- Colonnes réelles de post_analytics : likes_count, comments_count,
-- shares_count, impressions_count, collected_at.

CREATE OR REPLACE FUNCTION public.get_dashboard_kpis(org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  result        jsonb;
  published_cnt int;
  max_posts     int;
  to_write      int;
  views_current bigint;
  views_prev    bigint;
  eng_current   numeric;
  eng_prev      numeric;
BEGIN
  -- Vérification d'accès
  IF NOT public.is_member_of(org_id) THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;

  -- Publiés ce mois
  SELECT COUNT(*) INTO published_cnt
  FROM public.posts
  WHERE organization_id = org_id
    AND status = 'published'
    AND published_at >= date_trunc('month', CURRENT_DATE)
    AND deleted_at IS NULL;

  -- Max posts
  SELECT max_posts_per_month INTO max_posts
  FROM public.organizations
  WHERE id = org_id;

  -- À rédiger cette semaine
  SELECT COUNT(*) INTO to_write
  FROM public.posts
  WHERE organization_id = org_id
    AND status IN ('waiting', 'draft')
    AND scheduled_at >= CURRENT_DATE
    AND scheduled_at < CURRENT_DATE + interval '7 days'
    AND deleted_at IS NULL;

  -- Vues ce mois
  SELECT COALESCE(SUM(pa.impressions_count), 0) INTO views_current
  FROM public.post_analytics pa
  JOIN public.posts p ON pa.post_id = p.id
  WHERE p.organization_id = org_id
    AND pa.collected_at >= date_trunc('month', CURRENT_DATE);

  -- Vues mois précédent
  SELECT COALESCE(SUM(pa.impressions_count), 0) INTO views_prev
  FROM public.post_analytics pa
  JOIN public.posts p ON pa.post_id = p.id
  WHERE p.organization_id = org_id
    AND pa.collected_at >= date_trunc('month', CURRENT_DATE) - interval '1 month'
    AND pa.collected_at < date_trunc('month', CURRENT_DATE);

  -- Engagement ce mois
  SELECT
    CASE WHEN SUM(pa.impressions_count) > 0
      THEN ROUND(
        (SUM(pa.likes_count + pa.comments_count + pa.shares_count)::numeric
         / SUM(pa.impressions_count)) * 100, 1
      )
      ELSE NULL
    END INTO eng_current
  FROM public.post_analytics pa
  JOIN public.posts p ON pa.post_id = p.id
  WHERE p.organization_id = org_id
    AND pa.collected_at >= date_trunc('month', CURRENT_DATE);

  -- Engagement mois précédent
  SELECT
    CASE WHEN SUM(pa.impressions_count) > 0
      THEN ROUND(
        (SUM(pa.likes_count + pa.comments_count + pa.shares_count)::numeric
         / SUM(pa.impressions_count)) * 100, 1
      )
      ELSE NULL
    END INTO eng_prev
  FROM public.post_analytics pa
  JOIN public.posts p ON pa.post_id = p.id
  WHERE p.organization_id = org_id
    AND pa.collected_at >= date_trunc('month', CURRENT_DATE) - interval '1 month'
    AND pa.collected_at < date_trunc('month', CURRENT_DATE);

  result := jsonb_build_object(
    'published_this_month', published_cnt,
    'max_posts_per_month',  COALESCE(max_posts, 0),
    'to_write_this_week',   to_write,
    'views_this_month',     CASE WHEN views_current > 0 THEN views_current ELSE NULL END,
    'views_trend',          CASE WHEN views_prev > 0
                              THEN ROUND(((views_current - views_prev)::numeric / views_prev) * 100)
                              ELSE NULL
                            END,
    'engagement_rate',      eng_current,
    'engagement_trend',     CASE WHEN eng_prev IS NOT NULL AND eng_prev > 0 AND eng_current IS NOT NULL
                              THEN ROUND(((eng_current - eng_prev) / eng_prev) * 100)
                              ELSE NULL
                            END
  );

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_dashboard_kpis(uuid) TO authenticated;
