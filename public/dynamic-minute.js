// Calcul pur : aucune exécution de JavaScript saisi par l'utilisateur.
import { evaluateExpression, convertUnit } from "./expression.js";
export const DYNAMIC_UNITS = [
  "mm",
  "cm",
  "m",
  "ml",
  "m²",
  "m³",
  "kg",
  "t",
  "u",
  "ens",
  "ft",
];
export const FORMULAS = [
  ["longueur", "Longueur", "m"],
  ["perimetre", "Périmètre rectangle", "m"],
  ["rectangle", "Rectangle / mur", "m²"],
  ["triangle", "Triangle", "m²"],
  ["trapeze", "Trapèze", "m²"],
  ["cercle", "Disque", "m²"],
  ["volume", "Pavé / dalle", "m³"],
  ["cylindre", "Cylindre", "m³"],
  ["sphere", "Sphère", "m³"],
  ["poids", "Poids : volume × masse volumique", "kg"],
  ["unites", "Unités / ensemble / forfait", "u"],
  ["libre", "Formule personnalisée", "m²"],
];
const dim = (u) =>
  ["mm", "cm", "m", "ml"].includes(u)
    ? "longueur"
    : ["m²", "m³"].includes(u)
      ? u
      : ["kg", "t"].includes(u)
        ? "poids"
        : "nombre";
