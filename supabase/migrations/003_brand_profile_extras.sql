-- ============================================================
-- Migration 003 : brand_profile_extras
-- Ajout des colonnes supplémentaires pour le wizard d'onboarding Sprint 1
-- ============================================================

ALTER TABLE brand_profiles
  ADD COLUMN IF NOT EXISTS emoji_style         smallint     NOT NULL DEFAULT 2,
  -- 0 = aucun emoji, 5 = beaucoup d'emojis

  ADD COLUMN IF NOT EXISTS post_length         text         NOT NULL DEFAULT 'medium',
  -- 'short' (~300 car.) | 'medium' (~800 car.) | 'long' (~2000 car.)

  ADD COLUMN IF NOT EXISTS signature           text,
  -- accroche / signature finale (ex: "💡 Christopher, CEO @Acme")

  ADD COLUMN IF NOT EXISTS keywords_avoid      text[]       NOT NULL DEFAULT '{}',
  -- mots / expressions à NE PAS utiliser

  ADD COLUMN IF NOT EXISTS hashtags_preferred  text[]       NOT NULL DEFAULT '{}',
  -- liste de hashtags favoris (sans le #)

  ADD COLUMN IF NOT EXISTS hashtag_strategy    text         NOT NULL DEFAULT 'medium',
  -- 'none' | 'few' (1-3) | 'medium' (4-7) | 'many' (8+)

  ADD COLUMN IF NOT EXISTS ctas_preferred      text[]       NOT NULL DEFAULT '{}';
  -- formules CTA préférées (ex: "Dites-moi en commentaires…")

-- Contrainte CHECK sur les valeurs acceptées
ALTER TABLE brand_profiles
  ADD CONSTRAINT chk_post_length
    CHECK (post_length IN ('short', 'medium', 'long')),
  ADD CONSTRAINT chk_hashtag_strategy
    CHECK (hashtag_strategy IN ('none', 'few', 'medium', 'many')),
  ADD CONSTRAINT chk_emoji_style
    CHECK (emoji_style BETWEEN 0 AND 5);

COMMENT ON COLUMN brand_profiles.emoji_style        IS '0 = aucun emoji, 5 = beaucoup';
COMMENT ON COLUMN brand_profiles.post_length        IS 'short | medium | long';
COMMENT ON COLUMN brand_profiles.signature          IS 'Accroche / signature finale du post';
COMMENT ON COLUMN brand_profiles.keywords_avoid     IS 'Mots à éviter dans les posts';
COMMENT ON COLUMN brand_profiles.hashtags_preferred IS 'Hashtags favoris (sans #)';
COMMENT ON COLUMN brand_profiles.hashtag_strategy   IS 'none | few | medium | many';
COMMENT ON COLUMN brand_profiles.ctas_preferred     IS 'Formules CTA préférées';
