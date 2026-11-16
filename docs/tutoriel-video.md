# Tutoriel vidéo et parcours guidé

Le module possède cinq chapitres et douze séquences. Chaque séquence charge son propre MP4 selon le contrat partagé `public/tutorial-media.js`, à partir de zéro. Si ce fichier manque, sa fiche illustrée reste disponible et un message explique que la vidéo doit être générée.

Le lecteur conserve les commandes HTML5, la vitesse, les sous-titres des capsules générées, le précédent/suivant, la recherche, la progression personnelle et les liens pour pratiquer. Une vidéo personnelle complète reste lisible localement, avec des repères modifiables. Aucun fichier local n’est envoyé au serveur.

Les indications suivent le site réel : TVA conservée, règles de métré par profil, Word DOCX réel, audit indicatif et cas du garage corrigé. Le résultat du garage reste masqué avant sa révélation dans les fiches.

Le mode `?demo=true` rend les préférences et le chantier temporaires. Il n’utilise ni la sauvegarde persistante des projets ni leurs API.

Voir [Générateur des 12 vidéos](generateur-12-videos.md) pour installer les outils, lancer la synthèse Edge sans clé, enregistrer les scénarios et publier les médias. Aucun film de contrôle n’est livré comme tutoriel réel.
