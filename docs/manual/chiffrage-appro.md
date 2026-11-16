# Chiffrage DPGF, achats et audit

## 4.1 Du métré au dossier chiffré

Commence par les quantités et leurs justificatifs. Les modules de prix et d’approvisionnement utilisent les lignes réelles du projet ; ouvrir une vue n’ajoute aucun ouvrage d’exemple.

| Étape | Où aller | Vérification attendue |
| --- | --- | --- |
| 1. Métrer | Relevé sur plan, Calculs & avant-métré et Feuille de minute | Cotes, unités, ouvertures, Index et Report. |
| 2. Relire | Approvisionnement & audit → Vérificateur d’oublis | Examiner chaque indice avec les plans et le CCTP. |
| 3. Chiffrer | Étude de prix | Coûts, temps MO, méthode de vente, prix manquants et TVA. |
| 4. Décrire | Éditeur CCTP FR / LU | Prescriptions techniques, localisations et modes de métré. |
| 5. Préparer les achats | Approvisionnement & audit | Blocs, quantités physiques nettes, pertes, fournisseurs et colisages. |

Le travail reste itératif : si tu modifies un ouvrage ou une quantité, recontrôle les prix, les besoins et le descriptif. Le CCTP reprend les spécifications techniques ; les quantités et prix restent dans les bordereaux.

[Ouvrir l’étude de prix](atelier:prices)
[Ouvrir Approvisionnement & audit](atelier:needs)

> 💡 WORKFLOW PRO — Métré → Audit d’oublis → Chiffrage DPGF → CCTP et préparation des achats. Aucun export ne transmet un devis ou une commande à un destinataire.

## 4.2 Renseigner un sous-détail de prix

1. Ouvre **Outils du projet → Étude de prix**.
2. Recherche l’ouvrage ou filtre le tableau par lot.
3. Dans **Valorisation**, conserve **PV saisi** si tu connais directement le prix unitaire, ou choisis **DS × K** pour établir un sous-détail.
4. Renseigne **Temps MO**, en heures par unité d’ouvrage.
5. Pour **Matériaux / u.**, choisis **Saisie directe** ou **Bloc matériaux**. Ce second choix nécessite un ouvrage composé déjà affecté à la ligne.
6. Renseigne **Matériel / u.**, qui comprend ici le coût unitaire des moyens ou engins prévus.
7. Valide chaque cellule en la quittant, avec **Tab** ou **Entrée**. Une virgule décimale est acceptée.
8. Vérifie **DS / u.**, **PV HT / u.**, **Montant HT** et les heures de la ligne.
9. Clique sur **Détail** pour lire les opérations et contrôler un coût horaire ou un K spécifique.

**DS unitaire = matériaux + temps MO × coût horaire chargé + matériel.** Le coût horaire global est hérité par les lignes, sauf si un coût horaire spécifique a été renseigné dans Détail. Un champ spécifique vide rétablit l’héritage du projet.

Un champ non renseigné ne devient pas un coût gratuit. En mode DS × K, **Sous-détail incomplet** et **À compléter** signalent les données manquantes. Le nombre **0** est accepté lorsqu’un coût réellement nul est voulu. Si le bloc matériaux ne contient pas tous ses prix d’achat, complète-le dans **Ouvrages composés**.

Choisir Saisie directe pour le coût matériaux conserve le bloc d’approvisionnement affecté. Les besoins restent calculés à partir de ses ratios. Le prix manuel d’une ligne n’est pas modifié par un changement de K global.

> ⌨️ RACCOURCI — Dans l’étude de prix, Tab valide et poursuit la saisie au clavier. Entrée valide la cellule. Échap restaure sa dernière valeur enregistrée. Corrige les champs signalés en rouge avant d’exporter.

## 4.3 Choisir la méthode de vente et la TVA

Dans **Paramètres de vente**, vérifie le coût horaire, la méthode de vente et la TVA du projet. Les trois méthodes ont des sens différents.

| Méthode affichée | Formule | Lecture |
| --- | --- | --- |
| K saisi directement | PV HT = DS × K | Tu fournis le multiplicateur de vente. |
| FG × Bénéfice & Aléas | K = (1 + FG / 100) × (1 + B&A / 100) | Deux majorations successives. |
| Bénéfice sur prix de vente | K = (1 + FG / 100 + aléas / 100) / (1 − bénéfice / 100) | Le bénéfice est exprimé en pourcentage du PV ; il doit rester inférieur à 100 %. |

