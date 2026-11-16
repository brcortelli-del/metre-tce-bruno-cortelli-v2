# Générer les 12 capsules vidéo sans clé API

Le générateur est un outil **Node exécuté sur l’ordinateur**. Il ne s’exécute ni dans React ni dans le Worker Sites. Les commandes `dev` et `build` existantes sont conservées.

## Installation

Prérequis : Node 22 ou plus récent, Python 3.10 ou plus récent et une connexion Internet pour la voix Edge. Depuis la racine du code source :

```sh
npm install --prefix tools/video-generator
npx --prefix tools/video-generator playwright install chromium
python -m pip install -r tools/video-generator/requirements.txt
```

Sous Linux, Playwright peut demander ses dépendances système : suivre le diagnostic officiel affiché par son installateur. `ffmpeg-static` télécharge son binaire pendant l’installation. Si FFmpeg est déjà installé, `FFMPEG_PATH` peut indiquer son chemin. `PYTHON_BIN` permet de choisir un Python particulier ou un environnement virtuel.

La voix par défaut est **fr-FR-DeniseNeural**. **fr-FR-HenriNeural** est également proposée. Aucune clé OpenAI ou Azure n’est demandée. Le texte de narration est envoyé au service vocal en ligne de Microsoft Edge ; la synthèse ne fonctionne pas hors connexion. Les captures d’écran et les projets ne sont pas envoyés à ce service. La disponibilité du service et ses évolutions ne sont pas garanties par ce script.

## Lancer

Premier terminal :

```sh
npm run dev
```

Deuxième terminal, en utilisant le port réellement affiché par le serveur :

```sh
npm run videos:verifier
npm run generer-videos -- --url=http://localhost:5173
```

Le robot force **`?demo=true`**, refuse une adresse distante et crée un contexte Chromium neuf pour chaque capsule. Il ne réutilise pas un profil de navigateur connecté.

Options :

```sh
npm run generer-videos -- --only=4 --url=http://localhost:5173
npm run generer-videos -- --voice=fr-FR-HenriNeural
npm run generer-videos -- --audio-only
npm run generer-videos -- --visible
```

`--only` permet de reprendre une capsule entre 1 et 12. Les narrations réussies sont mises en cache selon leur texte et leur voix. `--audio-only` n’ouvre pas Chromium. `--dry-run` décrit les sorties sans synthèse ni enregistrement.

## Sorties

Pour chaque séquence, dans `public/videos/` :

- `01_decouverte_workspace.mp3` : narration Edge ;
- `01_decouverte_workspace.mp4` : capture HD 1280 × 720, H.264 et AAC ;
- `01_decouverte_workspace.vtt` : transcription à activer dans le lecteur.

La même structure s’applique aux séquences 02 à 12. Le contrat exact des noms se trouve dans `public/tutorial-media.js`, partagé par le lecteur et le générateur.

Les sous-titres sont répartis à partir de la transcription et de la durée audio ; ils ne constituent pas un alignement mot à mot fourni par Microsoft. Les temps de la capture sont adaptés à la durée de la narration sans couper la fin des actions. Les douze capsules sont indépendantes : chacune démarre à zéro. Le programme initial de 22 min 35 s n’est pas présenté comme leur durée mesurée.

Le script ferme le contexte Playwright avant de récupérer son WebM. Il vérifie la durée du MP4 et limite chaque fichier à 24 Mio pour sa publication. Les fichiers intermédiaires et les captures d’échec restent dans `.video-build/`, ignoré par Git. Un échec interrompt le processus et conserve les capsules terminées ; il ne publie jamais le site automatiquement.

## Mode démonstration et protection des chantiers

`/?demo=true` charge six lignes fictives du garage, sa variable HSP, ses coûts d’exemple et son plan coté. Les calculs, modifications, révisions et fichiers de plan de cette démo restent dans des objets et des Map en mémoire. Ni le stockage de projet, ni sa migration historique, ni les API de synchronisation ne sont utilisés. Les préférences du manuel, de thème et de tutoriel sont également temporaires.

Actualiser réinitialise la démo. **Quitter la démo** retrouve le fonctionnement normal et les chantiers enregistrés. Le paramètre ne modifie pas les droits d’accès du site privé.

Le robot refuse toute requête `/api/` pendant la capture. Un sélecteur ambigu, un contrôle désactivé, une erreur de tracé ou un échec d’export fait échouer la capsule. Les attributs `data-tour` servent de contrat stable ; les dimensions et les données restent fictives.

## Lecteur et publication

Le clic sur une séquence vérifie son MP4 dédié. Si le fichier existe, la lecture commence à zéro. Sinon, la fiche illustrée reste accessible avec un message explicite. La lecture d’un film complet personnel et ses repères modifiables restent disponibles par **Choisir une vidéo**.

Après génération, écouter et visionner chaque capsule, puis ajouter les MP4/VTT aux sources et publier une nouvelle version **privée** du site. La génération locale seule ne modifie pas la version hébergée.

## Vérifications et limites de cette livraison

Le stockage en mémoire et l’absence d’accès au stockage persistant/API sont testés avec des accès interdits qui lèvent une erreur. Le garage est recalculé par le moteur existant. Un vrai montage FFmpeg de contrôle vérifie H.264, AAC, 1280 × 720 et la durée. Le lecteur est testé avec deux capsules de contrôle de durées différentes, retirées avant publication. Le chantier enregistré est retrouvé après modification puis fermeture d’une démo.

L’essai de synthèse Edge dans l’environnement de préparation a échoué sur la vérification du certificat TLS du service. Le téléchargement du binaire `ffmpeg-static` y a reçu un refus 403 ; les tests de montage utilisent le FFmpeg déjà installé. Aucune vérification de certificat n’a été désactivée. Les douze capsules commentées ne sont donc **pas livrées comme générées**. Les scénarios ont été contrôlés dans l’interface, mais l’enregistrement Playwright avec voix Edge n’a pas été validé de bout en bout dans cet environnement.

Références techniques : [edge-tts](https://github.com/rany2/edge-tts), [enregistrement Playwright](https://playwright.dev/docs/videos), [FFmpeg](https://ffmpeg.org/documentation.html).
