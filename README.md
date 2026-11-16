# Métré TCE – Bruno Cortelli

Atelier web open source de métré, lecture de plans et rédaction CCTP. Interface React avec thèmes Atelier/Nuit, Kutch 2D PDF/CAO, minutes détaillées, extensions métier chiffrées et assistance OpenAI côté serveur.

## Deux hébergements, deux modes de données

| Mode | Frontend et API | Données et identité |
|---|---|---|
| Sites (aperçu existant) | Vinext / Cloudflare Worker | Identité ChatGPT vérifiée, base D1, fichiers privés R2, rôles et révisions en ligne |
| Vercel autonome | Fichiers statiques + fonctions Node api/*.js | Projets et plans dans le navigateur ; accès IA par mot de passe propriétaire et cookie signé HttpOnly |

Le Vercel autonome ne reproduit pas automatiquement la synchronisation D1/R2 ni le partage multi-utilisateurs de Sites. Ces services nécessitent une migration vers une base, un stockage et un fournisseur d’identité externes si vous les souhaitez sur Vercel. Aucun identifiant reçu dans un simple en-tête HTTP n’est accepté comme preuve d’identité dans le mode autonome.

## Fonctions principales

- Minutes N × L × l × H, déductions, pente %/degrés, couleurs, niveaux/zones et modèles réutilisables.
- Kutch PDF multipage, calibration, longueurs, surfaces, comptages ; conservation de la provenance des relevés.
- Vision gpt-4o : cotes et cadres normalisés par page, sélection synchronisée, masquage et correction manuelle. Les positions IA sont approximatives, pas des relevés garantis.
- Dix extensions et trente composants avec prix HT fournis, modifiables. Les lignes filles générées sont des instantanés ; l’annexe de besoins dynamique reste distincte.
- CCTP par ligne, éditeur FR/LU, lexique de 24 termes et définitions IA sur demande.
- Contrôle qualité à dix points et audit IA final. Rapports CSV/Excel, CCTP texte et impression PDF.
- Bibliothèque de projets locaux, checkpoint localStorage (petits projets), IndexedDB pour les grands projets et fichiers. Sauvegarde automatique, duplication, raccourcis et totaux financiers.
- Archive JSON complète : fichier du plan courant, pages, relevés, métré, CCTP et paramètres. Limites : plan 35 Mio, archive 60 Mio. Les versions anciennes sans fichier de plan restent importables.

## Architecture

- public/app.js : moteur existant et pont transactionnel vers React.
- ux/entry.jsx : composant racine App et navigation ; composants React dans ux/ et src/components/.
- public/core.js, professional-core.js, business.js, expression.js : calculs, unités et prix.
- public/plan.js, plan-renderer.js : rendu et Kutch, sans remplacement par la Vision.
- public/storage*.js : sauvegarde active dans IndexedDB/Worker ; project-library.js : plusieurs projets locaux ; project-archive.js : archives avec plan.
- src/data/extensionsBTP.js : bibliothèque métier ; lexiqueBTP.js : dictionnaire ; manuelUtilisation.js : manuel et journal centralisé.
- api/*.js : façades ESM Node. server/*.js : traitements partagés ; node-api-adapter.js sélectionne le pont Sites ou autonome.
- server/portable-api.js : authentification autonome et routage des cinq services IA, sans D1/R2.
- app/ et .openai/ : routage/hébergement Sites ; vercel.json et scripts/build-vercel.mjs : déploiement autonome.

## Installation et compilation

Node.js 22.13+ ; npm et le fichier package-lock.json fournis.

```sh
npm ci
npm test
npm run build:vercel
```

Le build Vercel génère vercel-dist/ et conserve les fonctions dans api/. Le paramétrage Vercel utilise Framework Preset **Other**, la commande `node scripts/build-vercel.mjs` et le dossier `vercel-dist`, déjà déclarés dans vercel.json.

Pour reconstruire l’hébergement Sites existant : `npm run build` ; sous Windows, `npm run build:windows` utilise un chemin temporaire court sans modifier les permissions. Ne pas utiliser ce build Worker comme dossier statique Vercel.

L’archive GitHub ne contient ni dépendances installées, ni .git, ni secrets, ni liaison à l’ancien projet Sites. Une nouvelle publication Sites doit être enregistrée dans le nouvel espace avec son propre identifiant.

## Configuration OpenAI et connexion Vercel

1. Dans Vercel > projet > Settings > Environment Variables, ajouter **OPENAI_API_KEY** avec votre clé existante. Ne jamais utiliser de préfixe VITE_, NEXT_PUBLIC_ ou REACT_APP_ pour cette clé.
2. Ajouter **APP_PASSWORD**, un mot de passe aléatoire propriétaire d’au moins 16 caractères (32 recommandés). Il protège les dépenses IA ; ne pas le publier dans GitHub. Le cookie est signé avec ce secret, HttpOnly, Secure et SameSite=Strict, valable huit heures. Changer le mot de passe invalide les sessions.
3. Cocher Production (et Preview si souhaité), enregistrer puis redéployer. Le fichier .env.example contient uniquement des valeurs d’exemple et est autorisé par .gitignore.
4. Ouvrir le site, cliquer **Connexion IA**, saisir APP_PASSWORD puis vérifier `/api/status-ia` dans le navigateur. Le contrôle réel existant doit indiquer une connexion OpenAI réussie. Les fonctions locales restent disponibles sans connexion IA.

Services conservés : POST /api/analyse-metre, POST /api/generer-cctp, POST /api/definir-terme, POST /api/analyser-plan-vision et GET /api/status-ia. Les modèles utilisés restent gpt-4o-mini pour le texte et gpt-4o pour la Vision. La clé est nettoyée et utilisée côté serveur ; les erreurs ne la renvoient pas.

La limite Vercel de charge utile est 4,5 MB : le pont autonome limite ses demandes à 4 Mio et la Vision refuse les images trop lourdes avant envoi. Le plan complet reste dans le navigateur/JSON ; seule la page rasterisée est transmise à la demande. Un plan dense peut nécessiter un extrait plus lisible. Les appels OpenAI sont facturés séparément de l’hébergement.

## Ajouter une extension BTP

Dans src/data/extensionsBTP.js, ajouter un objet à BIBLIOTHEQUE_EXTENSIONS_BTP : id unique, nom, lot, uniteSource (`m2` ou `ml`), description et composants `{designation, unite, coefficient, prixUnitaireHT}`. Les adaptateurs normalisent m2/m3/ml en m²/m³/m et transmettent les prix aux nouvelles lignes. Ne pas modifier rétroactivement les anciens chantiers. Le panneau permet aussi des formules sûres avec Q et des paramètres, conservées dans le navigateur.

## Ajouter un terme au lexique

Dans src/data/lexiqueBTP.js, ajouter une clé en minuscules sans accent avec `{terme,categorie,definition}`. La recherche normalise les accents et les pluriels simples. Éviter les règles normatives universelles et vérifier les définitions. Le composant src/components/LexiqueSurlignageBTP.jsx gère les bulles et le cache de session IA ; aucune requête n’est déclenchée par le seul surlignage.

## Modifier le manuel et les mises à jour

Mettre à jour CHAPITRES_MANUEL et NOUVEAUTES_AUTO dans src/data/manuelUtilisation.js. Le bouton supérieur ouvre ManuelUtilisationModal.jsx ; l’ancien manuel long et les exercices restent disponibles. Les libellés et limites documentés doivent correspondre au code livré.

## Raccourcis

Ctrl/Cmd+Alt+N : nouvelle minute professionnelle ; Ctrl/Cmd+Alt+D : duplication de la ligne sélectionnée hors champ texte ; Ctrl/Cmd+Z et Ctrl/Cmd+Y : annulation/rétablissement hors champ texte. Alt+P/M/C : plan/minute/CCTP. Dans le plan, L/S/C activent longueur/surface/comptage. Les dialogues et champs de saisie conservent leurs raccourcis natifs.

## Limites et exploitation

Effacer le stockage du navigateur supprime les projets locaux et plans. Exporter régulièrement des archives complètes. Une adresse vercel.app reste attachée à votre projet tant que l’hébergement et le compte sont maintenus ; elle n’est pas une garantie de disponibilité perpétuelle. Le plan Vercel Hobby vise les usages personnels non commerciaux ; un usage professionnel commercial demande un plan adapté. Les quotas et tarifs du fournisseur peuvent évoluer.

L’application ne remplace pas la vérification d’un économiste ou d’un concepteur : pas de certification « 100 % conforme », pas de garantie de lecture exhaustive des plans et pas de dimensionnement structurel automatique.

## Licence et contribution

Code original : MIT, Copyright 2026 Bruno Cortelli. Conserver LICENSE et THIRD_PARTY_NOTICES.md. Les paquets, images, polices et documents tiers conservent leurs droits. Le champ npm `private: true` évite une publication npm accidentelle et n’empêche pas un dépôt GitHub public.

Pour contribuer : créer une branche, modifier les sources, exécuter les tests et les builds concernés, documenter la modification et ouvrir une pull request. Ne jamais ajouter un fichier .env réel, un plan de client ou une clé dans un commit. Les sorties compilées public/ux sont générées à partir des sources et peuvent être reconstruites.

Voir docs/MISE_EN_LIGNE_GITHUB_VERCEL.md pour les quatre étapes avec clics et docs/BENCHMARK_FINAL.md pour les comparaisons.