Le bouton **Paramètres d’exemple** propose 42 €/h, FG = 15 % et B&A = 10 %, soit **K = 1,265**. Clique sur **Utiliser ces paramètres** seulement si tu retiens ces hypothèses. Ces valeurs viennent de l’exemple utilisateur ; elles ne constituent pas des coûts de marché vérifiés ni une extraction certifiée des livres.

Les exemples de sous-détails par code sont proposés seulement quand le code et l’unité correspondent. Aucun temps ou coût par défaut n’est inventé pour les autres ouvrages. Les anciens projets conservent leur méthode de vente tant que tu ne la changes pas.

La TVA est un paramètre de l’opération. Elle n’est pas réinitialisée par le bouton France / Luxembourg. Contrôle son applicabilité au dossier ; changer le pays ne suffit pas à choisir un taux. Les coefficients de vente et les K spécifiques sont modifiables par le dirigeant.

## 4.4 Lire les arrondis, les totaux et les heures

Les quantités de métré restent sans arrondi intermédiaire. Le logiciel arrondit le **PV unitaire au centime**, puis le **montant de chaque ligne au centime**. Le total HT est la somme de ces montants. La TVA est calculée sur ce total, puis arrondie au centime.

| Indicateur | Ce qu’il couvre |
| --- | --- |
| Total HT renseigné | Seulement les lignes dont le prix est renseigné ; un compteur indique les prix manquants. |
| Total HT complet | Toutes les lignes du projet ont un prix. Un prix nul explicite reste un prix renseigné. |
| Déboursé sec connu | Seulement les lignes possédant une étude complète. Le compteur précise ce périmètre. |
| Heures | Quantité signée × temps MO sur les études complètes. Une déduction affectée réduit les heures correspondantes. |
| Écart vente − DS des lignes étudiées | Vente et DS comparés sur ce même périmètre, hors lignes à PV saisi et études incomplètes. |
| Sous-totaux par lot | Somme des montants de ligne du lot, avec indication des prix manquants. |

Ne présente pas l’écart vente − DS comme la marge globale complète si certaines lignes n’ont qu’un PV manuel. Aucun DS n’est déduit automatiquement d’un prix de vente.

### Exemple guidé indépendant de l’exercice du garage

Pour t’entraîner, prends une ligne de mur de **20 m² nets**, sans ouverture dans cet exemple, et saisis les hypothèses ci-dessous. Elles ne sont pas des prescriptions de chantier.

| Donnée | Valeur retenue |
| --- | --- |
| Temps MO | 0,85 h/m² |
| Coût horaire chargé | 42 €/h |
| Matériaux saisis directement | 24 €/m² |
| Matériel | 1,50 €/m² |
| Frais généraux | 15 % |
| Bénéfice & Aléas, majorations successives | 10 % |
| TVA choisie pour ce calcul d’école | 20 % |

| Opération | Résultat |
| --- | --- |
| MO unitaire = 0,85 × 42 | 35,70 €/m² |
| DS = 24 + 35,70 + 1,50 | 61,20 €/m² |
| K = 1,15 × 1,10 | 1,265 |
| PV HT = arrondi de 61,20 × 1,265 | 77,42 €/m² |
| Montant HT = 20 × 77,42 | 1 548,40 € |
| TVA = 1 548,40 × 20 % | 309,68 € |
| Total TTC | 1 858,08 € |
| Heures = 20 × 0,85 | 17 h |

## 4.5 Exporter le bordereau client ou l’étude interne

1. Termine les prix de toutes les lignes. Un sous-détail incomplet bloque les exports de chiffrage.
2. Relis les totaux, la TVA, les lots et les éventuelles valeurs nulles.
3. Choisis l’export selon son destinataire.
4. Ouvre le fichier téléchargé pour vérifier la présentation et les formules.
5. Conserve une copie portant le nom du chantier, le pays, l’indice et la date.

| Bouton | Contenu | Usage |
| --- | --- | --- |
| DPGF client .xlsx, en France | Quantités, PV, montants, TVA, TTC, lots et fiche projet | Bordereau client sans coûts internes. |
| Bordereau client .xlsx, au Luxembourg | Même logique de prix, avec le titre du bordereau LU | Positions chiffrées à intégrer au dossier de soumission. |
| Étude interne .xlsx | Paramètres, sous-détails, prix matériaux et bordereau reliés par formules | Travail interne : ce fichier contient les coûts et coefficients. |
| CSV client | Valeurs des lignes et totaux | Échange de données ; les formules dynamiques sont dans le XLSX. |

