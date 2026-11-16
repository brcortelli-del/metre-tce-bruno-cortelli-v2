/** Noyau d'import pur et testable. Les données CAO/BIM restent des mesures
 * exportées : pas de déduction de baie ajoutée une seconde fois. */
export const MAX_IMPORT_BYTES = 35 * 1024 * 1024;
export const MAX_IMPORT_RECORDS = 20000;
export const METRICS = {
  length: "Longueur",
  area: "Surface",
  volume: "Volume",
  count: "Comptage",
};
const trim = (v) => String(v ?? "").trim();
const norm = (v) =>
  trim(v)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
export function decodeTable(buffer) {
  const b = new Uint8Array(buffer);
  return new TextDecoder(
    b[0] === 255 && b[1] === 254
      ? "utf-16le"
      : b[0] === 254 && b[1] === 255
        ? "utf-16be"
        : "utf-8",
    { fatal: true },
  )
    .decode(b)
    .replace(/^\uFEFF/, "");
}
export function parseCsv(text) {
  text = String(text).replace(/^\uFEFF/, "");
  if (text.length > MAX_IMPORT_BYTES)
    throw new Error("Tableau trop volumineux (35 Mo maximum).");
  const counts = new Map([
    [";", 0],
    [",", 0],
    ["\t", 0],
  ]);
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') i++;
      else quoted = !quoted;
    } else if (!quoted && /[\r\n]/.test(c)) break;
    else if (!quoted && counts.has(c)) counts.set(c, counts.get(c) + 1);
  }
  const delimiter = [...counts].sort((a, b) => b[1] - a[1])[0][0];
  const rows = [];
  let row = [],
    cell = "",
    inQuote = false,
    closed = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuote) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuote = false;
          closed = true;
        }
      } else cell += c;
    } else if (c === '"' && !cell && !closed) inQuote = true;
    else if (c === delimiter || c === "\n" || c === "\r") {
      row.push(cell);
      cell = "";
      closed = false;
      if (c !== delimiter) {
        if (row.some((x) => trim(x))) rows.push(row);
        row = [];
        if (c === "\r" && text[i + 1] === "\n") i++;
      }
    } else {
      if (closed && !/\s/.test(c))
        throw new Error("CSV : caractère inattendu après un guillemet.");
      cell += c;
    }
    if (
      cell.length > 16000 ||
      row.length > 200 ||
      rows.length > MAX_IMPORT_RECORDS + 1
    )
      throw new Error(
        "CSV : limite de 20 000 lignes, 200 colonnes ou 16 000 caractères par cellule dépassée.",
      );
  }
  if (inQuote) throw new Error("CSV : guillemet non fermé.");
  row.push(cell);
  if (row.some((x) => trim(x))) rows.push(row);
  if (rows.length < 2)
    throw new Error(
      "Le fichier doit contenir un en-tête et au moins une ligne.",
    );
  const headers = rows.shift().map((h, i) => trim(h) || "Colonne " + (i + 1));
  if (headers.length > 200 || rows.some((r) => r.length > headers.length))
    throw new Error(
      "CSV : nombre de colonnes incohérent. Vérifie le séparateur et les nombres décimaux.",
    );
  return { headers, rows, delimiter };
}
const aliases = {
  layer: ["calque", "layer"],
  family: ["famille", "family", "categorie", "category", "classeifc"],
  type: ["type", "nomdutype", "typename", "blockname", "nomdubloc"],
  level: ["niveau", "level", "etage", "storey"],
  building: ["batiment", "building"],
  room: ["piece", "room"],
  label: ["designation", "nom", "name", "description"],
  length: ["longueur", "length", "longueurml", "netlength"],
  area: ["surface", "area", "superficie", "netarea", "surfaceau sol"],
  volume: ["volume", "netvolume"],
  count: ["nombre", "count", "quantite", "quantity", "nombredelements"],
};
export function guessColumns(headers) {
  return Object.fromEntries(
    Object.entries(aliases).map(([key, names]) => [
      key,
      headers.findIndex((h) =>
        names.some(
          (n) =>
            norm(h) === norm(n) ||
            norm(
              h.replace(
                /\s*(?:\[|\()\s*(?:mm|cm|m|ml|ft)[²³23]?\s*[\])]\s*$/i,
                "",
              ),
            ) === norm(n),
        ),
      ),
    ]),
  );
}
const units = {
  mm: { unit: "m", factor: 0.001 },
  cm: { unit: "m", factor: 0.01 },
  m: { unit: "m", factor: 1 },
  ml: { unit: "m", factor: 1 },
  ft: { unit: "m", factor: 0.3048 },
  in: { unit: "m", factor: 0.0254 },
  mm2: { unit: "m²", factor: 1e-6 },
  cm2: { unit: "m²", factor: 1e-4 },
  m2: { unit: "m²", factor: 1 },
  ft2: { unit: "m²", factor: 0.09290304 },
  mm3: { unit: "m³", factor: 1e-9 },
  cm3: { unit: "m³", factor: 1e-6 },
  m3: { unit: "m³", factor: 1 },
  ft3: { unit: "m³", factor: 0.028316846592 },
  u: { unit: "u", factor: 1 },
  unite: { unit: "u", factor: 1 },
  pcs: { unit: "u", factor: 1 },
  ea: { unit: "u", factor: 1 },
};
export function unitInfo(raw) {
  return (
    units[
      trim(raw)
        .toLowerCase()
        .replaceAll("²", "2")
        .replaceAll("³", "3")
        .replaceAll("^", "")
        .replace(/\s/g, "")
    ] || null
  );
}
export function headerUnit(header) {
  return (
    trim(header).match(
      /(?:\[|\()\s*(mm[²³23]?|cm[²³23]?|m[²³23]?|ml|ft[23]?|u)\s*[\])]/i,
    )?.[1] || ""
  );
}
export function numericQuantity(raw, declaredUnit, metric) {
  let s = trim(raw).replace(/[\u00A0\u202F ]/g, "");
  const suffix = s.match(
    /(mm[²³23]?|cm[²³23]?|ml|m[²³23]?|ft[23]?|pcs|ea|u)$/i,
  )?.[1];
  if (suffix) s = s.slice(0, -suffix.length);
  // Une seule convention décimale, aucune formule Excel ou valeur calculée par eval.
  if (!/^[+]?\d+(?:[.,]\d+)?(?:[eE][+-]?\d+)?$/.test(s))
    throw new Error(
      "Quantité non numérique ou négative : " + trim(raw).slice(0, 60),
    );
  const value = Number(s.replace(",", "."));
  const u = unitInfo(suffix || declaredUnit || (metric === "count" ? "u" : ""));
  const expected = { length: "m", area: "m²", volume: "m³", count: "u" }[
    metric
  ];
  if (!u || u.unit !== expected)
    throw new Error(
      "Unité " + METRICS[metric] + " à préciser ou incompatible.",
    );
  if (!Number.isFinite(value) || value * u.factor > 1e12)
    throw new Error("Quantité hors limites.");
  if (metric === "count" && !Number.isInteger(value))
    throw new Error("Le comptage doit être entier.");
  return {
    value: value * u.factor,
    unit: u.unit,
    original: trim(raw),
    originalUnit: suffix || declaredUnit || "u",
  };
}
export function mapTable(table, columns, declaredUnits = {}) {
  const records = [],
    warnings = [];
  for (const [i, row] of table.rows.entries()) {
    const get = (k) => (columns[k] >= 0 ? trim(row[columns[k]]) : "");
    if (!row.some((v) => trim(v))) continue;
    const measures = {};
    for (const metric of Object.keys(METRICS)) {
      if (columns[metric] < 0 || columns[metric] === undefined || !get(metric))
        continue;
      try {
        measures[METRICS[metric]] = numericQuantity(
          get(metric),
          headerUnit(table.headers[columns[metric]]) || declaredUnits[metric],
          metric,
        );
      } catch (e) {
        measures[METRICS[metric]] = { error: e.message, raw: get(metric) };
      }
    }
    if (columns.count < 0 || columns.count === undefined)
      measures["Instances (lignes du fichier)"] = {
        value: 1,
        unit: "u",
        original: "1",
        originalUnit: "u",
      };
    records.push({
      id: "row-" + (i + 2),
      layer: get("layer"),
      family: get("family"),
      type: get("type"),
      level: get("level"),
      building: get("building"),
      room: get("room"),
      label: get("label") || get("type") || get("layer") || "Ligne " + (i + 2),
      measures,
    });
  }
  if (!records.length) throw new Error("Aucune ligne exploitable.");
  warnings.push(
    "Choisis une seule mesure par groupe. Une ligne CSV n’est une unité physique que si la nomenclature décrit des occurrences.",
  );
  return { records, warnings };
}
export function groupRecords(records) {
  if (records.length > MAX_IMPORT_RECORDS)
    throw new Error("Maximum 20 000 objets par import.");
  const groups = new Map();
  for (const r of records) {
    const key = JSON.stringify([
      r.layer || "",
      r.family || "",
      r.type || "",
      r.level || "",
      r.building || "",
      r.room || "",
    ]);
    if (!groups.has(key))
      groups.set(key, {
        id: key,
        layer: r.layer || "",
        family: r.family || "",
        type: r.type || "",
        level: r.level || "",
        building: r.building || "",
        room: r.room || "",
        label: r.label,
        records: [],
        measures: {},
      });
    const g = groups.get(key);
    g.records.push(r);
    for (const [name, m] of Object.entries(r.measures)) {
      const target = (g.measures[name] ||= {
        value: 0,
        unit: m.unit,
        available: 0,
        errors: [],
        sourceNames: [],
      });
      if (m.error || (target.unit && m.unit !== target.unit))
        target.errors.push(m.error || "Unités incohérentes");
      else {
        target.unit = m.unit;
        target.value += m.value;
        target.available++;
      }
    }
  }
  for (const g of groups.values())
    for (const m of Object.values(g.measures))
      if (m.available !== g.records.length)
        m.errors.push(
          "Mesure absente ou invalide pour " +
            (g.records.length - m.available) +
            " objet(s).",
        );
  return [...groups.values()];
}
export function buildImportedRows(
  groups,
  mappings,
  fileName,
  makeId = () => crypto.randomUUID(),
) {
  const rows = [];
  for (const g of groups) {
    const mapping = mappings[g.id];
    if (!mapping?.include) continue;
    const measure = g.measures[mapping.measure];
    if (!measure || measure.errors.length || !Number.isFinite(measure.value))
      throw new Error(
        "Groupe " +
          g.label +
          " : sélectionne une mesure valide pour tous les objets.",
      );
    if (!trim(mapping.lot))
      throw new Error("Affecte un lot à " + g.label + ".");
    if (
      mapping.workUnit &&
      mapping.workUnit !== measure.unit &&
      !(mapping.workUnit === "U" && measure.unit === "u") &&
      !(mapping.workUnit === "ml" && measure.unit === "m")
    )
      throw new Error(
        "L’unité de l’ouvrage ne correspond pas à la mesure du groupe " +
          g.label +
          ".",
      );
    const label = trim(mapping.label) || g.label;
    rows.push({
      id: makeId(),
      rowNumber: "",
      code: trim(mapping.workCode).slice(0, 40),
      cctpCode: trim(mapping.workCode),
      label: label.slice(0, 200),
      lot: trim(mapping.lot).slice(0, 80),
      report: (g.layer || g.family || g.type || "Import").slice(0, 80),
      building: g.building,
      level: g.level,
      room: g.room,
      location: fileName.slice(0, 200),
      unitPrice: null,
      importSource: {
        file: fileName,
        groupKey: g.id,
        measure: mapping.measure,
        unit: measure.unit,
        quantity: measure.value,
        objects: g.records.map((r) => ({
          id: r.id,
          guid: r.guid || "",
          source: r.measures[mapping.measure],
        })),
      },
      input: {
        preset: "reprise",
        dimensionUnit: "m",
        outputUnit: measure.unit,
        basis: "libre",
        dimensions: { Q: String(measure.value) },
        count: "1",
        deduction: "0",
        openings: [],
      },
    });
  }
  if (!rows.length) throw new Error("Coche au moins un groupe à injecter.");
  if (rows.length > 2000) throw new Error("Maximum 2 000 lignes par projet.");
  return rows;
}
/** DXF : longueur réelle des segments droits en plan, aire exacte des arcs
 * de bulge (segment circulaire), blocs INSERT comptés une seule fois.
 * Splines, surfaces 3D et blocs éclatés ne sont jamais assimilés à des métrés. */
