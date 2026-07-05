# JS Core

Ce dossier contiendra les modules internes indépendants de l'interface.

Modules prévus :

- `state.js` : état global minimal de l'application ;
- `storage.js` : lecture et écriture dans `localStorage` ;
- `formatters.js` : formatage des dates, heures, unités et libellés ;
- `weather-codes.js` : traduction des codes météo en états lisibles.

Les modules `core` ne doivent pas manipuler directement le DOM.

Ils servent aussi de base au modèle interne normalisé consommé par l'interface.
