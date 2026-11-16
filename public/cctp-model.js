/** Modèle partagé navigateur/serveur. Les clauses sont du texte structuré,
 * jamais du HTML exécutable. Quantités, prix et résultats de la minute sont
 * volontairement exclus de la projection vers le CCTP. */
export const EMPTY_CCTP = Object.freeze({ version: 1, articles: [] });
const text = (v, max = 16000) => (typeof v === "string" ? v.slice(0, max) : "");
export const plainBlocks = (value) =>
  String(value || "")
    .split("\n")
    .map((t) => ({ runs: [{ text: t }] }));
export const blocksText = (blocks) =>
  (blocks || [])
    .map((b) => (b.runs || []).map((r) => r.text).join(""))
    .join("\n");
export function normalizeBlocks(value) {
  if (typeof value === "string") return plainBlocks(text(value));
  if (!Array.isArray(value)) return [];
  let remaining = 16000;
  return value.slice(0, 300).map((b) => ({
    ...(b?.list === "bullet" || b?.list === "ordered" ? { list: b.list } : {}),
    runs: (Array.isArray(b?.runs) ? b.runs : []).slice(0, 300).map((r) => {
      const s = text(r?.text, Math.max(0, remaining));
      remaining -= s.length;
      return {
        text: s,
        ...(r?.bold === true ? { bold: true } : {}),
        ...(r?.italic === true ? { italic: true } : {}),
      };
    }),
  }));
}
export function normalizeCctp(value) {
  if (!value || !Array.isArray(value.articles))
    return { version: 1, articles: [] };
  if (value.articles.length > 500)
    throw new Error("CCTP limité à 500 articles.");
  const ids = new Set();
  const articles = value.articles.map((a, i) => {
    if (!a || typeof a !== "object") throw new Error("Article CCTP invalide.");
    const id = text(a.id, 100) || "article-" + i;
    if (ids.has(id)) throw new Error("Identifiant CCTP en double.");
    ids.add(id);
    return {
      id,
      code: text(a.code, 100),
      lotNumber: text(a.lotNumber, 20),
      lotName: text(a.lotName, 100),
      sublot: text(a.sublot, 150),
      title: text(a.title, 300),
      references: text(a.references, 2000),
      unit: text(a.unit, 30),
      description: normalizeBlocks(a.description),
      execution: normalizeBlocks(a.execution),
      location: normalizeBlocks(a.location),
      measurement: normalizeBlocks(a.measurement),
      rowIds: [
        ...new Set(
          (Array.isArray(a.rowIds) ? a.rowIds : [])
            .map((x) => text(x, 100))
            .filter(Boolean),
        ),
      ].slice(0, 2000),
      reviewed: a.reviewed === true,
      country: ['france','luxembourg'].includes(a.country) ? a.country : null,
      countryDrafts: normalizeCountryDrafts(a.countryDrafts),
      source:
        a.source && typeof a.source === "object"
          ? normalizeSource(a.source)
          : null,
    };
  });
  return { version: 1, articles };
}
function normalizeSource(source) {
  return {
    code:text(source.code,100),kind:text(source.kind,120),pages:text(source.pages,2000),
    unitStatus:text(source.unitStatus,200),note:text(source.note,2000),
    country:['france','luxembourg'].includes(source.country)?source.country:null,
    auditDate:text(source.auditDate,20),
    normativeVersion:text(source.normativeVersion,60),
    vigilance:text(source.vigilance,800),
    previousReferences:text(source.previousReferences,2000),
    links:(Array.isArray(source.links)?source.links:[]).slice(0,20).filter(l=>typeof l.url==='string'&&/^https:\/\//.test(l.url)).map(l=>({label:text(l.label,200),url:text(l.url,1200)})),
  };
}
function normalizeCountryDrafts(value) {
  const result={};
  for(const country of ['france','luxembourg']) {
    const a=value?.[country];if(!a||typeof a!=='object')continue;
    result[country]={lotName:text(a.lotName,100),title:text(a.title,300),references:text(a.references,2000),unit:text(a.unit,30),description:normalizeBlocks(a.description),execution:normalizeBlocks(a.execution),location:normalizeBlocks(a.location),measurement:normalizeBlocks(a.measurement),source:a.source?normalizeSource(a.source):null};
  }
  return result;
}
const key = (s) =>
  String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
export function catalogueIndex(data, proofs) {
  const evidence = new Map(proofs.ouvrages.map((p) => [p.code, p]));
  return data.lots.flatMap((lot) =>
    lot.ouvrages.map((o) => {
      const p = evidence.get(o.code);
      return {
        ...o,
        lotNumber: lot.numero_lot,
        lotName: lot.nom_lot,
        sublot: p?.sous_lot || "Ouvrages",
        originalCode:
          p?.correspondance_automatique === false
            ? ""
            : p?.article_original || "",
        source: {
          code: o.code,
          kind: p?.nature_clause || "",
          pages: formatSourcePages(p?.references || []),
          unitStatus: p?.statut_unite || "",
          note: p?.emploi || "",
        },
      };
    }),
  );
}
/** La provenance reste complète mais les pages consécutives sont regroupées
 * pour ne pas transformer chaque fiche de bibliothèque en une liste de 30 lignes. */
export function formatSourcePages(references) {
  const sorted = [...references].sort(
    (a, b) => a.livre.localeCompare(b.livre) || a.page_cours - b.page_cours,
  );
  const ranges = [];
  for (const r of sorted) {
    const prev = ranges.at(-1);
    if (
      prev &&
      prev.book === r.livre &&
      prev.end === r.page_cours &&
      prev.pdfEnd === r.page_pdf
    )
      continue;
    if (
      prev &&
      prev.book === r.livre &&
      prev.end + 1 === r.page_cours &&
      prev.pdfEnd + 1 === r.page_pdf
    ) {
      prev.end = r.page_cours;
      prev.pdfEnd = r.page_pdf;
    } else
      ranges.push({
        book: r.livre,
        start: r.page_cours,
        end: r.page_cours,
        pdfStart: r.page_pdf,
        pdfEnd: r.page_pdf,
      });
  }
  return ranges
    .map(
      (r) =>
        `${r.book} p. ${r.start}${r.end !== r.start ? "-" + r.end : ""} (PDF ${r.pdfStart}${r.pdfEnd !== r.pdfStart ? "-" + r.pdfEnd : ""})`,
    )
    .join(" ; ");
}
export function fromClause(o, id = crypto.randomUUID()) {
  const c = o.clause_cctp || {};
  return {
    id,
    code: o.code,
    lotNumber: o.lotNumber,
    lotName: o.lotName,
    sublot: o.sublot,
    title: o.designation_courte,
    references: (c.normes_dtu || []).join("\n"),
    unit: o.unite || "",
    description: plainBlocks(c.description_technique),
    execution: plainBlocks(c.mise_en_oeuvre),
    location: plainBlocks(c.localisation_type),
    measurement: clauseMeasurement(o),
    rowIds: [],
    reviewed: false,
    source: o.source || null,
    country: o.country || null,
    countryDrafts: {},
  };
}
/** Projection des seules règles présentes dans l'extraction. Aucune perte,
 * déduction chiffrée ou quantité du chantier n'est déduite d'un intitulé. */
export function clauseMeasurement(o) {
  return plainBlocks(
    [
      o.regle_metre?.vides_pour_pleins,
      o.formule_defaut &&
        `Expression géométrique : ${o.formule_defaut}${o.unite ? ` (${o.unite})` : ""}.`,
    ]
      .filter(Boolean)
      .join("\n"),
  ).filter((b) => b.runs.some((r) => r.text));
}
/** Rattrapage explicite des anciens articles : remplir les modes vides sans
 * toucher aux prescriptions rédigées ni aux règles déjà adaptées au chantier. */
export function fillMissingMeasurements(doc, catalogue) {
  const byCode = new Map(catalogue.map((o) => [o.code, o]));
  let changed = false;
  const articles = doc.articles.map((a) => {
    const o = byCode.get(a.source?.code);
    if (!o || blocksText(a.measurement).trim()) return a;
    const measurement = clauseMeasurement(o);
    if (!measurement.length) return a;
    changed = true;
    return { ...a, measurement, reviewed: false };
  });
  return changed ? { ...doc, articles } : doc;
}
/** Même structure pour les sélecteurs, l'arbre et le sommaire, quel que soit
 * le nombre de lots extraits. Les noms viennent exclusivement des données. */
export function catalogueTree(catalogue) {
  const lots = new Map();
  for (const o of catalogue) {
    const id = o.lotNumber + "|" + o.lotName;
    if (!lots.has(id))
      lots.set(id, {
        id,
        number: o.lotNumber,
        name: o.lotName,
        groups: new Map(),
      });
    const l = lots.get(id);
    l.groups.set(o.sublot, (l.groups.get(o.sublot) || 0) + 1);
  }
  return [...lots.values()].map((l) => ({
    ...l,
    groups: [...l.groups].map(([name, count]) => ({ name, count })),
  }));
}
export function articleTree(numbered) {
  const lots = new Map();
  for (const a of numbered) {
    if (!lots.has(a.lotHeading))
      lots.set(a.lotHeading, { heading: a.lotHeading, groups: new Map() });
    const l = lots.get(a.lotHeading);
    if (!l.groups.has(a.subHeading))
      l.groups.set(a.subHeading, { heading: a.subHeading, articles: [] });
    l.groups.get(a.subHeading).articles.push(a);
  }
  return [...lots.values()].map((l) => ({
    ...l,
    groups: [...l.groups.values()],
  }));
}
export function appendClause(doc, o, id) {
  if (
    doc.articles.some((a) => a.code === o.code && a.lotNumber === o.lotNumber)
  )
    return doc;
  if (doc.articles.length >= 500)
    throw new Error("CCTP limité à 500 articles.");
  return { ...doc, articles: [...doc.articles, fromClause(o, id)] };
}
export function patchArticle(doc, id, patch) {
  const index = doc.articles.findIndex((a) => a.id === id);
  if (index < 0) return doc;
  const articles = doc.articles.slice();
  articles[index] = {
    ...articles[index],
    ...patch,
    reviewed: patch.reviewed ?? false,
  };
  return { ...doc, articles };
}
/** Un import est une seule transaction. L'ancien code React bouclait sur une
 * fermeture périmée de useState et ne reconnaissait que les codes du catalogue.
 * Ici les lignes sans correspondance restent des articles à compléter. */
export function importMinute(
  doc,
  rows,
  catalogue,
  makeId = () => crypto.randomUUID(),
) {
  const byCode = new Map();
  for (const o of catalogue)
    for (const code of [o.code, o.originalCode].filter(Boolean)) {
      const list = byCode.get(code) || [];
      list.push(o);
      byCode.set(code, list);
    }
  const articles = doc.articles.slice(),
    byRow = new Map(),
    byKey = new Map();
  let changed = false;
  articles.forEach((a, i) => {
    a.rowIds.forEach((id) => byRow.set(id, i));
    byKey.set(key(a.lotName) + "|" + (a.code || key(a.title)), i);
  });
  const lots = new Map(articles.map((a) => [key(a.lotName), a.lotNumber]));
  for (const row of rows) {
    if (byRow.has(row.id)) continue;
    const candidates = byCode.get(row.cctpCode || row.code) || [];
    const o = candidates.length === 1 ? candidates[0] : null; // Jamais de rapprochement technique flou.
    const lotName = o?.lotName || row.lot || "Sans lot";
    const k = key(lotName) + "|" + (o?.code || row.code || key(row.label));
    let index = byKey.get(k);
    if (index === undefined) {
      if (articles.length >= 500)
        throw new Error(
          "CCTP limité à 500 articles ; regroupe les désignations de la minute.",
        );
      if (!lots.has(key(lotName)))
        lots.set(key(lotName), String(lots.size + 1).padStart(2, "0"));
      const article = o
        ? {
            ...fromClause(o, makeId()),
            title: row.label || o.designation_courte,
          }
        : {
            id: makeId(),
            code: row.code || "",
            lotNumber: lots.get(key(lotName)),
            lotName,
            sublot: "Depuis la minute",
            title: row.label,
            references: "",
            unit: row.result?.unit || "",
            description: [],
            execution: [],
            location: [],
            measurement: [],
            rowIds: [],
            reviewed: false,
            source: null,
          };
      index = articles.length;
      articles.push(article);
      byKey.set(k, index);
    }
    const a = articles[index];
    const loc = [
      ...new Set(
        [row.building, row.level, row.room, row.location].filter(Boolean),
      ),
    ].join(" / ");
    const locations = blocksText(a.location).split("\n").filter(Boolean);
    articles[index] = {
      ...a,
      rowIds: [...a.rowIds, row.id],
      location:
        loc && !locations.includes(loc)
          ? [...a.location, ...plainBlocks(loc)]
          : a.location,
      reviewed: false,
    };
    changed = true;
    byRow.set(row.id, index);
  }
  return changed ? { ...doc, articles } : doc;
}
export function numberedArticles(doc) {
  const lots = new Map(),
    used = new Set();
  for (const a of doc.articles) {
    const k = a.lotNumber + "|" + a.lotName;
    if (!lots.has(k)) {
      let n = Number(a.lotNumber);
      if (!Number.isInteger(n) || n < 1 || used.has(n)) {
        n = 1;
        while (used.has(n)) n++;
      }
      used.add(n);
      lots.set(k, { n, name: a.lotName, groups: new Map() });
    }
    const l = lots.get(k),
      group = a.sublot || "Ouvrages";
    if (!l.groups.has(group)) l.groups.set(group, []);
    l.groups.get(group).push(a);
  }
  return [...lots.values()].flatMap((l) =>
    [...l.groups].flatMap(([sublot, articles], j) =>
      articles.map((a, i) => ({
        ...a,
        lotHeading: `${l.n}. ${l.name}`,
        subHeading: `${l.n}.${j + 1}. ${sublot}`,
        number: `${l.n}.${j + 1}.${i + 1}`,
      })),
    ),
  );
}
export function articleIssues(a) {
  const result = [];
  if (!a.title.trim()) result.push("Titre");
  if (!blocksText(a.description).trim()) result.push("Description");
  if (!blocksText(a.execution).trim()) result.push("Mise en œuvre");
  if (!blocksText(a.location).trim()) result.push("Localisation");
  if (!blocksText(a.measurement).trim()) result.push("Mode de métré");
  if (
    [
      a.title,
      a.references,
      blocksText(a.description),
      blocksText(a.execution),
      blocksText(a.location),
      blocksText(a.measurement),
    ].some((t) => /\{\{[^}]+\}\}/.test(t))
  )
    result.push("Champs {{…}}");
  if (!a.reviewed) result.push("Relecture");
  return result;
}
