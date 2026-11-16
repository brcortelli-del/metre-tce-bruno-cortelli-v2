import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {catalogueIndex,fromClause,normalizeCctp,plainBlocks,blocksText} from '../public/cctp-model.js';
import {countryCatalogue,switchCountryCctp} from '../public/country-cctp.js';
import {decorateNormativeCatalogue,adoptNormativeCctp,appendNormativeParagraph,calculatorNormativeProfile} from '../public/normative-fr.js';
const read=n=>JSON.parse(readFileSync(new URL('../public/data/'+n,import.meta.url),'utf8'));
const course=read('cctp-library.json'),proofs=read('cctp-sources.json'),countries=read('cctp-fr-lu.json');
const index=read('normative-fr-index.json'),audit=read('audit-normatif-france.json'),full=read('referentiel-normatif-france-lots01-02.json');
const raw=catalogueIndex(course,proofs),cat=country=>decorateNormativeCatalogue(countryCatalogue(raw,countries,country),index,country);
test('normatif : 554 fiches au schéma demandé, 54 références conservées et sources vérifiables',()=>{
  const works=full.referentiel_normatif_france.flatMap(l=>l.ouvrages_normes),sources=new Set(full.sources.map(s=>s.id));
  assert.equal(works.length,554);assert.equal(audit.registre_references.length,54);
  for(const w of works){
    for(const key of ['code_ouvrage','designation','statut_audit','ancienne_norme_cours','normes_en_vigueur','regle_metre_officielle_ccs','alerte_interface_site','paragraphe_cctp_pret_a_inserer'])assert(w[key],w.code_ouvrage+' '+key);
    assert.equal(w.seuil_deduction_m2,null);assert.equal(w.seuil_deduction_m3,null);
    assert(w.sources.every(id=>sources.has(id)));
    const original=raw.find(o=>o.code===w.code_ouvrage);
    for(const r of original.clause_cctp.normes_dtu)assert(w.ancienne_norme_cours.includes(r));
  }
  assert.equal(audit.familles_dtu.length,13);assert.equal(audit.familles_dtu.flatMap(f=>f.parties).length,45);
});
test('normatif : structure réelle des DTU, sans faux CCS ni seuil de réservations',()=>{
  const f=id=>audit.familles_dtu.find(f=>f.id===id);
  assert.deepEqual(f('FR_DTU_13_3').parties.map(p=>p.code),['NF DTU 13.3 P1-1-1','NF DTU 13.3 P1-1-2','NF DTU 13.3 P1-2','NF DTU 13.3 P2']);
  assert.equal(f('FR_DTU_60_11').parties.find(p=>p.code==='NF DTU 60.11 P2').role,'CALCUL_EVACUATION_EU_EV');
  assert.equal(f('FR_DTU_23_1').parties.length,1);
  assert(f('FR_DTU_20_1').parties.some(p=>p.code==='NF DTU 20.1 P3'));
  assert.match(f('FR_DTU_21').regle_metre.texte,/0,05|sommaire|Sommaire/);
  assert.equal(f('FR_DTU_21').regle_metre.seuil_m3,null);
});
test('normatif : domaines proposés sans confondre dalle portée, prédalle, dallage et poutrelles',()=>{
  const by=c=>index.ouvrages[c].profil;
  assert.equal(by('GO-F14'),'shallow');assert.equal(by('GO-D13'),'dallage');
  assert.equal(by('GO-H01'),'concrete');assert.equal(by('GO-H02'),'poutrelles');assert.equal(by('GO-H04'),'predalle');assert.equal(by('GO-H06'),'alveole');
  assert.equal(calculatorNormativeProfile('dalle',index).id,'general');
  assert.equal(calculatorNormativeProfile('decapage_surface',index).id,'earth');
});
test('normatif : aucune substitution NF T54-090 et source propre du DTU11.1',()=>{
  const unresolved=audit.registre_references.find(r=>r.reference_cours==='NF T54-090');assert.deepEqual(unresolved.references_proposees,[]);
  assert.match(cat('france').find(o=>o.code==='TVRD-5.13').source.vigilance,/non vérifiée/);
  const sondage=audit.registre_references.find(r=>r.reference_cours==='DTU 11.1');
  assert(sondage.sources.some(id=>audit.sources.find(s=>s.id===id).url.includes('/dtu-111/')));
  assert(!sondage.sources.some(id=>audit.sources.find(s=>s.id===id).url.includes('/dtu-12/')));
});
test('normatif : migration versionnée conserve textes, anciennes références, mode de métré et liens',()=>{
  const fr=cat('france'),original=fromClause(countryCatalogue(raw,countries,'france').find(o=>o.code==='GO-V02'),'a');
  original.references='DTU 20.1\nRéférence particulière du projet';original.execution=plainBlocks('Prescription personnalisée à garder');original.measurement=plainBlocks('Décompte convenu au marché');original.rowIds=['mur'];original.reviewed=true;
  const d={version:1,articles:[original]},next=adoptNormativeCctp(d,fr);
  const a=next.articles[0];assert.match(a.references,/20.1 P1-1/);assert.equal(a.source.previousReferences,original.references);assert.equal(a.execution,original.execution);assert.equal(a.measurement,original.measurement);assert.equal(a.rowIds,original.rowIds);assert.equal(a.reviewed,false);
  assert.equal(normalizeCctp(next).articles[0].source.normativeVersion,index.metadata.version);
  assert.equal(normalizeCctp(next).articles[0].source.previousReferences,original.references);
  assert.equal(adoptNormativeCctp(next,fr),next);
});
test('normatif : Luxembourg et brouillons personnalisés conservés, retour FR actualisé',()=>{
  const fr=cat('france'),lu=cat('luxembourg'),base=countryCatalogue(raw,countries,'luxembourg');
  assert.deepEqual(lu,base);
  const a=fromClause(fr.find(o=>o.code==='GO-V02'),'a');a.execution=plainBlocks('Texte FR du chantier');
  let d=switchCountryCctp({version:1,articles:[a]},'luxembourg',lu,'france');
  assert.equal(adoptNormativeCctp(d,lu,'luxembourg'),d);assert.match(d.articles[0].references,/CTG 012/);
  d.articles[0].execution=plainBlocks('Texte LU du chantier');
  d=adoptNormativeCctp(switchCountryCctp(normalizeCctp(d),'france',fr,'luxembourg'),fr);
  assert.equal(blocksText(d.articles[0].execution),'Texte FR du chantier');assert.equal(d.articles[0].source.normativeVersion,index.metadata.version);
  d=switchCountryCctp(normalizeCctp(d),'luxembourg',lu,'france');assert.equal(blocksText(d.articles[0].execution),'Texte LU du chantier');
});
test('normatif : nouvelle clause actuelle, ajout explicite sans doublon ni prescription arbitraire',()=>{
  const o=cat('france').find(o=>o.code==='GO-F14'),a=fromClause(o,'a');
  assert.match(blocksText(a.execution),/classe_resistance/);assert.doesNotMatch(blocksText(a.execution),/C25\/30|350 kg/);
  const original=plainBlocks('Texte personnel'),next=appendNormativeParagraph(original,o.normative);
  assert.equal(next[0],original[0]);assert.equal(appendNormativeParagraph(next,o.normative),next);
  assert.throws(()=>appendNormativeParagraph(plainBlocks('x'.repeat(15999)),o.normative),/16000/);
});
test('normatif : migration de 500 articles ne modifie pas les objets déjà actualisés',()=>{
  const fr=cat('france'),o=fr.find(o=>o.code==='GO-V02');
  const articles=Array.from({length:500},(_,i)=>fromClause(o,'a'+i));articles[212]={...articles[212],source:{...articles[212].source,normativeVersion:''}};
  const d={version:1,articles},next=adoptNormativeCctp(d,fr);
  assert.notEqual(next.articles[212],articles[212]);
  assert.equal(next.articles.filter((a,i)=>a===articles[i]).length,499);
});
