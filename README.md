# MeteoSignal

> Prévisions et alertes météo.

MeteoSignal est une Progressive Web App météo moderne, rapide et responsive. Elle fournit une expérience complète sur smartphone, tablette, ordinateur et grand écran, avec une interface premium conçue pour rester simple à utiliser.

**Version actuelle : 1.4.1**

## Accès officiels

- Application : [https://meteosignal.fr](https://meteosignal.fr)
- Code source : [https://github.com/MeteoSignal/meteosignal](https://github.com/MeteoSignal/meteosignal)

Le domaine officiel de MeteoSignal est [https://meteosignal.fr](https://meteosignal.fr). La disponibilité HTTPS dépend de la validation du certificat GitHub Pages lors de la configuration initiale du domaine personnalisé.

## Fonctionnalités disponibles

- météo actuelle et indicateurs détaillés : température, ressenti, vent, rafales, humidité, pression et précipitations ;
- prévisions horaires sur 72 heures, présentées par tranches de 24 heures ;
- prévisions quotidiennes sur 7 jours ;
- recherche géographique avancée avec suggestions, codes postaux, pays et classement des lieux habités ;
- géolocalisation du navigateur ;
- villes favorites enregistrées localement ;
- indice UV et qualité de l'air ;
- lever et coucher du soleil, durée du jour et phase lunaire ;
- alertes météo locales indicatives basées sur des seuils MeteoSignal ;
- provenance des données par bloc météo ;
- fonctionnement responsive sur mobile, tablette, desktop et télévision ;
- installation Progressive Web App avec cache statique hors ligne.

Les alertes MeteoSignal sont locales et indicatives. Elles ne remplacent pas une vigilance officielle émise par une autorité météorologique.

## Données météo

MeteoSignal dispose depuis la v1.4.0 d'une fondation multi-fournisseur fondée sur les capacités et la provenance des données. **Open-Meteo reste actuellement l'unique fournisseur actif** pour les prévisions et la qualité de l'air.

L'architecture permet d'ajouter progressivement d'autres fournisseurs sans modifier les composants de l'interface ni mélanger automatiquement leurs valeurs.

## Technologies

- HTML5 ;
- CSS3 ;
- JavaScript ES6 natif, sans framework ;
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

La commande de test exécute la suite native Node.js :

```powershell
npm test
```

## Documentation

- [Vision du projet](PROJECT.md)
- [Architecture](docs/architecture.md)
- [Architecture multi-fournisseur](docs/multi-provider-architecture.md)
- [Décisions techniques](docs/decisions.md)
- [Feuille de route](ROADMAP.md)
- [Changelog](CHANGELOG.md)

## Licence

Licence MIT.

Développé par **Yoann Bourillon**.
