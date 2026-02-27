# Configuration LinkedIn App pour PostPilot

## Étape 1 : Créer la LinkedIn App

1. Va sur https://developer.linkedin.com/
2. Connecte-toi avec un compte LinkedIn
3. Clique "Create app"
4. Remplis :
   - **App name** : PostPilot
   - **LinkedIn Page** : ta page entreprise (créer si besoin)
   - **Privacy policy URL** : https://postpilot.app/privacy (à créer)
   - **App logo** : logo PostPilot
5. Accepte les conditions → Create app

## Étape 2 : Configurer les permissions

Dans l'onglet "Auth" de ta LinkedIn App :
1. Ajoute ces OAuth 2.0 scopes :
   - `openid` (OIDC — identité)
   - `profile` (nom, photo)
   - `email` (adresse email)
   - `w_member_social` (publier des posts LinkedIn)
   - `r_organization_social` (lire les pages entreprise gérées → sync contacts)
2. Ajoute le **Redirect URL** :
   - `https://your-project.supabase.co/functions/v1/linkedin-oauth-callback`

### Produits LinkedIn à demander

Dans l'onglet "Products" de ta LinkedIn App :
- **Sign In with LinkedIn using OpenID Connect** → donne `openid`, `profile`, `email`
- **Share on LinkedIn** → donne `w_member_social`, `r_organization_social`

⚠️ En mode développement, ajouter son propre compte dans "Auth → Authorized members".

## Étape 3 : Configurer les secrets Supabase

Dans Supabase Dashboard → Settings → Edge Functions → Secrets :
| Variable | Valeur |
|----------|--------|
| `LINKEDIN_CLIENT_ID` | Client ID de la LinkedIn App |
| `LINKEDIN_CLIENT_SECRET` | Client Secret |
| `LINKEDIN_REDIRECT_URI` | `https://your-project.supabase.co/functions/v1/linkedin-oauth-callback` |
| `APP_URL` | URL de l'application (ex: `https://postpilot.lovable.app`) |

## Étape 4 : Demander la vérification (pour la production)

Pour utiliser `w_member_social` en production, LinkedIn demande une vérification.
Dans l'onglet "Products" :
1. Demande l'accès à "Share on LinkedIn"
2. Demande l'accès à "Sign In with LinkedIn using OpenID Connect"
3. LinkedIn review en ~3-5 jours ouvrés

## Flux OAuth pour chaque client

```
Client clique "Connecter LinkedIn"
    → Frontend appelle Edge Function linkedin-oauth-url
    → Génère l'URL OAuth :
      https://www.linkedin.com/oauth/v2/authorization
        ?response_type=code
        &client_id={LINKEDIN_CLIENT_ID}
        &redirect_uri={LINKEDIN_REDIRECT_URI}
        &scope=openid profile email w_member_social r_organization_social
        &state={organization_id}
    → Client est redirigé vers LinkedIn → autorise
    → LinkedIn redirige vers le callback avec ?code=xxx&state=org_id
    → Edge Function linkedin-oauth-callback :
        1. Échange le code contre un access_token
        2. Fetch le profil LinkedIn via OIDC userinfo (nom, URN)
        3. Stocke tout dans platforms (oauth_tokens, platform_user_id, platform_user_name)
        4. Redirige vers /settings?linkedin=connected
    → Settings détecte ?linkedin=connected :
        5. Appelle Edge Function linkedin-sync-contacts
        6. Synchronise les pages entreprise gérées dans la table contacts (type='company')
        7. Disponibles dans le MentionPicker de l'éditeur de post
```

## Limitation API LinkedIn

L'API LinkedIn **ne permet pas** de récupérer la liste des connexions personnelles
(endpoint `/v2/connections` retiré en 2019, réservé aux Marketing Developer Partners).

Ce qui est disponible avec les scopes standard :
- ✅ Profil utilisateur (nom, photo, URN)
- ✅ Pages entreprise administrées (`/v2/organizationAcls`)
- ✅ Publication de posts (`w_member_social`)
- ❌ Connexions personnelles (non disponible)
- ❌ Recherche de personnes (non disponible)

Pour mentionner des personnes dans les posts : bouton "+ Ajouter une personne"
directement dans le MentionPicker de l'éditeur (ajout manuel).