export function dxfMeasurements(drawing, unitOverride = "") {
  const code = drawing.header?.$INSUNITS;
  const detected = { 1: "in", 2: "ft", 4: "mm", 5: "cm", 6: "m" }[code] || "";
  const unit = unitOverride || detected;
  const factor = unitInfo(unit)?.factor;
  const records = [],
    warnings = [];
  let unsupported = 0,
    threeD = 0;
  const entities = drawing.entities || [];
  if (entities.length > MAX_IMPORT_RECORDS)
    throw new Error("DXF : maximum 20 000 entités pour l’import de quantités.");
  for (const [i, e] of entities.entries()) {
    const base = {
      id: String(e.handle || i + 1),
      layer: e.layer || "0",
      family: "AutoCAD",
      type: e.type,
      label: e.layer || e.type,
      measures: {},
    };
    if (e.type === "INSERT") {
      base.type = e.name || "Bloc";
      const count = (e.rowCount || 1) * (e.columnCount || 1);
      if (!Number.isInteger(count) || count < 1 || count > 1e7) {
        unsupported++;
        continue;
      }
      base.measures["Blocs INSERT"] = {
        value: count,
        unit: "u",
        original: String(count),
        originalUnit: "u",
      };
      records.push(base);
      continue;
    }
    if (!["LINE", "LWPOLYLINE", "POLYLINE", "CIRCLE"].includes(e.type)) {
      unsupported++;
      continue;
    }
    const vertices = e.vertices || [];
    if (
      vertices.some((v) => Math.abs(v.z || 0) > 1e-8) ||
      e.is3dPolyline ||
      (e.extrusionDirection &&
        (Math.abs(e.extrusionDirection.x || 0) > 1e-8 ||
          Math.abs(e.extrusionDirection.y || 0) > 1e-8 ||
          (e.extrusionDirection.z ?? 1) !== 1))
    ) {
      threeD++;
      continue;
    }
    let length = 0,
      area = 0,
      closed = e.shape === true || e.type === "CIRCLE";
    if (e.type === "CIRCLE") {
      length = 2 * Math.PI * e.radius;
      area = Math.PI * e.radius ** 2;
    } else {
      const n = closed ? vertices.length : vertices.length - 1;
      if (n < 1) {
        unsupported++;
        continue;
      }
      for (let j = 0; j < n; j++) {
        const a = vertices[j],
          b = vertices[(j + 1) % vertices.length],
          chord = Math.hypot(b.x - a.x, b.y - a.y),
          bulge = a.bulge || 0;
        area += (a.x * b.y - b.x * a.y) / 2;
        if (Math.abs(bulge) > 1e-10 && chord > 0) {
          const theta = 4 * Math.atan(bulge),
            radius = (chord * (1 + bulge * bulge)) / (4 * Math.abs(bulge));
          length += Math.abs(theta) * radius;
          area += (radius * radius * (theta - Math.sin(theta))) / 2;
        } else length += chord;
      }
      area = Math.abs(area);
    }
    if (!Number.isFinite(length) || !Number.isFinite(area)) {
      unsupported++;
      continue;
    }
    const measured = (v, p) =>
      factor
        ? {
            value: v * factor ** p,
            unit: p === 1 ? "m" : "m²",
            original: String(v),
            originalUnit: unit + (p === 2 ? "²" : ""),
          }
        : {
            error:
              "Unité DXF absente ou non prise en charge : précise l’unité du dessin.",
          };
    base.measures["Longueur DXF"] = measured(length, 1);
    if (closed) base.measures["Surface fermée DXF"] = measured(area, 2);
    records.push(base);
  }
  if (unsupported)
    warnings.push(
      unsupported +
        " entité(s) hors périmètre ignorée(s) : textes, hachures, splines, arcs isolés, etc.",
    );
  if (threeD)
    warnings.push(
      threeD + " entité(s) 3D ou à plan d’extrusion oblique ignorée(s).",
    );
  warnings.push(
    "Chaque contour fermé est une surface distincte. Les trous, superpositions et jonctions ne sont pas déduits automatiquement. Les INSERT sont comptés sans développer leur géométrie.",
  );
  return { records, warnings, detectedUnit: detected, unit };
}
