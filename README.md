# MeteoSignal

> Prévisions et alertes météo.

MeteoSignal est une Progressive Web App météo moderne, rapide et responsive. Elle fournit une expérience complète sur smartphone, tablette, ordinateur et grand écran, avec une interface conçue pour rester simple à utiliser.

**Version publique : 1.4.2**

## Accès officiels

- Application HTTPS : [https://meteosignal.fr](https://meteosignal.fr)
- Code source : [https://github.com/MeteoSignal/meteosignal](https://github.com/MeteoSignal/meteosignal)
- Politique de confidentialité : [https://meteosignal.fr/confidentialite.html](https://meteosignal.fr/confidentialite.html)
- Formulaire de retour : [Votre avis compte](https://docs.google.com/forms/d/e/1FAIpQLSfOQypJBgcKy1KcQ187O_vd8rf65cAhotRveU4s7kMgogfQVw/viewform)

Le domaine personnalisé est servi directement en HTTPS par GitHub Pages. Le site, le manifeste, le service worker et le fichier Digital Asset Links sont disponibles sans redirection.

## Fonctionnalités disponibles

- météo actuelle et indicateurs détaillés : température, ressenti, vent, rafales, humidité, pression et précipitations ;
- prévisions horaires sur 72 heures, présentées par tranches de 24 heures ;
- prévisions quotidiennes sur 7 jours ;
- recherche géographique avec suggestions, codes postaux, pays et classement des lieux habités ;
- géolocalisation du navigateur ;
- villes favorites enregistrées localement ;
- indice UV et qualité de l'air ;
- lever et coucher du soleil, durée du jour et phase lunaire ;
- alertes météo locales indicatives basées sur des seuils MeteoSignal ;
- provenance des données par bloc météo ;
- navigation responsive et accessible ;
- installation PWA avec cache statique hors ligne.

Les alertes MeteoSignal sont locales et indicatives. Elles ne remplacent pas une vigilance officielle émise par une autorité météorologique.

## Données météo

MeteoSignal dispose depuis la v1.4.0 d'une fondation multi-fournisseur fondée sur les capacités et la provenance des données. **Open-Meteo reste l'unique fournisseur actif en v1.4.2** pour les prévisions et la qualité de l'air.

Les réponses Forecast, Air Quality et Geocoding utilisent le réseau sans être stockées dans le Cache Storage de la PWA. L'architecture permet d'ajouter d'autres fournisseurs sans modifier les composants ni fusionner silencieusement leurs valeurs.

## Qualité et sécurité

La v1.4.2 officialise les corrections issues de l'audit technique v1.4.1 couvrant l'exactitude du modèle météo, la PWA, les performances, l'accessibilité, la confidentialité, la sécurité du navigateur, la CI et la relation Android/TWA.

- tests automatisés natifs Node.js, sans requête météo réelle dans la suite ;
- workflow GitHub Actions en lecture seule, avec actions épinglées par SHA ;
- CSP et politique de référent sur les deux pages ;
- validation et réparation défensives du stockage local ;
- limites, timeout et annulation des recherches ;
- deux certificats publics déclarés pour l'application Android `fr.meteosignal.app`.

MeteoSignal Android/TWA v1.4.2 (`versionCode 2`) a été acceptée sur la piste de test fermé Google Play. Cette acceptation ne correspond pas à une publication publique en production. Le test physique de la version installée depuis Google Play, la demande d'accès à la production et la vérification continue de la fiche « Sécurité des données » restent des validations distinctes.

## Technologies

- HTML5 ;
- CSS3 ;
- JavaScript ES6 natif, sans framework ni outil de build ;
- Open-Meteo ;
- Progressive Web App ;
- GitHub Pages.

## Installation locale

Prérequis : [Node.js](https://nodejs.org/) et npm.

```powershell
git clone https://github.com/MeteoSignal/meteosignal.git
cd meteosignal
npm test
npx serve .
```

Ouvrez ensuite l'adresse locale indiquée par `serve`. Lors de la première exécution, `npx` peut télécharger ponctuellement le paquet `serve`. Aucun processus de compilation n'est nécessaire et aucune dépendance applicative n'est installée dans le projet.

## Documentation

- [Rapport final d'audit v1.4.1](docs/audit-final-v1.4.1.md)
- [Vision du projet](PROJECT.md)
- [Architecture](docs/architecture.md)
- [Architecture multi-fournisseur](docs/multi-provider-architecture.md)
- [Décisions techniques](docs/decisions.md)
- [Feuille de route](ROADMAP.md)
- [Tâches ouvertes](TODO.md)
- [Changelog](CHANGELOG.md)

## Licence

Licence MIT.

Développé par **Yoann Bourillon**.
