import {
  fieldsFor,
  calculate,
  parseUnitPrice,
  lineAmount,
  validateProject,
} from "./core.js";
import { validateVariables, convertUnit } from "./expression.js";
import { normalizeProjectFields } from "./project-schema.js";
const positive = (v, name, zero = true) => {
  const n = Number(String(v).replace(",", "."));
  if (!Number.isFinite(n) || n < 0 || (!zero && n === 0) || n > 1e9)
    throw new Error(name + " : nombre positif requis.");
  return n;
};
const cents = (v) => {
  const value = Math.sign(v) * Math.round((Math.abs(v) + Number.EPSILON * Math.max(1, Math.abs(v))) * 100) / 100;
  return value === 0 ? 0 : value;
};
export function sellingCoefficient(settings) {
  if (settings.sellMode === "coefficient")
    return positive(settings.k, "Coefficient K", false);
  // Majorations successives, distinctes d'un bénéfice exprimé sur le PV.
  if (settings.sellMode === "markup")
    return (1 + positive(settings.overhead, "Frais généraux") / 100) *
      (1 + positive(settings.profitRisk, "Bénéfice et aléas") / 100);
  const fg = positive(settings.overhead, "Frais généraux") / 100,
    alea = positive(settings.risk, "Aléas") / 100,
    marge = positive(settings.margin, "Bénéfice sur PV") / 100;
  if (marge >= 1)
    throw new Error("La marge sur prix de vente doit être inférieure à 100 %.");
  return (1 + fg + alea) / (1 - marge);
}
export function studyPrice(row, project) {
  const costs = row.costs || {},
    assembly = costs.materialsSource === 'manual' ? null : project.assemblies.find((a) => a.id === row.assemblyId),
    factor = assembly
      ? convertUnit(1, row.result?.unit || assembly.unit, assembly.unit)
      : 1;
  let materials = Number(costs.materials || 0),
    missing = 0;
  if (costs.materialsSource !== undefined && !['manual','assembly'].includes(costs.materialsSource)) throw new Error('Source matériaux invalide.');
  if (costs.materialsSource === 'assembly' && !assembly) missing++;
  const blank = value => value === null || value === undefined || String(value).trim() === '';
  if(costs.requireComplete) {
    if(!assembly && blank(costs.materials)) missing++;
    if(blank(costs.hours)) missing++;
    if(blank(costs.equipment)) missing++;
  }
  if(!assembly) materials=positive(costs.materials || 0, 'Matériaux');
  if (assembly) {
    materials = 0;
    for (const c of assembly.components) {
      if (c.unitCost === null || c.unitCost === undefined || c.unitCost === "")
        missing++;
      else
        materials +=
          positive(c.ratio, "Ratio") *
          (1 + positive(c.waste, "Perte") / 100) *
          positive(c.unitCost, "Coût matériau") *
          factor;
    }
  }
  const hours = positive(
      costs.hours ?? (assembly ? assembly.hours * factor : 0),
      "Temps unitaire",
    ),
    hourly = positive(
      costs.hourlyRate ?? project.settings.hourlyRate,
      "Taux horaire",
    ),
    equipment = positive(
      costs.equipment ?? (assembly ? assembly.equipment * factor : 0),
      "Matériel",
    ),
    ds = materials + hours * hourly + equipment,
    k =
      costs.kOverride === null ||
      costs.kOverride === undefined ||
      costs.kOverride === ""
        ? sellingCoefficient(project.settings)
        : positive(costs.kOverride, "K dérogatoire", false);
  return {
    materials,
    hours,
    hourly,
    equipment,
    ds,
    k,
    pv: cents(ds * k),
    missing,
  };
}
export function validateBusiness(project) {
  validateVariables(project.variables);
  const s = project.settings;
  if (!["EUR", "CHF", "USD", "GBP"].includes(s.currency))
    throw new Error("Devise non prise en charge.");
  if (positive(s.vat, "TVA") > 100)
    throw new Error("TVA comprise entre 0 et 100 %.");
  if (!["coefficient", "margin", "markup"].includes(s.sellMode))
    throw new Error("Méthode de vente invalide.");
  sellingCoefficient(s);
  positive(s.hourlyRate, "Taux horaire");
  if (
    project.lots.length > 100 ||
    project.spaces.length > 500 ||
    project.assemblies.length > 100 ||
    project.bpu.length > 5000
  )
    throw new Error("Le projet dépasse les limites de la nomenclature.");
  for (const b of project.bpu) {
    if (
      !b ||
      typeof b.label !== "string" ||
      b.label.length > 200 ||
      !b.label.trim()
    )
      throw new Error("Désignation de bordereau invalide.");
    convertUnit(1, b.unit, b.unit);
    parseUnitPrice(b.unitPrice);
  }
  const componentIds = new Set(),
    ids = new Set();
  for (const a of project.assemblies) {
    if (
      typeof a.id !== "string" ||
      !a.id ||
      ids.has(a.id) ||
      !a.name ||
      !Array.isArray(a.components) ||
      a.components.length > 100
    )
      throw new Error("Ouvrage composé invalide.");
    ids.add(a.id);
    convertUnit(1, a.unit, a.unit);
    positive(a.hours, "Temps unitaire");
    positive(a.equipment, "Matériel");
    for (const c of a.components) {
      if (typeof c.id !== "string" || componentIds.has(c.id))
        throw new Error("Identifiant de matériau invalide ou en double.");
      componentIds.add(c.id);
      if (!c.name || String(c.name).length > 200)
        throw new Error("Nom du matériau invalide.");
      convertUnit(1, c.unit, c.unit);
      positive(c.ratio, "Ratio");
      if (positive(c.waste, "Perte") > 1000)
        throw new Error("Pourcentage de perte excessif.");
      positive(c.packSize ?? 1, "Conditionnement", false);
      if(c.packLabel !== undefined && (typeof c.packLabel !== "string" || c.packLabel.length > 80)) throw new Error("Libellé de conditionnement invalide.");
      if (c.unitCost !== null && c.unitCost !== undefined && c.unitCost !== "")
        positive(c.unitCost, "Prix matériau");
    }
  }
  for (const row of project.rows) {
    if (row.assemblyId) {
      const a = project.assemblies.find((a) => a.id === row.assemblyId);
      if (!a) throw new Error("Ouvrage composé introuvable pour " + row.label);
      convertUnit(1, row.result.unit, a.unit);
    }
    if (row.pricingMode === "study") studyPrice(row, project);
  }
  return project;
}
export function recalculateProject(source) {
  const p = {
    ...source,
    ...normalizeProjectFields(source),
    rows: source.rows.map((r) => ({ ...r, input: structuredClone(r.input) })),
  };
  validateVariables(p.variables);
  if (p.rows.some((r) => r.input.planLink))
    resolvePlanLinks(p, p.planWorkspace);
  for (const row of p.rows) {
    row.result = calculate(row.input, p.variables, p);
    if (row.pricingMode === "study") {
      const study = studyPrice(row, p);
      row.unitPrice = study.missing ? null : study.pv;
    } else row.unitPrice = parseUnitPrice(row.unitPrice);
    lineAmount(row.result.total, row.unitPrice);
  }
  validateBusiness(p);
  return p;
}
export function needsBySupplier(project) {
  const map = new Map();
  for (const row of project.rows) {
    const a = project.assemblies.find((a) => a.id === row.assemblyId);
    if (!a) continue;
    const q = convertUnit(row.result.total, row.result.unit, a.unit);
    for (const c of a.components) {
      const supplier = String(c.supplier || "À définir"),
        key = [supplier, c.name, c.unit, Number(c.packSize || 1)].join("|");
      if (!map.has(key))
        map.set(key, {
          supplier,
          name: c.name,
          unit: c.unit,
          net: 0,
          quantity: 0,
          packSize: Number(c.packSize || 1),
          cost: 0,
          missing: false,
        });
      const item = map.get(key),
        qty = q * Number(c.ratio) * (1 + Number(c.waste) / 100);
      item.net += q * Number(c.ratio);
      item.quantity += qty;
      if (c.unitCost === null || c.unitCost === undefined || c.unitCost === "")
        item.missing = true;
      else item.cost += qty * Number(c.unitCost);
    }
  }
  return [...map.values()]
    .map((n) => ({
      ...n,
      packages: Math.max(0, Math.ceil((n.quantity - 1e-10) / n.packSize)),
      cost: cents(n.cost),
    }))
    .sort(
      (a, b) =>
        a.supplier.localeCompare(b.supplier, "fr") ||
        a.name.localeCompare(b.name, "fr"),
    );
}
export function financialSummary(project) {
  let ht = 0,
    ds = 0,
    missing = 0,
    hours = 0;
  for (const r of project.rows) {
    const amount = lineAmount(r.result.total, r.unitPrice);
    if (amount === null) missing++;
    else ht += amount;
    if (r.pricingMode === "study") {
      const s = studyPrice(r, project);
      ds += r.result.total * s.ds;
      hours += r.result.total * s.hours;
    }
  }
  ht = cents(ht);
  const tax = cents((ht * Number(project.settings.vat)) / 100);
  return { ht, tax, ttc: cents(ht + tax), ds: cents(ds), hours, missing };
}
export function revisionLabel(index) {
  let n = index + 1,
    label = "";
  while (n > 0) {
    n--;
    label = String.fromCharCode(65 + (n % 26)) + label;
    n = Math.floor(n / 26);
  }
  return "Indice " + label;
}
export function snapshotProject(project, label) {
  const data = structuredClone(project);
  data.revisions = [];
  data.cloudId = null;
  data.cloudVersion = 0;
  return {
    id: crypto.randomUUID(),
    label: label || revisionLabel(project.revisions.length),
    createdAt: new Date().toISOString(),
    data,
  };
}
export function resolvePlanLinks(copy, state) {
  const traces = Object.entries(state?.pages || {}).flatMap(([page, p]) =>
    p.traces.map((t) => ({
      ...t,
      page: Number(page),
      reference: p.reference || 1,
    })),
  );
  copy.planWorkspace = state;
  for (const row of copy.rows) {
    const link = row.input.planLink;
    if (!link) continue;
    const terms = link.terms || [link];
    let value = 0,
      firstTotal = 0,
      all = [];
    const expressions = [];
    for (const term of terms) {
      const selected = traces.filter((t) =>
        term.ids ? term.ids.includes(t.id) : t.purpose === term.purpose,
      );
      if (!selected.length)
        throw new Error(
          "Le relevé lié à « " +
            row.label +
            " » est absent. Détache la ligne avant de supprimer ce relevé.",
        );
      const total = selected.reduce(
        (s, t) => s + Number(String(t.retained ?? t.value).replace(",", ".")),
        0,
      );
      if (!all.length) firstTotal = total;
      all.push(...selected);
      value +=
        (total * (term.width ?? 1) - (term.correction ?? 0)) *
        (term.factor ?? 1);
      expressions.push(
        `(${total} × ${term.width ?? 1} − ${term.correction ?? 0}) × ${term.factor ?? 1}`,
      );
    }
    if (value < 0)
      throw new Error(
        "La correction de plan dépasse la mesure pour " + row.label,
      );
    const field = link.field,
      kind =
        fieldsFor(row.input.preset, row.input.outputUnit).find(
          (f) => f[0] === field,
        )?.[2] ?? "m",
      factor =
        kind === "m"
          ? { m: 1, cm: 0.01, mm: 0.001 }[row.input.dimensionUnit]
          : 1;
    row.input.dimensions[field] = String(value / factor);
    row.input.planMeasurement = {
      fileName: state?.fileName || "Plan",
      page: all[0]?.page || 1,
      label: all
        .map((t) => t.label || t.id)
        .join(", ")
        .slice(0, 80),
      reference: all[0]?.reference || 1,
      unit: all[0]?.unit || "m",
      ...row.input.planMeasurement,
      value: firstTotal,
      manual: all.every((t) => t.manual || t.retained !== undefined),
      method:
        "Liaison au plan recalculée : " +
        expressions.join(" + ") +
        " = " +
        value,
    };
  }
  return copy;
}
export function applyPlanLinks(project, state) {
  return recalculateProject({ ...project, planWorkspace: state });
}
export function upgradeProject(data) {
  return recalculateProject({
    ...validateProject(data),
    ...normalizeProjectFields(data),
  });
}
