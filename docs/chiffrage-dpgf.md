# Étude de prix et DPGF / bordereau LU

Ouvrir **Outils du projet → Étude de prix**. Le tableau utilise les lignes, quantités et déductions de la minute, sans ajouter de lignes d'exemple au projet.

- **PV saisi** conserve un prix manuel, indépendant du coefficient de vente.
- **DS × K** calcule le déboursé sec unitaire : matériaux + temps MO × coût horaire + matériel. Les données manquantes restent visibles ; zéro est une valeur explicite valide. Les matériaux viennent soit du bloc déjà affecté, soit d'une saisie directe. Choisir une saisie de coût directe ne supprime pas le lien d'approvisionnement.
- **K saisi**, **majorations successives FG × Bénéfice & Aléas** et **bénéfice sur PV** sont trois méthodes distinctes. La nouvelle méthode est `K = (1 + FG/100) × (1 + B&A/100)`. L'ancienne méthode conserve `K = (1 + FG/100 + aléas/100) / (1 − bénéfice/100)`. Aucun ancien projet ne change automatiquement de méthode.
- Les paramètres d'exemple 42 €/h, FG 15 %, B&A 10 % s'appliquent seulement après un clic explicite. Les trois sous-détails proposés dans le message utilisateur sont disponibles seulement pour les codes et unités correspondants ; aucune valeur de repli fictive n'est appliquée aux autres ouvrages.
- Les paramètres globaux sont hérités, sauf taux horaire ou K spécifique de ligne. Le bouton **Détail** permet de vérifier et modifier ces exceptions. Le taux de TVA du projet est saisi selon l'opération et n'est pas réinitialisé par le changement de pays.
- Les PV unitaires sont arrondis au centime, puis les montants de chaque ligne au centime, et le total HT est la somme des montants. Les quantités conservent leur précision. Les déductions restent négatives. Le DS et les heures affichés couvrent seulement les études complètes ; l'écart vente moins DS est calculé sur ce même périmètre, hors lignes à PV manuel.

## Exports

Les exports comprennent tous les lots et exigent tous les prix renseignés. Aucun envoi à un client n'est réalisé.

- **DPGF client / Bordereau client (.xlsx)** : quantités, PV HT, montants avec formules, TVA, TTC, sous-totaux par lot et fiche projet. Les coûts, fournisseurs et coefficients internes sont exclus.
- **Étude interne (.xlsx)** : ajoute les paramètres de vente, les sous-détails et les prix matériaux ; les formules relient les coûts, taux, K, quantités et bordereaux. Ce fichier est réservé à l'usage interne.
- **CSV client** : export de valeurs à séparateur point-virgule, décimales françaises, guillemets échappés et protection contre l'injection de formules. Le format XLSX conserve les formules dynamiques.
- Le classeur global existant reste disponible dans **Exports & trames** et prend aussi en charge la nouvelle méthode de K et les coûts matériaux directs.

## Sauvegarde, fluidité et droits

La sortie d'une cellule, Entrée ou Tab valide la valeur et la sauvegarde via les transactions du projet. Échap restaure la valeur enregistrée. Les cellules refusent les nombres négatifs, les valeurs non finies et les taux hors limites. Une modification de cellule ne change que l'identité de la ligne concernée. Le tableau est paginé par 50 et les lignes React sont mémorisées ; les recherches et survols ne relancent pas les calculs globaux.

Le métreur saisit les sous-détails ; le dirigeant contrôle les coefficients et valide le projet synchronisé. Le conducteur consulte les quantités et besoins sans prix. Les nouvelles protections sont aussi appliquées côté serveur, y compris aux anciens projets dépourvus du nouveau paramètre B&A. Toute modification invalide la validation précédente.

Validation : tests de calculs signés et arrondis, données manquantes, héritage des taux, sources matériaux, conservation des anciennes méthodes, confidentialité du classeur client, recalcul indépendant des formules XLSX, rôles serveur et jeu de 500 lignes. Vérification de la saisie et des téléchargements dans le navigateur.