export function adaptDynamicUnit(draft, unit) {
  if (!DYNAMIC_UNITS.includes(unit)) throw Error("Unité inconnue.");
  const old = draft.outputUnit || "m²",
    same = dim(old) === dim(unit);
  let next = { ...draft, outputUnit: unit };
  if (same && old !== unit) {
    const value = evaluateExpression(String(draft.deduction || "0"), old);
    next.deduction = String(convertUnit(value, old, unit));
    if (
      draft.unitPrice !== undefined &&
      draft.unitPrice !== null &&
      draft.unitPrice !== ""
    ) {
      const price = Number(String(draft.unitPrice).replace(",", "."));
      if (!Number.isFinite(price) || price < 0)
        throw Error("Prix unitaire invalide.");
      next.unitPrice = String(price / convertUnit(1, old, unit));
    }
  } else if (!same) {
    next.deduction = "0";
    next.openings = [];
    if ("unitPrice" in draft) next.unitPrice = "";
    if (draft.shape !== "libre") {
      next.shape =
        dim(unit) === "longueur"
          ? "longueur"
          : unit === "m²"
            ? "rectangle"
            : unit === "m³"
              ? "volume"
              : dim(unit) === "poids"
                ? "poids"
                : "unites";
    }
  }
  return next;
}
export function calculateDynamic(input, variables = []) {
  const d = input.dynamicMinute;
  if (!d || typeof d !== "object") throw Error("Minute dynamique manquante.");
  const unit = input.outputUnit;
  if (!DYNAMIC_UNITS.includes(unit)) throw Error("Unité dynamique inconnue.");
  const read = (v, u, name, positive = false) => {
    const n = evaluateExpression(String(v ?? "0"), u, variables);
    if (!Number.isFinite(n) || n < 0 || (positive && n === 0) || n > 1e12)
      throw Error(name + " : valeur positive requise.");
    return n;
  };
  const lengthUnit = input.dimensionUnit || "m";
  if (!["mm", "cm", "m"].includes(lengthUnit))
    throw Error("Unité de saisie invalide.");
  const v = {};
  for (const k of ["L", "w", "H", "R", "B"])
    v[k] = convertUnit(read(d[k] ?? "1", lengthUnit, k), lengthUnit, "m");
  const N = read(input.count || "1", "u", "Nombre", true),
    rho = read(
      d.rho || "0",
      "kg/m³",
      "Masse volumique à renseigner",
      d.shape === "poids",
    ),
    loss = read(d.loss || "0", "coef", "Pertes");
  if (loss > 1000 || N > 100000) throw Error("Nombre ou pertes hors limites.");
  const shape = d.shape || "rectangle";
  const defs = {
    longueur: [v.L, "m", "L"],
    perimetre: [2 * (v.L + v.w), "m", "2 × (L + l)"],
    rectangle: [
      v.L * (d.axis === "H" ? v.H : v.w),
      "m²",
      d.axis === "H" ? "L × H" : "L × l",
    ],
    triangle: [(v.L * v.H) / 2, "m²", "L × H / 2"],
    trapeze: [((v.L + v.B) * v.H) / 2, "m²", "(L + B) × H / 2"],
    cercle: [Math.PI * v.R ** 2, "m²", "π × R²"],
    volume: [v.L * v.w * v.H, "m³", "L × l × H"],
    cylindre: [Math.PI * v.R ** 2 * v.H, "m³", "π × R² × H"],
    sphere: [(4 / 3) * Math.PI * v.R ** 3, "m³", "4 / 3 × π × R³"],
    poids: [v.L * v.w * v.H * rho, "kg", "L × l × H × ρ"],
    unites: [1, "u", "1"],
  };
  let part, formula;
  if (shape === "libre") {
    const names = [
      ...Object.entries(v).map(([name, value]) => ({
        name,
        value: String(value),
        unit: "m",
      })),
      { name: "rho", value: String(rho), unit: "kg/m³" },
    ];
    part = evaluateExpression(d.expression || "", unit, [
      ...names,
      ...variables.filter((x) => !names.some((n) => n.name === x.name)),
    ]);
    formula = d.expression;
  } else {
    const def = defs[shape];
    if (!def) throw Error("Formule géométrique inconnue.");
    part = convertUnit(def[0], def[1], unit);
    formula = def[2];
  }
  if (part < 0) throw Error("Le résultat brut doit être positif.");
  const gross = N * part;
  let deduction = read(input.deduction || "0", unit, "Déduction");
  const openings = input.openings || [];
  if (!Array.isArray(openings) || openings.length > 100)
    throw Error("Maximum 100 ouvertures.");
  if (openings.length && !["m²", "m³"].includes(unit))
    throw Error("Les ouvertures nécessitent une surface ou un volume.");
  for (const o of openings) {
    const w = convertUnit(
        read(o.w, lengthUnit, "Largeur du vide"),
        lengthUnit,
        "m",
      ),
      h = convertUnit(
        read(o.h, lengthUnit, "Hauteur du vide"),
        lengthUnit,
        "m",
      ),
      n = read(o.n, "u", "Nombre de vides");
    deduction += w * h * n * (unit === "m³" ? v.w : 1);
  }
  if (deduction > gross + 1e-9)
    throw Error("Les déductions dépassent la quantité brute.");
  const net = Math.max(0, gross - deduction),
    total = net * (1 + loss / 100);
  if (!Number.isFinite(total) || total > 1e12)
    throw Error("Quantité hors limites.");
  const fmt = (n) => n.toLocaleString("fr-FR", { maximumFractionDigits: 6 });
  const steps = [
    "Minute dynamique · déductions globales, pertes sur le net.",
    ...Object.entries(v).map(([k, n]) => k + " = " + fmt(n) + " m"),
    ...(shape === "poids" ? ["ρ = " + fmt(rho) + " kg/m³"] : []),
    "N = " + fmt(N),
    "Brut : N × (" + formula + ") = " + fmt(gross) + " " + unit,
    "Déductions globales = " + fmt(deduction) + " " + unit,
    "(" +
      fmt(gross) +
      " − " +
      fmt(deduction) +
      ") × (1 + " +
      fmt(loss) +
      " / 100) = " +
      fmt(total) +
      " " +
      unit,
  ];
  return {
    gross: part,
    net: net / N,
    count: N,
    deduction: deduction / N,
    total,
    unit,
    globalGross: gross,
    globalDeduction: deduction,
    deductionScope: "global",
    formula: "N × (" + formula + ") − déductions, puis pertes",
    steps,
  };
}
export function makeDynamicRow(draft, id) {
  const label = String(draft.label || "").trim();
  if (!label || label.length > 200)
    throw Error("Désignation requise (200 caractères maximum).");
  return {
    id,
    label,
    catalogueCode: String(draft.catalogueCode || "").slice(0, 40),
    code: String(draft.code || "").slice(0, 40),
    lot: String(draft.lot || "Sans lot").slice(0, 80),
    level: String(draft.level || "").slice(0, 80),
    room: String(draft.zone || "").slice(0, 80),
    location: String(draft.zone || "").slice(0, 80),
    workColor: draft.workColor || "#2563eb",
    unitPrice: draft.unitPrice === "" ? null : draft.unitPrice,
    pricingMode: "manual",
    report: "Minute dynamique · déductions globales",
    input: {
      preset: "minute-pro",
      dimensionUnit: draft.dimensionUnit || "m",
      outputUnit: draft.outputUnit,
      count: String(draft.N || "1"),
      deduction: String(draft.deduction || "0"),
      basis: "libre",
      dimensions: { L: draft.L, w: draft.w, h: draft.H },
      openings: draft.openings || [],
      dynamicMinute: {
        ...Object.fromEntries(
          [
            "shape",
            "L",
            "w",
            "H",
            "R",
            "B",
            "rho",
            "loss",
            "axis",
            "expression",
          ].map((k) => [k, draft[k]]),
        ),
      },
    },
  };
}
