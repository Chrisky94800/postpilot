# API Contracts — PostPilot

## Webhooks N8N (appelés par le frontend)

### POST /webhook/generate-post
**Request :**
```json
{
  "post_id": "uuid",
  "organization_id": "uuid",
  "api_key": "string"
}
```
**Response (200) :**
```json
{
  "success": true,
  "content": "Le post LinkedIn généré...",
  "version_id": "uuid"
}
```

### POST /webhook/revise-post
**Request :**
```json
{
  "post_id": "uuid",
  "feedback": "Rends le plus percutant",
  "scope": "full|intro|body|conclusion",
  "api_key": "string"
}
```
**Response (200) :**
```json
{
  "success": true,
  "content": "Le post révisé...",
  "version_id": "uuid"
}
```

### POST /webhook/scrape-url
**Request :**
```json
{
  "url": "https://example.com/article",
  "api_key": "string"
}
```
**Response (200) :**
```json
{
  "success": true,
  "title": "Titre de l'article",
  "summary": "Résumé en 2-3 phrases",
  "content": "Contenu extrait (tronqué à 3000 chars)"
}
```

### POST /webhook/transcribe-vocal
**Request :**
```json
{
  "audio_base64": "base64string",
  "api_key": "string"
}
```
**Response (200) :**
```json
{
  "success": true,
  "transcription": "Texte transcrit du vocal"
}
```

### POST /webhook/linkedin-connect
**Request :**
```json
{
  "organization_id": "uuid",
  "api_key": "string"
}
```
**Response (200) :**
```json
{
  "success": true,
  "oauth_url": "https://www.linkedin.com/oauth/v2/authorization?..."
}
```

## Edge Function : linkedin-oauth-callback

Appelée par LinkedIn après l'autorisation OAuth. PAS appelée par le frontend.

**URL** : `https://{supabase-url}/functions/v1/linkedin-oauth-callback`
**Query params** : `?code=xxx&state=organization_id`

**Action** :
1. Échange le code contre access_token + refresh_token
2. Fetch le profil LinkedIn
3. Upsert dans table platforms
4. Redirige vers l'app PostPilot

## Supabase Realtime

### Channel : notifications
```typescript
supabase
  .channel('notifications')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'notifications',
    filter: `organization_id=eq.${orgId}`
  }, (payload) => {
    // Afficher la notification in-app
  })
  .subscribe()
```
