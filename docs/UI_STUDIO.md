# Interface Atelier Studio

Refonte de présentation uniquement. Les fichiers api/, server/, public/app.js, public/pro.js et les calculs métier ne sont pas modifiés.

- Surfaces ardoise vitrées, photographie architecturale atténuée, thèmes Atelier et Nuit.
- En-tête sticky et navigation par lots réutilisant le filtre existant de la minute.
- Totaux de lecture issus des résultats déjà calculés, séparés par unité et actualisés à chaque événement du projet.
- Import CAO/BIM dans une modale accessible, fermeture par Échap et restitution du focus.
- Copilote redimensionnable entre 360 et 680 px : glisser le bord gauche ou utiliser les flèches sur le séparateur ; Home / End pour les bornes. Repli et fermeture distincts. Largeur conservée dans les préférences d’interface.
- Chiffres alignés en police monospace et chiffres tabulaires, badges de lots pastel, focus visibles et animations respectant prefers-reduced-motion.
- Icônes Lucide harmonisées par les styles d’interface.

La préférence de thème et la largeur du Copilote ne changent aucune donnée du chantier.
Photographie et crédit : UI_IMAGE_CREDIT.md.

Contrôles navigateur réalisés sur les données temporaires de démonstration : thèmes clair/sombre ; filtre Fondations (2 lignes, 3,36 m³) ; modification temporaire d’une cellule (3,84 m³) puis restauration ; repli/dépli du Copilote ; redimensionnement clavier 424 → 448 px ; ouverture/fermeture Échap de l’import CAO/BIM ; tiroir des paramètres et retour à la minute ; mise en page 1440 px et 390 px. Les API et calculs restent identiques à la version 24.
