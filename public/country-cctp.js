import { fromClause, blocksText } from './cctp-model.js';
import { normalizeCountry, AUDIT_DATE } from './country-rules.js';

/** Projection à la demande : aucune copie des 741 clauses dans l'état du projet. */
export function countryCatalogue(catalogue, database, country) {
  country = normalizeCountry(country);
  const byCode = new Map((database?.lots || []).flatMap(l => l.ouvrages).map(o => [o.code, o]));
  const refs = new Map((database?.sources || []).map(s => [s.id, s]));
  return catalogue.map(o => {
    const b = byCode.get(o.code);
    if (!b) return { ...o, country, source: { ...o.source,
      note: [o.source?.note, 'Cours historique : ouvrage hors adaptation FR/LU des lots01 et02. Références et mode de métré à vérifier.'].filter(Boolean).join(' '), country } };
    const r = b.comparatif_metre[country], c=b.clause_cctp;
    const proposal = country === 'luxembourg';
    return { ...o, country, unite:b.unite, designation_courte:proposal?b.designation_lu:b.designation_fr,
      lotName: database.lots.find(l=>l.numero_lot===o.lotNumber)?.[proposal?'nom_lot_lu':'nom_lot_fr'] || o.lotName,
      clause_cctp: { ...o.clause_cctp,
        description_technique: proposal ? c.description_lu : c.description_fr,
        mise_en_oeuvre: [proposal?c.mise_en_oeuvre_lu:c.mise_en_oeuvre_fr,
          proposal?'Position de soumission : préciser les prestations auxiliaires et spéciales, les performances et les limites suivant le cahier des charges du marché.':'CCTP : préciser les performances, les limites de prestation et les pièces contractuelles du marché.',
          'Les valeurs fixes des exemples du cours restent à adapter à l’étude ; cette trame nécessite une relecture.'].filter(Boolean).join('\n'),
        normes_dtu: r.normes,
      },
      regle_metre: { ...o.regle_metre, vides_pour_pleins:r.regle_deduction },
      source: { ...o.source, country, auditDate:AUDIT_DATE,
        note:[b.audit_correction, b.references_non_verifiees.length ? 'Références du cours non vérifiées : '+b.references_non_verifiees.join(' ; ')+'.' : '', 'Statut des notices vérifié ; prescriptions complètes non certifiées.'].filter(Boolean).join(' '),
        links:r.sources.map(id=>refs.get(id)).filter(Boolean).map(s=>({label:s.titre,url:s.url})),
      },
    };
  });
}
const fields=['lotName','title','references','description','execution','location','measurement','unit','source'];
const snapshot=a=>Object.fromEntries(fields.map(k=>[k,a[k]]));
/** Migration des articles antérieurs au choix de pays : actualiser uniquement
 * les références, préserver les prescriptions rédigées et demander relecture. */
export function adoptCountryCctp(doc,country,catalogue) {
  const byCode=new Map(catalogue.map(o=>[o.code,o]));let changed=false;
  const articles=doc.articles.map(a=>{
    if(a.country)return a;
    const o=byCode.get(a.source?.code);if(!o)return a;
    changed=true;
    return {...a,country,references:(o.clause_cctp.normes_dtu||[]).join('\n'),source:o.source,reviewed:false};
  });
  return changed?{...doc,articles}:doc;
}
export function switchCountryCctp(doc, country, targetCatalogue, previousCountry='france') {
  country=normalizeCountry(country);
  const byCode=new Map(targetCatalogue.map(o=>[o.code,o]));
  const articles=doc.articles.map(a=>{
    const oldCountry=a.country||normalizeCountry(previousCountry);
    if(oldCountry===country)return a;
    const drafts={...a.countryDrafts,[oldCountry]:snapshot(a)};
    if(drafts[country])return {...a,...drafts[country],country,countryDrafts:drafts,reviewed:false};
    const o=byCode.get(a.source?.code||a.code);
    if(!o)return {...a,country,countryDrafts:drafts,reviewed:false,
      source:{...(a.source||{}),country,note:'Article libre ou sans correspondance : texte conservé, adaptation au pays à effectuer.'}};
    const generated=fromClause(o,a.id);
    // Conserver le repère et la localisation du chantier ; les prescriptions
    // personnalisées sont retrouvées dans le brouillon du pays précédent.
    return {...a,...snapshot(generated),title:a.title || generated.title,
      location:blocksText(a.location).trim()?a.location:generated.location,
      country,countryDrafts:drafts,reviewed:false};
  });
  return {...doc,articles};
}
