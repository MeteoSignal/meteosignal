# JS Services

Ce dossier contiendra les modules responsables des données externes.

Modules prévus :

- `openmeteo.service.js` : météo actuelle et prévisions ;
- `geocoding.service.js` : recherche de ville ;
- `air-quality.service.js` : qualité de l'air.

Les services appellent les APIs, normalisent les réponses et renvoient des données stables aux composants.

Les composants ne doivent jamais appeler directement les APIs.