Le fichier client exclut les coûts internes, les fournisseurs et les coefficients de vente. **Étude interne** doit rester dans ton dossier de travail. Les exports couvrent tous les lots, même si tu affiches un filtre.

**Exports & trames → DPGF / BPU avec formules (.xlsx)** reste le classeur global de travail. Il comprend aussi des données internes : ne le confonds pas avec le nouveau fichier client. Une modification dans Excel ne remonte pas automatiquement dans le site.

## 4.6 Affecter les ouvrages composés et les fournisseurs

1. Ouvre **Approvisionnement & audit**.
2. Clique sur **Afficher les affectations ligne → bloc** ou **Vérifier les affectations**.
3. Pour chaque ouvrage à décomposer, choisis un **Ouvrage composé compatible** avec l’unité de la ligne.
4. Affecte le **même bloc aux lignes de déduction** qui réduisent cet ouvrage.
5. Ouvre **Ouvrages composés** et vérifie les matériaux, ratios, pertes, fournisseurs, quantités par conditionnement et libellés de colisage.
6. Enregistre le bloc. Reviens dans Approvisionnement & audit pour contrôler les besoins.

Les affectations sont présentées par pages de 50 lignes. Une affectation peut aussi modifier une étude de prix si elle utilise la source **Bloc matériaux**. Les matériaux sont regroupés selon leur nom, unité, fournisseur et conditionnement ; deux colisages différents restent distincts.

Le bouton **Ajouter un exemple** ouvre les trois décompositions proposées : blocs béton, évacuation des terres excédentaires et carrelage. Relis les valeurs, adapte les fournisseurs et les colisages, puis coche la vérification avant **Conserver le bloc**. Le bloc ajouté doit ensuite être affecté aux lignes concernées.

> 💡 ASTUCE PRO — Une ligne sous-traitée peut rester sans décomposition matériaux. Le compteur **Lignes avec composants** et la mention **Liste partielle** t’aident à distinguer le périmètre effectivement préparé pour les achats.

[Ouvrir les ouvrages composés](atelier:assemblies)

## 4.7 Calculer les besoins nets, pertes et conditionnements

### Choisir la bonne base

**Quantité physique nette** déduit toutes les ouvertures connues pour l’achat des matériaux, sans modifier les quantités de la minute ni les règles FR/LU du projet. **Quantité de décompte (minute)** reprend la quantité contractuelle ; elle peut comprendre des vides comptés pour pleins.

Une quantité reprise ou importée demande un contrôle de son caractère net. Le logiciel n’invente pas des ouvertures absentes des données. Vérifie aussi qu’une déduction n’est pas déjà comprise dans une quantité BIM nette.

### Lire le calcul

- Besoin net = somme des quantités signées d’ouvrage × ratio matériau.
- Besoin avec pertes = somme de chaque contribution × (1 + perte du matériau / 100).
- Colis à prévoir = arrondi supérieur du besoin retenu / quantité par colis.
- Quantité à commander = nombre de colis × quantité par colis.
- Surplus de colisage = quantité à commander − besoin retenu.

Le bouton **Détail** affiche les contributions de chaque ligne, les ratios, les pertes et les déductions négatives. Aucun arrondi d’affichage n’est utilisé avant le calcul des colis.

Pour le mur indépendant de **20 m²** présenté plus haut, retiens ici **10 blocs/m²**, **5 % de pertes** et des **palettes de 50 blocs** : besoin net = 200 blocs ; avec pertes = 210 blocs ; commande préparée = **5 palettes, soit 250 blocs** ; surplus de colisage = 40 blocs. Le coût matériaux de 24 €/m² de l’exemple de prix reste une hypothèse saisie directement, distincte de ce colisage.

### Ne pas appliquer deux fois le foisonnement

L’exemple d’évacuation applique un ratio de **1,25 m³ foisonné par m³ excédentaire en place après réemploi**. Il contient déjà l’augmentation de 25 % donnée dans cet exemple. Ce n’est pas un taux de perte.

Ne l’affecte ni au volume total des fouilles sans déduire le réemploi, ni à une quantité déjà foisonnée. Pour 10 m³ excédentaires en place, le besoin serait 12,5 m³ foisonnés selon cette hypothèse ; le conditionnement retenu reste à vérifier avec le fournisseur.

> ⚠️ ATTENTION — Une déduction sans bloc ne réduit aucun matériau. Un besoin total négatif, une unité incompatible ou un conditionnement nul exige une correction avant l’export. Une simple liste partielle reste exportable mais elle est identifiée comme telle.

## 4.8 Utiliser le vérificateur d’oublis

