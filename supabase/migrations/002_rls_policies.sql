-- ============================================================
-- PostPilot — Migration 002 : RLS Policies
-- ============================================================
-- Architecture des policies :
--
--   • Toutes les policies s'appliquent au rôle `authenticated`.
--     Le rôle `service_role` (utilisé par n8n) bypasse le RLS nativement.
--
--   • Helper SECURITY DEFINER → évite la récursivité sur
--     organization_members (la fonction bypass le RLS quand
--     elle s'auto-interroge pour évaluer une policy).
--
--   • Cas spécial organizations : la PK est `id`, pas
--     `organization_id`, donc is_member_of(id).
--
--   • Cas spécial notifications : double filtre
--     organization_id (membership) + user_id = auth.uid().
--
--   • Règle d'écriture pour tables analytiques (post_analytics) :
--     uniquement via service_role (n8n) → pas de policy INSERT/
--     UPDATE/DELETE pour authenticated.
-- ============================================================

-- ============================================================
-- SECTION 1 — Fonctions helper (SECURITY DEFINER)
-- ============================================================
-- SECURITY DEFINER : s'exécute avec les droits du propriétaire
-- de la fonction (postgres), bypass RLS → pas de récursivité.
-- SET search_path = '' : bonne pratique de sécurité (évite
-- le search_path hijacking).
-- ============================================================

-- is_member_of : l'utilisateur courant est-il membre de l'org ?
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

-- is_admin_or_owner_of : membre avec rôle 'admin' ou 'owner' ?
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

-- is_owner_of : membre avec rôle 'owner' uniquement ?
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

-- ============================================================
-- SECTION 2 — Trigger bootstrap : owner membership
-- ============================================================
-- Quand un utilisateur crée une organisation, il devient
-- automatiquement 'owner' via ce trigger SECURITY DEFINER.
-- Ce trigger bypass le RLS → pas de chicken-and-egg.
-- ============================================================

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

CREATE TRIGGER on_organization_created
    AFTER INSERT ON public.organizations
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_organization();

-- ============================================================
-- SECTION 3 — TABLE : organizations
-- ============================================================
-- SELECT  : être membre (via organization_members)
-- INSERT  : tout utilisateur authentifié peut créer une org
--           (le trigger ci-dessus le rend owner immédiatement)
-- UPDATE  : admin ou owner uniquement
-- DELETE  : owner uniquement (soft delete préféré via deleted_at)
-- ============================================================

CREATE POLICY "org_select"
    ON public.organizations
    FOR SELECT
    TO authenticated
    USING (
        public.is_member_of(id)
        AND deleted_at IS NULL
    );

CREATE POLICY "org_insert"
    ON public.organizations
    FOR INSERT
    TO authenticated
    WITH CHECK (true);  -- Le trigger garantit le membership owner

CREATE POLICY "org_update"
    ON public.organizations
    FOR UPDATE
    TO authenticated
    USING   (public.is_admin_or_owner_of(id))
    WITH CHECK (public.is_admin_or_owner_of(id));

CREATE POLICY "org_delete"
    ON public.organizations
    FOR DELETE
    TO authenticated
    USING (public.is_owner_of(id));

-- ============================================================
-- SECTION 4 — TABLE : organization_members
-- ============================================================
-- SELECT  : tout membre voit les autres membres de son org
-- INSERT  : admin/owner ajoute un membre
--           (le trigger bootstrap bypass ce check pour le 1er owner)
-- UPDATE  : admin/owner change les rôles
-- DELETE  : admin/owner expulse OU l'utilisateur se retire lui-même
-- ============================================================

CREATE POLICY "members_select"
    ON public.organization_members
    FOR SELECT
    TO authenticated
    USING (public.is_member_of(organization_id));

CREATE POLICY "members_insert"
    ON public.organization_members
    FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin_or_owner_of(organization_id));

CREATE POLICY "members_update"
    ON public.organization_members
    FOR UPDATE
    TO authenticated
    USING   (public.is_admin_or_owner_of(organization_id))
    WITH CHECK (public.is_admin_or_owner_of(organization_id));

CREATE POLICY "members_delete"
    ON public.organization_members
    FOR DELETE
    TO authenticated
    USING (
        public.is_admin_or_owner_of(organization_id)
        OR user_id = auth.uid()   -- un membre peut quitter lui-même
    );

