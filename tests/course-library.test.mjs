import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import {
  catalogueIndex,
  catalogueTree,
  importMinute,
  formatSourcePages,
} from "../public/cctp-model.js";
const read = (name) =>
  JSON.parse(
    readFileSync(new URL("../public/data/" + name, import.meta.url), "utf8"),
  );
const data = read("cctp-library.json"),
  proofs = read("cctp-sources.json"),
  coverage = read("cctp-coverage.json");
const works = data.lots.flatMap((l) => l.ouvrages),
  cat = catalogueIndex(data, proofs);
const digest = (o) =>
  createHash("sha256")
    .update(JSON.stringify(sort(o)))
    .digest("hex");
const sort = (o) =>
  Array.isArray(o)
    ? o.map(sort)
    : o && typeof o === "object"
      ? Object.fromEntries(
          Object.keys(o)
            .sort()
            .map((k) => [k, sort(o[k])]),
        )
      : o;
const formula = (id, values) => {
  const f = data.formules_calcul.find((f) => f.id === id);
  assert(f, id);
  assert(f.variables.every((v) => /^[A-Za-z_][A-Za-z_0-9]*$/.test(v)));
  return new Function(
    ...f.variables,
    '"use strict";return (' + f.expression_js + ");",
  )(...f.variables.map((v) => values[v]));
};
test("cours : le Lot 01 et le dictionnaire antérieurs sont conservés", () => {
  const expected = JSON.parse(
    readFileSync(
      new URL("./fixtures/course-v1-fingerprints.json", import.meta.url),
    ),
  );
  assert.equal(digest(data.lots[0]), expected.lot01_sha256);
  assert.equal(digest(data.abreviations), expected.abreviations_sha256);
});
test("cours : JSON au schéma demandé et couverture de chaque nouvelle fiche", () => {
  assert.deepEqual(Object.keys(data).sort(), [
    "abreviations",
    "formules_calcul",
    "lots",
    "metadata",
  ]);
  assert.equal(data.lots.length, 5);
  assert.equal(works.length, 741);
  assert.equal(new Set(works.map((o) => o.code)).size, works.length);
  const byCode = new Map(proofs.ouvrages.map((p) => [p.code, p]));
  for (const o of works) {
    assert.deepEqual(Object.keys(o).sort(), [
      "clause_cctp",
      "code",
      "designation_courte",
      "formule_defaut",
      "regle_metre",
      "unite",
    ]);
    assert(byCode.has(o.code), o.code);
    assert(byCode.get(o.code).references.length, o.code);
    assert.equal(o.regle_metre.taux_perte_pourcent, null, o.code);
  }
  for (const p of proofs.ouvrages)
    for (const r of p.references) {
      assert(["L1", "L2", "L3"].includes(r.livre));
      assert.equal(r.page_pdf, r.page_cours + 2);
      assert(
        r.page_pdf > 0 && r.page_pdf <= { L1: 176, L2: 172, L3: 166 }[r.livre],
      );
    }
  assert.deepEqual(
    coverage.lots.map((l) => l.ouvrages),
    [296, 258, 84, 48, 55],
  );
});
test("cours : les 99 expressions JavaScript sont exécutables sur leurs domaines", () => {
  assert.equal(data.formules_calcul.length, 99);
  assert.equal(new Set(data.formules_calcul.map((f) => f.id)).size, 99);
  const evidence = new Set(proofs.formules_calcul.map((f) => f.id));
  for (const f of data.formules_calcul) {
    assert(evidence.has(f.id), f.id);
    const values = Object.fromEntries(
      f.variables.map((v) => [v, v === "n_pieces" ? 4 : 2]),
    );
    assert(Number.isFinite(formula(f.id, values)), f.id);
  }
  assert.equal(formula("GO_SEMELLE_ISOLEE", { N: 2, a: 2, b: 3, H: 0.5 }), 6);
  assert(
    Math.abs(formula("GO_SEMELLE_RIGIDE_H_MIN", { B: 0.8, b: 0.2 }) - 0.2) <
      1e-12,
  );
  assert.equal(formula("GO_APPUI_LINTEAU", { portee: 3 }), 0.3);
  assert.equal(formula("GO_BLONDEL", { h_cm: 17, g_cm: 28 }), 62);
  assert.equal(formula("VEN_Q_WC_UNIQUE_COLLECTIF", { n_pieces: 4 }), 30);
  assert.equal(formula("VEN_Q_TOTAL_MIN", { n_pieces: 7 }), 135);
  assert.equal(formula("VEN_Q_TOTAL_MIN", { n_pieces: 8 }), undefined);
});
test("cours : cinq lots filtrables et exemples séparés des trames", () => {
  assert.deepEqual(
    catalogueTree(cat).map((l) => l.number),
    ["01", "02", "03", "04", "05"],
  );
  const examples = cat.filter(
    (o) => o.source.kind === "exemple_pedagogique_donnees_fixes",
  );
  assert.equal(examples.length, 139);
  assert(
    cat.find((o) => o.code === "GO-F14").regle_metre.ratios_associes.length ===
      0,
  );
  assert(
    cat.find((o) => o.code === "GO-V02").regle_metre.ratios_associes.length ===
      0,
  );
  assert(
    cat.find((o) => o.code === "GO-T08").regle_metre.ratios_associes[0]
      .quantite_par_unite === 3.02,
  );
});
test("cours : un article mal classé ou un code à variantes ne préremplit pas une prescription arbitraire", () => {
  const rows = ["01.09.02", "01.02.04"].map((code, i) => ({
    id: "r" + i,
    code,
    label: "Ouvrage à préciser",
    lot: "Gros œuvre",
  }));
  const result = importMinute(
    { articles: [] },
    rows,
    cat,
    (() => {
      let i = 0;
      return () => "" + ++i;
    })(),
  );
  assert(result.articles.every((a) => a.source === null));
  assert(result.articles.every((a) => a.description.length === 0));
  const sf = importMinute(
    { articles: [] },
    [
      {
        id: "sf",
        code: "GO-F14",
        label: "SF1 — semelles du plan A",
        lot: "Gros œuvre",
        unitPrice: 98765,
        result: { total: 12345 },
      },
    ],
    cat,
  );
  assert.equal(sf.articles[0].title, "SF1 — semelles du plan A");
  assert(sf.articles[0].source.pages.includes("L1"));
  assert(!JSON.stringify(sf).includes("98765"));
  assert(!JSON.stringify(sf).includes("12345"));
});
test("cours : anomalies signalées et provenance compacte sans perte des plages", () => {
  const warnings = new Set(proofs.points_de_vigilance.map((w) => w.id));
  for (const id of [
    "SUITE_ENDUIT_UNITES",
    "SUITE_ARASE_ESCALIER",
    "SUITE_ACIER_CHAINAGE",
    "SUITE_DEBITS_VENTILATION",
  ])
    assert(warnings.has(id));
  assert.equal(
    formatSourcePages([
      { livre: "L2", page_cours: 72, page_pdf: 74 },
      { livre: "L1", page_cours: 31, page_pdf: 33 },
      { livre: "L2", page_cours: 73, page_pdf: 75 },
    ]),
    "L1 p. 31 (PDF 33) ; L2 p. 72-73 (PDF 74-75)",
  );
});
