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

## Supabase Realtime

### Channel : notifications
Le frontend subscribe au channel `notifications` filtré par `organization_id`.
Chaque INSERT dans la table `notifications` trigger un événement Realtime.

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
