# JS Core

Ce dossier contient les modules internes indépendants de l'interface.

Modules principaux :

- `state.js` : état global minimal de l'application ;
- `storage.js` : lecture et écriture dans `localStorage` ;
- `formatters.js` : formatage des dates, heures, unités et libellés ;
- `moon.js` : calcul local de la phase lunaire et de l'illumination ;
- `weather-codes.js` : traduction des codes météo en états lisibles.
- `location-search.js` : normalisation, comparaison et classement des lieux ;
- `provenance.js` : modèle de provenance des données ;
- `weather-alerts.js` : règles locales indicatives ;
- `weather-icons.js` : registre des icônes météo.

Les modules `core` ne doivent pas manipuler directement le DOM.

Ils servent aussi de base au modèle interne normalisé consommé par l'interface.

`storage.js` valide, normalise et répare les valeurs persistées avant de les exposer au reste de l'application.
