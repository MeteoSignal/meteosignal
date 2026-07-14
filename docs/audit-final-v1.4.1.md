# Rapport final d'audit — MeteoSignal v1.4.1

Date de clôture : **14 juillet 2026**  
Version auditée : **1.4.1**  
SHA de référence avant P1E : `e96f9a1a6003f2f7bc58953e42954b989ab68068`  
Décision proposée : **audit validé avec réserves de validation physique et de distribution**.

## 1. Objet et périmètre

Ce rapport clôt l'audit technique de MeteoSignal v1.4.1. Il couvre :

- exactitude du modèle et des transformations météo ;
- recherche, géocodage, géolocalisation et favoris ;
- chargement, exécution, responsive et performance ;
- accessibilité structurelle et comportements clavier automatisables ;
- PWA, service worker et fonctionnement hors ligne structurel ;
- sécurité du navigateur et confidentialité ;
- workflow d'intégration continue ;
- configuration Android/TWA et Digital Asset Links ;
- cohérence de la documentation.

L'audit ne garantit pas scientifiquement les prévisions d'un fournisseur, ne termine pas la publication Google Play et ne remplace pas des essais sur appareils ou lecteurs d'écran réels.

## 2. Méthodologie

Les contrôles ont combiné :

1. inspection des fichiers suivis et de leur historique Git ;
2. tests Node.js déterministes avec fixtures et injections ;
3. validation syntaxique de tous les fichiers JavaScript et MJS ;
4. parsing strict des JSON suivis ;
5. résolution des références locales HTML, CSS, JavaScript, manifeste et précache ;
6. inspection des structures HTML, ARIA, CSP, stockage, réseau et service worker ;
7. contrôle HTTP direct du déploiement public ;
8. inspection en lecture seule du projet Android/TWA et de ses artefacts existants ;
9. relecture et mise en cohérence de la documentation.

Aucun paquet, dépendance applicative ou outil supplémentaire n'a été installé pour P1E. Aucun appel météo réel n'est effectué par la suite automatisée lorsque des fixtures ou injections sont prévues.

## 3. Synthèse exécutive

Le socle v1.4.1 est cohérent, entièrement testable sans build et ne présente aucune régression bloquante démontrée. Les protections introduites pendant l'audit sont présentes dans `main`, notamment :

- modèle météo normalisé avec provenance ;
- requêtes obsolètes annulées et timeouts bornés ;
- réponses API hors Cache Storage et requêtes en `cache: "no-store"` ;
- stockage local validé, réparé et borné ;
- navigation, focus, annonces live et structure sémantique renforcés ;
- CSP et politique de référent sur les deux pages ;
- CI en lecture seule avec actions épinglées par SHA ;
- association Android/TWA reconnue publiquement pour les deux certificats attendus.

Les réserves ne correspondent pas à des défauts de code démontrés. Elles concernent les essais physiques, les lecteurs d'écran réels, le mode hors ligne observé dans un navigateur et le processus de distribution Google Play.

## 4. Phases réalisées

| Phase | Périmètre | Résultat |
|---|---|---|
| P0 | Exactitude, validation et normalisation des données météo | Terminé |
| P1A | Service worker et fiabilité PWA | Terminé |
| P1B-1 | Ressources graphiques | Terminé |
| P1B-2 | Chargement CSS, annulation, horloge et visibilité | Terminé |
| P1C | Accessibilité, clavier, reflow, structure et contexte | Terminé |
| P1D-1 | Confidentialité et limites de la recherche | Terminé |
| P1D-2 | Validation et réparation du stockage | Terminé |
| P1D-3 | Cache API et politique de confidentialité | Terminé |
| P1D-4 | CSP et protections navigateur | Terminé |
| P1D-5 | Durcissement de la CI | Terminé |
| P1D-6 | Android/TWA et Digital Asset Links | Terminé |
| P1E | Contrôle final et documentation | Présent rapport |

## 5. État Git et hygiène

La préparation P1E a établi les points suivants :

- `main` propre et identique à `origin/main` ;
- divergence : zéro commit local et zéro commit distant ;
- SHA de départ : `e96f9a1a6003f2f7bc58953e42954b989ab68068` ;
- fusion P1D-6 présente via la Pull Request 42 ;
- 115 fichiers suivis avant P1E ;
- aucun `.env`, keystore, clé privée, APK, AAB ou archive sensible suivi dans le dépôt Web ;
- aucun marqueur de clé privée détecté dans les fichiers texte suivis ;
- `.gitignore` ignore les profils temporaires `.tmp-*` ; deux répertoires de profil anciens, vides et non suivis étaient présents localement ;
- aucun serveur de développement n'a été lancé pour P1E.

Les APK et AAB existant dans le projet Android restent des artefacts locaux non modifiés. Ils ne sont pas copiés dans le dépôt Web.

