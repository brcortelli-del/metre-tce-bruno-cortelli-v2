# Manuel utilisateur Atelier Métré TCE

## Parties 1 à 3

**Mon atelier de métré TCE — manuel en ligne actualisé, édition complète du 13 novembre 2026**

Les PDF fournis restent les documents d’origine. Le guide en ligne ajoute le chapitre Chiffrage DPGF, achats & audit pour les modules désormais intégrés.

Ce manuel explique comment préparer un chantier, établir un avant-métré et produire un descriptif technique avec la version actuelle de ton atelier. Il suit les intitulés réels des boutons. Il est destiné à ton apprentissage de métreur TCE à l’École Chez Soi.

Site privé : Mon atelier de métré TCE

Les captures du PDF montrent les vues de l’atelier : calculs, relevé sur plan, minute et CCTP. Les tableaux complètent ces repères.

> 💡 À SAVOIR — Ce guide documente ton application. Il ne constitue pas un document officiel de l’École Chez Soi, de l’AFNOR ou du CRTI-B. Le chapitre Exercice complet & corrigé reprend le sujet et la correction du garage ; Chiffrage DPGF, achats & audit explique les nouveaux modules. Le corrigé y est masqué jusqu’à ce que tu choisisses de l’afficher.

### Trois repères avant de commencer

1. **Les formats réels sont Word .docx et PDF pour le CCTP.** Le fichier Excel .xlsx contient le métré, les calculs et les bordereaux. Le logiciel ne produit pas de CCTP au format ancien .doc.
2. **Le mode France utilise une quantité nette pédagogique.** Toutes les ouvertures saisies dans la fiche mur sont déduites. Aucun seuil universel de 0,50 m² n’est présenté comme une règle du NF DTU 20.1.
3. **Une sauvegarde JSON conserve les données du projet.** Elle n’est pas une archive complète des fichiers de plans. Conserve aussi les PDF, images et fichiers CAO/BIM d’origine.

### Plan de lecture

- **Partie 1** — Se repérer, comprendre les termes et utiliser les raccourcis.
- **Partie 2** — Réaliser le métré depuis un plan, au clavier ou par import.
- **Partie 3** — Préparer le CCTP FR/LU, contrôler les références et exporter.

# Partie 1 Prise en main et lexique du métreur

## 1 Présentation de l’espace de travail

### 1.1 Ouvrir ton atelier privé

1. Ouvre l’adresse du site.
2. Si un écran de connexion apparaît, utilise **Continue with ChatGPT** avec le compte autorisé à accéder à ton atelier.
3. Vérifie le nom affiché dans **PROJET** avant de saisir une cote.
4. Si tu reprends un chantier synchronisé, choisis-le dans **Projets enregistrés**.
5. Contrôle le pays du chantier. Le bouton actif est **Mode France** ou **Mode Luxembourg**.

L’accès privé au site et les fichiers que tu télécharges sont deux choses différentes : un export téléchargé devient un fichier sur ton ordinateur.

### 1.2 Schéma général de repérage

| Zone de l’écran | Commandes à repérer | Utilité |
| --- | --- | --- |
| Barre du haut | Annuler, Rétablir, Raccourcis, lune ou soleil | Revenir sur une action et régler le confort d’affichage. |
| Bandeau du chantier | Mode France / Mode Luxembourg | Choisir le référentiel de travail du projet. |
| Bandeau du projet | PROJET, Sauvegarder, Ouvrir, Nouveau projet | Identifier le dossier et gérer ses sauvegardes. |
| Barre latérale | Relevé sur plan, Feuille de minute, Éditeur CCTP FR / LU, Normes & DTU, Import CAO / BIM | Ouvrir la vue de travail souhaitée. |
| Zone centrale | Plan, tableau ou éditeur selon la vue choisie | Travailler sur les relevés, les calculs ou les articles. |
| Outils du projet | Calculs & avant-métré, Fiche projet, Variables, Ouvrages composés, Étude de prix, Approvisionnement & audit, Exports & trames, Révisions & accès | Préparer le dossier et produire les livrables. |

![Accueil et calculs de l’atelier](/manual/capture-calculs.jpeg)

Clique sur l’icône de réduction de la barre latérale pour gagner de la largeur. Les icônes restent disponibles. Sur un écran étroit, la navigation peut déjà apparaître sous une forme compacte.

### 1.3 Comprendre les trois vues de métré

**Relevé sur plan** sert à obtenir une longueur, une surface ou un nombre à partir d’un dessin. Une hauteur de mur ou une profondeur de fouille doit être relevée dans les coupes ou saisie séparément.

**Calculs & avant-métré** contient la fiche complète d’un ouvrage : choix de la formule, dimensions, ouvertures, index, report, localisation et prix facultatif. À droite, le tableau reprend les résultats et les justificatifs.

**Feuille de minute** sert à modifier rapidement les cellules de calcul des lignes déjà créées. Le tableau est adapté aux chantiers comportant plusieurs centaines de lignes. Utilise **Fiche complète** pour modifier les informations qui ne sont pas directement éditables dans ses cellules.

### 1.4 Lire la trame de ton cours

| N° | Index | Désignation | Unité | Quantité | PV HT | Montant HT |
| --- | --- | --- | --- | --- | --- | --- |
| Repère de ligne | Code de l’ouvrage | Ouvrage et détail du calcul, avec **Report** dans la sous-colonne gauche du groupe Désignation | m, m², m³, u… | Résultat | Prix par unité | Quantité × prix |

- **N°** situe la ligne dans le document.
- **Index** identifie l’ouvrage ou sa correspondance avec un bordereau.
- **Report** sert à rappeler une provenance ou un repère de calcul.
- **Désignation** explique ce qui est mesuré et où se trouve l’ouvrage.
- **PV HT** reste facultatif pour un exercice portant uniquement sur les quantités.

> ⚠️ ATTENTION — Écrire « A1 » dans Report ne crée pas une formule liée à la ligne A1. Le report est un texte de traçabilité. Les variables et les liaisons au plan ont leur propre fonctionnement.

### 1.5 Se repérer avec les couleurs

| Famille de travaux | Couleur de repérage |
| --- | --- |
| Terrassement et VRD | Ambre / orange |
| Fondations, soubassements et gros œuvre | Bleu cobalt |
| Second œuvre et finitions | Vert émeraude |
| Lots techniques | Violet |
| Clos et couvert | Cyan |

La couleur aide à retrouver les badges et les tracés. Elle ne remplace ni la désignation, ni le lot, ni la règle de métré. Vérifie toujours l’affectation de la ligne dans la fiche complète.

### 1.6 Préparer la fiche projet

1. Ouvre **Fiche projet**.
2. Renseigne l’adresse du chantier, le client, le maître d’œuvre et la date d’étude.
3. Vérifie la devise et le taux de TVA. Le changement France / Luxembourg ne réinitialise pas ce taux.
4. Si tu chiffres les travaux, renseigne la méthode de vente et les coefficients nécessaires.
5. Clique sur **Enregistrer la fiche et les paramètres**.
6. Dans **Nomenclature des lots**, écris un lot par ligne.
7. Clique sur **Enregistrer les lots**.
8. Dans **Découpage spatial**, renseigne bâtiment, niveau et pièce ou zone. Clique sur **Ajouter la localisation**.

**Exemple de nomenclature à saisir :**

| Ligne | Nom du lot |
| --- | --- |
| 1 | 01 Terrassement |
| 2 | 02 Gros Œuvre |
| 3 | 03 Enduits et peinture |

Créer un lot dans le projet ne crée pas automatiquement ses clauses techniques dans la bibliothèque. Un ouvrage absent de cette bibliothèque peut être traité par une ligne de métré et un article CCTP libre.

### 1.7 Sauvegarder et reprendre le travail

Les lignes de minute valides et les modifications de l’éditeur CCTP sont enregistrées au fil du travail. Dans Étude de prix, la sortie d’une cellule valide et sauvegarde sa valeur ; Échap la restaure. Les variables, les lots et les paramètres de fiche nécessitent leurs boutons d’enregistrement.

