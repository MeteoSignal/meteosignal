# MeteoSignal

> La météo, partout avec vous.

MeteoSignal est une Progressive Web App météo moderne, élégante, rapide et intuitive.

Le projet est conçu comme un véritable produit logiciel : simple à utiliser, agréable à consulter, maintenable dans le temps et capable d'évoluer vers des fonctionnalités plus avancées sans reconstruire ses fondations.

## Référence officielle

Ce fichier résume la vision du projet. Les documents techniques de référence sont :

- [Architecture](docs/architecture.md)
- [Décisions techniques](docs/decisions.md)
- [Feuille de route v1.0](docs/roadmap-v1.md)

Ces documents doivent être consultés avant chaque évolution importante.

## Vision

MeteoSignal doit donner immédiatement l'impression d'une application météo premium :

- interface moderne et lisible ;
- expérience fluide sur mobile, tablette et ordinateur ;
- informations météo utiles, bien hiérarchisées ;
- design cohérent, principalement bleu, avec une identité propre ;
- performance et simplicité comme priorités permanentes.

MeteoSignal ne copie pas une application existante. Le projet s'inspire des meilleurs standards des applications météo modernes tout en construisant sa propre identité graphique.

## Principes

Le développement suit quatre principes :

- simplicité ;
- élégance ;
- performance ;
- évolutivité.

Une fonctionnalité est ajoutée uniquement si elle améliore clairement l'expérience utilisateur.

## Technologies

Version 1.0 :

- HTML5 ;
- CSS3 ;
- JavaScript ES6 natif ;
- Progressive Web App ;
- Git, GitHub, GitHub Pages ;
- Open-Meteo comme fournisseur principal.

Aucun framework JavaScript n'est utilisé pour la version 1.0.

## Périmètre de la version 1.0

La version 1.0 doit proposer une expérience complète, stable et simple :

- météo actuelle ;
- recherche de ville ;
- géolocalisation ;
- favoris ;
- prévisions horaires ;
- prévisions sur 7 jours ;
- soleil et lune ;
- indice UV ;
- qualité de l'air ;
- pression, humidité, vent, précipitations ;
- PWA installable ;
- mode sombre automatique ;
- responsive mobile, tablette, ordinateur et grands écrans.

## Versions ultérieures

Les fonctionnalités suivantes sont préparées architecturalement, mais ne sont pas prioritaires pour la v1.0 :

- mode Expert ;
- radar météo ;
- vigilance météo ;
- widgets ;
- notifications ;
- publications plateforme avancées.

## Méthode de développement

Chaque composant suit le cycle suivant :

1. Conception
2. Architecture
3. HTML
4. CSS
5. JavaScript
6. Responsive
7. Tests
8. Validation
9. Commit
10. Push
11. Merge
12. Publication

Un composant validé reste stable. Il n'est modifié ensuite que pour corriger un bug, optimiser le fonctionnement ou ajouter une fonctionnalité prévue.

## Organisation Git

- `main` : version publique stable ;
- `develop` : préparation de la prochaine version ;
- `feature/*` : développement d'une évolution précise.

Le développement ne se fait pas directement sur `main`.

## Qualité

MeteoSignal privilégie toujours :

- la qualité à la quantité ;
- la stabilité aux nouveautés inutiles ;
- la lisibilité à la complexité ;
- l'expérience utilisateur aux effets décoratifs.

Objectif final : construire une application météo dont l'architecture, l'interface et la qualité pourront rester solides pendant plusieurs années.