## 6. Tests automatisés finaux

Après ajout des contrôles documentaires P1E :

- tests : **277** ;
- succès : **277** ;
- échecs : **0** ;
- ignorés : **0** ;
- annulés : **0** ;
- fichiers JavaScript/MJS validés syntaxiquement : **61** ;
- fichiers JSON suivis et parsés strictement : **6** ;
- références locales contrôlées : **131 occurrences**, correspondant à **57 cibles uniques** ;
- références locales manquantes : **0**.

Le décompte des références comprend 21 références HTML, 43 imports JavaScript, 8 URL CSS, 3 icônes du manifeste et 56 entrées de précache. Les tests couvrent également les identifiants, les références ARIA, le manifeste, la CSP, la confidentialité, la recherche, le stockage, la CI, le service worker et `assetlinks.json`.

## 7. Exactitude fonctionnelle météo

Les tests avec fixtures et injections couvrent :

- normalisation de Forecast et Air Quality ;
- météo actuelle, minimum, maximum et ressenti ;
- vent, rafales, humidité, pression et précipitations ;
- 72 heures de prévisions découpées en trois plages ;
- prévisions quotidiennes sur sept jours ;
- UV, qualité de l'air, astronomie et phase lunaire ;
- alertes locales indicatives et données absentes ;
- provenance par bloc ;
- fallback Forecast sans `forecast_hours` ;
- timeouts, annulation et réponses obsolètes ;
- valeurs invalides, tableaux partiels et changements de fuseau ou d'heure.

La recherche couvre les noms simples, codes postaux, pays ou régions, homonymes, suggestions, sélection explicite, classement des lieux habités et variante contrôlée. Les favoris couvrent ajout, sélection, suppression, persistance, déduplication et compatibilité des anciennes données.

La géolocalisation est structurellement branchée et ses erreurs sont gérées. L'accord ou le refus réel de permission reste à tester sur appareil. Les tests démontrent la cohérence du modèle et des paramètres, pas la vérité scientifique d'une prévision externe.

## 8. Responsive et accessibilité

La suite vérifie automatiquement :

- ordre des titres, landmarks et relations ARIA ;
- unicité des identifiants ;
- deux régions live permanentes et annonces concises ;
- focus visible et transfert logique après suppression d'un favori ;
- combobox, navigation aux flèches, Entrée et Échap ;
- restauration du focus et du scroll depuis la confidentialité ;
- styles de reflow et d'espacement de texte ;
- `prefers-reduced-motion` ;
- contrôles masqués ou désactivés exclus des cibles de focus testées.

La structure responsive existe pour 320, 360, 768, 1280 et 1920 pixels. La session P1E n'a toutefois pas pu ouvrir le navigateur intégré à cause d'une erreur interne d'initialisation avant chargement de la page. Aucun résultat visuel, tactile, zoom 200/400 % ou geste clavier manuel n'est donc revendiqué pour cette session.

Restent à vérifier physiquement :

- parcours complets sur smartphones, tablettes et grands écrans ;
- NVDA, TalkBack et autres lecteurs d'écran réellement ciblés ;
- focus avec navigation mobile fixe dans les moteurs réels ;
- zoom navigateur et espacement renforcé avec rendu observé ;
- iOS et plateformes non encore testées physiquement.

## 9. PWA et hors ligne

Le manifeste est un JSON valide avec `start_url` et `scope` relatifs, affichage `standalone` et trois icônes déclarées. Les dimensions PNG correspondent aux dimensions annoncées.

Le service worker :

- utilise le cache statique `meteosignal-static-v1.4.1-p1d-browser-security` ;
- précache 36 ressources essentielles et 20 ressources facultatives, sans doublon ;
- ne précache aucun endpoint Open-Meteo ni `assetlinks.json` ;
- sert les requêtes météo directement par le réseau ;
- ne place aucune réponse météo dans Cache Storage ;
- supprime uniquement les anciens caches MeteoSignal ;
- conserve les réponses HTTP de navigation et utilise le repli local seulement après erreur réseau ;
- rend l'accueil et la confidentialité disponibles dans le cache statique après installation réussie.

Le fonctionnement hors ligne et l'installation restent validés structurellement et par harnais automatisé. Ils n'ont pas été observés manuellement dans un navigateur P1E. La zone de sécurité réelle de l'icône `maskable` reste également à confirmer sur les lanceurs ciblés.

## 10. Performance et efficacité

L'application ne charge aucun framework et ne nécessite aucun build. Le document d'accueil référence directement 13 ressources locales uniques représentant environ 164 Ko sur disque avant imports de modules, compression réseau et images CSS.

Constats :