-- ============================================================
-- SECTION 5 — TABLE : brand_profiles
-- ============================================================
-- Tout membre peut lire et modifier le profil de marque.
-- Suppression réservée aux admin/owner.
-- ============================================================

CREATE POLICY "brand_profiles_select"
    ON public.brand_profiles
    FOR SELECT
    TO authenticated
    USING (public.is_member_of(organization_id));

CREATE POLICY "brand_profiles_insert"
    ON public.brand_profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (public.is_member_of(organization_id));

CREATE POLICY "brand_profiles_update"
    ON public.brand_profiles
    FOR UPDATE
    TO authenticated
    USING   (public.is_member_of(organization_id))
    WITH CHECK (public.is_member_of(organization_id));

CREATE POLICY "brand_profiles_delete"
    ON public.brand_profiles
    FOR DELETE
    TO authenticated
    USING (public.is_admin_or_owner_of(organization_id));

-- ============================================================
-- SECTION 6 — TABLE : documents
-- ============================================================
-- SELECT  : membres uniquement, exclut les soft-deleted
-- INSERT  : tout membre peut uploader un document
-- UPDATE  : tout membre peut renommer / modifier
-- DELETE  : tout membre (soft delete via deleted_at préféré)
-- ============================================================

CREATE POLICY "documents_select"
    ON public.documents
    FOR SELECT
    TO authenticated
    USING (
        public.is_member_of(organization_id)
        AND deleted_at IS NULL
    );

CREATE POLICY "documents_insert"
    ON public.documents
    FOR INSERT
    TO authenticated
    WITH CHECK (public.is_member_of(organization_id));

CREATE POLICY "documents_update"
    ON public.documents
    FOR UPDATE
    TO authenticated
    USING   (public.is_member_of(organization_id))
    WITH CHECK (public.is_member_of(organization_id));

CREATE POLICY "documents_delete"
    ON public.documents
    FOR DELETE
    TO authenticated
    USING (public.is_member_of(organization_id));

-- ============================================================
-- SECTION 7 — TABLE : platforms
-- ============================================================
-- Contient oauth_tokens (données sensibles) — écriture
-- réservée aux admin/owner. Lecture ouverte aux membres
-- (le frontend n'affiche jamais les raw tokens).
-- n8n (service_role) lit et met à jour les tokens librement.
-- ============================================================

CREATE POLICY "platforms_select"
    ON public.platforms
    FOR SELECT
    TO authenticated
    USING (public.is_member_of(organization_id));

CREATE POLICY "platforms_insert"
    ON public.platforms
    FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin_or_owner_of(organization_id));

CREATE POLICY "platforms_update"
    ON public.platforms
    FOR UPDATE
    TO authenticated
    USING   (public.is_admin_or_owner_of(organization_id))
    WITH CHECK (public.is_admin_or_owner_of(organization_id));

CREATE POLICY "platforms_delete"
    ON public.platforms
    FOR DELETE
    TO authenticated
    USING (public.is_admin_or_owner_of(organization_id));

-- ============================================================
-- SECTION 8 — TABLE : posts
-- ============================================================
-- SELECT  : membres uniquement, exclut les soft-deleted
-- INSERT  : tout membre peut créer un post
-- UPDATE  : tout membre peut modifier (statuts, contenu)
-- DELETE  : tout membre (soft delete via deleted_at préféré)
-- ============================================================

CREATE POLICY "posts_select"
    ON public.posts
    FOR SELECT
    TO authenticated
    USING (
        public.is_member_of(organization_id)
        AND deleted_at IS NULL
    );

CREATE POLICY "posts_insert"
    ON public.posts
    FOR INSERT
    TO authenticated
    WITH CHECK (public.is_member_of(organization_id));

CREATE POLICY "posts_update"
    ON public.posts
    FOR UPDATE
    TO authenticated
    USING   (public.is_member_of(organization_id))
    WITH CHECK (public.is_member_of(organization_id));

CREATE POLICY "posts_delete"
    ON public.posts
    FOR DELETE
    TO authenticated
    USING (public.is_member_of(organization_id));

-- ============================================================
-- SECTION 9 — TABLE : post_versions
-- ============================================================
-- Versions immuables — pas de UPDATE ni DELETE pour le front.
-- n8n insère les versions via service_role (bypass RLS).
-- Le frontend peut aussi insérer (sauvegarde manuelle).
-- ============================================================

