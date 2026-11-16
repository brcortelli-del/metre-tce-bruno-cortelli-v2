import { studyPrice, sellingCoefficient } from './business.js';
import { lineAmount } from './core.js';
import { convertUnit } from './expression.js';

// Hypothèses du message utilisateur : elles ne sont appliquées que sur demande
// et sur un code ET une unité compatibles, jamais en repli automatique.
export const PRICE_EXAMPLES = {
  'GO-01.1': { unit: 'm³', hours: .35, materials: 0, equipment: 18.50 },
  'GO-02.1': { unit: 'm²', hours: .85, materials: 24, equipment: 1.50 },
  'SO-05.1': { unit: 'm²', hours: .70, materials: 32, equipment: .50 },
};
export const moneyRound = value => { const rounded = Math.sign(value) * Math.round((Math.abs(value) + Number.EPSILON * Math.max(1, Math.abs(value))) * 100) / 100; return rounded === 0 ? 0 : rounded; };
export function parsePricingNumber(raw, name, { nullable = false, max = 1e9 } = {}) {
  const text = String(raw ?? '').trim();
  if (!text && nullable) return null;
  if (!/^(?:\d+(?:[.,]\d*)?|[.,]\d+)$/.test(text)) throw new Error(name + ' : saisir un nombre positif ou nul.');
  const value = Number(text.replace(',', '.'));
  if (!Number.isFinite(value) || value > max) throw new Error(name + ' : valeur trop élevée.');
  return value;
}
export function initialPriceCosts(row, project) {
  const previous = row.costs || {}, assembly = project.assemblies.find(a => a.id === row.assemblyId);
  const existing = row.pricingMode === 'study' ? studyPrice(row, project) : null;
  const factor = assembly ? convertUnit(1, row.result.unit, assembly.unit) : 1;
  return {
    materialsSource: assembly ? 'assembly' : 'manual',
    materials: existing?.materials ?? null,
    hours: assembly ? assembly.hours * factor : existing?.hours ?? null,
    equipment: assembly ? assembly.equipment * factor : existing?.equipment ?? null,
    ...previous, requireComplete: true,
  };
}
export function priceExample(row) {
  const example = PRICE_EXAMPLES[row.code];
  if (!example) return null;
  try { const factor = convertUnit(1, row.result.unit, example.unit); return { materials: example.materials * factor, hours: example.hours * factor, equipment: example.equipment * factor, materialsSource: 'manual', requireComplete: true }; }
  catch { return null; }
}
export function buildPricingReport(project) {
  const k = sellingCoefficient(project.settings), rows = [], lots = new Map();
  let totalHT = 0, totalDS = 0, totalHours = 0, studySales = 0, studied = 0, completeStudies = 0, missing = 0;
  for (const row of project.rows) {
    const study = row.pricingMode === 'study' ? studyPrice(row, project) : null;
    const pv = study ? study.missing ? null : study.pv : row.unitPrice;
    const amount = lineAmount(row.result.total, pv);
    if (amount === null) missing++;
    else totalHT += amount;
    if (study) {
      studied++;
      if (!study.missing) {
        completeStudies++;
        totalDS += row.result.total * study.ds;
        totalHours += row.result.total * study.hours;
        studySales += amount;
      }
    }
    const lot = row.lot || 'Lot à préciser';
    if (!lots.has(lot)) lots.set(lot, { name: lot, amount: 0, missing: 0, count: 0 });
    const subtotal = lots.get(lot); subtotal.count++; if (amount === null) subtotal.missing++; else subtotal.amount += amount;
    rows.push({ row, study, pv, amount, hours: study && !study.missing ? row.result.total * study.hours : null });
  }
  totalHT = moneyRound(totalHT); totalDS = moneyRound(totalDS); studySales = moneyRound(studySales);
  const tax = moneyRound(totalHT * Number(project.settings.vat) / 100);
  return { rows, lots: [...lots.values()].map(l => ({ ...l, amount: moneyRound(l.amount) })), k, missing, studied, completeStudies, totalHT, tax, totalTTC: moneyRound(totalHT + tax), totalDS, totalHours, studySales, saleCostGap: moneyRound(studySales - totalDS), complete: project.rows.length > 0 && missing === 0, costCoverage: completeStudies === project.rows.length && project.rows.length > 0 };
}
