import { MAX_IMPORT_RECORDS } from "../public/import-core.js";
const value = (v) => v?.value ?? v;
const prefixes = {
  EXA: 1e18,
  PETA: 1e15,
  TERA: 1e12,
  GIGA: 1e9,
  MEGA: 1e6,
  KILO: 1e3,
  HECTO: 100,
  DECA: 10,
  DECI: 0.1,
  CENTI: 0.01,
  MILLI: 0.001,
  MICRO: 1e-6,
  NANO: 1e-9,
};
/** Extraction de QTO uniquement. L'index des relations est construit une seule
 * fois dans un Worker. Aucune géométrie, boîte englobante ou quantité de type
 * n'est multipliée silencieusement par les occurrences. */
export function extractIfc(api, model, IFC, progress = () => {}) {
  const cache = new Map();
  let reads = 0;
  const line = (ref) => {
    const id = typeof ref === "number" ? ref : ref?.value;
    if (!Number.isInteger(id) || id <= 0) return null;
    if (!cache.has(id)) {
      if (++reads > 250000)
        throw new Error(
          "IFC trop complexe : limite de 250 000 références. Exporte une nomenclature CSV/XLSX.",
        );
      cache.set(id, api.GetLine(model, id, false, false));
    }
    return cache.get(id);
  };
  const forType = (type, fn, inherited = false) => {
    const ids = api.GetLineIDsWithType(model, type, inherited);
    for (let i = 0; i < ids.size(); i++) fn(line(ids.get(i)));
  };
  const unitFactor = (ref, expected, seen = new Set()) => {
    const u = line(ref);
    if (!u || seen.has(u.expressID)) return null;
    seen.add(u.expressID);
    if (value(u.UnitType) !== expected) return null;
    if (u.type === IFC.IFCSIUNIT) {
      const expectedName = {
        LENGTHUNIT: "METRE",
        AREAUNIT: "SQUARE_METRE",
        VOLUMEUNIT: "CUBIC_METRE",
      }[expected];
      if (value(u.Name) !== expectedName) return null;
      const p = value(u.Prefix),
        f = p ? prefixes[p] : 1;
      return Number.isFinite(f)
        ? f ** { LENGTHUNIT: 1, AREAUNIT: 2, VOLUMEUNIT: 3 }[expected]
        : null;
    }
    if (u.type === IFC.IFCCONVERSIONBASEDUNIT) {
      const c = line(u.ConversionFactor),
        f = Number(value(c?.ValueComponent));
      const base = c && unitFactor(c.UnitComponent, expected, seen);
      return Number.isFinite(f) && base !== null ? f * base : null;
    }
    return null;
  };
  const projectUnits = {};
  forType(IFC.IFCPROJECT, (p) => {
    const a = line(p.UnitsInContext);
    for (const ref of a?.Units || []) {
      const u = line(ref);
      const type = value(u?.UnitType);
      if (type) projectUnits[type] = ref;
    }
  });
  const typeByElement = new Map(),
    parent = new Map(),
    spatial = new Map(),
    propertySets = new Map(),
    qtos = new Map();
  forType(IFC.IFCRELDEFINESBYTYPE, (r) => {
    for (const ref of r.RelatedObjects || [])
      typeByElement.set(ref.value, r.RelatingType);
  });
  forType(IFC.IFCRELAGGREGATES, (r) => {
    for (const ref of r.RelatedObjects || [])
      parent.set(ref.value, r.RelatingObject);
  });
  forType(IFC.IFCRELCONTAINEDINSPATIALSTRUCTURE, (r) => {
    for (const ref of r.RelatedElements || [])
      spatial.set(ref.value, r.RelatingStructure);
  });
  forType(IFC.IFCRELDEFINESBYPROPERTIES, (r) => {
    // IFC4 peut exporter un ensemble de définitions. On résout chaque poignée.
    const refs = Array.isArray(r.RelatingPropertyDefinition)
      ? r.RelatingPropertyDefinition
      : [r.RelatingPropertyDefinition];
    for (const ref of refs) {
      const p = line(ref);
      if (!p) continue;
      for (const obj of r.RelatedObjects || []) {
        const map =
          p.type === IFC.IFCELEMENTQUANTITY
            ? qtos
            : p.type === IFC.IFCPROPERTYSET
              ? propertySets
              : null;
        if (map) {
          const a = map.get(obj.value) || [];
          a.push(p);
          map.set(obj.value, a);
        }
      }
    }
  });
  progress("Unités et relations IFC indexées…");
  const records = [],
    warnings = [];
  let unknown = 0;
  forType(
    IFC.IFCELEMENT,
    (e) => {
      if (records.length >= MAX_IMPORT_RECORDS)
        throw new Error(
          "IFC : maximum 20 000 éléments. Exporte une nomenclature ciblée.",
        );
      const type = line(typeByElement.get(e.expressID));
      const levels = [];
      let cur = spatial.get(e.expressID) || parent.get(e.expressID),
        seen = new Set();
      for (let i = 0; cur && i < 40; i++) {
        if (seen.has(cur.value)) break;
        seen.add(cur.value);
        const s = line(cur);
        if (!s) break;
        levels.push(s);
        cur = parent.get(s.expressID);
      }
      const storey = levels.find((s) => s.type === IFC.IFCBUILDINGSTOREY),
        building = levels.find((s) => s.type === IFC.IFCBUILDING);
      let family = "";
      for (const p of propertySets.get(e.expressID) || [])
        for (const ref of p.HasProperties || []) {
          const a = line(ref);
          if (
            ["Family", "Famille", "Family Name"].includes(value(a?.Name)) &&
            a.NominalValue
          )
            family = String(value(a.NominalValue));
        }
      const measures = {
        "Instances IFC": {
          value: 1,
          unit: "u",
          original: "1",
          originalUnit: "u",
          qto: "Comptage explicite d’instances",
        },
      };
      for (const set of qtos.get(e.expressID) || [])
        for (const ref of set.Quantities || []) {
          const q = line(ref);
          if (!q) continue;
          const def = {
            [IFC.IFCQUANTITYLENGTH]: ["LengthValue", "LENGTHUNIT", "m"],
            [IFC.IFCQUANTITYAREA]: ["AreaValue", "AREAUNIT", "m²"],
            [IFC.IFCQUANTITYVOLUME]: ["VolumeValue", "VOLUMEUNIT", "m³"],
            [IFC.IFCQUANTITYCOUNT]: ["CountValue", null, "u"],
          }[q.type];
          if (!def) continue;
          const [field, unitType, unit] = def,
            raw = Number(value(q[field]));
          const f = unitType
            ? unitFactor(q.Unit || projectUnits[unitType], unitType)
            : 1;
          const method = String(value(set.MethodOfMeasurement) || "");
          const name =
            String(value(set.Name) || "QTO") +
            "." +
            String(value(q.Name) || field) +
            (method ? " · " + method : "");
          const meta = {
            qto: String(value(set.Name) || ""),
            name: String(value(q.Name) || ""),
            method,
            expressID: q.expressID,
            original: String(raw),
            originalUnit: q.Unit
              ? "Unité explicite #" + q.Unit.value
              : "Unité projet " + (unitType || "comptage"),
            factor: f,
          };
          if (name in measures) {
            measures[name] = {
              ...meta,
              error:
                "Plusieurs quantités homonymes pour cet élément. Corrige l’export IFC.",
            };
            unknown++;
          } else if (
            f === null ||
            !Number.isFinite(raw) ||
            raw < 0 ||
            raw * f > 1e12 ||
            (unit === "u" && !Number.isInteger(raw))
          ) {
            measures[name] = {
              ...meta,
              error: "Unité absente/non prise en charge ou quantité invalide.",
            };
            unknown++;
          } else measures[name] = { ...meta, value: raw * f, unit };
        }
      const className = api.GetNameFromTypeCode(e.type) || "IFCELEMENT";
      records.push({
        id: "#" + e.expressID,
        guid: String(value(e.GlobalId) || ""),
        family: family || className,
        type: String(value(type?.Name) || className),
        level: String(value(storey?.Name) || ""),
        building: String(value(building?.Name) || ""),
        label: String(value(type?.Name) || value(e.Name) || className),
        measures,
      });
    },
    true,
  );
  if (!records.length)
    throw new Error(
      "Aucun élément IFC exploitable. Exporte les occurrences et leurs quantités de base depuis Revit.",
    );
  if (unknown)
    warnings.push(
      unknown +
        " quantité(s) ambiguë(s), sans unité reconnue ou invalide(s) bloquée(s).",
    );
  warnings.push(
    "Quantités QTO exportées uniquement. Choisis Net/Gross et le jeu de quantités approprié : ils ne sont jamais additionnés ensemble. Aucune baie n’est déduite une seconde fois.",
  );
  warnings.push(
    "La « famille » IFC est la propriété Family/Famille exportée, sinon la classe IFC. Les quantités manquantes ne sont pas reconstituées à partir de la géométrie.",
  );
  return { records, warnings, schema: api.GetModelSchema(model) };
}
