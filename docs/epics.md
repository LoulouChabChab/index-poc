---
stepsCompleted: [1, 2, 3, 4]
inputDocuments:
  - docs/prd/data-bridge-poc/prd.md
  - docs/architecture/architecture.md
---

# Index - Epic Breakdown

## Overview

Ce document fournit le découpage complet en epics et stories pour Index, décomposant les exigences du PRD et de l'Architecture en stories implémentables.

## Requirements Inventory

### Functional Requirements

FR-1.1 : L'utilisateur peut charger deux sources de données — Excel (.xlsx/.xls), CSV, ou API REST (URL + paramètres optionnels, réponse JSON)
FR-1.2 : L'utilisateur peut saisir un contexte métier libre en langage naturel avant l'analyse
FR-1.3 : L'interface incite explicitement à renseigner le contexte métier — message d'encouragement visible, non bloquant
FR-1.4 : Aucune donnée ne transite vers un service externe — analyse entièrement en local par LLM local
FR-2.1 : L'IA analyse automatiquement le schéma et un échantillon de valeurs réelles de chaque source après ingestion
FR-2.2 : L'IA propose les correspondances entre colonnes une par une, dans un ordre décroissant de confiance
FR-2.3 : Pour chaque proposition, l'interface affiche : noms des colonnes, exemples de valeurs réelles, explication en langage naturel, indicateur de confiance (élevé/moyen/faible)
FR-2.4 : Pour les colonnes sans correspondance détectée, l'IA le signale explicitement
FR-3.1 : Pour chaque proposition, l'utilisateur dispose de deux actions : Confirmer ou Rejeter
FR-3.2 : En cas de rejet, l'utilisateur peut : sélectionner manuellement la bonne colonne, ou expliquer en langage naturel le problème
FR-3.3 : Quand l'utilisateur explique en langage naturel, l'IA génère une nouvelle proposition (colonne calculée ou règle de fusion) et la soumet à validation
FR-3.4 : Pour les colonnes sans correspondance, l'utilisateur choisit d'inclure ou exclure du dataset final
FR-4.1 : Une fois le mapping complété, l'utilisateur accède à un aperçu des 20-30 premières lignes du dataset fusionné
FR-4.2 : L'aperçu est généré avec les vraies données des sources
FR-4.3 : L'utilisateur peut revenir à l'étape de mapping depuis l'aperçu pour corriger des erreurs
FR-4.4 : Après correction, l'aperçu est régénéré automatiquement
FR-5.1 : L'utilisateur peut exporter le dataset unifié en CSV, Excel (.xlsx), ou JSON
FR-5.2 : L'export déclenche un téléchargement local — aucune donnée stockée côté serveur

### NonFunctional Requirements

NFR-1 : Confidentialité — aucune donnée (valeurs, noms de colonnes, contexte) ne transite vers un service externe. LLM entièrement local (Mistral via Ollama)
NFR-2 : Accessibilité non-technique — interface sans jargon SQL ou technique, tous les messages en langage courant
NFR-3 : Latence — temps d'analyse IA < 15 secondes par proposition sur machine standard, indicateur de progression affiché
NFR-4 : Formats robustes — encodages UTF-8/Latin-1, séparateurs CSV variés, Excel multi-feuilles avec sélection de feuille(s)
NFR-5 : Taille maximale par fichier source : 50 Mo pour le POC

### Additional Requirements

- AR-1 : Initialisation frontend avec `npx create-vite@latest databridge-ui --template react`
- AR-2 : Backend FastAPI Python 3.11+ avec structure manuelle (pas de boilerplate)
- AR-3 : Client Ollama local sur `localhost:11434` — aucun appel réseau externe autorisé
- AR-4 : État de session stocké en fichiers JSON temporaires dans `/tmp/index/{session_id}/`
- AR-5 : Communication frontend ↔ backend via REST + SSE sur `localhost:8000`
- AR-6 : Script `start.sh` pour démarrer Ollama + FastAPI + Vite en une commande
- AR-7 : Toutes les réponses API wrappées dans `{ "data": ..., "error": null }`
- AR-8 : snake_case backend Python, camelCase frontend JavaScript, PascalCase composants React

### UX Design Requirements

