import { COURSE_STANDARDS } from "./standards-course.js";
export const STANDARDS_BTP = [
  {
    id: "maconnerie",
    reference: "NF DTU 20.1",
    intitule: "Ouvrages en maçonnerie de petits éléments — Parois et murs",
    mots: ["maçonnerie", "parpaing", "blocs béton", "brique"],
    source:
      "https://boutique.cstb.fr/detail/documents-techniques-unifies/dtu-nf-dtu/20-maconneries/nf-dtu-20-1-ouvrages-en-maconnerie-de-petits-eleme",
  },
  {
    id: "plaque",
    reference: "NF DTU 25.41",
    intitule: "Ouvrages en plaques de plâtre — Plaques à faces cartonnées",
    mots: ["plaque de plâtre", "plaques de plâtre", "ba13", "placostil"],
    source:
      "https://www.boutique.afnor.org/fr-fr/norme/nf-dtu-2541-p11/travaux-de-batiment-ouvrages-en-plaques-de-platre-plaques-a-faces-cartonnee/fa194671/321485",
  },
  {
    id: "peinture",
    reference: "NF DTU 59.1",
    intitule: "Revêtements de peinture en feuil mince, semi-épais ou épais",
    mots: ["peinture", "impression sur support", "ratissage"],
    source:
      "https://www.boutique.afnor.org/fr-fr/norme/nf-dtu-591-p11/travaux-de-batiment-revetements-de-peinture-en-feuil-mince-semiepais-ou-epa/fa170291/41498",
  },
].map((r) => ({
  ...r,
  sourceConsulteeLe: "2026-11-18",
  statut: "Domaine, parties, édition et amendements à vérifier au marché",
}));
const norm = (s) =>
  String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
export function proposeStandards(poste, country = "france") {
  if (country !== "france") return [];
  if (poste.catalogueCode && COURSE_STANDARDS[poste.catalogueCode])
    return COURSE_STANDARDS[poste.catalogueCode];
  const text = norm(poste.designation || poste.label);
  return STANDARDS_BTP.filter((r) =>
    r.mots.some((m) => text.includes(norm(m))),
  ).map(({ mots, ...r }) => r);
}
export function standardsText(poste, country = "france") {
  const refs = proposeStandards(poste, country);
  return refs.length
    ? "Références documentaires proposées (validation contractuelle requise) :\n" +
        refs
          .map(
            (r) =>
              r.reference +
              " — " +
              r.intitule +
              ". " +
              r.statut +
              ". Source : " +
              r.source +
              " (consultée le " +
              r.sourceConsulteeLe +
              ").",
          )
          .join("\n")
    : "Références normatives : domaine et édition à identifier sur les sources officielles avant validation.";
}