| Indication ou commande | Ce qu’elle signifie |
| --- | --- |
| Enregistrement local en cours | Une écriture est encore en attente. |
| Enregistré sur cet appareil | Les données ont été enregistrées dans le navigateur utilisé. |
| Statut de synchronisation du projet | Indique séparément l’état de la connexion et de l’enregistrement en ligne. |
| Sauvegarder | Télécharge une copie JSON des données du projet. |
| Ouvrir | Charge une sauvegarde JSON et remplace le projet courant après confirmation. |
| Révisions & accès | Permet de conserver un indice avant une modification importante. |

Avant un import important ou un changement de pays, télécharge une sauvegarde et enregistre une révision avec un nom explicite, par exemple **Indice A avant modification des plans**.

> 💡 ASTUCE PRO — Range ensemble la sauvegarde JSON, les plans sources, les nomenclatures importées et les exports. Sur un autre appareil, privilégie le projet synchronisé pour retrouver les plans enregistrés en ligne. Une sauvegarde JSON seule ne transporte pas leurs fichiers binaires.

Si un plan ne réapparaît pas après ouverture d’un JSON, conserve les données et le fichier source. Évite de remplacer le plan sans vérifier l’effet sur les relevés existants.

## 2 Dictionnaire des termes et abréviations

| Terme ou sigle | Signification et usage dans l’atelier |
| --- | --- |
| TCE | Tous corps d’état. Ensemble des lots du bâtiment. |
| Avant-métré | Calcul prévisionnel et détaillé des quantités d’ouvrages. |
| Minute | Feuille de travail qui conserve les cotes, les opérations et les résultats. |
| Désignation | Texte qui identifie précisément l’ouvrage mesuré. |
| Lot | Groupe de travaux organisé par corps d’état. |
| HSP | Hauteur sous plafond. Pour l’utiliser dans une formule, crée une variable de ce nom et donne-lui une valeur et une unité. |
| N | Nombre de parties semblables. La déduction de la fiche s’applique à chaque partie avant multiplication par N. |
| L | Longueur de la partie mesurée. |
| l | Largeur. Dans certaines cellules ou expressions du logiciel, la clé correspondante est w. |
| H | Hauteur ou épaisseur selon l’ouvrage. La cellule peut être repérée h. Lis son libellé. |
| m ou ml | Mètre ou mètre linéaire. L’atelier affiche généralement m. |
| m² | Mètre carré, unité de surface. |
| m³ | Mètre cube, unité de volume. |
| U ou u | Unité de comptage : une porte, une prise, un regard… |
| H.O. | Hors œuvre. Précise une base de cotes extérieures selon le relevé réalisé. |
| D.O. | Dans œuvre. Précise une base de cotes intérieures selon le relevé réalisé. |
| Aux axes | Cotes prises sur les axes des éléments. |
| Entre nus | Distance entre les faces de référence indiquées au dossier. |
| Report | Repère textuel rappelant un résultat ou une provenance. Ce champ ne crée pas de dépendance automatique. |
| Quantité brute | Quantité avant déductions. |
| Quantité nette | Quantité restante après les déductions appliquées. |
| Vides pour pleins | Convention de décompte selon laquelle certains vides ne sont pas déduits. Ce n’est pas la surface physique réelle du matériau. |
| Baie | Ouverture dans une paroi, par exemple pour une porte ou une fenêtre. |
| Trémie | Ouverture dans un plancher, par exemple pour un escalier. |
| Tableau de baie | Retour latéral de l’ouverture. Ses surfaces ne sont pas calculées automatiquement par la simple déduction de la baie. |
| Foisonnement | Augmentation du volume apparent des terres après excavation. La valeur dépend du sol et de l’hypothèse retenue. |
| Coefficient de foisonnement | Multiplicateur du volume. Par exemple 1,25 correspond à une augmentation de 25 %. Un coefficient 1,25 et un taux 25 % ne se saisissent pas de la même façon. |
| DTU ou NF DTU | Document technique unifié. Lis la référence, la partie, l’édition et le domaine avant de l’utiliser dans un CCTP. |
| CCT | Cahier des clauses techniques types, souvent la partie P1-1 d’un NF DTU. |
| CGM | Critères généraux de choix des matériaux, souvent la partie P1-2. |
| CCS | Cahier des clauses spéciales ou administratives spéciales, selon le titre exact du document. Toutes les règles de décompte ne se déduisent pas de ce seul sigle. |
| CRTI-B | Centre de Ressources des Technologies et de l’Innovation pour le Bâtiment, au Luxembourg. |
| CTG | Clauses techniques générales luxembourgeoises, classées par métier. |
| OAI | Ordre des Architectes et des Ingénieurs-Conseils du Luxembourg. Le sigle ne désigne pas à lui seul une règle de déduction. |
| CCTP | Cahier des clauses techniques particulières. Il décrit les prestations, les matériaux et la mise en œuvre du projet. |
| DPGF | Décomposition du prix global et forfaitaire. |
| BPU | Bordereau des prix unitaires. |
| DS | Déboursé sec : coût direct des matériaux, de la main-d’œuvre et du matériel. |
| MO | Main-d’œuvre. Le temps unitaire est exprimé en heures par unité d’ouvrage. |
| Coût horaire chargé | Coût retenu pour une heure de main-d’œuvre, avec les charges comprises dans l’hypothèse de l’entreprise. |
| FG | Frais généraux. Lis la méthode de vente choisie pour savoir comment le pourcentage entre dans le calcul de K. |
| B&A | Bénéfice et aléas dans la méthode des majorations successives. Ce taux n’est pas un bénéfice exprimé sur le PV. |
| Coefficient K | Multiplicateur permettant de passer du DS au prix de vente. Trois méthodes distinctes sont disponibles dans Étude de prix. |
| HT / TVA / TTC | Hors taxes, taxe sur la valeur ajoutée, toutes taxes comprises. Le taux de TVA du dossier reste à confirmer pour l’opération. |
| Quantité physique nette | Quantité utilisée pour les achats après toutes les ouvertures connues, distincte d’un décompte en vides pour pleins. |
| Perte / chute | Majoration réglée par matériau, appliquée avant le calcul des conditionnements. |
| Conditionnement / colisage | Quantité par colis et libellé de ce colis : palette, boîte, sac, benne… |
| Besoin net / quantité à commander | Quantité de matériau nécessaire avant pertes / quantité préparée après pertes et arrondi au colisage. |
| Préparation de commande | Liste de besoins à relire avant achat. Le site ne l’envoie pas au fournisseur. |
| PV HT | Prix de vente hors taxes par unité. |
| BIM et IFC | Organisation des données de maquette et format d’échange de ces données. L’import de l’atelier exploite les quantités exportées. |
| QTO | Jeu de quantités présent dans un IFC. NetVolume et GrossVolume sont deux mesures différentes à choisir, pas à additionner. |

## 3 Fiche mémo des raccourcis clavier

| Touche ou combinaison | Action | Contexte |
| --- | --- | --- |
| Alt + P | Ouvrir Relevé sur plan | Navigation générale, hors fenêtre modale ouverte. |
| Alt + M | Ouvrir Feuille de minute | Même condition. |
| Alt + C | Ouvrir Éditeur CCTP | Même condition. |
| L | Activer l’outil Linéaire | Sur le plan, hors champ de saisie. |
| S | Activer l’outil Surface | Sur le plan, hors champ de saisie. |
| C | Activer l’outil Comptage | Sur le plan, hors champ de saisie. |
| Maj maintenue | Contraindre le nouveau segment à l’horizontale ou à la verticale par rapport au point précédent | Pendant le tracé ; ne remplace pas l’étalonnage. |
| Échap | Arrêter le tracé et revenir à la sélection, ou fermer une fenêtre | Selon la zone active. |
| Ctrl + Z | Annuler une action | Projet ou cellule de minute ; sur le plan, retire d’abord un point en cours. |
| Ctrl + Y | Rétablir une action | Projet ou point en cours sur le plan. |
| Ctrl + Maj + Z | Autre commande de rétablissement | Lorsqu’elle est interceptée par le gestionnaire du projet. |
| Entrée / Tab, dans Étude de prix | Valider la cellule ; Tab poursuit la saisie | Tableau de chiffrage. |
| Échap, dans Étude de prix | Restaurer la dernière valeur enregistrée | Cellule en cours de saisie. |
| Entrée ou Tab | Passer à la cellule éditable suivante | Minute : N puis L, l et H lorsque ces champs existent. |
| Maj + Entrée ou Maj + Tab | Revenir à la cellule éditable précédente | Feuille de minute. |
| Flèche haut ou bas | Aller à la même colonne de la ligne précédente ou suivante | Feuille de minute. |
| Ctrl + Début ou Ctrl + Fin | Aller au début ou à la fin du tableau | Depuis une cellule de minute. |
| Flèche gauche ou droite | Changer de cellule lorsque le curseur est au bord du texte | Depuis une cellule de minute. |

