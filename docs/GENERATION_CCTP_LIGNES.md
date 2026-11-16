# Articles CCTP liés aux ouvrages

Dans la minute professionnelle, la feuille de minute ou le tableau du calculateur, cliquez sur **CCTP** à côté de l’ouvrage. S’il n’a pas encore d’article, la génération démarre et le texte proposé reste non enregistré. Un article déjà sauvegardé est simplement rouvert : aucun nouvel appel OpenAI.

La route `/api/generer-cctp` utilise la même passerelle Sites authentifiée que le Copilote. La génération est réservée au propriétaire du site, avec contrôle d’origine. La clé existante reste exclusivement dans le secret serveur. Le fichier ESM `api/generer-cctp.js` délègue à cette passerelle ; un serveur Node indépendant doit lui fournir une `sitesRequest` vérifiée et les bindings, comme pour les deux routes IA existantes.

Le serveur appelle `https://api.openai.com/v1/chat/completions`, modèle `gpt-4o-mini`, avec quatre rubriques en JSON strict et un délai maximal de 25 secondes. Il transmet uniquement le contexte saisi et les informations autorisées du poste. Aucun prix, marge ni fichier de plan n’est transmis. Le pays du chantier est pris en compte. Le résultat est un brouillon : les références normatives proposées et les règles de mesurage doivent être relues au marché.

Sans clé, en démonstration ou en cas d’échec fournisseur, le serveur fournit une trame locale identifiée. Le diagnostic HTTP fournisseur est affiché sans révéler de clé. Une erreur d’authentification ou une panne du serveur n’est pas déguisée en génération locale dans le navigateur. En démo, même un propriétaire connecté n’effectue pas d’appel OpenAI.

## Rédiger et conserver

1. Vérifiez l’origine affichée et les quatre rubriques.
2. Complétez si nécessaire le contexte technique avant une régénération. Le remplacement d’un texte existant demande une seconde action de confirmation.
3. Modifiez directement le texte, puis choisissez **Enregistrer dans la ligne**. Le résultat est conservé dans le projet, sa sauvegarde locale/JSON, ses révisions et son enregistrement en ligne lorsqu’il est connecté. L’action est annulable par l’historique habituel.
4. **Copier l’article** copie le texte visible, y compris les modifications non enregistrées. Fermer un texte modifié sans sauvegarde demande confirmation.

Une modification de quantité, désignation, lot, niveau, zone ou pays rend l’article existant « à relire ». Le texte n’est jamais réécrit automatiquement. Une modification de l’ouvrage pendant la rédaction bloque l’enregistrement sur un contexte ancien : fermez puis rouvrez l’article pour retrouver les données actuelles.

## Exporter

Le bouton **Exporter le CCTP complet (.txt / Aperçu impression)** dans la minute, ou l’icône d’export CCTP de l’en-tête, compile tous les articles enregistrés **dans les lignes**, par lot TCE, indépendamment des filtres du tableau. Le compteur indique les lignes encore sans article. Les articles à relire sont signalés.

- **Télécharger .txt** : texte UTF-8, avec en-tête et classement par lot.
- **Imprimer / Enregistrer en PDF** : document A4 avec le titre « Métré TCE – Bruno Cortelli », sans boutons ni navigation.

Le document de l’éditeur CCTP FR / LU et ses exports Word/PDF restent distincts : les articles de ligne n’écrasent pas ses clauses existantes.

## Validation

Tests dédiés : routage authentifié, origine, propriétaire, entrée Node, normalisation, JSON strict, annulation, secours local avec diagnostics expurgés, import/export du projet, annuler/rétablir, détection d’obsolescence et absence de prix/plans dans la requête. Contrôles navigateur : génération serveur locale, édition, sauvegarde, réouverture, copie, export TXT et accès depuis les tableaux classiques.
