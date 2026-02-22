# Architecture PostPilot

## Flux de données

```
Utilisateur (Lovable)
    │
    ├── Crée un post → Supabase (insert posts, status=draft)
    │                      │
    │                      ├── Webhook → n8n "Rédaction IA"
    │                      │                │
    │                      │                ├── Fetch brand_profile (Supabase)
    │                      │                ├── Fetch documents RAG (pgvector)
    │                      │                ├── Fetch top posts (Supabase)
    │                      │                ├── Build prompt (depuis /prompts/)
    │                      │                ├── Call Claude API
    │                      │                ├── Save draft (Supabase)
    │                      │                ├── Create notification
    │                      │                └── Send email (Resend)
    │                      │
    │                      └── Realtime → Notification in-app
    │
    ├── Approuve un post → Supabase (update status=approved)
    │
    └── [Cron 5min] → n8n "Publication"
                          │
                          ├── Query posts approved & due (Supabase)
                          ├── Fetch OAuth token du client (Supabase platforms)
                          ├── POST api.linkedin.com/v2/ugcPosts (token du client)
                          ├── Update post status + platform_post_id (Supabase)
                          └── Notify user
```

## Publication LinkedIn — OAuth2 Direct

Pas de service tiers (Ayrshare/Buffer). On utilise l'API LinkedIn directement :

1. **Une seule LinkedIn App** créée sur developer.linkedin.com pour PostPilot
2. **Chaque client** autorise PostPilot via OAuth2 → on reçoit un access_token
3. **Les tokens** sont stockés dans Supabase `platforms.oauth_tokens`
4. **n8n publie** en utilisant le token du client dans le header Authorization
5. **Refresh automatique** : workflow n8n quotidien rafraîchit les tokens avant expiration (60 jours)

Migration prévue vers Ayrshare/Buffer quand :
- Plus de 15 clients (gestion des tokens devient lourde)
- Ajout d'Instagram / TikTok (une seule API pour tout)

## Sécurité

- Supabase RLS : chaque requête filtrée par organization_id
- Webhooks n8n : protégés par X-API-Key header
- OAuth tokens LinkedIn : stockés dans Supabase, refresh automatique
- CORS : domaine Lovable uniquement
