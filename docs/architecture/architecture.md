---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
lastStep: 8
status: complete
completedAt: '2026-06-05'
inputDocuments:
  - docs/briefs/data-bridge-poc/brief.md
  - docs/prd/data-bridge-poc/prd.md
workflowType: architecture
project_name: Index
user_name: Louis
date: 2026-06-05
---

# Architecture Decision Document

_Ce document se construit collaborativement étape par étape. Les sections sont ajoutées au fil des décisions architecturales._

## Starter Template Evaluation

### Primary Technology Domain
Application web full-stack locale (pas de cloud, pas de déploiement distant)

### Stack Sélectionnée

**Frontend :** Vite + React (JavaScript)
```bash
npx create-vite@latest Index-ui --template react
```

**Backend :** FastAPI (Python)
Structure manuelle — pas de boilerplate lourd nécessaire

**LLM Local :** Ollama (Mistral 7B)
API HTTP locale sur `localhost:11434`

**Data Processing :** Pandas

### Rationale
Vite + React sans TypeScript pour réduire la courbe d'apprentissage. FastAPI pour la performance async et la compatibilité naturelle avec Pandas. Ollama comme runtime LLM local — standard de fait, API simple, zéro donnée externe.

### Décisions architecturales établies
- Langage backend : Python 3.11+
- Langage frontend : JavaScript ES2022+
- Pas de base de données (état en mémoire / session)
- Communication frontend ↔ backend : REST + Server-Sent Events pour le streaming LLM
- Aucun service cloud à aucune étape

## Core Architectural Decisions

### Data Architecture
- État de session : fichiers JSON temporaires locaux
- Pas de base de données pour le POC
- Fichiers temporaires nettoyés à la fermeture de session

### Sécurité & Authentification
- Pas d'authentification (outil mono-utilisateur local)
- API FastAPI liée à `localhost` uniquement — inaccessible depuis l'extérieur

### API & Communication
- REST pour les actions (chargement, validation, export)
- Server-Sent Events (SSE) pour le streaming des réponses LLM
- Messages d'erreur en français, sans jargon technique

### Frontend Architecture
- State management : `useState` / `useContext` natif React
- Navigation par étapes gérée en état local (pas de React Router)

### Infrastructure & Déploiement
- Lancement : script unique démarrant Ollama + FastAPI + Vite
- Logs console uniquement
- Pas de CI/CD pour le POC
- Packaging exécutable reporté post-validation

### Décisions différées (post-POC)
- Packaging exécutable
- Authentification multi-utilisateurs
- Monitoring et observabilité

## Implementation Patterns & Consistency Rules

### Naming Patterns

**Backend Python :** `snake_case` pour tout — fonctions, variables, fichiers, colonnes JSON
**Frontend JavaScript :** `camelCase` pour variables/fonctions, `PascalCase` pour composants React, fichiers `NomComposant.jsx`

**API Endpoints :**
- Ressources au pluriel en snake_case : `/api/sessions`, `/api/sources`, `/api/mappings`
- Actions explicites : `/api/sessions/{id}/analyze`, `/api/mappings/{id}/confirm`

### Format Patterns

**Réponse API (toutes les routes) :**
```json
{ "data": ..., "error": null }
{ "data": null, "error": "message en français lisible" }
```

- Dates : ISO 8601 (`2026-06-05T10:00:00`)
- Champs JSON : `snake_case`

### Process Patterns

**Gestion des erreurs :**
- Backend : exceptions Python → réponse JSON structurée avec message lisible en français
- Frontend : chaque appel API gère `loading` / `success` / `error` en state local
- Jamais de stack trace visible dans l'interface utilisateur

**États de chargement :**
- Appel LLM : SSE stream actif + indicateur de progression visible
- Ingestion fichier : spinner + nom du fichier en cours

### Règles obligatoires pour tous les agents IA

- Respecter `snake_case` backend / `camelCase` frontend sans exception
- Wrapper toutes les réponses API dans `{ data, error }`
- Messages d'erreur utilisateur toujours en français
- Aucun appel réseau externe — toutes les requêtes vers `localhost` uniquement

## Project Structure & Boundaries

### Complete Project Directory Structure

```
Index/
├── README.md
├── start.sh                          # Script de démarrage unique
├── .env.example
├── .gitignore
│
├── backend/
│   ├── main.py                       # Point d'entrée FastAPI
│   ├── requirements.txt
│   ├── api/
│   │   ├── routes/
│   │   │   ├── sessions.py           # POST /api/sessions
│   │   │   ├── sources.py            # POST /api/sources
│   │   │   ├── mappings.py           # GET/POST /api/mappings
│   │   │   └── exports.py            # POST /api/exports
│   │   └── models/
│   │       ├── session.py
│   │       ├── source.py
│   │       └── mapping.py
│   ├── services/
│   │   ├── ingestion/
│   │   │   ├── csv_reader.py         # F1 — lecture CSV
│   │   │   ├── excel_reader.py       # F1 — lecture Excel multi-feuilles
│   │   │   └── api_fetcher.py        # F1 — appel API REST
│   │   ├── ai/
│   │   │   ├── schema_analyzer.py    # F2 — analyse schéma + valeurs
│   │   │   ├── mapping_proposer.py   # F2 — proposition mapping
│   │   │   └── ollama_client.py      # Client Ollama local
│   │   ├── mapping/
│   │   │   ├── validator.py          # F3 — validation/correction
│   │   │   └── column_calculator.py  # F3 — colonnes calculées
│   │   ├── fusion/
│   │   │   └── dataset_merger.py     # F4 — fusion + aperçu
│   │   └── export/
│   │       └── exporter.py           # F5 — CSV/Excel/JSON
│   ├── storage/
│   │   └── session_store.py          # Fichiers JSON temporaires
│   └── tests/
│       ├── test_ingestion.py
│       ├── test_mapping.py
│       └── test_fusion.py
│
└── frontend/
    ├── package.json
    ├── vite.config.js
    ├── index.html
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── components/
        │   ├── steps/
        │   │   ├── StepIngestion.jsx     # Étape 1 — chargement sources
        │   │   ├── StepContext.jsx       # Étape 2 — contexte métier
        │   │   ├── StepMapping.jsx       # Étape 3 — validation mapping
        │   │   ├── StepPreview.jsx       # Étape 4 — aperçu dataset
        │   │   └── StepExport.jsx        # Étape 5 — export
        │   └── ui/
        │       ├── MappingCard.jsx       # Carte proposition IA
        │       ├── ValueSample.jsx       # Exemples valeurs côte à côte
        │       ├── ConfidenceBadge.jsx   # Indicateur confiance
        │       ├── StreamingText.jsx     # Affichage SSE temps réel
        │       └── ErrorMessage.jsx      # Messages erreur FR
        ├── services/
        │   └── api.js                    # Appels backend + SSE
        └── context/
            └── SessionContext.jsx        # État global session
```

