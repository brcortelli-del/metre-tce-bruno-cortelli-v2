/** Référentiel daté, partagé par le navigateur, le serveur et les exports.
 * Une ouverture est testée individuellement AVANT son nombre de répétitions.
 * Les seuils sont propres au corps d'état et à l'unité, jamais au seul pays. */
export const AUDIT_DATE = '2026-11-13';
export const COUNTRIES = { france: 'France', luxembourg: 'Luxembourg' };
export function normalizeCountry(value) {
  if (value === undefined || value === null || value === '') return 'france';
  if (!Object.hasOwn(COUNTRIES, value)) throw new Error('Pays du chantier invalide.');
  return value;
}
export const MEASUREMENT_PROFILES = {
  net: 'Géométrie nette / règle particulière du marché',
  masonry: 'Maçonnerie — CTG 012 au Luxembourg',
  concrete: 'Béton — CTG 013 au Luxembourg',
  plaster: 'Enduit intérieur — CTG 023 au Luxembourg',
  drywall: 'Ouvrages secs verticaux — CTG 039 au Luxembourg',
  paint: 'Peinture de parois — CTG 034 au Luxembourg',
};
export function defaultProfile(preset) {
  if (preset === 'mur' || /^(maconnerie_|refends)/.test(preset)) return 'masonry';
  if (preset === 'murets') return 'concrete';
  return 'net';
}
export function measurementRule(input, country = 'france', unit = 'm²') {
  country = normalizeCountry(country);
  const profile = input.measurementProfile || defaultProfile(input.preset);
  if (!Object.hasOwn(MEASUREMENT_PROFILES, profile)) throw new Error('Mode de mesurage invalide.');
  if (country === 'france' || profile === 'net') return {
    id: country === 'france' ? 'FR_NET_PEDAGOGIQUE' : 'NET_PARTICULIER',
    profile, threshold: null, thresholdUnit: null,
    label: country === 'france'
      ? 'France : quantité géométrique nette pédagogique, toutes ouvertures saisies déduites. Règle contractuelle à préciser ; aucun seuil national de 0,50 m² établi par cet audit.'
      : 'Quantité géométrique nette : toutes ouvertures saisies déduites. Règle particulière à préciser au marché.',
  };
  const ctg = { masonry: '012', concrete: '013', plaster: '023', drywall: '039', paint: '034' }[profile];
  if (unit === 'm³' && !['masonry', 'concrete'].includes(profile))
    throw new Error('Ce profil de métré ne définit pas de seuil volumique. Choisis géométrie nette ou un profil compatible.');
  const volume = unit === 'm³';
  const article = profile === 'masonry'
    ? (volume ? '§ 1.5.4.2, figure 54 (baies traversantes)' : '§ 1.5.3.1')
    : profile === 'concrete' ? (volume ? '§ 1.5.1.2.1' : '§ 1.5.1.2.2')
      : profile === 'plaster' ? '§ 1.5.3' : profile === 'drywall' ? '§ 1.5.3.1.1' : '§ 1.5.2.1';
  return {
    id: `LU_CTG${ctg}_${volume ? 'VOLUME' : 'SURFACE'}`,
    profile, threshold: volume ? 0.5 : 2.5, thresholdUnit: volume ? 'm³' : 'm²',
    label: `Luxembourg · CTG ${ctg} ${article} : baie rectangulaire isolée déduite intégralement si ${volume ? 'volume > 0,50 m³' : 'surface > 2,50 m²'} par ouverture ; égalité non déduite. Sous réserve des pièces du marché.`,
  };
}
export function openingDecision(rule, area, thickness = 1) {
  const value = area * (rule.thresholdUnit === 'm³' ? thickness : 1);
  // Comparaison robuste aux conversions cm/mm ; un seuil égal reste non déduit.
  const deduct = rule.threshold === null || Math.round(value * 1e12) / 1e12 > rule.threshold;
  return { deduct, area: deduct ? area : 0, value };
}
/** Même comparaison que le moteur numérique ; les formules Excel restent vivantes. */
export function openingExcel(rule, areaExpression, countRef, thicknessExpression = '1') {
  if (rule.threshold === null) return `(${areaExpression})*${countRef}`;
  const test = rule.thresholdUnit === 'm³' ? `(${areaExpression})*(${thicknessExpression})` : areaExpression;
  return `IF(ROUND((${test}),12)>${rule.threshold},(${areaExpression})*${countRef},0)`;
}
export function documentLabel(country) {
  return normalizeCountry(country) === 'luxembourg'
    ? 'Cahier des charges — Descriptif des positions (Luxembourg)'
    : 'Cahier des clauses techniques particulières';
}
