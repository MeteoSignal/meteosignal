# ROADMAP

MeteoSignal évolue par versions courtes et publiables. Chaque étape doit préserver la simplicité, l'élégance, la performance et la maintenabilité du produit.

## Historique terminé

### Version 1.0.0 - Fondation stable

Statut : terminée.

- [x] Architecture modulaire HTML, CSS et JavaScript sans framework.
- [x] Modèle météo interne normalisé et Open-Meteo comme source principale.
- [x] Météo actuelle, prévisions horaires et prévisions sur 7 jours.
- [x] Recherche, géolocalisation, ville active sauvegardée et premiers favoris.
- [x] Soleil, Lune, UV, qualité de l'air et indicateurs météo.
- [x] PWA, navigation adaptative et validation initiale mobile, tablette, desktop et TV.

### Version 1.1 - Identité visuelle et confort

Statut : terminée.

- [x] Identité visuelle officielle MeteoSignal et fond météo premium.
- [x] Expérience mobile avec navigation basse et hero compact.
- [x] Icônes météo SVG personnalisées, Phase 1.
- [x] Prévisions horaires étendues à 72 heures.
- [x] Stabilisation PWA, accessibilité HTML et compatibilité Safari.

### Version 1.2 - Alertes météo locales

Statut : terminée.

- [x] Moteur d'alertes locales indicatives MeteoSignal.
- [x] Signaux chaleur, vent, pluie, orage, UV et qualité de l'air.
- [x] Wording pédagogique, priorisation et gestion des données absentes.

La vigilance officielle externe n'est pas encore intégrée.

### Version 1.3 - Favoris et expérience quotidienne

Statut : terminée.

- [x] Gestion visible des villes favorites avec stockage local.
- [x] Sélection, suppression et conservation de la ville active.
- [x] Favoris compacts dans la sidebar desktop et accessibles sur mobile.
- [x] Polish des prévisions et de la lisibilité générale.

### Version 1.4.0 - Fondation multi-fournisseur

Statut : terminée.

- [x] Registre de fournisseurs fondé sur les capacités.
- [x] Orchestrateur avec fallback explicite et traçable.
- [x] Provenance normalisée pour la météo actuelle, les prévisions et la qualité de l'air.
- [x] Open-Meteo conservé comme unique fournisseur actif.

### Version 1.4.1 - Recherche et géocodage fiables

Statut : terminée.

- [x] Suggestions accessibles et responsive.
- [x] Recherche par ville, code postal et pays.
- [x] Classement prioritaire des lieux habités.
- [x] Annulation des recherches obsolètes et sélection explicite en cas d'ambiguïté.
- [x] Déduplication sémantique et correction tactile mobile.

## Prochaine étape - Publication Reliability & Documentation

Statut : en cours.

- [ ] Finaliser le certificat HTTPS du domaine personnalisé.
- [ ] Vérifier l'accès direct au service worker sans redirection.
- [ ] Confirmer le remplacement des anciens caches et services workers publiés.
- [ ] Valider la documentation v1.4.1 et les procédures de publication.
- [ ] Retester la géolocalisation et l'installation PWA une fois HTTPS actif.

## Étapes suivantes

Les éléments ci-dessous sont prévus, mais ne sont pas terminés :

- validation PWA sur Chrome, Edge, Android et iOS ;
- tests de géolocalisation réelle et sur appareils physiques ;
- amélioration de l'accessibilité après tests clavier et lecteurs d'écran ;
- intégration progressive d'un second fournisseur météo ;
- radar météo et vigilance officielle, avec attribution et sources clairement identifiées ;
- préférences d'unités et paramètres utilisateur simples ;
- futur Mode Expert avec données détaillées, comparaison de sources et visualisations avancées.
