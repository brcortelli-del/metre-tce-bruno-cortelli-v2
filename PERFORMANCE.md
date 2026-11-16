# Refactorisation performance — Atelier Métré TCE

Les modifications portent sur le code réellement utilisé par l'interface HTML/JavaScript. La page ne repose pas sur un tableau React : le rendu est impératif, ciblé et virtualisé.

## Mesures et portée

Scénario CPU reproductible : chantier de 500 lignes, modification d'une épaisseur, calcul des quantités/prix et préparation de la sauvegarde. Exécution sous Node.js 24, 5 passages de chauffe puis 50 mesures. Le code V4 de référence est inclus dans `benchmarks/baseline-v4/`.

| Chemin | Médiane | P95 |
| --- | ---: | ---: |
| V4 : copie du projet, recalcul global, sérialisation JSON | 101,776 ms | 129,342 ms |
| Refactorisé : une ligne recalculée, construction du patch de sauvegarde | 0,098 ms | 0,155 ms |

Ce benchmark mesure le CPU, hors DOM, réseau et écriture disque. Il compare le travail effectivement nécessaire lors d'une saisie ; le nouveau chemin n'effectue plus les opérations globales de la V4.

Essai distinct dans Chrome : une saisie complète dans la minute de 500 lignes a été traitée en **6,3 ms**, avec le focus conservé. La minute montait **17 lignes / 85 champs**, et non les 500 lignes. Les valeurs varient suivant le navigateur, le matériel, le contenu et l'état des caches ; il ne s'agit pas d'une promesse de latence nulle.

Pour reproduire le benchmark :

```sh
npm ci
npm run benchmark
```

Pour exécuter les contrôles de non-régression :

```sh
npm test
```

## 1. Plan de fond, vecteurs et interaction

- `public/plan-renderer.js` gère trois canvas superposés : le fond raster, les relevés validés, le calque de sélection/tracé en cours.
- Le fond n'est repeint que si l'image ou les dimensions changent. Les relevés validés ne sont redessinés qu'après une modification géométrique ou un changement de page.
- Les mouvements sont regroupés avec `requestAnimationFrame`. Le survol et le segment provisoire ne peignent que le calque d'interaction. Les états visuels identiques sont ignorés.
- Les chemins `Path2D` des tracés inchangés sont réutilisés. Le test de proximité rejette d'abord les boîtes englobantes éloignées avant de parcourir les segments.
- Le zoom est appliqué au conteneur commun des trois calques pour conserver l'alignement et les coordonnées.
- `public/cad-worker.js` réalise le décodage DWG/DXF en Worker. Les buffers et bitmaps DXF sont transférés. Le tas WASM est libéré à la fin ou à l'annulation de l'import. Le rendu DWG conserve un filtrage du SVG avant affichage.
- PDF.js utilise son Worker de lecture. Le rendu des opérateurs cède la main entre les lots et le rendu obsolète est annulé lors d'un changement de page. Le cache raster est limité à deux pages ; les pages PDF évincées sont nettoyées.

## 2. Calcul et DOM ciblés

- `public/project-state.js` effectue une transaction sur une seule ligne : copie de cette ligne, validation, calcul et remplacement de sa référence. Les 499 autres objets et résultats restent identiques.
- Les modifications de relevés ne recalculent que les lignes liées à leurs identifiants ou affectations. Le changement de page et les paramètres de préparation ne recalculent aucune ligne.
- Les changements réellement globaux (variables, bibliothèque, coefficients) utilisent le moteur global : le résultat métier reste cohérent.
- Les instances `Intl.NumberFormat` sont mémorisées par précision et devise. Leur reconstruction répétée constituait une part importante du coût initial.
- `public/virtual-table.js` maintient une fenêtre de lignes DOM, des hauteurs mesurées et un index de préfixes pour retrouver une ligne en O(log N). Les justificatifs gardent leur hauteur naturelle.
- `public/minute-view.js` conserve les champs actifs, le caret et le focus. Une saisie met à jour les quantités de la ligne, pas le `tbody` entier.
- La liste des relevés utilise elle aussi des nœuds identifiés : modifier une cote ou un sommet ne remonte pas toutes les lignes.
- Les changements de statut de synchronisation ne relancent plus le verrouillage de tous les champs ni la reconstruction de la liste des projets à chaque frappe.

## 3. Raccourcis et édition

