# Atelier Métré Pro — Évolution métier du 18 novembre 2026

## Architecture constatée

Le projet local est `C:\Users\Mihaela\Documents\GitHub\metre-tce-bruno-cortelli-v2`.

La production Vercel est un frontend statique compilé par `scripts/build-vercel.mjs` vers `vercel-dist`, avec des fonctions ESM dans `api/`. L'interface métier React est montée depuis `ux/entry.jsx`. `public/app.js` porte le projet actif, les transactions, l'historique et le pont vers React ; `public/core.js` calcule et valide les sauvegardes.

Les scripts de `public/` sont aussi des sources importées à la compilation : ce dossier doit rester complet dans GitHub. La présence d'une enveloppe Next/Vinext dans `app/` ne change pas le preset Vercel **Other** utilisé ici.

Le dépôt contient déjà une bibliothèque de 741 fiches et un registre normatif rapprochant 554 fiches des lots 01/02. Ils sont conservés et réutilisés. Le Kutch, les cinq routes API existantes, les extensions chiffrées, le lexique et les sauvegardes sont conservés. Seul le service interne de génération CCTP reçoit un enrichissement documentaire ; les URL des routes ne changent pas.

## Plan d'implémentation et fichiers livrés

| Étape | Fichiers | Rôle |
|---|---|---|
| 1 — Catalogue | `src/data/ouvragesBTP.js` | 245 désignations courantes ajoutées et 741 fiches existantes projetées dans une recherche commune : 986 fiches, dont certaines décrivent des prescriptions générales. |
| 2 — Calcul | `public/dynamic-minute.js` | Fonctions pures de calcul, changements d'unités et construction d'une ligne ; aucune utilisation d'eval ou de Function. |
| 3 — Interface | `ux/DynamicMinuteEditor.jsx`, `ux/dynamic-minute.css` | Recherche par lot et mots-clés, désignation libre, bibliothèque personnelle, aperçu en direct, paramètres géométriques et ouvertures. |
| 4 — Compatibilité | `public/professional-core.js`, `ux/ProfessionalMinute.jsx`, `public/app.js`, `public/expression.js`, `ux/WorkspaceToolbar.jsx`, `ux/atelier.css` | Délégation des nouvelles minutes au nouveau moteur ; ancienne méthode conservée ; conversion volontaire d'une ligne existante ; unités ens/ft ; cumuls de longueurs ramenés en mètres. |
| 5 — Trames | `public/reference-templates.js` | Deux aperçus A4 portrait paginés, impression/enregistrement PDF, montants reportés et textes échappés. |
| 6 — Références | `public/standards-btp.js`, `public/standards-course.js`, `public/row-cctp.js`, `server/generer-cctp.js` | Transmission du code catalogue, rapprochement du registre existant, propositions sourcées pour maçonnerie/plâtre/peinture ; insertion documentaire dans le brouillon local ou OpenAI. |
| 7 — Exports et documentation | `public/exports.js`, `src/data/manuelUtilisation.js` | Préservation du classeur historique et mention explicite des nouvelles quantités figées ; journal de mise à jour intégré. |
| 8 — Vérification | `tests/dynamic-evolution.test.mjs`, `tests/professional.test.mjs` | Calculs, conversions, prix, refus d'expressions dangereuses, sauvegarde, références et exports ; ancien test de titre adapté au changement de marque déjà demandé. |

## Utilisation

1. Ouvrir **Minute professionnelle**, puis **Nouvel ouvrage**.
2. Rechercher une désignation, filtrer par corps d'état ou saisir librement le libellé et le lot.
3. Choisir longueur, périmètre, rectangle/mur, triangle, trapèze, disque, pavé/dalle, cylindre, sphère, poids, unités/ensemble/forfait ou formule libre.
4. Saisir les paramètres. Pour le poids, la masse volumique est obligatoire : aucun ratio acier/béton n'est supposé automatiquement.
5. Renseigner déductions globales, ouvertures et pertes. Les vides sont déduits une seule fois de l'ensemble des N éléments ; les pertes portent sur le net.
6. Enregistrer : une seule ligne porte ce calcul, son résultat, ses données et sa minute détaillée.
7. Pour une ligne ancienne, utiliser **Calcul multi-formules sur cette ligne**. La quantité est d'abord reprise dans une formule typée ; choisir une géométrie pour la recalculer. L'enregistrement confirme la conversion, archive l'ancien `input` dans `previousMinute` et conserve l'identité de la ligne. Les anciennes liaisons de recalcul au plan deviennent une photographie ; Ctrl+Z permet d'annuler l'opération.
8. Dans cette minute, ouvrir **Trame avant-métré · PDF / impression** ou **Trame CCTP · PDF / impression**. Le contrôle qualité reste proposé avant l'aperçu.

### Unités et conversions

- Résultat : mm, cm, m, ml, m², m³, kg, t, u, ens, ft.
- Saisie géométrique : m, cm ou mm. Changer l'unité de saisie convertit les cotes, sans modifier la taille réelle de l'ouvrage.
- `ml` désigne le mètre linéaire ; `ft` désigne ici le **forfait**, et non le pied anglo-saxon ; `ens` désigne un ensemble.
- Une conversion de même grandeur conserve la quantité physique et convertit les déductions et le prix unitaire réciproquement, pour conserver le montant.
- Changer de grandeur, par exemple m² vers m³, adapte la formule standard et exige une dimension complémentaire. Le prix est à ressaisir ; les déductions et ouvertures sont remises à zéro. Ce n'est pas une conversion universelle entre surface et volume.
- Une formule libre typée incompatible est refusée : elle doit être corrigée avant l'enregistrement.
- Formules libres : L, w, H, R, B, rho, PI, variables du projet, opérateurs + - * / ^ et parenthèses. N est appliqué ensuite. Les longueurs de ces variables sont interprétées physiquement et converties.