Aucun document UX fourni — exigences UX extraites du PRD :
- UX-DR1 : Navigation par étapes linéaires (Ingestion → Contexte → Mapping → Aperçu → Export) sans React Router
- UX-DR2 : Composant MappingCard affichant colonnes candidates + exemples valeurs côte à côte + explication IA en streaming SSE
- UX-DR3 : Composant ConfidenceBadge avec 3 niveaux visuels : élevé / moyen / faible
- UX-DR4 : Composant StreamingText pour affichage SSE temps réel des explications IA
- UX-DR5 : Composant ErrorMessage affichant les erreurs en français sans jargon technique
- UX-DR6 : Indicateur de progression visible pendant les traitements LLM (spinner + message)

### FR Coverage Map

FR-1.1 : Epic 2 — chargement des deux sources
FR-1.2 : Epic 2 — saisie contexte métier
FR-1.3 : Epic 2 — incitation à renseigner le contexte
FR-1.4 : Epic 2 — données restent locales
FR-2.1 : Epic 3 — analyse schéma + valeurs
FR-2.2 : Epic 3 — propositions une par une par confiance
FR-2.3 : Epic 3 — affichage noms + exemples + explication + confiance
FR-2.4 : Epic 3 — signalement colonnes sans correspondance
FR-3.1 : Epic 3 — Confirmer / Rejeter
FR-3.2 : Epic 3 — correction manuelle ou langage naturel
FR-3.3 : Epic 3 — IA génère colonne calculée sur instruction
FR-3.4 : Epic 3 — include/exclude colonnes orphelines
FR-4.1 : Epic 4 — aperçu 20-30 lignes
FR-4.2 : Epic 4 — aperçu avec vraies données
FR-4.3 : Epic 4 — retour au mapping depuis aperçu
FR-4.4 : Epic 4 — régénération aperçu après correction
FR-5.1 : Epic 4 — export CSV/Excel/JSON
FR-5.2 : Epic 4 — téléchargement local, aucun stockage serveur

## Epic List

### Epic 1 : Fondations du projet
Mettre en place la structure complète du projet : squelette frontend Vite+React, squelette backend FastAPI, connexion Ollama vérifiée, script de démarrage `start.sh`. Rien ne peut être construit sans ça.
**FRs couverts :** AR-1 à AR-8

### Epic 2 : Chargement des sources de données
Marie peut charger ses deux sources (Excel, CSV, API REST), sélectionner ses feuilles Excel, et donner un contexte métier à l'IA. L'outil valide les fichiers et garde les données localement.
**FRs couverts :** FR-1.1, FR-1.2, FR-1.3, FR-1.4, NFR-1, NFR-4, NFR-5

### Epic 3 : Analyse IA et validation du mapping
Marie reçoit les propositions de mapping de l'IA une par une avec exemples et explications, peut confirmer, rejeter, corriger manuellement ou en langage naturel, et gérer les colonnes sans correspondance.
**FRs couverts :** FR-2.1, FR-2.2, FR-2.3, FR-2.4, FR-3.1, FR-3.2, FR-3.3, FR-3.4, NFR-2, NFR-3

### Epic 4 : Aperçu et export du dataset unifié
Marie visualise les 20-30 premières lignes du dataset fusionné, peut revenir corriger le mapping si nécessaire, puis exporte en CSV/Excel/JSON en téléchargement local.
**FRs couverts :** FR-4.1, FR-4.2, FR-4.3, FR-4.4, FR-5.1, FR-5.2

## Epic 1 : Fondations du projet

Mettre en place la structure complète du projet : squelette frontend Vite+React, squelette backend FastAPI, connexion Ollama vérifiée, script de démarrage `start.sh`.

### Story 1.1 : Initialisation de la structure du projet

En tant que développeur,
je veux une structure de projet complète avec frontend et backend initialisés,
afin de pouvoir commencer à implémenter les fonctionnalités sans décisions d'infrastructure.

**Acceptance Criteria :**

**Given** un environnement avec Node.js et Python 3.11+ installés
**When** le développeur clone le repo et installe les dépendances
**Then** le frontend Vite+React démarre sur `localhost:5173` sans erreur
**And** le backend FastAPI démarre sur `localhost:8000` sans erreur
**And** la structure de dossiers correspond exactement à celle définie dans l'architecture (`backend/`, `frontend/`, `start.sh`)
**And** `GET /api/health` retourne `{ "data": { "status": "ok" }, "error": null }`

