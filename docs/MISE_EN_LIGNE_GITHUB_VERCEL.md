# GitHub et Vercel en quatre étapes

## 1. Extraire le code
Télécharger le ZIP final puis, dans l’Explorateur Windows, clic droit > Extraire tout. Ouvrir le dossier contenant directement package.json, README.md, LICENSE et vercel.json. Le ZIP doit être décompressé : déposer seulement le ZIP dans GitHub ne rend pas les sources déployables. Aucun .env réel n’est livré.

## 2. Publier les sources sur votre GitHub
Installer GitHub Desktop depuis https://desktop.github.com/ et se connecter à son compte. Choisir File > Add local repository > Choose, sélectionner le dossier extrait. Si GitHub Desktop indique que ce dossier n’est pas un dépôt Git, cliquer « create a repository here », conserver ce dossier et Create repository. Ne pas remplacer les fichiers README/LICENSE/.gitignore fournis. Si des fichiers restent dans Changes, saisir « Version initiale Métré TCE » puis Commit to main. Cliquer Publish repository, choisir le nom metre-tce-bruno-cortelli, décocher « Keep this code private » puis Publish repository. Vérifier sur github.com que README.md et package.json sont à la racine et qu’aucun secret n’est présent.

Cette méthode conserve les fichiers cachés et gère le projet complet. L’interface web GitHub limite les envois à 100 fichiers à la fois et 25 Mio par fichier ; elle est moins adaptée à ce projet. Référence : https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository .

## 3. Relier le dépôt à Vercel
Sur https://vercel.com/ : Add New… > Project > Import Git Repository. Connecter GitHub si nécessaire, autoriser le dépôt choisi, puis Import. Choisir Framework Preset « Other », Root Directory « ./ », et vérifier Build Command « node scripts/build-vercel.mjs », Output Directory « vercel-dist », Install Command « npm ci ». vercel.json les déclare déjà. Utiliser une version Node prise en charge, 22.x minimum. Ne pas choisir le build Next/Vinext par détection automatique : il correspond à l’autre hébergement.

## 4. Configurer les secrets, déployer et vérifier
Dans Environment Variables de l’import, ajouter OPENAI_API_KEY avec votre clé existante et APP_PASSWORD avec un mot de passe propriétaire aléatoire (32 caractères recommandés, minimum 16). Les deux valeurs restent côté serveur, jamais dans GitHub. Sélectionner Production et Preview selon besoin. Cliquer Deploy puis Visit. Le projet reçoit sa propre URL https://…vercel.app : copier l’URL réellement affichée, aucun domaine n’est prédéterminé par le ZIP.

Dans le site, cliquer Connexion IA et saisir APP_PASSWORD. Ouvrir ensuite https://VOTRE-DOMAINE.vercel.app/api/status-ia dans le même navigateur : vérifier openaiConfigured et connexionReelle, pas seulement la présence de la clé. Si les variables ont été ajoutées après le premier build : Settings > Environment Variables > Save, puis Deployments > menu … du dernier déploiement > Redeploy. En cas de quota/clé/modèle indisponible, conserver le diagnostic et corriger le compte OpenAI.

Vercel Hobby est prévu pour un usage personnel non commercial : https://vercel.com/pricing . Les appels OpenAI restent payants selon votre compte, même si l’hébergement est gratuit. Une activité commerciale demande un plan Vercel adapté.

## Modifier ensuite le site
Modifier les fichiers dans le dossier local, tester, puis GitHub Desktop > Changes > résumé > Commit to main > Push origin. Le lien GitHub/Vercel déclenche un nouveau déploiement. Les branches peuvent produire des Preview selon la configuration choisie. Les modèles d’extensions, termes et chapitres sont documentés dans README.md.

## Portabilité des données
Sites conserve sa synchronisation D1/R2 et son identité ChatGPT. Le Vercel autonome fourni utilise le navigateur pour les projets/plans ; la connexion IA protège uniquement les appels serveur. Les bases et fichiers Sites ne sont pas transférés par un dépôt GitHub. Exporter le projet complet (.json) depuis Sites puis l’importer sur Vercel pour transférer le chantier et son plan courant. Le fichier peut rester local : ne pas le mettre dans le dépôt public.

Limite des fonctions Vercel : charge utile 4,5 MB ; le pont protège les demandes à 4 Mio. Les PDF complets ne passent pas dans ces fonctions lors d’une archive locale. Sources : https://vercel.com/docs/functions/limitations et https://vercel.com/docs/environment-variables .
