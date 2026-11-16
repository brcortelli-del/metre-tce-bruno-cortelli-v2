import { build } from "esbuild";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import fs from "node:fs/promises";
import path from "node:path";
const root = process.cwd();
await fs.mkdir("public/cctp", { recursive: true });
await build({
  entryPoints: ["cctp/entry.jsx"],
  bundle: true,
  format: "esm",
  outfile: "public/cctp/editor.js",
  minify: true,
  target: "es2022",
  jsx: "automatic",
  legalComments: "linked",
});
await build({
  entryPoints: ["cctp/export-worker.js"],
  bundle: true,
  format: "iife",
  outfile: "public/cctp/export-worker.js",
  minify: true,
  target: "es2022",
  legalComments: "linked",
});
const css = await postcss([tailwind()]).process(
  await fs.readFile("cctp/editor.css", "utf8"),
  {
    from: path.join(root, "cctp/editor.css"),
    to: path.join(root, "public/cctp/editor.css"),
  },
);
await fs.writeFile("public/cctp/editor.css", css.css);
