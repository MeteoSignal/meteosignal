# TODO

## Terminé jusqu'à la v1.4.1

- [x] Fondation stable v1.0 et identité visuelle officielle.
- [x] Expérience mobile, prévisions horaires 72 h et icônes météo SVG.
- [x] Alertes météo locales indicatives.
- [x] Favoris et villes enregistrées.
- [x] Fondation multi-fournisseur avec provenance des données.
- [x] Recherche géographique avancée et correctifs de géocodage.
- [x] Actualisation de la documentation de référence v1.4.1.

## P0 - Publication

- [ ] Finaliser le certificat HTTPS de `meteosignal.fr` et activer HTTPS forcé.
- [ ] Vérifier que `https://meteosignal.fr/sw.js` répond directement, sans redirection.
- [ ] Confirmer le remplacement de l'ancien service worker et des anciens caches sur les installations existantes.

## P1 - Validation réelle

- [ ] Valider l'installation PWA sur Chrome, Edge, Android et iOS.
- [ ] Tester la géolocalisation réelle après activation HTTPS.
- [ ] Tester l'interface sur smartphones, tablettes et grands écrans physiques.
- [ ] Relire, valider et publier la documentation v1.4.1.

## P2 - Maintenance

- [ ] Rationaliser le précache statique versionné et non versionné.
- [ ] Fournir une véritable icône PWA `maskable` avec zone de sécurité vérifiée.
- [ ] Étudier une automatisation CI légère pour les tests, la syntaxe et les liens documentaires.
