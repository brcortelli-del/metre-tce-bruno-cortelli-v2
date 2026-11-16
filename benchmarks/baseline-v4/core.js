import {evaluateExpression,validateVariables} from './expression.js';
import {normalizeProjectFields} from './project-schema.js';
import {EXTRA_PRESETS} from './catalogue.js';
export const PRESETS = {
  longueur: {title:'Longueur simple', unit:'m', lot:'Finitions', formula:'L', fields:[['L','Longueur']], defaults:{L:'5'}},
  perimetre: {title:'Périmètre rectangulaire', unit:'m', lot:'Finitions', formula:'2 × (L + l)', fields:[['L','Longueur'],['w','Largeur']], defaults:{L:'5',w:'4'}},
  surface: {title:'Sol / revêtement rectangulaire', unit:'m²', lot:'Revêtements', formula:'L × l', fields:[['L','Longueur'],['w','Largeur']], defaults:{L:'5',w:'4'}},
  mur: {title:'Mur / enduit avec ouvertures', unit:'m²', lot:'Maçonnerie', formula:'L × H − ouvertures', fields:[['L','Longueur'],['h','Hauteur']], defaults:{L:'5',h:'2,5'}},
  triangle: {title:'Surface triangulaire / pignon', unit:'m²', lot:'Maçonnerie', formula:'b × H ÷ 2', fields:[['L','Base'],['h','Hauteur']], defaults:{L:'5',h:'2,5'}},
  dalle: {title:'Dalle / chape', unit:'m³', lot:'Gros œuvre', formula:'L × l × e', fields:[['L','Longueur'],['w','Largeur'],['h','Épaisseur']], defaults:{L:'5',w:'4',h:'0,12'}},
  semelle: {title:'Semelle filante', unit:'m³', lot:'Fondations', formula:'L × l × H', fields:[['L','Longueur développée'],['w','Largeur'],['h','Hauteur']], defaults:{L:'10',w:'0,5',h:'0,3'}},
  fouille: {title:'Fouille en rigole', unit:'m³', lot:'Terrassement', formula:'L × l × p', fields:[['L','Longueur développée'],['w','Largeur'],['h','Profondeur']], defaults:{L:'10',w:'0,6',h:'0,8'}},
  poteau: {title:'Poteau / poutre rectangulaire', unit:'m³', lot:'Gros œuvre', formula:'L × l × H', fields:[['L','Dimension 1'],['w','Dimension 2'],['h','Dimension 3']], defaults:{L:'0,2',w:'0,2',h:'2,5'}},
  cylindre: {title:'Volume cylindrique', unit:'m³', lot:'Gros œuvre', formula:'π × (D ÷ 2)² × H', fields:[['D','Diamètre'],['h','Hauteur']], defaults:{D:'0,3',h:'2,5'}}
};
Object.assign(PRESETS,EXTRA_PRESETS);
export const BASES={libre:'Cotes saisies',HO:'H.O. — hors œuvre',DO:'D.O. — dans œuvre',axes:'Aux axes',nus:'Entre nus'};
export function unitsFor(key){const p=PRESETS[key];return p.kind==='steel'?['kg','t']:p.units??[p.unit];}
export function fieldsFor(key,unit){const p=PRESETS[key],u=unit??p.unit;let fields=[...p.fields];if(p.kind&&['rect','section','area','frame','area_diff'].includes(p.kind)&&u==='m³'&&!fields.some(f=>f[0]==='h'))fields.push(['h','Épaisseur / profondeur','m']);if(p.kind==='section'&&u==='m')fields=fields.filter(f=>f[0]==='L');if(p.kind==='wall'&&u==='m³')fields.push(['w','Épaisseur du mur','m']);return fields;}
export function number(value, name='Valeur', {zero=false, integer=false, max=1e9}={}) {
  const s=String(value ?? '').trim();
  if(!/^(?:\d+(?:[.,]\d*)?|[.,]\d+)$/.test(s)) throw new Error(`${name} : saisis un nombre ${zero?'positif ou nul':'strictement positif'} (ex. 2,50).`);
  const n=Number(s.replace(',','.'));
  if(!Number.isFinite(n) || (zero?n<0:n<=0) || n>max || (integer&&!Number.isInteger(n))) throw new Error(`${name} : ${integer?'entier':'nombre'} ${zero?'positif ou nul':'strictement positif'} requis, maximum ${max.toLocaleString('fr-FR')}.`);
  return n;
}
export function fmt(n, digits=6) {
  return new Intl.NumberFormat('fr-FR',{maximumFractionDigits:n!==0&&Math.abs(n)<0.001?12:digits}).format(n);
}
export function calculate(input,variables=[]) {
  const p=PRESETS[input.preset]; if(!p) throw new Error('Sélectionne un ouvrage valide.');
  const factor={m:1,cm:.01,mm:.001}[input.dimensionUnit]; if(!factor) throw new Error('Unité de saisie invalide.');
  const unit=input.outputUnit??p.unit;if(!unitsFor(input.preset).includes(unit))throw new Error('Unité de résultat incompatible avec cet ouvrage.');
  const d={},steps=[];const fields=fieldsFor(input.preset,unit);
  for(const [key,label,kind='m'] of fields) {
    const original=String(input.dimensions?.[key]??'').trim(),expected=kind==='m'?input.dimensionUnit:kind==='cote'?'m':kind==='result'?unit:kind==='u'?'u':kind;
    const isFormula=/[A-Za-z_*+/()^×÷]/.test(original)||(!/^[-+]?(?:\d+(?:[.,]\d*)?|[.,]\d+)$/.test(original)&&original!=='');
    const text=isFormula?String(evaluateExpression(original,expected,variables)):original;
    if(isFormula)steps.push(`${label} : ${original} = ${text.replace('.',',')} ${expected}`);
    const raw=kind==='cote'?(text.startsWith('-')?-number(text.slice(1),label,{zero:true}):number(text,label,{zero:true})):number(text,label,{max:1e7,zero:['R','Si','Q','pente','slope','deductionMac'].includes(key),integer:kind==='u'});
    d[key]=raw*(kind==='m'?factor:1);
    if((kind==='m')&&d[key]>100000) throw new Error(`${label} : dimension supérieure à 100 000 m.`);
    if(factor!==1&&kind==='m') steps.push(`${label} : ${fmt(raw)} ${input.dimensionUnit} = ${fmt(d[key])} m`);
  }
  const count=number(evaluateExpression(input.count,'u',variables),'Nombre d’éléments',{integer:true,max:100000});
  const manual=number(evaluateExpression(input.deduction,unit,variables),'Déduction par élément',{zero:true});
  let gross, expression;
  if(p.kind){
    const n=k=>fmt(d[k]);
    switch(p.kind){
      case 'trapezoid':gross=(d.a+d.b)*d.h/2;expression=`(${n('a')} + ${n('b')}) × ${n('h')} ÷ 2`;break;
      case 'roof':if(d.pente>=89.5)throw new Error('La pente doit être inférieure à 89,5°.');gross=d.L*d.w/Math.cos(d.pente*Math.PI/180)*d.f;expression=`${n('L')} × ${n('w')} ÷ cos(${n('pente')}°) × ${n('f')}`;break;
      case 'talus':gross=d.L*d.w*d.h+d.slope*(d.L+d.w)*d.h**2+4/3*d.slope**2*d.h**3;expression=`${n('L')} × ${n('w')} × ${n('h')} + ${n('slope')} × (${n('L')} + ${n('w')}) × ${n('h')}² + 4/3 × ${n('slope')}² × ${n('h')}³`;break;
      case 'count':gross=1;expression='1';break;
      case 'quantity':gross=d.Q;expression=n('Q');break;
      case 'linear':gross=d.L;expression=n('L');break;
      case 'mean':if(d.b>d.a)throw new Error('La cote D.O. doit être inférieure ou égale à la cote H.O.');gross=(d.a+d.b)/2;expression=`(${n('a')} + ${n('b')}) ÷ 2`;break;
      case 'rect':case 'section':gross=unit==='m'?d.L:d.L*d.w;expression=unit==='m'?n('L'):`${n('L')} × ${n('w')}`;break;
      case 'wall':gross=d.L*d.h;expression=`${n('L')} × ${n('h')}`;break;
      case 'area':gross=d.S;expression=n('S');break;
      case 'area_diff':if(d.S<d.Si)throw new Error('La surface à déduire dépasse la surface totale.');gross=d.S-d.Si;expression=`(${n('S')} − ${n('Si')})`;break;
      case 'frame':if(d.Li>=d.L||d.wi>=d.w)throw new Error('Les dimensions D.O. doivent être plus petites que les dimensions H.O.');gross=d.L*d.w-d.Li*d.wi;expression=`(${n('L')} × ${n('w')} − ${n('Li')} × ${n('wi')})`;break;
      case 'levels':if(d.zt<=d.zb)throw new Error('Le niveau haut doit être supérieur au niveau bas.');gross=d.S*(d.zt-d.zb);expression=`${n('S')} × (${n('zt')} − (${n('zb')}))`;steps.push(`Profondeur : ${n('zt')} − (${n('zb')}) = ${fmt(d.zt-d.zb)} m`);break;
      case 'earth':if(d.R>d.V)throw new Error('Les terres réemployées dépassent les déblais.');if(d.k<1)throw new Error('Le coefficient de foisonnement doit être supérieur ou égal à 1.');gross=(d.V-d.R)*d.k;expression=`(${n('V')} − ${n('R')}) × ${n('k')}`;steps.push(`Reste en place : ${n('V')} − ${n('R')} = ${fmt(d.V-d.R)} m³`);break;
      case 'steel':gross=d.V*d.rho;expression=`${n('V')} × ${n('rho')}`;break;
      case 'formwork':gross=d.L*d.h*d.f;expression=`${n('L')} × ${n('h')} × ${n('f')}`;break;
      case 'mesh':gross=d.L*d.h*d.k;expression=`${n('L')} × ${n('h')} × ${n('k')}`;break;
    }
    if(['rect','section','area','frame','area_diff'].includes(p.kind)&&unit==='m³'){steps.push(`Surface de référence : ${expression} = ${fmt(gross)} m²`);gross*=d.h;expression+=` × ${n('h')}`;}
  }else switch(input.preset) {
    case 'longueur': gross=d.L; expression=`${fmt(d.L)}`;break;
    case 'perimetre': gross=2*(d.L+d.w);expression=`2 × (${fmt(d.L)} + ${fmt(d.w)})`;break;
    case 'surface': gross=d.L*d.w;expression=`${fmt(d.L)} × ${fmt(d.w)}`;break;
    case 'mur': gross=d.L*d.h;expression=`${fmt(d.L)} × ${fmt(d.h)}`;break;
    case 'triangle': gross=d.L*d.h/2;expression=`${fmt(d.L)} × ${fmt(d.h)} ÷ 2`;break;
    case 'cylindre': gross=Math.PI*(d.D/2)**2*d.h;expression=`π × (${fmt(d.D)} ÷ 2)² × ${fmt(d.h)}`;break;
    default: gross=d.L*d.w*d.h;expression=`${fmt(d.L)} × ${fmt(d.w)} × ${fmt(d.h)}`;
  }
  if(p.kind==='steel'&&unit==='t'){steps.push(`Masse en kg : ${expression} = ${fmt(gross)} kg`);gross/=1000;expression=`(${expression}) ÷ 1 000`;}
  if(!(p.kind==='wall'&&unit==='m³'))steps.push(`Brut par élément : ${expression} = ${fmt(gross)} ${unit}`);
  let openings=0;
  if(input.preset==='mur'||p.kind==='wall') {
    if((input.openings??[]).length>100) throw new Error('Maximum 100 types d’ouvertures par ligne.');
    for(const [i,o] of (input.openings??[]).entries()) {
      const w=number(evaluateExpression(o.w,input.dimensionUnit,variables),`Ouverture ${i+1}, largeur`)*factor;
      const h=number(evaluateExpression(o.h,input.dimensionUnit,variables),`Ouverture ${i+1}, hauteur`)*factor;
      const n=number(evaluateExpression(o.n,'u',variables),`Ouverture ${i+1}, nombre`,{integer:true,max:100000});
      if(w>d.L+1e-12||h>d.h+1e-12) throw new Error(`Ouverture ${i+1} : dimensions supérieures à celles du mur.`);
      const area=w*h*n;openings+=area;
      steps.push(`Ouverture ${i+1} : ${fmt(w)} × ${fmt(h)} × ${n} = ${fmt(area)} m² à déduire`);
    }
  }
  if(p.kind==='wall'&&unit==='m³'){steps.push(`Volume brut : ${fmt(gross)} m² × ${fmt(d.w)} m`);gross*=d.w;openings*=d.w;expression+=` × ${fmt(d.w)}`;}
  if(p.kind==='wall'&&unit==='m³')steps.push(`Brut par élément : ${expression} = ${fmt(gross)} ${unit}`);
  const deduction=openings+manual;
  if(deduction>gross+Math.max(gross,Number.MIN_VALUE)*1e-12) throw new Error(`Les déductions (${fmt(deduction)} ${unit}) dépassent le brut (${fmt(gross)} ${unit}) par élément.`);
  if(manual>0) steps.push(`Autre déduction par élément : ${fmt(manual)} ${unit}`);
  const net=Math.max(0,gross-deduction), total=net*count*(p.sign??1);
  steps.push(`Net par élément : ${fmt(gross)} − ${fmt(deduction)} = ${fmt(net)} ${unit}`);
  steps.push(`Total : ${fmt(net)} × ${count} = ${fmt(total)} ${unit}`);
  if(p.sign===-1)steps.push('Ligne de déduction : quantité portée en négatif.');
  if(input.basis&&BASES[input.basis])steps.unshift(`Base de mesurage : ${BASES[input.basis]}`);
  if(input.planMeasurement){const m=input.planMeasurement;if(!Number.isFinite(m.value)||m.value<0||!Number.isFinite(m.reference)||m.reference<=0||!['m','m²','u'].includes(m.unit))throw new Error('Référence de relevé de plan invalide.');if(m.method)steps.unshift(String(m.method).slice(0,800));steps.unshift(`Relevé du plan « ${String(m.fileName??'').slice(0,200)} », page ${m.page??1}, repère ${String(m.label??'').slice(0,80)} : ${fmt(m.value)} ${m.unit} ${m.manual?'(cote saisie au plan)':`(cote étalon ${fmt(m.reference)} m)`}.`);}
  return {gross,deduction,net,count,total,unit,steps,formula:p.formula||expression};
}
export function totalsByLot(rows) {
  const groups=new Map();
  for(const row of rows){const key=row.lot||'Sans lot';if(!groups.has(key))groups.set(key,{totals:{m:0,'m²':0,'m³':0,kg:0,u:0,forfait:0},rows:[]});const group=groups.get(key);group.totals[row.result.unit]=(group.totals[row.result.unit]??0)+row.result.total;group.rows.push(row);}
  return [...groups].map(([lot,g])=>({lot,totals:g.totals,pricing:pricingSummary(g.rows)}));
}
export function parseUnitPrice(value) {
  if(value===null||value===undefined||String(value).trim()==='')return null;
  const s=String(value).trim();
  if(!/^(?:\d+(?:[.,]\d{0,2})?|[.,]\d{1,2})$/.test(s))throw new Error('PV HT : saisis un prix positif ou nul, avec 2 décimales au maximum (ex. 25,50).');
  return number(s,'PV HT',{zero:true,max:1e7});
}
export function lineAmount(quantity,price) {
  const p=parseUnitPrice(price);if(p===null)return null;
  const amount=quantity*p;
  if(!Number.isFinite(amount)||Math.abs(amount)>1e9)throw new Error('Le montant HT d’une ligne doit rester inférieur ou égal à 1 milliard d’euros en valeur absolue.');
  return amount===0?0:Math.sign(amount)*Math.round((Math.abs(amount)+Number.EPSILON*Math.max(1,Math.abs(amount)))*100)/100;
}
export function money(value,currency='EUR') {
  return new Intl.NumberFormat('fr-FR',{style:'currency',currency,minimumFractionDigits:2,maximumFractionDigits:2}).format(value);
}
export function pricingSummary(rows) {
  let cents=0,missing=0;
  for(const row of rows){const amount=lineAmount(row.result.total,row.unitPrice);if(amount===null)missing++;else cents+=Math.round(amount*100);}
  return {total:cents/100,missing,priced:rows.length-missing};
}
export function takeoffRecords(project) {
  const decimal=v=>v===null?'':String(v).replace('.',',');
  return [['N°','Index','Report','Désignation','Unité','Quantité','PV HT','Montant HT','Lot','Localisation','Détail du calcul','Projet'],...project.rows.map((r,i)=>[r.rowNumber||String(i+1).padStart(2,'0'),r.code||'',r.report||'',r.label,r.result.unit,decimal(r.result.total),decimal(parseUnitPrice(r.unitPrice)),decimal(lineAmount(r.result.total,r.unitPrice)),r.lot,r.location,r.result.steps.join(' | '),project.title])];
}
export function csvValue(value) {
  let s=String(value??'');
  if(/^[\s]*[=+@-]/.test(s)) s="'"+s;
  return '"'+s.replaceAll('"','""')+'"';
}
export function validateProject(data) {
  if(!data||data.version!==1||!Array.isArray(data.rows)||data.rows.length>2000) throw new Error('Fichier de sauvegarde non reconnu (maximum 2 000 lignes).');
  const string=(v,max=200)=>typeof v==='string'?v.slice(0,max):'';
  const additions=normalizeProjectFields(data);validateVariables(additions.variables);
  const rows=data.rows.map((r,i)=>{
    if(!r||!r.input||!string(r.label).trim())throw new Error(`Ligne ${i+1} invalide.`);
    const result=calculate(r.input,additions.variables);
    const unitPrice=parseUnitPrice(r.unitPrice);lineAmount(result.total,unitPrice);
    return {...r,id:typeof r.id==='string'?r.id.slice(0,100):`import-${i}-${Date.now()}`,rowNumber:string(r.rowNumber,40),code:string(r.code,40),report:string(r.report,80),basis:BASES[r.input.basis]?r.input.basis:'libre',unitPrice,label:string(r.label),lot:string(r.lot,80)||'Sans lot',location:string(r.location),input:structuredClone(r.input),result};
  });
  return {version:1,title:string(data.title)||'Mon projet',...additions,rows,planWorkspace:data.planWorkspace&&typeof data.planWorkspace==='object'?data.planWorkspace:null};
}
