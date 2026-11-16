import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const source = path.join(root, "docs/manual");
const meta = JSON.parse(await fs.readFile(path.join(source, "pdf-index.json"), "utf8"));
const clean = (s) => s.replace(/\*\*/g, "").replaceAll(String.fromCharCode(96), "");
const normalized = (s) => clean(s).normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
const chapters = [
  { id: "prise-en-main", title: "Prise en main & lexique", number: "01", subtitle: "Les repères pour commencer", sections: [] },
  { id: "pas-a-pas", title: "Guide du métré", number: "02", subtitle: "Plan, clavier ou import CAO / BIM", sections: [] },
  { id: "cctp-export", title: "CCTP France / Luxembourg", number: "03", subtitle: "Rédiger, vérifier et exporter", sections: [] },
  { id: "chiffrage-appro", title: "Chiffrage DPGF, achats & audit", number: "04", subtitle: "Des sous-détails aux besoins matériaux", sections: [] },
  { id: "exercice", title: "Exercice complet & corrigé", number: "05", subtitle: "Le garage de 6 × 4 m et son corrigé", sections: [] },
];
function parse(markdown, kind) {
  let current, correction = false;
  const ensure = () => {
    if (!current) {
      current = { id: kind + "-intro", title: kind === "guide" ? "Avant de commencer" : "Objectifs du cas d’école", blocks: [], correction: false, pdfPage: kind === "business" ? null : 1, document: kind === "business" ? null : kind };
      chapters[kind === "guide" ? 0 : kind === "business" ? 3 : 4].sections.push(current);
    }
    return current.blocks;
  };
  const lines = markdown.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || /^\[(PAGE|LANDSCAPE|PORTRAIT)\]$/.test(line)) continue;
    const heading = line.match(/^(#{1,3})\s+(.*)/);
    if (heading) {
      const level = heading[1].length, title = heading[2];
      if (level === 1) {
        if (title.startsWith("Partie 5")) correction = true;
        continue;
      }
      if (title.startsWith("Parties ")) continue;
      if (level === 2) {
        const n = title.match(/^\d+(?:\.\d+)*/)?.[0] || "0";
        const chapterIndex = kind === "business" ? 3 : kind === "exercise" ? 4 : Number(n) <= 3 ? 0 : Number(n) <= 7 ? 1 : 2;
        const page = kind === "business" ? -1 : meta.normalizedPages[kind].findIndex((p) => p.includes(normalized(title)));
        current = { id: kind + "-" + n.replaceAll(".", "-"), title, blocks: [], correction, pdfPage: page < 0 ? null : page + 1, document: kind === "business" ? null : kind };
        chapters[chapterIndex].sections.push(current);
      } else {
        ensure().push({ type: "heading", text: title });
      }
      continue;
    }
    if (line.startsWith("|")) {
      const rows = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        const row = lines[i].trim().replace(/^\||\|$/g, "").split("|").map((s) => s.trim());
        if (!row.every((s) => /^:?-+:?$/.test(s))) rows.push(row);
        i++;
      }
      i--;
      ensure().push({ type: "table", rows });
      continue;
    }
    const action = line.match(/^\[(.*?)\]\(atelier:(prices|needs|assemblies|minute|cctp|plan)\)$/);
    if(action){ensure().push({type:"action",text:action[1],view:action[2]});continue;}
    const image = line.match(/^!\[(.*?)\]\((\/manual\/[^)]+)\)$/);
    if (image) {
      ensure().push({ type: "image", alt: image[1], src: image[2], ...meta.images[image[2]] });
      continue;
    }
    const list = line.match(/^(\d+\.\s+|-\s+)(.*)/);
    if (list) {
      const ordered = !line.startsWith("- ");
      const items = [];
      const start = ordered ? Number(list[1].match(/\d+/)[0]) : undefined;
      while (i < lines.length) {
        const item = lines[i].trim().match(ordered ? /^\d+\.\s+(.*)/ : /^-\s+(.*)/);
        if (!item) break;
        items.push(item[1]);i++;
      }
      i--;
      ensure().push({ type: "list", ordered, ...(ordered ? { start } : {}), items });
      continue;
    }
    if (line.startsWith("> ")) {
      const text = line.slice(2).replace(/^[💡⚠️⌨️\s]+/u, "");
      const [title, ...rest] = text.split(" — ");
      ensure().push({ type: "callout", title, text: rest.join(" — "), tone: line.includes("⚠") ? "warning" : line.includes("⌨") ? "keyboard" : "tip" });
    } else if (/^https:\/\//.test(line)) {
      ensure().push({ type: "link", url: line });
    } else {
      ensure().push({ type: "paragraph", text: line });
    }
  }
}
parse(await fs.readFile(path.join(source, "guide.md"), "utf8"), "guide");
parse(await fs.readFile(path.join(source, "exercice.md"), "utf8"), "exercise");
parse(await fs.readFile(path.join(source, "chiffrage-appro.md"), "utf8"), "business");
const data = { version: "2026-11-13-v15", updatedAt: "2026-11-13", documents: meta.documents, chapters };
await fs.mkdir("public/manual", { recursive: true });
await fs.writeFile("public/manual/content.json", JSON.stringify(data));
console.log("Manuel : " + chapters.reduce((n, c) => n + c.sections.length, 0) + " sections préparées.");
