---
title: Index — PRD
status: draft
created: 2026-06-05
updated: 2026-06-05
---

# Index — Product Requirements Document

## Objectif

Index est un outil web qui permet à un chargé de mission non-technique de croiser deux sources de données hétérogènes sans connaissance technique. L'IA locale analyse les schémas, propose le mapping en langage naturel, et l'utilisateur valide. Le résultat est un dataset unifié exportable.

**Critère de succès du POC :** un chargé de mission non-technique croise deux sources réelles en moins de 10 minutes, sans assistance, avec un résultat qu'il juge fiable.

---

## Utilisateur cible

**Marie — chargée de mission dans une administration publique**
- Connait son domaine métier, pas la technique
- Produit des rapports et analyses d'évolution pour sa hiérarchie
- Croise aujourd'hui ses données manuellement dans Excel
- A besoin d'un résultat fiable qu'elle peut ouvrir dans Excel pour faire ses graphiques

---

## Parcours utilisateur

1. Marie ouvre Index et charge ses deux sources
2. Elle donne un contexte métier (fortement recommandé, incité par l'interface)
3. L'IA analyse les deux sources et propose le mapping colonne par colonne
4. Marie valide, corrige, ou ajuste chaque proposition
5. Elle visualise un aperçu du dataset fusionné
6. Si quelque chose cloche, elle revient corriger le mapping
7. Satisfaite, elle exporte le dataset unifié

---

## Fonctionnalités

### F1 — Ingestion des sources

**FR-1.1** L'utilisateur peut charger deux sources de données en entrée. Sources supportées :
- Fichier Excel (.xlsx, .xls)
- Fichier CSV
- API REST (URL + paramètres optionnels, réponse JSON)

**FR-1.2** L'utilisateur peut saisir un contexte métier libre en langage naturel avant l'analyse (ex : "Ces données concernent l'évaluation d'un dispositif d'aide aux entreprises sur 5 ans").

**FR-1.3** L'interface incite explicitement l'utilisateur à renseigner le contexte métier — message d'encouragement visible, non bloquant.

**FR-1.4** Aucune donnée ne transite vers un service externe. L'analyse est réalisée entièrement en local par un LLM local.

---

### F2 — Analyse et proposition de mapping

**FR-2.1** L'IA analyse automatiquement le schéma et un échantillon de valeurs réelles de chaque source après l'ingestion.

**FR-2.2** L'IA propose les correspondances entre colonnes une par une, dans un ordre décroissant de confiance.

**FR-2.3** Pour chaque proposition, l'interface affiche :
- Le nom des deux colonnes candidates
- Des exemples de valeurs réelles issues des deux sources
- Une explication en langage naturel du raisonnement de l'IA (ex : "De ce que je comprends, `cod_insee` et `code_commune` semblent représenter le même identifiant géographique — est-ce correct ?")
- Un indicateur visuel de niveau de confiance (élevé / moyen / faible)

**FR-2.4** Pour les colonnes sans correspondance détectée, l'IA le signale explicitement.

---

### F3 — Validation et correction du mapping

**FR-3.1** Pour chaque proposition, l'utilisateur dispose de deux actions : **Confirmer** ou **Rejeter**.

**FR-3.2** En cas de rejet, l'utilisateur a le choix entre :
- **Sélectionner manuellement** la bonne colonne dans une liste déroulante des colonnes disponibles
- **Expliquer en langage naturel** le problème à l'IA (ex : "Ce n'est pas une seule colonne mais la combinaison de la colonne prénom et nom de la deuxième source")

**FR-3.3** Quand l'utilisateur explique en langage naturel, l'IA génère une nouvelle proposition (colonne calculée ou règle de fusion) et la soumet à validation.

**FR-3.4** Pour les colonnes sans correspondance, l'utilisateur choisit de les **inclure** ou **exclure** du dataset final.

**FR-3.5** [POST-POC] Vue d'ensemble de toutes les correspondances en une seule page.

---

### F4 — Aperçu du dataset fusionné

**FR-4.1** Une fois le mapping complété, l'utilisateur accède à un aperçu des 20 à 30 premières lignes du dataset fusionné avant export.

**FR-4.2** L'aperçu est généré avec les vraies données des sources.

**FR-4.3** L'utilisateur peut revenir à l'étape de mapping depuis l'aperçu pour corriger des erreurs détectées.

**FR-4.4** Après correction, l'aperçu est régénéré automatiquement.

---

### F5 — Export

**FR-5.1** L'utilisateur peut exporter le dataset unifié dans les formats suivants : CSV, Excel (.xlsx), JSON.

**FR-5.2** L'export déclenche un téléchargement local du fichier. Aucune donnée n'est stockée côté serveur.

---

## Exigences non-fonctionnelles

**NFR-1 Confidentialité des données**
Aucune donnée utilisateur (valeurs, noms de colonnes, contexte) ne transite vers un service externe. Le LLM tourne entièrement en local (ex : Mistral via Ollama).

**NFR-2 Accessibilité non-technique**
L'interface ne doit contenir aucun jargon SQL ou technique. Tous les messages, labels et explications sont en langage courant.

**NFR-3 Latence acceptable**
Le temps d'analyse IA par proposition de mapping doit rester sous 15 secondes sur une machine standard. Un indicateur de progression est affiché pendant le traitement.

**NFR-4 Formats d'entrée robustes**
L'outil gère les encodages courants (UTF-8, Latin-1), les séparateurs CSV variés (virgule, point-virgule), et les fichiers Excel multi-feuilles (l'utilisateur choisit une feuille, plusieurs, ou toutes à l'étape d'ingestion).

**NFR-5 Taille des fichiers**
Taille maximale par fichier source : 50 Mo pour le POC. À réévaluer après retours terrain.

---

## Hors scope (POC)

- Connexion directe à une base de données
- Plus de 2 sources simultanées
- Production de rapports ou visualisations
- Sauvegarde de sessions ou historique de mappings
- Gestion multi-utilisateurs ou authentification
- Support du profil data analyst (cas complexes)

---

## Questions ouvertes

**QO-1** Quelle stratégie pour prévenir les erreurs silencieuses (mapping faux validé sans s'en rendre compte) ? L'indicateur de confiance et l'aperçu sont des garde-fous partiels — à approfondir en phase design.

**QO-2** Quelle qualité de matching avec un LLM local 7B sur des données très spécifiques au secteur public français ? À valider sur des données réelles en POC.

**QO-1** Quelle stratégie pour prévenir les erreurs silencieuses (mapping faux validé sans s'en rendre compte) ? L'indicateur de confiance et l'aperçu sont des garde-fous partiels — à approfondir en phase design.
