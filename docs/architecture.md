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
                          ├── Publish via Ayrshare API
                          ├── Update post status (Supabase)
                          └── Notify user
```

## Sécurité

- Supabase RLS : chaque requête filtrée par organization_id
- Webhooks n8n : protégés par X-API-Key header
- Ayrshare keys : chiffrées en base
- CORS : domaine Lovable uniquement
