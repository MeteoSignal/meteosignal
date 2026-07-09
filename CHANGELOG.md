# CHANGELOG

Toutes les modifications importantes de MeteoSignal sont documentées ici.

Le projet suit le versionnement sémantique.

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
- `assets/logo/logo-meteosignal-sans-slogan.png`
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