### Flux de données

`Sources → ingestion/ → storage/ → ai/ → mapping/ → fusion/ → export/`

### Points d'intégration

- Frontend ↔ Backend : REST + SSE sur `localhost:8000`
- Backend ↔ Ollama : HTTP sur `localhost:11434`
- État session : fichiers JSON dans `/tmp/Index/{session_id}/`

### Mapping FR → Structure

| Fonctionnalité | Localisation |
|---|---|
| F1 — Ingestion | `backend/services/ingestion/` |
| F2 — Analyse IA | `backend/services/ai/` |
| F3 — Validation/Correction | `backend/services/mapping/` + `frontend/components/steps/StepMapping.jsx` |
| F4 — Aperçu | `backend/services/fusion/` + `frontend/components/steps/StepPreview.jsx` |
| F5 — Export | `backend/services/export/` + `frontend/components/steps/StepExport.jsx` |

## Architecture Validation Results

### Cohérence ✅
Toutes les décisions sont compatibles. SSE natif FastAPI + navigateur. Aucune contradiction.

### Couverture des exigences ✅
Toutes les FR et NFR sont couvertes architecturalement (voir mapping FR → Structure).
NFR-1 Confidentialité : garanti par Ollama local + localhost uniquement.

### Gap identifié (non bloquant)
QO-1 du PRD (prévention des erreurs silencieuses) non résolue architecturalement.
Score de confiance présent — mécanisme proactif à définir en phase design/UX.

### Architecture Completeness Checklist

- [x] Contexte projet analysé
- [x] Complexité évaluée
- [x] Contraintes techniques identifiées
- [x] Préoccupations transverses mappées
- [x] Décisions critiques documentées
- [x] Stack technique complète
- [x] Patterns d'intégration définis
- [x] Naming conventions établies
- [x] Patterns de structure définis
- [x] Patterns de communication spécifiés
- [x] Patterns de process documentés
- [x] Structure complète définie
- [x] Limites des composants établies
- [x] Points d'intégration mappés
- [x] Mapping FR → structure complet
- [ ] Benchmarks de performance (non bloquant POC)

### Architecture Readiness Assessment

**Overall Status : READY WITH MINOR GAPS**
**Confiance : haute**

**Points forts :**
- Contrainte de confidentialité garantie à chaque couche
- Pipeline séquentiel clair et sans ambiguïté
- Stack légère adaptée au niveau technique

**À améliorer post-POC :**
- Mécanisme de détection d'erreurs silencieuses
- Benchmarks de performance LLM local
- Packaging exécutable

### Implementation Handoff

**Première étape d'implémentation :**
```bash
npx create-vite@latest Index-ui --template react
```
Puis structure backend manuelle selon `backend/` défini ci-dessus.

**Priorité d'implémentation :**
1. Script `start.sh` + vérification Ollama
2. Backend : ingestion CSV/Excel
3. Backend : client Ollama + analyse schéma
4. Backend : proposition mapping + SSE
5. Frontend : flux étapes 1→5
6. Export

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
18 FRs en 5 blocs : Ingestion (F1), Analyse IA (F2), Validation/Correction (F3), Aperçu (F4), Export (F5). Pipeline séquentiel sans parallélisme complexe. La correction en langage naturel (FR-3.3) implique un aller-retour IA supplémentaire dans la boucle de validation.

**Non-Functional Requirements:**
- NFR-1 (Confidentialité) : contrainte architecturale centrale — LLM local uniquement
- NFR-2 (Accessibilité non-technique) : UI sans jargon, langage naturel partout
- NFR-3 (Latence < 15s/proposition) : gestion UX de la latence LLM local
- NFR-4 (Formats robustes) : layer d'ingestion/normalisation dédié
- NFR-5 (50 Mo max) : limite de traitement en mémoire locale

**Scale & Complexity:**
- Primary domain : application web full-stack locale (pas de cloud)
- Complexity level : moyenne
- Estimated architectural components : 5

### Technical Constraints & Dependencies

- LLM local (ex. Mistral 7B via Ollama) — pas d'appel API externe
- Traitement en mémoire — pas de base de données pour le POC
- Machine de l'utilisateur final = serveur d'exécution

### Cross-Cutting Concerns Identified

- Confidentialité : aucune donnée ne sort à aucune étape
- Gestion d'état de session : mapping partiel maintenu entre étapes
- Latence IA : feedback utilisateur pendant les traitements longs
