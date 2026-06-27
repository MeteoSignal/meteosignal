# 🌦️ PROJECT.md

# MeteoSignal

> **La météo, partout avec vous.**

---

# 📖 À propos de ce document

Ce document est la mémoire officielle du projet.

Il décrit la vision, les objectifs, les décisions importantes, la méthode de travail et les règles de développement de MeteoSignal.

Avant chaque reprise du projet, ce document doit être relu en priorité.

---

# 🎯 Vision

MeteoSignal est une Progressive Web App (PWA) moderne conçue pour proposer une météo simple, rapide, élégante et accessible sur tous les appareils.

Notre ambition est de créer une application fiable, agréable à utiliser et capable d'évoluer pendant de nombreuses années.

---

# 🌍 Plateformes ciblées

* 📱 Smartphone
* 📟 Tablette
* 💻 PC
* 📺 Télévision
* 🤖 Android (Play Store)

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

La qualité est considérée comme une fonctionnalité à part entière.

---

# 🤝 Notre méthode de travail

Chaque évolution suit toujours le même cycle :

Idée

↓

Discussion

↓

Conception

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

# 📚 Documentation

## PROJECT.md

Mémoire officielle du projet.

## README.md

Présentation publique de MeteoSignal.

## CHANGELOG.md

Historique des versions.

## ROADMAP.md

Vision à moyen et long terme.

## TODO.md

Travail en cours.

---

# 🏗️ Architecture

Technologies principales :

* HTML5
* CSS3
* JavaScript (ES6+)
* Progressive Web App (PWA)

Architecture pensée pour permettre l'utilisation de plusieurs fournisseurs météo.

---

# 📜 Nos règles

* Une fonctionnalité à la fois.
* Une responsabilité par fichier.
* Toujours documenter.
* Toujours tester.
* Expliquer les décisions importantes.
* La branche `main` reste toujours stable.
* Le projet est plus important que nos habitudes.

---

# 📌 Décisions importantes

* MeteoSignal est développé comme une Progressive Web App.
* Le développement s'effectue sur la branche `develop`.
* Les versions stables sont publiées sur `main`.
* Les fournisseurs météo doivent pouvoir être remplacés facilement.
* L'interface doit fonctionner sur smartphone, tablette, PC et TV sans réécriture.

---

# 🎯 Objectif

Créer une application météo moderne, rapide, fiable et multiplateforme.

Une application dont nous pourrons être fiers pendant de nombreuses années.

---

# 🤝 Notre engagement

Nous travaillons en équipe.

Chaque idée peut être discutée.

Chaque décision est prise dans l'intérêt du projet.

La communication est une partie essentielle du développement.

---

# ▶️ Reprise du projet

Si le développement reprend après une longue interruption :

1. Lire PROJECT.md.
2. Consulter ROADMAP.md.
3. Vérifier TODO.md.
4. Identifier le sprint en cours.
5. Continuer exactement là où le projet s'est arrêté.

---

# 📔 Journal du projet

## 26 juin 2026

* Naissance de MeteoSignal.
* Création du dépôt GitHub.
* Publication sur GitHub Pages.
* Création de la branche `develop`.
* Mise en place de la documentation :

  * README.md
  * CHANGELOG.md
  * ROADMAP.md
  * TODO.md
  * PROJECT.md
* Début du Sprint 1.

---

# 💬 Notre phrase

> **Construire aujourd'hui ce que nous serons fiers de maintenir demain.**

---

Début du projet : **2026**

Auteur : **Yoann Bourillon**

Accompagnement technique : **ChatGPT**

Projet open source sous licence **MIT**.

# 📌 Décisions de conception

## Vision du projet

MeteoSignal n'a pas pour objectif de reproduire une application météo existante.

Le projet vise à devenir une plateforme météo moderne, évolutive et riche en informations, avec sa propre identité visuelle.

---

## Public visé

MeteoSignal est conçu pour deux types d'utilisateurs :

* Le grand public, qui souhaite accéder rapidement aux informations essentielles.
* Les passionnés de météo, qui recherchent des données météorologiques détaillées.

L'interface devra rester simple à lire tout en proposant un maximum d'informations.

---

## Fonctionnalités retenues

### Conditions actuelles

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

### Soleil

* Lever du soleil
* Coucher du soleil
* Durée du jour

### Lune

* Lever de lune
* Coucher de lune
* Phase lunaire
* Illumination

### Prévisions

* Prévisions horaires
* Prévisions sur 7 jours

### Cartographie (versions futures)

* Radar des précipitations
* Images satellite
* Vigilance météo
* Carte des vents

---

## Architecture du Dashboard

Le tableau de bord sera construit sous forme de modules indépendants.

Modules prévus :

* Header
* Conditions actuelles
* Atmosphère
* Vent
* Soleil
* Lune
* Prévisions horaires
* Prévisions à 7 jours
* Graphiques météo
* Cartographie
* Footer

---

## Principes de développement

Avant chaque nouvelle fonctionnalité :

1. Réflexion
2. Discussion
3. Maquette
4. Développement
5. Tests
6. Documentation
7. Commit

Aucune fonctionnalité importante ne sera développée sans avoir été pensée et validée au préalable.

---

## Décisions validées

* MeteoSignal possédera sa propre identité graphique.
* Le projet ne sera pas une copie d'une autre application météo.
* Le Dashboard utilisera des cartes (Cards) indépendantes.
* L'application devra fonctionner sur smartphone, tablette, PC et TV.
* Le projet sera développé progressivement afin de garantir sa qualité.
* La simplicité d'utilisation restera une priorité malgré la richesse des informations proposées.

---

## Notre ambition

Construire une application météo open source moderne, fiable et évolutive, capable de devenir une référence francophone grâce à une expérience utilisateur soignée et des informations météorologiques complètes.

## Notre état d'esprit

Chaque décision est prise dans l'intérêt du projet.

Nous privilégions toujours la qualité à la rapidité.

Nous construisons MeteoSignal étape par étape, avec l'objectif de créer une application durable, agréable à utiliser et simple à faire évoluer.

