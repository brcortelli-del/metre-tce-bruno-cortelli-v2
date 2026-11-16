import test from 'node:test';
import assert from 'node:assert/strict';
import {QUALITY_POINTS,qualityPayload,qualityFingerprint,qualityKey,scanQuality,qualityScore,readQuality,localFinalRisks,requestFinalAudit,auditBatches} from '../public/quality-control.js';
import {rowCctpFingerprint} from '../public/row-cctp.js';
import {handleAssistantApi} from '../server/assistant.js';
import {validateFinalAudit} from '../server/audit-final.js';
const row=()=>({id:'r1',code:'01.09.01',label:'RPE nord',lot:'Gros œuvre',level:'RDC',room:'Nord',input:{preset:'mur',count:'1',dimensions:{L:'10',h:'2.5'},deduction:'0'},result:{unit:'m²',total:25,formula:'L × H',steps:['Brut : 10 × 2,5 = 25 m²','Net : 25 − 0 = 25 m²']}});
const project=()=>{const r=row();r.cctpArticle={text:'RPE nord : fourniture et pose, support à préciser.',sourceFingerprint:rowCctpFingerprint(r,'france')};return{title:'Courbet',country:'france',rows:[r],cctp:{articles:[]}};};
const req=(projet,extra={})=>new Request('https://atelier.test/api/analyse-metre',{method:'POST',body:JSON.stringify({operation:'audit_final',projet,...extra})});
test('10 critères : score honnête, anomalies bloquantes et projet vide à zéro',()=>{
 const p=qualityPayload(project()),checked=Object.fromEntries(QUALITY_POINTS.map(p=>[p.id,true]));assert.equal(QUALITY_POINTS.length,10);assert.deepEqual(scanQuality(p),[]);assert.equal(qualityScore(checked,p),100);
 p.lignes[0].quantite=0;p.lignes[0].unite='';assert.equal(qualityScore(checked,p),90);assert.deepEqual(new Set(scanQuality(p).map(i=>i.code)),new Set(['zero_quantity','missing_unit']));
 assert.equal(qualityScore(checked,{lignes:[],articlesCCTP:[]}),0);assert.equal(qualityScore({scope:true},qualityPayload(project())),10);
});
test('Contrôles : quantité absente, minutes, localisation et CCTP manquants identifiés par ligne',()=>{
 const p=qualityPayload(project()),r=p.lignes[0];r.quantite=null;r.minute.etapes=[];r.zone='';r.cctp='';
 const issues=scanQuality(p);assert.deepEqual(issues.map(i=>i.code),['invalid_quantity','missing_minute','missing_location','missing_cctp']);assert.ok(issues.every(i=>i.rowId==='r1'));
 r.minute={preset:'reprise',dimensions:{Q:'25'},etapes:['Quantité : 25','Total : 25']};assert.ok(scanQuality(p).some(i=>i.code==='missing_minute'));r.minute.preuvePlan=true;assert.ok(!scanQuality(p).some(i=>i.code==='missing_minute'));
});
test('CCTP lié dans l’éditeur accepté ; article vide et article obsolète signalés',()=>{
 const p=qualityPayload(project());p.lignes[0].cctp='';p.articlesCCTP=[{id:'a1',rowIds:['r1'],description:'Description rédigée',miseEnOeuvre:''}];assert.ok(!scanQuality(p).some(i=>i.code==='missing_cctp'));
 p.articlesCCTP[0].description='';assert.ok(scanQuality(p).some(i=>i.code==='missing_cctp'));
 p.lignes[0].cctp='Rédaction antérieure';p.lignes[0].cctpObsolete=true;assert.ok(scanQuality(p).some(i=>i.code==='stale_cctp'));
});
test('Coches isolées par projet et invalidées après changement du métré ou du CCTP',()=>{
 const p=project(),snapshot=qualityPayload(p),fp=qualityFingerprint(snapshot),store={getItem:()=>JSON.stringify({fingerprint:fp,checked:{scope:true,cctp:true,inconnu:true}})};
 assert.deepEqual(readQuality(store,'k',fp),{scope:true,cctp:true});p.rows[0].result.total=30;assert.deepEqual(readQuality(store,'k',qualityFingerprint(qualityPayload(p))),{});
 p.rows[0].result.total=25;p.rows[0].cctpArticle.text+=' Texte modifié.';assert.notEqual(qualityFingerprint(qualityPayload(p)),fp);assert.notEqual(qualityKey({cloudId:'a'}),qualityKey({cloudId:'b'}));assert.deepEqual(readQuality({getItem:()=>'{broken'},'k',fp),{});
});
test('Projet complet : aucune limite à 500 lignes ; tous les articles segmentés exactement une fois, sans prix',()=>{
 const p=project();p.rows=Array.from({length:501},(_,i)=>({...row(),id:'r'+i,unitPrice:999,margin:20,plan:'octets',cctpArticle:{text:'Article complet '+i}}));p.cctp.articles=[{id:'a1',rowIds:['r0'],title:'Article éditeur',description:'Texte éditeur complet',execution:'Pose',location:'Nord',measurement:'m²',references:'À vérifier'}];
 const payload=qualityPayload(p),serialized=JSON.stringify(payload),batches=auditBatches(payload);assert.equal(payload.lignes.length,501);assert.ok(batches.length>1);assert.equal(batches.flatMap(b=>b.lignes).length,501);assert.equal(new Set(batches.flatMap(b=>b.lignes.map(r=>r.id))).size,501);assert.equal(batches.flatMap(b=>b.articlesCCTP).length,1);assert.match(serialized,/Article complet 500/);for(const hidden of ['unitPrice','margin','octets'])assert.ok(!serialized.includes(hidden));
});
test('Route audit : secours local explicite, trois risques et aucun appel OpenAI en démo',async()=>{
 let calls=0;const payload=qualityPayload(project());payload.lignes[0].quantite=0;for(const [extra,env,reason] of [[{}, {OPENAI_API_KEY:''},'cle_absente'],[{demo:true},{OPENAI_API_KEY:'secret'},'demo']]){
 const response=await handleAssistantApi(req(payload,extra),env,{fetcher:async()=>{calls++;throw Error('Interdit');}}),data=await response.json();assert.equal(data.operation,'audit_final');assert.equal(data.moteur,'local');assert.equal(data.fallback_reason,reason);assert.equal(data.risques.length,3);assert.equal(data.lignesAnalysees,1);assert.equal(data.risques[0].nature,'constat');assert.ok(data.risques[0].ligneIds.includes('r1'));assert.match(response.headers.get('cache-control'),/no-store/);
 }assert.equal(calls,0);assert.equal(localFinalRisks(qualityPayload(project())).filter(r=>r.nature==='à vérifier').length,3);
});
const key='sk-test-quality-server';
const upstream=(id='r1')=>Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify({risques:[1,2,3].map(n=>({titre:'Risque '+n,nature:'à vérifier',constat:'Contrôle manuel nécessaire.',ligneIds:id?[id]:[],action:'Recouper les pièces et le métré.'}))})}}]});
test('OpenAI jury : JSON strict, endpoint fixe et trois risques ; clé absente de la réponse',async()=>{
 const payload=qualityPayload(project());let call;const response=await handleAssistantApi(req(payload),{OPENAI_API_KEY:' '+key+' '},{fetcher:async(url,init)=>{call={url,init};return upstream();}}),data=await response.json();
 assert.equal(data.moteur,'openai');assert.equal(data.risques.length,3);assert.equal(call.url,'https://api.openai.com/v1/chat/completions');assert.equal(call.init.headers.authorization,'Bearer '+key);const body=JSON.parse(call.init.body);assert.equal(body.response_format.json_schema.strict,true);assert.match(body.messages[0].content,/jury d’examen/);assert.match(body.messages[1].content,/RPE nord/);assert.ok(!JSON.stringify(data).includes(key));
});
test('Audit multi-segments : chaque ligne est envoyée, puis synthèse globale unique',async()=>{
 const p=project();p.rows=Array.from({length:160},(_,i)=>({...row(),id:'r'+i,cctpArticle:{text:'Description technique '.repeat(60)}}));const payload=qualityPayload(p),calls=[];
 const data=await(await handleAssistantApi(req(payload),{OPENAI_API_KEY:key},{fetcher:async(url,init)=>{const input=JSON.parse(JSON.parse(init.body).messages[1].content);calls.push(input);return upstream(input.projet?.lignes[0]?.id||null);}})).json();
 assert.equal(data.moteur,'openai');const segments=calls.filter(c=>c.segment);assert.equal(segments.length,data.segmentsAnalyses);assert.equal(segments.flatMap(c=>c.projet.lignes).length,160);assert.equal(calls.filter(c=>c.analysesSegments).length,1);assert.equal(data.risques.length,3);
});
test('Audit : rejet HTTP, réponse inventant un identifiant et annulation ne deviennent pas un succès IA',async()=>{
 const payload=qualityPayload(project());for(const fetcher of [async()=>Response.json({error:{code:'quota',message:'Erreur '+key}},{status:429}),async()=>upstream('inexistant')]){const data=await(await handleAssistantApi(req(payload),{OPENAI_API_KEY:key},{fetcher})).json();assert.equal(data.moteur,'local');assert.equal(data.fallback_reason,'api_indisponible');assert.ok(!JSON.stringify(data).includes(key));}
 const controller=new AbortController();await assert.rejects(()=>handleAssistantApi(new Request('https://atelier.test/api/analyse-metre',{method:'POST',body:JSON.stringify({operation:'audit_final',projet:payload}),signal:controller.signal}),{OPENAI_API_KEY:key},{fetcher:async()=>{controller.abort();throw new DOMException('Annulé','AbortError');}}),e=>e.status===499);
});
test('Validation et client : pas d’audit partiel silencieux, route unique et erreurs lisibles',async()=>{
 const p=qualityPayload(project());assert.throws(()=>validateFinalAudit({projet:{...p,lignes:[]}}));const tooBig={...p,titre:'x'.repeat(2000001)};assert.throws(()=>validateFinalAudit({projet:tooBig}),e=>e.status===413);let calls=0;await assert.rejects(()=>requestFinalAudit(tooBig,{fetcher:async()=>{calls++;}}),/Aucun envoi partiel/);assert.equal(calls,0);
 let call;await requestFinalAudit(p,{fetcher:async(url,init)=>{call={url,init};return Response.json({moteur:'local',risques:localFinalRisks(p)});}});assert.equal(call.url,'/api/analyse-metre');assert.equal(JSON.parse(call.init.body).operation,'audit_final');assert.equal(call.init.credentials,'same-origin');
 await assert.rejects(()=>requestFinalAudit(p,{fetcher:async()=>Response.json({error:'Connexion propriétaire requise'},{status:401})}),/propriétaire/);
});
