# CHANGELOG

Toutes les modifications importantes de MeteoSignal sont documentées ici.

Le projet suit le versionnement sémantique.

---

## [1.4.1] - 2026-07-10

### Ajouté

- Liste de suggestions géographiques accessible et responsive sous forme de combobox.
- Classement métier donnant la priorité aux correspondances exactes, aux pays ou régions demandés, puis aux lieux habités et à la population.
- Recherche complémentaire contrôlée pour les noms composés, limitée à une seule variante et annulable avec `AbortSignal`.
- Prise en charge des recherches par code postal et des formulations qualifiées par pays ou région.

### Amélioré

- Équivalence des noms indépendamment de la casse, des accents, des tirets, des apostrophes et des espaces multiples.
- Conservation de `featureCode`, `postcodes` et `population` dans le modèle de localisation et le stockage local.
- Sélection automatique limitée aux correspondances exactes, uniques et habitées lors d'une validation explicite.
- Compatibilité maintenue avec les anciennes villes favorites dépourvues des nouveaux champs.

### Corrigé

- Déduplication sémantique des lieux équivalents après fusion des recherches avec et sans tiret.
- Liste de suggestions replacée au-dessus du bloc des favoris sur smartphone pour rétablir la sélection tactile.

### Technique

- Temporisation de recherche fixée à 300 ms avec annulation des requêtes obsolètes.
- Maximum strict de deux appels de géocodage par recherche : requête principale et une variante éventuelle.
- Cache PWA passé à `v1.4.1-search-geocoding-reliability-hotfix` sans précache des réponses API.
- Tests unitaires de classement, géocodage, annulation, ambiguïté, stockage historique et protection contre les réponses obsolètes.

---

## [1.4.0] - 2026-07-10

### Ajouté

- Registre de fournisseurs fondé sur les capacités `current`, `hourly`, `daily`, `astronomy` et `airQuality`.
- Orchestrateur multi-fournisseur avec regroupement des appels, timeout, annulation et fallback explicite.
- Provenance normalisée par bloc avec dates ISO, attribution, station, qualité et état de fallback.
- Affichage discret de la source dans le hero, les prévisions et la qualité de l'air.
- Fixtures Open-Meteo et tests unitaires sans requête réseau réelle.
- Documentation officielle `docs/multi-provider-architecture.md`.

### Compatibilité

- Open-Meteo reste l'unique fournisseur actif.
- Un appel Forecast conserve la météo actuelle, les prévisions 72 h, les 7 jours et l'astronomie.
- Air Quality reste un second appel indépendant.
- Aucun appel Infoclimat, MET Norway, Météo-France ou Cloudflare Worker.
- Aucun secret ajouté au dépôt.

### Technique

- Version applicative passée à `1.4.0`.
- Cache PWA passé à `v1.4.0-multi-api-foundation`.
- Réponses météo maintenues hors du précache PWA.

---

## [1.3.0] - 2026-07-09

### Ajouté

- Bloc compact `Villes enregistrées` pour afficher les favoris directement dans l'interface.
- Sélection rapide d'une ville favorite pour recharger immédiatement la météo associée.
- Suppression visible d'une ville enregistrée sans changer la météo actuellement affichée.

### Amélioré

- Bouton favori connecté à la liste visible : ajout et retrait mettent l'interface à jour immédiatement.
- Déduplication renforcée dans le stockage local des favoris.
- État vide ajouté : `Aucune ville enregistrée pour le moment.`
- Section `Villes enregistrées` déplacée dans la sidebar desktop pour libérer le haut du dashboard, avec affichage mobile compact conservé.

### Technique

- Version applicative passée à `1.3.0`.
- Cache PWA passé à `v1.3.0-favorites-sidebar-polish`.
- Conservation de `storage.js` comme couche unique d'accès à `localStorage`.

---

## [1.2.1] - 2026-07-09

### Amélioré

- Polish du module Alertes météo avec un wording plus pédagogique et moins anxiogène.
- Badges d'alertes locales harmonisés autour de `Signal local`, `À surveiller` et `Seuil notable`.
- Détails enrichis avec les seuils MeteoSignal utilisés pour les signaux chaleur, vent, pluie, UV et qualité de l'air.
- Note de contexte ajoutée : les alertes MeteoSignal sont locales, indicatives et non officielles.

### Technique

- Version applicative passée à `1.2.1`.
- Cache PWA passé à `v1.2.1-weather-alerts-polish`.
- Seuils d'alertes v1.2.0 conservés sans modification.

---