> ⌨️ RACCOURCI — Le bouton **Raccourcis** de l’en-tête ouvre la fiche mémo. Dans un champ de texte classique ou une zone de texte riche, Ctrl + Z peut conserver son rôle d’annulation de la saisie. Les lettres L, S et C n’activent pas les outils pendant que tu écris une désignation.

# Partie 2 Réaliser un avant métré de A à Z

## 4 Choisir le bon parcours

| Tes données de départ | Parcours conseillé | Ce que tu obtiens |
| --- | --- | --- |
| Un PDF, une image ou un DXF à consulter et à relever | A — Relevé sur plan | Des tracés avec une liaison possible aux calculs. |
| Des cotes écrites, un croquis ou un exercice sans fichier de plan | B — Saisie directe | Des lignes justifiées par leurs dimensions et formules. |
| Une extraction AutoCAD ou une nomenclature Revit en CSV/XLSX | C — Import CAO / BIM | Des groupes de quantités à contrôler et à affecter aux ouvrages. |
| Un IFC contenant des quantités QTO | C — Variante IFC | Des quantités exportées, avec choix de la mesure retenue. |

Les parcours peuvent être combinés dans un même projet. Identifie la provenance de chaque ligne pour éviter de mesurer deux fois un ouvrage.

## 5 Parcours A Métré sur un plan importé

### A1 Importer et contrôler le document

1. Ouvre **Relevé sur plan**.
2. Clique sur **Importer PDF / DWG / DXF / image**.
3. Sélectionne ton PDF, ton DXF ou ton image PNG, JPEG ou WebP. La limite de fichier est de **35 Mo**.
4. Pour un PDF de plusieurs pages, choisis la bonne page dans **Page**.
5. Règle **Zoom** pour lire les cotes et placer les points.
6. Vérifie le nom du fichier, le niveau du bâtiment et l’indice du plan.
7. Lis les éventuels messages signalant des objets CAO non pris en charge.

> ⚠️ ATTENTION — Dans cette vue, le DXF sert de support graphique au relevé. Si tu veux exploiter automatiquement ses lignes, polylignes et blocs, utilise **Import CAO / BIM**. Un plan importé n’est pas une reconnaissance automatique de toutes ses cotes.

### A2 Étalonner en deux clics puis valider la cote

Choisis un segment dont la longueur réelle est connue. Privilégie une cote assez longue et lisible.

![Relevé sur plan — vue du guide](/manual/capture-plan.jpeg)

1. Clique sur **1 Étalonner**.
2. Clique précisément sur la première extrémité du segment coté.
3. Clique sur la seconde extrémité du même segment.
4. Dans **Cote réelle entre les deux points (m)**, saisis la longueur réelle en mètres. Par exemple, une cote de 1 000 cm correspond à **10 m**.
5. Clique sur **Valider l’échelle**.
6. Contrôle le message d’échelle.
7. Mesure une seconde cote connue pour vérifier la cohérence de l’étalonnage.

Les deux clics définissent le segment de référence. La saisie de sa longueur et sa validation restent nécessaires. Le zoom change le confort de lecture, pas la cote réelle.

> 💡 ASTUCE PRO — Étalonne séparément les pages ou vues dont l’échelle diffère. Un scan déformé ou une photo en perspective peut présenter des écarts selon les directions. Dans ce cas, privilégie les cotes écrites et la saisie directe.

### A3 Préparer l’affectation et le repère

Dans **Enregistrer le relevé** :

1. Renseigne **Repère / désignation**, par exemple **SF1 semelle périphérique**.
2. Choisis une **Affectation** : emprise terrassement, fondations, soubassements, dallage, maçonneries, drainage, comptage ou autre.
3. Vérifie **Couleur du lot** si tu veux distinguer visuellement ce tracé.
4. Choisis l’outil de mesure adapté.

L’affectation sert notamment à préparer des ensembles d’ouvrages. La couleur du tracé ne dispense pas de vérifier le lot de la ligne de calcul créée ensuite.

### A4 Tracer une longueur

1. Clique sur **2 Linéaire**, ou appuie sur **L**.
2. Clique sur le point de départ.
3. Clique sur chaque changement de direction.
4. Maintiens **Maj** pour contraindre un segment à 90° par rapport à l’horizontale ou à la verticale du plan.
5. Termine le parcours au dernier point utile.
6. Clique sur **Terminer et enregistrer le tracé**.
7. Contrôle la ligne ajoutée dans **Relevés du plan** et son unité **m**.

Le linéaire peut servir à un mur, une fouille, une semelle ou un réseau. Choisis une base de mesurage cohérente : axes, nus, H.O. ou D.O. Les recouvrements aux angles et aux intersections ne sont pas corrigés automatiquement.

### A5 Tracer une surface

1. Clique sur **2 Surface**, ou appuie sur **S**.
2. Clique les sommets du contour dans leur ordre de parcours.
3. Utilise **Maj** lorsque les arêtes doivent être orthogonales.
4. Vérifie que le contour ne se croise pas.
5. Clique sur **Terminer et enregistrer le tracé**. Le polygone est fermé pour le calcul de surface.
6. Contrôle le résultat en **m²**.

Relève séparément les emprises de terrassement et de dallage. Elles ne sont pas nécessairement identiques.

> ⚠️ ATTENTION — Dessiner un second polygone à l’intérieur du premier ne crée pas automatiquement un trou. Les ouvertures, trémies et emprises à retirer doivent être traitées par une déduction identifiée dans le calcul.

### A6 Compter des équipements

1. Clique sur **2 Comptage**, ou appuie sur **C**.
2. Clique une fois sur chaque équipement de même nature : prises, portes ou regards, par exemple.
3. Vérifie le nombre de points affiché.
4. Corrige le dernier point avec **Annuler un point** ou **Ctrl + Z**.
5. Utilise **Ctrl + Y** pour rétablir un point annulé.
6. Clique sur **Terminer et enregistrer le tracé**.
7. Vérifie le résultat en **u**.

Le comptage de points n’exige pas une échelle de longueur. L’étalonnage reste nécessaire pour les longueurs et les surfaces.

### A7 Corriger un relevé

Pour corriger la géométrie, active **Sélection / sommets**, sélectionne le tracé et déplace le sommet concerné. Vérifie ensuite le résultat.

La colonne **Cote / quantité retenue** permet de remplacer la mesure graphique par une cote exacte lue au plan. Cette valeur reste prioritaire même si un sommet est déplacé ensuite. Le bouton **Mesure auto** rétablit l’utilisation de la mesure graphique.

Si tu veux abandonner un tracé en cours, appuie sur **Échap**. Un tracé déjà enregistré se gère dans la liste des relevés ; Échap ne le supprime pas.

### A8 Envoyer le relevé vers une ligne de calcul

1. Dans **Calculer depuis un relevé**, choisis le relevé enregistré.
2. Choisis l’**Ouvrage** compatible avec son unité.
3. Clique sur **Utiliser dans le calculateur**.
4. La fiche de calcul s’ouvre avec la longueur, la surface ou le nombre repris.
5. Complète les dimensions absentes : hauteur, largeur, épaisseur ou profondeur selon la formule.
6. Vérifie l’unité du résultat et la base des cotes.
7. Renseigne le lot, l’index, le report et la localisation.
8. Clique sur **Ajouter à l’avant-métré**.
9. Ouvre **Feuille de minute** et vérifie le résultat ainsi que le badge **Lié au plan**.

Un relevé de longueur peut ainsi alimenter une formule de volume, après saisie de la largeur et de la hauteur. Le plan de niveau ne fournit pas à lui seul les dimensions d’une coupe.

### A9 Déduire les ouvertures ou une trémie

**Pour un mur avec des baies :**

