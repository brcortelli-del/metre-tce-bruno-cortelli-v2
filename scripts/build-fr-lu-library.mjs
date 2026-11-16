/** Construction reproductible de la couche auditée ; l'extraction des livres
 * reste intacte pour distinguer source historique, correction et règle de marché. */
import { readFileSync, writeFileSync } from 'node:fs';
import { measurementRule, AUDIT_DATE } from '../public/country-rules.js';
const root = new URL('../public/data/', import.meta.url);
const read = n => JSON.parse(readFileSync(new URL(n, root), 'utf8'));
const write = (n, v) => writeFileSync(new URL(n, root), JSON.stringify(v, null, 2) + '\n');
const course = read('cctp-library.json'), proofs = read('cctp-sources.json');
const extraNorms=JSON.parse(readFileSync(new URL('./fr-norms-extra.json',import.meta.url),'utf8'));
const source = (id, title, url, locator, status = 'verifie') => ({ id, titre: title, url, repere: locator, consulte_le: AUDIT_DATE, statut: status });
const sources = [
  source('LU_INDEX','CRTI-B — catalogue des CTG','https://www.crtib.lu/fr/clauses-techniques','CTG 002 v3 ; CTG 012 v5 du 02/10/2026 ; CTG 013 v6'),
  source('LU_002','CRTI-B CTG 002, version 3, 15/01/2003','https://www.crtib.lu/api/media/file/CTG002_fr-1.pdf','PDF p.17, §002.1.5 ; date de l’index différente des versions en préparation'),
  source('LU_012','CRTI-B CTG 012, version 5, 02/10/2026','https://www.crtib.lu/api/media/file/CTG_012-Mauerarbeiten_FR_v5.0%20%2B%20ANNEX-1.pdf','PDF p.18-40, §1.5 ; p.45-47 unités ; p.35 seuil surfacique ; figure54 p.40 cas volumique'),
  source('LU_013','CRTI-B CTG 013, version 6','https://www.crtib.lu/api/media/file/CTG013_vers_6_0-1.pdf','PDF p.15-18, §013.1.5 ; document daté03/04/2007, index10/07/2007'),
  source('LU_011','CRTI-B CTG 011, version2','https://www.crtib.lu/api/media/file/CTG011_fr-1.pdf','PDF p.10-11, §011.1.5 ; règle particulière isolants/barrières'),
  source('LU_023','CTG 023, version4 du04/11/2015','https://marches.public.lu/dam-assets/fr/legislation/cahiers-speciaux-des-charges-standardises/domaine-parachevement/CTG-023-fr.pdf','PDF p.16-17, §1.5.2-1.5.3'),
  source('LU_034','CTG 034, version4 du26/06/2007','https://marches.public.lu/dam-assets/fr/legislation/cahiers-speciaux-des-charges-standardises/domaine-parachevement/CTG-034-fr.pdf','PDF p.18-20, §1.5'),
  source('LU_039','CTG 039, version3','https://marches.public.lu/dam-assets/fr/legislation/cahiers-speciaux-des-charges-standardises/domaine-parachevement/CTG-039-fr.pdf','PDF p.22-36, §1.5 ; murs/plafonds/planchers distincts'),
  source('LU_ILNAS','ILNAS — normes et compléments nationaux','https://portail-qualite.public.lu/fr/normes-normalisation/participer-normalisation/normes-nationales.html','ILNAS-EN206:2013+A2:2021+CN-LU:2023 ; annexes nationales aux Eurocodes'),
  source('LU_TRANSITION','ILNAS — lancement des annexes Eurocodes2e génération','https://portail-qualite.public.lu/fr/actualites/normes-normalisation/2026/lancement-travaux-annexes-nationales-eurocodes-2e-generation.html','22/10/2026 : travaux lancés, ne pas considérer les futures annexes comme déjà publiées'),
  source('LU_OAI','OAI — publication des CTG mises à jour','https://www.oai.lu/fr/24/accueil/actualite-agenda/actualite/0-mode-news-id-7329/?CC=OK','CTG012 révisée ; mise en œuvre par RGD17/09/2026'),
  source('FR_CCAG','CCAG Travaux2021','https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000043315688/','Article11, constats et mesurages contradictoires ; aucun seuil universel de baies vérifié'),
  source('FR_12','AFNOR DTU12 annulé','https://www.boutique.afnor.org/fr-fr/norme/dtu-12/dtu-12-terrassement-pour-le-batiment-edition-octobre-1978/fa006657/47733','statut annulé ; remplacement unique non établi'),
  source('FR_131','CSTB NF DTU13.1 septembre2019','https://boutique.cstb.fr/detail/documents-techniques-unifies/dtu-nf-dtu/13-fondations/nf-dtu-13-1-fondations-superficielles','remplace13.11 et13.12 ; domaine fondations superficielles/semi-profondes, élancement≤5'),
  source('FR_132','AFNOR NF DTU13.2 mai2020','https://www.boutique.afnor.org/fr-fr/norme/nf-dtu-132/travaux-de-batiment-fondations-profondes-partie-11-elements-relatifs-a-lexe/fa200628/85494','en vigueur'),
  source('FR_133','AFNOR NF DTU13.3 décembre2021','https://www.boutique.afnor.org/fr-fr/norme/nf-dtu-133/travaux-de-dallages-conception-calcul-et-execution-partie-111-cahier-des-cl/fa204046/303472','en vigueur'),
  source('FR_201','AFNOR NF DTU20.1 juillet2020','https://www.boutique.afnor.org/fr-fr/norme/nf-dtu-201/travaux-de-batiment-ouvrages-en-maconnerie-de-petits-elements-parois-et-mur/fa200726/85614','en vigueur ; notice de catalogue, texte intégral non librement vérifié'),
  source('FR_21','AFNOR NF DTU21 juin2017','https://www.boutique.afnor.org/fr-fr/norme/nf-dtu-21/dtu-21-travaux-de-batiment-execution-des-ouvrages-en-beton-partie-11-cahier/fa191614/1668','en vigueur ; exécution béton, distinct du calcul EC2'),
  source('FR_231','AFNOR NF P18-210 / DTU23.1 mai1993','https://www.boutique.afnor.org/fr-fr/norme/nf-p18210/dtu-231-travaux-de-batiment-murs-en-beton-banche-cahier-des-clauses-techniq/fa029709/290','encore en vigueur'),
  source('FR_232','AFNOR NF DTU23.2 août2008','https://www.boutique.afnor.org/fr-fr/norme/nf-dtu-232/travaux-de-batiment-planchers-a-dalles-alveolees-prefabriquees-en-beton-par/fa160758/31803','dalles alvéolées préfabriquées seulement'),
  source('FR_BAEL','AFNOR BAEL91 / DTUP18-702','https://www.boutique.afnor.org/fr-fr/norme/dtu-p18702/regles-bael-91-regles-techniques-de-conception-et-de-calcul-des-ouvrages-et/fa026070/47746','annulé ; aucune conversion automatique des formules de dimensionnement'),
  source('FR_206','AFNOR NF EN206+A2/CN décembre2025','https://www.boutique.afnor.org/fr-fr/norme/nf-en-206-a2-cn/beton-specification-performance-production-et-conformite-complement-nationa/fa211302/456716','en vigueur, tirage2juillet2026'),
  source('FR_206_TRANSITION','AFNOR NF EN206-1 mars2026 — note informative','https://www.boutique.afnor.org/fr-fr/norme/nf-en-2061/beton-specification-performances-production-et-conformite-partie-1-performa/fa205827/598969','maintien206+A2/CN2025 en attendant toutes les nouvelles parties'),
  source('FR_CCTG','CCTG — arrêté7oct2021 consolidé','https://www.legifrance.gouv.fr/loda/id/JORFTEXT000044206042/','articles2-3 : fascicules2 et70-I/II listés ; applicables aux marchés qui s’y réfèrent'),
  source('FR_03001','AFNOR NF P03-001 octobre2017','https://www.boutique.afnor.org/fr-fr/norme/nf-p03001/marches-prives-cahiers-types-cahier-des-clauses-administratives-generales-a/fa188203/1682','remplace décembre2000 ; marchés privés'),
  source('FR_13791','AFNOR NF EN13791/CN octobre2021','https://www.boutique.afnor.org/fr-fr/norme/nf-en-13791-cn/evaluation-de-la-resistance-a-la-compression-sur-site-des-structures-et-des/fa201969/279175','référence publiée ; ne plus citer prNF'),
  source('FR_123903','AFNOR NF EN12390-3 juin2019','https://www.boutique.afnor.org/fr-fr/norme/nf-en-123903/essais-pour-beton-durci-partie-3-resistance-a-la-compression-des-eprouvette/fa190566/83462','en vigueur ; millésime1999 du livre non retrouvé'),
  source('FR_ACIER1','AFNOR NF A35-080-1 mai2020','https://www.boutique.afnor.org/fr-fr/norme/nf-a350801/aciers-pour-beton-arme-aciers-soudables-partie-1-barres-et-couronnes/fa193699/84994','barres/couronnes ; chaîne de remplacement A35-016'),
  source('FR_ACIER2','AFNOR NF A35-080-2 mars2022','https://www.boutique.afnor.org/fr-fr/norme/nf-a350802/aciers-pour-beton-arme-aciers-soudables-partie-2-treillis-soudes/fa199399/322715','treillis soudés ; domaine à respecter, notamment diamètres'),
];
for(const [i,n] of extraNorms.entries())for(const [j,s] of n.sources.entries())sources.push(source(`FR_EXTRA_${i}_${j}`,s.titre,s.url,s.repere||n.controle));
const replacements = [
  { pattern:'13\\.(?:11|12)', current:['NF DTU 13.1 — septembre 2019'], ids:['FR_131'], status:'remplace' },
  { pattern:'DTU 13\\.1$', current:['NF DTU 13.1 — septembre 2019'], ids:['FR_131'], status:'actualise' },
  { pattern:'DTU 13\\.2', current:['NF DTU 13.2 — mai 2020'], ids:['FR_132'], status:'actualise' },
  { pattern:'DTU 13\\.3', current:['NF DTU 13.3 — décembre 2021'], ids:['FR_133'], status:'actualise' },
  { pattern:'DTU 20\\.1', current:['NF DTU 20.1 — juillet 2020'], ids:['FR_201'], status:'actualise' },
  { pattern:'DTU 21(?:$| )', current:['NF DTU 21 — juin 2017'], ids:['FR_21'], status:'actualise' },
  { pattern:'DTU 23\\.1', current:['NF P 18-210 / DTU 23.1 — mai 1993'], ids:['FR_231'], status:'maintenu' },
  { pattern:'DTU 23\\.2', current:['NF DTU 23.2 — août 2008 (dalles alvéolées seulement)'], ids:['FR_232'], status:'domaine_restreint' },
  { pattern:'DTU (?:11\\.1|12)$', current:[], ids:['FR_12'], status:'retire_sans_remplacement_unique' },
  { pattern:'BAEL', current:[], ids:['FR_BAEL'], status:'historique_non_transposable' },
  { pattern:'NF EN 206', current:['NF EN 206+A2/CN — décembre 2025'], ids:['FR_206','FR_206_TRANSITION'], status:'actualise_transition' },
  { pattern:'P 03-001', current:['NF P 03-001 — octobre 2017 (si marché privé y faisant référence)'], ids:['FR_03001'], status:'remplace' },
  { pattern:'prNF EN 13791', current:['NF EN 13791/CN — octobre 2021'], ids:['FR_13791'], status:'projet_devenu_norme' },
  { pattern:'NF EN 12390-3', current:['NF EN 12390-3 — juin 2019'], ids:['FR_123903'], status:'millesime_ancien_non_identifie' },
  { pattern:'NF A 35-016', current:['NF A 35-080-1 — mai 2020 (barres/couronnes)','NF A 35-080-2 — mars 2022 (treillis, selon domaine)'], ids:['FR_ACIER1','FR_ACIER2'], status:'scinde_selon_produit' },
  { pattern:'NF A 35-019-2', current:['NF A 35-080-2 — mars 2022 (selon domaine)'], ids:['FR_ACIER2'], status:'remplace' },
  { pattern:'CCTG fascicule 2$', current:['CCTG fascicule 2 — Terrassements généraux (si prévu au marché)'], ids:['FR_CCTG'], status:'reference_contractuelle' },
  { pattern:'CCTG fascicule 70$', current:['CCTG 70-I / 70-II — mai 2021, partie à choisir selon ouvrage'], ids:['FR_CCTG'], status:'partie_a_preciser' },
];
function auditNorm(n) {
  const extra=extraNorms.find(e=>e.reference_cours.replace(/\s/g,'')===n.replace(/\s/g,''));
  if(extra)return {...extra,sources:extra.sources.map((_,j)=>`FR_EXTRA_${extraNorms.indexOf(extra)}_${j}`)};
  const m=replacements.find(r=>new RegExp(r.pattern,'i').test(n));
  return {reference_cours:n, statut:m?.status||'non_verifie_dans_cet_audit', references_proposees:m?.current||[], sources:m?.ids||[], controle:'statut_et_domaine_sur_notice_officielle ; clauses intégrales non certifiées'};
}
function family(o) {
  const c=o.code, t=o.designation_courte.toLowerCase();
  if (/^TVRD-(?:[1234]\.\d|9\.E0[1-5]$|9\.T)/.test(c) && !/engazonn/.test(t)) return 'earth';
  if (/BBM|blocs? (?:creux|pleins|de béton)|briques|moellons|béton cellulaire|muret.*pierre/i.test(t)) return 'masonry';
  if (/^(GO-F(?:1[2-8]|2[0-5])|GO-P20|GO-I01|GO-V01|GO-B0[1-5]|GO-D1[34])$/.test(c) || /béton armé|mur en béton|béton banché|dalle béton|semelle.*béton|puits en gros béton/i.test(t)) return 'concrete';
  if (/coffrage/i.test(t)) return 'formwork';
  if (/^GO-P/.test(c)) return 'deep';
  return 'particular';
}
const frNet='Règle de décompte à définir dans les pièces du marché. Pour l’exercice : quantité géométrique nette, ouvertures saisies entièrement déduites ; aucun seuil général de0,50m² attribué au NF DTU20.1 par cet audit.';
const earthLu='CTG002 §1.5 : déblais en m³ en place ou m² selon position, profils initiaux/théoriques ou modifications acceptées et attachements contradictoires. Le volume foisonné de transport reste distinct. Remblai : profils, attachements ou tickets de pesage selon position.';
const rules=[
  {id:'FR_NET_PEDAGOGIQUE',pays:'france',libelle:frNet,seuil:null,sources:['FR_CCAG','FR_201'],automatisation:'net_pedagogique_non_contractuel'},
  {id:'LU_EARTH',pays:'luxembourg',libelle:earthLu,seuil:null,sources:['LU_002'],automatisation:'geometrie_profils_saisis'},
  {id:'LU_MASONRY',pays:'luxembourg',libelle:'CTG012 v5 : baies isolées mesurées aux plus petites dimensions, déduction entière si >2,5m² en surface. Cas des baies en volume illustré figure54 : >0,5m³. Joints, linteaux et réservations particulières : dispositions distinctes du §1.5 ; les tableaux et trumeaux ne sont pas déduits automatiquement par ce moteur.',sources:['LU_012'],seuil_m2:2.5,seuil_m3:0.5,limite:'Moteur : baies rectangulaires traversantes isolées. Assemblages, niches et ouvertures en angle à traiter séparément.'},
  {id:'LU_CONCRETE',pays:'luxembourg',libelle:'CTG013 §1.5 : baies >0,5m³ en volume ; ouvertures >2,5m² en surface. Armatures non retranchées du béton. Saignées/conduits : seuil distinct0,1m³ par ml, hors automatisation. Coffrage : surface développée et déductions >2,5m² ; joues des réservations distinctes.',sources:['LU_013'],seuil_m2:2.5,seuil_m3:0.5},
  {id:'LU_PARTICULAR',pays:'luxembourg',libelle:'Position à spécifier au marché : aucun seuil déduit de son seul intitulé. Les unités du cours sont indicatives, les règles du lot CTG concerné doivent être choisies.',sources:['LU_INDEX'],seuil:null,automatisation:false},
  {id:'LU_PLASTER',pays:'luxembourg',libelle:'CTG023 : réservations≤2,5m² non déduites ; interruptions linéaires≤1m non déduites. Tableaux et sous-faces de linteaux comptés séparément en longueur, classes de profondeur avec forfait15cm si profondeur≤15cm.',sources:['LU_023'],seuil_m2:2.5,automatisation:'baies_rectangulaires_isolees_en_parois_uniquement'},
  {id:'LU_DRYWALL',pays:'luxembourg',libelle:'CTG039 : parois verticales, évidements≤2,5m² non déduits ; planchers≤0,5m² non déduits. Plafonds ouverts déduits sauf éléments techniques intégrés ; trappes jamais déduites. Tableaux et fonds de niches séparés. Cas distincts, pas de seuil unique.',sources:['LU_039'],automatisation:'parois_verticales_uniquement'},
  {id:'LU_PAINT',pays:'luxembourg',libelle:'CTG034 : réservations>2,5m² déduites, ou>0,5m² dans les planchers ; interruptions linéaires>1m. Fonds de niches, tableaux et sous-faces de linteaux à surface réelle, positions distinctes.',sources:['LU_034'],automatisation:'parois_verticales_uniquement'},
  {id:'LU_FACADE_ISOLATION',pays:'luxembourg',libelle:'CTG011 §1.5.1 : cas spécifique des isolants et barrières, baies≤6m² non déduites, ouvertures plus grandes comptées à6m² chacune ; cas d’encadrement complet aux cotes de jour. Aucune généralisation aux enduits intérieurs. Interprétation et position à confirmer.',sources:['LU_011'],automatisation:false},
];
const registry=Object.fromEntries(rules.map(r=>[r.id,r]));
const allNorms=[...new Set(course.lots.slice(0,2).flatMap(l=>l.ouvrages.flatMap(o=>o.clause_cctp.normes_dtu)))].map(auditNorm);
const covered=course.lots.slice(0,2).map(l=>({
  numero_lot:l.numero_lot,nom_lot_fr:l.nom_lot,nom_lot_lu:l.numero_lot==='01'?'Terrassement / VRD — positions de soumission':'Gros œuvre — maçonnerie et béton',
  ouvrages:l.ouvrages.map(o=>{
    const f=family(o), a=o.clause_cctp, p=proofs.ouvrages.find(p=>p.code===o.code);
    const ns=a.normes_dtu.map(auditNorm), standards=[...new Set(ns.flatMap(n=>n.references_proposees))];
    const frRefs=[...new Set(ns.flatMap(n=>n.sources).concat('FR_CCAG'))];
    const luId=f==='earth'?'LU_EARTH':f==='masonry'?'LU_MASONRY':['concrete','formwork'].includes(f)?'LU_CONCRETE':'LU_PARTICULAR';
    const luRefs=registry[luId].sources;
    const unverified=ns.filter(n=>!n.sources.length || n.statut.includes('non_verifie')).map(n=>n.reference_cours);
    // Aucun DTU français n'est transformé par simple préfixe en norme ILNAS.
    const luNorms=[f==='earth'?'CTG 002 — v3':f==='masonry'?'CTG 012 — v5 du02/10/2026':['concrete','formwork'].includes(f)?'CTG 013 — v6':'CTG applicable à préciser'];
    if (f==='concrete')luNorms.push('ILNAS-EN 206:2013+A2:2021+CN-LU:2023');
    const unit={ml:'m',U:'u'}[o.unite]??o.unite;
    const base=[a.description_technique,a.mise_en_oeuvre].filter(Boolean).join('\n');
    const note='Base pédagogique à adapter aux plans, à l’étude et aux performances du marché ; les valeurs fixes des exemples ne constituent pas des exigences actuelles vérifiées.';
    const frText=[base,note].filter(Boolean).join('\n');
    const luText=[`Position de soumission : ${o.designation_courte}.`,base,note,'Définir séparément les prestations auxiliaires/spéciales et les limites de la position ; références et performances selon dossier de soumission.'].join('\n');
    const formula=o.formule_defaut;
    const isMasonry=f==='masonry', isConcrete=f==='concrete';
    const luFormula=(isMasonry||isConcrete)&&unit==='m2'
      ? 'L * H - ouvertures.reduce((s, o) => s + (Math.round(o.largeur * o.hauteur * 1e12) / 1e12 > 2.5 ? o.largeur * o.hauteur * o.nombre : 0), 0)'
      : (isMasonry||isConcrete)&&unit==='m3'
        ? 'L * H * ep - ouvertures.reduce((s, o) => s + (Math.round(o.largeur * o.hauteur * ep * 1e12) / 1e12 > 0.5 ? o.largeur * o.hauteur * ep * o.nombre : 0), 0)'
        : formula;
    return {code:o.code,designation_fr:o.designation_courte,designation_lu:o.designation_courte,unite:unit,
      unite_source:o.unite,statut_unite:'indicative_a_confirmer_au_bordereau',famille_mesurage:f,
      audit_correction:ns.some(n=>n.references_proposees.length)?'Références vérifiées proposées selon leur domaine ; source historique conservée séparément.':'Aucune actualisation normative démontrée pour cette fiche ; description du cours à relire.',
      audit_normes:ns,references_non_verifiees:unverified,source_cours:p,
      comparatif_metre:{
        france:{formule_js:formula,regle_id:'FR_NET_PEDAGOGIQUE',regle_deduction:frNet,normes:standards,sources:frRefs,application_automatique:'geometrie_nette_pedagogique'},
        luxembourg:{formule_js:luFormula,regle_id:luId,regle_deduction:registry[luId].libelle,normes:luNorms,sources:luRefs,application_automatique:luId==='LU_PARTICULAR'?false:'baies_rectangulaires_isolees_et_geometrie_saisie'}
      },
      clause_cctp:{texte_france:frText,texte_luxembourg:luText,description_fr:a.description_technique,description_lu:`${o.designation_courte}. ${a.description_technique}`,mise_en_oeuvre_fr:a.mise_en_oeuvre,mise_en_oeuvre_lu:a.mise_en_oeuvre,localisation_type:a.localisation_type,statut:'trame_pedagogique_a_adapter_et_relire',references_cours:a.normes_dtu}
    };
  })
}));
const geometryIds=new Set(['FORM_SURFACE_RECTANGLE','FORM_SURFACE_NETTE','FORM_VOLUME_RECTANGULAIRE','FORM_VOLUME_NET','FORM_LONGUEUR_HO_DO','FORM_COTE_REDUITE_TRAPEZE','FORM_FOUILLE_TALUS_SECTION_CONSTANTE','FORM_DECAPAGE_SURFACE','FORM_DECAPAGE_VOLUME','FORM_FOISONNEMENT','FORM_PENTE_DENIVELEE','FORM_PENTE_CM_PAR_M','FORM_PENTE_MM_PAR_M','FORM_COMPACITE_GRANULATS','GO_SEMELLE_VOLUME','GO_SEMELLE_ISOLEE','GO_PIEU_CYLINDRIQUE','GO_COFFRAGE_SEMELLE','GO_RADIER_VOLUME','GO_MUR_NET','GO_PIGNON_TRIANGLE','GO_LONGRINE_VOLUME','GO_DALLAGE_VOLUME','GO_ACIER_RATIO','GO_TREILLIS_MASSE','GO_LINTEAU_LONGUEUR','GO_ACIER_SECTION_POURCENT','GO_BLONDEL','GO_MARCHE_HAUTEUR','GO_ESCALIER_RECULEMENT','GO_PAILLASSE_DEVELOPPE','GO_PAILLASSE_VOLUME','GO_MARCHES_VOLUME','FAC_TABLEAUX_SURFACE','FAC_ENDUIT_VOLUME','FAC_MASSE_PIERRE','FUM_SECTION_RECTANGULAIRE','FUM_SECTION_CIRCULAIRE','FUM_LONGUEUR_DEVOIEMENT','VEN_SOMME_DEBITS']);
const formulaAudit=course.formules_calcul.map(f=>({...f,statut_audit:geometryIds.has(f.id)?'identite_mathematique_verifiee_sous_hypotheses':'historique_ou_ratio_non_revalide_reglementairement',hypotheses:geometryIds.has(f.id)?'Dimensions cohérentes et positives, brut≥vides, section constante si formule prismatique ; pas de validation structurelle.':'Valeurs et domaine du livre uniquement ; ne pas transposer automatiquement au dimensionnement actuel.',sources_cours:proofs.formules_calcul.find(p=>p.id===f.id),application_dimensionnement_automatique:false}));
const corrections=[
  {id:'ARRONDI',source:'L1 p.34 / PDF36',avant:'24,7587 → 27,759 m³',apres:'24,7587 → 24,759 m³',statut:'correction_arithmetique_certaine'},
  {id:'SECTIONS_ACIER',source:'L2 p.66 / PDF68',avant:'2HA10,8HA8,4HA7 présentés comme équivalents',apres:'πd²/4 : 2HA10=1,571cm² ; 8HA8=4,021cm² ; 4HA7=1,539cm². Ils ne sont pas strictement équivalents ; aucun choix de ferraillage automatique.',statut:'correction_geometrique_certaine'},
  {id:'DOSAGE',source:'L2 p.73 / PDF75',avant:'175kg ciment+275kg chaux annoncés400kg',apres:'Somme450kg ; dosage visé indéterminé, à clarifier plutôt que choisir une composition.',statut:'addition_corrigee_prescription_indeterminee'},
  {id:'UNITES_ENDUIT',source:'L2 p.166 / PDF168',avant:'20m monocouche ; gobetis3à5cm dans système20mm',apres:'Incohérence d’unité détectée ; épaisseurs à préciser, aucune substitution normative automatique.',statut:'anomalie_a_resoudre'},
  {id:'NUANCE_ACIER',source:'L2 p.66 / PDF68',avant:'200MPa avec HAFeE500',apres:'Mention contradictoire ; nuance et résistance selon étude et produit, pas de valeur200MPa réutilisée comme exigence actuelle.',statut:'anomalie_a_resoudre'},
  {id:'FORMULES_BAEL',source:'L1-L2',avant:'Formules historiques et prédimensionnements',apres:'Séparés des identités géométriques ; conservés pour le cours, non convertis en calcul Eurocode par changement d’étiquette.',statut:'historique_exclu_dimensionnement_actuel'},
  {id:'CTG012_FIG40',source:'CRTI-B CTG012 v5 PDFp.34, figure40',avant:'Légende de baie avec ≤2,5m² et mention àdéduire',apres:'Contradiction avec §1.5.3.1 et figure41 : le moteur des baies isolées suit le texte général et la figure41 (>2,5m²), pas cette légende incohérente.',statut:'contradiction_source_officielle_signalee'},
];
const audit={metadata:{version:'1.0',verifie_le:AUDIT_DATE,perimetre:'Couche FR/LU pour lots01et02 ; audit des99expressions et inventaire267sigles. Statut/domaine vérifiés pour les références listées ; aucune certification exhaustive des prescriptions des trois livres.',ouvrages:covered.reduce((s,l)=>s+l.ouvrages.length,0)},sources,regles:rules,normes:allNorms,corrections,formules:formulaAudit,abreviations:course.abreviations.map(a=>({...a,statut:a.signification?'transcrit_du_cours_non_redefini':'non_developpe_dans_source_a_completer'})),limites:['Les notices AFNOR confirment statut et domaine, pas toutes les clauses techniques payantes.','Les exemples fixes ne deviennent pas des clauses de marché actuelles.','Choisir les éditions et annexes nationales cohérentes de l’étude, notamment en transition Eurocodes.','Pas de règle universelle au nu extérieur/intérieur : préciser la prestation et la CTG.','Les autres lots restent identifiés comme cours historique, hors adaptation FR/LU de cette livraison.']};
write('cctp-fr-lu.json',{metadata:audit.metadata,sources,regles:rules,formules_calcul:formulaAudit,abreviations:audit.abreviations,lots:covered});
write('cctp-audit-fr-lu.json',audit);
console.log(JSON.stringify({lots:covered.length,ouvrages:audit.metadata.ouvrages,formules:formulaAudit.length,normes_verifiees:allNorms.filter(n=>n.sources.length).length,normes_a_verifier:allNorms.filter(n=>!n.sources.length).length}));
