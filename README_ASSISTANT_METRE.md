# Copilote Métré TCE

## Installation de la mise à jour

Copie les fichiers fournis à la racine du projet existant (le dossier contenant `package.json`), puis lance :

```bash
npm run dev
```

Les fichiers compilés de l’interface sont inclus. Aucune dépendance supplémentaire n’est nécessaire dans le projet déjà installé. Le dossier des 12 vidéos reste inchangé.

## Utilisation

1. Clique sur **Assistant métré** dans la navigation ou sur le bouton flottant en bas à droite.
2. Colle un descriptif, un énoncé ou un extrait CCTP. Choisis **Auto · IA si disponible** ou **Local rapide**, puis clique sur **Analyser & extraire les postes**.
3. Vérifie le lot, la désignation, l’extrait source et la quantité. Complète les champs manquants et, si utile, la localisation.
4. Clique sur **Valider et ajouter à la minute** pour chaque poste retenu.
5. Retrouve les lignes dans l’avant-métré. L’ajout est annulable avec Ctrl Z ; les lignes nouvelles restent sans prix jusqu’au chiffrage.

## Import de documents

Le bouton **Importer PDF / TXT / MD / CSV** et le glisser-déposer ouvrent un aperçu. Choisis un fichier à la fois, jusqu’à 20 Mo. L’import ne lance pas d’appel IA et ne modifie aucune quantité du chantier.

Pour un PDF, indique les pages à extraire (30 au maximum par lecture). La sélection initiale couvre au plus les 5 premières pages ; les numéros de page restent visibles dans le texte. Le moteur PDF.js et son worker sont déjà hébergés dans le site. Les polices et les cartes de caractères restent sur le même domaine : aucun CDN n’est ajouté.

Vérifie l’aperçu, corrige la transcription si nécessaire, puis choisis **Ajouter au texte existant** ou **Remplacer le texte existant** et clique sur **Utiliser ce texte**. L’ensemble reste limité à 12 000 caractères par analyse. Un dépassement est signalé et bloque la validation ; aucune fin de document n’est coupée silencieusement. Pour un long CCTP, procède par pages ou par lot.

Les scans sans couche de texte demandent un OCR préalable. Les pages vides d’un document mixte sont signalées. Un PDF protégé doit être remplacé par une copie déverrouillée autorisée. Les CSV sont repris comme texte ; le module Import CAO / BIM reste disponible pour associer des colonnes à des quantités.

L’import TXT/MD/CSV conserve les caractères UTF-8, UTF-16 avec BOM et Windows-1252. Annuler ou fermer l’aperçu conserve le descriptif précédent. Le nom du document et la plage de pages accompagnent la provenance des lignes validées ; le fichier original ne s’ajoute pas aux sauvegardes du chantier.

L’adresse `/api/analyse-metre` accepte les champs `texteClient`, `lignesMetreActuelles` et `mode` (`auto` par défaut, ou `local`). Elle utilise la route serveur de cette application Sites, avec les contrôles d’identité et d’origine existants. `/api/assistant` reste également disponible. Le moteur conserve l’endpoint OpenAI et la lecture `choices[0].message.content` déjà corrigés. L’implémentation Cloudflare/Sites est dans `server/assistant.js`, appelée par le routeur `server/api.js` et la route `app/api/[...path]/route.ts` ; aucun second handler Vercel ou Next incompatible n’est ajouté.

Référence technique PDF.js : https://mozilla.github.io/pdf.js/api/draft/module-pdfjsLib-PDFPageProxy.html

## Fonctionnement de l’analyse locale

Elle fonctionne sans clé API, sur le serveur sécurisé. Elle repère des ouvrages par mots-clés et les quantités explicitement écrites avec leurs unités. Ce moteur est un extracteur déterministe, pas un modèle d’IA. Les deux modes nécessitent une connexion du propriétaire et un serveur accessible. Aucune extraction de secours n’est exécutée dans le navigateur.

Il gère notamment les virgules décimales, les milliers, les m² / m³ / ml et les comptages courants. Il ne calcule pas automatiquement une surface ou un volume à partir de cotes dans une phrase. Si plusieurs cotes sont ambiguës ou si la quantité manque, le champ reste à préciser. Les lots proposés restent modifiables.

Les alertes sont des pistes de contrôle : elles ne prescrivent pas d’ouvrage et ne vérifient aucune norme ou règle contractuelle FR/LU.

