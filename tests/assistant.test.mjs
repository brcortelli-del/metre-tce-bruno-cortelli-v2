import test from 'node:test';
import assert from 'node:assert/strict';
import { analyserLocalement, controlesAssistant, preparerLigneAssistant, trouverDoublon, verifierResultatIA } from '../public/assistant-metre.js';
import { upgradeProject } from '../public/business.js';
import { insertProjectRows } from '../public/project-state.js';
import { createHistory } from '../public/history.js';
import { analyserAvecOpenAI, nettoyerDemandeIA, handleAssistantApi } from '../server/assistant.js';

const texte='Création de 42,5 m² de cloisons hydrofuges et pose de 3 blocs-portes.';
const proposition=()=>analyserLocalement(texte).postes_detectes[0];
test('le texte réel détermine les postes, sans résultats fixes ni spécifications ajoutées',()=>{
  const result=analyserLocalement(texte);
  assert.equal(result.moteur,'local');assert.equal(result.postes_detectes.length,2);
  const [cloison,porte]=result.postes_detectes;
  assert.equal(cloison.quantite_estimee,42.5);assert.equal(cloison.unite,'m²');assert.equal(cloison.designation,'cloisons hydrofuges');
  assert.equal(porte.quantite_estimee,3);assert.equal(porte.unite,'u');assert.equal(porte.lot,'Menuiseries intérieures');
  assert.ok(!cloison.designation.includes('M48'));assert.ok(!porte.designation.includes('93'));
  assert.deepEqual(analyserLocalement('Bonjour, je te rappelle demain.').postes_detectes,[]);
  assert.equal(analyserLocalement('Carrelage : 12 m2').postes_detectes[0].quantite_estimee,12);
});
test('les épaisseurs, dimensions et quantités inconnues ne deviennent pas des surfaces supposées',()=>{
  for(const text of ['Cloison BA13 avec laine 45 mm','Mur de 6 m x 2,5 m','Bloc-porte 93 x 204 cm','Carrelage sans quantité']){
    const result=analyserLocalement(text);assert.equal(result.postes_detectes[0].quantite_estimee,null,text);
  }
  assert.equal(analyserLocalement('HSP 2,50 m').postes_detectes.length,0);
  assert.equal(analyserLocalement('25 ml de plinthes').postes_detectes[0].quantite_estimee,25);
});
test('décimales françaises, milliers, comptages et unités distinctes',()=>{
  const result=analyserLocalement('Peinture 1 200,50 m² ; fouilles 14.50 m3 ; 4 prises ; 2 ensembles de sanitaires');
  assert.deepEqual(result.postes_detectes.map(p=>[p.quantite_estimee,p.unite]),[[1200.5,'m²'],[14.5,'m³'],[4,'u'],[2,'forfait']]);
});
test('zéro, négatifs et comptages fractionnaires demandent une correction',()=>{
  for(const text of ['0 m2 de carrelage','-3 m3 de fouilles','1,5 blocs-portes'])assert.equal(analyserLocalement(text).postes_detectes[0].quantite_estimee,null);
  assert.equal(analyserLocalement('Hors carrelage 24 m²').postes_detectes.length,0);
});
test('les contrôles vérifient les compléments séparément et ne prescrivent pas un ouvrage',()=>{
  const posts=analyserLocalement('Fouilles 14 m3').postes_detectes;
  const alerts=controlesAssistant(posts,[{label:'Évacuation des terres'}]);
  assert.equal(alerts.length,1);assert.match(alerts[0],/propreté/);
  assert.equal(controlesAssistant(posts,[{label:'Évacuation'},{label:'Béton de propreté'}]).length,0);
  assert.ok(controlesAssistant([{designation:'Cloison BA13 sans isolant'}]).some(t=>t.includes('isolant')));
});
test('un ajout possède une provenance, reste sans prix et conserve la quantité après réouverture',()=>{
  const row=preparerLigneAssistant(proposition());
  const project=insertProjectRows(upgradeProject({version:1,title:'Essai',rows:[]}),[row]);
  assert.equal(project.rows[0].result.total,42.5);assert.equal(project.rows[0].unitPrice,null);
  const restored=upgradeProject(JSON.parse(JSON.stringify(project)));
  assert.equal(restored.rows[0].result.unit,'m²');assert.equal(restored.rows[0].assistantSource.quote,proposition().extrait_source);
  assert.equal(restored.rows[0].assistantSource.engine,'local');
});
test('le contrôle des doublons fonctionne après sauvegarde, et autorise une autre localisation',()=>{
  const p=proposition(),row=preparerLigneAssistant(p),project=insertProjectRows(upgradeProject({version:1,title:'Essai',rows:[]}),[row]);
  assert.throws(()=>preparerLigneAssistant(p,project.rows),/déjà/);
  assert.equal(trouverDoublon({...p,localisation:'R+1'},project.rows),null);
  assert.ok(preparerLigneAssistant({...p,localisation:'R+1'},project.rows));
  assert.equal(trouverDoublon({designation:'Autre',unite:'m²',quantite_estimee:8},[{label:'Sans provenance',result:{unit:'m²',total:8}}]),null);
});
test('validation atomique : les champs invalides ne génèrent aucune ligne',()=>{
  for(const change of [{quantite_estimee:''},{quantite_estimee:null},{quantite_estimee:-1},{quantite_estimee:'12abc'},{quantite_estimee:Infinity},{unite:'mm'},{designation:''},{unite:'u',quantite_estimee:1.5}])assert.throws(()=>preparerLigneAssistant({...proposition(),...change}));
});
test('500 lignes : seul le nouveau poste est calculé, et son ajout est annulable',()=>{
  const base=upgradeProject({version:1,title:'Grand chantier',rows:Array.from({length:500},(_,i)=>({id:'base-'+i,label:'Ligne '+i,input:{preset:'reprise',outputUnit:'m²',dimensionUnit:'m',dimensions:{Q:'1'},count:'1',deduction:'0'}}))});
  const next=insertProjectRows(base,[preparerLigneAssistant(proposition(),base.rows)]);
  assert.equal(next.rows.length,501);for(let i=0;i<500;i++)assert.equal(next.rows[i],base.rows[i]);
  const history=createHistory();history.record(base,next);assert.equal(history.undo(next).rows.length,500);
});
test('les entrées trop longues ou contenant plus de 80 postes sont refusées',()=>{
  assert.throws(()=>analyserLocalement('a'.repeat(12001)),/12 000/);
  assert.throws(()=>analyserLocalement(Array(81).fill('Carrelage 1 m2').join('; ')),/80 postes/);
  const longText='Carrelage '+('précisions '.repeat(200))+'24 m²';
  const p=analyserLocalement(longText).postes_detectes[0];
  assert.ok(p.extrait_source.length<=1500);assert.ok(p.extrait_source.includes('24 m²'));assert.ok(preparerLigneAssistant(p));
});

