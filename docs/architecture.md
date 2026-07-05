# Architecture officielle - MeteoSignal v1.0

Statut : validée le 5 juillet 2026.

Ce document décrit l'architecture de référence de MeteoSignal v1.0. Toute nouvelle fonctionnalité doit s'y intégrer sans modifier les fondations, sauf décision documentée dans `docs/decisions.md`.

## Objectif architectural

MeteoSignal doit rester :

- simple à comprendre ;
- modulaire ;
- rapide ;
- compatible GitHub Pages ;
- maintenable sans outil de build ;
- évolutif vers des fonctionnalités météo avancées.

La version 1.0 utilise HTML, CSS et JavaScript ES6 natif, sans framework.

## Organisation cible

```text
meteosignal/
├─ index.html
├─ manifest.json
├─ sw.js
├─ config/
│  └─ config.js
├─ css/
│  ├─ tokens.css
│  ├─ base.css
│  ├─ layout.css
│  ├─ components.css
│  ├─ responsive.css
│  └─ style.css
├─ js/
│  ├─ app.js
│  ├─ core/
│  │  ├─ state.js
│  │  ├─ storage.js
│  │  ├─ formatters.js
│  │  └─ weather-codes.js
│  ├─ services/
│  │  ├─ openmeteo.service.js
│  │  ├─ geocoding.service.js
│  │  └─ air-quality.service.js
│  ├─ components/
│  │  ├─ header.js
│  │  ├─ search.js
│  │  ├─ current-weather.js
│  │  ├─ weather-cards.js
│  │  ├─ hourly-forecast.js
│  │  ├─ daily-forecast.js
│  │  ├─ astronomy.js
│  │  └─ favorites.js
│  └─ pwa.js
├─ assets/
│  ├─ backgrounds/
│  ├─ icons/
│  └─ logo/
└─ docs/
   ├─ architecture.md
   ├─ decisions.md
   └─ roadmap-v1.md
```

## Rôle des dossiers

`config/` contient les constantes globales : nom de l'application, version, paramètres par défaut, délais de cache et configuration API publique.

`css/` contient le système visuel. Les styles sont séparés par responsabilité pour éviter un fichier unique difficile à maintenir.

`js/core/` contient les outils internes indépendants de l'interface : état global, stockage local, formatage, traduction des codes météo.

`js/services/` contient les appels aux APIs et la transformation des réponses externes en données utilisables par l'application.

`js/components/` contient les composants d'interface. Chaque composant reçoit des données propres et met à jour uniquement sa zone.

`assets/` contient les images, icônes et logos.

`docs/` contient les documents de référence du projet.

## Flux de données

1. L'utilisateur ouvre l'application.
2. `app.js` initialise l'état global.
3. L'application charge la ville active depuis `localStorage` ou utilise la ville par défaut.
4. Les services récupèrent les données météo via Open-Meteo.
5. Les données sont normalisées dans un format interne stable.
6. Les composants reçoivent ces données et mettent à jour l'interface.
7. Les préférences utilisateur sont conservées localement.

Les composants ne doivent pas appeler directement les APIs. Ils affichent des données préparées par les services.

## État applicatif

L'état global minimal contient :

- ville active ;
- coordonnées actives ;
- météo actuelle ;
- prévisions horaires ;
- prévisions journalières ;
- données soleil et lune ;
- qualité de l'air ;
- favoris ;
- état de chargement ;
- état d'erreur ;
- préférences utilisateur.

L'état doit rester simple. Une solution complexe de gestion d'état n'est pas nécessaire pour la v1.0.

## APIs

API principale :

- Open-Meteo Forecast.

APIs complémentaires v1.0 :

- Open-Meteo Geocoding pour la recherche de ville ;
- Open-Meteo Air Quality pour la qualité de l'air.

Les APIs nécessitant une clé ou un coût d'utilisation sont exclues de la v1.0 sauf valeur claire et décision documentée.

## CSS

La couche CSS est organisée ainsi :

- `tokens.css` : couleurs, tailles, ombres, rayons, transitions ;
- `base.css` : reset léger, typographie, accessibilité ;
- `layout.css` : structure de page, grilles, conteneurs ;
- `components.css` : cartes, boutons, champs, composants météo ;
- `responsive.css` : adaptations mobile, tablette, grands écrans ;
- `style.css` : point d'entrée temporaire ou fichier de compatibilité pendant la migration.

L'identité visuelle repose sur :

- bleu nuit ;
- bleu clair ;
- blanc ;
- jaune pour les températures ou signaux importants ;
- glassmorphism léger ;
- ombres douces ;
- animations discrètes.

## JavaScript

Règles :

- une responsabilité par fichier ;
- fonctions courtes et lisibles ;
- pas de logique API dans les composants ;
- pas de manipulation DOM globale dispersée ;
- gestion explicite des erreurs ;
- données formatées avant affichage ;
- aucun framework pour la v1.0.

## PWA

La PWA doit fournir :

- manifest complet ;
- icônes adaptées ;
- service worker ;
- cache des fichiers statiques ;
- état hors ligne simple et compréhensible ;
- compatibilité GitHub Pages.

La stratégie de cache doit rester prudente : priorité au chargement rapide, sans afficher durablement des données météo obsolètes comme si elles étaient fraîches.

## Accessibilité

La v1.0 doit viser :

- contrastes élevés ;
- navigation clavier ;
- libellés accessibles pour les contrôles ;
- tailles de police lisibles ;
- états focus visibles ;
- alternatives textuelles pour les visuels importants.

## Performance

Objectifs :

- limiter les appels API ;
- éviter les animations coûteuses ;
- charger uniquement les ressources nécessaires ;
- conserver un DOM simple ;
- garder une interface fluide sur mobile.

## Validation d'un composant

Un composant est terminé uniquement si les validations suivantes sont passées :

- validation technique : pas d'erreur console, code lisible, logique isolée ;
- validation visuelle : rendu cohérent avec l'identité MeteoSignal ;
- validation responsive : mobile, tablette et desktop ;
- validation fonctionnelle : cas nominal, chargement, erreur ou absence de données ;
- validation d'intégration : le composant ne dégrade pas les autres parties.
