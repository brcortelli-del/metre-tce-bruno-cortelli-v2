/** Palette unique pour les badges, la minute et les calques du plan.
 * Les noms personnalisés obtiennent une couleur stable, sans état React. */
const palettes = [
  {
    key: "earth",
    name: "Terrassement / VRD",
    color: "#D97706",
    tint: "#FEF3C7",
  },
  { key: "structure", name: "Structure", color: "#2563EB", tint: "#DBEAFE" },
  { key: "finish", name: "Second œuvre", color: "#059669", tint: "#D1FAE5" },
  {
    key: "technical",
    name: "Lots techniques",
    color: "#7C3AED",
    tint: "#EDE9FE",
  },
  { key: "roof", name: "Clos et couvert", color: "#0891B2", tint: "#CFFAFE" },
];
export const LOT_PALETTE = palettes;
export function lotColor(name = "") {
  const s = String(name)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  if (/terrass|vrd|emprise|decap|drain|fouille/.test(s)) return palettes[0];
  if (/fondat|soubass|gros|maconn|structure|beton|dallag/.test(s))
    return palettes[1];
  if (/electric|plomb|chauff|ventil|techni|comptage|fumister/.test(s))
    return palettes[3];
  if (/charp|couvert|etanch|menuiser.*exter|toitur/.test(s)) return palettes[4];
  if (/platr|isolat|peint|revet|second|menuiser|facad/.test(s))
    return palettes[2];
  let hash = 0;
  for (const c of s) hash = (hash * 31 + c.charCodeAt(0)) >>> 0;
  return palettes[hash % palettes.length];
}
export const lotStyle = (name) => {
  const p = lotColor(name);
  return `--lot-color:${p.color};--lot-tint:${p.tint}`;
};