### Story 1.2 : Script de démarrage et vérification Ollama

En tant que développeur,
je veux un script unique qui démarre tous les services et vérifie qu'Ollama est disponible,
afin que l'environnement de développement soit opérationnel en une commande.

**Acceptance Criteria :**

**Given** Ollama est installé sur la machine avec le modèle Mistral 7B téléchargé
**When** le développeur exécute `./start.sh`
**Then** Ollama, le backend FastAPI et le frontend Vite démarrent dans le bon ordre
**And** si Ollama n'est pas détecté, le script affiche un message d'erreur clair en français avec les instructions d'installation
**And** `GET /api/health` inclut `{ "ollama": "ok" }` dans la réponse quand Ollama répond sur `localhost:11434`

### Story 1.3 : Premier appel frontend ↔ backend

En tant que développeur,
je veux que le frontend puisse appeler le backend et afficher la réponse,
afin de valider que la communication REST est opérationnelle avant de construire les vraies fonctionnalités.

**Acceptance Criteria :**

**Given** le frontend et le backend sont démarrés via `start.sh`
**When** l'utilisateur ouvre `localhost:5173` dans un navigateur
**Then** le frontend affiche une page d'accueil Index sans erreur console
**And** le frontend appelle `GET /api/health` au chargement et affiche le statut de connexion
**And** si le backend est inaccessible, un message d'erreur en français s'affiche sans crash de l'application

## Epic 2 : Chargement des sources de données

Marie peut charger ses deux sources (Excel, CSV, API REST), sélectionner ses feuilles Excel, et donner un contexte métier à l'IA. L'outil valide les fichiers et garde les données localement.

### Story 2.1 : Chargement et validation d'un fichier CSV ou Excel

En tant que chargée de mission,
je veux uploader un fichier CSV ou Excel depuis mon ordinateur,
afin que l'outil puisse lire mes données sans les envoyer ailleurs.

**Acceptance Criteria :**

**Given** l'utilisateur est sur l'étape d'ingestion
**When** elle sélectionne un fichier CSV ou Excel (.xlsx/.xls) de moins de 50 Mo
**Then** le backend lit le fichier et extrait les colonnes + un échantillon de 10 valeurs par colonne
**And** pour un fichier Excel multi-feuilles, l'utilisateur peut choisir une feuille, plusieurs, ou toutes avant la lecture
**And** le fichier est stocké temporairement dans `/tmp/index/{session_id}/` sans jamais quitter la machine
**And** si le fichier dépasse 50 Mo ou est corrompu, un message d'erreur en français s'affiche

### Story 2.2 : Appel d'une API REST comme source

En tant que chargée de mission,
je veux renseigner une URL d'API REST comme source de données,
afin de pouvoir croiser des données provenant d'une API publique sans avoir à télécharger un fichier.

**Acceptance Criteria :**

**Given** l'utilisateur est sur l'étape d'ingestion
**When** elle saisit une URL d'API REST avec des paramètres optionnels (headers, query params)
**Then** le backend appelle l'API depuis la machine locale et récupère la réponse JSON
**And** les colonnes et un échantillon de 10 valeurs sont extraits de la réponse
**And** aucune donnée ne transite par un service externe — l'appel se fait directement depuis la machine
**And** si l'API est inaccessible ou retourne une erreur, un message en français s'affiche

### Story 2.3 : Interface de chargement des deux sources et saisie du contexte métier

En tant que chargée de mission,
je veux une interface claire pour charger mes deux sources et expliquer à l'IA le contexte de mes données,
afin que l'outil comprenne ce que je veux faire avant d'analyser.

**Acceptance Criteria :**

**Given** l'utilisateur ouvre Index
**When** elle arrive sur l'étape d'ingestion
**Then** elle voit deux zones de chargement distinctes — une pour chaque source (fichier ou URL API)
**And** un champ de texte libre invite à décrire le contexte métier avec un message d'encouragement visible ("Plus vous décrivez votre contexte, mieux l'IA comprendra vos données")
**And** le champ contexte est facultatif — l'utilisateur peut continuer sans le remplir
**And** le bouton "Analyser" n'est actif que quand les deux sources sont chargées avec succès
**And** un indicateur visuel (nom du fichier ou URL) confirme que chaque source est bien chargée