## [1.2.0] - 2026-07-09

### Ajouté

- Premier module dynamique d'alertes météo locales indicatives MeteoSignal.
- Moteur d'analyse `js/core/weather-alerts.js` basé sur les données météo déjà normalisées.
- Composant `js/components/weather-alerts.js` pour afficher une situation calme ou une liste compacte de signaux météo locaux.
- Détection locale des seuils chaleur, vent, pluie, orage potentiel, UV élevé et qualité de l'air dégradée.

### Amélioré

- Bloc `Alertes météo` rendu dynamique tout en conservant le style premium bleu nuit/cyan/jaune.
- Affichage limité aux signaux prioritaires pour préserver la lisibilité sur mobile et desktop.
- Données manquantes ignorées proprement sans bloquer le tableau de bord.

### Technique

- Version applicative passée à `1.2.0`.
- Cache PWA passé à `v1.2.0-weather-alerts`.
- Précache enrichi avec les modules d'analyse et de rendu des alertes météo locales.

---

## [1.1.6] - 2026-07-09

### Amélioré

- Stabilisation finale après les évolutions mobile, icônes météo SVG et prévisions horaires 72 h.
- Cache-busters applicatifs alignés sur `v1.1.6-stabilization-final-w3c`.
- Précache PWA allégé en retirant les anciens assets `assets/icons/*` non utilisés par l'application active.
- Récupération météo rendue plus robuste avec un repli sans `forecast_hours` si l'API refuse ce paramètre.
- Ville active conservée dans la carte principale pendant les états de chargement ou d'erreur.
- Corrections HTML/W3C ciblées : rôles ARIA ajoutés et petites cartes non autonomes converties de `article` vers `div`.

### Technique

- Version applicative passée à `1.1.6`.
- Cache PWA passé à `v1.1.6-stabilization-final-w3c`.
- Conservation des fallbacks visuels `clear.jpg` et `night.jpg`, encore référencés par le CSS.

---

## [1.1.5] - 2026-07-09

### Ajouté

- Prévisions horaires étendues jusqu'à 72 heures via `forecast_hours=72` avec Open-Meteo.
- Contrôle segmenté `0–24 h`, `24–48 h` et `48–72 h` dans la section des prévisions horaires.

### Amélioré

- Affichage limité à 24 cartes horaires par plage pour préserver la lisibilité et le scroll horizontal.
- Plages horaires indisponibles désactivées automatiquement lorsque les données retournées sont insuffisantes.
- Compatibilité conservée avec la logique jour/nuit et les icônes SVG MeteoSignal.

### Technique

- Version applicative passée à `1.1.5`.
- Cache PWA passé à `v1.1.5-hourly-72h`.
- Cache-busters CSS/JS/SVG alignés sur `v1.1.5-hourly-72h`.
- Configuration Open-Meteo enrichie avec `forecastDays: 7` et `forecastHours: 72`.

---

## [1.1.4] - 2026-07-09

### Ajouté

- Mini-pack SVG premium MeteoSignal pour les conditions `clear-day`, `clear-night`, `partly-cloudy-day`, `partly-cloudy-night`, `cloudy`, `light-rain-day`, `storm-day` et `fog-day`.
- Registre interne `js/core/weather-icons.js` pour centraliser les chemins et fallbacks des icônes météo.

### Amélioré

- Carte `Conditions actuelles` migrée vers les nouvelles icônes SVG, avec fallback emoji conservé.
- Prévisions horaires migrées vers les nouvelles icônes SVG, sans modification des données météo.
- Icônes horaires rendues plus lisibles avec une pastille lumineuse MeteoSignal et un glow plus discret.
- Fond orage/foudre renforcé par CSS : côtés plus visibles, centre maintenu plus sombre pour la lisibilité.
- Aperçu temporaire des 8 icônes Phase 1 retiré de l'interface publique après validation technique.
- Rendu des SVG affiné : contours plus nets, flous internes réduits et auréoles visuelles mieux contrôlées.
- Modèle météo enrichi avec un identifiant interne `iconId` tout en conservant `icon` pour les zones non migrées.

### Technique

- Version applicative passée à `1.1.4`.
- Cache PWA passé à `v1.1.4-weather-icons-phase1-final`.
- Cache-busters CSS/JS alignés sur `v1.1.4-weather-icons-phase1-final` pour éviter le chargement d'anciens modules v1.1.3.
- Assets SVG météo ajoutés au cache statique PWA.

---

## [1.1.3] - 2026-07-08

### Ajouté

