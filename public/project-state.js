import { calculate, lineAmount, parseUnitPrice } from "./core.js";
import {
  studyPrice,
  recalculateProject,
  resolvePlanLinks,
} from "./business.js";
import { convertUnit } from "./expression.js";

/** Transaction locale : seules les lignes touchées changent d'identité.
 * Les tableaux DOM et IndexedDB peuvent ainsi comparer des références, sans
 * sérialiser le chantier ni recalculer les 499 autres lignes à chaque touche. */
export function recalculateRow(row, project) {
  const next = { ...row, input: structuredClone(row.input) };
  if (next.input.planLink)
    resolvePlanLinks({ rows: [next] }, project.planWorkspace);
  next.result = calculate(next.input, project.variables, project);
  if (next.assemblyId) {
    const assembly = project.assemblies.find((a) => a.id === next.assemblyId);
    if (!assembly) throw new Error("Ouvrage composé introuvable.");
    convertUnit(1, next.result.unit, assembly.unit);
  }
  if (next.pricingMode === "study") {
    const price = studyPrice(next, project);
    next.unitPrice = price.missing ? null : price.pv;
  } else next.unitPrice = parseUnitPrice(next.unitPrice);
  lineAmount(next.result.total, next.unitPrice);
  return next;
}

export function patchProjectRow(project, id, mutate) {
  const index = project.rows.findIndex((row) => row.id === id);
  if (index < 0) throw new Error("Ligne introuvable.");
  const {importSource,...editable}=project.rows[index];
  // La provenance CAO/BIM est immuable et peut décrire des milliers d’objets.
  // Une frappe ne la recopie pas ; seuls les champs éditables sont clonés.
  const draft = {...structuredClone(editable),...(importSource?{importSource}:{})};
  mutate(draft);
  const row = recalculateRow(draft, project);
  const rows = project.rows.slice();
  rows[index] = row;
  return { ...project, rows, approval: null };
}

export function insertProjectRows(project, additions) {
  if (project.rows.length + additions.length > 2000)
    throw new Error("Maximum 2 000 lignes.");
  const ids = new Set(project.rows.map((row) => row.id));
  const rows = additions.map((row) => {
    if (ids.has(row.id)) throw new Error("Identifiant de ligne en double.");
    ids.add(row.id);
    return recalculateRow(row, project);
  });
  return { ...project, rows: [...project.rows, ...rows], approval: null };
}

export function patchProjectPlan(project, planWorkspace, change = {}) {
  const ids = new Set(change.traceIds || []),
    purposes = new Set(change.purposes || []);
  const all = change.all === true;
  const base = { ...project, planWorkspace, approval: null };
  // Zoom, page sélectionnée, paramètres de préparation : aucun calcul affecté.
  if (!all && !ids.size && !purposes.size) return base;
  let affected = 0;
  const rows = project.rows.map((row) => {
    const link = row.input.planLink;
    if (
      !link ||
      (!all &&
        !(link.terms || [link]).some((term) =>
          term.ids
            ? term.ids.some((id) => ids.has(id))
            : purposes.has(term.purpose),
        ))
    )
      return row;
    affected++;
    return recalculateRow(row, base);
  });
  return affected ? { ...base, rows } : base;
}

/** Les modifications réellement globales (variables, coefficients, bibliothèque)
 * passent par le moteur complet ; elles ne constituent pas le chemin de saisie. */
export function updateWholeProject(project, mutate) {
  const draft = structuredClone(project);
  mutate(draft);
  draft.approval = null;
  return recalculateProject(draft);
}
