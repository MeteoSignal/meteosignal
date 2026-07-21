# Pack d’identité MeteoSignal

Ce dossier rassemble les exports dérivés de l’identité officielle validée.
Les masters couleur restent les fichiers historiques suivants, sans redessin,
recoloration ni réinterprétation :

- `../logo/icon-512.png` : symbole standard officiel ;
- `../logo/icon-maskable-512.png` : symbole maskable officiel ;
- `../logo/logo-meteosignal-complet.png` : logo complet officiel.

Les neuf tailles 16, 24, 32, 48, 64, 128, 192, 256 et 512 px sont exportées
dans `exports/png/standard` et `exports/png/maskable`. La variante monochrome
est un masque technique dérivé du master maskable pour les systèmes qui
imposent une teinte ; elle ne remplace jamais le master couleur.

Les packs Windows et Linux sont disponibles dans `../platform`. Les ressources
Web/PWA actives restent dans `../logo`.

Régénération locale :

```powershell
python scripts/generate-brand-assets.py
```

Le script nécessite Pillow. Les visuels appartiennent à l’identité officielle
du projet MeteoSignal et ne doivent pas être substitués par des illustrations
génériques.
