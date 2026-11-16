import { plainBlocks, blocksText } from './cctp-model.js';

/** Projection locale et immuable. Les profils sont partagés : une cellule
 * modifiée n'entraîne ni nouveau fetch ni réécriture de la bibliothèque. */
export function normativeEntry(index, code) {
  const map=index?.ouvrages?.[code];
  const profile=map&&index.profils[map.profil];
  if(!profile)return null;
  const audits=(map.references_auditees||[]).map(id=>index.references[id]).filter(Boolean);
  return {...profile,audits,version:index.metadata.version,date:index.metadata.verifie_le,
    alerte_interface_site:profile.alerte_interface_site+(audits.some(a=>/non.v[eé]rifi|non.r[eé]solu/i.test(a.statut))?' Référence du cours non vérifiée : aucune substitution automatique.':'')};
}
export function decorateNormativeCatalogue(catalogue,index,country='france') {
  if(country==='luxembourg'||!index)return catalogue;
  const sources=new Map(index.sources.map(s=>[s.id,s]));
  return catalogue.map(o=>{
    const n=normativeEntry(index,o.code);
    if(!n)return o;
    // Seules les références non-DTU du produit sont ajoutées au profil. Les
    // citations historiques de DTU restent consultables dans l'audit séparé.
    const products=n.audits.filter(a=>!a.familles_dtu.length && !/BAEL|BPEL|Eurocode|CPT|CCTG/.test(a.reference_cours));
    const refs=[...new Set(n.normes_en_vigueur.map(r=>r.code+(r.millesime?' — '+r.millesime:'')).concat(products.flatMap(a=>a.references_proposees)))];
    const links=[...new Set(n.sources.concat(n.audits.flatMap(a=>a.sources)))].map(id=>sources.get(id)).filter(Boolean);
    return {...o,normative:n,
      clause_cctp:{...o.clause_cctp,normes_dtu:refs,mise_en_oeuvre:n.paragraphe_cctp_pret_a_inserer},
      regle_metre:{...o.regle_metre,vides_pour_pleins:n.regle_metre_officielle_ccs},
      source:{...o.source,normativeVersion:n.version,vigilance:n.alerte_interface_site,auditDate:n.date,
        note:'Références proposées selon le domaine. Les clauses intégrales de métré ne sont pas certifiées. Les prescriptions du cours restent à adapter à l’étude.',
        links:links.slice(0,20).map(s=>({label:s.titre,url:s.url}))}};
  });
}

/** Une migration ne remplace aucun texte métier, mode de métré, quantité ou
 * lien vers la minute. Les anciennes références sont conservées pour relecture. */
export function adoptNormativeCctp(doc,catalogue,country='france') {
  if(country==='luxembourg')return doc;
  const byCode=new Map(catalogue.map(o=>[o.code,o]));let changed=false;
  const articles=doc.articles.map(a=>{
    const o=byCode.get(a.source?.code),n=o?.normative;
    if(!n||a.source?.normativeVersion===n.version||a.country==='luxembourg')return a;
    changed=true;
    return {...a,references:o.clause_cctp.normes_dtu.join('\n').slice(0,2000),reviewed:false,
      source:{...o.source,previousReferences:a.references||a.source?.previousReferences||''}};
  });
  return changed?{...doc,articles}:doc;
}

/** Ajout explicite plutôt qu'écrasement d'une prescription personnalisée. */
export function appendNormativeParagraph(blocks,entry) {
  const paragraph=entry?.paragraphe_cctp_pret_a_inserer;
  if(!paragraph||blocksText(blocks).includes(paragraph))return blocks;
  if(blocksText(blocks).length+paragraph.length+2>16000)throw new Error('La prescription dépasse 16000 caractères.');
  return [...(blocks||[]),...plainBlocks('\n'+paragraph)];
}

// Aucun rattachement par ressemblance floue dans le calculateur général.
export function calculatorNormativeProfile(preset,index) {
  const map={reconnaissance:'geotech',implantation:'earth',preparation:'earth',herbaces:'earth',herbaces_surface:'earth',decapage:'earth',decapage_surface:'earth',excavation:'earth',excavation_surface:'earth',excavation_niveaux:'earth',fouille:'earth',rigoles:'earth',rigoles_surface:'earth',cadre_rigoles:'earth',remblai:'earth',remblai_debords:'earth',abords:'earth',regalage:'earth',evacuation:'earth',proprete:'shallow',proprete_surface:'shallow',beton_semelles:'shallow',semelles_surface:'shallow',semelle:'shallow',radier:'shallow',aciers_semelles:'steel',treillis:'steel',attentes:'steel',mur:'general',maconnerie_rdc:'masonry',maconnerie_etage:'masonry',cloison:'general',beton:'concrete',poteau:'concrete',poutre:'concrete',linteau:'concrete',murets:'concrete',murets_surface:'concrete',coffrage:'concrete',dallage:'dallage',forme:'dallage',sable:'dallage',film:'dallage',joints:'dallage',isolant:'thermal',canalisation:'sewer',drainage:'sewer',regards:'sewer',remblai_drainant:'earth'};
  return index?.profils?.[map[preset]||'general']||null;
}