- Bottom navigation smartphone uniquement avec accès direct à Accueil, Cartes, Horaire, 7 jours et Soleil/Lune.
- État actif cyan sur la navigation mobile, synchronisé au clic, au hash et au scroll.

### Amélioré

- Expérience mobile rapprochée d'une application smartphone, sans modification de la logique météo.
- Header smartphone plus discret avec suppression de la navigation haute redondante sur mobile.
- Padding bas mobile ajouté pour éviter que la bottom navigation masque le contenu ou le footer.
- Finition mobile 360 px : hero météo plus compact, badges plus discrets et réserve basse renforcée pour éviter tout recouvrement par la bottom navigation.
- Zone de contenu mobile transformée en surface scrollable au-dessus de la bottom navigation, pour éviter que la barre fixe masque les cartes ou les titres.
- Libellé mobile `Soleil/Lune` remplacé par `Astres` pour améliorer la lisibilité de la bottom navigation.
- Hero mobile `Conditions actuelles` redessiné avec barre d'état plus fine, cœur météo plus intégré et bandeau unique Minimum/Ressenti/Maximum.
- Cartes de prévisions horaires et 7 jours élargies sur smartphone, avec lignes pluie/vent stabilisées pour éviter les retours à la ligne maladroits.
- Correction du rognage visuel des cartes horaires et 7 jours au tap/focus mobile.
- Icônes horaires adaptées au cycle jour/nuit à partir des heures de lever et coucher du soleil déjà normalisées.
- Identité v1.1.2 conservée : logo officiel, fond orage/foudre, palette bleu nuit/cyan/jaune et cartes verre sombre.

### Technique

- Version applicative passée à `1.1.3`.
- Build actualisé au `2026-07-09`.
- Cache PWA passé à `v1.1.3-build-date-automation`.
- Feuilles CSS, module principal, configuration applicative et navigation mobile versionnés avec `v=1.1.3-build-date-automation`.
- Script local `scripts/update-build-date.js` ajouté pour actualiser `build` et `lastUpdated` dans `config/config.js` avant un commit.
- Alternative Windows `scripts/update-build-date.ps1` ajoutée pour actualiser `build` et `lastUpdated` sans dépendre de Node.js.

---

## [1.1.2] - 2026-07-08

### Amélioré

- Raffinement de l'interface mobile sans modification de la logique météo.
- Cartes météo compactées sur smartphone : hauteur, padding et textes secondaires ajustés pour réduire la place verticale.
- Header mobile allégé avec logo officiel conservé, actions plus compactes et recherche mieux intégrée.
- Prévisions horaires et prévisions sur 7 jours plus fluides sur mobile, avec cartes légèrement resserrées et barre de scroll plus discrète.
- Hiérarchie visuelle mobile optimisée pour afficher plus rapidement la ville, la météo actuelle, les indicateurs et les prévisions.
- Finition smartphone : header encore plus compact, effet de double header réduit, cartes météo légèrement resserrées et prévisions horizontales plus naturelles.
- Libellés de navigation raccourcis pour éviter les textes tronqués sur mobile et tablette.

### Technique

- Version applicative passée à `1.1.2`.
- Build mis à jour au `2026-07-08`.
- Cache PWA finalisé en `v1.1.2-mobile-ui-refinement-compact-nav`.
- Feuilles CSS versionnées avec `v=1.1.2-mobile-ui-refinement-compact-nav`.
- Configuration applicative importée avec un cache-buster v1.1.2 pour éviter l'affichage temporaire de l'ancienne version après publication.
- Module principal `js/app.js` appelé avec le cache-buster v1.1.2 pour fiabiliser le rafraîchissement PWA.
- Compatibilité Safari/iPhone améliorée avec `-webkit-backdrop-filter` sur les effets de verre.
- Module principal et configuration applicative appelés avec le cache-buster `v=1.1.2-mobile-ui-refinement-compact-nav`.

---

## [1.1.1] - 2026-07-07

### Amélioré