### Story 2.4 : Création de session et stockage local des sources

En tant que chargée de mission,
je veux que mes données soient conservées pendant toute ma session de travail,
afin de ne pas perdre mon travail si je navigue entre les étapes.

**Acceptance Criteria :**

**Given** l'utilisateur a chargé ses deux sources et cliqué sur "Analyser"
**When** le backend reçoit les deux sources et le contexte métier
**Then** une session est créée avec un identifiant unique et les données sont stockées dans `/tmp/index/{session_id}/`
**And** le frontend reçoit l'identifiant de session et le conserve en état local
**And** les fichiers temporaires sont nettoyés automatiquement à la fermeture du serveur
**And** si la création de session échoue, un message d'erreur en français s'affiche sans perte des fichiers uploadés

## Epic 3 : Analyse IA et validation du mapping

Marie reçoit les propositions de mapping de l'IA une par une avec exemples et explications, peut confirmer, rejeter, corriger manuellement ou en langage naturel, et gérer les colonnes sans correspondance.

### Story 3.1 : Analyse des schémas et génération des propositions de mapping

En tant que chargée de mission,
je veux que l'IA analyse mes deux sources et prépare des propositions de correspondance,
afin de ne pas avoir à comparer moi-même des dizaines de colonnes.

**Acceptance Criteria :**

**Given** une session existe avec deux sources chargées et un contexte métier optionnel
**When** l'analyse est déclenchée
**Then** le backend envoie à Ollama les schémas des deux sources (noms de colonnes + échantillons de valeurs) ainsi que le contexte métier
**And** Ollama retourne une liste de propositions de correspondance triées par ordre décroissant de confiance (élevé / moyen / faible)
**And** chaque proposition contient : colonne source A, colonne source B, niveau de confiance, explication en français
**And** les colonnes sans correspondance détectée sont listées séparément
**And** toutes les données restent sur `localhost` — aucun appel réseau externe

### Story 3.2 : Affichage d'une proposition de mapping avec streaming SSE

En tant que chargée de mission,
je veux voir chaque proposition de l'IA avec des exemples de mes vraies données et une explication qui s'affiche progressivement,
afin de comprendre pourquoi l'IA fait ce rapprochement et pouvoir confirmer en connaissance de cause.

**Acceptance Criteria :**

**Given** les propositions de mapping ont été générées par l'IA
**When** l'utilisateur arrive sur l'étape de mapping
**Then** la première proposition s'affiche avec le nom des deux colonnes candidates
**And** des exemples de vraies valeurs des deux sources sont affichés côte à côte
**And** l'explication de l'IA s'affiche progressivement via SSE (mot par mot, comme un chat)
**And** un badge de confiance visuel indique le niveau : élevé (vert) / moyen (orange) / faible (rouge)
**And** les boutons "Confirmer" et "Rejeter" sont visibles mais désactivés pendant le streaming
**And** une fois le streaming terminé, les boutons s'activent

### Story 3.3 : Confirmation ou rejet simple d'une proposition

En tant que chargée de mission,
je veux confirmer ou rejeter une proposition de l'IA en un clic,
afin de valider rapidement les correspondances évidentes et passer à la suivante.

**Acceptance Criteria :**

**Given** une proposition de mapping est affichée et le streaming SSE est terminé
**When** l'utilisateur clique sur "Confirmer"
**Then** la correspondance est enregistrée dans la session et la proposition suivante s'affiche
**And** un indicateur de progression montre combien de propositions restent (ex : "3 / 8")

**Given** une proposition est affichée
**When** l'utilisateur clique sur "Rejeter"
**Then** l'interface propose deux options : sélectionner manuellement une colonne, ou expliquer le problème à l'IA
**And** la proposition rejetée n'est pas enregistrée comme correspondance

### Story 3.4 : Correction manuelle ou en langage naturel

En tant que chargée de mission,
je veux pouvoir corriger une proposition incorrecte soit en choisissant moi-même la bonne colonne, soit en expliquant le problème à l'IA,
afin que le mapping reflète ma connaissance métier même quand l'IA se trompe.

**Acceptance Criteria :**

