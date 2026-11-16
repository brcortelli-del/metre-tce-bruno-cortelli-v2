# Lecture Vision et calque des cotes

## Utilisation
Dans Relevé sur plan, importer un PDF ou une image puis sélectionner la page. Ouvrir « Lecture intelligente de Plan · IA Vision », préciser éventuellement le type de plan et les consignes, puis cliquer « Analyser cette page avec OpenAI » avec le compte propriétaire connecté.

La page affichée est rasterisée seule, sans les tracés Kutch, à 2 400 pixels maximum sur le plus grand côté, puis envoyée en JPEG haute qualité. Les PDF utilisent le rendu de la page courante, avec sa rotation native. Aucun fichier PDF complet, ni le tableau de prix, n’est transmis par ce module. Le corps JSON est limité à 12 Mio et les consignes à 3 000 caractères. Le mode démo propose un essai de repères fictifs, explicitement identifié ; il ne fait aucun appel OpenAI.

## Calque et sélection
Chaque cote comporte box_2d = [ymin, xmin, ymax, xmax], de 0 à 1000 dans l’image entière. Le SVG partage exactement le rectangle du canvas, sans recadrage ni ratio différent. Il suit le zoom et le redimensionnement.

Les catégories utilisent bleu (longueur), vert (largeur), ambre (profondeur), violet (ouverture) et rose (niveau). Survoler ou cliquer une cote dans la liste ou son cadre met les deux en jaune. Les cadres sont aussi accessibles au clavier par Tabulation puis Entrée/Espace.

« Afficher/Masquer les repères IA sur le plan » contrôle la visibilité. « Sélectionner les repères IA » contrôle leurs clics. Choisir un outil Kutch désactive cette capture des clics afin de reprendre le tracé, la calibration ou le comptage. La liste reste consultable et sélectionnable. Les cotes IA ne sont jamais injectées automatiquement dans les mesures.

## Pages et sauvegarde
Une analyse est attachée au document et à la page, avec la taille de son image source et sa date. Elle rejoint la sauvegarde habituelle du projet, sans conserver la copie base64 envoyée à OpenAI. Un changement de page annule une requête en cours et empêche l’application d’un ancien résultat à une nouvelle page. Les résultats de l’ancienne page ne sont pas superposés à la suivante. Un changement de format du plan invalide l’analyse de cette page.

## Résultats et limites
Le module présente le type de plan, les cotes localisées, les hypothèses et deux à trois scénarios alternatifs de métré/CCTP. Ils restent des propositions à vérifier : aucune quantité n’est ajoutée et aucun CCTP existant n’est remplacé. Une limite de 150 cotes et 40 postes par scénario encadre la réponse.

Une lecture IA ne garantit ni l’exhaustivité des cotes, ni leur position exacte, ni la conformité normative des scénarios. Contrôler les textes et unités sur le plan original, les boîtes visuelles, les cotes contradictoires et les hypothèses. Pour un plan dense, travailler sur un extrait mieux lisible avant de relancer. Les profondeurs ou hauteurs absentes ne doivent pas être prises pour des dimensions relevées.

## Serveur
api/analyser-plan-vision.js utilise la syntaxe ESM standard et le pont de l’hébergement existant. server/analyser-plan-vision.js traite la requête derrière l’authentification propriétaire et le contrôle d’origine. Il utilise la clé serveur existante nettoyée, gpt-4o, l’URL https://api.openai.com/v1/chat/completions et un schéma JSON strict. La lecture de réponse utilise choices[0].message.content, corrigeant l’accès incorrect du code initial.

Les coordonnées doivent être finies, ordonnées et comprises entre 0 et 1000 ; les catégories et identifiants sont contrôlés. Les images externes distantes sont refusées : seules les données PNG/JPEG/WebP encodées sont acceptées. Le délai maximal d’appel est de 55 secondes. Une erreur renvoie un diagnostic HTTP nettoyé, sans clé, et conserve les anciens relevés. Les routes analyse-metre, generer-cctp, status-ia et definir-terme sont inchangées.

## Validation
Compilation Windows réussie. Tests serveur avec réponses OpenAI simulées : schéma, coordonnées, limites, authentification, clé nettoyée, image high, statut exact d’un rejet, secret masqué, réponse tronquée et coordonnées invalides. Essais navigateur : sélection liste/plan et clavier, masquage, égalité géométrique du canvas et du SVG à 200 %, conservation par page d’un PDF de huit pages, comptage Kutch après activation du calque. Aucune donnée réelle de projet n’a été utilisée pour un appel OpenAI lors de ces essais locaux.

## Correction des cadres IA
Le test réel sur un plan synthétique a reconnu les deux valeurs mais a placé leurs cadres de façon approximative. Sélectionner une cote puis ouvrir « Corriger le cadre sélectionné » pour ajuster ymin, xmin, ymax, xmax (0–1000). Enregistrer valide les bornes et l’ordre ; la mention « Cadre corrigé manuellement » distingue cette intervention. La liste est placée à côté du plan. Les tracés Kutch restent intacts. Les cadres IA ne sont pas des coordonnées de précision garanties.