- cinq feuilles CSS directes, dans un ordre testé, sans cascade `@import` ;
- deux préconnexions ciblées vers Forecast et Air Quality ;
- requêtes obsolètes annulées avec `AbortController` ;
- géocodage limité à une requête principale et une variante éventuelle ;
- rafraîchissement météo prévu toutes les dix minutes et regroupé lors des changements de visibilité ;
- horloge alignée sur la minute sans intervalle à la seconde ;
- aucun cache applicatif de réponse API.

Le principal fond WebP pèse environ 86 Ko. Le logo WebP utilisé par l'interface pèse environ 1,49 Mo ; il reste l'asset d'exécution le plus lourd et constitue une piste d'optimisation future facultative, sans régression observée ni modification dans P1E. Le PNG complet d'environ 2,01 Mo n'est pas référencé par le chargement initial.

Échantillon HTTP ponctuel du 14 juillet 2026, non assimilable à un benchmark : accueil 22 062 octets avec un TTFB d'environ 105 ms ; confidentialité 13 770 octets avec environ 60 ms. Lighthouse n'a pas été exécuté, le navigateur intégré étant indisponible.

## 11. Sécurité et confidentialité

Les deux documents contiennent la même CSP restrictive avant les ressources et la politique `strict-origin-when-cross-origin`. La CSP exclut `unsafe-inline`, `unsafe-eval`, les scripts dynamiques et les origines non nécessaires. Le seul lien externe de la politique utilise `noopener noreferrer`.

Les protections vérifiées incluent :

- formulaire HTML de secours sans nom de ville dans l'URL ;
- limite de recherche de 120 caractères Unicode ;
- timeout total de géocodage de huit secondes ;
- annulation externe et nettoyage des timers/listeners ;
- validation stricte de la ville active et des favoris ;
- protection contre la pollution de prototype et les types ambigus ;
- contexte de retour temporaire borné à cinq minutes et limité à la même origine ;
- absence d'open redirect démontrable ;
- données dynamiques rendues par des nœuds contrôlés ou du texte ;
- Forecast, fallback Forecast, Air Quality et Geocoding en `cache: "no-store"` ;
- politique de confidentialité datée du 14 juillet 2026 et cohérente avec `localStorage`, `sessionStorage`, Cache Storage, GitHub Pages et Open-Meteo.

La CSP en balise `<meta>` ne remplace pas tous les en-têtes HTTP. GitHub Pages ne permet pas au dépôt de définir directement, par exemple, `frame-ancestors` ou une politique HSTS personnalisée. Cette limite d'hébergement est documentée, sans présenter la CSP HTML comme équivalente à tous les en-têtes serveur.

## 12. Intégration continue

Le workflow `Validate MeteoSignal` :

- s'exécute sur les Pull Requests et pushes vers `main` ;
- possède uniquement la permission `contents: read` ;
- n'utilise ni secret ni contexte de Pull Request non fiable ;
- épingle `actions/checkout` et `actions/setup-node` sur des SHA complets ;
- désactive la persistance des credentials Git ;
- valide les espaces, la syntaxe JavaScript/MJS et la suite Node ;
- n'installe rien, ne publie rien et ne télécharge aucun artefact.

Les SHA épinglées devront être réévaluées périodiquement lors des futures maintenances.

## 13. Android/TWA et Digital Asset Links

Le projet Android a été inspecté en lecture seule. Sa configuration est cohérente :

- package, `applicationId` et namespace : `fr.meteosignal.app` ;
- host : `meteosignal.fr` ;
- origine et scope : `https://meteosignal.fr/` ;
- `startUrl` et `launchUrl` : `/` ;
- manifeste Web : `https://meteosignal.fr/manifest.json` ;
- schéma d'intent : HTTPS ;
- `versionName` : `1` et `versionCode` : `1`, inchangés ;
- permissions constatées : notifications et délégation de géolocalisation, avec permission interne non exportée générée par Android.

Le fichier public `assetlinks.json` contient une seule déclaration pour le package attendu avec les deux empreintes :

- locale/téléversement : `4C:44:88:8F:DE:78:E3:C8:9B:3B:1E:47:E9:D7:A0:B5:D1:B6:79:3E:A7:F8:D3:EF:87:D0:FA:E6:66:63:79:48` ;
- Google Play App Signing : `6B:2F:75:FE:65:8A:97:90:AE:58:86:D5:08:DF:AF:BD:5E:FC:50:12:99:17:72:CD:58:9A:66:0B:E1:E8:D3:C7`.

Les artefacts locaux signés correspondent au certificat local/de téléversement. Le service officiel Google Digital Asset Links retourne publiquement deux associations, une par empreinte, pour `fr.meteosignal.app`.

La présence des associations ne remplace pas le test d'une application réellement distribuée par Google Play. Le test fermé de douze testeurs pendant quatorze jours reste une étape de publication, pas une anomalie du code.

## 14. Contrôle public

Contrôle HTTP réalisé le 14 juillet 2026 :

