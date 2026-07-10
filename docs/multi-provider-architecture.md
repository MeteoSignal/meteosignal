# Architecture multi-fournisseur - MeteoSignal v1.4

Statut : fondation validée pour MeteoSignal v1.4.0.

## Objectif

MeteoSignal peut sélectionner un fournisseur par bloc de données sans exposer les réponses brutes aux composants. Open-Meteo reste l'unique fournisseur actif en v1.4.0.

L'architecture interdit :

- la moyenne automatique de plusieurs fournisseurs ;
- la fusion silencieuse de valeurs au sein d'un même bloc ;
- les secrets API dans le dépôt ou le navigateur ;
- les appels Infoclimat, MET Norway ou Météo-France en v1.4.0.

## Capacités

Le registre reconnaît cinq capacités :

- `current` ;
- `hourly` ;
- `daily` ;
- `astronomy` ;
- `airQuality`.

Un fournisseur déclare uniquement les capacités qu'il peut réellement normaliser. `getWeather()` couvre les capacités météo et astronomie. `getAirQuality()` reste séparé, car il peut utiliser un endpoint différent.

## Contrat fournisseur

Un fournisseur enregistré définit :

- `id`, `name`, `enabled` ;
- `capabilities` ;
- `coverage`, `requiresProxy` ;
- `attribution`, `license` ;
- `getWeather(location, options)` lorsque nécessaire ;
- `getAirQuality(location, options)` lorsque nécessaire.

Les options peuvent contenir `capabilities` et `signal`. Le résultat doit déjà respecter le modèle MeteoSignal normalisé. Le fournisseur ne manipule ni DOM, ni stockage local, ni cache PWA.

## Orchestration

La politique choisit un fournisseur principal et une liste ordonnée de fallbacks pour chaque capacité. Les capacités affectées au même fournisseur et au même endpoint sont regroupées afin d'éviter les requêtes en double.

En v1.4.0 :

- un appel Open-Meteo Forecast fournit `current`, `hourly`, `daily` et `astronomy` ;
- un appel Open-Meteo Air Quality fournit `airQuality` ;
- toutes les listes de fallback externe sont vides.

Une erreur de fournisseur est enregistrée par fournisseur et capacité. Une réponse partielle n'est pas complétée avec des valeurs inventées. Un timeout peut activer uniquement un fallback explicitement configuré.

Le fallback de compatibilité Open-Meteo est encapsulé dans l'orchestrateur. Il intervient seulement si la politique ou le registre échoue avant tout appel fournisseur. Une erreur réseau Open-Meteo ne provoque pas une seconde requête identique.

## Provenance

Le modèle conserve les blocs existants et ajoute `sources.current`, `sources.hourly`, `sources.daily` et `sources.airQuality`.

Une source peut contenir :

- `providerId` ;
- `type` : `forecast`, `observation`, `analysis` ou `calculation` ;
- `observedAt`, `issuedAt`, `fetchedAt` au format ISO 8601 ou `null` ;
- `station`, `distanceKm`, `elevation` ;
- `isFallback` ;
- `attribution`, `license` ;
- `qualityFlags`.

Les composants affichent une mention de source discrète. Une heure n'est affichée comme heure métier que si `observedAt` ou `issuedAt` est disponible. `fetchedAt` ne doit pas être présenté comme une heure d'observation.

## PWA et sécurité

Les modules statiques de l'architecture sont précachés. Les réponses météo restent en réseau pur et ne sont jamais ajoutées au précache.

Les futurs fournisseurs nécessitant un secret devront passer par une passerelle serveur validée. La compatibilité d'Infoclimat avec un Cloudflare Worker devra être testée séparément avant v1.4.1.

## Orientation future

Pour la France, les futures versions privilégieront les modèles Météo-France : AROME à courte échéance, puis ARPEGE. Les observations, la Vigilance officielle et le radar seront des capacités distinctes.

Open-Meteo pourra servir de passerelle technique pour distribuer certains modèles, mais la provenance devra alors distinguer la passerelle, le producteur, le modèle et son cycle. Ces champs seront ajoutés seulement lors de l'activation de cette fonctionnalité.

Pour l'Europe et le monde, Open-Meteo reste la source de référence, avec la possibilité d'ajouter ultérieurement des fournisseurs régionaux.