1. Utilise une fiche de type mur ou maçonnerie comportant la zone **Ouvertures par mur**.
2. Choisis le **Corps d’état / règle des ouvertures** adapté.
3. Clique sur **Ajouter** dans la zone des ouvertures.
4. Saisis largeur, hauteur et nombre pour chaque type de baie identique.
5. Vérifie chaque ligne de décision : baie déduite ou conservée en vide pour plein.
6. Lis le brut, les déductions et le net avant l’ajout ou l’enregistrement de la ligne.

Les dimensions d’ouverture suivent l’unité de saisie de la fiche. Les nombres de baies indiqués concernent **une partie**. Si N vaut 2, le logiciel répète le mur et ses ouvertures deux fois. Crée des lignes distinctes si les deux murs ne comportent pas les mêmes baies.

**Pour une trémie dans une dalle :** calcule la surface à retirer, puis saisis une déduction dans l’unité du résultat. Une ligne de dalle en m³ demande une déduction en m³, donc la surface de la trémie multipliée par l’épaisseur concernée. Une ligne en m² demande une déduction en m².

> ⚠️ ATTENTION NORME — Le dessin d’une ouverture ne détermine pas sa convention de décompte. En France, le profil actuel est net pédagogique. Au Luxembourg, les profils intégrés sont limités à des cas identifiés et restent soumis aux pièces du marché. Les tableaux, retours, niches, baies en angle et regroupements demandent un contrôle distinct.

### A10 Vérifier la liaison entre plan et minute

| Action sur le relevé | Effet à contrôler |
| --- | --- |
| Déplacer un sommet d’un tracé lié | La dimension liée et les quantités dépendantes sont recalculées. |
| Modifier une cote retenue | Cette cote devient la donnée prioritaire du calcul lié. |
| Modifier le zoom | Les quantités ne changent pas. |
| Détacher du plan dans la minute | La ligne devient indépendante du relevé. |

Pour tester la liaison, modifie provisoirement une cote retenue, vérifie la ligne dépendante puis annule la modification. La dimension liée peut être protégée contre une saisie directe dans la minute. Utilise **Détacher du plan** uniquement si tu veux supprimer cette dépendance.

### A11 Préparer plusieurs ouvrages depuis les relevés

1. Affecte correctement chaque relevé : emprise, fondations, soubassements, dallage, etc.
2. Ouvre **Préparer un ensemble d’ouvrages**.
3. Déplie **Épaisseurs, niveaux et corrections des intersections**.
4. Remplace les valeurs de départ par celles du dossier : épaisseurs, profondeurs, hauteurs et corrections.
5. Clique sur **Préparer les articles à vérifier**.
6. Relis chaque proposition. Décoche les articles inutiles.
7. Clique sur **Ajouter les articles cochés à l’avant-métré**.
8. Contrôle les lignes ajoutées dans la minute.

Les valeurs de départ viennent d’exemples de formation. Elles ne constituent pas des valeurs imposées pour ton chantier. Les ratios d’armatures restent des hypothèses à justifier ; l’outil ne dimensionne pas les fondations.

## 6 Parcours B Métré sans plan par saisie directe

### B1 Créer les lots et les localisations

Commence par **Fiche projet**. Enregistre les paramètres, les lots et le découpage spatial comme expliqué en partie 1. Cette préparation permet de filtrer ensuite les lignes par bâtiment, niveau ou lot.

### B2 Créer une variable HSP

1. Ouvre **Variables**.
2. Clique sur **Ajouter une variable**.
3. Saisis **HSP** dans Nom.
4. Saisis sa valeur numérique, par exemple **2,50**, puis choisis **m** dans Unité.
5. Clique sur **Enregistrer et recalculer**.
6. Dans une hauteur de mur, saisis **HSP** au lieu de répéter la valeur.
7. Pour modifier la hauteur commune, reviens dans Variables, change sa valeur et clique de nouveau sur **Enregistrer et recalculer**.

| Nom | Valeur ou formule | Unité |
| --- | --- | --- |
| HSP | 2,50 | m |
| Ep_dalle | 0,20 | m |
| L_mur | Valeur à relever dans le dossier | m |

Ne supprime pas une variable encore utilisée dans une ligne. Les noms sont sensibles à la casse : **HSP** et **hsp** ne sont pas le même nom. Utilise des lettres, chiffres et traits de soulignement, sans espace. Une variable doit avoir un nom unique et une unité adaptée.

> 💡 ASTUCE PRO — Une abréviation du dictionnaire ne devient pas automatiquement une variable. La suggestion « HSP — Hauteur sous plafond » donne une définition ; elle n’invente pas la hauteur de ton projet.

### B3 Créer une ligne depuis la fiche de calcul

1. Ouvre **Calculs & avant-métré**.
2. Recherche un ouvrage : décapage, fouille, semelle, mur, dalle ou revêtement.
3. Choisis **Ouvrage courant**.
4. Vérifie **Unité du résultat**. Certaines fiches proposent plusieurs variantes, notamment m² et m³.
5. Choisis **Base des cotes** et l’unité de saisie **m**, **cm** ou **mm**.
6. Remplace toutes les dimensions d’exemple par les cotes du dossier.
7. Renseigne le nombre de parties semblables.
8. Ajoute les ouvertures ou la déduction éventuelle.
9. Lis les résultats intermédiaires : brut par partie, déduction, net et total.
10. Complète N°, Index, Désignation, Report, Lot et Localisation.
11. Saisis le PV HT seulement si tu souhaites chiffrer la ligne.
12. Clique sur **Ajouter à l’avant-métré**.

La base H.O., D.O., axes ou nus décrit la convention retenue. La sélectionner ne transforme pas automatiquement des cotes extérieures en cotes intérieures et ne corrige pas les intersections.

### B4 Écrire une formule et utiliser les suggestions

Dans **Feuille de minute**, clique sur une cellule éditable. Son repère apparaît dans la barre de formule.

![Feuille de minute — vue du guide](/manual/capture-minute.jpeg)

1. Clique la cellule dont tu veux modifier la donnée.
2. Place le curseur dans **Barre de formule**.
3. Saisis une valeur, un nom de variable ou une expression commençant par **=**.
4. Choisis une suggestion avec la souris, ou utilise les flèches puis Entrée.
5. Valide avec **Appliquer la formule** ou Entrée lorsque tu ne sélectionnes pas une suggestion.
6. Vérifie le total de la ligne et le rappel affiché sous la barre.

**Expressions utiles :**

- **HSP** dans une cellule de hauteur.
- **= 2 * HSP** pour une longueur égale à deux hauteurs.
- **= L_mur * HSP** dans une quantité reprise en m².
- **= L_mur * HSP * Ep_dalle** dans une quantité reprise en m³, si cette formule correspond bien à l’ouvrage étudié.

Une cellule de longueur attend une longueur. Elle refuse une surface. Pour une formule qui donne directement une quantité finale en m² ou m³, utilise une ligne de **Reprise d’une quantité / sous-total de l’avant-métré** avec l’unité correspondante.

Les opérations élémentaires et les parenthèses sont acceptées. Pour multiplier, saisis le signe astérisque (*). La constante **PI** est disponible pour une expression géométrique adaptée. Une variable de projet déjà nommée PI reste prioritaire.

> ⚠️ ATTENTION — Le menu peut aussi proposer une définition ou une formule du cours à consulter. Toutes les expressions de référence du cours ne sont pas directement exécutables dans chaque cellule. Le logiciel contrôle l’expression et son unité ; il n’exécute pas du code JavaScript libre saisi par l’utilisateur.

### B5 Utiliser l’assistant fx

1. Dans la minute, clique sur **fx Formules**.
2. Choisis un schéma : surface de trapèze, fouille avec talus, développé de toiture, fouille droite ou surface nette et ouvertures.
3. Lis les noms et les unités des champs.
4. Saisis les cotes en mètres, ou des variables compatibles déjà définies.
5. Vérifie la formule et le résultat affichés.
6. Choisis le lot de la ligne.
7. Clique sur **Créer une ligne calculée**.
8. Relis la nouvelle ligne dans la minute et complète sa fiche si nécessaire.

Le bouton **Remplacer la quantité active** apparaît seulement lorsqu’une ligne de reprise de même unité peut recevoir le résultat et qu’elle n’est pas liée au plan.

Pour le développé de toiture de cette modale, saisis la longueur réelle du rampant lue en coupe. La projection horizontale n’est pas le rampant. Une autre fiche, dans le calculateur, permet un développé à pente constante avec une pente exprimée en degrés.

