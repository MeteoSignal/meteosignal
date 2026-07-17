# TODO

## Terminé pour la v1.4.2

- [x] Fondation stable, identité visuelle, alertes locales et favoris.
- [x] Fondation multi-fournisseur avec provenance des données.
- [x] Recherche géographique avancée, limite de saisie, annulation et timeout.
- [x] Validation et réparation défensives de la ville active et des favoris.
- [x] API météo en `cache: "no-store"` et hors Cache Storage.
- [x] Service worker statique versionné, sans doublon ni endpoint météo précaché.
- [x] Accessibilité structurelle, clavier, focus, reflow et restauration du contexte audités.
- [x] CSP, politique de référent et politique de confidentialité actualisée.
- [x] CI en lecture seule avec actions épinglées par SHA.
- [x] HTTPS public, accès direct au service worker et deux certificats Digital Asset Links.
- [x] Documentation et rapport final d'audit v1.4.1.
- [x] Corrections P0 à P1E officialisées dans la v1.4.2.
- [x] Validation HTML W3C des groupes de favoris et token CSS du footer corrigés.
- [x] Accès externe « Votre avis compte » ajouté et sécurisé.

## Version 1.5.0 - Navigation unifiée et carte météo immersive

### P0 - Spécification

- [x] Créer et valider syntaxiquement la spécification officielle v1.5.0.
- [x] Valider humainement la matrice météo, l'architecture de navigation et les budgets.

### P1 - Navigation unifiée

- [x] Remplacer les deux listes par un panneau DOM canonique.
- [x] Conserver le stockage, la ville active, la sélection, la suppression et le focus.
- [x] Valider le comportement desktop, tablette et mobile sans recouvrir la recherche.

### P2 - Carte météo immersive

- [x] Produire les sept scènes WebP dans les budgets validés.
- [x] Implémenter le résolveur, le chargement atomique et le fallback CSS.
- [x] Valider la distinction jour/nuit et les changements rapides de ville.

### P3 - Optimisation desktop

- [x] Ajuster la hauteur du hero et l'utilisation de sa partie droite.
- [x] Conserver les largeurs globales et les dimensions confortables des contenus.
- [x] Étudier une colonne secondaire uniquement au-delà de 1600 px.

### P4 - Responsive et accessibilité

- [x] Contrôler les largeurs de 360 à 1920 px, le reflow et l'absence d'overflow.
- [x] Valider contraste, clavier, focus, zoom et mouvement réduit avec les contrôles disponibles.
- [x] Confirmer le fonctionnement complet sans image de scène.

### P5 - PWA, tests et publication

- [x] Ajouter un cache dynamique limité aux scènes consultées, sans précacher les sept images.
- [x] Valider réseau lent, offline, LCP, CLS, CSP, W3C, CI et tests automatisés avec les contrôles disponibles.
- [x] Préparer la version Web après validation complète.

### P6 - Android/TWA après validation Web

- [ ] Préparer une mise à jour Android/TWA seulement après publication et validation Web.
- [ ] Vérifier l'installation distribuée, Digital Asset Links et l'absence de barre navigateur.

## Distribution Android et validations externes

- [x] Android/TWA v1.4.2 (`versionName 1.4.2`, `versionCode 2`) acceptée sur la piste de test fermé Google Play.
- [ ] Installer la version distribuée par Google Play et confirmer que la TWA s'ouvre sans barre de navigateur.
- [ ] Demander l'accès à la production séparément lorsque les conditions sont réunies.
- [ ] Vérifier une dernière fois, puis maintenir cohérente, la fiche « Sécurité des données » dans Play Console.

L'ancien critère de suivi v1.4.1, désormais clos et conservé uniquement comme trace documentaire, était : `[ ] Terminer le test fermé avec douze testeurs continus pendant quatorze jours`.

## Validation physique

- [ ] Valider l'installation et le mode hors ligne sur les plateformes PWA non encore testées physiquement, notamment iOS.
- [ ] Tester la géolocalisation sur des appareils réels avec les permissions accordées et refusées.
- [ ] Réaliser des parcours complets avec des lecteurs d'écran réels, notamment NVDA et TalkBack.
- [ ] Confirmer le comportement tactile, le zoom et le reflow sur un échantillon de smartphones, tablettes et grands écrans physiques.
- [ ] Vérifier la zone de sécurité de l'icône PWA `maskable` sur les lanceurs réellement ciblés.

## Hébergement et maintenance

- [ ] Réévaluer les en-têtes de sécurité HTTP non configurables directement avec GitHub Pages si l'hébergement évolue.
- [ ] Contrôler périodiquement les nouvelles versions et SHA officielles des actions GitHub épinglées.
- [ ] Surveiller l'évolution des politiques, licences et contrats des fournisseurs externes.

## Fonctionnalités futures

- [ ] Ajouter un second fournisseur météo uniquement avec provenance et fallback explicites.
- [ ] Étudier le radar météo et la vigilance officielle.
- [ ] Ajouter des préférences d'unités et paramètres simples.
- [ ] Concevoir le Mode Expert, les widgets et les notifications dans des phases dédiées.
