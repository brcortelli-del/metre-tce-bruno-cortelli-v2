import test from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import { HyperFormula } from 'hyperformula';
import { upgradeProject, studyPrice, sellingCoefficient, financialSummary } from '../public/business.js';
import { patchProjectRow, updateWholeProject } from '../public/project-state.js';
import { buildPricingReport, initialPriceCosts, priceExample, parsePricingNumber } from '../public/pricing.js';
import { createPricingWorkbook, pricingCsv } from '../public/pricing-exports.js';
import { createWorkbook } from '../public/exports.js';
const row = (id, code, unit, quantity) => ({ id, code, label: 'Ouvrage ' + id, lot: id === 'f' ? '01 Terrassement' : '02 Gros œuvre', unitPrice: null, input: { preset: 'reprise', outputUnit: unit, dimensionUnit: 'm', dimensions: { Q: String(quantity) }, count: '1', deduction: '0', openings: [] } });
const make = () => upgradeProject({ version: 1, title: 'Chiffrage test', settings: { hourlyRate: 42, sellMode: 'markup', overhead: 15, profitRisk: 10, vat: 20 }, rows: [row('f', 'GO-01.1', 'm³', 14.5), row('w', 'GO-02.1', 'm²', 43.26), row('c', 'SO-05.1', 'm²', 24)] });
const priced = () => { let p = make(); for (const r of p.rows) p = patchProjectRow(p, r.id, draft => { draft.pricingMode = 'study'; draft.costs = priceExample(draft); }); return p; };
const approx = (a, b) => assert.ok(Math.abs(a - b) < 1e-10, `${a} != ${b}`);
const engine = wb => { const sheets = {}; for (const s of wb.worksheets) sheets[s.name] = Array.from({ length: s.rowCount }, (_, r) => Array.from({ length: s.columnCount }, (_, c) => { const v = s.getCell(r + 1, c + 1).value; return v?.formula ? '=' + v.formula : typeof v === 'string' && v.startsWith('=') ? "'" + v : v; })); return HyperFormula.buildFromSheets(sheets, { licenseKey: 'gpl-v3', precisionRounding: 14 }); };
const addr = (hf, sheet, cell) => hf.simpleCellAddressFromString(cell, hf.getSheetId(sheet));
const value = (hf, sheet, cell) => hf.getCellValue(addr(hf, sheet, cell));