CREATE POLICY "post_versions_select"
    ON public.post_versions
    FOR SELECT
    TO authenticated
    USING (public.is_member_of(organization_id));

CREATE POLICY "post_versions_insert"
    ON public.post_versions
    FOR INSERT
    TO authenticated
    WITH CHECK (public.is_member_of(organization_id));

-- Pas de policy UPDATE : les versions sont immuables
-- Pas de policy DELETE : l'historique est conservé

-- ============================================================
-- SECTION 10 — TABLE : post_analytics
-- ============================================================
-- Ecriture UNIQUEMENT via service_role (workflow n8n 04).
-- Le frontend lit uniquement → SELECT pour authenticated.
-- ============================================================

CREATE POLICY "post_analytics_select"
    ON public.post_analytics
    FOR SELECT
    TO authenticated
    USING (public.is_member_of(organization_id));

-- Pas de policy INSERT/UPDATE/DELETE pour authenticated :
-- seul service_role (n8n) écrit les analytics.

-- ============================================================
-- SECTION 11 — TABLE : post_feedback
-- ============================================================
-- Feedback immuable — pas de UPDATE ni DELETE.
-- Tout membre peut soumettre et lire les feedbacks.
-- ============================================================

CREATE POLICY "post_feedback_select"
    ON public.post_feedback
    FOR SELECT
    TO authenticated
    USING (public.is_member_of(organization_id));

CREATE POLICY "post_feedback_insert"
    ON public.post_feedback
    FOR INSERT
    TO authenticated
    WITH CHECK (public.is_member_of(organization_id));

-- Pas de policy UPDATE/DELETE : le feedback est immuable

-- ============================================================
-- SECTION 12 — TABLE : rss_feeds
-- ============================================================
-- Lecture ouverte aux membres.
-- Gestion (ajout/modif/suppression) réservée aux admin/owner.
-- ============================================================

CREATE POLICY "rss_feeds_select"
    ON public.rss_feeds
    FOR SELECT
    TO authenticated
    USING (public.is_member_of(organization_id));

CREATE POLICY "rss_feeds_insert"
    ON public.rss_feeds
    FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin_or_owner_of(organization_id));

CREATE POLICY "rss_feeds_update"
    ON public.rss_feeds
    FOR UPDATE
    TO authenticated
    USING   (public.is_admin_or_owner_of(organization_id))
    WITH CHECK (public.is_admin_or_owner_of(organization_id));

CREATE POLICY "rss_feeds_delete"
    ON public.rss_feeds
    FOR DELETE
    TO authenticated
    USING (public.is_admin_or_owner_of(organization_id));

-- ============================================================
-- SECTION 13 — TABLE : calendar_events
-- ============================================================
-- Tout membre peut gérer les événements du calendrier.
-- ============================================================

CREATE POLICY "calendar_events_select"
    ON public.calendar_events
    FOR SELECT
    TO authenticated
    USING (public.is_member_of(organization_id));

CREATE POLICY "calendar_events_insert"
    ON public.calendar_events
    FOR INSERT
    TO authenticated
    WITH CHECK (public.is_member_of(organization_id));

CREATE POLICY "calendar_events_update"
    ON public.calendar_events
    FOR UPDATE
    TO authenticated
    USING   (public.is_member_of(organization_id))
    WITH CHECK (public.is_member_of(organization_id));

CREATE POLICY "calendar_events_delete"
    ON public.calendar_events
    FOR DELETE
    TO authenticated
    USING (public.is_member_of(organization_id));

-- ============================================================
-- SECTION 14 — TABLE : notifications
-- ============================================================
-- Double filtre : membership org + user_id = auth.uid()
--   → un membre ne voit QUE ses propres notifications,
--     même s'il appartient à plusieurs organisations.
--
-- INSERT  : service_role uniquement (n8n crée les notifs)
-- UPDATE  : l'utilisateur marque ses propres notifs comme lues
-- DELETE  : l'utilisateur supprime ses propres notifs
-- ============================================================

CREATE POLICY "notifications_select"
    ON public.notifications
    FOR SELECT
    TO authenticated
    USING (
        public.is_member_of(organization_id)
        AND user_id = auth.uid()
    );

-- Pas de policy INSERT pour authenticated :
-- seul service_role (n8n) crée les notifications.

CREATE POLICY "notifications_update"
    ON public.notifications
    FOR UPDATE
    TO authenticated
    USING   (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "notifications_delete"
    ON public.notifications
    FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());
