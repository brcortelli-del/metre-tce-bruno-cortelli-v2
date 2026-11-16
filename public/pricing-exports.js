import { csvValue } from './core.js';
import { buildPricingReport } from './pricing.js';
import { loadScript, saveBlob, safeName } from './exports.js';
import { convertUnit } from './expression.js';

function assertReady(report) {
  if (!report.complete) throw new Error('Compléter tous les prix avant d’exporter le chiffrage.');
}
const documentName = project => project.country === 'luxembourg' ? 'Bordereau LU' : 'DPGF';
export function pricingCsv(project) {
  const report = buildPricingReport(project); assertReady(report);
  // CSV de valeurs : pas de formules construites avec du texte utilisateur.
  // Le format XLSX ci-dessous conserve les vraies formules de calcul.
  const rows = [['Code', 'Lot', 'Désignation des ouvrages', 'Unité', 'Quantité', `PV HT (${project.settings.currency})`, `Montant HT (${project.settings.currency})`],
    ...report.rows.map(({ row, pv, amount }) => [row.code || row.rowNumber || '', row.lot, row.label, row.result.unit, row.result.total, pv, amount]),
    ['', '', 'TOTAL HT', '', '', '', report.totalHT], ['', '', `TVA (${project.settings.vat} %)`, '', '', '', report.tax], ['', '', 'TOTAL TTC', '', '', '', report.totalTTC]];
  return '\uFEFF' + rows.map(r => r.map(v => csvValue(typeof v === 'number' ? String(v).replace('.', ',') : v)).join(';')).join('\r\n');
}
export function createPricingWorkbook(project, ExcelJS, { internal = false } = {}) {
  const report = buildPricingReport(project); assertReady(report);
  const wb = new ExcelJS.Workbook(); wb.creator = 'Atelier Métré TCE'; wb.calcProperties.fullCalcOnLoad = true;
  const dpgf = wb.addWorksheet(documentName(project));
  const info = wb.addWorksheet('Fiche projet');
  const header = (sheet, labels, widths) => {
    sheet.addRow(labels); sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
    labels.forEach((_, i) => sheet.getColumn(i + 1).width = widths[i] || 22);
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: labels.length } };
    sheet.pageSetup = { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
  };
  header(info, ['Fiche projet', 'Valeur'], [30, 90]);
  info.addRows([['Chantier', project.title], ['Pays', project.country === 'luxembourg' ? 'Luxembourg' : 'France'], ['Adresse', project.meta.address], ['Client', project.meta.client], ['Maître d’œuvre', project.meta.architect], ['Date d’étude', project.meta.studyDate], ['Devise', project.settings.currency], ['TVA (%)', project.settings.vat], ['État', project.approval ? 'Chiffrage validé le ' + project.approval.date : 'Chiffrage en préparation'], ['Calculs', 'Quantités conservées sans arrondi intermédiaire. PV unitaires et montants de ligne arrondis au centime. Total HT = somme des montants de ligne.'], ['Format', internal ? 'Étude interne : contient les coûts et coefficients de vente.' : 'Bordereau client : les coûts internes et coefficients de vente sont exclus.']]);
  const references = new Map();
  if (internal) {
    const s = project.settings, settings = wb.addWorksheet('Paramètres internes');
    header(settings, ['Paramètre', 'Valeur'], [40, 25]);
    settings.addRows([['Coût horaire chargé', s.hourlyRate], ['Frais généraux (%)', s.overhead], ['Bénéfice & Aléas (%)', s.profitRisk], ['K saisi', s.k], ['Méthode de vente', s.sellMode], ['Aléas (% DS)', s.risk], ['Bénéfice (% PV)', s.margin], ['TVA (%)', s.vat], ['Coefficient K calculé', { formula: 'IF(B6="coefficient",B5,IF(B6="markup",(1+B3/100)*(1+B4/100),(1+B3/100+B7/100)/(1-B8/100)))', result: report.k }]]);
    const mats = wb.addWorksheet('Prix matériaux'); header(mats, ['Bloc', 'Matériau', 'Unité', 'Ratio', 'Perte (%)', 'Coût unitaire'], [40, 50, 14, 18, 18, 22]);
    const componentRefs = new Map();
    for (const a of project.assemblies) for (const c of a.components) { const r = mats.rowCount + 1; componentRefs.set(c.id, r); mats.addRow([a.name, c.name, c.unit, c.ratio, c.waste, c.unitCost ?? null]); }
    const details = wb.addWorksheet('Sous-détails');
    header(details, ['Code', 'Lot', 'Désignation', 'Unité', 'Quantité signée', 'Temps MO h/u', 'Coût horaire', 'Matériaux / u', 'Matériel / u', 'DS / u', 'K', 'PV HT / u', 'Montant HT', 'Heures', 'Valorisation'], [20, 25, 60, 12, 22, 22, 22, 22, 22, 22, 22, 22, 25, 22, 22]);
    for (const item of report.rows) {
      const { row, study, pv, amount, hours } = item, r = details.rowCount + 1, c = row.costs || {};
      const assembly = c.materialsSource === 'manual' ? null : project.assemblies.find(a => a.id === row.assemblyId);
      const matFormula = assembly?.components.map(component => { const z = componentRefs.get(component.id); return `'Prix matériaux'!D${z}*(1+'Prix matériaux'!E${z}/100)*'Prix matériaux'!F${z}*${convertUnit(1, row.result.unit, assembly.unit)}`; }).join('+') || '0';
      details.addRow([row.code || row.rowNumber || '', row.lot, row.label, row.result.unit, row.result.total,
        study ? study.hours : null,
        study ? c.hourlyRate == null || c.hourlyRate === '' ? { formula: "'Paramètres internes'!B2", result: study.hourly } : study.hourly : null,
        study ? assembly ? { formula: matFormula, result: study.materials } : study.materials : null,
        study ? study.equipment : null,
        study ? { formula: `H${r}+F${r}*G${r}+I${r}`, result: study.ds } : null,
        study ? c.kOverride != null && c.kOverride !== '' ? study.k : { formula: "'Paramètres internes'!B10", result: study.k } : null,
        study ? { formula: `ROUND(J${r}*K${r},2)`, result: pv } : pv,
        { formula: `ROUND(E${r}*L${r},2)`, result: amount },
        study ? { formula: `E${r}*F${r}`, result: hours } : null,
        study ? 'Étude DS × K' : 'PV saisi']);
      references.set(row.id, r);
    }
  }
  header(dpgf, ['N°', 'Index', 'Désignation', 'Unité', 'Quantité', 'PV unitaire HT', 'Montant HT', 'Lot'], [13, 22, 65, 13, 24, 24, 26, 30]);
  const ordered = report.rows.slice().sort((a, b) => (a.row.lot || '').localeCompare(b.row.lot || '', 'fr', { numeric: true }));
  for (const [i, item] of ordered.entries()) {
    const { row, pv, amount } = item, r = dpgf.rowCount + 1, sr = references.get(row.id);
    dpgf.addRow([row.rowNumber || String(i + 1), row.code || '', row.label, row.result.unit,
      internal ? { formula: `'Sous-détails'!E${sr}`, result: row.result.total } : row.result.total,
      internal ? { formula: `'Sous-détails'!L${sr}`, result: pv } : pv,
      { formula: `ROUND(E${r}*F${r},2)`, result: amount }, row.lot]);
  }
  const last = dpgf.rowCount, total = last + 1;
  dpgf.addRow(['', '', 'TOTAL HT', '', '', '', { formula: `SUM(G2:G${last})`, result: report.totalHT }]);
  dpgf.addRow(['', '', `TVA (${project.settings.vat} %)`, '', '', '', { formula: `ROUND(G${total}*'Fiche projet'!B9/100,2)`, result: report.tax }]);
  dpgf.addRow(['', '', 'TOTAL TTC', '', '', '', { formula: `G${total}+G${total + 1}`, result: report.totalTTC }]);
  dpgf.addRow([]); dpgf.addRow(['', '', 'SOUS-TOTAUX PAR LOT']);
  for (const lot of report.lots) { const r = dpgf.rowCount + 1; dpgf.addRow(['', '', lot.name, '', '', '', { formula: `SUMIF(H2:H${last},C${r},G2:G${last})`, result: lot.amount }]); }
  for (const sheet of wb.worksheets) sheet.eachRow((row, index) => { if (index > 1) { row.alignment = { vertical: 'top', wrapText: true }; row.eachCell(cell => { if (typeof cell.value === 'number' || cell.value?.formula) cell.numFmt = '#,##0.######;[Red]-#,##0.######'; cell.border = { bottom: { style: 'hair', color: { argb: 'FFE2E8F0' } } }; }); } });
  for (const c of [6, 7]) dpgf.getColumn(c).numFmt = '#,##0.00;[Red]-#,##0.00';
  [total, total + 1, total + 2].forEach(r => { dpgf.getRow(r).font = { bold: true }; });
  dpgf.autoFilter = { from: { row: 1, column: 1 }, to: { row: last, column: 8 } };
  return wb;
}
export async function exportPricing(project, format) {
  const filename = safeName(project.title) + '_' + (project.country === 'luxembourg' ? 'Bordereau_LU' : 'DPGF_FR');
  if (format === 'csv') return saveBlob(pricingCsv(project), filename + '_client.csv', 'text/csv;charset=utf-8;');
  if (!['client', 'internal'].includes(format)) throw new Error('Format inconnu.');
  const ExcelJS = await loadScript('/vendor/exceljs/exceljs.min.js', 'ExcelJS');
  const wb = createPricingWorkbook(project, ExcelJS, { internal: format === 'internal' });
  return saveBlob(await wb.xlsx.writeBuffer(), filename + (format === 'internal' ? '_ETUDE_INTERNE' : '_client') + '.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
}
