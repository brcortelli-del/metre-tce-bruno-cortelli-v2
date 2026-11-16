import { calculate, csvValue } from './core.js';
import { convertUnit } from './expression.js';

// Conserver la précision jusqu'au colisage : aucun toFixed avant Math.ceil.
export function packageCount(quantity, packSize) {
  if (!Number.isFinite(quantity) || !Number.isFinite(packSize) || packSize <= 0) throw new Error('Quantité ou conditionnement invalide.');
  if (quantity <= 0) return 0;
  const q = quantity / packSize, rounded = Math.round(q);
  const count = Math.max(1, Math.abs(q - rounded) <= 8 * Number.EPSILON * Math.max(1, Math.abs(q)) ? rounded : Math.ceil(q));
  if (!Number.isSafeInteger(count)) throw new Error('Colisage trop élevé.');
  return count;
}
export const procurementBasisLabel = basis => basis === 'contractual' ? 'Quantité de décompte de la minute (vides pour pleins possibles)' : 'Quantité physique nette (toutes ouvertures saisies déduites)';
export function buildProcurementReport(project, { includeWaste = true, basis = 'physical' } = {}) {
  if (!['physical', 'contractual'].includes(basis)) throw new Error('Base de quantité invalide.');
  const blocks = new Map((project.assemblies || []).map(a => [a.id, a]));
  const map = new Map(), errors = [], warnings = [], unassigned = [];
  let positiveRows = 0, assignedRows = 0;
  const issue = (list, id, message, row) => list.push({ id, message, rowId: row?.id, label: row?.label });
  for (const row of project.rows || []) {
    const total = Number(row.result?.total);
    if (!Number.isFinite(total)) { issue(errors, 'quantity:' + row.id, 'Quantité non numérique : recalculer la ligne.', row); continue; }
    if (total > 0) positiveRows++;
    if (!row.assemblyId) {
      if (total > 0) unassigned.push(row.id);
      if (total < 0) issue(warnings, 'deduction:' + row.id, 'Déduction sans bloc : elle ne réduit aucun besoin matériau. Affecter le même bloc que l’ouvrage concerné.', row);
      continue;
    }
    const a = blocks.get(row.assemblyId);
    if (!a) { issue(errors, 'block:' + row.id, 'Ouvrage composé introuvable.', row); continue; }
    if (total > 0 && a.components?.some(c => Number(c.ratio) > 0)) assignedRows++;
    if (total > 0 && !a.components?.some(c => Number(c.ratio) > 0)) issue(warnings, 'empty:' + row.id, 'Bloc sans composant à ratio positif : aucun besoin calculé.', row);
    try {
      // Recalcul purement local : ne modifier ni la minute ni le pays du projet.
      let qty = basis === 'physical' && row.input ? calculate(row.input, project.variables || [], { country: 'france' }).total : total;
      if (basis === 'physical' && (!row.input || row.input.preset === 'reprise')) issue(warnings, 'net:' + row.id, 'Quantité reprise/importée : son caractère physiquement net reste à confirmer ; aucune ouverture n’est inventée.', row);
      qty = convertUnit(qty, row.result.unit, a.unit);
      if (a.procurementBasis === 'surplus-en-place') issue(warnings, 'earth:' + row.id, 'Évacuation : contrôler les seules terres excédentaires en place après réemploi. Ne pas appliquer deux fois le foisonnement.', row);
      for (const c of a.components || []) {
        const ratio = Number(c.ratio), waste = Number(c.waste ?? 0), packSize = Number(c.packSize ?? 1);
        if (!c.name || !c.unit || !Number.isFinite(ratio) || ratio < 0 || !Number.isFinite(waste) || waste < 0 || waste > 1000 || !Number.isFinite(packSize) || packSize <= 0) throw new Error('Ratio, perte ou conditionnement invalide pour « ' + (c.name || 'matériau sans nom') + ' ».');
        if (!ratio || !qty) continue;
        const supplier = String(c.supplier || 'À définir').trim() || 'À définir', packLabel = String(c.packLabel || 'colis');
        // Une unité, un fournisseur ou un colisage différent = une autre référence.
        const key = JSON.stringify([supplier, c.name, c.unit, packSize, packLabel]);
        const net = qty * ratio, retained = net * (includeWaste ? 1 + waste / 100 : 1);
        if (!Number.isFinite(net) || !Number.isFinite(retained)) throw new Error('Besoin matériau trop élevé.');
        if (!map.has(key)) map.set(key, { key, supplier, name: c.name, unit: c.unit, packSize, packLabel, net: 0, quantity: 0, contributions: [] });
        const item = map.get(key);
        item.net += net; item.quantity += retained; // Les déductions sont signées.
        item.contributions.push({ rowId: row.id, label: row.label, quantity: qty, ratio, waste: includeWaste ? waste : 0, net, retained });
      }
    } catch (e) { issue(errors, 'invalid:' + row.id, e.message, row); }
  }
  const needs = [];
  for (const item of map.values()) {
    try {
      const tolerance = 8 * Number.EPSILON * item.contributions.reduce((sum, c) => sum + Math.abs(c.retained), 0);
      if (item.quantity < -tolerance || item.net < -tolerance) throw new Error('Besoin négatif pour « ' + item.name + ' » : vérifier les déductions et les blocs affectés.');
      if (Math.abs(item.quantity) <= tolerance) item.quantity = 0;
      if (Math.abs(item.net) <= tolerance) item.net = 0;
      const packages = packageCount(item.quantity, item.packSize), orderQuantity = packages * item.packSize;
      if (!Number.isFinite(orderQuantity)) throw new Error('Quantité à commander trop élevée.');
      needs.push({ ...item, packages, orderQuantity, surplus: Math.max(0, orderQuantity - item.quantity) });
    } catch (e) { issue(errors, 'material:' + item.key, e.message); }
  }
  needs.sort((a, b) => a.supplier.localeCompare(b.supplier, 'fr') || a.name.localeCompare(b.name, 'fr'));
  return { needs, errors, warnings, basis, includeWaste, positiveRows, assignedRows, unassigned, partial: assignedRows < positiveRows };
}
export function assertProcurementExport(report) {
  if (report.errors.length) throw new Error('Corriger les erreurs de calcul avant l’export.');
  if (!report.needs.some(n => n.quantity > 0)) throw new Error('Aucun besoin positif à exporter.');
}
export function procurementCsv(project, report) {
  assertProcurementExport(report);
  const rows = [
    ['PRÉPARATION DE COMMANDE', project.title], ['Base', procurementBasisLabel(report.basis)],
    ['Pertes', report.includeWaste ? 'Incluses par composant' : 'Non appliquées'],
    ['Couverture', `${report.assignedRows} / ${report.positiveRows} lignes positives avec composants${report.partial ? ' — LISTE PARTIELLE' : ''}`],
    ...report.warnings.map(w => ['Vérification', [w.label, w.message].filter(Boolean).join(' : ')]),
    ['Fournisseur', 'Matériau / Fourniture', 'Besoin net', report.includeWaste ? 'Avec pertes' : 'Sans pertes', 'Unité', 'Qté par colis', 'Colis à prévoir', 'Colisage', 'Quantité à commander', 'Surplus colisage'],
    ...report.needs.map(n => [n.supplier, n.name, n.net, n.quantity, n.unit, n.packSize, n.packages, n.packLabel, n.orderQuantity, n.surplus]),
  ];
  return '\uFEFF' + rows.map(row => row.map(value => csvValue(typeof value === 'number' ? String(value).replace('.', ',') : value)).join(';')).join('\r\n');
}
const fold = text => String(text || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const absent = text => /\b(?:sans|hors|non prevu\w*|a prevoir)\b/.test(fold(text));
const rules = [
  { id: 'FOUILLES', trigger: /\b(?:fouilles?|rigoles?)\b/, groups: [
    ['terres', /\b(?:evacuation|evacuer|reemploi|stockage|remblai\w*)\b/, 'Gestion des terres à vérifier : réemploi, stockage ou évacuation des seuls excédents.'],
    ['proprete', /\b(?:proprete|preparation du fond|fond de fouille prepare)\b/, 'Vérifier la préparation du fond et le béton de propreté si le procédé et les plans le prévoient.'],
  ] },
  { id: 'CARRELAGE', trigger: /\b(?:carrelage|faience)\b/, groups: [
    ['plinthes', /\bplinthes?\b/, 'Vérifier les plinthes si prévues au projet ; elles ne sont pas incluses par la seule surface de carrelage.'],
    ['support', /\b(?:ragreage|primaires?|preparation du support)\b/, 'Vérifier l’état et la préparation du support : primaire ou ragréage selon le système retenu.'],
  ] },
  { id: 'MACONNERIE', trigger: /\b(?:parpaings?|blocs? (?:de )?beton|briques?|maconnerie)\b/, groups: [
    ['arase', /\b(?:arases?|coupure de capillarite)\b/, 'Vérifier l’arase étanche ou la coupure de capillarité prévue aux plans.'],
    ['chainages', /\bchainages?\b/, 'Vérifier les chaînages verticaux et horizontaux selon les plans de structure.'],
    ['linteaux', /\blinteaux?\b/, 'Vérifier les linteaux des baies lorsqu’ils sont nécessaires ; consulter les plans de structure.'],
  ] },
  { id: 'CLOISON', trigger: /\b(?:ba\s?13|placo|cloisons?)\b/, groups: [
    ['joints', /\b(?:bandes?|joint\w*)\b/, 'Vérifier le traitement des joints : bandes et enduit adaptés au système.'],
    ['isolant', /\b(?:isolant\w*|isolation|laine)\b/, 'Vérifier l’isolant acoustique/thermique si la composition de la cloison le prévoit.'],
  ] },
];
export function auditBTP(project, report = buildProcurementReport(project)) {
  const alerts = [...report.errors.map(e => ({ ...e, level: 'critique', title: 'Calcul à corriger' })), ...report.warnings.map(w => ({ ...w, level: 'important', title: 'Approvisionnement à vérifier' }))];
  const blocks = new Map((project.assemblies || []).map(a => [a.id, a]));
  const positive = (project.rows || []).filter(r => Number(r.result?.total) > 0);
  for (const row of project.rows || []) if (Number(row.result?.total) === 0) alerts.push({ id: 'zero:' + row.id, rowId: row.id, label: row.label, level: 'important', title: 'Quantité égale à zéro', message: 'Vérifier les cotes, le nombre et les déductions. Cette ligne ne satisfait pas les contrôles de compléments.' });
  if (report.partial) alerts.push({ id: 'coverage', level: 'important', title: 'Liste matériaux partielle', message: `${report.positiveRows - report.assignedRows} ligne(s) positive(s) sans bloc à composants positifs. Contrôler le périmètre des fournitures et des ouvrages sous-traités avant achat.` });
  for (const rule of rules) {
    const triggers = positive.filter(r => rule.trigger.test(fold(r.label)) && !absent(r.label));
    for (const building of new Set(triggers.map(r => fold(r.building).trim()))) {
      const concerned = triggers.filter(r => fold(r.building).trim() === building);
      const sameSpace = positive.filter(r => fold(r.building).trim() === building);
      for (const [id, pattern, message] of rule.groups) {
        const found = sameSpace.some(row => {
          const isTrigger = concerned.includes(row), label = fold(row.label);
          if (rule.id === 'CLOISON' && !isTrigger && /\b(?:carrelage|faience|dallage|chape)\b/.test(label)) return false;
          const explicit = !absent(label) && (!isTrigger || /\b(?:avec|compris|inclu\w*)\b/.test(label)) && pattern.test(label);
          // Le joint de carrelage ne remplace pas le joint de la cloison.
          const included = isTrigger && (blocks.get(row.assemblyId)?.components || []).some(c => {
            if (Number(c.ratio) <= 0 || absent(c.name)) return false;
            const name = fold(c.name);
            // Un ciment mentionnant « arase/sujétions » n'est pas une arase
            // étanche complète : conserver le rappel de contrôle.
            if (rule.id === 'MACONNERIE' && id === 'arase') return /\b(?:arase etanche|coupure de capillarite)\b/.test(name) && !/\b(?:ciment|mortier)\b/.test(name);
            return pattern.test(name);
          });
          return explicit || included;
        });
        if (!found) alerts.push({ id: `${rule.id}:${id}:${building}`, level: id === 'isolant' ? 'conseil' : 'important', title: 'Complément potentiellement absent', message, rowId: concerned[0].id, label: concerned[0].label, building: concerned[0].building });
      }
    }
  }
  return alerts;
}
// Exemples utilisateur à revoir, sans attribution non vérifiée aux cours.
export const PROCUREMENT_TEMPLATES = [
  { code: 'GO-02.1', name: 'Mur en blocs béton 20 cm — exemple à valider', unit: 'm²', components: [
    { name: 'Blocs béton creux 20×20×50', unit: 'u', ratio: 10, waste: 5, packSize: 50, packLabel: 'palettes' },
    { name: 'Mortier de montage prêt à l’emploi', unit: 'm³', ratio: .015, waste: 5, packSize: 1, packLabel: 'm³' },
    { name: 'Ciment CEM II 32.5 (arase/sujétions)', unit: 'kg', ratio: 2.5, waste: 5, packSize: 35, packLabel: 'sacs de 35 kg' },
  ] },
  { code: 'GO-01.1', name: 'Évacuation des terres excédentaires en place — exemple', unit: 'm³', procurementBasis: 'surplus-en-place', components: [
    { name: 'Terres foisonnées à évacuer (+25 %)', unit: 'm³', ratio: 1.25, waste: 0, packSize: 15, packLabel: 'bennes de 15 m³' },
  ] },
  { code: 'SO-05.1', name: 'Carrelage sol 60×60 — exemple à valider', unit: 'm²', components: [
    { name: 'Carrelage grès cérame 60×60', unit: 'm²', ratio: 1, waste: 10, packSize: 1.44, packLabel: 'boîtes de 1,44 m²' },
    { name: 'Mortier-colle amélioré C2', unit: 'kg', ratio: 5, waste: 10, packSize: 25, packLabel: 'sacs de 25 kg' },
    { name: 'Mortier à joint', unit: 'kg', ratio: .5, waste: 10, packSize: 5, packLabel: 'sacs de 5 kg' },
  ] },
];
