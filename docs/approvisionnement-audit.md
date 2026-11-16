# Approvisionnement et audit

Ouvrir **Outils du projet → Approvisionnement & audit**.

1. Affecter un ouvrage composé à chaque ligne concernée. Les lignes de déduction reçoivent le même bloc que l'ouvrage qu'elles réduisent.
2. Vérifier les ratios, pertes, fournisseurs, quantités par colis et libellés de colisage dans **Ouvrages composés**. Les trois exemples proposés dans le nouveau module proviennent du message utilisateur et restent à adapter ; ils ne sont pas présentés comme des données vérifiées dans les cours.
3. Utiliser de préférence la **quantité physique nette** pour les achats. Toutes les ouvertures saisies sont alors déduites sans modifier la minute contractuelle. Une quantité reprise/importée demande une confirmation de son caractère net. Le mode **décompte** est explicite et avertit des vides pour pleins.
4. Contrôler la couverture des lignes positives. Une liste partielle est identifiée sur l'écran et dans les exports. Les lignes de prestations sous-traitées peuvent rester sans décomposition.
5. Télécharger CSV, XLSX ou PDF. Les filtres sont des filtres d'affichage ; les exports comprennent tous les fournisseurs. Aucun envoi n'est réalisé. Le classeur contient des formules reliées au détail des quantités signées, ratios et pertes, plus une feuille de contrôles.

Le foisonnement est distinct des pertes. L'exemple d'évacuation est basé sur les terres excédentaires **en place après réemploi**, jamais sur une quantité déjà foisonnée.

Le vérificateur recherche des indices d'oubli par bâtiment. Il teste séparément les compléments (gestion des terres/propreté, plinthes/préparation du support, arase/chaînages/linteaux, joints/isolant). Les lignes nulles ou négatives ne satisfont pas les contrôles de présence. Les composants du même ouvrage sont pris en compte. Ces indices ne prouvent ni l'exhaustivité ni la conformité normative ; une vérification du projet reste nécessaire.

## Organisation du code

- `public/procurement.js` : calcul pur partagé, agrégation, audit, CSV sécurisé et exemples.
- `public/procurement-exports.js` : XLSX à formules et préparation PDF par fournisseur.
- `ux/ApprovisionnementEtAudit.jsx` : interface React, abonnement aux transactions du projet, calculs mémorisés et affectations paginées par 50.
- `ux/procurement.css` : styles limités au module, thèmes clair/sombre et adaptation aux petits écrans.
- Le pont de `public/app.js` impose les droits de consultation et les transactions existantes (validation, annulation/rétablissement, IndexedDB et synchronisation).

Les conditionnements invalides, unités incompatibles, valeurs non finies et besoins négatifs bloquent l'export. Le colisage utilise la pleine précision avec une tolérance limitée aux erreurs binaires de calcul. Le classeur DPGF global historique reste basé sur les quantités contractuelles de la minute ; les exports dédiés **Besoins Excel / Préparations de commande PDF** utilisent le nouveau moteur physique.

Validation : `npm test`, dont déductions, distinction physique/décompte LU, couverture partielle, indépendance des alertes, formules XLSX recalculées dans un moteur indépendant et PDF sur plusieurs pages. Vérification dans le navigateur des affectations, contrôles de saisie, exports et thèmes.
