export const QUALITY_POINTS=[
 {id:'scope',title:'Périmètre et consignes du rendu',detail:'Projet, lot, chapitre, pièces attendues et exclusions relus ; absence de prix si le devoir le demande.'},
 {id:'quantities',title:'Quantités et unités renseignées',detail:'Aucune quantité nulle ou invalide, aucune unité absente.',rules:['zero_quantity','invalid_quantity','missing_unit']},
 {id:'minutes',title:'Minutes de calcul traçables',detail:'Dimensions, formules et déductions détaillées ; reprises justifiées par un relevé ou une expression.',rules:['missing_minute']},
 {id:'locations',title:'Niveaux et zones identifiés',detail:'Chaque ouvrage possède un niveau et une zone / pièce explicites.',rules:['missing_location']},
 {id:'scale',title:'Plans, cotes et calibration vérifiés',detail:'Bonne page, bonne échelle, deux cotes de contrôle et hauteurs recoupées sur les coupes.'},
 {id:'deductions',title:'Baies, vides et petites largeurs contrôlés',detail:'Brut − déductions = net ; aucune déduction doublée ; tableaux, voussures, appuis et seuils traités selon le dossier.'},
 {id:'lots',title:'Lots, niveaux et sous-totaux cohérents',detail:'Classement constant, unités séparées, absence de doublons et ratios expliqués.'},
 {id:'cctp',title:'Articles CCTP présents et à jour',detail:'Article enregistré dans la ligne ou article rédigé lié dans l’éditeur CCTP ; relecture après modification du métré.',rules:['missing_cctp','stale_cctp']},
 {id:'technical',title:'Prescriptions et interfaces relues',detail:'Supports, fournitures/pose, performances, sujétions, références et éditions vérifiés ; documentation technique jointe.'},
 {id:'deliverables',title:'Dossier final prêt à rendre',detail:'Codes métré/CCTP concordants, hypothèses levées ou déclarées, exports réouverts, identité et pagination vérifiées.'},
];
const text=(v,max=16000)=>typeof v==='string'?v.slice(0,max):'';
const blocks=v=>typeof v==='string'?v:Array.isArray(v)?v.map(b=>(b?.runs||[]).map(r=>r.text||'').join('')).join('\n'):'';
export const QUALITY_MAX_CHARS=2000000;
export function auditBatches(payload){
 const batches=[];let current={titre:payload.titre,country:payload.country,lignes:[],articlesCCTP:[]},size=0;
 for(const [key,items] of [['lignes',payload.lignes],['articlesCCTP',payload.articlesCCTP]])for(const item of items){const n=JSON.stringify(item).length;if(n>75000)throw new Error('Un article ou une minute dépasse la capacité d’un segment d’audit. Aucun audit partiel effectué.');if(size+n>75000&&size){batches.push(current);current={titre:payload.titre,country:payload.country,lignes:[],articlesCCTP:[]};size=0;}current[key].push(item);size+=n;}
 if(size)batches.push(current);return batches;
}
export function qualityKey(p){return 'atelier-quality-v1:'+String(p.cloudId||[p.title,p.meta?.studyDate].join('|'));}
export function qualityPayload(project){
 const lignes=(project.rows||[]).map(r=>({id:text(r.id,100),code:text(r.code||r.rowNumber,100),designation:text(r.label,200),lot:text(r.lot,100),niveau:text(r.level,200),zone:text(r.room||r.location,200),unite:text(r.result?.unit,30),quantite:typeof r.result?.total==='number'&&Number.isFinite(r.result.total)?r.result.total:null,minute:{preset:text(r.input?.preset,100),nombre:text(String(r.input?.count??''),100),dimensions:Object.fromEntries(Object.entries(r.input?.dimensions||{}).map(([k,v])=>[k,text(String(v),500)])),deduction:text(String(r.input?.deduction??''),500),ouvertures:r.input?.openings||[],formule:text(r.result?.formula,3000),etapes:(r.result?.steps||[]).filter(s=>typeof s==='string'),preuvePlan:!!(r.input?.planMeasurement?.fileName||r.input?.planLink?.ids?.length||r.importSource)},cctp:text(r.cctpArticle?.text),cctpObsolete:!!r.cctpArticle?.text&&r.cctpArticle.sourceFingerprint!==rowFingerprint(r,project.country)}));
 const articlesCCTP=(project.cctp?.articles||[]).map(a=>({id:text(a.id,100),code:text(a.code,100),lot:text(a.lotName,100),titre:text(a.title,300),rowIds:(a.rowIds||[]).filter(id=>typeof id==='string'),description:blocks(a.description),miseEnOeuvre:blocks(a.execution),localisation:blocks(a.location),metre:blocks(a.measurement),references:text(a.references,2000)}));
 return {titre:text(project.title,200),country:project.country||'france',lignes,articlesCCTP};
}
// Same stable row signature as the saved row CCTP model; no circular import.
import {rowCctpFingerprint as rowFingerprint} from './row-cctp.js';
export function qualityFingerprint(payload){let h=2166136261;for(const c of JSON.stringify(payload))h=Math.imul(h^c.charCodeAt(0),16777619);return 'quality-v1-'+(h>>>0).toString(36);}
export function scanQuality(payload){
 const issues=[],linked=new Set();for(const a of payload.articlesCCTP||[])if([a.description,a.miseEnOeuvre].some(s=>typeof s==='string'&&s.trim()))for(const id of a.rowIds||[])linked.add(id);
 for(const r of payload.lignes){const add=(code,message)=>issues.push({code,rowId:r.id,label:r.designation||r.code||r.id,message});
  if(typeof r.quantite!=='number'||!Number.isFinite(r.quantite))add('invalid_quantity','Quantité absente ou invalide.');else if(r.quantite===0)add('zero_quantity','Quantité égale à zéro.');
  if(!r.unite?.trim())add('missing_unit','Unité absente.');
  const m=r.minute||{},steps=(m.etapes||[]).filter(s=>typeof s==='string'&&s.trim()),dimensions=Object.values(m.dimensions||{}).some(v=>String(v).trim());
  const repriseOk=m.preset!=='reprise'||m.preuvePlan||/[+*/()-]|[A-Za-z_]/.test(String(m.dimensions?.Q||''));
  if(steps.length<2||!dimensions||!repriseOk)add('missing_minute','Minute détaillée manquante ou reprise de quantité sans justification.');
  if(!r.niveau?.trim()||!r.zone?.trim())add('missing_location','Localisation incomplète : niveau et zone / pièce requis.');
  if(!r.cctp?.trim()&&!linked.has(r.id))add('missing_cctp','Aucun article CCTP rédigé et lié à cet ouvrage.');
  if(r.cctpObsolete)add('stale_cctp','Article CCTP à relire après modification du métré.');
 }
 return issues;
}
export function qualityScore(checked,payload,issues=scanQuality(payload)){
 const blocked=new Set(issues.map(i=>i.code));return payload.lignes.length?QUALITY_POINTS.filter(p=>checked?.[p.id]===true&&!(p.rules||[]).some(r=>blocked.has(r))).length*10:0;
}
export function readQuality(store,key,fingerprint){try{const value=JSON.parse(store.getItem(key)||'null');if(value?.fingerprint!==fingerprint)return {};return Object.fromEntries(QUALITY_POINTS.filter(p=>value.checked?.[p.id]===true).map(p=>[p.id,true]));}catch{return {};}}
export function localFinalRisks(payload){
 const issues=scanQuality(payload),groups=[['Quantités et unités non exploitables',['zero_quantity','invalid_quantity','missing_unit']],['Traçabilité du métré insuffisante',['missing_minute','missing_location']],['CCTP incomplet ou à relire',['missing_cctp','stale_cctp']]];
 const risks=groups.map(([titre,codes])=>{const matches=issues.filter(i=>codes.includes(i.code));return matches.length?{titre,nature:'constat',constat:`${matches.length} anomalie(s) détectée(s) dans le tableau.`,ligneIds:[...new Set(matches.map(i=>i.rowId))].slice(0,20),action:matches[0].message+' Corriger les lignes signalées puis relancer le contrôle.'}:null;}).filter(Boolean);
 for(const [titre,constat,action] of [['Concordance avec les pièces du dossier','Les plans et le descriptif source ne font pas partie de cet audit.','Comparer manuellement les ouvrages au dossier, notamment les zones et prestations exclues.'],['Cotes, déductions et doublons','Un tableau seul ne prouve ni la calibration ni l’exhaustivité du relevé.','Recouper les cotes et vérifier les ouvertures et doublons façade par façade.'],['Prescriptions et dossier de remise','La conformité technique et les fichiers remis ne sont pas certifiés par cet audit.','Relire les domaines des références, les interfaces, les annexes et les exports finaux.']])if(risks.length<3)risks.push({titre,nature:'à vérifier',constat,ligneIds:[],action});
 return risks.slice(0,3);
}
export async function requestFinalAudit(payload,{demo=false,signal,fetcher=fetch}={}){
 if(!payload.lignes.length)throw new Error('Ajoutez au moins un ouvrage avant l’audit final.');
 const serialized=JSON.stringify(payload);if(serialized.length>QUALITY_MAX_CHARS)throw new Error('Le dossier dépasse la capacité de l’audit global (2 millions de caractères). Aucun envoi partiel effectué.');
 const response=await fetcher('/api/analyse-metre',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'content-type':'application/json'},signal,body:JSON.stringify({operation:'audit_final',projet:payload,demo})});
 const data=await response.json().catch(()=>null);if(!response.ok)throw new Error(data?.error||'Audit serveur inaccessible. Connectez-vous avec le compte propriétaire.');
 if(!data||!['openai','local'].includes(data.moteur)||!Array.isArray(data.risques)||data.risques.length!==3)throw new Error('Résultat de l’audit serveur invalide.');return data;
}
