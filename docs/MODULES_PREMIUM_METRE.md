# Modules premium de métré — guide d’utilisation

## Comparaison synthétique
Le benchmark repose sur les fonctionnalités publiques de Quoter Plan : https://www.quoterplan.com/fr/fonctionnalites/ . Il s’agit d’une implémentation indépendante, sans promesse de parité avec ce logiciel.

| Domaine | Application précédente | Version enrichie |
|---|---|---|
| Extensions d’estimation | Ouvrages composés et besoins séparés | Décomposition paramétrable par ligne, formules personnelles réutilisables |
| Pente | Ouvrage spécialisé toiture | Conversion % / degrés dans les propriétés et les nouvelles minutes m² |
| Propriétés / modèles | Minutes détaillées | Géométrie, déductions, pente, provenance et modèles locaux |
| PDF / rapports | Lecteur multipage, groupes lot / zone | Pages nommées, provenance des injections, rapport par page et Excel Pro |

## 1. Extensions métier
Dans Minute professionnelle, ouvrir « Appliquer une Extension Métier » sur une ligne. Les tableaux classiques offrent aussi ce bouton. Choisir Cloison Placostil, Mur Peinture 2 couches ou Dalle Béton. Le modèle dalle existe pour une mesure source en m² ou en m³. Adapter les paramètres aux produits réellement prescrits et cliquer « Appliquer l’extension à l’ouvrage ».

Les composants suivent automatiquement les recalculs de la quantité de l’ouvrage. Ils sont stockés dans cette ligne et exportés dans une annexe de besoins séparée : ils ne sont pas ajoutés une seconde fois aux quantités facturables ou au prix de la DPGF. Leur chiffrage n’est pas automatiquement transféré dans les anciens ouvrages composés.

Exemples : 100 m² de peinture, 2 couches, rendement 10 m²/L par couche et 10 % de pertes donnent 22 L. 100 m² de dalle à 0,14 m donnent 14 m³ ; 10 % de recouvrement donnent 110 m² de treillis et polyane. Ces ratios sont des estimations modifiables, pas des prescriptions de fabricant ni un dimensionnement structurel.

Pour un modèle personnel : « Créer une extension », choisir l’unité source, nommer les paramètres et composants, puis saisir les formules numériques avec Q (quantité source). Opérations : +, -, *, /, parenthèses et puissances entières. Choisir soi-même l’unité cohérente de chaque résultat. Aucun code JavaScript n’est exécuté. « Enregistrer comme modèle local » conserve la bibliothèque dans ce navigateur ; une sauvegarde JSON du projet conserve les extensions déjà appliquées.

## 2. Pente et modèles de mesure
Ouvrir « Propriétés / Pente » sur une ligne en m². Activer la conversion, saisir la pente en % ou en degrés puis appliquer. Changer de format convertit la valeur : 100 % = 45°. Le coefficient vaut √(1+(p/100)²), soit 1,41421356 à 100 %.

Le coefficient s’applique au net en projection après déductions. Une seule pente uniforme par ligne ; créer plusieurs lignes pour plusieurs pans. Ne pas appliquer cette conversion à une élévation déjà mesurée à sa vraie grandeur. L’ancien ouvrage spécialisé toiture conserve son propre calcul et refuse un second coefficient.

La nouvelle minute professionnelle propose aussi cette saisie. Les propriétés affichent brut, déductions, net projeté, net retenu et source. Donner un nom puis enregistrer un modèle de mesure. Le bouton global « Modèles de mesure » permet de créer une nouvelle ligne avec les mêmes dimensions, unité, lot et pente. Les liens à l’ancien PDF sont retirés pour ne pas attribuer une provenance fictive.

Les bibliothèques personnelles sont propres au navigateur et à l’origine du site. Elles ne sont pas une bibliothèque partagée en ligne. Le mode démo utilise un stockage temporaire isolé.

## 3. PDF multipage et propriétés du relevé
Dans Relevé sur plan, importer le PDF. Choisir la page, saisir son nom (RDC, R+1, Toiture…) puis cliquer « Nommer la page ». Étalonner chaque page avec une cote connue avant les tracés ; vérifier une seconde cote. Les cotes saisies manuellement restent identifiées comme telles.

Sélectionner un relevé pour consulter ses propriétés : géométrie brute, quantité retenue, page et minutes liées. Injecter la mesure dans la minute : le document, le numéro et le nom de page suivent la ligne. Les déductions et la pente se règlent sur la minute liée. Les pages conservent leurs relevés lors des changements de page.

## 4. Rapports et Excel Pro
Choisir « Vue par Lot TCE », « Vue par Page de Plan » ou « Vue par Niveau / Zone ». Les sous-totaux distinguent toujours les unités. Une ligne combinant plusieurs pages apparaît dans un groupe « Multi-pages » plutôt que d’être comptée plusieurs fois ; les anciennes lignes sans lien graphique apparaissent dans « Sans page de plan ».

CSV et Excel Pro exportent le projet complet selon la vue choisie. Les filtres de recherche de l’écran ne réduisent pas l’export. Le contrôle qualité existant s’ouvre avant export et autorise une continuation explicite avec réserves.

Le classeur comprend Projet, Passerelle devis, Totaux par lot, Totaux niveaux-zones, Totaux par page, Minutes calcul, Rapport sélectionné, Besoins des extensions et Géométrie et pente. Les données premium sont des valeurs figées à la date d’export : réexporter après modification du projet. CSV/Excel restent génériques et doivent être mappés dans le logiciel de devis destinataire. L’aperçu DPGF suit la vue et ajoute les besoins hors cumul DPGF.

## Validation de livraison
Compilation Windows réussie. 228 tests : 227 réussis, 1 ignoré. Essais navigateur : extension peinture, pente 100 % / 45°, import du PDF Courbet de 8 pages, deux injections fictives de 100 et 50 m² depuis des pages nommées distinctes, export Excel réel puis relecture des feuilles et valeurs. Les trois routes OpenAI et les sources serveur sont conservées sans modification. Les essais ont été réalisés en démonstration, sans modifier les dossiers enregistrés.