Le schéma **Surface nette et ouvertures** de la modale réalise une soustraction géométrique. Il n’applique pas un seuil contractuel FR/LU. Pour ces profils, utilise la fiche mur avec sa zone d’ouvertures.

### B6 Bien saisir les déductions

**Méthode 1 — Une déduction dans la ligne d’ouvrage**

Saisis une valeur **positive** dans **Déduction par élément**, dans l’unité du résultat. Le moteur la soustrait. Si N vaut plusieurs parties semblables, cette même déduction est répétée pour chaque partie.

**Méthode 2 — Une ligne de déduction séparée**

1. Dans le calculateur, recherche **Déduction**.
2. Choisis une fiche de déduction adaptée, par exemple **Déduction des fenêtres, portes-fenêtres, baies et passages voitures**.
3. Saisis les dimensions et le nombre avec des valeurs positives.
4. Choisis la même unité et le même lot que l’ouvrage concerné.
5. Renseigne un report explicite, par exemple **À déduire du mur M1**.
6. Ajoute la ligne. Sa quantité est portée en négatif et signalée en rouge.

| À faire | À éviter |
| --- | --- |
| Saisir 2 m² dans Déduction pour retrancher 2 m² | Saisir −2 dans le champ Déduction. |
| Utiliser une fiche de déduction pour une ligne négative | Saisir un N négatif : ce champ attend un nombre positif de parties. |
| Traiter une baie une seule fois pour une prestation donnée | La déduire à la fois dans Ouvertures par mur et dans une ligne séparée. |

Une ligne de déduction séparée soustrait la quantité calculée sans décider d’un seuil de vide pour plein. Si ton marché conserve une baie en plein, ne crée pas une déduction supplémentaire pour cette baie.

### B7 Contrôler la minute et les reports

- Filtre par lot, bâtiment, niveau ou texte pour relire une zone.
- Vérifie N et les cotes de chaque ligne.
- Utilise **Fiche complète** pour corriger la désignation, le report, la localisation ou les ouvertures.
- Contrôle les sous-totaux par lot et par unité.
- Vérifie les quantités négatives et les déductions.
- Contrôle les prix manquants avant de considérer un total HT comme complet.

Pendant la saisie d’une expression incomplète, le dernier calcul valide peut rester affiché. Termine la formule et contrôle le résultat. Si une cellule de minute reste invalide lorsque tu la quittes, la valeur précédente est rétablie.

Les cumuls globaux en m² sont des cumuls de contrôle. Additionner une surface de maçonnerie et une surface de peinture ne donne pas la surface physique unique du bâtiment.

La commande **Reprendre un résultat du tableau** dans le calculateur copie une valeur à cet instant. Elle ne crée pas une liaison dynamique à cette autre ligne. Utilise des variables pour les dimensions communes et les liaisons au plan pour les relevés qui doivent rester synchronisés.

## 7 Parcours C Importer une extraction AutoCAD ou Revit

### C1 Préparer le fichier de départ

Pour AutoCAD, exporte une extraction de données **CSV**, notamment depuis **EXTRACDONNEES**. Prévois des champs identifiant le calque, le type ou bloc, la désignation et les mesures utiles.

Pour Revit, prépare une nomenclature exportée en **CSV** ou en **XLSX**. Prévois, selon le besoin : famille, type, niveau, bâtiment, pièce, longueur, surface, volume et nombre.

| Famille | Type | Niveau | Désignation | Longueur [m] | Surface [m2] | Volume [m3] | Nombre |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Murs | Mur béton 20 | RDC | Mur extérieur nord | Valeur exportée | Valeur exportée | Valeur exportée | Nombre exporté |

Utilise une ligne d’en-têtes claire, sans cellules fusionnées. Fais apparaître les unités dans les en-têtes lorsque c’est possible. Les fichiers CSV peuvent utiliser le point-virgule, la virgule ou la tabulation comme séparateur ; les cellules contenant un séparateur doivent être correctement encadrées de guillemets.

> ⚠️ ATTENTION — Vérifie si la nomenclature contient des valeurs unitaires ou déjà totalisées. L’import additionne les valeurs de la mesure choisie ; il ne multiplie pas automatiquement une longueur par une colonne Nombre. Prépare une colonne de quantité totale si c’est la donnée recherchée.

Dans un XLSX, les cellules contenant des formules Excel sont exclues de la lecture des quantités. Exporte des **valeurs** depuis le logiciel source. Cela évite d’utiliser un résultat en cache périmé.

### C2 Ouvrir la passerelle

1. Ouvre **Import CAO / BIM**.
2. Dépose un fichier dans la zone prévue ou clique pour le choisir.
3. Attends la fin de la lecture.
4. Utilise **Annuler l’import** si tu veux interrompre la lecture.
5. Vérifie le nom du fichier et les messages éventuels.

| 1 Fichier source | 2 Correspondances | 3 Injection dans la minute |
| --- | --- | --- |
| Lire le fichier et ses colonnes | Choisir les groupes, les lots, les ouvrages et les mesures | Valider les lignes et leur trame CCTP |

Les formats de cette passerelle sont **DXF, CSV, XLSX et IFC**. La limite est de 35 Mo et 20 000 objets ou lignes sources. Pour un modèle plus lourd, exporte une sélection ou une nomenclature ciblée.

### C3 Reconnaître les colonnes CSV ou XLSX

1. Dans **Reconnaître les colonnes**, sélectionne la bonne feuille si le classeur en contient plusieurs.
2. Vérifie les colonnes proposées pour Calque, Famille / catégorie, Type / bloc, Niveau et Désignation.
3. Choisis **Non présent** lorsqu’un champ n’existe pas dans le fichier.
4. Associe Longueur, Surface, Volume et Comptage aux colonnes correspondantes.
5. Vérifie les unités détectées dans les en-têtes.
6. Précise les unités manquantes dans les listes prévues : une longueur en mm n’est pas une longueur en m.
7. Lis les premières lignes de l’aperçu.
8. Clique sur **Vérifier et regrouper**.

> 💡 ASTUCE PRO — Si une surface paraît un million de fois trop grande, contrôle d’abord la conversion mm² vers m². Si un volume paraît un milliard de fois trop grand, contrôle mm³ vers m³. Ne corrige pas une erreur d’unité en modifiant arbitrairement la quantité.

### C4 Affecter les groupes aux lots et aux ouvrages

Le logiciel regroupe les données selon les champs disponibles : calque, famille, type, niveau, bâtiment et pièce. Des descriptions différentes ayant les mêmes critères peuvent donc être réunies. Prépare ton export avec les distinctions nécessaires.

| Inclure | Source et niveau | Lot | Ouvrage et désignation | Mesure retenue | Quantité |
| --- | --- | --- | --- | --- | --- |
| Coché ou décoché | Calque ou famille, type, niveau | Lot du projet | Code de bibliothèque ou désignation libre | Une seule mesure du groupe | Résultat converti et unité |

Pour chaque groupe :

1. Vérifie si les objets correspondent à une même prestation.
2. Décoche le groupe s’il ne doit pas rejoindre le métré.
3. Choisis le lot du projet.
4. Choisis un ouvrage de bibliothèque si une correspondance technique existe.
5. Relis et adapte la désignation.
6. Choisis **une seule mesure** : longueur, surface, volume ou comptage.
7. Vérifie la compatibilité entre l’unité de l’ouvrage et celle de la mesure.
8. Contrôle la quantité du groupe et les messages d’erreur.

Un groupe sans unité connue ou dont la mesure manque pour certains objets doit être corrigé ou exclu. Une mesure en m² ne peut pas alimenter directement un ouvrage en m³ sans dimension complémentaire.

Le comptage **Instances (lignes du fichier)** compte des lignes sources. Il ne représente un nombre d’objets physiques que si chaque ligne source représente réellement une occurrence.

### C5 Utiliser l’affectation groupée

1. Filtre les groupes si nécessaire.
2. Coche les groupes à traiter.
3. Dans **Affectation groupée**, choisis le lot.
4. Choisis éventuellement l’ouvrage et une mesure commune.
5. Clique sur **Appliquer aux groupes cochés**.
6. Relis les groupes après application.