const iaResult=(changes={})=>({postes_detectes:[{lot:'Plâtrerie / Isolation',designation:'Cloisons hydrofuges',unite:'m2',quantite_estimee:42.5,justification:'Quantité explicite.',extrait_source:'Création de 42,5 m² de cloisons hydrofuges',...changes}],alertes_coherence:[]});
test('le JSON IA est contrôlé au-delà de sa syntaxe : citation et preuve numérique',()=>{
  assert.equal(verifierResultatIA(iaResult(),texte).postes_detectes[0].unite,'m²');
  const madeUp=verifierResultatIA(iaResult({quantite_estimee:100}),texte);
  assert.equal(madeUp.postes_detectes[0].quantite_estimee,null);assert.ok(madeUp.alertes_coherence.length);
  assert.throws(()=>verifierResultatIA(iaResult({extrait_source:'Texte inventé'}),texte),/absente/);
  assert.throws(()=>verifierResultatIA(iaResult({unite:'mm'}),texte),/Unité/);
  assert.throws(()=>verifierResultatIA({postes_detectes:null,alertes_coherence:[]},texte),/conforme/);
});
test('le contexte envoyé à l’IA exclut prix, marges, coordonnées et plans',()=>{
  const data=nettoyerDemandeIA({text:texte,lignes:[{designation:'Mur',lot:'Gros œuvre',unite:'m²',price:999,address:'Privé',plan:'base64'}],country:'luxembourg'});
  assert.deepEqual(Object.keys(data.lignes[0]),['designation','lot','unite']);assert.equal(data.pays,'Luxembourg');
  assert.throws(()=>nettoyerDemandeIA({text:texte,lignes:Array(501).fill({})}),/500/);
});
test('appel OpenAI côté serveur au bon endpoint, avec schéma strict et traitement des refus',async()=>{
  const body={text:texte,lignes:[]};let request;
  const fetcher=async(url,init)=>{request={url,init};return Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify(iaResult())}}]});};
  const result=await analyserAvecOpenAI(body,'secret-test',{fetcher});
  assert.equal(request.url,'https://api.openai.com/v1/chat/completions');
  const payload=JSON.parse(request.init.body);assert.equal(payload.model,'gpt-4o-mini');assert.equal(payload.response_format.json_schema.strict,true);assert.equal(payload.store,false);
  assert.ok(!JSON.stringify(result).includes('secret-test'));
  for(const [data,pattern] of [[{choices:[{finish_reason:'length',message:{content:'{}'}}]},/incomplète/],[{choices:[{finish_reason:'stop',message:{refusal:'refus'}}]},/accepté/]])await assert.rejects(()=>analyserAvecOpenAI(body,'test',{fetcher:async()=>Response.json(data)}),pattern);
  await assert.rejects(()=>analyserAvecOpenAI(body,'test',{fetcher:async()=>new Response('',{status:429})}),/Quota/);
});
test('sans clé : configuration explicite et extraction locale serveur, aucun faux résultat IA',async()=>{
  const caps=await handleAssistantApi(new Request('https://atelier.test/api/assistant'),{});assert.deepEqual(await caps.json(),{configured:false,model:null});
  const result=await handleAssistantApi(new Request('https://atelier.test/api/assistant',{method:'POST',body:JSON.stringify({texteClient:texte})}),{});
  assert.equal(result.status,200);const data=await result.json();assert.equal(data.moteur,'local');assert.equal(data.fallback_reason,'cle_absente');
  assert.deepEqual(data.postes_detectes.map(p=>p.quantite_estimee),[42.5,3]);
});