### Bibliothèque personnelle

**Mémoriser cette désignation dans ma bibliothèque** conserve une fiche dans le navigateur (500 maximum). La recherche ignore les accents et ne se limite pas aux libellés exacts. Ces fiches personnelles ne constituent pas des projets ; leur bibliothèque doit être considérée comme locale à l'appareil, elle n'est pas incluse dans l'archive JSON du chantier. Le libellé effectivement utilisé et le calcul de chaque ligne sont bien conservés dans le projet.

## Analyse des deux modèles fournis

### CCTP

La capture montre un document portrait, un cadre noir et trois colonnes : **CODE**, **ÉLÉMENTS/FONCTIONS**, **COMPOSANTS / mise en œuvre / Localisation**, avec **Lots concernés** à droite de la troisième zone. Le corps est réglé en lignes pointillées. L'export reprend ces éléments, regroupe par lot et signale explicitement les articles absents ou devenus obsolètes.

### Avant-métré

La capture montre un en-tête **OPÉRATION / TRAVAUX DE / PAGE**, puis **N° / Index / DÉSIGNATION / U / Quant / PV HT / Montant**, une ligne **REPORT** et un pied **À REPORTER / BAS DE PAGE**. Le nouvel export reprend ces champs, la grille noire, les minutes détaillées et les reports de montants HT. Les lignes sans prix restent non chiffrées ; le total est alors identifié comme partiel.

### Limite de reproduction

Ces exports reproduisent la **structure visible** des captures. Ce ne sont pas des fac-similés contractuels au millimètre : les images ne donnent ni dimensions papier garanties, ni polices originales, ni marges, ni modèle éditable. La lisibilité de textes CCTP longs impose aussi une pagination. Pour une conformité graphique stricte, fournir les fichiers Word/Excel/PDF originaux et les contraintes de rendu.

L'impression se fait en A4 portrait, échelle 100 %, sans les en-têtes/pieds automatiques du navigateur. Le navigateur fournit la commande Enregistrer en PDF ; aucune génération PDF serveur n'est ajoutée.

## Normes et IA : fonctionnement et limites

Pour une fiche du cours avec code rapproché, le serveur réutilise les références proposées par le registre audité existant. Pour une désignation libre, des correspondances ciblées et sourcées couvrent notamment la maçonnerie, les plaques de plâtre et la peinture. L'IA reçoit les références documentaires disponibles et le contexte ; le serveur joint les références et leurs liens dans l'article, y compris en secours local.

Les notices officielles consultées confirment notamment les domaines des NF DTU 20.1, 25.41 et 59.1 :

- [CSTB — NF DTU 20.1](https://boutique.cstb.fr/detail/documents-techniques-unifies/dtu-nf-dtu/20-maconneries/nf-dtu-20-1-ouvrages-en-maconnerie-de-petits-eleme)
- [AFNOR — NF DTU 25.41 P1-1](https://www.boutique.afnor.org/fr-fr/norme/nf-dtu-2541-p11/travaux-de-batiment-ouvrages-en-plaques-de-platre-plaques-a-faces-cartonnee/fa194671/321485)
- [AFNOR — NF DTU 59.1 P1-1](https://www.boutique.afnor.org/fr-fr/norme/nf-dtu-591-p11/travaux-de-batiment-revetements-de-peinture-en-feuil-mince-semiepais-ou-epa/fa170291/41498)

**Ce dispositif ne garantit pas automatiquement « toutes les normes exactes et à jour »**. Une association de mots-clés ou une réponse LLM ne peut pas certifier le domaine d'application, les parties, les amendements, les annexes nationales et l'édition contractuelle. Le code ne transforme pas le registre en abonnement normatif actualisé en continu. Une norme proposée reste à revalider sur les sources officielles et selon le marché ; les Eurocodes de dimensionnement restent à confirmer avec le bureau d'études. Les clauses intégrales protégées des normes ne sont pas reproduites.

L'API conserve son authentification propriétaire et la clé reste côté serveur. Aucun secret n'est ajouté au code client. Le modèle et les routes OpenAI ne sont pas remplacés.

## Vérification et mise en ligne

Les résultats précis des tests sont fournis dans le compte-rendu de livraison. Les premiers contrôles couvrent notamment : 5 × 4 × 0,15 = 3 m³ ; passage m/cm sans changement de quantité ; pertes après déductions ; sauvegarde/rechargement ; unité et prix kg/t ; refus de code dans les formules ; échappement HTML et restitution des références.

Les exports **Excel Pro** et les lignes dynamiques du classeur historique contiennent des quantités figées et la preuve du calcul. Pour les modifier, recalculer dans le site puis réexporter. Les anciennes lignes du classeur historique conservent leurs formules Excel.

Cette étape modifie les sources locales. Elle ne publie pas automatiquement les changements sur le site public : vérifier les fichiers dans GitHub Desktop, saisir un résumé, **Commit to main**, puis **Push origin**. Vercel lancera ensuite sa compilation habituelle avec les variables serveur déjà configurées.
