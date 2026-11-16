# Diagnostic OpenAI et publication

Les routes de production sont app/api/[...path]/route.ts et server/api.js (Cloudflare Workers / Vinext). Elles exigent la connexion du propriétaire, et le contrôle d’origine reste obligatoire pour les POST.

Les fichiers api/analyse-metre.js et api/status-ia.js exportent un handler Node ESM sans dépendance native. Ils sont des adaptateurs pour une passerelle Node injectant une Request Sites déjà authentifiée (req.sitesRequest) et les bindings serveur (req.sitesEnv). Ils refusent les appels sans cette passerelle ; ils ne remplacent pas les routes Workers de production.

OPENAI_API_KEY est nettoyée avec trim() côté serveur, depuis le binding Cloudflare ou process.env sous Node. Aucune clé ne doit être placée dans public/, ux/, les paramètres d’URL ou les fichiers suivis.

GET /api/status-ia appelle réellement GET https://api.openai.com/v1/models, avec un délai de 10 secondes. La réponse distingue openaiConfigured, connexionReelle, statusHttp et detailErreur. Un succès vérifie l’authentification et la connexion, pas le quota de génération. Il ne déclenche aucune génération.

POST /api/analyse-metre appelle https://api.openai.com/v1/chat/completions avec gpt-4o-mini et JSON strict. En cas de rejet, diagnostic_openai et alertes_coherence conservent le vrai statut HTTP, le code et le message fournisseur, avec masquage des clés. Une erreur réseau n’a pas de statut HTTP. Le secours local reste explicite.

Le site openai.com est un site web, pas l’endpoint authentifié de l’API.

Validation ciblée : 38 tests réussis, incluant HTTP 400/401/429/500, réseau, délai, nettoyage de clé, masquage, contrôle propriétaire et compatibilité ESM des adaptateurs Node. Les imports des routes utilisent des slashs /.

Sous Windows : npm run build:windows. Cette commande monte temporairement le seul dossier du projet sur un lecteur libre, compile puis libère le lecteur. Le build complet a été validé sous Windows. Aucune permission système n’est modifiée.
