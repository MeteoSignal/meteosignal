# MeteoSignal

> Phrase secondaire : « La météo, partout avec vous. »

MeteoSignal est une Progressive Web App météo moderne, élégante, rapide et intuitive.

Le projet est conçu comme un véritable produit logiciel : simple à utiliser, agréable à consulter, maintenable dans le temps et capable d'évoluer vers des fonctionnalités plus avancées sans reconstruire ses fondations.

## État actuel

MeteoSignal est publié en version **1.5.2**. Le produit propose la météo actuelle, les prévisions horaires sur 72 heures, les prévisions sur 7 jours, la recherche géographique, la géolocalisation, les favoris, l'astronomie, la qualité de l'air et des alertes locales indicatives.

La v1.4.0 a introduit une fondation multi-fournisseur avec registre par capacités, orchestration et provenance des données. Open-Meteo reste l'unique fournisseur actif en v1.5.2 ; aucun mélange automatique de données entre fournisseurs n'est réalisé.

Au 14 juillet 2026, la v1.4.2 officialise les corrections du socle v1.4.1 audité de bout en bout. Les protections suivantes sont intégrées et testées : données météo normalisées, appels annulables sans cache applicatif, stockage local validé, accessibilité structurelle et clavier, PWA statique versionnée, CSP, politique de référent, CI en lecture seule et association Digital Asset Links avec les certificats local et Google Play.

MeteoSignal Android/TWA v1.4.2 (`versionCode 2`) a été acceptée sur la piste de test fermé Google Play. Cette validation ne signifie pas encore que l'application est disponible publiquement en production. Le test physique de la version distribuée, la demande d'accès à la production et la cohérence de la fiche « Sécurité des données » restent suivis séparément dans le [TODO](TODO.md).

La version 1.5.0 unifie la navigation des villes, rend la carte météo principale immersive avec sept scènes contextuelles et optimise l'utilisation du desktop sans fragiliser le socle Web, PWA ou TWA. Sa [spécification officielle](docs/v1.5.0-specification.md) conserve le périmètre et les critères de validation appliqués.

La v1.5.1 a publié les corrections responsive du header et de la navigation tablette. La v1.5.2 est une publication corrective de conformité W3C : l'image décorative de scène possède désormais un fallback HTML valide, sans modifier le chargement atomique des scènes ni le rendu attendu.

## Référence officielle

Ce fichier résume la vision du projet. Les documents techniques de référence sont :

- [Rapport final d'audit v1.4.1](docs/audit-final-v1.4.1.md)
- [Spécification MeteoSignal v1.5.0](docs/v1.5.0-specification.md)
- [Architecture](docs/architecture.md)
- [Architecture multi-fournisseur](docs/multi-provider-architecture.md)
- [Décisions techniques](docs/decisions.md)
- [Feuille de route actuelle](ROADMAP.md)
- [Historique de la feuille de route v1.0](docs/roadmap-v1.md)
- [Changelog](CHANGELOG.md)

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

Le développement suit désormais six principes validés par l'audit v1.4.1 :

- simplicité et lisibilité du code natif ;
- élégance sans dégrader l'accessibilité ou les petits appareils ;
- performance mesurée sans optimisation artificielle ;
- évolutivité par contrats et capacités ;
- exactitude et provenance explicite des données ;
- confidentialité, sécurité et cache prudent par défaut.

Une fonctionnalité est ajoutée uniquement si elle améliore clairement l'expérience utilisateur et conserve ces garanties.

## Technologies

Socle actuel en v1.5.2 :

- HTML5 ;
- CSS3 ;
- JavaScript ES6 natif ;
- Progressive Web App ;
- Git, GitHub, GitHub Pages ;
- Open-Meteo comme fournisseur actif au sein de l'architecture multi-fournisseur.

Aucun framework JavaScript ni outil de build applicatif n'est utilisé.

## Périmètre historique de la version 1.0

La version 1.0 a établi une expérience complète, stable et simple :

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

## Évolutions futures

Les fonctionnalités suivantes restent prévues au-delà de la v1.5.2 :

- mode Expert ;
- radar météo ;
- vigilance météo officielle ;
- second fournisseur météo actif ;
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
- `feature/*` : développement d'une évolution précise ;
- `fix/*` ou `hotfix/*` : correction ciblée ;
- `docs/*` ou `audit/*` : documentation et validation isolées.

Le développement ne se fait pas directement sur `main`.

## Qualité

MeteoSignal privilégie toujours :

- la qualité à la quantité ;
- la stabilité aux nouveautés inutiles ;
- la lisibilité à la complexité ;
- l'expérience utilisateur aux effets décoratifs ;
- les preuves reproductibles aux affirmations générales ;
- la séparation claire entre défaut du code et étape de publication externe.

Objectif final : construire une application météo dont l'architecture, l'interface et la qualité pourront rester solides pendant plusieurs années.
