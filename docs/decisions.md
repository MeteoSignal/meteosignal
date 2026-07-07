# Décisions techniques - MeteoSignal

Ce document conserve les décisions importantes afin d'éviter de rediscuter les fondations à chaque étape.

## D001 - HTML, CSS et JavaScript natif pour v1.0

Décision : la version 1.0 n'utilise aucun framework JavaScript.

Raison : le projet doit rester simple, rapide, compatible GitHub Pages et facile à maintenir.

Conséquence : l'architecture repose sur des modules ES6, des composants légers et une séparation stricte entre services, état et interface.

## D002 - Open-Meteo comme fournisseur principal

Décision : Open-Meteo est l'API principale de la v1.0.

Raison : elle couvre les besoins météo essentiels, fonctionne sans clé API pour les usages prévus et facilite la publication sur GitHub Pages.

Conséquence : les services sont conçus pour permettre l'ajout futur d'autres fournisseurs sans modifier les composants.

## D003 - Radar et vigilance après v1.0

Décision : le radar météo et la vigilance sont préparés architecturalement, mais exclus du périmètre obligatoire v1.0.

Raison : la Spécification officielle place ces fonctionnalités dans une version ultérieure. Les intégrer trop tôt augmenterait la complexité et le risque d'instabilité.

Conséquence : aucun composant radar ou vigilance n'est développé avant que les fonctionnalités principales soient stables.

## D004 - Interface premium mais sobre

Décision : l'identité graphique utilise principalement le bleu nuit, le bleu clair, le blanc et le jaune météo.

Raison : cette palette correspond à la vision premium du projet tout en assurant une bonne lisibilité.

Conséquence : les effets lumineux, dégradés et glassmorphism restent subtils. Ils ne doivent jamais nuire aux performances ou à la clarté.

## D005 - CSS découpé par responsabilité

Décision : le CSS cible est séparé en tokens, base, layout, components et responsive.

Raison : le fichier `style.css` actuel mélange plusieurs générations de styles. Le découpage rendra la v1.0 plus stable et plus facile à maintenir.

Conséquence : la migration CSS sera progressive et contrôlée, sans casser l'interface existante.

## D006 - Stockage local simple

Décision : les favoris, la ville active et les préférences sont stockés dans `localStorage`.

Raison : la v1.0 ne nécessite pas de compte utilisateur ni de synchronisation serveur.

Conséquence : une abstraction `storage.js` évitera de disperser les accès directs à `localStorage`.

## D007 - Composants indépendants

Décision : chaque composant d'interface possède une responsabilité unique.

Raison : cela permet de valider, corriger ou faire évoluer une partie sans reconstruire toute l'application.

Conséquence : un composant validé n'est modifié ensuite que pour bug, optimisation ou fonctionnalité planifiée.

## D008 - UTF-8 obligatoire

Décision : tous les fichiers texte du projet doivent être enregistrés en UTF-8.

Raison : plusieurs fichiers historiques affichent des caractères français abîmés. Une base propre évite les erreurs visuelles et les problèmes de maintenance.

Conséquence : la Phase 1 inclut la remise au propre progressive des documents et fichiers affichés à l'utilisateur.

## D009 - Développement hors branche main

Décision : les évolutions se font sur `feature/*`, puis sont fusionnées vers `develop`, puis vers `main` pour publication stable.

Raison : `main` doit rester publiable.

Conséquence : la Phase 1 utilise une branche dédiée `feature/v1-foundation`.

## D010 - Cache PWA prudent

Décision : le service worker met en cache les fichiers statiques, mais les données météo doivent rester clairement datées.

Raison : une application météo ne doit pas donner l'impression que des données anciennes sont actuelles.

Conséquence : l'interface affichera l'heure de mise à jour et devra gérer proprement l'absence de réseau.

## D011 - Navigation adaptative

Décision : MeteoSignal v1.0 utilise une navigation adaptative plutôt qu'une sidebar permanente unique.

Raison : l'application doit rester confortable sur mobile tout en exploitant correctement les grands écrans, les ordinateurs et les téléviseurs.

Conséquence : la navigation officielle suit cette logique :

- mobile : bouton menu ouvrant un panneau de navigation ;
- tablette : navigation compacte, lisible et peu encombrante ;
- desktop : sidebar élégante, repliable et non intrusive ;
- TV et très grands écrans : sidebar lisible, avec grands boutons et navigation clavier ou télécommande.

L'ancienne sidebar alpha ne revient pas telle quelle. Ses fonctions sont réintégrées progressivement dans cette navigation adaptative, en affichant uniquement les sections réellement disponibles ou officiellement planifiées.

## D012 - Modèle météo interne indépendant des fournisseurs

Décision : les composants de MeteoSignal ne consomment jamais directement les réponses brutes des APIs météo.

Raison : MeteoSignal doit pouvoir intégrer plus tard d'autres fournisseurs météo sans modifier l'interface.

Conséquence : chaque fournisseur API doit transformer ses réponses en modèle interne normalisé avant que les données atteignent l'application. Les composants consomment uniquement ce modèle interne : localisation, météo actuelle, prévisions horaires, prévisions journalières, astronomie, qualité de l'air, date de mise à jour et erreurs éventuelles.

Open-Meteo est le premier fournisseur officiel, mais il doit respecter le même contrat que les futurs fournisseurs.

## D013 - Logo officiel comme référence visuelle

Décision : à partir de MeteoSignal v1.1.1, l'identité visuelle principale doit s'appuyer sur les fichiers officiels du logo MeteoSignal.

Raison : le logo validé devient la référence graphique du produit : globe lumineux, soleil, nuage, éclairs, ondes cyan, texte MeteoSignal et slogan "Prévisions et alertes météo".

Conséquence : les fichiers officiels attendus sont préparés dans `assets/logo/` :

- `logo-meteosignal-complet.png` ;
- `logo-meteosignal-sans-slogan.png` ;
- `icon-512.png` ;
- `icon-192.png` ;
- `favicon-32.png` ;
- `favicon-16.png`.

Le CSS peut enrichir l'interface avec halos, bordures cyan, fonds atmosphériques et effets premium, mais il ne doit pas remplacer définitivement le logo officiel par une imitation HTML/CSS. Tant que les fichiers officiels ne sont pas présents, l'application conserve un fallback temporaire.
