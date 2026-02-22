# Workflows N8N — PostPilot

## Liste des workflows

| # | Nom | Trigger | Description |
|---|-----|---------|-------------|
| 01 | Rédaction IA | Webhook | Génère un brouillon de post LinkedIn |
| 02 | Révision IA | Webhook | Révise un post selon le feedback client |
| 03 | Publication programmée | Cron (5min) | Publie les posts approuvés via API LinkedIn directe |
| 04 | Collecte Analytics | Cron (quotidien) | Récupère les stats LinkedIn via API LinkedIn |
| 05 | Veille RSS | Cron (6h) | Détecte les articles pertinents et propose des posts |
| 06 | Événements calendrier | Cron (quotidien) | Pré-rédige des posts pour les événements à venir |
| 07 | Scraping URL | Webhook | Extrait et résume le contenu d'une URL |
| 08 | Refresh LinkedIn Tokens | Cron (quotidien) | Rafraîchit les tokens OAuth LinkedIn avant expiration |

## Import
1. Ouvrir n8n
2. Menu → Import from file
3. Sélectionner le fichier .json correspondant

## Credentials nécessaires dans n8n
- **Supabase** : PostgreSQL connection (host, port, user, password, database)
- **Claude API** : Anthropic API key
- **LinkedIn OAuth2 API** : Client ID + Client Secret de la LinkedIn App PostPilot
- **Resend** : API key (emails)
- **OpenAI** : API key (embeddings)

⚠️ Les tokens OAuth LinkedIn PAR CLIENT sont stockés dans Supabase (table platforms),
PAS dans les credentials n8n. Les credentials n8n ne contiennent que l'app PostPilot.