1. Dans **Approvisionnement & audit**, choisis **Vérificateur d’oublis**.
2. Lis le niveau de chaque contrôle : calcul bloquant, point à vérifier ou conseil.
3. Identifie la ligne et le bâtiment concernés.
4. Ouvre **Voir la minute**, puis vérifie les plans, le CCTP et la composition de l’ouvrage.
5. Complète une ligne existante, un bloc ou une prestation seulement si le dossier le justifie.
6. Reviens à l’audit pour relire les indices restants.

| Famille détectée | Compléments examinés séparément |
| --- | --- |
| Fouilles ou rigoles | Gestion des terres : réemploi, stockage ou évacuation ; préparation du fond / propreté selon le procédé. |
| Carrelage ou faïence | Plinthes si prévues ; préparation du support selon le système. |
| Maçonnerie | Arase ou coupure de capillarité ; chaînages ; linteaux lorsque nécessaires. |
| Cloisons / BA13 | Traitement des joints ; isolant si la composition le prévoit. |

Une évacuation présente ne fait pas disparaître le rappel de propreté. Un joint de carrelage ne satisfait pas le contrôle des joints de cloison. Une ligne nulle ou négative ne prouve pas la présence d’un complément. Les contrôles de présence sont séparés par bâtiment lorsque celui-ci est renseigné.

L’audit utilise les désignations, les quantités et les composants. Il ne lit pas à lui seul l’intégralité des plans ou des pièces du marché. **Aucun indice détecté** ne certifie ni l’exhaustivité du métré ni sa conformité normative. Aucune ligne ou prescription CCTP n’est ajoutée automatiquement par l’audit.

## 4.9 Préparer les commandes et terminer le dossier

1. Reviens à l’onglet **Approvisionnement & commandes**.
2. Contrôle la **Base des besoins**, la case **Inclure les pertes / chutes par matériau** et la couverture des lignes.
3. Vérifie le fournisseur, le besoin net, le besoin retenu, le colisage et la quantité à commander.
4. Utilise les filtres pour la lecture ; les exports comprennent tous les fournisseurs.
5. Clique sur **CSV**, **XLSX** ou **PDF**.
6. Ouvre le livrable et relis les hypothèses et avertissements. Le XLSX contient le détail des calculs et une feuille de contrôles ; le PDF regroupe les préparations par fournisseur.
7. Rapproche les achats du planning et des produits réellement disponibles avant toute commande.

Ces livrables sont des **préparations de commande**. Aucun message, devis ou bon n’est envoyé à un fournisseur par le site. Les prix et les quantités exportés sont des instantanés : ils ne se mettent pas à jour dans un fichier déjà téléchargé.

| Rôle | Travail autorisé dans ces modules |
| --- | --- |
| Métreur | Saisir les quantités et les sous-détails, préparer les besoins et les exports. |
| Dirigeant / propriétaire | Gérer aussi les coefficients de vente et valider le chiffrage du projet synchronisé. |
| Conducteur | Consulter les quantités et besoins ; les prix et marges ne sont pas affichés. |

**Valider le chiffrage** nécessite un projet synchronisé, tous les prix renseignés et le rôle dirigeant. Chaque modification remet le chiffrage en préparation. Conserve ensuite une révision et les exports relus du même indice.

### Dépannage rapide

| Situation | Action |
| --- | --- |
| Le PV indique À compléter | Remplis temps, matériaux et matériel, ou les prix manquants du bloc. Zéro doit être saisi explicitement lorsqu’il est voulu. |
| Le changement de coût horaire global ne modifie pas une ligne | Ouvre Détail et contrôle le coût horaire spécifique. |
| Le changement de K ne modifie pas un prix | Vérifie si la ligne est en PV saisi ou possède un K spécifique. |
| La liste matériaux est vide | Affecte un bloc avec des composants à ratios positifs aux lignes concernées. |
| Un besoin est trop grand au Luxembourg | Compare la base physique nette et la quantité de décompte, puis vérifie les ouvertures réellement renseignées. |
| Les terres semblent foisonnées deux fois | Vérifie la nature de la quantité de départ et le ratio du bloc. |
| L’export de chiffrage reste désactivé | Complète tous les prix et corrige les saisies rouges ; le filtre ne réduit pas le périmètre exporté. |
| Valider le chiffrage est indisponible | Contrôle le rôle dirigeant, la synchronisation et les prix manquants. |

[Revenir à la feuille de minute](atelier:minute)
[Ouvrir l’éditeur CCTP](atelier:cctp)
