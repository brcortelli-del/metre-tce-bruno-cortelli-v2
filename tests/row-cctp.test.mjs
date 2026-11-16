import test from 'node:test';
import assert from 'node:assert/strict';
import {handleGenerateCctp,validateCctpRequest} from '../server/generer-cctp.js';
import {handleApi} from '../server/api.js';
import {upgradeProject} from '../public/business.js';
import {patchProjectRow} from '../public/project-state.js';
import {createHistory} from '../public/history.js';
import {normalizeRowCctp,saveCctpToProject,rowCctpFingerprint,cctpRowIsStale,collectRowCctp,rowCctpText,generateRowCctp,rowCctpButtonMarkup} from '../public/row-cctp.js';
const key='sk-test-server-private',poste={lot:'Gros œuvre',designation:'RPE taloché',zone:'Façade nord',niveau:'RDC',unite:'m²',quantite:21.76};
const request=(body={},signal)=>new Request('https://atelier.test/api/generer-cctp',{method:'POST',body:JSON.stringify({poste,...body}),signal});
const content={localisation_support:'Façade nord, RDC. Support à préciser.',description_normes:'RPE taloché. Référence applicable à vérifier au marché.',mise_en_oeuvre:'Préparation et finitions à préciser.',metre_reglement:'Au m², 21,76 m² indicatifs. Déductions à préciser.'};
const upstream=()=>Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify(content)}}]});
test('CCTP : secours local et démo sans appel fournisseur, quatre rubriques et quantité explicites',async()=>{
 let calls=0;for(const [body,env,reason] of [[{},{OPENAI_API_KEY:''},'cle_absente'],[{demo:true},{OPENAI_API_KEY:key},'demo']]){
  const response=await handleGenerateCctp(request(body),env,{fetcher:async()=>{calls++;return upstream();}}),data=await response.json();
  assert.equal(response.status,200);assert.equal(data.moteur,'local');assert.equal(data.fallback_reason,reason);assert.match(data.articleCCTP,/21,76 m²/);
  for(const title of ['1. LOCALISATION & SUPPORT','2. DESCRIPTION TECHNIQUE & NORMES','3. MISE EN ŒUVRE & SUJÉTIONS INCLUSES','4. MODE DE MÉTRÉ & RÈGLEMENT'])assert.ok(data.articleCCTP.includes(title));
  assert.match(data.articleCCTP,/aucun seuil/);assert.match(response.headers.get('cache-control'),/no-store/);
 }assert.equal(calls,0);
});
test('CCTP OpenAI : clé nettoyée, endpoint fixe, données autorisées et JSON strict',async()=>{
 let call;const response=await handleGenerateCctp(request({poste:{...poste,unitPrice:999,secret:'non transmis'},contexteProjet:'Ravalement sans prix'}),{OPENAI_API_KEY:'  '+key+'\n'},{fetcher:async(url,init)=>{call={url,init};return upstream();}}),data=await response.json();
 assert.equal(data.moteur,'openai');assert.equal(call.url,'https://api.openai.com/v1/chat/completions');assert.equal(call.init.redirect,'manual');assert.equal(call.init.headers.authorization,'Bearer '+key);
 const body=JSON.parse(call.init.body);assert.equal(body.model,'gpt-4o-mini');assert.equal(body.response_format.json_schema.strict,true);assert.equal(body.store,false);
 assert.ok(!call.init.body.includes('unitPrice'));assert.ok(!call.init.body.includes('non transmis'));assert.ok(!JSON.stringify(data).includes(key));
 assert.match(data.articleCCTP,/2\. DESCRIPTION TECHNIQUE & NORMES/);
});
test('CCTP : rejets HTTP, réseau et réponses inutilisables deviennent des trames locales identifiées',async()=>{
 const cases=[...[401,429,500].map(http=>({http,fetcher:async()=>Response.json({error:{code:'rejet',message:'Erreur '+key}},{status:http})})),{http:null,fetcher:async()=>{throw new Error('TLS '+key);}},{http:200,fetcher:async()=>Response.json({choices:[{finish_reason:'length',message:{content:'texte tronqué'}}]})},{http:200,fetcher:async()=>Response.json({choices:[{finish_reason:'stop',message:{content:'{}'}}]})}];
 for(const item of cases){const data=await (await handleGenerateCctp(request(),{OPENAI_API_KEY:key},{fetcher:item.fetcher})).json();assert.equal(data.moteur,'local');assert.equal(data.fallback_reason,'api_indisponible');assert.equal(data.diagnostic_openai.statusHttp,item.http);assert.ok(!JSON.stringify(data).includes(key));}
});
test('CCTP : validation avant appel, limites, annulation et méthode',async()=>{
 let calls=0;const fetcher=async()=>{calls++;return upstream();};
 for(const body of [{poste:null},{poste:{...poste,designation:''}},{poste:{...poste,designation:'a'.repeat(201)}},{poste:{...poste,quantite:'abc'}},{contexteProjet:'x'.repeat(6001)},{country:'ailleurs'}])await assert.rejects(()=>handleGenerateCctp(request(body),{OPENAI_API_KEY:key},{fetcher}),e=>e.status===400);
 await assert.rejects(()=>handleGenerateCctp(new Request('https://atelier.test/api/generer-cctp',{method:'POST',body:'x'.repeat(40001)}),{}, {fetcher}),e=>e.status===413);
 const method=await handleGenerateCctp(new Request('https://atelier.test/api/generer-cctp'));assert.equal(method.status,405);assert.equal(method.headers.get('allow'),'POST');assert.equal(calls,0);
 const controller=new AbortController();await assert.rejects(()=>handleGenerateCctp(request({},controller.signal),{OPENAI_API_KEY:key},{fetcher:async()=>{controller.abort();throw new DOMException('annulé','AbortError');}}),e=>e.status===499);
 assert.equal(validateCctpRequest({poste:{...poste,quantite:'21,76'}}).poste.quantite,21.76);
});
test('Route CCTP : identité, origine et propriétaire obligatoires ; entrée Node non usurpable',async()=>{
 const DB={prepare(){return {bind(){return this;},run:async()=>({}),first:async()=>({value:'owner'})};}},env={DB,OPENAI_API_KEY:''};
 const call=(uid,origin='https://atelier.test')=>handleApi(new Request('https://atelier.test/api/generer-cctp',{method:'POST',headers:{...(uid?{'oai-authenticated-user-id':uid}:{}),origin},body:JSON.stringify({poste})}),env);
 assert.equal((await call(null)).status,401);assert.equal((await call('visitor')).status,403);assert.equal((await call('owner','https://evil.test')).status,403);assert.equal((await call('owner')).status,200);
 const {default:handler}=await import('../api/generer-cctp.js');let status;await handler({body:{poste},headers:{'oai-authenticated-user-id':'owner'}},{setHeader(){},status(s){status=s;return this;},json(){}});assert.equal(status,503);
});
const project=()=>upgradeProject({version:1,title:'Courbet',rows:[{id:'r1',label:'Enduit nord',lot:'Gros œuvre',level:'RDC',room:'Nord',input:{preset:'surface',dimensionUnit:'m',count:'1',dimensions:{L:'10',w:'2.5'},deduction:'0',openings:[]}}]});
test('Article lié : sauvegarde et réouverture complètes, annulation et calcul inchangé',()=>{
 const p=project(),r=p.rows[0],fingerprint=rowCctpFingerprint(r,p.country),text='1. LOCALISATION\nNord\n2. DESCRIPTION\nRPE à préciser.';
 const next=saveCctpToProject(p,'r1',{text,engine:'local',sourceFingerprint:fingerprint},fingerprint),loaded=upgradeProject(JSON.parse(JSON.stringify(next)));
 assert.equal(loaded.rows[0].cctpArticle.text,text);assert.equal(p.rows[0].cctpArticle,undefined);assert.deepEqual(loaded.rows[0].input,r.input);assert.equal(loaded.rows[0].result.total,r.result.total);
 const history=createHistory();history.record(p,next);assert.equal(history.undo(next).rows[0].cctpArticle,undefined);assert.equal(history.redo(p).rows[0].cctpArticle.text,text);
 assert.throws(()=>normalizeRowCctp({text:'a'.repeat(16001)}));assert.throws(()=>saveCctpToProject(p,'absent',{text},fingerprint));
});
test('Révision de quantité : article signalé obsolète, texte conservé et génération concurrente protégée',()=>{
 const p=project(),fingerprint=rowCctpFingerprint(p.rows[0],p.country),saved=saveCctpToProject(p,'r1',{text:'Quantité ancienne : 25 m²',sourceFingerprint:fingerprint},fingerprint);
 assert.equal(cctpRowIsStale(saved.rows[0],saved.country),false);
 const revised=patchProjectRow(saved,'r1',r=>{r.input.dimensions.L='12';});assert.equal(revised.rows[0].result.total,30);assert.equal(cctpRowIsStale(revised.rows[0],revised.country),true);assert.match(revised.rows[0].cctpArticle.text,/25 m²/);
 assert.throws(()=>saveCctpToProject(revised,'r1',{text:'Ancien contexte'},fingerprint),/changé/);assert.match(rowCctpText(revised),/À RELIRE/);
});
test('Export complet : tous les lots enregistrés, ordre et absence d’article vide ; boutons échappés',()=>{
 const p=project();p.rows=[...p.rows,{...p.rows[0],id:'r2',lot:'Peinture',label:'Mur sud'},{...p.rows[0],id:'r3',lot:'Électricité',label:'Sans article'}];
 for(const id of ['r1','r2']){const row=p.rows.find(r=>r.id===id);row.cctpArticle={text:'Texte '+id,sourceFingerprint:rowCctpFingerprint(row,p.country)};}
 assert.equal(collectRowCctp(p).length,2);const out=rowCctpText(p);assert.match(out,/2 \/ 3/);assert.match(out,/LOT : Gros œuvre/);assert.match(out,/Texte r2/);assert.ok(!out.includes('LOT : Électricité'));
 const html=rowCctpButtonMarkup({id:'"><script>',label:'<img onerror="x">'});assert.ok(!html.includes('<script>'));assert.ok(!html.includes('<img'));assert.ok(html.includes('&lt;img'));
});
test('Client : même origine, aucun prix ou plan transmis et aucun faux résultat sur erreur serveur',async()=>{
 const p=project();p.rows[0].unitPrice=999;p.rows[0].plan='octets';let call;
 const data=await generateRowCctp({row:p.rows[0],project:p,context:'Contexte ciblé'},{fetcher:async(url,init)=>{call={url,init};return Response.json({articleCCTP:'Article',moteur:'local'});}});
 assert.equal(call.url,'/api/generer-cctp');assert.equal(call.init.credentials,'same-origin');assert.equal(data.articleCCTP,'Article');assert.ok(!call.init.body.includes('unitPrice'));assert.ok(!call.init.body.includes('octets'));
 for(const status of [401,403,500])await assert.rejects(()=>generateRowCctp({row:p.rows[0],project:p},{fetcher:async()=>Response.json({error:'Accès refusé'},{status})}),/Accès refusé/);
 await assert.rejects(()=>generateRowCctp({row:p.rows[0],project:p},{fetcher:async()=>Response.json({articleCCTP:'',moteur:'local'})}),/invalide/);
});
