-- Migration 013 — Création de la bucket Supabase Storage "post-media"
-- Bucket publique pour les images et vidéos attachées aux posts LinkedIn

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'post-media',
  'post-media',
  true,                     -- publique : les URLs sont accessibles sans auth
  52428800,                 -- 50 MB max par fichier
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/quicktime'
  ]
)
ON CONFLICT (id) DO UPDATE
  SET public = true,
      file_size_limit = 52428800;

-- Policy : upload autorisé pour les membres authentifiés
CREATE POLICY "Authenticated users can upload media"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'post-media');

-- Policy : lecture publique (les images sont accessibles sans auth pour LinkedIn)
CREATE POLICY "Public read access on post-media"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'post-media');

-- Policy : suppression autorisée pour le propriétaire du fichier
CREATE POLICY "Owners can delete their media"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'post-media' AND auth.uid() = owner);
