-- PostPilot — Migration 009 : Fix soft-delete des posts
--
-- Problème racine : PostgreSQL applique implicitement les SELECT policies lors
-- d'un UPDATE. La posts_select policy a "deleted_at IS NULL" dans USING.
-- Quand on SET deleted_at = now(), la nouvelle row ne satisfait plus la SELECT
-- policy → PostgreSQL lève "new row violates row-level security policy".
--
-- Solution : fonction SECURITY DEFINER qui contourne le RLS tout en vérifiant
-- l'autorisation manuellement (membership + post trouvable).
-- La posts_update policy a aussi été corrigée (sous-requête directe).

-- ── 1. Correction posts_update (déjà exécutée) ─────────────────────────────

DROP POLICY IF EXISTS "posts_update" ON public.posts;

CREATE POLICY "posts_update"
    ON public.posts
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.organization_members
            WHERE organization_id = posts.organization_id
              AND user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.organization_members
            WHERE organization_id = posts.organization_id
              AND user_id = auth.uid()
        )
    );

-- ── 2. Fonction soft_delete_post ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.soft_delete_post(post_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_org_id uuid;
BEGIN
  SELECT organization_id INTO v_org_id
  FROM public.posts
  WHERE id = post_id AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Post introuvable';
  END IF;

  IF NOT public.is_member_of(v_org_id) THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;

  UPDATE public.posts
  SET deleted_at = NOW()
  WHERE id = post_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.soft_delete_post(uuid) TO authenticated;
