import {calculateDynamic} from './dynamic-minute.js';
import {evaluateExpression} from './expression.js';
import {lotColor} from './lot-colors.js';
export const PRO_UNITS=['m','m²','m³','u'];
export const normalizeProUnit=u=>({ml:'m',m2:'m²',m3:'m³'}[u]||u);
export const workColor=row=>/^#[0-9a-f]{6}$/i.test(row?.workColor||row?.color||'')?(row.workColor||row.color):lotColor(row?.lot||row?.purpose).color;
const fmt=n=>n.toLocaleString('fr-FR',{maximumFractionDigits:6});
export function calculateProfessional(input,variables=[]) {
  if(input.dynamicMinute)return calculateDynamic(input,variables);
  const unit=normalizeProUnit(input.outputUnit||'m²');
  if(!PRO_UNITS.includes(unit))throw Error('Unité de minute professionnelle invalide.');
  const factor={m:1,cm:.01,mm:.001}[input.dimensionUnit||'m'];
  if(!factor)throw Error('Unité de dimensions invalide.');
  const read=(value,expected,name,{zero=false,integer=false,max=1e9}={})=>{
    const n=evaluateExpression(String(value??''),expected,variables);
    if(!Number.isFinite(n)||(zero?n<0:n<=0)||n>max||(integer&&!Number.isInteger(n)))throw Error(name+' : valeur '+(zero?'positive ou nulle':'strictement positive')+(integer?' entière':'')+' requise.');
    return n;
  };
  const N=read(input.count,'u','Nombre N',{integer:true,max:100000});
  const d={};
  const axis=input.surfaceAxis==='w'?'w':'h';
  const needed=unit==='u'?[]:unit==='m'?['L']:unit==='m²'?['L',axis]:['L','w','h'];
  for(const k of needed)d[k]=read(input.dimensions?.[k],input.dimensionUnit||'m','Dimension '+k,{max:1e7})*factor;
  let D=read(input.deduction,unit,'Déduction globale',{zero:true,integer:unit==='u'});
  const cuts=input.openings||[];
  if(!Array.isArray(cuts)||cuts.length>100)throw Error('Maximum 100 ouvertures.');
  if(cuts.length&&!['m²','m³'].includes(unit))throw Error('Les ouvertures surfaciques nécessitent m² ou m³.');
  const steps=[];
  cuts.forEach((o,i)=>{
    const w=read(o.w,input.dimensionUnit||'m','Largeur du vide')*factor;
    const h=read(o.h,input.dimensionUnit||'m','Hauteur du vide')*factor;
    const n=read(o.n,'u','Nombre de vides',{integer:true,max:100000});
    const cut=w*h*n*(unit==='m³'?d.w:1);D+=cut;
    steps.push(`Ouverture globale ${i+1} : ${fmt(w)} × ${fmt(h)} × ${n}${unit==='m³'?' × '+fmt(d.w):''} = ${fmt(cut)} ${unit}`);
  });
  const part=unit==='u'?1:unit==='m'?d.L:unit==='m²'?d.L*d[axis]:d.L*d.w*d.h;
  const gross=N*part;
  if(!Number.isFinite(gross)||gross>1e12)throw Error('Quantité trop élevée.');
  if(D>gross+Math.max(1,gross)*1e-12)throw Error('Les déductions globales dépassent le brut.');
  const total=Math.max(0,gross-D);
  const factors=unit==='u'?'':unit==='m'?` × ${fmt(d.L)}`:unit==='m²'?` × ${fmt(d.L)} × ${fmt(d[axis])}`:` × ${fmt(d.L)} × ${fmt(d.w)} × ${fmt(d.h)}`;
  const formula=unit==='u'?'N − Déductions':unit==='m'?'N × L − Déductions':unit==='m²'?`N × L × ${axis==='h'?'H':'l'} − Déductions`:'N × L × l × H − Déductions';
  steps.unshift('Minute Pro · déductions globales sur l’ensemble de la ligne.');
  steps.push(`${formula} : ${N}${factors} − ${fmt(D)} = ${fmt(total)} ${unit}`);
  return {gross:part,deduction:D/N,net:total/N,count:N,total,unit,formula,steps,globalGross:gross,globalDeduction:D,deductionScope:'global'};
}
export function makeProfessionalRow(draft,id) {
  const text=(v,max=200)=>String(v??'').trim().slice(0,max);
  const label=text(draft.label);if(!label)throw Error('Une désignation est requise.');
  const unit=normalizeProUnit(draft.unit||'m²');if(!PRO_UNITS.includes(unit))throw Error('Unité invalide.');
  return {id,rowNumber:text(draft.rowNumber,40),code:text(draft.code,40),label,lot:text(draft.lot,80)||'Sans lot',building:text(draft.building),level:text(draft.level,80),room:text(draft.zone,80),location:text(draft.zone),workColor:workColor({workColor:draft.workColor,lot:draft.lot}),unitPrice:draft.unitPrice===''||draft.unitPrice==null?null:draft.unitPrice,pricingMode:'manual',report:'Minute professionnelle · déductions globales',input:{...(draft.slope?.enabled?{slope:structuredClone(draft.slope)}:{}),preset:'minute-pro',dimensionUnit:draft.dimensionUnit||'m',outputUnit:unit,basis:'libre',count:String(draft.N??'1'),deduction:String(draft.D??'0'),surfaceAxis:draft.axis==='w'?'w':'h',dimensions:{L:String(draft.L??'1'),w:String(draft.w??'1'),h:String(draft.H??'1')},openings:(draft.openings||[]).map(o=>({w:String(o.w),h:String(o.h),n:String(o.n)}))}};
}
export function professionalTraceRow(trace,fileName,id){
  const value=Number(String(trace.retained??trace.value).replace(',','.'));
  if(!Number.isFinite(value)||value<=0||!['m','m²','u'].includes(trace.unit)||(trace.unit==='u'&&!Number.isInteger(value)))throw Error('Mesure du plan invalide.');
  const proof={fileName,page:trace.page,pageName:trace.pageName||'Page '+trace.page,documentId:trace.documentId||'',label:trace.label,value,unit:trace.unit,reference:trace.reference||1,manual:!!trace.manual||trace.retained!==undefined};
  return {id,rowNumber:'',code:String(trace.label||'').slice(0,40),label:String(trace.label||'Relevé').slice(0,200),lot:trace.lot||'Sans lot',level:trace.level||'',room:trace.zone||'',location:trace.zone||'',workColor:workColor(trace),unitPrice:null,input:{preset:'reprise',dimensionUnit:'m',outputUnit:trace.unit,basis:'libre',dimensions:{Q:String(value)},count:'1',deduction:'0',openings:[],planMeasurement:proof,planLink:{ids:[trace.id],field:'Q'}}};
}
