---
title: Index — Outil de croisement intelligent de sources de données
status: draft
created: 2026-06-05
updated: 2026-06-05
---

# Index — Brief Produit

## Le problème

Les chargés de mission dans les administrations et organismes publics passent un temps considérable à croiser manuellement des données issues de sources hétérogènes (API publiques, exports Excel, fichiers CSV). Ce travail est récurrent — souvent quotidien — et fastidieux : les libellés diffèrent d'une source à l'autre, le nommage des colonnes n'est pas standardisé, et il n'existe aucun outil accessible à un non-technicien pour automatiser ce travail de réconciliation.

Aujourd'hui, la méthode dominante reste le copier-coller dans Excel. Le temps passé est difficile à chiffrer précisément mais représente une friction quotidienne réelle.

**[OPEN QUESTION]** Valider avec un utilisateur réel : quels sont les cas de croisement les plus fréquents ? Combien de temps passe-t-il sur cette tâche chaque semaine ?

## La solution

Index est un outil web qui permet à un utilisateur non-technique de croiser deux sources de données hétérogènes en déléguant le travail de réconciliation à une IA locale.

L'IA analyse les schémas et les valeurs des deux sources, propose automatiquement un mapping entre les colonnes, et explique son raisonnement en langage naturel. L'utilisateur valide ou corrige les propositions, puis exporte un dataset unifié.

**Principe fondamental : l'IA fait le travail de compréhension technique, l'humain apporte la connaissance métier et garde le contrôle de la validation.**

## Utilisateurs cibles

**Profil principal (POC) : le chargé de mission non-technique**

- Travaille dans une administration ou un organisme public
- Connait bien son domaine métier et le jargon associé
- N'a pas de compétences en traitement de données ou en SQL
- Produit régulièrement des rapports, statistiques et analyses d'évolution pour sa hiérarchie
- Aujourd'hui : croise ses données manuellement dans Excel

**Profil secondaire (post-POC) : le data analyst**
- Cas d'usage plus complexes, sources plus nombreuses
- Hors scope pour le POC

## Périmètre du POC

**Sources supportées :**
- API REST (JSON)
- Fichiers CSV
- Fichiers Excel

**Nombre de sources en entrée :** 2 (extensible post-POC)

**Ce que l'outil fait :**
1. Ingestion des deux sources
2. Analyse automatique des schémas et valeurs par l'IA
3. Proposition de mapping avec explication en langage naturel ("De ce que je comprends, `cod_insee` et `code_commune` semblent représenter le même identifiant géographique — est-ce correct ?")
4. Affichage d'exemples de valeurs côte à côte pour aider la validation
5. Interface de correction manuelle pour les cas où l'IA se trompe ou est incertaine
6. Export du dataset unifié (CSV / Excel / JSON)

**Ce que l'outil ne fait pas (POC) :**
- Connexion directe à une base de données
- Production de rapports ou de visualisations
- Gestion de plus de 2 sources simultanément
- Support des profils techniques avancés

## Différenciation

Les outils existants (OpenRefine, Talend, Power Query) permettent à l'utilisateur de faire le mapping lui-même, avec des modules d'aide. Index inverse le paradigme : **l'IA propose, l'humain valide**. L'utilisateur n'a pas besoin de comprendre la structure des données — il comprend le métier, ce qui lui suffit pour confirmer ou infirmer les propositions de l'IA.

## Contraintes non-négociables

### Confidentialité des données
Les données manipulées par les administrations peuvent être sensibles (données personnelles, données confidentielles d'organismes publics). **Aucune donnée ne doit transiter vers un service externe.**

Implication architecture : utilisation d'un **LLM local** (ex. Mistral via Ollama) tournant sur la machine de l'utilisateur. Coût quasi nul après installation, latence acceptable pour un usage non-temps-réel. Devient un argument commercial fort pour le marché des administrations françaises (conformité RGPD, souveraineté des données).

### Accessibilité non-technique
L'interface doit être utilisable sans aucune connaissance technique. Pas de jargon SQL, pas de configuration de schémas, pas de scripts.

## Questions ouvertes

1. **Fiabilité du matching** : comment détecter et prévenir les erreurs silencieuses (l'IA se trompe, l'admin valide sans s'en rendre compte) ? Pistes : score de confiance visible, aperçu du dataset fusionné avant export.
2. **Temps gagné réel** : à valider avec un utilisateur terrain avant toute communication sur la valeur de l'outil.
3. **Cas limites du LLM local** : quelle qualité de matching avec un modèle 7B sur des données très spécifiques au secteur public français ?
4. **Modèle économique** : hors scope POC, à définir après validation de l'usage.

## Succès du POC

L'outil est un succès si un chargé de mission non-technique peut croiser deux sources de données réelles en moins de 10 minutes, sans assistance technique, avec un résultat qu'il juge fiable.
