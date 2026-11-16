import test from 'node:test';
import assert from 'node:assert/strict';
import { handleStatusIA } from '../server/status-ia.js';
import { handleAssistantApi } from '../server/assistant.js';
import { openAIKey } from '../server/openai-diagnostic.js';

const key='sk-test-private-secret';
const statusRequest=()=>new Request('https://atelier.test/api/status-ia');
const analyseRequest=()=>new Request('https://atelier.test/api/analyse-metre',{method:'POST',body:JSON.stringify({texteClient:'Pose de 3 blocs-portes.'})});

test('statut réel : clé nettoyée, endpoint authentifié, réponse non mise en cache',async()=>{
  let call;
  const response=await handleStatusIA(statusRequest(),{OPENAI_API_KEY:'  '+key+'\n'},{fetcher:async(url,init)=>{call={url,init};return Response.json({data:[]});}});
  const data=await response.json();
  assert.equal(call.url,'https://api.openai.com/v1/models');
  assert.equal(call.init.method,'GET');
  assert.equal(call.init.redirect,'manual');
  assert.equal(call.init.headers.authorization,'Bearer '+key);
  assert.deepEqual([data.openaiConfigured,data.connexionReelle,data.statusHttp,data.detailErreur],[true,true,200,null]);
  assert.match(response.headers.get('cache-control'),/no-store/);
  assert.ok(!JSON.stringify(data).includes(key));
});

test('statut : absence de clé sans appel, HTTP exact et détail expurgé',async()=>{
  let calls=0;
  const fetcher=async()=>{calls++;return Response.json({error:{code:'invalid_api_key',message:'Incorrect API key provided: '+key}},{status:401});};
  const absent=await (await handleStatusIA(statusRequest(),{OPENAI_API_KEY:''},{fetcher})).json();
  assert.equal(absent.openaiConfigured,false);assert.equal(calls,0);
  const rejected=await (await handleStatusIA(statusRequest(),{OPENAI_API_KEY:key},{fetcher})).json();
  assert.equal(rejected.statusHttp,401);assert.equal(rejected.connexionReelle,false);
  assert.equal(rejected.code,'invalid_api_key');assert.match(rejected.detailErreur,/Incorrect API key/);
  assert.ok(!JSON.stringify(rejected).includes(key));
});

test('analyse : statut HTTP fournisseur et diagnostic détaillé avant secours local',async()=>{
  for(const [http,code] of [[400,'invalid_request_error'],[401,'invalid_api_key'],[429,'insufficient_quota'],[500,'server_error']]){
    const response=await handleAssistantApi(analyseRequest(),{OPENAI_API_KEY:' '+key+' '},{fetcher:async()=>Response.json({error:{code,message:'Détail fournisseur '+key}},{status:http})});
    const data=await response.json();
    assert.equal(data.moteur,'local');assert.equal(data.diagnostic_openai.statusHttp,http);
    assert.equal(data.diagnostic_openai.code,code);
    assert.ok(data.alertes_coherence.some(s=>s.includes('HTTP '+http)&&s.includes(code)&&s.includes('Détail fournisseur')));
    assert.ok(!JSON.stringify(data).includes(key));
  }
});

test('réseau et délai : aucun faux statut HTTP, détail masqué et repli explicite',async()=>{
  for(const error of [new Error('TLS '+key),new DOMException('Timeout '+key,'TimeoutError')]){
    const fetcher=async()=>{throw error;};
    const status=await (await handleStatusIA(statusRequest(),{OPENAI_API_KEY:key},{fetcher})).json();
    assert.equal(status.statusHttp,null);assert.equal(status.connexionReelle,false);assert.ok(!JSON.stringify(status).includes(key));
    const analyse=await (await handleAssistantApi(analyseRequest(),{OPENAI_API_KEY:key},{fetcher})).json();
    assert.equal(analyse.diagnostic_openai.statusHttp,null);assert.equal(analyse.moteur,'local');assert.ok(!JSON.stringify(analyse).includes(key));
  }
});

test('entrée Node ESM : aucun en-tête client ne peut fournir une identité de confiance',async()=>{
  for(const path of ['analyse-metre','status-ia']){
    const {default:handler}=await import('../api/'+path+'.js');
    let code,data;
    const res={setHeader(){},status(value){code=value;return this;},json(value){data=value;}};
    await handler({headers:{'oai-authenticated-user-id':'spoofed'}},res);
    assert.equal(code,503);assert.match(data.error,/Passerelle/);
  }
  assert.equal(openAIKey({OPENAI_API_KEY:' \n '+key+'  '}),key);
});
