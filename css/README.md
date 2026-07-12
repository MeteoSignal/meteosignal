# CSS - Organisation v1.0

Le CSS de MeteoSignal sera progressivement migré vers une structure par responsabilité.

## Fichiers cibles

- `tokens.css` : couleurs, espacements, rayons, ombres et transitions ;
- `base.css` : base typographique, reset léger, accessibilité ;
- `layout.css` : structure de page et grilles principales ;
- `components.css` : composants réutilisables ;
- `responsive.css` : adaptations mobile, tablette et grands écrans ;
- `style.css` : fichier historique conservé pendant la migration.

## Règle

Un style doit être placé selon son rôle, pas selon le composant sur lequel il a été écrit en premier.
