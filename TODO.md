# TODO

## Terminé pour la v1.4.1

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

## P0 - Publication Google Play

- [ ] Terminer le test fermé avec douze testeurs continus pendant quatorze jours.
- [ ] Vérifier une dernière fois la fiche « Sécurité des données » dans Play Console.
- [ ] Installer la version distribuée par Google Play et confirmer que la TWA s'ouvre sans barre de navigateur.

## P1 - Validation physique

- [ ] Valider l'installation et le mode hors ligne sur les plateformes PWA non encore testées physiquement, notamment iOS.
- [ ] Tester la géolocalisation sur des appareils réels avec les permissions accordées et refusées.
- [ ] Réaliser des parcours complets avec des lecteurs d'écran réels, notamment NVDA et TalkBack.
- [ ] Confirmer le comportement tactile, le zoom et le reflow sur un échantillon de smartphones, tablettes et grands écrans physiques.
- [ ] Vérifier la zone de sécurité de l'icône PWA `maskable` sur les lanceurs réellement ciblés.

## P2 - Hébergement et maintenance

- [ ] Réévaluer les en-têtes de sécurité HTTP non configurables directement avec GitHub Pages si l'hébergement évolue.
- [ ] Contrôler périodiquement les nouvelles versions et SHA officielles des actions GitHub épinglées.
- [ ] Surveiller l'évolution des politiques, licences et contrats des fournisseurs externes.

## Fonctionnalités futures

- [ ] Ajouter un second fournisseur météo uniquement avec provenance et fallback explicites.
- [ ] Étudier le radar météo et la vigilance officielle.
- [ ] Ajouter des préférences d'unités et paramètres simples.
- [ ] Concevoir le Mode Expert, les widgets et les notifications dans des phases dédiées.