test('K : trois méthodes distinctes, sans écraser les projets existants', () => {
  const p = make(); approx(sellingCoefficient(p.settings), 1.265);
  approx(sellingCoefficient({ ...p.settings, sellMode: 'margin', risk: 3, margin: 10 }), 1.18 / .9);
  assert.equal(sellingCoefficient({ ...p.settings, sellMode: 'coefficient', k: 1.3 }), 1.3);
  assert.equal(upgradeProject({ version: 1, rows: [] }).settings.k, 1.3);
});
test('sous-détails fournis, arrondis par prix unitaire et montant, totaux cohérents', () => {
  const p = priced(), r = buildPricingReport(p);
  assert.equal(r.complete, true); assert.equal(r.completeStudies, 3);
  approx(studyPrice(p.rows[0], p).ds, 33.2); assert.equal(p.rows[0].unitPrice, 42);
  approx(studyPrice(p.rows[1], p).ds, 61.2); assert.equal(p.rows[1].unitPrice, 77.42);
  approx(studyPrice(p.rows[2], p).ds, 61.9); assert.equal(p.rows[2].unitPrice, 78.3);
  assert.equal(r.totalHT, 5837.39); assert.equal(r.tax, 1167.48); assert.equal(r.totalTTC, 7004.87);
  approx(r.totalHours, 58.646); assert.equal(r.totalDS, 4614.51); assert.equal(r.saleCostGap, 1222.88);
  assert.equal(financialSummary(p).ht, r.totalHT); assert.equal(financialSummary(p).tax, r.tax);
});
test('aucun coût fictif : nouvelle ligne sans code connu et sous-détail incomplet', () => {
  let p = make(); p.rows[0].code = 'INCONNU'; assert.equal(priceExample(p.rows[0]), null);
  const costs = initialPriceCosts(p.rows[0], p); assert.equal(costs.materials, null); assert.equal(costs.hours, null); assert.equal(costs.equipment, null);
  p = patchProjectRow(p, 'f', row => { row.pricingMode = 'study'; row.costs = costs; });
  assert.equal(p.rows[0].unitPrice, null); assert.equal(studyPrice(p.rows[0], p).missing, 3);
  assert.throws(() => pricingCsv(p), /Compléter/);
  p = patchProjectRow(p, 'f', row => { row.costs = { ...row.costs, hours: 0, materials: 0, equipment: 0 }; });
  assert.equal(p.rows[0].unitPrice, 0); assert.equal(studyPrice(p.rows[0], p).missing, 0);
});
test('coût direct et bloc : garder le lien approvisionnement et refuser les prix manquants', () => {
  let p = make(); p = patchProjectRow(p, 'w', row => { row.assemblyId = 'parpaings'; row.pricingMode = 'study'; row.costs = priceExample(row); });
  assert.equal(p.rows[1].assemblyId, 'parpaings'); assert.equal(studyPrice(p.rows[1], p).materials, 24);
  p = patchProjectRow(p, 'w', row => { row.costs.materialsSource = 'assembly'; });
  assert.equal(p.rows[1].unitPrice, null);
  p = updateWholeProject(p, next => { next.assemblies.find(a => a.id === 'parpaings').components[0].unitCost = 2; });
  assert.equal(studyPrice(p.rows[1], p).materials, 21); assert.equal(p.rows[1].unitPrice, 73.62);
});
test('taux global lié, exceptions de ligne prioritaires, prix manuels conservés', () => {
  let p = priced(); p = patchProjectRow(p, 'f', r => { r.costs.hourlyRate = 50; });
  p = patchProjectRow(p, 'c', r => { r.pricingMode = 'manual'; r.unitPrice = 100; });
  p = updateWholeProject(p, next => { next.settings.hourlyRate = 45; next.settings.overhead = 20; });
  assert.equal(studyPrice(p.rows[0], p).hourly, 50); assert.equal(studyPrice(p.rows[1], p).hourly, 45); assert.equal(p.rows[2].unitPrice, 100);
});
test('saisie française stricte, négatifs et syntaxe partielle refusés', () => {
  assert.equal(parsePricingNumber('0,85', 'Temps'), .85); assert.equal(parsePricingNumber('', 'Matériaux', { nullable: true }), null);
  for (const input of ['-2', '12abc', '1e3', '', 'Infinity']) assert.throws(() => parsePricingNumber(input, 'Coût'));
  assert.throws(() => parsePricingNumber('101', 'TVA', { max: 100 }));
});
test('déductions et TVA négative : mêmes arrondis que ROUND d’Excel', () => {
  const p = priced(); p.rows[0].result.total = -1; p.rows[0].pricingMode = 'manual'; p.rows[0].unitPrice = .1; p.rows = [p.rows[0]]; p.settings.vat = 5;
  const report = buildPricingReport(p); assert.equal(report.totalHT, -.1); assert.equal(report.tax, -.01); assert.equal(financialSummary(p).tax, -.01);
});
test('export client : vraies formules, quantités précises, aucun sous-détail confidentiel', async () => {
  const p = priced(); p.assemblies[0].components[0].name = 'CONFIDENTIEL-FOURNISSEUR';
  const wb = createPricingWorkbook(p, ExcelJS), loaded = new ExcelJS.Workbook(); await loaded.xlsx.load(await wb.xlsx.writeBuffer());
  assert.deepEqual(loaded.worksheets.map(s => s.name), ['DPGF', 'Fiche projet']);
  assert.ok(!JSON.stringify(loaded.model).includes('CONFIDENTIEL-FOURNISSEUR'));
  assert.equal(loaded.getWorksheet('DPGF').getCell('E3').value, 43.26);
  const hf = engine(loaded); assert.equal(value(hf, 'DPGF', 'G5'), 5837.39); assert.equal(value(hf, 'DPGF', 'G7'), 7004.87);
  hf.setCellContents(addr(hf, 'DPGF', 'E3'), [[50]]); assert.equal(value(hf, 'DPGF', 'G3'), 3871); hf.destroy();
});
test('export interne : FG, temps MO, taux horaire et PU recalculés indépendamment', () => {
  const p = priced(), wb = createPricingWorkbook(p, ExcelJS, { internal: true }), hf = engine(wb);
  approx(value(hf, 'Paramètres internes', 'B10'), 1.265); assert.equal(value(hf, 'DPGF', 'G5'), 5837.39);
  hf.setCellContents(addr(hf, 'Paramètres internes', 'B2'), [[45]]);
  assert.equal(value(hf, 'Sous-détails', 'L3'), 80.64);
  hf.setCellContents(addr(hf, 'Paramètres internes', 'B3'), [[20]]);
  approx(value(hf, 'Paramètres internes', 'B10'), 1.32);
  assert.equal(value(hf, 'Sous-détails', 'L3'), 84.15); hf.destroy();
});
test('export global historique : nouveau K et coûts directs même avec un bloc affecté', async () => {
  let p = priced(); p = patchProjectRow(p, 'w', r => { r.assemblyId = 'parpaings'; });
  const hf = engine(await createWorkbook(p, ExcelJS));
  approx(value(hf, 'Paramètres', 'B9'), 1.265); assert.equal(value(hf, 'Étude de prix', 'C3'), 24); assert.equal(value(hf, 'Minute', 'P3'), 77.42); hf.destroy();
});
test('CSV protège les textes, mode LU et TVA saisie restent indépendants du pays', () => {
  const p = priced(); p.country = 'luxembourg'; p.settings.vat = 10; p.rows[0].label = '=TEST("X")';
  assert.match(pricingCsv(p), /"'=TEST\(""X""\)/); assert.equal(p.settings.vat, 10);
  const wb = createPricingWorkbook(p, ExcelJS); assert.equal(wb.worksheets[0].name, 'Bordereau LU');
});
test('500 lignes : seule la cellule chiffrée change d’identité', () => {
  const base = priced(), item = base.rows[1]; base.rows = Array.from({ length: 500 }, (_, i) => ({ ...item, id: 'r' + i }));
  const next = patchProjectRow(base, 'r250', r => { r.costs.hours = 1; });
  assert.equal(next.rows[249], base.rows[249]); assert.notEqual(next.rows[250], base.rows[250]);
  const start = performance.now(), report = buildPricingReport(next); console.log(`Chiffrage 500 lignes : ${(performance.now() - start).toFixed(1)} ms`); assert.equal(report.completeStudies, 500);
});
