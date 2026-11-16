# Prix unitaires des extensions et lexique BTP

## Extensions chiffrées
La bibliothèque src/data/extensionsBTP.js reprend les dix modèles et les trente prix unitaires fournis. Ces prix sont des valeurs indicatives du dossier fourni, pas une cotation de marché vérifiée.

Dans Minute professionnelle, ouvrir « Appliquer une Extension Métier », choisir le modèle et adapter ses coefficients et prix si nécessaire. « Générer les sous-ouvrages » transmet les prix aux lignes filles. Le champ « Prix Unitaire HT » de chaque ligne est directement modifiable ; valider par Tabulation, Entrée ou en quittant le champ. La fiche classique et l’étude de prix restent disponibles.

La minute affiche les montants HT/TTC renseignés du projet complet selon sa devise et sa TVA. Les lignes sans prix doivent encore être complétées. Pour une nouvelle dalle de 35 m², les trois composants fournis représentent 1 210,74 HT, soit 1 452,89 TTC à 20 % de TVA, après arrondi monétaire par ligne.

Les lignes déjà générées ne sont pas écrasées rétroactivement. Les modèles personnels sans prix restent compatibles. Les nouvelles lignes filles gardent des quantités figées et la trace [Ext. …]. Ne pas chiffrer deux fois une prestation parent complète et ses composants.

## Lexique local et surlignage
Le composant src/components/LexiqueSurlignageBTP.jsx est monté dans App, le véritable composant racine défini dans ux/entry.jsx ; l’application ne possédait pas de fichier App.jsx séparé. Ses 24 entrées sont dans src/data/lexiqueBTP.js et réexportées par le composant.

Sélectionner un terme dans le texte de l’application ou dans un champ textuel : sa définition locale apparaît dans une bulle. Accents et pluriels simples sont reconnus. Les expressions telles que « semelles filantes » sont reconnues sans utiliser de correspondances partielles trompeuses. Fermer avec la croix ; le défilement ferme la bulle pour éviter un mauvais positionnement. Un PDF scanné/canvas ne fournit pas de texte sélectionnable : utiliser le bouton Lexique BTP pour rechercher le terme.

Le bouton « Lexique BTP » de l’en-tête ouvre la bibliothèque complète avec recherche par terme, catégorie ou définition. Les définitions fournies sont des repères pédagogiques à contextualiser dans les pièces du projet.

## Définition IA d’un terme inconnu
Un terme absent du dictionnaire propose « Définir avec l’IA ». Aucun appel OpenAI n’est déclenché par le seul surlignage. Seul le terme, limité à 80 caractères, est envoyé à /api/definir-terme ; ni le projet complet ni les plans ne sont transmis. Les réponses réussies sont gardées en mémoire pendant la session. Les échecs ne sont pas mémorisés comme définitions.

La recherche IA utilise le compte propriétaire connecté, comme les routes IA existantes. En démonstration, seul le lexique local fonctionne ; une tentative IA affiche un message explicite. Sur le site connecté, une clé absente ou une erreur API produit un secours explicite et permet de réessayer.

La route api/definir-terme.js utilise le pont serveur sécurisé déjà présent ; server/definir-terme.js contient le traitement. Le routeur conserve authentification et contrôle d’origine. La clé est nettoyée côté serveur via le mécanisme existant. L’appel utilise https://api.openai.com/v1/chat/completions, gpt-4o-mini et un schéma JSON strict ; l’adresse https://openai.com du code fourni n’est pas une route API de génération. Un délai maximal, une limite de corps et une validation de réponse encadrent la demande. Les trois anciennes routes analyse-metre, generer-cctp et status-ia ne sont pas modifiées.

## Validation
Compilation Windows réussie. 238 tests : 237 réussis, 1 ignoré. Tests couvrant les prix, la modification manuelle, les totaux HT/TTC, les accents/pluriels, la validation de route, la clé nettoyée, le JSON strict, les secours et les droits d’accès. Essais navigateur du lexique local, du surlignage, du terme inconnu en démo, des prix et de l’affichage mobile. Les cas OpenAI serveur ont été testés avec des réponses simulées avant publication.
