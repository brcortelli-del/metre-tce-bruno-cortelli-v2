# Interface et passerelle CAO / BIM — novembre 2026

Le projet reste celui de l’atelier existant. L’interface React, Tailwind CSS et
Lucide est un îlot relié au moteur de métré par des transactions explicites.
Les tableaux virtualisés, le stockage IndexedDB et les trois calques canvas
restent indépendants de cet îlot : la frappe ne remonte pas tout le chantier.

## Fichiers de travail

- `ux/entry.jsx` : navigation rétractable, thème, raccourcis et pont d’interface.
- `ux/FormulaAssistant.jsx` : barre de formule, suggestions et modale géométrique.
- `ux/ImportWizard.jsx` : fichier, colonnes, correspondances, aperçu paginé et injection.
  Une ligne de correspondance est mémorisée séparément des autres lignes.
- `ux/NormsPage.jsx` : recherche dans les 162 références de l’audit du 13/11/2026.
- `ux/atelier.css` : tokens clair/sombre, styles et utilitaires Tailwind préfixés.
- `public/import-core.js` : CSV, unités, mesures DXF, regroupements et validations.
- `ux/import-worker.js` : lecture DXF / CSV / XLSX hors du thread d’interface.
- `ux/ifc-worker.js` et `ux/ifc-extract.js` : extraction IFC par web-ifc 0.0.79.
- `public/history.js` : annuler/rétablir par partage structurel, sans copie des plans.
- `public/lot-colors.js` : palette partagée minute, CCTP, badges et tracés.

## Démarrer

Node.js 22.13 ou plus récent, puis :

```sh
npm ci
npm run dev
```

La commande de développement compile les îlots et les Workers. `npm run build`
fait de même avant de construire le site. Les scripts Sites déjà présents dans
le projet restent utilisés dans leur environnement d’hébergement.

```sh
npm test
node scripts/benchmark.mjs
```

Les fichiers témoins figurent dans `public/examples`. Le script
`node scripts/create-import-examples.mjs` permet de les régénérer.

## Périmètre explicite des imports

- **DXF** : LINE, LWPOLYLINE, POLYLINE 2D, CIRCLE, blocs INSERT. Longueurs et aires
  des polylignes à bulge calculées analytiquement. Les unités `$INSUNITS` sont
  proposées et modifiables ; sans unité connue, la mesure est bloquée. Les
  trous, intersections et recouvrements ne sont pas soustraits implicitement.
  Les entités 3D, splines, hachures et autres types exclus sont signalés.
- **CSV** : UTF-8, UTF-16 avec BOM, virgule / point-virgule / tabulation,
  guillemets et décimales françaises. Les unités d’en-tête ont priorité ; les
  autres unités doivent être précisées. Une formule CSV n’est jamais exécutée.
- **XLSX** : feuilles de nomenclature au choix ; cellules avec formule bloquées,
  pour éviter des résultats en cache périmés. Exporter des valeurs depuis Revit.
- **IFC** : occurrences, classes / propriétés de famille explicitement exportées,
  types, niveaux et quantités QTO. Pas de calcul de géométrie ou de quantités à
  partir d’une boîte englobante. Les mesures Net / Gross ne sont pas additionnées.
  L’unité explicite de la quantité prime sur celle du projet. Une unité inconnue
  bloque la quantité concernée ; le comptage d’instances reste une mesure distincte.
- Limites : **35 Mo**, **20 000 objets**, **2 000 lignes par projet**, **500 articles
  CCTP**, lecture annulable et temporisée à 120 secondes. Pour un modèle plus
  lourd, exporter une sélection ou une nomenclature.

Une seule mesure est choisie par groupe. Le lot et l’ouvrage sont contrôlés avant
l’injection. Quantités et articles CCTP sont validés puis ajoutés ensemble ;
aucune déduction FR/LU supplémentaire n’est appliquée aux quantités BIM.
Sans code de bibliothèque correspondant, le CCTP ne contient que la désignation
et la localisation, avec des spécifications à compléter. Aucun texte technique
ni conformité n’est déduit du seul nom d’un calque ou d’une famille.

## Géométrie et règles métier

Les expressions utilisent le parseur typé existant, sans `eval` ou `Function`.
Les variables du projet restent liées. La constante `PI` est disponible ; une
variable de projet existante portant ce nom conserve la priorité. Les schémas
de l’assistant sont géométriques, sans seuil de déduction présenté comme DTU.
La fiche d’ouvrage conserve les profils contractuels et pédagogiques FR/LU.

## Vérification

- 95 tests automatisés passés : moteur, exports, pays, droits serveur, stockage,
  calculs et import réel DXF / IFC, dont priorité des unités et puissances SI.
- Aperçu navigateur : DXF, CSV, XLSX et IFC lus avec succès ; sélection d’une
  mesure et association à un ouvrage de bibliothèque vérifiées.
- Injection de 500 groupes : 503 lignes au total avec le projet témoin ; seulement
  10 lignes montées au moment du contrôle. Une saisie testée a pris environ 5 ms
  dans ce navigateur, hors attente de sauvegarde. Ce n’est pas une garantie sur
  tous les appareils et tous les fichiers.
- Annulation/rétablissement de l’injection : minute et CCTP restaurés ensemble.
- Entrée vers la cellule suivante, barre de formule, géométrie 24 m², thèmes,
  fiche de raccourcis, outils L/S/C et Échap vérifiés à l’écran.
- Comptage sur le plan : deux points, annuler/rétablir un point, relevé de 2 u ;
  le compteur de dessin du fond est resté identique pendant ces interactions.

Les avis de licence distribués avec les dépendances se trouvent dans
`public/ux/*.LEGAL.txt`, `public/ux/NOTICE.txt` et `public/ux/web-ifc-LICENSE.md`.
Le module web-ifc n’a pas été modifié.
