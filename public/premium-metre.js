import {evaluateExpression} from './expression.js';
const num=v=>{const s=String(v??'').trim();return s?Number(s.replace(',','.')):NaN;};
const fmt=v=>v.toLocaleString('fr-FR',{maximumFractionDigits:6});
export const canonical=u=>({ml:'m',m2:'m²',m3:'m³'}[u]||u);
export function slopeInfo(slope){
 if(!slope?.enabled)return {enabled:false,coefficient:1,percent:0,degrees:0};
 const value=num(slope.value),mode=slope.mode==='degrees'?'degrees':'percent';
 if(!Number.isFinite(value)||value<0||mode==='degrees'&&value>=89.9||mode==='percent'&&value>10000)throw new Error('Pente : saisir de 0 à 10 000 % ou de 0 à moins de 89,9°.');
 const percent=mode==='percent'?value:Math.tan(value*Math.PI/180)*100,degrees=mode==='degrees'?value:Math.atan(value/100)*180/Math.PI;
 return {enabled:true,mode,value,percent,degrees,coefficient:Math.hypot(1,percent/100)};
}
export function withSlope(result,slope){
 const info=slopeInfo(slope);if(!info.enabled)return result;if(result.unit!=='m²')throw new Error('Le convertisseur de pente attend une surface projetée en m².');if(result.slope?.enabled)throw new Error('Une pente est déjà appliquée à ce résultat.');
 const k=info.coefficient,total=result.total*k;if(!Number.isFinite(total)||Math.abs(total)>1e12)throw new Error('Surface développée hors limites.');
 const gross=result.globalGross??result.gross*result.count,deduction=result.globalDeduction??result.deduction*result.count;
 return {...result,gross:result.gross*k,deduction:result.deduction*k,net:result.net*k,total,...(result.globalGross!=null?{globalGross:gross*k,globalDeduction:deduction*k}:{}),formula:`(${result.formula}) × ${fmt(k)}`,steps:[...result.steps,`Pente ${fmt(info.percent)} % = ${fmt(info.degrees)}° ; coefficient √(1 + (p/100)²) = ${fmt(k)}`,`Brut et déductions en projection ; surface projetée nette : ${fmt(result.total)} m²`, `Surface développée : ${fmt(result.total)} × ${fmt(k)} = ${fmt(total)} m²`],slope:{...info,projectedGross:gross,projectedDeduction:deduction,projectedNet:result.total,developedTotal:total}};
}
const unitSet=new Set(['m','m²','m³','u','L','kg','t','h','forfait']);
export function validateExtension(value){
 if(!value||typeof value!=='object'||typeof value.name!=='string'||!value.name.trim()||value.name.length>100||!unitSet.has(canonical(value.baseUnit)))throw new Error('Nom ou unité de base du modèle invalide.');
 if(!Array.isArray(value.parameters)||value.parameters.length>20||!Array.isArray(value.components)||!value.components.length||value.components.length>30)throw new Error('Modèle : 20 paramètres et 30 composants maximum.');
 const names=new Set(['Q']);const parameters=value.parameters.map(p=>{if(!p||!/^[A-Za-z_][A-Za-z0-9_]{0,29}$/.test(p.name)||names.has(p.name)||!Number.isFinite(num(p.value))||num(p.value)<0||num(p.value)>1e6)throw new Error('Paramètre unique, numérique et positif ou nul requis (Q réservé à la quantité).');names.add(p.name);return {name:p.name,label:String(p.label||p.name).slice(0,100),value:String(p.value)};});
 const components=value.components.map(c=>{if(!c||typeof c.name!=='string'||!c.name.trim()||c.name.length>150||!unitSet.has(canonical(c.unit))||typeof c.formula!=='string'||c.formula.length>500)throw new Error('Composant ou formule invalide.');const price=c.unitPrice==null||c.unitPrice===''?null:num(c.unitPrice);if(price!=null&&(!Number.isFinite(price)||price<0||price>1e9))throw new Error('Prix unitaire invalide.');return {name:c.name.trim(),unit:canonical(c.unit),formula:c.formula.trim(),...(price!=null?{unitPrice:price}:{})};});
 return {id:typeof value.id==='string'?value.id.slice(0,100):'',name:value.name.trim(),baseUnit:canonical(value.baseUnit),parameters,components};
}
export function extensionResults(row,extension){
 const template=validateExtension(extension);if(canonical(row.result.unit)!==template.baseUnit)throw new Error(`Ce modèle attend ${template.baseUnit}, la ligne est en ${row.result.unit}.`);
 const Q=row.result.total;if(!Number.isFinite(Q)||Q<0)throw new Error('Une quantité positive ou nulle est requise pour décomposer les besoins.');
 const variables=[{name:'Q',value:String(Q),unit:'coef'},...template.parameters.map(p=>({name:p.name,value:p.value,unit:'coef'}))];
 return template.components.map(c=>{const quantity=evaluateExpression(c.formula,'coef',variables);if(quantity<0||quantity>1e12)throw new Error('Quantité de composant négative ou hors limites.');return {...c,quantity,proof:`${c.formula} ; Q = ${fmt(Q)} ${row.result.unit} ; ${template.parameters.map(p=>p.name+' = '+p.value).join(', ')} → ${fmt(quantity)} ${c.unit}`};});
}
export const DEFAULT_EXTENSIONS=[
 {id:'cloison',name:'Cloison Placostil complète · estimation',baseUnit:'m²',parameters:[{name:'H',label:'Hauteur de cloison (m)',value:'2.5'},{name:'entraxe',label:'Entraxe montants (m)',value:'0.6'},{name:'faces',label:'Nombre de faces',value:'2'},{name:'plaques',label:'Plaques par face',value:'1'},{name:'bandes',label:'Ratio bandes (ml/m²)',value:'1.5'},{name:'perte',label:'Pertes (%)',value:'5'}],components:[{name:'Ossature · rails',unit:'m',formula:'Q / H * 2 * (1 + perte / 100)'},{name:'Ossature · montants (ratio)',unit:'m',formula:'Q / entraxe * (1 + perte / 100)'},{name:'Plaques de plâtre',unit:'m²',formula:'Q * faces * plaques * (1 + perte / 100)'},{name:'Isolant',unit:'m²',formula:'Q * (1 + perte / 100)'},{name:'Bandes à joints',unit:'m',formula:'Q * bandes * (1 + perte / 100)'}]},
 {id:'peinture',name:'Mur Peinture 2 couches',baseUnit:'m²',parameters:[{name:'couches',label:'Nombre de couches',value:'2'},{name:'rendement',label:'Rendement par couche (m²/L)',value:'10'},{name:'perte',label:'Pertes (%)',value:'10'}],components:[{name:'Peinture · quantité théorique',unit:'L',formula:'Q * couches / rendement * (1 + perte / 100)'}]},
 {id:'dalle',name:'Dalle Béton · béton, treillis, polyane',baseUnit:'m²',parameters:[{name:'ep',label:'Épaisseur béton (m)',value:'0.14'},{name:'perte_beton',label:'Pertes béton (%)',value:'0'},{name:'recouvrement',label:'Recouvrements treillis/polyane (%)',value:'10'}],components:[{name:'Béton',unit:'m³',formula:'Q * ep * (1 + perte_beton / 100)'},{name:'Treillis soudé · surface à commander',unit:'m²',formula:'Q * (1 + recouvrement / 100)'},{name:'Polyane · surface à commander',unit:'m²',formula:'Q * (1 + recouvrement / 100)'}]},
 {id:'dalle-volume',name:'Dalle Béton · depuis un volume mesuré',baseUnit:'m³',parameters:[{name:'ep',label:'Épaisseur béton (m)',value:'0.14'},{name:'recouvrement',label:'Recouvrements treillis/polyane (%)',value:'10'}],components:[{name:'Béton',unit:'m³',formula:'Q'},{name:'Treillis soudé · surface à commander',unit:'m²',formula:'Q / ep * (1 + recouvrement / 100)'},{name:'Polyane · surface à commander',unit:'m²',formula:'Q / ep * (1 + recouvrement / 100)'}]},
];
export function normalizedExtensions(list){if(!Array.isArray(list)||list.length>20)throw new Error('Maximum 20 extensions par ouvrage.');return list.map(validateExtension);}
export function localModels(store,key,validator=validateExtension){const raw=store.getItem(key);if(!raw)return [];let items;try{items=JSON.parse(raw);}catch{throw new Error('Bibliothèque locale illisible ; les modèles existants ne sont pas écrasés.');}if(!Array.isArray(items)||items.length>50)throw new Error('Bibliothèque locale invalide (50 modèles maximum).');return items.map(validator);}
export function storeLocalModel(store,key,model,validator=validateExtension){const next=validator(model),list=localModels(store,key,validator),i=list.findIndex(m=>m.id===next.id);if(i<0){if(list.length>=50)throw new Error('Maximum 50 modèles locaux.');list.push(next);}else list[i]=next;const encoded=JSON.stringify(list);if(encoded.length>500000)throw new Error('Bibliothèque locale trop volumineuse.');store.setItem(key,encoded);return next;}
export function measurementModel(row,name){const input=structuredClone(row.input);delete input.planLink;delete input.planMeasurement;return validateMeasurementModel({id:crypto.randomUUID(),name,lot:row.lot,color:row.workColor,input});}
export function validateMeasurementModel(v){if(!v||typeof v.name!=='string'||!v.name.trim()||v.name.length>100||!v.input||typeof v.input.preset!=='string'||JSON.stringify(v.input).length>20000)throw new Error('Modèle de mesure invalide.');const input=structuredClone(v.input);delete input.planLink;delete input.planMeasurement;return{id:String(v.id||'').slice(0,100),name:v.name.trim(),lot:String(v.lot||'Sans lot').slice(0,80),color:/^#[0-9a-f]{6}$/i.test(v.color||'')?v.color:'#2563eb',input};}
export function pageSource(row,project={}){
 const proof=row.input?.planMeasurement||{},state=project.planWorkspace,ids=row.input?.planLink?.ids||proof.traceIds||[],found=[];
 if(state?.pages&&(!proof.documentId||proof.documentId===state.assetId))for(const [page,data]of Object.entries(state.pages))if((data.traces||[]).some(t=>ids.includes(t.id)))found.push({page:Number(page),name:data.name||'Page '+page});
 if(found.length>1)return {key:'multi',name:'Multi-pages · voir provenance',pages:found,fileName:state.fileName};
 const page=found[0]?.page||proof.page;if(!page)return {key:'none',name:'Sans page de plan',pages:[]};
 const same=state&&(!proof.documentId||proof.documentId===state.assetId)&&(!proof.fileName||proof.fileName===state.fileName),name=found[0]?.name||(same?state.pages?.[page]?.name:'')||proof.pageName||'Page '+page,fileName=proof.fileName||state?.fileName||'Plan';
 return {key:[proof.documentId||fileName,page].join(':'),name:`${fileName} · p.${page} · ${name}`,page,pageName:name,fileName,pages:[{page,name}]};
}
export function premiumProperties(row,project){const r=row.result,s=r.slope;return {gross:s?.projectedGross??r.globalGross??r.gross*r.count,deductions:s?.projectedDeduction??r.globalDeduction??r.deduction*r.count,projectedNet:s?.projectedNet??r.total,net:r.total,unit:r.unit,slope:s?.enabled?slopeInfo(row.input.slope):slopeInfo(null),source:pageSource(row,project)};}
export function premiumActionsMarkup(row){const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));return `<button class="quiet" data-premium-row="${esc(row.id)}">+ Appliquer une Extension Métier</button><button class="quiet" data-premium-row="${esc(row.id)}" data-premium-mode="properties">Propriétés / Pente</button>`;}
