# CHANGELOG

Toutes les modifications importantes de MeteoSignal sont documentées ici.

Le projet suit le versionnement sémantique.

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
