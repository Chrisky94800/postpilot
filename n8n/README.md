# Workflows N8N — PostPilot

## Liste des workflows

| # | Nom | Trigger | Description |
|---|-----|---------|-------------|
| 01 | Rédaction IA | Webhook | Génère un brouillon de post LinkedIn |
| 02 | Révision IA | Webhook | Révise un post selon le feedback client |
| 03 | Publication programmée | Cron (5min) | Publie les posts approuvés et dus |
| 04 | Collecte Analytics | Cron (quotidien) | Récupère les stats LinkedIn via Ayrshare |
| 05 | Veille RSS | Cron (6h) | Détecte les articles pertinents et propose des posts |
| 06 | Événements calendrier | Cron (quotidien) | Pré-rédige des posts pour les événements à venir |
| 07 | Scraping URL | Webhook | Extrait et résume le contenu d'une URL |

## Import
Pour importer un workflow dans n8n :
1. Ouvrir n8n
2. Menu → Import from file
3. Sélectionner le fichier .json correspondant

## Credentials nécessaires
- Supabase (PostgreSQL connection)
- Claude API (Anthropic)
- Ayrshare API
- Resend API (emails)
- OpenAI API (embeddings)
