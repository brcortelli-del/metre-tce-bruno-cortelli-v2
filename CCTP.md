# Éditeur CCTP

Le nouvel onglet reprend les désignations et les localisations de la minute, sans les quantités, les prix ni les coûts. Un code correspondant exactement à une fiche du catalogue ajoute la clause associée ; les codes absents ou ambigus créent des articles libres à compléter. Une nouvelle importation conserve les textes déjà rédigés et ne duplique pas les lignes liées.

## Bibliothèque pédagogique

`public/data/cctp-library.json` et `cctp-sources.json` reprennent les cours IB2701 dans cinq lots : 741 fiches, dont 139 exemples à valeurs fixes séparés des trames, avec 99 formules et le dictionnaire de 267 entrées conservé. Chaque fiche garde son code, ses pages sources et la nature de sa clause. Le Lot 01 et le dictionnaire antérieurs sont inchangés.

| Lot | Périmètre | Fiches | Exemples inclus |
| --- | --- | ---: | ---: |
| 01 | Terrassement / VRD | 296 | 43 |
| 02 | Fondations, infrastructure, parois, structure, planchers et escaliers | 258 | 64 |
| 03 | Façades et finitions extérieures | 84 | 8 |
| 04 | Conduits de fumée et fumisterie | 48 | 11 |
| 05 | Ventilation | 55 | 13 |

Les numéros 02 à 05 organisent la bibliothèque de l'application ; le livre regroupe ses exemples sous son propre lot 01 Gros-Œuvre. Les codes imprimés sont conservés dans les preuves. Les articles simplement cités, les technologies sans clause complète et les exemples chiffrés sont identifiés. Il ne s'agit pas d'un CCTP complet des autres corps d'état absents des trois livres.

La fabrication des données des lots 02 à 05 est enregistrée dans `scripts/extend-course-library.py` ; `public/data/cctp-coverage.json` décrit les périmètres. Les relations géométriques reformulées, les relations imprimées et les prédimensionnements pédagogiques sont distingués dans les preuves. Les taux de perte absents restent `null`. Les erreurs imprimées vérifiées (épaisseurs d'enduit, article d'arase recopié aux escaliers, indications de chaînages) sont signalées. Le rapprochement automatique par code imprimé de l'article incohérent 01.09.02 est désactivé.

Les champs `{{…}}` restent à compléter. Les références citées dans les anciens cours ne constituent pas une validation des normes actuelles. Les unités sont indicatives. Le logiciel ne crée aucune prescription technique par rapprochement approximatif de désignation.

L'arbre de la bibliothèque et le sommaire sont organisés par lots et sous-lots. Ils lisent les intitulés du JSON ; aucun lot non extrait n'est présenté comme documenté. La fiche complète affiche description, mise en œuvre, références citées, localisation et mode de métré avant insertion. Le bouton « Bibliothèque JSON » télécharge la base extraite complète dans son schéma d'origine (abréviations, formules et ouvrages), sans les données du chantier.

Le champ riche « Mode de métré » reprend la règle de mesurage et l'expression symbolique de la fiche. Il est conservé dans les sauvegardes, les révisions et les exports Word/PDF. Pour les articles créés avant cet ajout, « Compléter les modes vides » reprend uniquement les règles manquantes dont la source est identifiée ; les prescriptions et les modes déjà adaptés sont conservés. Les articles sans correspondance restent à compléter.

L'import conserve exactement la première désignation saisie dans la minute pour chaque ouvrage regroupé. L'ajout d'une nouvelle localisation ne supprime pas la mise en forme des localisations rédigées auparavant. Une réimportation sans nouvelle ligne ne crée aucune modification.

## Architecture et performances

- `cctp/EditeurCCTP.jsx` : composant React chargé à l'ouverture de l'onglet, avec Tailwind préfixé `cc:` et sans Preflight global. Bibliothèque paginée et un seul article édité à la fois.
- `public/cctp-model.js` : modèle partagé navigateur / serveur. L'édition d'un article conserve les références des autres articles et de la minute ; aucun recalcul de métré n'est lancé.
- `public/storage-core.js` : IndexedDB version 2, migration conservant les anciens projets. Le Worker reçoit uniquement les articles modifiés et la transaction attend son commit avant de confirmer l'enregistrement.
- `cctp/export-worker.js` et `exports.js` : exports hors du thread de saisie. DOCX au format OOXML, titres et sommaire cliquable ; PDF A4 avec sommaire paginé. Les fichiers restent dans le navigateur jusqu'à leur téléchargement.

Les champs riches stockent du texte structuré (paragraphes, gras, italique, listes), jamais du HTML exécutable. Les articles suivent le projet, ses sauvegardes JSON, la synchronisation privée et les révisions. Les droits existants sont conservés : le conducteur consulte ; le métreur et le dirigeant éditent selon leur rôle. Aucun nouvel accès au site n'est accordé.

## Développement

`npm run dev` et `npm run build` compilent automatiquement l'éditeur, sa feuille de style et son Worker. Pour reconstruire seulement ce module :

```sh
node scripts/build-cctp.mjs
```

Tests : `npm test`. Les contrôles CCTP couvrent l'import groupé, les doublons, l'exclusion des quantités et prix, une modification sur 500 articles, la migration IndexedDB v1, la sauvegarde serveur, les droits de consultation et le contenu OOXML.

La relecture reste nécessaire : les articles vides, non relus ou contenant des champs `{{…}}` sont signalés dans l'éditeur et les exports portent la mention « Brouillon » tant que ces points subsistent.


## Adaptation France / Luxembourg (13 novembre 2026)

Le sélecteur supérieur conserve le pays au niveau du projet, dans les sauvegardes locales et cloud. La géométrie est identique ; les règles de décompte des ouvertures dépendent du corps d’état et de l’unité. Le moteur et les formules Excel partagent `country-rules.js`. Les baies isolées sont testées avant multiplication par leur nombre ; les déductions manuelles et les lignes négatives restent explicites. Le mode France est un net pédagogique, pas un seuil normatif inventé.

`cctp-fr-lu.json` contient les554 fiches des lots01/02 ; `cctp-audit-fr-lu.json` sépare statuts vérifiés, séries à préciser, prescriptions historiques et inconnues. Le générateur est `node scripts/build-fr-lu-library.mjs`, alimenté par les données du cours et `scripts/fr-norms-extra.json`. Les lots03/04/05 restent identifiés comme hors adaptation de cette livraison.

Le CCTP conserve deux brouillons par article, un par pays, et les prescriptions personnalisées réapparaissent lors du retour au pays. Une bascule retire la marque « relu ». Les anciens articles rapprochés du catalogue actualisent leurs références sans effacer les prescriptions. Les exports Word sont de vrais DOCX OOXML ; le documentLUest un descriptif technique sans quantité ni prix, distinct du bordereau chiffré Excel.

Le comparatif détaillé est dans `public/data/comparatif-fr-lu.md`. Les notices officielles renseignent statut/domaine, pas une certification exhaustive des textes complets. Le choix des éditions applicables, des annexes nationales, des spécifications de performance et des règles particulières reste à préciser au marché.