- **Échap** : annule le tracé provisoire ou le déplacement et revient à la sélection ; aucun point annulé n'est enregistré.
- **Maj + clic** : contraint le nouveau segment horizontalement ou verticalement par rapport au point précédent.
- **Sélection / sommets** : permet de déplacer un sommet à la souris ; les quantités liées sont recalculées après validation géométrique.
- **Entrée / Maj + Entrée** : ligne suivante / précédente dans la même colonne.
- **Tab / Maj + Tab** : champ suivant / précédent, avec passage à la ligne suivante ou précédente.
- **Flèches haut / bas** : même colonne. Les flèches gauche / droite changent de cellule aux limites du texte pour conserver l'édition des formules.
- **Ctrl + Début / Fin** : début / fin du tableau, y compris pour les lignes hors de la fenêtre DOM.

Une cote exacte retenue demeure prioritaire sur la mesure graphique. Le bouton **Mesure auto** retire cette surcharge pour réutiliser la mesure du tracé.

## 4. Sauvegarde rapide et fiable

- `public/storage.js`, `storage-core.js` et `storage-worker.js` remplacent les écritures synchrones de JSON dans `localStorage` par IndexedDB.
- Les lignes, les pages, les relevés, les révisions et les fichiers Blob sont séparés. Une frappe transmet une ligne ; un sommet changé transmet le relevé concerné, sans recopier tous les autres points.
- Les écritures sont regroupées sur 200 ms, avec une échéance maximale de 1 seconde. Elles s'exécutent dans le Worker, dans des transactions atomiques.
- L'indicateur « Enregistré » attend l'événement de commit de la transaction. La durabilité stricte est demandée lorsque le navigateur la prend en charge.
- Les erreurs de quota et de transaction restent visibles et ne remplacent pas une sauvegarde valide par un état partiel. Si le Worker n'est pas disponible, un repli IndexedDB asynchrone reste possible.
- Les changements de projet et les écritures déjà lancées sont ordonnés. Un test vérifie qu'une création de projet pendant une synchronisation ne vide pas le chantier précédent.
- La sérialisation pour la synchronisation JSON est effectuée en Worker et renvoie un Blob. Les fichiers des plans ne sont jamais encodés en base64 dans le projet.
- Les anciennes sauvegardes du navigateur et les plans IndexedDB V1 sont repris. Le cache V1 d'un plan n'est pas supprimé en cas d'échec de migration.
- Masquer ou fermer la page demande un flush ; un avertissement de fermeture n'apparaît que si des écritures sont encore en attente. Un navigateur peut toujours être interrompu brutalement : les modifications qui n'ont pas encore été confirmées comme enregistrées ne sont pas garanties.

## Validation effectuée

- 52 contrôles automatisés : calculs du catalogue, formules Excel recalculées indépendamment, autorisations serveur, transactions, concurrence, migration, conservation des références, découpage des sauvegardes, index des hauteurs et contraintes d'angles.
- Conservation/restauration d'un Blob de **32 Mio** dans les tests IndexedDB.
- Dans Chrome : import de 500 lignes, saisie et restauration après rechargement, navigation jusqu'à la dernière ligne, Tab, Entrée, Échap et contrainte Maj.
- PDF de **12 pages / 4 296 904 octets / 144 000 segments** : chargement, étalonnage, relevé lié et déplacement de sommet. La quantité liée est passée de 9,2 à 12,8 m sans repeindre le fond.
- Lecture DWG et DXF dans le Worker vérifiée avec deux dessins de contrôle.
- Classeur Excel téléchargé depuis l’interface puis relu : les 500 lignes sont présentes, jusqu’à « Dallage zone 500 ».
- Les tests de rendu vérifient que 1 000 invalidations de curseur regroupées ne repeignent ni le fond ni les relevés validés.

## Limites explicites

La limite de fichier reste de 35 Mo et celle du projet de 2 000 lignes. Le rendu CAD est une projection 2D des entités reconnues ; objets spécialisés, xréfs et objets 3D demandent une vérification. Le rendu raster d'une page est plafonné à 2 400 pixels sur son grand côté. Les cotes écrites restent à privilégier pour la précision du métré. Le stockage local reste soumis au quota et aux politiques de conservation du navigateur.

L'export Excel/PDF travaille sur toutes les lignes du modèle, y compris celles hors du DOM. L'impression navigateur matérialise temporairement les lignes et réactive ensuite la virtualisation.
