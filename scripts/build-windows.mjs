import { existsSync, realpathSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = realpathSync(fileURLToPath(new URL('../', import.meta.url)));
if (process.platform !== 'win32') throw new Error('Cette commande est réservée à Windows. Utilise npm run build sur les autres systèmes.');
// Map only this project to a short root. This avoids ancestor-directory reads
// denied to esbuild by some Windows environments; no permission is changed.
const drive = ['S','T','U','V','W','X','Y','Z'].find(letter => !existsSync(`${letter}:/`));
if (!drive) throw new Error('Aucune lettre de lecteur libre pour le build Windows.');
const mount = `${drive}:`;
const mapped = spawnSync('subst.exe', [mount, root], {stdio:'inherit', windowsHide:true});
if (mapped.error || mapped.status !== 0) throw new Error('Impossible de créer le chemin temporaire de compilation.');
let code = 1;
try {
  const built = spawnSync(process.execPath, ['scripts/run-framework.mjs','build'], {cwd:`${mount}/`, stdio:'inherit', windowsHide:true});
  if (built.error) throw built.error;
  code = built.status ?? 1;
} finally {
  const cleanup = spawnSync('subst.exe', [mount, '/D'], {stdio:'inherit', windowsHide:true});
  if (cleanup.error || cleanup.status !== 0) console.error(`Le lecteur temporaire ${mount} doit être libéré avec subst ${mount} /D.`);
}
process.exitCode = code;
