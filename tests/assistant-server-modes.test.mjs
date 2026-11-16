import test from 'node:test';
import assert from 'node:assert/strict';
import { handleAssistantApi } from '../server/assistant.js';
import { analyserDepuisServeur } from '../public/assistant-client.js';
import { verifierReponseServeur, preparerLigneAssistant } from '../public/assistant-metre.js';

const texte='Création de 42,5 m² de cloisons hydrofuges et pose de 3 blocs-portes.';
const key='secret-uniquement-serveur';
const req=(body={},signal)=>new Request('https://atelier.test/api/analyse-metre',{method:'POST',body:JSON.stringify({texteClient:texte,...body}),signal});
const modelResult={postes_detectes:[{lot:'Plâtrerie / Isolation',designation:'Cloisons hydrofuges',unite:'m2',quantite_estimee:42.5,justification:'Quantité écrite dans le descriptif.',extrait_source:'Création de 42,5 m² de cloisons hydrofuges'}],alertes_coherence:[]};
const upstream=(data=modelResult)=>Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify(data)}}]});

test('local forcé, clé absente et démo : aucune requête OpenAI ; moteur réel déclaré',async()=>{
  let calls=0;const fetcher=async()=>{calls++;throw new Error('Ne doit pas être appelé');};
  for(const [body,env,reason] of [[{mode:'local'},{OPENAI_API_KEY:key},null],[{mode:'auto'},{},'cle_absente'],[{mode:'auto',demo:true},{OPENAI_API_KEY:key},'demo']]){
    const response=await handleAssistantApi(req(body),env,{fetcher}),data=await response.json();
    assert.equal(response.status,200);assert.equal(data.moteur,'local');assert.equal(data.moteur_utilise,'Analyse locale serveur');assert.equal(data.fallback_reason,reason);
    const checked=verifierReponseServeur(data,texte);assert.deepEqual(checked.postes_detectes.map(p=>p.quantite_estimee),[42.5,3]);assert.ok(data.alertes_coherence.some(a=>a.includes('protection à l’eau')));
    assert.match(response.headers.get('cache-control'),/no-store/);
  }
  assert.equal(calls,0);
});
test('Auto avec clé : endpoint fixe, réponse contrôlée et source OpenAI explicite',async()=>{
  let call;
  const response=await handleAssistantApi(req({mode:'auto',lignesMetreActuelles:[{designation:'Bandes et joints',unitPrice:123}]}),{OPENAI_API_KEY:key},{fetcher:async(url,init)=>{call={url,init};return upstream();}});
  const data=await response.json();assert.equal(response.status,200);assert.equal(data.moteur,'openai');assert.equal(data.fallback_reason,null);
  assert.equal(verifierReponseServeur(data,texte).postes_detectes[0].quantite_estimee,42.5);
  assert.equal(call.url,'https://api.openai.com/v1/chat/completions');assert.equal(call.init.headers.authorization,'Bearer '+key);
  assert.ok(!call.init.body.includes('unitPrice'));assert.ok(!JSON.stringify(data).includes(key));
  assert.ok(!data.alertes_coherence.some(a=>a.includes('traitement des joints')));
});
test('erreurs HTTP, réseau, délai et réponses IA inutilisables : repli local explicite sans fuite',async()=>{
  const errors=[
    ...[401,429,500].map(status=>async()=>new Response('détail privé '+key,{status})),
    async()=>{throw new Error('TLS / réseau '+key);},
    async()=>{throw new DOMException('délai '+key,'TimeoutError');},
    async()=>new Response('pas du JSON'),
    async()=>Response.json({choices:[{finish_reason:'stop',message:{content:'{'}}]}),
    async()=>Response.json({choices:[{finish_reason:'stop',message:{refusal:'refus'}}]}),
    async()=>Response.json({choices:[{finish_reason:'length',message:{content:'{}'}}]}),
    async()=>upstream({...modelResult,postes_detectes:[{...modelResult.postes_detectes[0],extrait_source:'Citation fabriquée'}]}),
  ];
  for(const fetcher of errors){
    const response=await handleAssistantApi(req(),{OPENAI_API_KEY:key},{fetcher}),data=await response.json();
    assert.equal(response.status,200);assert.equal(data.moteur,'local');assert.equal(data.fallback_reason,'api_indisponible');
    assert.match(data.alertes_coherence[0],/Bascule automatique/);assert.deepEqual(data.postes_detectes.map(p=>p.quantite_estimee),[42.5,3]);assert.ok(!JSON.stringify(data).includes(key));
  }
});
test('les erreurs de saisie ne déclenchent ni appel IA ni repli silencieux',async()=>{
  let called=false;const fetcher=async()=>{called=true;return upstream();};
  for(const body of [{texteClient:''},{texteClient:'a'.repeat(12001)},{mode:'externe'},{lignesMetreActuelles:Array(501).fill({})}])await assert.rejects(()=>handleAssistantApi(req(body),{OPENAI_API_KEY:key},{fetcher}),e=>e.status===400);
  await assert.rejects(()=>handleAssistantApi(new Request('https://atelier.test/api/analyse-metre',{method:'POST',body:'{'}),{}, {fetcher}),e=>e.status===400);
  assert.equal(called,false);
});
test('une annulation utilisateur ne produit pas un résultat local de remplacement',async()=>{
  const controller=new AbortController();
  const pending=handleAssistantApi(req({},controller.signal),{OPENAI_API_KEY:key},{fetcher:async()=>{controller.abort();throw new DOMException('annulé','AbortError');}});
  await assert.rejects(()=>pending,e=>e.status===499);
});
test('le contexte existant supprime les rappels déjà couverts ; pièces et pieces reconnues',async()=>{
  const response=await handleAssistantApi(req({mode:'local',texteClient:'Fouilles 12 m³\nBlocs-portes 3 pieces\nPrises 4 pièces',lignesMetreActuelles:[{designation:'Réemploi des terres et béton de propreté'}]}),{});
  const data=await response.json();assert.deepEqual(data.postes_detectes.map(p=>p.quantite_estimee),[12,3,4]);assert.ok(!data.alertes_coherence.some(a=>/devenir des terres|béton de propreté/.test(a)));
});
test('les deux boutons utilisent la même route sécurisée et ne transmettent ni prix ni plan',async()=>{
  for(const mode of ['auto','local']){
    let request;const lignes=Array.from({length:501},(_,i)=>({label:'Mur '+i,lot:'Gros œuvre',result:{unit:'m²',total:10},unitPrice:999,margin:20,plan:'octets-privés',address:'adresse-privée'}));
    const result=await analyserDepuisServeur({texte,lignes,mode},{fetcher:async(url,init)=>{
      request={url,init};return handleAssistantApi(req(JSON.parse(init.body)),{});
    }});
    assert.equal(request.url,'/api/analyse-metre');assert.equal(request.init.credentials,'same-origin');assert.equal(result.moteur,'local');
    const body=JSON.parse(request.init.body);assert.equal(body.mode,mode);assert.equal(body.lignesMetreActuelles.length,500);assert.deepEqual(Object.keys(body.lignesMetreActuelles[0]),['designation','lot','unite']);
    for(const hidden of ['unitPrice','margin','octets-privés','adresse-privée'])assert.ok(!request.init.body.includes(hidden));
    const row=preparerLigneAssistant({...result.postes_detectes[0],moteur:result.moteur,execution:'serveur'});assert.equal(row.assistantSource.execution,'serveur');assert.equal(row.assistantSource.engine,'local');
  }
});
test('transport indisponible ou accès refusé : aucune extraction fabriquée côté navigateur',async()=>{
  for(const [status,pattern] of [[401,/Connecte-toi/],[403,/propriétaire/],[500,/serveur/]])await assert.rejects(()=>analyserDepuisServeur({texte,mode:'local'},{fetcher:async()=>Response.json({},{status})}),pattern);
  await assert.rejects(()=>analyserDepuisServeur({texte},{fetcher:async()=>{throw new TypeError('Failed to fetch');}}),/serveur est inaccessible/);
  await assert.rejects(()=>analyserDepuisServeur({texte},{fetcher:async()=>{throw new DOMException('Timeout','TimeoutError');}}),/répondu à temps/);
  const controller=new AbortController();controller.abort();await assert.rejects(()=>analyserDepuisServeur({texte,signal:controller.signal},{fetcher:async()=>{throw controller.signal.reason;}}),{name:'AbortError'});
});
test('source serveur inconnue ou incohérente refusée avant de proposer un ajout',async()=>{
  const valid=await (await handleAssistantApi(req({mode:'local'}),{})).json();
  for(const patch of [{moteur:'autre'},{moteur_utilise:'OpenAI'},{moteur:'openai',moteur_utilise:'OpenAI GPT-4o-mini · serveur'}])assert.throws(()=>verifierReponseServeur({...valid,...patch},texte));
});