La commande agit sur les groupes cochés du filtre courant. **Le filtre n’exclut pas les groupes cochés qui sont masqués.** Vérifie donc le nombre total de groupes cochés avant l’injection. Utilise la pagination pour contrôler les groupes au-delà de la première page.

### C6 Valider l’injection

1. Vérifie que les groupes cochés ne comportent plus de mesure à préciser ni d’unité incompatible.
2. Clique sur **Valider et injecter dans l’Avant-Métré**.
3. Ouvre la **Feuille de minute** depuis le message de réussite.
4. Contrôle les lignes créées, leurs unités, leur lot et leur niveau.
5. Ouvre l’**Éditeur CCTP** et vérifie les articles associés.

Les quantités importées sont placées dans des lignes de reprise. La minute et la trame CCTP sont ajoutées ensemble. La limite du projet est de **2 000 lignes** et celle du CCTP de **500 articles**.

Une correspondance exacte avec la bibliothèque permet de préparer les spécifications de l’article. Sans correspondance, une désignation et une localisation peuvent être reprises, mais les clauses techniques restent à compléter.

Si le logiciel signale un groupe déjà importé, examine la minute avant de recommencer. L’import ne remplace pas automatiquement l’ancienne version d’une extraction.

### C7 Particularités du DXF dans la passerelle

1. Importe le DXF dans **Import CAO / BIM**.
2. Vérifie **Unité du dessin**.
3. Si nécessaire, choisis l’unité correcte puis clique sur **Recalculer le DXF**.
4. Affecte les calques aux lots et aux ouvrages comme pour un CSV.
5. Choisis longueur, surface fermée ou comptage de blocs selon le groupe.

Les entités de base prises en charge sont les lignes, les polylignes 2D, les cercles et les blocs INSERT. Les entités exclues sont signalées. Chaque contour fermé est une surface distincte ; les trous et les superpositions ne sont pas déduits automatiquement. La géométrie contenue à l’intérieur d’un bloc n’est pas développée en métré.

### C8 Particularités de l’IFC

Pour un IFC léger, le logiciel lit les quantités **QTO** présentes dans le fichier. Il propose les classes ou familles exportées, les types et les niveaux lorsqu’ils sont renseignés.

1. Vérifie que l’export source contient les quantités de base nécessaires.
2. Importe l’IFC.
3. Choisis le jeu de quantités et la mesure adaptée, par exemple NetSideArea ou NetVolume.
4. Ne mélange pas les valeurs brutes et nettes.
5. Contrôle les unités et les données manquantes.
6. Affecte les lots et les ouvrages puis valide l’injection.

> ⚠️ ATTENTION BIM — L’atelier ne reconstitue pas une quantité manquante à partir de la géométrie de l’IFC. Il n’applique pas une deuxième déduction des baies aux quantités BIM importées. Une donnée NetVolume déjà nette ne doit pas être retraitée comme un volume brut.

### C9 Comprendre ce qui reste lié

| Origine de la donnée | Mise à jour automatique dans le projet |
| --- | --- |
| Dimension écrite avec une variable du projet | Oui, après enregistrement de la variable et recalcul. |
| Relevé de plan utilisé avec une liaison conservée | Oui, lorsque le relevé ou sa cote retenue est modifié. |
| Résultat repris depuis une autre ligne par la liste du calculateur | Non, c’est une copie de la valeur au moment de la reprise. |
| Extraction CSV, XLSX, DXF ou IFC injectée | Non, les quantités sont celles du fichier lu ; le fichier externe n’est pas surveillé. |
| Désignation importée de la minute dans le CCTP | Projection au moment de l’import ; les articles rédigés ne constituent pas une copie continuellement réécrite de la minute. |

# Partie 3 Rédiger et exporter le CCTP France ou Luxembourg

## 8 Choisir le pays et la convention de métré

### 8.1 Basculer le projet

1. Télécharge une sauvegarde et conserve une révision si le dossier est déjà avancé.
2. Clique sur **Mode France** ou **Mode Luxembourg** dans le bandeau du chantier.
3. Attends le message de fin de traitement.
4. Relis le profil d’ouvertures des lignes concernées et leurs résultats.
5. Ouvre le CCTP pour contrôler les titres, références et textes adaptés.
6. Vérifie séparément la TVA, les prix et les paramètres du projet.

Le changement de pays concerne le projet courant. Les brouillons CCTP de chaque pays sont conservés. Les textes personnalisés et les articles sans correspondance ne doivent pas être supposés intégralement traduits ou réécrits.

### 8.2 Lire correctement le mode France

Le mode France actuel déduit toutes les ouvertures saisies dans la fiche mur et indique une **quantité géométrique nette pédagogique**. Ce comportement permet d’expliquer les calculs de formation. Il ne certifie pas une règle contractuelle nationale de « vides pour pleins ».

> ⚠️ ATTENTION NORME — Ne rédige pas « baies supérieures à 0,50 m² selon NF DTU 20.1 » sur la seule base d’un exemple ou d’un ancien texte de cours. Lis la clause applicable au marché et son édition avant d’attribuer un seuil à une norme.

### 8.3 Lire correctement le mode Luxembourg

Le choix du pays doit être complété par le choix du corps d’état dans la fiche d’ouvrage.

| Profil intégré | Comportement programmé pour une baie rectangulaire isolée |
| --- | --- |
| Géométrie nette | Toutes les ouvertures saisies sont déduites. |
| Maçonnerie CTG 012 en m² | Déduction de la baie entière au-delà de 2,50 m² par baie ; l’égalité est conservée en plein. |
| Béton CTG 013 en m² | Même seuil surfacique dans le profil intégré, sous réserve de son domaine. |
| Maçonnerie ou béton en m³ | Le profil compare le volume unitaire de la baie à 0,50 m³ ; l’égalité est conservée en plein. |
| Enduit intérieur, ouvrage sec vertical, peinture de paroi | Profils surfaciques intégrés rattachés respectivement aux CTG 023, 039 et 034 ; contrôler leur domaine avant utilisation. |

Ce tableau décrit le logiciel. Il ne remplace pas les clauses complètes. Le seuil s’apprécie sur **une baie**, avant multiplication par le nombre de baies identiques. Il ne s’applique pas à toute ouverture de tous les lots.

La CTG 012 publiée par le CRTI-B comporte bien une règle surfacique de conservation en plein des ouvertures unitaires jusqu’à 2,50 m² inclus, avec des conditions et d’autres cas de décompte à lire séparément [S3]. Les ouvertures en angle, niches et trumeaux ne se traitent pas par la seule comparaison d’une surface à ce seuil.

L’adaptation documentaire FR/LU de la bibliothèque porte principalement sur les lots 01 et 02. Les autres lots issus des cours nécessitent une adaptation au dossier et au référentiel concerné.

## 9 Constituer la trame CCTP

### 9.1 Repérer l’éditeur

Ouvre **Éditeur CCTP FR / LU** ou utilise **Alt + C**.

![Éditeur CCTP — vue du guide](/manual/capture-cctp.jpeg)

La bibliothèque contient actuellement cinq ensembles : Terrassement / VRD, Gros Œuvre, Façades et finitions extérieures, Fumisterie, Ventilation. Elle ne constitue pas un catalogue exhaustif de tous les ouvrages TCE. Un article libre permet de traiter une prestation absente.

### 9.2 Importer les désignations de la minute

1. Vérifie les lots, désignations et localisations dans l’avant-métré.
2. Vérifie les codes de bibliothèque lorsque tu souhaites une correspondance précise.
3. Ouvre l’éditeur CCTP.
4. Clique sur **Importer la minute**.
5. Contrôle le nombre d’articles créés et les articles à compléter ou relire.
6. Ouvre chaque article et vérifie son contenu.

L’import reprend les désignations et les localisations. Il **n’ajoute pas les quantités ni les prix** dans les prescriptions. Il peut réunir plusieurs lignes sous un article commun selon leur correspondance.

Une désignation ressemblante ne suffit pas à prouver une équivalence technique. Sans code exact et non ambigu, l’article reste à compléter. Réimporter la minute ne signifie pas effacer les textes déjà travaillés.

> 💡 ASTUCE PRO — Une épaisseur, une classe de matériau ou une performance exigée fait partie des spécifications. La quantité totale d’un chantier et son prix restent dans le métré et le bordereau. Distingue ces deux usages des nombres.

### 9.3 Ajouter une clause de bibliothèque