- Mise à niveau visuelle officielle inspirée du logo MeteoSignal validé.
- Préparation des chemins d'assets officiels dans `assets/logo/`.
- Fallback temporaire du logo tant que les fichiers PNG officiels ne sont pas déposés.
- Sidebar plus premium : fond bleu nuit, glow cyan discret et icônes plus lumineuses.
- Header harmonisé avec champ de recherche et boutons plus cohérents.
- Carte météo principale renforcée avec halo cyan, effet atmosphère/globe et température plus spectaculaire.
- Cartes météo, prévisions horaires, prévisions sur 7 jours et Soleil/Lune harmonisés avec fond verre sombre, bordures cyan fines et glow discret.
- Style préparatoire pour un futur bloc Alertes, sans nouvelle logique météo active.
- Finition de l'identité officielle : logo agrandi dans la sidebar et le header, favicon et icônes PWA alignés sur `assets/logo/`.
- Ajout d'un bloc discret indiquant le développement actif, la version publiée et la date de dernière mise à jour.
- Correction colorimétrique : palette bleu nuit plus riche, cyan/bleu électrique plus présents, surfaces moins ternes et jaune soleil plus lumineux.
- Optimisation desktop : layout élargi, hero météo plus présent et meilleure occupation de l'espace sur grands écrans.
- Footer simplifié : les informations version, build et copyright sont intégrées au bloc de développement actif, sans ligne redondante.
- Fond général enrichi en CSS : halo atmosphérique, globe subtil et courbes lumineuses discrètes inspirées de l'identité MeteoSignal.
- Fond d'écran MeteoSignal renforcé : ciel bleu nuit plus lumineux, grand halo cyan plus visible, globe atmosphérique plus marqué et lignes de signal fines.
- Équilibrage final v1.1.1 : fond MeteoSignal moins dominant, dashboard desktop élargi, logo officiel légèrement agrandi et bloc visuel Alertes météo ajouté sans logique active.
- Ambiance finale orage/foudre : fond bleu nuit plus dramatique, éclairs latéraux intégrés en CSS, centre assombri pour préserver la lisibilité du dashboard.
- Fond orage/foudre naturel : utilisation de `assets/backgrounds/meteosignal-lightning-bg.webp` comme image principale, avec overlays bleu nuit/cyan pour conserver la lisibilité.
- Micro-ajustement final du fond : éclairs et nuages latéraux plus visibles, centre du dashboard toujours protégé.

### Technique

- Version applicative passée à `1.1.1`.
- Cache PWA passé à `v1.1.1-official-visual-identity-lightning-presence-polish` pour forcer le rafraîchissement des assets visuels.
- Feuilles CSS versionnées avec `v=1.1.1-lightning-presence-polish` pour éviter l'affichage persistant d'anciens styles après publication.

### Assets officiels attendus

- `assets/logo/logo-meteosignal-complet.png`
- `assets/logo/logo-meteosignal-sans-slogan.webp`
- `assets/logo/icon-512.png`
- `assets/logo/icon-192.png`
- `assets/logo/favicon-32.png`
- `assets/logo/favicon-16.png`

---

## [1.0.0] - 2026-07-06

### Ajouté

- Interface météo premium avec hero météo, cartes météo, prévisions horaires, prévisions sur 7 jours et bloc Soleil/Lune.
- Recherche de ville avec Open-Meteo Geocoding.
- Ville active sauvegardée localement.
- Favoris avec ajout/retrait de la ville active.
- Géolocalisation navigateur.
- Services météo modulaires basés sur un modèle interne normalisé.
- Données Open-Meteo : météo actuelle, vent, humidité, pression, précipitations, UV, prévisions horaires et quotidiennes.
- Qualité de l'air via Open-Meteo Air Quality.
- Calcul local de la phase lunaire pour éviter une dépendance API supplémentaire.
- Progressive Web App avec manifest, icônes, cache statique et service worker.
- Navigation adaptative officielle : menu mobile, navigation compacte tablette, sidebar desktop/TV repliable.

### Amélioré

- Responsive mobile, tablette, desktop et grands écrans.
- États de chargement, d'erreur et de mise à jour en arrière-plan.
- Accessibilité : skip link, libellés de contrôles, régions live et états `aria-busy`.
- Ressources visuelles du hero météo avec deux arrière-plans JPEG légers.
- Cache PWA stabilisé pour la version `v1.0.0`.

### Nettoyé

- Suppression des fichiers CSS/JS vides préparatoires non utilisés.
- Suppression de l'ancien logo placeholder inutilisé.
- Mise à jour de la documentation de publication.

---

## [0.2.0-dev] - 2026-06-26

### Documentation

- Création d'un README professionnel.
- Mise en place de la branche `develop`.
- Début de la documentation du projet.

---

## [0.1.0] - 2026-06-25

### Ajouté

- Création du projet MeteoSignal.
- Première interface météo.
- Intégration initiale de l'API Open-Meteo.
- Horloge temps réel.
- Prévisions sur 7 jours.
- Déploiement initial sur GitHub Pages.
- Première base Progressive Web App.
