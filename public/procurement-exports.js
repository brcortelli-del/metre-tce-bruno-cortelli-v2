import { saveBlob, safeName, loadScript } from './exports.js';
import { buildProcurementReport, assertProcurementExport, procurementBasisLabel, procurementCsv } from './procurement.js';
const coverage = r => `${r.assignedRows} / ${r.positiveRows} lignes positives avec composants${r.partial ? ' — LISTE PARTIELLE' : ''}`;
const fmt = n => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 6 }).format(n);

export function createProcurementWorkbook(project, report, ExcelJS) {
  assertProcurementExport(report);
  const wb = new ExcelJS.Workbook(); wb.creator = 'Atelier Métré Pro'; wb.calcProperties.fullCalcOnLoad = true;
  const needs = wb.addWorksheet('Besoins fournisseurs'), sources = wb.addWorksheet('Détail des calculs'), checks = wb.addWorksheet('Contrôles');
  const header = (sheet, labels, widths) => {
    sheet.addRow(labels); sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
    sheet.views = [{ state: 'frozen', ySplit: 1 }]; labels.forEach((_, i) => sheet.getColumn(i + 1).width = widths[i] || 22);
    sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: labels.length } };
    sheet.pageSetup = { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
  };
  header(sources, ['Réf. matériau', 'Ligne de minute', 'Quantité ouvrage signée', 'Ratio matériau', 'Perte appliquée (%)', 'Besoin net', 'Besoin retenu'], [16, 65, 25, 22, 24, 24, 24]);
  for (const [i, n] of report.needs.entries()) for (const c of n.contributions) {
    const r = sources.rowCount + 1;
    sources.addRow([i + 1, c.label, c.quantity, c.ratio, c.waste, { formula: `C${r}*D${r}`, result: c.net }, { formula: `F${r}*(1+E${r}/100)`, result: c.retained }]);
  }
  const last = sources.rowCount;
  header(needs, ['Fournisseur', 'Matériau', 'Unité', 'Besoin net', report.includeWaste ? 'Avec pertes' : 'Sans pertes', 'Qté par colis', 'Colis à prévoir', 'Colisage', 'Qté à commander', 'Surplus colisage'], [30, 55, 12, 22, 22, 22, 21, 27, 24, 24]);
  for (const [i, n] of report.needs.entries()) {
    const r = i + 2, q = `E${r}/F${r}`;
    // Tolérance identique à l'écran, limitée à l'erreur d'arrondi binaire.
    const count = `IF(E${r}<=0,0,MAX(1,IF(ABS(${q}-ROUND(${q},0))<=${8 * Number.EPSILON}*MAX(1,ABS(${q})),ROUND(${q},0),ROUNDUP(${q},0))))`;
    needs.addRow([n.supplier, n.name, n.unit,
      { formula: `SUMIF('Détail des calculs'!$A$2:$A$${last},${i + 1},'Détail des calculs'!$F$2:$F$${last})`, result: n.net },
      { formula: `SUMIF('Détail des calculs'!$A$2:$A$${last},${i + 1},'Détail des calculs'!$G$2:$G$${last})`, result: n.quantity },
      n.packSize, { formula: count, result: n.packages }, n.packLabel, { formula: `G${r}*F${r}`, result: n.orderQuantity }, { formula: `MAX(0,I${r}-E${r})`, result: n.surplus }]);
  }
  for (const sheet of [needs, sources]) sheet.eachRow((row, i) => { if (i > 1) { row.alignment = { vertical: 'top', wrapText: true }; row.eachCell(c => { if (typeof c.value === 'number' || c.value?.formula) c.numFmt = '0.######'; }); } });
  checks.columns = [{ width: 27 }, { width: 110 }];
  checks.addRows([['PRÉPARATION DE COMMANDE', project.title], ['Base', procurementBasisLabel(report.basis)], ['Pertes', report.includeWaste ? 'Incluses par composant' : 'Non appliquées'], ['Couverture', coverage(report)], ['Périmètre', 'Tous les fournisseurs. Aucun envoi. Vérifier les produits, colisages et quantités avant achat.'], ['Calculs', 'Instantané du projet. Les quantités, ratios et pertes de la feuille Détail des calculs alimentent les besoins et colis par formules.'], ...report.warnings.map(w => ['À vérifier', [w.label, w.message].filter(Boolean).join(' : ')])]);
  checks.eachRow(row => row.alignment = { vertical: 'top', wrapText: true });
  return wb;
}
const pdfText = s => String(s ?? '').replace(/[\u202f\u00a0]/g, ' ').replaceAll('−', '-').replaceAll('→', '->').replace(/[^\n\x20-\x7e\xa0-\xffœŒ€]/g, ' ');
export async function createProcurementPdf(project, report, lib) {
  assertProcurementExport(report);
  const doc = await lib.PDFDocument.create(), font = await doc.embedFont(lib.StandardFonts.Helvetica), bold = await doc.embedFont(lib.StandardFonts.HelveticaBold);
  const W = 595, H = 842, margin = 32; let page, y;
  const draw = (s, x, top, size = 9, strong = false) => page.drawText(pdfText(s), { x, y: top, size, font: strong ? bold : font });
  const wrap = (text, width, size = 9) => {
    const lines = []; let line = '';
    for (const word of pdfText(text).split(/\s+/)) for (const chunk of word.match(/.{1,28}/g) || ['']) {
      if (line && font.widthOfTextAtSize(line + ' ' + chunk, size) > width) { lines.push(line); line = chunk; } else line += (line ? ' ' : '') + chunk;
    }
    return [...lines, line];
  };
  const start = title => {
    page = doc.addPage([W, H]); y = H - margin;
    draw('PRÉPARATION DE COMMANDE', margin, y - 16, 15, true); y -= 39;
    for (const line of wrap(project.title, W - 2 * margin, 11)) { draw(line, margin, y, 11, true); y -= 15; }
    for (const line of wrap(title, W - 2 * margin)) { draw(line, margin, y); y -= 13; }
    draw(report.basis === 'physical' ? 'Base : quantités physiques nettes' : 'Base : décompte (vides pour pleins possibles)', margin, y - 4, 8); y -= 19;
    draw((report.includeWaste ? 'Pertes incluses' : 'Sans pertes') + ' | ' + coverage(report), margin, y, 8); y -= 24;
  };
  const paragraph = text => { for (const line of wrap(text, W - 2 * margin)) { if (y < 62) start('Contrôles et hypothèses - suite'); draw(line, margin, y); y -= 13; } y -= 8; };
  const groups = new Map(); for (const n of report.needs) { if (!groups.has(n.supplier)) groups.set(n.supplier, []); groups.get(n.supplier).push(n); }
  for (const [supplier, items] of groups) {
    const tableStart = () => { start('Fournisseur : ' + supplier); draw('Matériau / colisage', margin, y, 8, true); draw('Besoin retenu', 292, y, 8, true); draw('Colis', 403, y, 8, true); draw('À commander', 455, y, 8, true); y -= 13; };
    tableStart();
    for (const n of items) {
      const lines = [...wrap(n.name, 245), ...wrap(`${n.packLabel} : ${fmt(n.packSize)} ${n.unit} / colis`, 245, 8)];
      const height = Math.max(40, lines.length * 12 + 13); if (y - height < 65) tableStart();
      page.drawLine({ start: { x: margin, y }, end: { x: W - margin, y }, thickness: .4, color: lib.rgb(.8, .83, .87) });
      lines.forEach((line, i) => draw(line, margin + 3, y - 15 - i * 12, i ? 8 : 9));
      wrap(fmt(n.quantity) + ' ' + n.unit, 103, 8).forEach((line, i) => draw(line, 292, y - 15 - 11 * i, 8));
      draw(String(n.packages), 403, y - 15, 9, true); wrap(fmt(n.orderQuantity) + ' ' + n.unit, 106, 8).forEach((line, i) => draw(line, 455, y - 15 - i * 11, 8, true)); y -= height;
    }
  }
  start('Contrôles et hypothèses'); paragraph(procurementBasisLabel(report.basis) + '. La minute du projet est conservée.');
  paragraph('Colisages arrondis au supérieur, sans arrondi intermédiaire du besoin. Aucun envoi au fournisseur. Vérifier le produit et son colisage avant achat.');
  if (report.partial) paragraph('LISTE PARTIELLE : certaines lignes positives ne disposent pas de décomposition matériaux. Contrôler le périmètre des fournitures et des prestations sous-traitées.');
  for (const warning of report.warnings) paragraph([warning.label, warning.message].filter(Boolean).join(' : '));
  doc.getPages().forEach((p, i) => { p.drawText('Préparation - ' + new Date().toLocaleDateString('fr-FR') + ' - Aucun envoi', { x: margin, y: 27, size: 8, font }); p.drawText(`${i + 1} / ${doc.getPageCount()}`, { x: W - margin - 40, y: 27, size: 8, font }); });
  return doc.save();
}
export async function exportProcurement(project, options, format) {
  const report = buildProcurementReport(project, options); assertProcurementExport(report);
  const name = safeName(project.title) + '_Preparation_materiaux';
  if (format === 'csv') return saveBlob(procurementCsv(project, report), name + '.csv', 'text/csv;charset=utf-8;');
  if (format === 'xlsx') { const ExcelJS = await loadScript('/vendor/exceljs/exceljs.min.js', 'ExcelJS'); return saveBlob(await createProcurementWorkbook(project, report, ExcelJS).xlsx.writeBuffer(), name + '.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'); }
  if (format === 'pdf') { const lib = await loadScript('/vendor/pdf-lib/pdf-lib.min.js', 'PDFLib'); return saveBlob(await createProcurementPdf(project, report, lib), name + '.pdf', 'application/pdf'); }
  throw new Error('Format d’export inconnu.');
}
