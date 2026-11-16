# Validation de la livraison finale

- Build Windows Sites : réussi.
- Build statique + fonctions Vercel : réussi localement ; aucun compte Vercel de l’utilisateur n’a été déployé dans cette session.
- 251 tests : 250 réussis, 1 ignoré. Cas couverts : moteur existant, archivage binaire du plan, CCTP, bibliothèque de deux projets, cookies signés et expirés, origine des demandes, clé serveur, JSON strict, erreurs et droits.
- Essais navigateur sur un hébergement local autonome : recherche du manuel, journal, affichage mobile, duplication puis Ctrl+Z, raccourci Ctrl+Alt+N, création et réouverture de deux projets, export d’un chantier de six lignes avec son plan PNG, réimport de cette archive et restauration du titre.
- Connexion du serveur autonome testée avec un mot de passe de test local, puis accès à /api/status-ia depuis le même navigateur. Le serveur de test avait une clé OpenAI vide : aucun appel facturé n’a été lancé par ce test. La route a renvoyé le diagnostic attendu « clé absente » après authentification.
- Les cinq fichiers api/analyse-metre.js, api/generer-cctp.js, api/definir-terme.js, api/analyser-plan-vision.js et api/status-ia.js, ainsi que leurs traitements métier existants, restent inchangés. Le pont Node possède maintenant une branche autonome protégée ; le routage Sites est conservé.
- Contrôle de fichiers candidats au ZIP : seule .env.example est incluse ; aucun motif de clé OpenAI réelle détecté. Pas de node_modules, .git, .env réel ni liaison à l’ancien projet Sites dans le ZIP destiné à GitHub.

Les tests ne certifient pas une équivalence avec les logiciels commerciaux, une reconnaissance exhaustive par IA ou une disponibilité perpétuelle de l’hébergement. La migration de D1/R2 et du partage Sites vers une infrastructure Vercel collaborative reste un chantier distinct ; le mode autonome livré conserve les données dans le navigateur et les archives locales.
