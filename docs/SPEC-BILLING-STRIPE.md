# SPEC TECHNIQUE — Système de facturation PostPilot

> Ce fichier est la référence complète pour Claude Code.
> Il couvre : Stripe, Supabase, logique métier, frontend app, et landing page.

---

## 1. PARCOURS UTILISATEUR

```
Inscription (Google OAuth)
       │
       ▼
  Trial Solo 30 jours
  (8 posts IA/mois, toutes les features Solo)
       │
       ├── Le user paie avant la fin ──► Plan Solo ou Pro activé
       │
       └── 30 jours écoulés, pas de paiement ──► Bascule sur Gratuit
                                                  (1 post IA/mois, features limitées)
                                                  Il peut upgrade à tout moment
```

**Règles clés :**
- Aucune CB demandée à l'inscription
- Le trial commence automatiquement
- Pendant le trial, le user voit un bandeau "Trial Solo — X jours restants"
- À J-7, J-3 et J-1 : notification "Votre trial expire bientôt"
- Après expiration : bascule silencieuse sur Gratuit + notification "Votre trial est terminé"
- Le user peut upgrade à tout moment (trial ou gratuit → payant)
- Le user peut choisir mensuel ou annuel au moment de payer

---

## 2. LES 3 PLANS — DÉFINITION EXACTE

### Plan GRATUIT (plan_id: `free`)
```
Prix : 0€
Posts IA / mois : 1
Assistant conversationnel : ✅
Rédaction libre + optimisation IA : ✅
Génération depuis URL : ❌
Génération depuis document : ❌
Skill LinkedIn intégrée : ❌
Programmes de communication : ❌ (0)
Calendrier éditorial : ❌
Heures publication personnalisées : ❌
Publication auto LinkedIn : ✅
Profil de marque complet : ✅
Override par post : ❌
Vues & engagement par post : ❌
Dashboard KPIs : ✅ (basique = seulement "Publiés ce mois" et "À rédiger")
Tendances mois par mois : ❌
Utilisateurs : 1
Organisations : 1
Support email : ✅
Support prioritaire : ❌
Onboarding personnalisé : ❌
```

### Plan SOLO (plan_id: `solo`)
```
Prix mensuel : 9€/mois
Prix annuel : 7€/mois (84€/an, facturé en une fois)
Posts IA / mois : 8
Assistant conversationnel : ✅
Rédaction libre + optimisation IA : ✅
Génération depuis URL : ✅
Génération depuis document : ❌
Skill LinkedIn intégrée : ✅
Programmes de communication : 1 actif
Calendrier éditorial : ✅
Heures publication personnalisées : ✅
Publication auto LinkedIn : ✅
Profil de marque complet : ✅
Override par post : ✅
Vues & engagement par post : ✅
Dashboard KPIs : ✅ (complet = 4 KPIs + tendances)
Tendances mois par mois : ✅
Utilisateurs : 1
Organisations : 1
Support email : ✅
Support prioritaire : ❌
Onboarding personnalisé : ❌
```

### Plan PRO (plan_id: `pro`)
```
Prix mensuel : 19€/mois
Prix annuel : 15€/mois (180€/an, facturé en une fois)
Posts IA / mois : 25
Assistant conversationnel : ✅
Rédaction libre + optimisation IA : ✅
Génération depuis URL : ✅
Génération depuis document : ✅
Skill LinkedIn intégrée : ✅
Programmes de communication : 3 actifs
Calendrier éditorial : ✅
Heures publication personnalisées : ✅
Publication auto LinkedIn : ✅
Profil de marque complet : ✅
Override par post : ✅
Vues & engagement par post : ✅
Dashboard KPIs : ✅ (complet)
Tendances mois par mois : ✅
Utilisateurs : 1
Organisations : 1
Support email : ✅
Support prioritaire : ✅
Onboarding personnalisé : ✅ (30 min offert)
```

---

## 3. STRIPE — CONFIGURATION

### 3.1 Produits à créer dans Stripe