**Given** l'utilisateur a rejeté une proposition et choisit la correction manuelle
**When** elle sélectionne une colonne dans la liste déroulante des colonnes disponibles
**Then** la correspondance manuelle est enregistrée dans la session et la proposition suivante s'affiche

**Given** l'utilisateur a rejeté une proposition et choisit l'explication en langage naturel
**When** elle saisit son explication (ex : "Ce n'est pas une colonne mais la combinaison de prénom et nom de la source B")
**Then** le backend envoie l'explication à Ollama qui génère une nouvelle proposition (colonne calculée ou règle de fusion)
**And** la nouvelle proposition s'affiche avec streaming SSE pour validation
**And** si Ollama ne peut pas générer de proposition valide, un message en français invite l'utilisateur à essayer une correction manuelle

### Story 3.5 : Gestion des colonnes sans correspondance

En tant que chargée de mission,
je veux décider quoi faire des colonnes qui n'ont pas de correspondance dans l'autre source,
afin de contrôler ce qui apparaît dans mon dataset final.

**Acceptance Criteria :**

**Given** toutes les propositions de mapping ont été traitées
**When** l'utilisateur arrive à l'écran de gestion des colonnes orphelines
**Then** toutes les colonnes sans correspondance des deux sources sont listées clairement
**And** pour chaque colonne, l'utilisateur peut choisir "Inclure" ou "Exclure" du dataset final
**And** un bouton "Tout inclure" et "Tout exclure" permettent de traiter toutes les colonnes en une action
**And** les choix sont enregistrés dans la session
**And** un bouton "Générer l'aperçu" apparaît une fois tous les choix faits

## Epic 4 : Aperçu et export du dataset unifié

Marie visualise les 20-30 premières lignes du dataset fusionné, peut revenir corriger le mapping si nécessaire, puis exporte en CSV/Excel/JSON en téléchargement local.

### Story 4.1 : Génération et affichage de l'aperçu du dataset fusionné

En tant que chargée de mission,
je veux voir les premières lignes de mon dataset fusionné avant de l'exporter,
afin de vérifier que le croisement de données est correct avant de l'utiliser dans mon rapport.

**Acceptance Criteria :**

**Given** le mapping est complet et les choix sur les colonnes orphelines sont faits
**When** l'utilisateur clique sur "Générer l'aperçu"
**Then** le backend fusionne les deux sources selon le mapping validé et retourne les 20-30 premières lignes
**And** l'aperçu s'affiche sous forme de tableau avec les noms de colonnes en en-tête
**And** les données affichées sont les vraies données des sources, pas des données fictives
**And** un résumé indique le nombre total de lignes et de colonnes du dataset complet
**And** un indicateur de progression s'affiche pendant la génération

### Story 4.2 : Retour au mapping depuis l'aperçu et régénération

En tant que chargée de mission,
je veux pouvoir revenir corriger le mapping si je détecte une erreur dans l'aperçu,
afin de ne pas avoir à recommencer depuis le début.

**Acceptance Criteria :**

**Given** l'aperçu du dataset fusionné est affiché
**When** l'utilisateur clique sur "Corriger le mapping"
**Then** elle revient à l'étape de mapping avec toutes ses décisions précédentes conservées
**And** après avoir corrigé une ou plusieurs correspondances, elle peut régénérer l'aperçu
**And** le nouvel aperçu remplace l'ancien automatiquement
**And** elle peut faire autant d'allers-retours mapping ↔ aperçu que nécessaire

### Story 4.3 : Export du dataset unifié

En tant que chargée de mission,
je veux exporter mon dataset fusionné dans le format de mon choix,
afin de pouvoir l'ouvrir dans Excel pour faire mes graphiques et produire mon rapport.

**Acceptance Criteria :**

**Given** l'aperçu du dataset fusionné est affiché et l'utilisateur est satisfaite du résultat
**When** elle choisit un format d'export (CSV, Excel .xlsx, ou JSON) et clique sur "Exporter"
**Then** le backend génère le fichier complet avec toutes les lignes et déclenche un téléchargement local
**And** aucune donnée n'est stockée côté serveur — le fichier est généré à la volée et supprimé après téléchargement
**And** le nom du fichier exporté inclut la date et l'heure (ex : `index_export_2026-06-05_10h30.csv`)
**And** si la génération échoue, un message d'erreur en français s'affiche sans quitter l'étape d'aperçu
