# JS Services

Ce dossier contient les modules responsables des données externes et de leur orchestration.

Modules principaux :

- `weather-provider.js` : registre des fournisseurs météo actifs ;
- `weather-orchestrator.service.js` : sélection des fournisseurs par capacité et fallback traçable ;
- `openmeteo.service.js` : météo actuelle et prévisions ;
- `geocoding.service.js` : recherche mondiale, variante contrôlée et normalisation des lieux ;
- `geolocation.service.js` : position actuelle du navigateur ;
- `air-quality.service.js` : qualité de l'air.

Les services appellent les APIs, normalisent les réponses et renvoient des données stables aux composants.

Les composants ne doivent jamais appeler directement les APIs.

Chaque fournisseur déclare ses capacités, reçoit une localisation et renvoie uniquement le modèle météo interne de MeteoSignal. Les réponses brutes ne quittent jamais son adaptateur.

Open-Meteo est l'unique fournisseur actif en v1.4.0. Un appel Forecast couvre la météo actuelle, les prévisions horaires, les prévisions quotidiennes et les données d'astronomie disponibles. Air Quality reste un appel séparé.

La provenance est conservée par bloc dans `weather.sources`. Aucune moyenne ou fusion automatique n'est autorisée.

Le bloc astronomie expose un modèle normalisé `astronomy.sun` et `astronomy.moon`. La Lune est calculée localement pour la v1.0 afin d'éviter une dépendance API supplémentaire.

La référence complète est disponible dans `docs/multi-provider-architecture.md`.
