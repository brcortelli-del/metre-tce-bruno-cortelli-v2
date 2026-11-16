# Modules de métré professionnel — Métré TCE – Bruno Cortelli

Implémentation indépendante inspirée de workflows de métré professionnel. Ce projet n’intègre aucun code ATTIC+ et ne prétend pas reproduire son moteur 3D ou certifier son format BIMétré.

## Minute professionnelle
Ouvrir « Minute professionnelle », puis « Nouvel ouvrage ». Les nouvelles minutes calculent N × L − D en ml ; N × L × H ou l − D en m² ; N × L × l × H − D en m³ ; N − D en unités. N est un entier strictement positif. Les déductions sont globales, après répétition. Les ouvertures en m³ sont multipliées par l’épaisseur l et déduites une seule fois. Les unités et les bornes sont validées ; aucune quantité négative n’est créée implicitement. La formule et ses valeurs sont toujours conservées dans les étapes et affichées sous la quantité.

Les anciennes minutes gardent leurs conventions et quantités : (brut − déductions par élément) × N. Elles ne sont jamais converties automatiquement. Elles peuvent être modifiées par « Fiche classique ».

## Plan 2D
Le lecteur existant accepte PDF et images. Utiliser l’outil d’étalonnage pour tracer une cote connue puis saisir sa longueur réelle en mètres. Les outils longueur, surface et comptage enregistrent les géométries. Choisir lot, niveau, zone et couleur avant d’enregistrer. « Injecter la mesure dans la minute » crée une ligne liée au tracé, à sa page et à sa cote de référence. Une modification de géométrie recalcule les lignes liées ; une suppression est bloquée tant que le lien existe. La couleur et la ventilation peuvent être mises à jour depuis la minute professionnelle.

## Ventilation
« Vue par Lot TCE » et « Vue par Niveau / Zone » affichent les sous-totaux en séparant strictement les unités. Les valeurs sans prix ne sont pas transformées en zéro chiffré. Les pastilles sont personnalisables par ouvrage. L’affichage est paginé par 40 lignes ; sous-totaux et impression portent sur tout le filtre, les exports CSV / XLSX sur tout le projet.

## Passerelle devis et DPGF
CSV UTF-8 BOM, séparateur point-virgule, décimale française. Colonnes : Code, Désignation, Lot TCE, Niveau, Zone, Unité, Quantité, PV HT, Montant HT, Couleur, Minute de calcul, Convention déductions. Les cellules textuelles à risque de formule sont neutralisées. Le XLSX contient des valeurs numériques calculées figées, des minutes et des sous-totaux lot / niveau-zone. Vérifier le mapping avant import dans un logiciel de devis ; il ne s’agit pas d’un connecteur propriétaire ou du format BIMétré certifié.

La vue Impression DPGF inclut l’en-tête « Métré TCE – Bruno Cortelli », les codes couleurs, toutes les minutes du filtre, les quantités et les sous-totaux par groupe. Si des prix manquent, le total HT est explicitement incomplet. L’impression permet d’enregistrer en PDF via le navigateur.

## Conservation
Le design Atelier Studio et ses thèmes restent actifs. Les routes api/analyse-metre.js et api/status-ia.js, server/assistant.js, server/status-ia.js et leur configuration OpenAI ne sont pas modifiés. Le schéma de sauvegarde version 1 est conservé, avec des métadonnées supplémentaires par ligne et par tracé. Les anciennes versions de l’application ne connaissent pas le preset minute-pro : conserver cette version pour rouvrir les nouvelles minutes.

Contrôles navigateur : nouvelle minute 3 × 5 × 2 − 4 = 26 m², groupe R+1 / Salle A, montant 1 300,00 € ; étalonnage 5,00 m sur un plan image, relevé linéaire de 5 m, injection directe dans le groupe Extérieur / Cour ; téléchargements CSV et XLSX réels ; aperçu DPGF avec minutes et en-tête. La suite complète compte 193 tests réussis et 1 test ignoré.
