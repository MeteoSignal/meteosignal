# Feuille de route détaillée - MeteoSignal v1.0

Cette feuille de route remplace les anciens sprints exploratoires pour guider la construction stable de MeteoSignal v1.0.

## Phase 1 - Fondation

Objectif : stabiliser les références du projet avant le développement des composants.

Livrables :

- architecture officielle ;
- décisions techniques ;
- feuille de route v1.0 ;
- correction progressive de l'encodage UTF-8 ;
- préparation de l'organisation cible des fichiers.

Validation :

- documentation lisible ;
- périmètre v1.0 clair ;
- flux Git clair ;
- aucun comportement météo cassé.

## Phase 2 - Structure et design system

Objectif : créer la base visuelle stable.

Livrables :

- HTML principal propre ;
- tokens CSS ;
- base typographique ;
- layout responsive ;
- composants UI génériques ;
- cohérence visuelle premium.

Validation :

- interface lisible sur mobile, tablette et desktop ;
- pas d'élément qui déborde ;
- style cohérent avec l'identité MeteoSignal.

## Phase 3 - Services météo

Objectif : isoler les appels API.

Livrables :

- service Open-Meteo Forecast ;
- service Geocoding ;
- service Air Quality ;
- formatage interne des données ;
- gestion des erreurs et chargements.

Validation :

- appels API fiables ;
- erreurs affichables proprement ;
- composants indépendants des APIs.

## Phase 4 - Hero météo

Objectif : livrer le premier composant central de l'expérience.

Livrables :

- ville active ;
- température ;
- ressenti ;
- description météo ;
- min/max ;
- icône ou état météo ;
- date de mise à jour ;
- état chargement et erreur.

Validation :

- rendu premium ;
- données exactes ;
- responsive complet.

## Phase 5 - Recherche, géolocalisation et favoris

Objectif : personnaliser l'expérience.

Livrables :

- recherche de ville ;
- sélection de résultat ;
- géolocalisation ;
- favoris ;
- ville active persistante.

Validation :

- navigation clavier ;
- messages d'erreur clairs ;
- stockage local fiable.

## Phase 6 - Cartes météo

Objectif : afficher les indicateurs essentiels.

Livrables :

- vent ;
- humidité ;
- pression ;
- précipitations ;
- indice UV ;
- qualité de l'air.

Validation :

- cartes lisibles ;
- unités correctes ;
- hiérarchie visuelle claire.

## Phase 7 - Prévisions

Objectif : rendre les prévisions consultables rapidement.

Livrables :

- prévisions horaires ;
- prévisions sur 7 jours ;
- températures min/max ;
- probabilités de pluie ;
- états météo.

Validation :

- défilement fluide sur mobile ;
- données cohérentes ;
- rendu compact et lisible.

## Phase 8 - Soleil et lune

Objectif : enrichir l'information sans complexifier l'interface.

Livrables :

- lever du soleil ;
- coucher du soleil ;
- durée du jour ;
- phase lunaire ;
- illumination lunaire si disponible ou calculée.

Validation :

- données compréhensibles ;
- affichage élégant ;
- pas de surcharge visuelle.

## Phase 9 - PWA

Objectif : rendre MeteoSignal installable et fiable.

Livrables :

- manifest complet ;
- icônes adaptées ;
- service worker ;
- cache statique ;
- gestion hors ligne simple.

Validation :

- installation possible ;
- chargement rapide ;
- comportement hors ligne compréhensible.

## Phase 10 - Responsive, accessibilité et performance

Objectif : préparer la stabilisation v1.0.

Livrables :

- tests mobile, tablette, desktop et grands écrans ;
- navigation clavier ;
- contrastes ;
- optimisation des animations ;
- nettoyage du code.

Validation :

- aucune erreur console ;
- interface stable ;
- performances correctes ;
- accessibilité raisonnable pour une v1.0.

## Phase 11 - Stabilisation v1.0.0

Objectif : publier une version officielle fiable.

Livrables :

- tests finaux ;
- documentation utilisateur ;
- changelog ;
- version `1.0.0` ;
- publication GitHub Pages.

Validation :

- version publiable ;
- fonctionnalités principales complètes ;
- documentation à jour ;
- aucun bug bloquant connu.
