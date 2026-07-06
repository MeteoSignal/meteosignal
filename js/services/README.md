# JS Services

Ce dossier contiendra les modules responsables des données externes.

Modules prévus :

- `weather-provider.js` : registre des fournisseurs météo actifs ;
- `openmeteo.service.js` : météo actuelle et prévisions ;
- `geocoding.service.js` : recherche de ville ;
- `geolocation.service.js` : position actuelle du navigateur ;
- `air-quality.service.js` : qualité de l'air.

Les services appellent les APIs, normalisent les réponses et renvoient des données stables aux composants.

Les composants ne doivent jamais appeler directement les APIs.

Chaque fournisseur doit respecter le même contrat : il reçoit une localisation et renvoie le modèle météo interne de MeteoSignal.

Le bloc astronomie expose un modèle normalisé `astronomy.sun` et `astronomy.moon`. La Lune est calculée localement pour la v1.0 afin d'éviter une dépendance API supplémentaire.
