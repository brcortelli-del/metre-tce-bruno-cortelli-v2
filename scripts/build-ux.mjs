import { build } from "esbuild";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import fs from "node:fs/promises";
import path from "node:path";
import "./build-manual.mjs";
await fs.mkdir("public/ux", { recursive: true });
for (const [source, name] of [
  ["ux/entry.jsx", "atelier"],
  ["ux/import-worker.js", "import-worker"],
  ["ux/ifc-worker.js", "ifc-worker"],
]) {
  await build({
    entryPoints: [source],
    bundle: true,
    format: "esm",
    platform: "browser",
    outfile: `public/ux/${name}.js`,
    minify: true,
    target: "es2022",
    jsx: "automatic",
    legalComments: "linked",
    conditions: ["browser", "import"],
  });
}
const css = await postcss([tailwind()]).process(
  await fs.readFile("ux/atelier.css", "utf8"),
  {
    from: path.resolve("ux/atelier.css"),
    to: path.resolve("public/ux/atelier.css"),
  },
);
await fs.writeFile("public/ux/atelier.css", css.css);
await fs.copyFile(
  "node_modules/web-ifc/web-ifc.wasm",
  "public/ux/web-ifc.wasm",
);
await fs.copyFile(
  "node_modules/web-ifc/LICENSE.md",
  "public/ux/web-ifc-LICENSE.md",
);
await fs.writeFile(
  "public/ux/NOTICE.txt",
  "web-ifc 0.0.79 — That Open Company / contributors — MPL-2.0\nSources non modifiées : https://github.com/ThatOpen/engine_web-ifc/tree/v0.0.79\nLicence : web-ifc-LICENSE.md\nLes autres avis de licence figurent dans les fichiers .LEGAL.txt du dossier.\n",
);
