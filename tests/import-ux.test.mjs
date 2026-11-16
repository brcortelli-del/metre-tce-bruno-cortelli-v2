import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { createRequire } from "node:module";
import DxfParser from "dxf-parser";
import {
  parseCsv,
  decodeTable,
  guessColumns,
  mapTable,
  groupRecords,
  buildImportedRows,
  numericQuantity,
  dxfMeasurements,
} from "../public/import-core.js";
import { createHistory } from "../public/history.js";
import { GEOMETRIES, geometryExpression } from "../public/formula-assistant.js";
import {
  evaluateExpression,
  compileExcelExpression,
} from "../public/expression.js";
import { extractIfc } from "../ux/ifc-extract.js";
import { upgradeProject } from "../public/business.js";
import { insertProjectRows } from "../public/project-state.js";
import { importMinute } from "../public/cctp-model.js";
test("CSV français : BOM, guillemets, lignes internes et unités distinctes", () => {
  const t = parseCsv(
    '\ufeffFamille;Type;Niveau;Longueur [mm];Surface [m2]\r\n"Murs; façade";"Type ""A""";RDC;1250;"2,5"\r\n"Murs\nintérieurs";A;R+1;1000;3\r\n',
  );
  const c = guessColumns(t.headers);
  assert.equal(c.length, 3);
  assert.equal(c.area, 4);
  const r = mapTable(t, c);
  assert.equal(r.records[0].family, "Murs; façade");
  assert.equal(r.records[0].type, 'Type "A"');
  assert.equal(r.records[0].measures.Longueur.value, 1.25);
  assert.equal(r.records[0].measures.Surface.value, 2.5);
  assert.throws(() => parseCsv('A;B\n"abc;def'), /guillemet/);
  assert.throws(() => numericQuantity("=2+3", "m", "length"), /numérique/);
  assert.throws(() => numericQuantity("2", "m2", "volume"), /incompatible/);
});
test("unités manquantes et groupes partiels bloquent une injection, sans mutation", () => {
  const t = parseCsv("Famille;Surface\nMurs;20\nMurs;\n"),
    c = guessColumns(t.headers);
  let g = groupRecords(mapTable(t, c, { area: "m2" }).records);
  const mapping = {
    [g[0].id]: {
      include: true,
      measure: "Surface",
      lot: "Gros œuvre",
      label: "Murs",
    },
  };
  assert.throws(() => buildImportedRows(g, mapping, "test.csv"), /valide/);
  assert.throws(() => numericQuantity("20", "", "area"), /préciser/);
  assert.equal(
    decodeTable(new Uint8Array([255, 254, 65, 0, 59, 0, 66, 0]).buffer),
    "A;B",
  );
});
test("DXF réel : couches, périmètre, surface fermée et blocs, conversion mm", async () => {
  const d = new DxfParser().parseSync(
    await fs.readFile("public/examples/autocad.dxf", "utf8"),
  );
  const r = dxfMeasurements(d);
  assert.equal(r.detectedUnit, "m");
  assert.equal(r.records.length, 3);
  assert.equal(r.records[0].measures["Surface fermée DXF"].value, 80);
  assert.equal(r.records[0].measures["Longueur DXF"].value, 36);
  assert.equal(r.records[1].measures["Longueur DXF"].value, 10);
  assert.equal(r.records[2].measures["Blocs INSERT"].value, 1);
  const mm = dxfMeasurements(d, "mm");
  assert.equal(mm.records[1].measures["Longueur DXF"].value, 0.01);
  assert.ok(
    Math.abs(mm.records[0].measures["Surface fermée DXF"].value - 80e-6) <
      1e-15,
  );
});
test("DXF : aire exacte des bulges et rejet des polylignes 3D", () => {
  const d = {
    header: { $INSUNITS: 6 },
    entities: [
      {
        type: "LWPOLYLINE",
        shape: true,
        vertices: [
          { x: -1, y: 0, bulge: 1 },
          { x: 1, y: 0, bulge: 1 },
        ],
      },
      {
        type: "POLYLINE",
        is3dPolyline: true,
        vertices: [
          { x: 0, y: 0 },
          { x: 1, y: 0 },
        ],
      },
    ],
  };
  const r = dxfMeasurements(d);
  assert.equal(r.records.length, 1);
  assert.ok(
    Math.abs(r.records[0].measures["Surface fermée DXF"].value - Math.PI) <
      1e-12,
  );
});
test("IFC réel : WASM, quantités distinctes, type et niveau, sans géométrie", async () => {
  const require = createRequire(import.meta.url),
    IFC = require("web-ifc"),
    api = new IFC.IfcAPI();
  await api.Init();
  let id = -1;
  try {
    id = api.OpenModel(
      new Uint8Array(await fs.readFile("public/examples/mur-qto.ifc")),
    );
    const r = extractIfc(api, id, IFC);
    assert.equal(r.records.length, 1);
    const row = r.records[0];
    assert.equal(row.type, "Mur béton 20");
    assert.equal(row.level, "RDC");
    assert.equal(row.building, "Bâtiment A");
    assert.equal(
      row.measures[
        "Qto_WallBaseQuantities.NetVolume · Quantités nettes exportées"
      ].value,
      5,
    );
    assert.equal(
      row.measures[
        "Qto_WallBaseQuantities.NetSideArea · Quantités nettes exportées"
      ].value,
      25,
    );
    assert.equal(row.measures["Instances IFC"].value, 1);
  } finally {
    if (id >= 0) api.CloseModel(id);
    api.Dispose();
  }
});
test("IFC : unité explicite prioritaire et préfixes SI à la bonne puissance", async () => {
  const require = createRequire(import.meta.url), IFC = require('web-ifc'), api = new IFC.IfcAPI();
  await api.Init(); let id = -1;
  try {
    let text = await fs.readFile('public/examples/mur-qto.ifc','utf8');
    text = text.replace('.LENGTHUNIT.,$,.METRE.', '.LENGTHUNIT.,.MILLI.,.METRE.')
      .replace('.VOLUMEUNIT.,$,.CUBIC_METRE.', '.VOLUMEUNIT.,.MILLI.,.CUBIC_METRE.')
      .replace("'Length',$,$,10.,$", "'Length',$,$,10000.,$")
      .replace("'NetSideArea',$,$,25.,$", "'NetSideArea',$,#21,25.,$")
      .replace('#20=IFCRELDEFINESBYTYPE', '#21=IFCSIUNIT(*,.AREAUNIT.,.CENTI.,.SQUARE_METRE.);\n#20=IFCRELDEFINESBYTYPE');
    id = api.OpenModel(new TextEncoder().encode(text));
    const r = extractIfc(api,id,IFC).records[0].measures;
    assert.equal(r['Qto_WallBaseQuantities.Length · Quantités nettes exportées'].value,10);
    assert.equal(r['Qto_WallBaseQuantities.NetSideArea · Quantités nettes exportées'].value,.0025);
    assert.ok(Math.abs(r['Qto_WallBaseQuantities.NetVolume · Quantités nettes exportées'].value-5e-9)<1e-20);
  } finally { if(id>=0) api.CloseModel(id); api.Dispose(); }
});
test("injection de 500 groupes et CCTP : valeurs conservées, un article par code, provenance", () => {
  const records = Array.from({ length: 500 }, (_, i) => ({
    id: "r" + i,
    layer: "Calque" + i,
    type: "Mur",
    label: "Mur",
    measures: { Surface: { value: 2, unit: "m²" } },
  }));
  const groups = groupRecords(records);
  const maps = Object.fromEntries(
    groups.map((g) => [
      g.id,
      {
        include: true,
        lot: "Gros œuvre",
        measure: "Surface",
        workCode: "GO-1",
        workUnit: "m²",
        label: "Mur",
      },
    ]),
  );
  let id = 0;
  const rows = buildImportedRows(groups, maps, "500.csv", () => String(++id));
  const p = upgradeProject({ version: 1, title: "Témoin", rows: [] });
  const next = insertProjectRows(p, rows);
  const cctp = importMinute(p.cctp, next.rows, [], () => String(++id));
  assert.equal(p.rows.length, 0);
  assert.equal(next.rows.length, 500);
  assert.equal(
    next.rows.reduce((s, r) => s + r.result.total, 0),
    1000,
  );
  assert.equal(cctp.articles.length, 1);
  assert.equal(cctp.articles[0].rowIds.length, 500);
  assert.equal(next.rows[0].importSource.objects[0].id, "r0");
  assert.ok(!JSON.stringify(cctp).includes("quantity"));
});
test("historique : saisie groupée, branche redo invalidée, références partagées", () => {
  let clock = 0;
  const h = createHistory(3, () => clock),
    a = { rows: [] },
    b = { rows: [1] },
    c = { rows: [2] },
    d = { rows: [3] };
  h.record(a, b, "cell");
  clock = 10;
  h.record(b, c, "cell");
  assert.deepEqual(h.state(), { undo: 1, redo: 0 });
  assert.equal(h.undo(c), a);
  assert.equal(h.redo(a), c);
  h.record(c, d);
  assert.equal(h.undo(d), c);
  h.record(c, b);
  assert.equal(h.redo(b), null);
});
test("assistant : dimensions typées, variables réutilisables, PI exportable", () => {
  const vars = [{ name: "HSP", value: "2.5", unit: "m" }],
    g = GEOMETRIES.find((g) => g.id === "trapeze");
  const formula = geometryExpression(g, { B: "10/2", b: "3", H: "HSP" }, vars);
  assert.equal(evaluateExpression(formula, "m²", vars), 10);
  assert.equal(
    evaluateExpression(formula, "m²", [{ ...vars[0], value: "3" }]),
    12,
  );
  assert.ok(
    Math.abs(evaluateExpression("PI * 2m ^ 2", "m²") - Math.PI * 4) < 1e-12,
  );
  assert.match(
    compileExcelExpression("PI * 2m ^ 2", "m²", [], {}).formula,
    /PI\(\)/,
  );
  assert.throws(
    () => geometryExpression(g, { B: "1", b: "2", H: "-1" }),
    /positive/,
  );
});
