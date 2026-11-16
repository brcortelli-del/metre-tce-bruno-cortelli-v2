/** Le guide reste indépendant de l’état métier : aucune mutation du chantier. */
export const normalizeManualText = (s) =>
  String(s || "").normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

export function sectionText(section) {
  return [section.title, ...section.blocks.flatMap((b) =>
    b.type === "table" ? b.rows.flat() : b.type === "list" ? b.items :
      [b.title || "", b.text || "", b.alt || ""]
  )].join(" ").replace(/\*\*/g, "").replaceAll(String.fromCharCode(96), "");
}

export function visibleManualSections(chapter, showCorrection = false) {
  return chapter.sections.filter((s) => showCorrection || !s.correction);
}

// La sélection d'impression applique le même verrou pédagogique que la
// lecture et la recherche : aucun corrigé n'est matérialisé sans choix explicite.
export function manualPrintChapters(data, showCorrection = false) {
  return data.chapters.map(chapter => ({ ...chapter, sections: visibleManualSections(chapter, showCorrection) }));
}

export function searchManual(data, query, showCorrection = false) {
  const terms = normalizeManualText(query).trim().split(/\s+/).filter(Boolean);
  if (!terms.length || query.trim().length < 2) return { items: [], total: 0 };
  const matches = [];
  for (const chapter of data.chapters) {
    for (const section of visibleManualSections(chapter, showCorrection)) {
      const text = sectionText(section), haystack = normalizeManualText(text);
      if (!terms.every((term) => haystack.includes(term))) continue;
      const at = Math.max(0, haystack.indexOf(terms[0]) - 55);
      matches.push({ chapterId: chapter.id, chapterTitle: chapter.title,
        sectionId: section.id, title: section.title,
        snippet: (at ? "…" : "") + text.slice(at, at + 215) + "…" });
    }
  }
  return { items: matches.slice(0, 30), total: matches.length };
}
