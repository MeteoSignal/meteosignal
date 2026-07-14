# CSS - Organisation actuelle

Le CSS de MeteoSignal est séparé par responsabilité et chargé directement par les pages, dans l'ordre de cascade documenté et testé.

## Fichiers cibles

- `tokens.css` : couleurs, espacements, rayons, ombres et transitions ;
- `base.css` : base typographique, reset léger, accessibilité ;
- `layout.css` : structure de page et grilles principales ;
- `components.css` : composants réutilisables ;
- `responsive.css` : adaptations mobile, tablette et grands écrans ;
- `privacy.css` : feuille autonome de la politique de confidentialité ;
- `style.css` : fichier historique sans référence d'exécution, conservé uniquement comme trace de migration.

## Règle

Un style doit être placé selon son rôle, pas selon le composant sur lequel il a été écrit en premier.

Les feuilles actives ne doivent pas réintroduire de cascade `@import`. Les révisions d'URL restent alignées avec le service worker pour invalider proprement le cache statique.