1. Dans **Bibliothèque des cours**, choisis le lot.
2. Choisis le sous-lot ou parcours l’arborescence.
3. Recherche un code ou une désignation.
4. Lis la fiche, ses sources et les indications de complément nécessaires.
5. Clique sur **Insérer** pour créer un article.
6. Si un article existant doit recevoir cette clause, sélectionne-le puis utilise **Appliquer à l’article**.
7. Vérifie ensuite chaque champ technique.

La commande Appliquer à l’article remplace des contenus de la fiche sélectionnée. Vérifie les textes après utilisation, même si la désignation et les localisations sont conservées.

Les mentions **Description technique à compléter** ou **Exemple du cours** signalent un travail d’adaptation. Ne transforme pas une hypothèse de cours en prescription de chantier sans justification.

### 9.4 Créer un article libre

1. Clique sur **Article libre**.
2. Donne un titre précis.
3. Renseigne le numéro du lot, son nom et le sous-lot.
4. Complète les références réellement applicables.
5. Rédige description, prescriptions, localisation et mode de métré.
6. Contrôle l’unité indicative.
7. Relis l’article avant de le marquer comme relu.

Un article libre n’a pas de conformité normative automatique. Il doit être justifié par la notice, les plans, l’étude et les pièces du marché.

## 10 Rédiger un article exploitable

### 10.1 Compléter les champs

| Champ | Ce que tu dois y écrire |
| --- | --- |
| Titre de l’article | Nature de l’ouvrage, matériau et particularité nécessaire. |
| Lot et sous-lot | Classement cohérent avec la trame du dossier. |
| Références proposées | Normes et documents applicables, avec édition lorsque celle-ci est arrêtée au dossier. |
| Description des ouvrages | Composition, dimensions techniques utiles, caractéristiques et performances. |
| Prescriptions de mise en œuvre | Préparation, pose, interfaces, contrôles et sujétions du projet. |
| Localisation | Bâtiment, niveau, pièce, façade ou repères des plans. |
| Mode de métré | Unité, base de mesure, déductions, retours et limites de prestation. |

Dans les zones de texte riche, utilise le gras, l’italique et les listes pour faciliter la lecture. Conserve une phrase complète lorsque tu prescris une prestation. Un nom de matériau seul ne décrit pas sa mise en œuvre.

### 10.2 Vérifier le mode de métré

Pour chaque article, précise les éléments utiles au contrôle :

- unité de règlement : m, m², m³, u ou autre unité justifiée ;
- base de mesure : axes, nus, faces réellement traitées ou autre convention définie ;
- règle de déduction des ouvertures, avec référence et conditions si nécessaire ;
- traitement des tableaux, retours, linteaux, niches et petites surfaces lorsqu’ils existent ;
- inclusions et exclusions permettant d’éviter un double compte entre lots.

Le bouton **Reprendre le mode de métré de la fiche** remplace ce champ par celui de la fiche source. **Compléter les modes vides** ne remplit que les modes manquants pour lesquels une source est disponible. Relis le résultat.

### 10.3 Contrôler le sommaire et la numérotation

Le sommaire se construit à partir des lots, sous-lots et articles. Les numéros d’article sont générés par l’éditeur. Ne les saisis pas une seconde fois dans tous les titres.

1. Vérifie les noms et numéros des lots.
2. Vérifie le sous-lot de chaque article.
3. Clique sur les articles depuis le sommaire pour les relire.
4. Ouvre **Aperçu complet**.
5. Contrôle l’ordre, les doublons et les articles manquants.
6. Utilise **Revenir à l’édition** pour corriger les textes.
7. Coche **Article relu** après le contrôle de chaque article.

La case Article relu est une indication de travail. Elle ne constitue pas une validation technique ou juridique par un organisme extérieur.

## 11 Vérifier les normes et les alertes

### 11.1 Comprendre la vigilance affichée

L’alerte **Vigilance Métreur** rappelle les références, les limites de domaine ou les corrections identifiées dans le référentiel. Elle doit attirer ton attention sur un point à contrôler.

La version actuelle s’appuie sur un **audit daté du 13 novembre 2026**. Elle ne dispose pas d’une veille automatique permanente qui certifierait chaque document à chaque ouverture du site.

> ⚠️ ATTENTION NORME — Un statut « en vigueur » indique l’état d’une référence contrôlée. Il ne prouve pas que le texte s’applique à ton ouvrage, à ton procédé ou à la date de ton marché. Une mise à jour de référence ne crée pas automatiquement un nouveau seuil de déduction.

### 11.2 Utiliser Normes et DTU

1. Ouvre **Normes & DTU**.
2. Recherche la référence ou le métier concerné.
3. Filtre par famille de lots si nécessaire.
4. Sélectionne la fiche.
5. Lis le statut, l’ancienne référence, l’impact annoncé et les conditions d’application.
6. Lis les parties du NF DTU lorsqu’elles sont détaillées.
7. Ouvre les liens de source pour vérifier l’édition retenue au dossier.
8. Reviens dans le CCTP et corrige les références ou les prescriptions qui le nécessitent.

Le registre contient actuellement **162 références**. Certaines fiches proposent une trame à adapter ; d’autres demandent un contrôle avant insertion. Le registre général France et la bibliothèque d’ouvrages ne doivent pas être confondus : consulter une norme n’insère pas automatiquement sa prescription dans tous les articles.

### 11.3 Lire les parties d’un NF DTU

| Partie courante | Rôle à vérifier dans la notice |
| --- | --- |
| P1-1 ou CCT | Prescriptions techniques de mise en œuvre. |
| P1-2 ou CGM | Critères de choix des matériaux. |
| P2 ou CCS | Clauses spéciales ou administratives spéciales selon le document. |
| Autre partie | Dispositions complémentaires lorsqu’elles existent. |

Cette structure est fréquente, mais tous les documents n’ont pas exactement les mêmes parties. Le NF DTU 20.1 comporte notamment les parties P1-1, P1-2, P2 et P3 dans son édition de juillet 2020 [S1, S2].

Une notice publique renseigne le titre, la date, le statut et le domaine. Elle ne donne pas nécessairement accès à toutes les clauses internes du texte intégral. Vérifie le paragraphe qui justifie la convention de métré lorsque le dossier en dépend.

Si le bouton **Ajouter la trame normative aux prescriptions** est proposé dans une fiche d’article, lis la trame puis adapte-la. Ne l’ajoute pas mécaniquement à chaque ouvrage.

### 11.4 Vérifier les documents luxembourgeois

1. Identifie la CTG concernée et la version applicable au dossier.
2. Consulte la liste actuelle du CRTI-B et les pièces de la soumission.
3. Contrôle la date et le contenu du PDF, pas seulement le nom d’une ancienne page web.
4. Recherche la règle de décompte correspondant à la prestation et à l’unité.
5. Complète les conditions particulières dans le descriptif.

Le CRTI-B publie des versions actualisées de ses CTG ; sa liste consultée le 13 novembre 2026 présente notamment une mise à jour de la CTG 012 datée du 2 octobre 2026 [S3]. Ne considère donc pas la seule mention « OAI / CRTI-B » comme une preuve de mise à jour ou d’applicabilité.

En mode Luxembourg, l’écran **Normes & DTU** rappelle que son registre général concerne la France. Il ne remplace pas les références luxembourgeoises du dossier.

## 12 Exporter le dossier final

### 12.1 Choisir le bon livrable

| Besoin | Commande dans le site | Format réel |
| --- | --- | --- |
| Modifier le descriptif technique dans Word | Éditeur CCTP → Word .docx | .docx |
| Diffuser un descriptif figé | Éditeur CCTP → PDF | .pdf |
| Bordereau de prix destiné au client | Étude de prix → DPGF client / Bordereau client | .xlsx, sans coûts internes |
| Conserver les sous-détails et coefficients de vente | Étude de prix → Étude interne | .xlsx, usage interne |
| Préparer les achats par fournisseur | Approvisionnement & audit → CSV, XLSX ou PDF | .csv / .xlsx / .pdf |
| Travailler sur les calculs et les bordereaux | Exports & trames → DPGF / BPU avec formules | .xlsx, classeur global avec données internes |
| Justifier les quantités | Exports & trames → Minute justificative | .pdf |
| Échanger le tableau de l’avant-métré | Calculs & avant-métré → CSV | .csv |
| Reprendre le projet dans l’atelier | Sauvegarder | .json |