Le texte et au plus 500 désignations sont transmis au serveur à chaque analyse. La route ne les enregistre pas dans le projet. Les propositions restent temporaires ; après validation, la quantité, le moteur et l’extrait source sont sauvegardés avec la ligne, en utilisant le stockage habituel du chantier. En `?demo=true`, les ajouts au chantier restent en mémoire. L’analyse passe également par le serveur authentifié, qui force le moteur local pour éviter toute consommation OpenAI.

## Option OpenAI, exclusivement côté serveur

Le sélecteur visible au-dessus du bouton d’analyse propose deux modes. **Auto · IA si disponible** utilise OpenAI si une clé serveur est configurée ; sinon, il produit immédiatement une extraction locale serveur. **Local rapide** force l’extraction locale serveur même avec une clé configurée. Aucune clé n’est demandée dans le navigateur ni enregistrée dans localStorage / IndexedDB. Le bouton **Options de l’assistant** explique le fonctionnement et vérifie la disponibilité du serveur.

Le secret d’environnement `OPENAI_API_KEY` doit être configuré sur le serveur ; ne le colle jamais dans un fichier public ou dans le chat. Pour un environnement de développement, utiliser la procédure locale de secrets déjà prévue par le projet. Pour Sites, utiliser les paramètres de secrets d’exécution du projet.

En mode Auto avec une clé configurée, le serveur transmet le descriptif et au maximum 500 désignations existantes à OpenAI. Les prix, marges, coordonnées du chantier et fichiers de plans sont exclus du contexte structuré. Le texte collé est transmis tel quel : vérifie son contenu avant l’envoi. Choisir Local rapide évite l’envoi à OpenAI ; le texte rejoint toujours le serveur du site. L’usage de l’API peut être facturé sur le compte associé à la clé. L’import des fichiers et la lecture PDF restent dans le navigateur ; seuls les extraits de texte sélectionnés sont envoyés lors de l’analyse.

L’implémentation conserve le modèle `gpt-4o-mini` du composant fourni et utilise `https://api.openai.com/v1/chat/completions`, avec un schéma JSON strict. Référence officielle consultée : https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=chat

L’API exige l’authentification du propriétaire et la même origine pour le POST. Une erreur HTTP OpenAI, une panne réseau, un délai dépassé (25 secondes côté serveur), un refus ou une réponse inutilisable déclenche une extraction locale serveur explicitement signalée. Une mauvaise saisie reste une erreur de validation ; une déconnexion ou une panne du serveur ne fabrique pas de résultat côté navigateur. Changer de mode ou modifier le texte annule la requête en cours et efface les propositions précédentes.

La réponse indique `moteur` (`local` ou `openai`), `moteur_utilise` (libellé affiché), `mode_demande` et `fallback_reason` (`null`, `cle_absente`, `api_indisponible` ou `demo`). Ces métadonnées sont fixées par le serveur. La citation et la preuve explicite des nombres sont revérifiées après réception du JSON. Une quantité sans preuve reste à préciser. Aucun appel payant réel n’a été exécuté lors de la validation : les tests d’API utilisent des réponses simulées et contrôlées.

## Validation

- 180 tests réussis pour cette mise à jour (`npm test`).
- La suite automatique comprend l’extraction, les imports, la sélection de pages, les encodages français, l’annulation, les quantités non inventées, la conservation des lignes et les protections du serveur.
- Les tests des modes serveur vérifient l’absence d’appel OpenAI en Local, sans clé ou en démo ; Auto avec clé ; les replis après HTTP 401/429/500, panne réseau, délai, refus, réponse tronquée et citation inventée ; les contrôles d’accès ; les erreurs de transport et l’exclusion des données financières.
- Ajout sur un projet de 500 lignes : les 500 lignes existantes conservent leur identité ; seul le nouveau poste est calculé.
- Les essais d’import de la version précédente couvraient un PDF de deux pages, un scan, un CSV, l’annulation et le blocage des textes trop longs. Ces comportements restent couverts par les tests automatiques ; les fichiers originaux ne sont pas envoyés à l’API.
- Interface vérifiée dans l’aperçu : sélecteur Auto/Local visible, état sélectionné correct, effacement de l’erreur en changeant de mode et erreur d’authentification explicite. L’aperçu sans session ne permet pas un essai propriétaire complet ; les tests du routeur contrôlent le parcours authentifié. Aucun droit d’accès n’a été assoupli pour les essais. Capture : `docs/assistant-modes-serveur.jpg`.

Pour relancer les tests :

```bash
npm test
```

La mise à jour du code ne change pas les droits de partage du site. Le déploiement doit respecter le choix d’accès de son propriétaire.