Créer 2 produits Stripe (le plan Gratuit n'a pas de produit Stripe) :

```
Produit 1: "PostPilot Solo"
  - Price mensuel : 9,00€ / mois (recurring, EUR)
  - Price annuel  : 84,00€ / an (recurring, EUR)

Produit 2: "PostPilot Pro"
  - Price mensuel : 19,00€ / mois (recurring, EUR)
  - Price annuel  : 180,00€ / an (recurring, EUR)
```

### 3.2 Stripe Checkout Flow

Le user clique "Upgrade" → on crée une Stripe Checkout Session → le user paie → webhook confirme → plan activé.

**PAS d'abonnement Stripe pendant le trial.** Le trial est géré en interne (colonne `trial_ends_at` dans Supabase). On ne crée l'abonnement Stripe que quand le user paie.

### 3.3 Webhooks Stripe à écouter

Créer un endpoint : `POST /webhook/stripe`

Événements à traiter :

```
checkout.session.completed     → Activer l'abonnement
invoice.paid                   → Renouvellement réussi
invoice.payment_failed         → Marquer comme impayé, notifier le user
customer.subscription.updated  → Changement de plan (upgrade/downgrade)
customer.subscription.deleted  → Annulation, basculer sur Gratuit
```

### 3.4 Portail Client Stripe

Utiliser le Stripe Customer Portal pour :
- Changer de plan (Solo ↔ Pro)
- Changer de cycle (mensuel ↔ annuel)
- Mettre à jour la CB
- Annuler l'abonnement

Config : `stripe.billingPortal.sessions.create()`

---

## 4. SUPABASE — TABLES

### 4.1 Nouvelle table `subscriptions`

```sql
CREATE TABLE subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Plan actuel
  plan_id text NOT NULL DEFAULT 'free' CHECK (plan_id IN ('free', 'solo', 'pro')),
  billing_cycle text CHECK (billing_cycle IN ('monthly', 'yearly', NULL)),
  
  -- Trial
  trial_ends_at timestamptz,         -- NULL = pas de trial en cours
  trial_used boolean DEFAULT false,   -- true = le user a déjà utilisé son trial (1 seul trial par org)
  
  -- Stripe
  stripe_customer_id text,            -- Stripe Customer ID
  stripe_subscription_id text,        -- Stripe Subscription ID (NULL si gratuit ou trial)
  stripe_price_id text,               -- Stripe Price ID actuel
  
  -- Statut
  status text NOT NULL DEFAULT 'trialing' CHECK (status IN ('trialing', 'active', 'past_due', 'canceled', 'free')),
  -- trialing : en période d'essai
  -- active   : abonnement payant actif
  -- past_due : paiement échoué (grâce de 7 jours)
  -- canceled : annulé par le user (reste actif jusqu'à fin de période)
  -- free     : plan gratuit (pas d'abonnement Stripe)
  
  current_period_start timestamptz,
  current_period_end timestamptz,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(organization_id)
);

-- Index
CREATE INDEX idx_subscriptions_org ON subscriptions(organization_id);
CREATE INDEX idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);
CREATE INDEX idx_subscriptions_stripe_sub ON subscriptions(stripe_subscription_id);

-- RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own org subscription"
  ON subscriptions FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  ));
```

### 4.2 Nouvelle table `usage_tracking`

```sql
CREATE TABLE usage_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  period_start date NOT NULL,         -- 1er du mois
  period_end date NOT NULL,           -- dernier du mois
  
  ai_posts_used int NOT NULL DEFAULT 0,
  ai_posts_limit int NOT NULL,        -- 1, 8 ou 25 selon le plan
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(organization_id, period_start)
);

-- RLS
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own org usage"
  ON usage_tracking FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  ));
```

### 4.3 Modifier la table `organizations`

```sql
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS max_posts_per_month int NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS max_active_programs int NOT NULL DEFAULT 0;
```

### 4.4 Function SQL : vérifier les limites

```sql
CREATE OR REPLACE FUNCTION check_ai_post_limit(org_id uuid)
RETURNS jsonb AS $$
DECLARE
  current_usage int;
  current_limit int;
  sub_record record;
BEGIN
  -- Récupérer le plan
  SELECT * INTO sub_record FROM subscriptions WHERE organization_id = org_id;
  
  -- Déterminer la limite
  current_limit := CASE sub_record.plan_id
    WHEN 'free' THEN 1
    WHEN 'solo' THEN 8
    WHEN 'pro' THEN 25
    ELSE 1
  END;
  
  -- Si en trial, utiliser les limites Solo
  IF sub_record.status = 'trialing' AND sub_record.trial_ends_at > now() THEN
    current_limit := 8;
  END IF;
  
  -- Compter l'usage du mois en cours
  SELECT COALESCE(ai_posts_used, 0) INTO current_usage
  FROM usage_tracking
  WHERE organization_id = org_id
  AND period_start = date_trunc('month', CURRENT_DATE)::date;
  
  IF NOT FOUND THEN
    current_usage := 0;
  END IF;
  
  RETURN jsonb_build_object(
    'used', current_usage,
    'limit', current_limit,
    'remaining', GREATEST(current_limit - current_usage, 0),
    'can_generate', current_usage < current_limit,
    'plan_id', sub_record.plan_id,
    'status', sub_record.status,
    'trial_ends_at', sub_record.trial_ends_at
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 4.5 Function SQL : incrémenter l'usage

```sql
CREATE OR REPLACE FUNCTION increment_ai_post_usage(org_id uuid)
RETURNS boolean AS $$
DECLARE
  can_gen boolean;
BEGIN
  -- Vérifier la limite d'abord
  SELECT (check_ai_post_limit(org_id)->>'can_generate')::boolean INTO can_gen;
  
  IF NOT can_gen THEN
    RETURN false;
  END IF;
  
  -- Incrémenter ou créer le tracking du mois
  INSERT INTO usage_tracking (organization_id, period_start, period_end, ai_posts_used, ai_posts_limit)
  VALUES (
    org_id,
    date_trunc('month', CURRENT_DATE)::date,
    (date_trunc('month', CURRENT_DATE) + interval '1 month' - interval '1 day')::date,
    1,
    CASE (SELECT plan_id FROM subscriptions WHERE organization_id = org_id)
      WHEN 'free' THEN 1 WHEN 'solo' THEN 8 WHEN 'pro' THEN 25 ELSE 1
    END
  )
  ON CONFLICT (organization_id, period_start)
  DO UPDATE SET
    ai_posts_used = usage_tracking.ai_posts_used + 1,
    updated_at = now();
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 4.6 Trigger : bascule trial → gratuit

```sql
-- Cron job Supabase (pg_cron) : exécuter chaque jour à 02:00
SELECT cron.schedule(
  'expire-trials',
  '0 2 * * *',
  $$
    UPDATE subscriptions
    SET 
      status = 'free',
      plan_id = 'free',
      updated_at = now()
    WHERE status = 'trialing'
    AND trial_ends_at < now();
    
    -- Mettre à jour les limites dans organizations
    UPDATE organizations o
    SET 
      max_posts_per_month = 1,
      max_active_programs = 0
    FROM subscriptions s
    WHERE s.organization_id = o.id
    AND s.plan_id = 'free'
    AND o.max_posts_per_month != 1;
  $$
);
```

---

## 5. BACKEND — WORKFLOWS N8N

### 5.1 Workflow : Stripe Webhook Handler

```
POST /webhook/stripe
Headers : stripe-signature (vérifier avec le webhook secret)
```

```
Étape 1 : Vérifier la signature Stripe (CRITIQUE pour la sécurité)
Étape 2 : Router selon event.type :

CASE checkout.session.completed :
  - Extraire : customer_id, subscription_id, price_id, metadata.organization_id
  - Déterminer le plan : mapper price_id → 'solo' ou 'pro'
  - Déterminer le cycle : mapper price_id → 'monthly' ou 'yearly'
  - UPDATE subscriptions SET
      plan_id = {plan},
      billing_cycle = {cycle},
      status = 'active',
      stripe_customer_id = {customer_id},
      stripe_subscription_id = {subscription_id},
      stripe_price_id = {price_id},
      trial_ends_at = NULL,
      current_period_start = {subscription.current_period_start},
      current_period_end = {subscription.current_period_end}
    WHERE organization_id = {org_id}
  - UPDATE organizations SET
      max_posts_per_month = CASE plan WHEN 'solo' THEN 8 WHEN 'pro' THEN 25 END,
      max_active_programs = CASE plan WHEN 'solo' THEN 1 WHEN 'pro' THEN 3 END
    WHERE id = {org_id}
  - INSERT notification "Votre abonnement {plan} est activé !"

CASE invoice.paid :
  - Extraire subscription_id
  - UPDATE subscriptions SET
      status = 'active',
      current_period_start = {period_start},
      current_period_end = {period_end}
    WHERE stripe_subscription_id = {subscription_id}

CASE invoice.payment_failed :
  - UPDATE subscriptions SET status = 'past_due'
    WHERE stripe_subscription_id = {subscription_id}
  - INSERT notification "Votre paiement a échoué. Mettez à jour votre moyen de paiement."

CASE customer.subscription.updated :
  - Extraire le nouveau price_id
  - Mapper vers plan_id et billing_cycle
  - UPDATE subscriptions + organizations

CASE customer.subscription.deleted :
  - UPDATE subscriptions SET
      status = 'free',
      plan_id = 'free',
      stripe_subscription_id = NULL,
      stripe_price_id = NULL,
      billing_cycle = NULL
    WHERE stripe_subscription_id = {subscription_id}
  - UPDATE organizations SET
      max_posts_per_month = 1,
      max_active_programs = 0
    WHERE id = {org_id}
  - INSERT notification "Votre abonnement est annulé. Vous êtes sur le plan Gratuit."
```

### 5.2 Workflow : Créer une Checkout Session

```
POST /webhook/create-checkout-session
Body : {
  organization_id,
  price_id,        -- Stripe Price ID (solo_monthly, solo_yearly, pro_monthly, pro_yearly)
  success_url,     -- URL de retour après paiement
  cancel_url       -- URL si le user annule
}

Étapes :
1. Récupérer ou créer le Stripe Customer
   - Si subscriptions.stripe_customer_id existe → l'utiliser
   - Sinon → stripe.customers.create({ email, metadata: { organization_id } })
   - Sauvegarder le customer_id dans subscriptions

2. Créer la Checkout Session
   stripe.checkout.sessions.create({
     customer: customer_id,
     mode: 'subscription',
     line_items: [{ price: price_id, quantity: 1 }],
     success_url: success_url + '?session_id={CHECKOUT_SESSION_ID}',
     cancel_url: cancel_url,
     metadata: { organization_id },
     allow_promotion_codes: true,     -- Pour les codes promo futurs
     billing_address_collection: 'required',
     tax_id_collection: { enabled: true },  -- TVA pour les entreprises FR
   })

3. Retourner { checkout_url: session.url }
```

### 5.3 Workflow : Créer une Billing Portal Session

```
POST /webhook/create-billing-portal
Body : { organization_id }

Étapes :
1. Récupérer stripe_customer_id depuis subscriptions
2. stripe.billingPortal.sessions.create({
     customer: customer_id,
     return_url: 'https://app.postpilot.fr/settings?tab=billing'
   })
3. Retourner { portal_url: session.url }
```

### 5.4 Modifier le Workflow 01 (Rédaction IA)

**AJOUTER au début du workflow :**

```
Étape 0 : Vérifier la limite
  - Appeler Supabase RPC : check_ai_post_limit(organization_id)
  - Si can_generate = false :
    STOP → Retourner { error: 'limit_reached', used: X, limit: Y, plan_id: Z }
  
Étape finale (après génération réussie) : Incrémenter l'usage
  - Appeler Supabase RPC : increment_ai_post_usage(organization_id)
```

### 5.5 Modifier le Workflow 10 (Chat IA)

**Même logique que 5.4** : vérifier la limite avant chaque génération de post.
L'assistant conversationnel lui-même est gratuit (pas de limite sur les messages de chat). La limite s'applique seulement quand l'IA **génère un post** (pas quand elle discute de stratégie).

---

## 6. FRONTEND APP — COMPOSANTS

### 6.1 Hook `useSubscription`

```typescript
type Subscription = {
  plan_id: 'free' | 'solo' | 'pro';
  status: 'trialing' | 'active' | 'past_due' | 'canceled' | 'free';
  billing_cycle: 'monthly' | 'yearly' | null;
  trial_ends_at: string | null;
  trial_days_remaining: number | null;
  current_period_end: string | null;
};

type Usage = {
  used: number;
  limit: number;
  remaining: number;
  can_generate: boolean;
};

function useSubscription(organizationId: string): {
  subscription: Subscription;
  usage: Usage;
  isLoading: boolean;
  isTrial: boolean;
  isFree: boolean;
  isPaid: boolean;
}
```

Ce hook est utilisé PARTOUT dans l'app pour conditionner les features.

### 6.2 Hook `usePlanLimits`

```typescript
// Retourne les features disponibles pour le plan actuel
function usePlanLimits(planId: string): {
  canUseUrl: boolean;           // Solo + Pro
  canUseDocument: boolean;       // Pro uniquement
  canUseSkill: boolean;          // Solo + Pro
  canCreateProgram: boolean;     // Solo (1) + Pro (3)
  maxPrograms: number;           // 0, 1, ou 3
  canUseCalendar: boolean;       // Solo + Pro
  canCustomizeTime: boolean;     // Solo + Pro
  canOverrideProfile: boolean;   // Solo + Pro
  canViewAnalytics: boolean;     // Solo + Pro
  canViewTrends: boolean;        // Solo + Pro
  hasPrioritySupport: boolean;   // Pro uniquement
  hasOnboarding: boolean;        // Pro uniquement
}
```

### 6.3 Bandeau Trial (composant global)

Affiché sur TOUTES les pages pendant le trial :

```
┌──────────────────────────────────────────────────────────────┐
│  🚀 Trial Solo — 23 jours restants    [Choisir un plan →]   │
└──────────────────────────────────────────────────────────────┘
```

- Couleur : bleu clair (informatif)
- À J-7 : passe en orange
- À J-3 : passe en rouge clair
- Le bouton "Choisir un plan" ouvre la page /pricing

Quand trial expiré et plan = gratuit :
```
┌──────────────────────────────────────────────────────────────┐
│  Vous êtes sur le plan Gratuit (1 post IA/mois)  [Upgrade →]│
└──────────────────────────────────────────────────────────────┘
```

### 6.4 Compteur d'usage (sidebar ou dashboard)

Dans la sidebar, sous le nom de l'organisation :

```
Rocket Solution
[Starter]  ← badge du plan

Posts IA : ████████░░ 6/8 ce mois
```

- Barre de progression verte si < 80%
- Orange si >= 80%
- Rouge si = 100% (limite atteinte)

### 6.5 Écran de blocage (limite atteinte)

Quand `can_generate = false` et le user tente de générer un post :

```
┌─────────────────────────────────────────┐
│                                         │
│   Vous avez utilisé vos 8 posts IA     │
│   ce mois.                              │
│                                         │
│   • Passez au Pro pour 25 posts/mois    │
│   • Ou attendez le 1er du mois          │
│     prochain                            │
│                                         │
│   [Passer au Pro — 19€/mois]            │
│                                         │
└─────────────────────────────────────────┘
```

Ce modal apparaît quand :
- Le user clique "Générer" dans l'éditeur de post
- Le user demande à l'assistant de rédiger un post et la limite est atteinte
- L'assistant IA doit répondre : "Vous avez atteint votre limite de X posts ce mois. Passez au Pro pour continuer !"

### 6.6 Verrouillage des features

Quand une feature n'est pas disponible dans le plan actuel, afficher un cadenas :

**Exemple : "Génération depuis un document" sur plan Solo**
```
┌─────────────────────────────────────────┐
│  📄 Depuis un document       🔒        │
│                                         │
│  Disponible avec le plan Pro            │
│  [Passer au Pro →]                      │
└─────────────────────────────────────────┘
```

Le bouton/onglet est visible mais grisé. Clic = tooltip ou modal expliquant le plan requis.

Features à verrouiller :
- Plan Gratuit : URL, document, skill, programmes, calendrier, analytics, override, tendances, heures perso
- Plan Solo : document uniquement

### 6.7 Page `/pricing` (in-app)

Page accessible depuis : bandeau trial, bouton upgrade sidebar, écran de blocage, settings.

```
┌─────────────────────────────────────────────────────────────────┐
│                    Choisissez votre plan                         │
│                                                                  │
│    [Mensuel]  [Annuel — Économisez 22%]     ← toggle            │
│                                                                  │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │ GRATUIT  │  │    SOLO      │  │     PRO      │              │
│  │          │  │  Recommandé  │  │              │              │
│  │  0€/mois │  │  9€/mois     │  │  19€/mois    │              │
│  │          │  │  (7€ annuel) │  │  (15€ annuel)│              │
│  │ 1 post   │  │  8 posts     │  │  25 posts    │              │
│  │  IA/mois │  │   IA/mois    │  │   IA/mois    │              │
│  │          │  │              │  │              │              │
│  │ [liste]  │  │  [liste]     │  │  [liste]     │              │
│  │          │  │              │  │              │              │
│  │ Plan     │  │ [Choisir     │  │ [Choisir     │              │
│  │ actuel   │  │  ce plan]    │  │  ce plan]    │              │
│  └──────────┘  └──────────────┘  └──────────────┘              │
│                                                                  │
│  Tous les plans incluent : assistant IA, publication auto,      │
│  profil de marque, support email                                │
└─────────────────────────────────────────────────────────────────┘
```

**Le plan actuel** a un badge "Plan actuel" à la place du bouton.
**Le plan Solo** a un badge "Recommandé" et une bordure bleue (highlight).
**Toggle mensuel/annuel** : change les prix affichés + ajoute "(soit X€/an)" sous le prix annuel.

Clic sur "Choisir ce plan" → appel `POST /webhook/create-checkout-session` → redirect vers Stripe Checkout.

### 6.8 Page `/settings` — Onglet Facturation

```
Mon abonnement
──────────────────────────────
Plan actuel : Solo
Cycle : Mensuel (9€/mois)
Prochain paiement : 4 avril 2026
Posts IA utilisés : 6/8 ce mois

[Changer de plan]        → ouvre /pricing
[Gérer la facturation]   → ouvre Stripe Customer Portal
[Annuler l'abonnement]   → ouvre Stripe Customer Portal
```

---

## 7. LANDING PAGE — `/` (page publique)

### 7.1 Structure de la page

```
NAVIGATION
  Logo PostPilot | Fonctionnalités | Tarifs | [Se connecter] [Essayer gratuitement]

HERO
  "Votre assistant LinkedIn qui publie pour vous."
  "PostPilot rédige, planifie et publie vos posts LinkedIn.
   Vous, vous faites votre métier."
  [Essayer gratuitement — 30 jours offerts]
  (pas de CB requise)
  [Capture d'écran du dashboard]

SECTION "COMMENT ÇA MARCHE" (3 étapes)
  1. Parlez à votre assistant → Il comprend votre activité et votre ton
  2. Il planifie votre communication → Programmes de plusieurs semaines
  3. Il rédige et publie → Vous validez, PostPilot publie

SECTION "FONCTIONNALITÉS"
  - Assistant conversationnel IA
  - Programmes de communication
  - 3 sources de contenu (libre, URL, document)
  - Publication automatique LinkedIn
  - Profil de marque personnalisé
  - Calendrier éditorial
  - Analytics de performance

SECTION "TARIFS" (#pricing)
  → Même composant que la page /pricing in-app (6.7)
  → Toggle mensuel/annuel
  → 3 colonnes Gratuit / Solo / Pro
  → CTA "Essayer gratuitement" sur tous les plans

SECTION "FAQ"
  - "C'est vraiment gratuit pendant 30 jours ?" → Oui, plan Solo complet, pas de CB
  - "Que se passe-t-il après le trial ?" → Bascule sur le plan Gratuit (1 post/mois). Vous pouvez upgrade à tout moment.
  - "PostPilot publie-t-il directement sur LinkedIn ?" → Oui, connexion OAuth sécurisée.
  - "Mon contenu sonne-t-il comme du ChatGPT ?" → Non, notre IA est formée avec des règles spécifiques pour écrire comme un humain.
  - "Je peux annuler à tout moment ?" → Oui, sans engagement. Annulation en 1 clic.
  - "Mes données sont-elles sécurisées ?" → Oui, hébergement européen, pas de revente de données.

FOOTER
  PostPilot — Fabriqué en France 🇫🇷
  Liens : CGU, Politique de confidentialité, Contact
```

### 7.2 La landing est une page SÉPARÉE

- URL : `https://postpilot.fr/` (ou le domaine choisi)
- Pas derrière l'authentification
- Le bouton "Essayer gratuitement" → redirige vers `/signup` (inscription Google OAuth)
- Le bouton "Se connecter" → redirige vers `/login`
- La section tarifs utilise le même composant PricingCards que la page in-app
- Design : moderne, épuré, beaucoup de blanc, accents bleu PostPilot

---

## 8. VARIABLES D'ENVIRONNEMENT REQUISES

```env
# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Price IDs (à récupérer après création dans Stripe Dashboard)
STRIPE_PRICE_SOLO_MONTHLY=price_...
STRIPE_PRICE_SOLO_YEARLY=price_...
STRIPE_PRICE_PRO_MONTHLY=price_...
STRIPE_PRICE_PRO_YEARLY=price_...

# App URLs
APP_URL=https://app.postpilot.fr
LANDING_URL=https://postpilot.fr
```

---

## 9. INITIALISATION À L'INSCRIPTION

Quand un nouveau user s'inscrit (après Google OAuth) :

```
1. Créer l'organisation (existant)
2. INSERT INTO subscriptions (
     organization_id,
     plan_id: 'solo',           -- Trial = on donne les features Solo
     status: 'trialing',
     trial_ends_at: now() + interval '30 days',
     trial_used: true
   )
3. UPDATE organizations SET
     max_posts_per_month = 8,
     max_active_programs = 1
   WHERE id = {org_id}
4. INSERT INTO usage_tracking (
     organization_id,
     period_start: date_trunc('month', CURRENT_DATE),
     period_end: dernière jour du mois,
     ai_posts_used: 0,
     ai_posts_limit: 8
   )
5. INSERT notification "Bienvenue ! Votre trial Solo de 30 jours commence."
```

---

## 10. SÉCURITÉ — VÉRIFICATIONS CÔTÉ SERVEUR

**TOUTES les vérifications de limites doivent être faites côté serveur (n8n / Supabase RPC), JAMAIS uniquement côté frontend.**

Le frontend masque les boutons / affiche les cadenas pour l'UX, mais le backend REFUSE la requête si le plan ne permet pas l'action.

Vérifications dans chaque workflow :
- **Rédaction IA** : `check_ai_post_limit()` → refuser si `can_generate = false`
- **Création programme** : compter les programmes actifs → refuser si >= max_active_programs
- **Génération depuis URL** : vérifier `plan_id IN ('solo', 'pro')` → refuser si `free`
- **Génération depuis document** : vérifier `plan_id = 'pro'` → refuser si pas pro

---

## 11. MIGRATION SQL — NUMÉRO

Fichier : `supabase/migrations/009_subscriptions_and_billing.sql`

Contient : tables subscriptions + usage_tracking, ALTER organizations, functions check_ai_post_limit + increment_ai_post_usage, policies RLS, pg_cron job.

---

## 12. ORDRE D'IMPLÉMENTATION CLAUDE CODE

```
Étape 1 : Migration SQL
  → 009_subscriptions_and_billing.sql
  → Exécuter dans Supabase SQL Editor

Étape 2 : Variables d'environnement
  → Créer les produits et prices dans Stripe Dashboard
  → Récupérer les IDs
  → Configurer les env vars

Étape 3 : Workflows n8n
  → Créer stripe-webhook-handler.json
  → Créer create-checkout-session.json
  → Créer create-billing-portal.json
  → Modifier 01-redaction-ia.json (ajouter vérification limite)

Étape 4 : Hooks React
  → useSubscription.ts
  → usePlanLimits.ts

Étape 5 : Composants UI
  → TrialBanner.tsx (bandeau global)
  → UsageCounter.tsx (sidebar)
  → PricingCards.tsx (réutilisable landing + in-app)
  → LimitReachedModal.tsx
  → FeatureLock.tsx (cadenas générique)

Étape 6 : Pages
  → /pricing (in-app)
  → /settings — onglet Facturation
  → Modifier la sidebar (ajouter UsageCounter + badge plan)

Étape 7 : Landing page
  → / (page publique, pas d'auth)
  → Intégrer PricingCards
  → CTA → /signup

Étape 8 : Logique d'inscription
  → Modifier le flow post-signup pour créer subscription + usage_tracking
  → Initialiser le trial 30 jours

Étape 9 : Tests
  → Créer un compte → vérifier trial Solo
  → Générer 8 posts → vérifier blocage au 9ème
  → Payer via Stripe test → vérifier activation plan
  → Annuler → vérifier bascule Gratuit
  → Attendre expiration trial (forcer en SQL) → vérifier bascule Gratuit
```

---

## 13. STRIPE PRICE IDS — MAPPING

Créer un fichier de config côté app :

```typescript
export const STRIPE_PRICES = {
  solo: {
    monthly: process.env.STRIPE_PRICE_SOLO_MONTHLY,
    yearly: process.env.STRIPE_PRICE_SOLO_YEARLY,
  },
  pro: {
    monthly: process.env.STRIPE_PRICE_PRO_MONTHLY,
    yearly: process.env.STRIPE_PRICE_PRO_YEARLY,
  },
};

export const PLAN_LIMITS = {
  free:  { posts: 1,  programs: 0, url: false, document: false, skill: false, analytics: false, calendar: false },
  solo:  { posts: 8,  programs: 1, url: true,  document: false, skill: true,  analytics: true,  calendar: true  },
  pro:   { posts: 25, programs: 3, url: true,  document: true,  skill: true,  analytics: true,  calendar: true  },
} as const;
```
