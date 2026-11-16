# Mise à jour du lecteur des 12 tutoriels MP4

## Installation dans ton projet existant

1. Ferme le serveur de développement s’il tourne déjà.
2. Décompresse cette archive **à la racine de ton projet existant**, dans le dossier qui contient `package.json`. Accepte le remplacement des fichiers fournis.
3. Conserve ton dossier `public/videos/` et les 12 vidéos que tu as générées. Cette archive contient uniquement la mise à jour du code : aucune vidéo n’est incluse.
4. Dans le terminal de ce même projet, lance :

```bash
npm run dev
```

5. Ouvre l’adresse affichée dans le terminal, puis clique sur **Tutoriel vidéo** dans la navigation principale. Clique sur une séquence du sommaire pour lire son MP4 depuis le début.

Il n’y a pas de nouvelle dépendance à installer dans le projet déjà configuré. Le générateur vocal, son secours hors ligne, le démarrage automatique du serveur et tes chantiers enregistrés ne sont pas modifiés par cette mise à jour.

## Fichiers fournis

| Fichier | Rôle |
| --- | --- |
| `ux/TutorielVideoSite.jsx` | Lecteur React, démarrage au clic et changement de séquence |
| `public/tutorial-media.js` | Correspondance des 12 sous-chapitres avec leurs MP4 |
| `public/ux/atelier.js` | Interface compilée, prête à être servie par le site |
| `public/ux/atelier.js.LEGAL.txt` | Mentions de licence du bundle |
| `tests/tutorial-direct.test.mjs` | Vérification des correspondances et du premier rendu |

L’entrée **Tutoriel vidéo** existe déjà dans la navigation principale du projet et a été vérifiée dans le navigateur. Aucun remplacement de la navigation n’est nécessaire.

## Correspondance exacte

Le serveur sert les fichiers placés dans `public/videos/` à l’adresse `/videos/`.

| Sous-chapitre | URL du fichier |
| --- | --- |
| 1.1 · Découverte de l’espace de travail | `/videos/01_decouverte_workspace.mp4` |
| 1.2 · Mode France / Luxembourg | `/videos/02_mode_france_luxembourg.mp4` |
| 1.3 · Raccourcis clavier | `/videos/03_raccourcis_clavier.mp4` |
| 2.1 · Import du plan et étalonnage | `/videos/04_import_plan_etalonnage.mp4` |
| 2.2 · Tracés, surfaces et déductions | `/videos/05_traces_surfaces_deductions.mp4` |
| 2.3 · Saisie directe et import CAO | `/videos/06_saisie_sans_plan_import_cao.mp4` |
| 3.1 · Vérification des références normatives | `/videos/07_verification_normes_dtu.mp4` |
| 3.2 · Génération et export CCTP | `/videos/08_generation_export_cctp.mp4` |
| 4.1 · Vérificateur d’oublis | `/videos/09_verificateur_oublis_audit.mp4` |
| 4.2 · Chiffrage et DPGF | `/videos/10_chiffrage_dpgf_excel.mp4` |
| 4.3 · Besoins matériaux | `/videos/11_bon_commande_materiaux.mp4` |
| 5.1 · Cas pratique du garage | `/videos/12_cas_pratique_complet.mp4` |

Les fichiers `.vtt` de sous-titres produits par le générateur peuvent rester à côté des MP4. Leur absence n’empêche pas la lecture vidéo.

## Comportement du lecteur

- Chaque clic de sous-chapitre sélectionne directement son MP4 et lance la lecture, sans requête de vérification préalable.
- Les annonces « vidéo à générer », « vidéo indisponible » préventives et « vérification de la vidéo » sont supprimées.
- Seule la vidéo sélectionnée est préchargée, pour éviter de charger les 12 fichiers simultanément.
- Les boutons Précédent, Suivant et Lire depuis le début utilisent les mêmes correspondances.
- La vitesse de lecture est conservée lors du changement de séquence.
- Les fiches illustrées restent accessibles. Les préférences de progression conservent leur fonctionnement existant, y compris l’isolation du mode `?demo=true`.
- Un véritable échec de décodage ou de chargement reste signalé par le lecteur pour permettre de corriger un fichier endommagé ou un chemin incorrect.

## Validation réalisée

- Suite du projet : **144 tests réussis**, dont les 2 tests de cette intégration.
- Navigateur : accès principal visible ; lancement des 12 vidéos fournies vérifié, sans erreur, en H.264/AAC et 1280 × 720. La reprise au début, la navigation Précédent/Suivant et la vitesse 1,5× avaient également été vérifiées lors de l’intégration du lecteur.
- Les 12 vidéos et leurs sous-titres issus de `videos.zip` sont intégrés dans `public/videos/`. Durée totale : 5 min 24 s. Le décodage complet de chaque MP4 a été contrôlé avant le déploiement.

Pour relancer les tests dans ton projet :

```bash
npm test
```

Les 12 MP4 et leurs fichiers `.vtt` sont désormais inclus dans les fichiers du site pour leur déploiement privé. Les MP3 sources restent dans l’archive originale ; le lecteur utilise les pistes audio déjà intégrées aux MP4.
