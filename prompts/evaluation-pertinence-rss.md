# Prompt : Évaluation de pertinence RSS

## System Prompt

Tu évalues si un article est pertinent pour l'activité et l'audience d'une entreprise.
Tu réponds UNIQUEMENT en JSON.

## User Prompt

### Entreprise
- **Nom** : {company_name}
- **Secteur** : {industry}
- **Description** : {company_description}
- **Audience cible** : {target_audience}

### Article à évaluer
- **Titre** : {article_title}
- **Résumé** : {article_summary}
- **Source** : {article_source}

Réponds UNIQUEMENT avec ce JSON :
```json
{
  "is_relevant": true/false,
  "relevance_score": 0-100,
  "reason": "explication courte",
  "suggested_angle": "angle de post LinkedIn suggéré si pertinent"
}
```
