# ROADMAP

MeteoSignal évolue par versions courtes et publiables. Chaque étape doit préserver la simplicité, l'élégance, la performance, l'accessibilité et la maintenabilité du produit.

## Historique terminé

### Version 1.0.0 - Fondation stable

Statut : terminée.

- [x] Architecture modulaire HTML, CSS et JavaScript sans framework.
- [x] Modèle météo interne normalisé et Open-Meteo comme source principale.
- [x] Météo actuelle, prévisions horaires et prévisions sur 7 jours.
- [x] Recherche, géolocalisation, ville active sauvegardée et premiers favoris.
- [x] Soleil, Lune, UV, qualité de l'air et indicateurs météo.
- [x] PWA et navigation adaptative initiales.

### Versions 1.1 à 1.3 - Identité, alertes et favoris

Statut : terminées.

- [x] Identité visuelle officielle et expérience mobile.
- [x] Icônes météo SVG et prévisions horaires étendues à 72 heures.
- [x] Moteur d'alertes locales indicatives avec gestion des données absentes.
- [x] Favoris visibles, sélection, suppression et conservation de la ville active.

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

### Publication Reliability & Documentation

Statut : terminée pour le socle Web v1.4.1.

- [x] Domaine personnalisé disponible directement en HTTPS.
- [x] Service worker, manifeste et Digital Asset Links servis en HTTP 200 sans redirection.
- [x] Cache statique versionné, nettoyage des anciens caches et API météo hors Cache Storage.
- [x] Accessibilité essentielle, responsive, sécurité navigateur et confidentialité audités.
- [x] Workflow CI durci avec permissions minimales et actions épinglées par SHA.
- [x] Association Android/TWA déclarant les certificats local et Google Play.
- [x] Documentation v1.4.1 et rapport final d'audit mis en cohérence.

## Audit final v1.4.1

Statut : clôture technique validée avec réserves de validation physique.

Les phases P0 à P1E ont couvert l'exactitude du modèle météo, la PWA, les performances, l'accessibilité, la sécurité, la confidentialité, la CI et Android/TWA. Le [rapport officiel](docs/audit-final-v1.4.1.md) distingue les contrôles automatiques, les contrôles publics et les essais restant à réaliser sur appareils ou services externes.

## Publication et validations externes ouvertes

Ces étapes ne sont pas des défauts du code v1.4.1 :

- test fermé Google Play avec douze testeurs continus pendant quatorze jours ;
- vérification finale de la fiche « Sécurité des données » dans Play Console ;
- test de la TWA installée depuis Google Play, sans barre de navigateur ;
- installation PWA réelle sur les plateformes et appareils non encore physiquement testés ;
- essais avec lecteurs d'écran réels, notamment NVDA et TalkBack ;
- contrôle périodique des SHA des actions GitHub.

## Étapes futures

Les éléments ci-dessous sont prévus, mais ne sont pas terminés :

- intégration progressive d'un second fournisseur météo ;
- radar météo et vigilance officielle, avec attribution et sources clairement identifiées ;
- préférences d'unités et paramètres utilisateur simples ;
- futur Mode Expert avec données détaillées, comparaison de sources et visualisations avancées ;
- amélioration éventuelle des en-têtes HTTP si l'hébergement permet un jour de les configurer.
