# 🌦️ PROJECT.md

# MeteoSignal

> **La météo, partout avec vous.**

---

# 📖 À propos

PROJECT.md est le document de référence de MeteoSignal.

Il décrit la vision du projet, ses objectifs, ses règles de développement, les décisions importantes et la manière dont le projet est conduit.

Avant chaque reprise du développement, ce document doit être relu en priorité.

---

# 🌦️ Pourquoi MeteoSignal ?

MeteoSignal est né d'une ambition simple :

Créer une application météo moderne, élégante, rapide et riche en informations, capable de fonctionner sur smartphone, tablette, ordinateur et télévision.

Le projet est développé comme un logiciel à long terme.

Chaque version doit améliorer l'expérience utilisateur tout en conservant une architecture simple, documentée et évolutive.

---

# 🎯 Vision

MeteoSignal n'a pas pour objectif de reproduire une application météo existante.

L'objectif est de créer une identité propre, reconnaissable et capable d'évoluer pendant de nombreuses années.

Le projet s'adresse aussi bien au grand public qu'aux passionnés de météorologie.

---

# 🌍 Plateformes

* 📱 Smartphone
* 📟 Tablette
* 💻 PC
* 📺 Télévision
* 🤖 Android (Play Store)

À terme, MeteoSignal pourra également être utilisé avec un domaine personnalisé et être déployé sur d'autres plateformes.

---

# 💙 Notre devise

> **La météo, partout avec vous.**

---

# 🧭 Notre philosophie

Nous développons aujourd'hui ce que nous serons fiers de maintenir demain.

Chaque décision doit rendre MeteoSignal :

* plus simple ;
* plus lisible ;
* plus fiable ;
* plus évolutif.

La qualité est considérée comme une fonctionnalité.

---

# 🤝 Notre méthode

Chaque évolution suit toujours le même cycle :

Idée

↓

Discussion

↓

Conception

↓

Maquette

↓

Développement

↓

Tests

↓

Documentation

↓

Commit

↓

Version

---

# 🌳 Organisation Git

## main

Contient uniquement les versions stables.

## develop

Contient le développement en cours.

## feature/...

Contient une fonctionnalité en cours de développement.

---

# 📚 Documentation officielle

* PROJECT.md → Mémoire du projet
* README.md → Présentation publique
* CHANGELOG.md → Historique des versions
* ROADMAP.md → Vision à moyen et long terme
* TODO.md → Travail en cours

---

# 🏗️ Architecture

Technologies principales :

* HTML5
* CSS3
* JavaScript (ES6+)
* Progressive Web App (PWA)

Le projet est conçu pour permettre le remplacement ou l'ajout de plusieurs fournisseurs météo sans modifier l'architecture générale.

---

# 📌 Principes de développement

* Une fonctionnalité à la fois.
* Une responsabilité par fichier.
* Toujours documenter les décisions importantes.
* Toujours tester avant validation.
* Toujours privilégier la qualité à la rapidité.
* La branche `main` reste toujours stable.
* Le projet est plus important que nos habitudes.

---

# 🌦️ Vision fonctionnelle

MeteoSignal devra proposer une météo riche en informations tout en restant agréable à consulter.

Les informations prévues comprennent notamment :

## Conditions actuelles

* Température
* Température ressentie
* Description météo
* Humidité
* Pression atmosphérique
* Vent
* Direction du vent
* Rafales
* Précipitations
* Probabilité de pluie
* Point de rosée
* Visibilité
* Couverture nuageuse
* Indice UV

## Soleil

* Lever
* Coucher
* Durée du jour

## Lune

* Lever
* Coucher
* Phase lunaire
* Illumination

## Prévisions

* Prévisions horaires
* Prévisions sur 7 jours

## Cartographie (versions futures)

* Radar des précipitations
* Images satellite
* Carte des vents
* Vigilance météo

---

# 🧩 Architecture du Dashboard

Le tableau de bord sera construit sous forme de modules indépendants.

Modules principaux :

* Header
* Conditions actuelles
* Atmosphère
* Vent
* Soleil
* Lune
* Prévisions horaires
* Prévisions à 7 jours
* Graphiques
* Cartographie
* Footer

Cette architecture permettra d'ajouter facilement de nouvelles fonctionnalités sans remettre en cause l'ensemble de l'application.

---

# 📌 Décisions validées

* MeteoSignal possède sa propre identité graphique.
* Le projet ne sera pas une copie d'une autre application météo.
* Le Dashboard sera composé de cartes indépendantes.
* L'application fonctionnera sur smartphone, tablette, PC et TV.
* Le projet évoluera progressivement afin de garantir sa qualité.
* Les décisions importantes seront toujours documentées.

---

# 🤝 Notre engagement

Nous développons MeteoSignal dans un esprit de collaboration.

Chaque idée peut être discutée.

Chaque décision est prise dans l'intérêt du projet.

La communication est considérée comme une partie essentielle du développement.

---

# ▶️ Reprise du projet

En cas d'interruption du développement :

1. Lire PROJECT.md.
2. Vérifier ROADMAP.md.
3. Consulter TODO.md.
4. Identifier le sprint en cours.
5. Continuer exactement là où le projet s'est arrêté.

---

# 📔 Journal du projet

## 26 juin 2026

* Naissance de MeteoSignal.
* Création du dépôt GitHub.
* Publication sur GitHub Pages.
* Mise en place de la structure du projet.
* Création de la branche `develop`.
* Création de la documentation officielle.
* Conception des premières maquettes.
* Début du Sprint 1.

---

# 💬 Notre phrase

> **Construire aujourd'hui ce que nous serons fiers de maintenir demain.**

---

Début du projet : **2026**

Auteur : **Yoann Bourillon**

Accompagnement technique : **ChatGPT**

Licence : **MIT**

# 🎨 Référence graphique

La maquette officielle validée est la référence graphique de MeteoSignal.

Toutes les évolutions de l'interface doivent respecter cette maquette.

En cas de doute, la maquette prévaut sur l'implémentation existante.

# 🌦️ Modes d'affichage

MeteoSignal proposera trois niveaux d'affichage.

## ☀️ Essentiel

Informations principales.

## 🌤️ Complet

Informations enrichies.

## 👑 Expert

Toutes les données météorologiques disponibles.

Le mode Expert pourra évoluer vers une offre Premium lorsque le projet sera suffisamment mature.

# 🚀 Publication

Le développement suit le cycle suivant :

feature/... → develop → main

Les utilisateurs suivent les évolutions via les versions publiques.

Seules les versions stables sont publiées sur la branche `main`.

# 📦 Versions

v0.x.x → Développement

v1.0.0 → Première version officielle

v2.x.x → Évolutions majeures

# 🎯 Priorités

L'ordre de développement est le suivant :

1. Architecture
2. Interface utilisateur
3. Fonctionnalités
4. Optimisations
5. Monétisation

La qualité prime toujours sur la rapidité.