### 12.2 Exporter le CCTP Word

1. Vérifie le pays du projet et le titre du document.
2. Relis les articles signalés comme incomplets ou non relus.
3. Ouvre **Aperçu complet** pour contrôler la structure.
4. Coche **Sources dans l’export** si tu souhaites joindre la provenance des fiches.
5. Clique sur **Word .docx**.
6. Attends la préparation puis ouvre le fichier téléchargé dans Word ou un logiciel compatible.
7. Vérifie les titres, le sommaire, les articles, les sauts de page et les caractères.
8. Enregistre le document avec un nom comportant le chantier, le pays, l’indice et la date.

> ⚠️ ATTENTION FORMAT — Renommer « fichier.docx » en « fichier.doc » ne convertit pas le document. Si un destinataire exige réellement l’ancien format .doc, ouvre le .docx dans Word et utilise Enregistrer sous avec le format demandé. Relis ensuite la mise en page.

En France, le document porte le titre de CCTP. Au Luxembourg, il prend la forme d’un **Cahier des charges — Descriptif des positions**. Il ne constitue pas, à lui seul, un dossier complet de soumission avec toutes ses pièces administratives et financières.

### 12.3 Exporter le CCTP PDF

1. Garde le même pays, le même indice et les mêmes options de sources que pour le Word.
2. Clique sur **PDF** dans l’éditeur CCTP.
3. Ouvre le fichier et contrôle chaque page.
4. Vérifie les coupures de paragraphes, l’ordre des lots et l’absence de champs laissés vides.
5. Conserve ensemble le Word modifiable et le PDF relu.

Le Word et le PDF sont deux exports du contenu de l’atelier. Si tu modifies ensuite le Word sur ton ordinateur, le PDF déjà exporté et le texte du site ne se mettent pas à jour automatiquement.

### 12.4 Exporter le métré et les bordereaux Excel

1. Ouvre **Exports & trames**.
2. Clique sur **DPGF / BPU avec formules (.xlsx)**.
3. Ouvre le classeur dans un tableur compatible avec le format .xlsx.
4. Vérifie les feuilles de projet, variables, détails de calcul, minute, étude de prix, DPGF, BPU et besoins.
5. Contrôle les totaux par lot et les lignes sans prix.
6. Si tu modifies le fichier, travaille sur les données et feuilles de détail prévues, puis vérifie les formules et leurs résultats.
7. Enregistre une copie indicée avant transmission.

Le classeur est un livrable de quantités et de prix. Il ne remplace pas les paragraphes techniques du CCTP. Les modifications réalisées dans Excel ne remontent pas automatiquement dans le projet du site.

### 12.5 Exporter la minute justificative

1. Depuis **Exports & trames**, clique sur **Minute justificative (.pdf)**.
2. Vérifie les dimensions, formules, résultats intermédiaires et quantités.
3. Vérifie les repères de relevé et les localisations.
4. Contrôle la lisibilité des pages. La minute PDF prévue par cet export est en A4 paysage.
5. Conserve ce justificatif avec le descriptif et le bordereau du même indice.

### 12.6 Ne pas confondre import de trame et import CAO BIM

Dans **Exports & trames**, **Importer une trame DPGF / BPU** sert à charger un bordereau avec ses codes, désignations, unités, prix et lots. L’option **Ajouter également les quantités comme lignes de minute** permet de reprendre les quantités prévues par cette trame.

Dans **Import CAO / BIM**, le travail porte d’abord sur les mesures d’objets, de calques ou de familles et leurs correspondances. Choisis le circuit adapté à ton fichier source.

## 13 Contrôle final avant diffusion

- Le nom du chantier, le pays, la date et l’indice sont cohérents sur tous les fichiers.
- Les cotes d’exemple ont été remplacées par les cotes du dossier.
- Les bases H.O., D.O., axes ou nus sont identifiées.
- Les dimensions et les résultats ont les bonnes unités.
- Les ouvertures ont été traitées une seule fois pour chaque prestation.
- Les profils de déduction et leurs conditions sont explicités.
- Les quantités importées sont contrôlées et n’ont pas reçu une deuxième déduction injustifiée.
- Les articles CCTP décrivent les ouvrages réellement mesurés.
- Les références normatives sont vérifiées pour le domaine et la date du marché.
- Les articles libres et les exemples du cours ont été adaptés.
- Les prix manquants sont identifiés avant d’annoncer un montant complet.
- Les exports ont été ouverts et relus, et la sauvegarde du projet est conservée avec les plans sources.

## 14 Résoudre les difficultés courantes

| Situation | Vérification à faire |
| --- | --- |
| La longueur ou la surface relevée est incohérente | Vérifie la page, l’étalonnage, les extrémités choisies et une seconde cote connue. |
| Une cote ne peut pas être modifiée dans la minute | Vérifie le badge Lié au plan. Corrige le relevé source ou détache volontairement la ligne. |
| Une cellule devient invalide | Contrôle la variable, l’unité, le signe et la formule. Une déduction ne doit pas dépasser le brut. |
| Une déduction séparée doit apparaître en négatif | Choisis une fiche de déduction ; conserve des cotes et un N positifs. |
| L’injection CAO/BIM reste désactivée | Contrôle tous les groupes cochés, y compris ceux masqués par un filtre. |
| L’import affiche un doublon | Examine les lignes déjà créées ; l’import ne met pas à jour automatiquement une extraction précédente. |
| Un article CCTP n’a pas de texte technique | Vérifie la correspondance de code ou rédige un article libre à partir des pièces du dossier. |
| Le mode Luxembourg ne change pas une quantité importée | C’est normal pour une reprise BIM : aucune seconde déduction n’est ajoutée. |
| Une norme semble ancienne malgré l’alerte | Consulte la source, l’édition et la date d’audit. Le registre n’est pas une veille permanente. |
| Les commandes de modification sont indisponibles | Vérifie le rôle du projet. Le conducteur dispose d’un accès de consultation. |
| Le plan manque après ouverture d’un JSON sur un autre appareil | Le JSON ne contient pas son fichier binaire. Conserve les sources et vérifie le projet synchronisé. |
| Un destinataire demande un CCTP .doc | Exporte le .docx puis réalise une vraie conversion dans Word, si nécessaire. |

## 15 Sources et périmètre documentaire

Les trois premiers chapitres et le cas du garage proviennent des documents fournis pour la version 11. Le guide en ligne est actualisé avec les modules Approvisionnement & audit et Étude de prix des versions 13 et 14. Les captures des PDF d’origine restent des repères historiques ; les indications de boutons du guide en ligne priment pour ces ajouts. La version du site et ses fonctions ont été vérifiées le **13 novembre 2026**. Les exemples de manipulation ne constituent pas des prescriptions de chantier.

**S1 — AFNOR Éditions.** Notice NF DTU 20.1 P2, juillet 2020, statut affiché en vigueur ; ancienne édition d’octobre 2008 affichée annulée. Consultation le 13 novembre 2026.

https://www.boutique.afnor.org/fr-fr/norme/nf-dtu-201-p2/travaux-de-batiment-ouvrages-en-maconnerie-de-petits-elements-parois-et-mur/fa181581/323047

**S2 — CSTB Éditions.** NF DTU 20.1, présentation des parties P1-1, P1-2, P2 et P3 de l’édition de juillet 2020. Consultation le 13 novembre 2026.

https://boutique.cstb.fr/detail/documents-techniques-unifies/dtu-nf-dtu/20-maconneries/nf-dtu-20-1-ouvrages-en-maconnerie-de-petits-eleme

**S3 — CRTI-B.** Liste des CTG et PDF CTG 012 version 5.0 avec annexe, notamment le chapitre 1.5 et la règle surfacique du paragraphe 1.5.3.1. Consultation le 13 novembre 2026. La date de publication de la liste et la date d’édition portée sur le PDF peuvent être différentes.

https://www.crtib.lu/fr/clauses-techniques

https://www.crtib.lu/api/media/file/CTG_012-Mauerarbeiten_FR_v5.0%20%2B%20ANNEX-1.pdf

**Pour poursuivre :** ouvre le chapitre Exercice pratique, réalise le sujet, puis affiche le corrigé pour vérifier tes résultats.
