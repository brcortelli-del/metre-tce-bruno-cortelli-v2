# Bibliothèque Extensions BTP

Les dix extensions et leurs trente composants fournis sont conservés dans src/data/extensionsBTP.js, avec les mêmes noms, descriptions, unités et coefficients.

Depuis une ligne de métré, ouvrir « Appliquer une Extension Métier ». Le menu montre d’abord les modèles compatibles avec l’unité (m2 = m² ; ml = m). Cocher « Afficher toutes les extensions » pour consulter aussi les autres unités ; une incompatibilité bloque l’application et la génération. Les dix modèles s’ajoutent aux anciens préréglages, sans les remplacer.

L’aperçu utilise la quantité nette de la ligne, y compris sa pente éventuelle, multipliée par chaque coefficient. Les formules peuvent être adaptées. Les ratios fournis restent des hypothèses d’estimation à vérifier pour le projet.

« Générer les sous-ouvrages » insère les lignes filles juste après le parent dans les données du projet. Elles conservent son lot et sa localisation, possèdent chacune leur propre identifiant et n’ont pas de prix initial. Dans une vue groupée, elles suivent le même groupe que le parent. Leur minute contient [Ext. Nom de l’extension], le parent, la quantité source et la formule. La relation parent/enfant reste incluse dans la sauvegarde JSON. La génération s’annule avec l’action d’annulation du projet.

Les quantités filles sont un instantané, librement éditable avec la fiche classique, et participent aux totaux et exports. Elles ne changent pas automatiquement après une modification du parent. Pour régénérer une extension identique, supprimer d’abord toutes ses anciennes lignes filles. Ne pas chiffrer deux fois le parent en prestation complète et les composants correspondants. L’ancien bouton « Appliquer l’extension à l’ouvrage » conserve son rôle distinct : annexe de besoins dynamique sans ajout de lignes facturables.

« Créer une extension personnalisée » permet de définir nom, unité, paramètres et formules utilisant Q, puis « Enregistrer comme modèle local » sauvegarde dans localStorage via le stockage de préférences existant. Le mode démo est temporaire et isolé des bibliothèques réelles. Un modèle local n’est partagé ni entre navigateurs ni entre origines. Les extensions déjà appliquées et les lignes générées restent dans le projet sauvegardé.

Les unités L, kg, m, m², m³ et u sont conservées dans les lignes générées ; les comptages restent des besoins théoriques non arrondis (les conditionnements et arrondis d’achat doivent être déterminés séparément).

Validation : compilation Windows réussie ; 232 tests, 231 réussis et 1 ignoré. Tests couvrant les 30 composants et leur sauvegarde, 35 m² de dalle (5,5125 m³ de béton, 40,25 m² de treillis, 38,5 m² de polyane), 12,40 ml de cloison (66,96 m² de plaques), litres et kilogrammes. Essais navigateur : aperçu, génération, doublons, incompatibilité et modèle personnalisé. Routes OpenAI et sources serveur inchangées.
