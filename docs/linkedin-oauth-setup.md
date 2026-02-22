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
   - `w_member_social` (publier des posts)
   - `r_liteprofile` (lire le profil)
   - `r_emailaddress` (lire l'email)
   - `r_organization_social` (si pages entreprise)
   - `w_organization_social` (publier sur pages entreprise)
2. Ajoute le **Redirect URL** :
   - `https://your-supabase-url/functions/v1/linkedin-oauth-callback`

## Étape 3 : Noter les credentials

Dans l'onglet "Auth" :
- **Client ID** : xxxxxxxxxx → mettre dans LINKEDIN_CLIENT_ID
- **Client Secret** : xxxxxxxxxx → mettre dans LINKEDIN_CLIENT_SECRET

## Étape 4 : Demander la vérification (pour la production)

Pour utiliser `w_member_social` en production, LinkedIn demande une vérification.
Dans l'onglet "Products" :
1. Demande l'accès à "Share on LinkedIn"
2. Demande l'accès à "Sign In with LinkedIn using OpenID Connect"
3. LinkedIn review en ~3-5 jours ouvrés

⚠️ En mode développement, seuls les comptes listés comme "Authorized members"
dans l'onglet "Auth" peuvent se connecter. Ajoute ton compte et ceux de tes testeurs.

## Flux OAuth pour chaque client

```
Client clique "Connecter LinkedIn"
    → Frontend appelle /webhook/linkedin-connect
    → n8n génère l'URL OAuth :
      https://www.linkedin.com/oauth/v2/authorization
        ?response_type=code
        &client_id={CLIENT_ID}
        &redirect_uri={REDIRECT_URI}
        &scope=w_member_social,r_liteprofile
        &state={organization_id}
    → Client est redirigé vers LinkedIn → autorise
    → LinkedIn redirige vers le callback avec ?code=xxx&state=org_id
    → Edge Function linkedin-oauth-callback :
        1. Échange le code contre un access_token + refresh_token
        2. Fetch le profil LinkedIn (nom, URN)
        3. Stocke tout dans platforms (oauth_tokens, platform_user_id, platform_user_name)
        4. Redirige vers l'app PostPilot avec ?linkedin=connected
```
