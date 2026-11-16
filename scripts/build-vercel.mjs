import fs from 'node:fs/promises';import {spawnSync} from 'node:child_process';
for(const script of ['scripts/build-ux.mjs','scripts/build-cctp.mjs']){const r=spawnSync(process.execPath,[script],{stdio:'inherit'});if(r.status!==0)process.exit(r.status||1);}
await fs.mkdir('vercel-dist',{recursive:true});await fs.cp('public','vercel-dist',{recursive:true});await fs.writeFile('vercel-dist/runtime-config.json',JSON.stringify({mode:'vercel'}));console.log('Vercel : frontend statique et fonctions api/ préparés.');
