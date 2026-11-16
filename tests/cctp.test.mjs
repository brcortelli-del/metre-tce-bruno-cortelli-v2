import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { indexedDB } from "fake-indexeddb";
import { unzipSync, strFromU8 } from "fflate";
import {
  catalogueIndex,
  fromClause,
  appendClause,
  importMinute,
  patchArticle,
  normalizeCctp,
  numberedArticles,
  plainBlocks,
  blocksText,
  clauseMeasurement,
  catalogueTree,
  articleTree,
  fillMissingMeasurements,
} from "../public/cctp-model.js";
import { upgradeProject } from "../public/business.js";
import { storagePatch, createRepository } from "../public/storage-core.js";
import { createCctpDocx } from "../cctp/exports.js";
const read = (n) =>
  JSON.parse(
    fs.readFileSync(new URL("../public/data/" + n, import.meta.url), "utf8"),
  );
const cat = catalogueIndex(
  read("cctp-library.json"),
  read("cctp-sources.json"),
);
const empty = () => ({ version: 1, articles: [] });
const row = (id, code, label = "Décapage") => ({
  id,
  code,
  label,
  lot: "Terrassement",
  building: "Bâtiment A",
  level: "RDC",
  room: id,
  unitPrice: 987654.32,
  costs: { materials: 765432.1 },
  input: {
    preset: "surface",
    dimensionUnit: "m",
    dimensions: { L: "10", w: "5" },
    count: "1",
    deduction: "0",
  },
  result: { unit: "m²", total: 543210.999 },
});
test("CCTP : import en lot, doublons, absence de quantités et conservation des textes retouchés", () => {
  const rows = [
    row("r1", "TVRD-2.7"),
    row("r2", "TVRD-2.7"),
    row("r3", "LIBRE", "Détail sans bibliothèque"),
  ];
  let seq = 0;
  const doc = importMinute(empty(), rows, cat, () => `a${++seq}`);
  assert.equal(doc.articles.length, 2);
  assert.deepEqual(doc.articles[0].rowIds, ["r1", "r2"]);
  assert.equal(doc.articles[1].source, null);
  assert.deepEqual(doc.articles[1].description, []);
  assert(!JSON.stringify(doc).includes("987654"));
  assert(!JSON.stringify(doc).includes("543210"));
  assert(!JSON.stringify(doc).includes("765432"));
  const edited = patchArticle(doc, "a1", {
    description: plainBlocks("Texte adapté au chantier"),
  });
  const again = importMinute(edited, rows, cat, () => {
    throw new Error("Pas de nouvel article attendu");
  });
  assert.equal(again.articles.length, 2);
  assert.equal(again.articles[0], edited.articles[0]);
  const updated = importMinute(edited, [...rows, row("r4", "TVRD-2.7")], cat);
  assert.equal(
    updated.articles[0].description[0].runs[0].text,
    "Texte adapté au chantier",
  );
  assert.equal(updated.articles[0].rowIds.length, 3);
});
test("CCTP : insertion répétée et codes ambigus sans spécification inventée", () => {
  const o = cat[0],
    first = appendClause(empty(), o, "a");
  assert.equal(appendClause(first, o, "b"), first);
  const ambiguous = [
    { ...cat[0], code: "one", originalCode: "X" },
    { ...cat[1], code: "two", originalCode: "X" },
  ];
  const doc = importMinute(empty(), [row("r", "X")], ambiguous);
  assert.equal(doc.articles[0].source, null);
  assert.deepEqual(doc.articles[0].description, []);
});
test("CCTP : mode de métré issu de la fiche, sans seuil ni taux inventé", () => {
  const o = cat.find((o) => o.code === "TVRD-2.10");
  const a = fromClause(o, "fouille");
  const rule = blocksText(a.measurement);
  assert(rule.includes(o.regle_metre.vides_pour_pleins));
  assert(rule.includes(o.formule_defaut));
  assert(!rule.includes("0,50"));
  assert(!rule.includes("5 %"));
  const clean = normalizeCctp({ articles: [a] });
  assert.deepEqual(clean.articles[0].measurement, a.measurement);
  assert.deepEqual(clauseMeasurement({}), []);
  const old = { ...a };
  delete old.measurement;
  assert.deepEqual(
    normalizeCctp({ articles: [old] }).articles[0].measurement,
    [],
  );
});
test("CCTP : arbres dynamiques de lots et sous-lots, numéros sans collision", () => {
  const input = [
    {
      ...cat[0],
      lotNumber: "01",
      lotName: "Lot de test A",
      sublot: "Sous-lot A",
    },
    {
      ...cat[0],
      lotNumber: "02",
      lotName: "Lot de test B",
      sublot: "Sous-lot B",
    },
  ];
  const tree = catalogueTree(input);
  assert.equal(tree.length, 2);
  assert.equal(tree[1].groups[0].name, "Sous-lot B");
  const doc = { articles: input.map((o, i) => fromClause(o, "a" + i)) };
  const numbered = numberedArticles(doc);
  const outline = articleTree(numbered);
  assert.equal(outline[1].groups[0].articles[0].number, "2.1.1");
  assert.equal(
    outline.flatMap((l) => l.groups.flatMap((g) => g.articles)).length,
    2,
  );
});
test("CCTP : compléter les anciens modes vides préserve les textes relus", () => {
  const o = cat.find((o) => o.code === "TVRD-2.7");
  const a = {
    ...fromClause(o, "a"),
    measurement: [],
    description: plainBlocks("Prescription relue"),
  };
  const b = {
    ...fromClause(o, "b"),
    measurement: plainBlocks("Mesurage propre au marché"),
    reviewed: true,
  };
  const doc = { articles: [a, b] };
  const next = fillMissingMeasurements(doc, cat);
  assert.equal(blocksText(next.articles[0].description), "Prescription relue");
  assert(next.articles[0].measurement.length);
  assert.equal(next.articles[1], b);
  assert.equal(fillMissingMeasurements(next, cat), next);
});
test("CCTP : l'import conserve la désignation de minute et ses localisations riches", () => {
  const r = row("r1", "TVRD-2.7", "Décapage prévu sur le plan A");
  const doc = importMinute(empty(), [r], cat, () => "a1");
  assert.equal(doc.articles[0].title, r.label);
  const original = patchArticle(doc, "a1", {
    location: [{ runs: [{ text: "Localisation relue", bold: true }] }],
    measurement: plainBlocks("Mesurage adapté"),
  });
  const next = importMinute(original, [r, row("r2", "TVRD-2.7")], cat);
  assert.equal(next.articles[0].location[0].runs[0].bold, true);
  assert.equal(blocksText(next.articles[0].measurement), "Mesurage adapté");
  assert.equal(importMinute(next, [r, row("r2", "TVRD-2.7")], cat), next);
});
test("CCTP : une frappe conserve 499 articles et toutes les lignes du chantier", async () => {
  const project = upgradeProject({
    version: 1,
    title: "500 articles",
    rows: [row("r", "c")],
    cctp: {
      version: 1,
      articles: Array.from({ length: 500 }, (_, i) =>
        fromClause(cat[0], "a" + i),
      ),
    },
  });
  const next = {
    ...project,
    cctp: patchArticle(project.cctp, "a17", { title: "Titre modifié" }),
  };
  assert.equal(next.rows, project.rows);
  assert.equal(
    next.cctp.articles.filter((a, i) => a === project.cctp.articles[i]).length,
    499,
  );
  const patch = storagePatch(project, next);
  assert.equal(patch.rows.length, 0);
  assert.equal(patch.cctpWrites.length, 1);
  assert.equal(patch.cctpWrites[0].id, "a17");
  assert(!("cctp" in patch.head.data));
  assert.equal(patch.head.cctp.articleOrder.length, 500);
  const repo = createRepository(indexedDB, "cctp-" + crypto.randomUUID());
  await repo.write(storagePatch(null, project, true));
  await repo.write(patch);
  const restored = await repo.load();
  assert.equal(restored.cctp.articles.length, 500);
  assert.equal(restored.cctp.articles[17].title, "Titre modifié");
});
test("CCTP : validation côté partagé et numérotation stable par lots / sous-lots", () => {
  const a = { ...fromClause(cat[0], "a"), lotName: "Premier", lotNumber: "01" },
    b = { ...fromClause(cat[0], "b"), lotName: "Autre", lotNumber: "01" };
  const input = {
    version: 1,
    articles: [{ ...a, quantity: 999, html: "<script>x</script>" }, b],
  };
  const clean = normalizeCctp(input);
  assert(!("html" in clean.articles[0]));
  assert(!("quantity" in clean.articles[0]));
  const n = numberedArticles(clean);
  assert.equal(n[0].number, "1.1.1");
  assert.equal(n[1].number, "2.1.1");
  assert.throws(() => normalizeCctp({ articles: [a, a] }), /double/);
  assert.throws(() => normalizeCctp({ articles: Array(501).fill(a) }), /500/);
});
test("CCTP : migration IndexedDB v1 conserve le chantier puis ajoute ses clauses", async () => {
  const name = "cctp-v1-" + crypto.randomUUID();
  await new Promise((resolve, reject) => {
    const req = indexedDB.open(name, 1);
    req.onupgradeneeded = () => {
      for (const s of [
        "head",
        "rows",
        "pages",
        "revisions",
        "assets",
        "traces",
      ])
        req.result.createObjectStore(s);
    };
    req.onsuccess = () => {
      const db = req.result,
        tx = db.transaction(["head", "rows"], "readwrite");
      const p = upgradeProject({
        version: 1,
        title: "Ancien chantier",
        rows: [row("r", "c")],
      });
      tx.objectStore("head").put(
        {
          data: { ...p, rows: undefined },
          rowOrder: ["r"],
          revisionOrder: [],
          plan: null,
        },
        "current",
      );
      tx.objectStore("rows").put(p.rows[0], "r");
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
    };
    req.onerror = () => reject(req.error);
  });
  const repo = createRepository(indexedDB, name),
    p = await repo.load();
  assert.equal(p.rows[0].id, "r");
  assert.equal(p.title, "Ancien chantier");
  p.cctp = appendClause(empty(), cat[0], "clause");
  await repo.write(storagePatch(null, p, true));
  assert.equal((await repo.load()).cctp.articles[0].id, "clause");
});
test("CCTP : DOCX OOXML réel, XML échappé, gras / italique et sommaire", () => {
  const a = {
    ...fromClause(cat[0], "a"),
    title: "A & B <test>",
    measurement: plainBlocks("Mode de mesurage conservé"),
    description: [
      {
        list: "bullet",
        runs: [
          { text: "Texte en gras", bold: true },
          { text: " et italique", italic: true },
        ],
      },
    ],
  };
  const p = {
    title: "Essai <script>alert(1)</script>",
    meta: {},
    cctp: { version: 1, articles: [a] },
  };
  const files = unzipSync(createCctpDocx(p)),
    xml = strFromU8(files["word/document.xml"]);
  assert(files["[Content_Types].xml"]);
  assert(files["word/styles.xml"]);
  assert(xml.includes("&lt;script&gt;"));
  assert(!xml.includes("<script>"));
  assert(xml.includes("<w:b/>"));
  assert(xml.includes("<w:i/>"));
  assert(xml.includes("w:hyperlink"));
  assert(xml.includes("1.1.1"));
  assert(xml.includes("Mode de mesurage conservé"));
});
