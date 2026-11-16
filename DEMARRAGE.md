# Atelier Métré TCE — version optimisée

Le code refactorisé est dans `public/`. Les explications, commentaires de conception et mesures sont rassemblés dans **PERFORMANCE.md**. Le site conserve ses fonctions et sa trame de cours.

## Sur ton ordinateur

Installe Node.js (minimum déclaré : 22.13 ; version 24 utilisée pour la validation), puis ouvre ce dossier dans un terminal :

```sh
npm ci
npm run build
```

Initialise une seule fois la base locale :

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_majestic_slapstick.sql
```

Puis lance :

```sh
npm run dev
```

Ouvre l'adresse annoncée par le terminal. Pour les tests et les mesures :

```sh
npm test
npm run benchmark
```

La copie propre utilise le profil portable, avec une connexion de développement fictive à `/signin-with-chatgpt?return_to=/`. Le site hébergé conserve son authentification Sites. Les services de production utilisent Cloudflare Workers, D1 et R2 ; un autre hébergement nécessite leur configuration et une authentification correspondante.

Les données des chantiers et les fichiers des plans ne font pas partie du code source. Les dépendances et leurs licences sont conservées ; `node_modules` se reconstitue avec `npm ci`.
