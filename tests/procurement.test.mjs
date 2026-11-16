import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ExcelJS from 'exceljs';
import { HyperFormula } from 'hyperformula';
import { upgradeProject, validateBusiness } from '../public/business.js';
import { patchProjectRow, updateWholeProject } from '../public/project-state.js';
import { packageCount, buildProcurementReport, auditBTP, procurementCsv, PROCUREMENT_TEMPLATES } from '../public/procurement.js';
import { createProcurementWorkbook, createProcurementPdf } from '../public/procurement-exports.js';

const input = (preset, dimensions, outputUnit = 'm²', openings = []) => ({ preset, dimensions, outputUnit, openings, dimensionUnit: 'm', count: '1', deduction: '0' });
const row = (id, label, preset = 'surface', dimensions = { L: '5', w: '4' }, assemblyId = 'parpaings') => ({ id, label, lot: 'GO', unitPrice: null, assemblyId, input: input(preset, dimensions) });
const make = (rows = [row('w', 'Mur en parpaings')], extra = {}) => upgradeProject({ version: 1, title: 'Appro test', rows, ...extra });
const approx = (a, b) => assert.ok(Math.abs(a - b) < 1e-10, `${a} != ${b}`);

test('colisage sans arrondi anticipé et tolérance limitée à la précision machine', () => {
  assert.equal(packageCount(50.00001, 50), 2);
  assert.equal(packageCount(50 + Number.EPSILON * 50, 50), 1);
  assert.equal(packageCount(.1 + .2, .1), 3);
  assert.equal(packageCount(.000001, 50), 1);
  assert.throws(() => packageCount(2, 0)); assert.throws(() => packageCount(Infinity, 2));
});
test('déductions signées, pertes par composant et regroupement', () => {
  const p = make([row('w', 'Mur parpaings'), row('d', 'Déduction fenêtre', 'baies', { L: '2', w: '1' })]);
  const report = buildProcurementReport(p), n = report.needs[0];
  approx(n.net, 180); approx(n.quantity, 189); assert.equal(n.packages, 189); // colisage par défaut = 1
  assert.equal(n.contributions[1].quantity, -2);
  approx(buildProcurementReport(p, { includeWaste: false }).needs[0].quantity, 180);
  assert.equal(report.errors.length, 0);
});
test('net physique et décompte LU restent distincts, sans mutation du projet', () => {
  const r = row('w', 'Mur blocs béton', 'mur', { L: '6', h: '2.5' });
  r.input.openings = [{ w: '1.2', h: '1', n: '1' }];
  const p = make([r], { country: 'luxembourg' });
  approx(p.rows[0].result.total, 15);
  approx(buildProcurementReport(p).needs[0].net, 138);
  approx(buildProcurementReport(p, { basis: 'contractual' }).needs[0].net, 150);
  approx(p.rows[0].result.total, 15);
});
test('références distinctes si unité, fournisseur ou colisage diffèrent', () => {
  const p = make(), a = p.assemblies.find(a => a.id === 'parpaings'), c = a.components[0];
  a.components = [c, { ...c, id: 'c2', supplier: 'Autre' }, { ...c, id: 'c3', packSize: 50 }, { ...c, id: 'c4', unit: 'kg' }];
  assert.equal(buildProcurementReport(p).needs.length, 4);
});
test('conditionnement zéro interdit à la sauvegarde et export bloqué sur besoin négatif', () => {
  const p = make(); p.assemblies.find(a => a.id === 'parpaings').components[0].packSize = 0;
  assert.throws(() => validateBusiness(p), /Conditionnement/);
  assert.ok(buildProcurementReport(p).errors.length);
  const negative = make([row('d', 'Déduction', 'baies', { L: '5', w: '4' })]), r = buildProcurementReport(negative);
  assert.match(r.errors[0].message, /négatif/); assert.throws(() => procurementCsv(negative, r));
});
test('une déduction non affectée et une quantité importée restent visibles', () => {
  const p = make([row('r', 'Quantité importée', 'reprise', { Q: '20' }), row('d', 'Déduction', 'baies', { L: '1', w: '1' }, null), row('u', 'Prestation sous-traitée', 'surface', { L: '2', w: '3' }, null)]);
  const r = buildProcurementReport(p);
  assert.ok(r.partial); assert.equal(r.assignedRows, 1); assert.equal(r.positiveRows, 2);
  assert.ok(r.warnings.some(w => w.id === 'net:r')); assert.ok(r.warnings.some(w => w.id === 'deduction:d'));
});
test('audit vérifie évacuation et propreté séparément, par bâtiment', () => {
  const rows = [row('f', 'Fouilles en rigole'), row('e', 'Évacuation des terres')];
  const p = make(rows); let a = auditBTP(p);
  assert.ok(!a.some(x => x.id.startsWith('FOUILLES:terres')));
  assert.ok(a.some(x => x.id.startsWith('FOUILLES:proprete')));
  p.rows[0].building = 'A'; p.rows[1].building = 'B';
  a = auditBTP(p); assert.ok(a.some(x => x.id === 'FOUILLES:terres:a'));
});
test('audit : les lignes nulles, négatives et mentions sans ne satisfont pas un complément', () => {
  const p = make([row('f', 'Fouille en rigole'), row('p', 'Béton de propreté'), row('e', 'Sans évacuation des terres')]);
  p.rows[1].result.total = 0;
  const a = auditBTP(p);
  assert.ok(a.some(x => x.id.startsWith('FOUILLES:proprete'))); assert.ok(a.some(x => x.id.startsWith('FOUILLES:terres'))); assert.ok(a.some(x => x.id === 'zero:p'));
});
test('audit reconnaît les composants BA13 sans confondre les joints du carrelage', () => {
  const p = make([row('c', 'Cloison BA13', 'surface', { L: '5', w: '2' }, 'cloison-ba13')]);
  assert.ok(!auditBTP(p).some(x => x.id.startsWith('CLOISON:')));
  p.rows[0].assemblyId = null;
  p.rows.push({ ...p.rows[0], id: 'j', label: 'Mortier à joint du carrelage' });
  assert.ok(auditBTP(p).some(x => x.id.startsWith('CLOISON:joints')));
});
test('affectation validée et ajout d’un exemple conservent la minute et le colisage', () => {
  const p = make(), next = patchProjectRow(p, 'w', r => { r.assemblyId = 'carrelage'; });
  assert.equal(p.rows[0].assemblyId, 'parpaings'); assert.equal(next.rows[0].assemblyId, 'carrelage');
  const t = structuredClone(PROCUREMENT_TEMPLATES[0]); t.id = 'example'; t.hours = 0; t.equipment = 0;
  t.components = t.components.map((c, i) => ({ ...c, id: 'new-' + i, unitCost: null, supplier: 'Fournisseur test' }));
  const updated = updateWholeProject(p, draft => draft.assemblies.push(t));
  const result = buildProcurementReport(patchProjectRow(updated, 'w', r => { r.assemblyId = 'example'; }));
  assert.equal(result.needs.find(n => n.unit === 'u').packLabel, 'palettes');
  assert.equal(result.needs.find(n => n.unit === 'u').packages, 5);
  assert.ok(auditBTP(patchProjectRow(updated, 'w', r => { r.assemblyId = 'example'; })).some(a => a.id.startsWith('MACONNERIE:arase')));
});
test('CSV protège les noms avec guillemets et les formules Excel injectées', () => {
  const p = make(); p.title = '=HYPERLINK("test")'; p.assemblies.find(a => a.id === 'parpaings').components[0].name = 'Bloc "A"';
  const csv = procurementCsv(p, buildProcurementReport(p));
  assert.ok(csv.startsWith('\uFEFF')); assert.match(csv, /"'=HYPERLINK/); assert.match(csv, /Bloc ""A""/);
});
test('classeur indépendant : recalcul des contributions, pertes, colis et quantités commandées', async () => {
  const p = make([row('w', 'Mur'), row('d', 'Déduction', 'baies', { L: '1', w: '1' })]);
  p.assemblies.find(a => a.id === 'parpaings').components[0].packSize = 50;
  const report = buildProcurementReport(p), wb = createProcurementWorkbook(p, report, ExcelJS), loaded = new ExcelJS.Workbook();
  await loaded.xlsx.load(await wb.xlsx.writeBuffer());
  const sheets = {};
  for (const s of loaded.worksheets) sheets[s.name] = Array.from({ length: s.rowCount }, (_, r) => Array.from({ length: s.columnCount }, (_, c) => { const v = s.getCell(r + 1, c + 1).value; return v?.formula ? '=' + v.formula : v; }));
  const hf = HyperFormula.buildFromSheets(sheets, { licenseKey: 'gpl-v3', precisionRounding: 14 });
  const address = (sheet, cell) => hf.simpleCellAddressFromString(cell, hf.getSheetId(sheet));
  approx(hf.getCellValue(address('Besoins fournisseurs', 'D2')), 190);
  approx(hf.getCellValue(address('Besoins fournisseurs', 'E2')), 199.5);
  assert.equal(hf.getCellValue(address('Besoins fournisseurs', 'G2')), 4);
  assert.equal(hf.getCellValue(address('Besoins fournisseurs', 'I2')), 200);
  hf.setCellContents(address('Détail des calculs', 'C2'), [[30]]);
  assert.equal(hf.getCellValue(address('Besoins fournisseurs', 'G2')), 7);
  assert.equal(hf.getCellValue(address('Besoins fournisseurs', 'I2')), 350);
  hf.destroy();
});
test('500 lignes : total stable et export PDF multi-page lisible sans prix', async () => {
  const rows = Array.from({ length: 500 }, (_, i) => row('w' + i, 'Mur parpaings ' + i));
  const p = make(rows); const start = performance.now(), report = buildProcurementReport(p), elapsed = performance.now() - start;
  approx(report.needs[0].net, 100000); assert.equal(report.needs[0].contributions.length, 500);
  console.log(`Approvisionnement 500 lignes : ${elapsed.toFixed(1)} ms`);
  const exports = {}, module = { exports };
  new Function('exports', 'module', fs.readFileSync(new URL('../public/vendor/pdf-lib/pdf-lib.min.js', import.meta.url), 'utf8'))(exports, module);
  const component = p.assemblies.find(a => a.id === 'parpaings').components[0];
  p.assemblies.find(a => a.id === 'parpaings').components = Array.from({length:40}, (_,i) => ({...component,id:'c'+i,name:'Matériau de vérification '+i+' avec une désignation détaillée et un conditionnement fournisseur'}));
  const bytes = await createProcurementPdf(p, buildProcurementReport(p), exports), doc = await exports.PDFDocument.load(bytes);
  assert.ok(doc.getPageCount() >= 4); assert.ok(bytes.length > 1000);
  fs.mkdirSync('.sites-runtime/qa', { recursive: true }); fs.writeFileSync('.sites-runtime/qa/approvisionnement.pdf', bytes);
});