| URL | HTTP | Redirections | Type de contenu | Taille observée |
|---|---:|---:|---|---:|
| `https://meteosignal.fr/` | 200 | 0 | `text/html; charset=utf-8` | 22 062 octets |
| `https://meteosignal.fr/confidentialite.html` | 200 | 0 | `text/html; charset=utf-8` | 13 770 octets |
| `https://meteosignal.fr/manifest.json` | 200 | 0 | `application/json; charset=utf-8` | 949 octets |
| `https://meteosignal.fr/sw.js` | 200 | 0 | `application/javascript; charset=utf-8` | 5 854 octets |
| `https://meteosignal.fr/.well-known/assetlinks.json` | 200 | 0 | `application/json; charset=utf-8` | 445 octets |

Le contenu public confirme la version 1.4.1, la date de confidentialité, la CSP, la politique de référent, le cache statique versionné et les deux empreintes. Aucun HTML de fallback n'est servi à la place du manifeste, du service worker ou de `assetlinks.json`.

## 15. Documentation

P1E met à jour :

- le README avec le statut HTTPS, PWA, Android et qualité réel ;
- la vision du projet avec le socle stable audité ;
- la roadmap en clôturant uniquement les points prouvés ;
- le TODO en conservant les validations physiques et de publication ouvertes ;
- le changelog dans une section `Unreleased`, sans créer de nouvelle version publique ;
- les README techniques devenus descriptivement obsolètes ;
- le présent rapport officiel.

Des tests documentaires vérifient la présence du rapport, la version, les deux empreintes, les principaux statuts ouverts/fermés, les liens locaux et l'absence de chemin Windows ou de secret dans les documents suivis.

## 16. Éléments non testables dans l'environnement P1E

- rendu visuel réel aux largeurs 320, 360, 768, 1280 et 1920 pixels ;
- zoom navigateur 200 et 400 % observé ;
- gestes Tab, Shift+Tab, Entrée, Espace et Échap dans un navigateur réel ;
- fonctionnement hors ligne après chargement observé manuellement ;
- installation PWA et permission de géolocalisation ;
- lecteurs d'écran réels ;
- appareils iOS ou Android physiques ;
- application installée depuis Google Play et absence de barre navigateur ;
- exactitude scientifique des prévisions externes ;
- en-têtes serveur non configurables dans GitHub Pages.

La cause P1E pour les contrôles navigateur est une erreur interne de connexion au navigateur avant ouverture de page. Cette erreur d'outil n'est pas imputée au site.

## 17. Risques résiduels et limitations

| Risque ou limite | Niveau | Traitement |
|---|---|---|
| Parcours physiques et lecteurs d'écran non rejoués en P1E | Réserve | TODO de validation réelle |
| Processus de test fermé Google Play inachevé | Externe | Étape de publication ouverte |
| TWA Google Play non testée après installation réelle | Externe | Test obligatoire avant publication générale |
| En-têtes HTTP avancés limités par GitHub Pages | Hébergement | Réévaluer si l'hébergement évolue |
| Asset logo WebP encore volumineux | P2 facultatif | Mesurer dans une future phase dédiée |
| Cache Google Digital Asset Links | Externe | Association publique actuellement reconnue ; surveiller après changement de certificat |
| SHA d'actions GitHub figées | Maintenance | Revue périodique contrôlée |

Aucune vulnérabilité nouvelle ni régression bloquante n'a été démontrée pendant P1E.

## 18. Décision finale

### Décision : audit validé avec réserves

Cette décision est justifiée par :

- l'intégration de toutes les corrections P0 à P1D dans `main` ;
- la réussite de l'ensemble des tests automatisés ;
- l'absence de référence locale manquante ou de secret suivi ;
- la cohérence publique du site, du manifeste, du service worker et de Digital Asset Links ;
- l'absence de régression bloquante démontrée ;
- une documentation alignée sur l'état réel.

La réserve est nécessaire car les essais physiques, lecteurs d'écran, installation PWA et TWA Google Play n'ont pas tous été réalisés dans l'environnement P1E. Elle n'empêche pas la validation technique de l'audit v1.4.1.

## 19. Critères de reprise pour la prochaine version

Avant toute évolution fonctionnelle :

1. partir d'un `main` propre et publié ;
2. conserver les tests de clôture et ajouter des tests ciblés pour chaque changement ;
3. ne modifier les contrats météo, stockage, accessibilité, PWA ou sécurité qu'avec une phase dédiée ;
4. vérifier les SHA des actions et les contrats des fournisseurs ;
5. documenter toute nouvelle donnée persistée ou origine réseau ;
6. renouveler explicitement le cache statique lors d'une modification d'asset précaché ;
7. refaire les contrôles responsive, clavier, hors ligne et appareil proportionnellement au risque ;
8. ne changer la version publique qu'au démarrage formel de la prochaine version.
