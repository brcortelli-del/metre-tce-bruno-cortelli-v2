import {calculate,PRESETS,number} from './core.js';
const dist=(a,b)=>Math.hypot(b.x-a.x,b.y-a.y);
function cross(a,b,c){return(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);}
function touches(a,b,c){return Math.abs(cross(a,b,c))<1e-8&&c.x>=Math.min(a.x,b.x)-1e-8&&c.x<=Math.max(a.x,b.x)+1e-8&&c.y>=Math.min(a.y,b.y)-1e-8&&c.y<=Math.max(a.y,b.y)+1e-8;}
export function measureGeometry(points,kind,scale){
  if(kind==='count'){if(!Array.isArray(points)||!points.length||points.length>500||!points.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)))throw new Error('Comptage invalide.');return {value:points.length,unit:'u',length:0,area:0};}
  if(!Array.isArray(points)||points.length>500||!points.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y))||!Number.isFinite(scale)||scale<=0)throw new Error('Relevé géométrique invalide.');
  if(kind==='area'&&points.length>3&&dist(points[0],points.at(-1))<1e-8)points=points.slice(0,-1);
  const min=kind==='area'?3:2;if(points.length<min)throw new Error(`Il faut au moins ${min} points.`);
  let length=0,area=0;for(let i=1;i<points.length;i++)length+=dist(points[i-1],points[i]);
  if(kind==='area'){
    length+=dist(points.at(-1),points[0]);
    for(let i=0;i<points.length;i++){
      const a=points[i],b=points[(i+1)%points.length];area+=a.x*b.y-b.x*a.y;
      for(let j=i+2;j<points.length;j++){
        if(i===0&&j===points.length-1)continue;
        const c=points[j],d=points[(j+1)%points.length];
        if((cross(a,b,c)*cross(a,b,d)<0&&cross(c,d,a)*cross(c,d,b)<0)||touches(a,b,c)||touches(a,b,d)||touches(c,d,a)||touches(c,d,b))throw new Error('Le contour se croise : reprends le tracé.');
      }
    }
    area=Math.abs(area/2)*scale**2;if(area<1e-10)throw new Error('Le contour ne définit aucune surface.');
  }
  if(length<1e-8)throw new Error('Les points sont confondus.');
  return {value:kind==='area'?area:length*scale,unit:kind==='area'?'m²':'m',length:length*scale,area};
}
export function calibration(a,b,realLength){const n=number(realLength,'Cote étalon');if(dist(a,b)<10)throw new Error('Choisis deux extrémités éloignées d’au moins 10 pixels.');return n/dist(a,b);}
export function buildPlanBatch(traces,params){
  const relevant=traces.filter(t=>['emprise','fondations','soubassements','dallage','maconnerie','drainage'].includes(t.purpose));
  if(!relevant.length)throw new Error('Enregistre une emprise ou des linéaires de fondations / soubassements.');
  const v=k=>number(params[k],k,{zero:k.endsWith('Correction')||k==='reemploi'||k==='deductionMac'});
  const sum=(purpose,unit)=>relevant.filter(t=>t.purpose===purpose&&t.unit===unit).reduce((s,t)=>s+number(t.retained??t.value,'Valeur du relevé'),0);
  const S=sum('emprise','m²'),Lf=sum('fondations','m'),Lm=sum('soubassements','m'),Sd=sum('dallage','m²');
  const Lmac=sum('maconnerie','m'),Ldrain=sum('drainage','m');
  const rows=[];let rigoles=0,excav=0,semelles=0;
  const add=(preset,unit,dimensions,index,sourcePurpose)=>{
    const p=PRESETS[preset],group=relevant.filter(t=>t.purpose===sourcePurpose),first=group[0];
    const proof=first?{fileName:first.fileName,page:first.page,label:group.map(t=>t.label).join(' + '),value:sum(sourcePurpose,first.unit),unit:first.unit,reference:first.reference,manual:group.every(t=>t.manual||t.retained!==undefined)}:undefined;
    if(proof&&sourcePurpose==='fondations')proof.method=`Linéaire relevé : ${Lf} m ; emprise rigoles : ${Lf} × ${v('largeurRigole')} − ${v('rigoleCorrection')} m² ; emprise semelles : ${Lf} × ${v('largeurSemelle')} − ${v('semelleCorrection')} m².`;
    if(proof&&sourcePurpose==='soubassements')proof.method=`Emprise nette des murets : ${Lm} × ${v('epaisseurMur')} − ${v('murCorrection')} m². Coffrage calculé sur 2 faces, à adapter aux faces réellement coffrées.`;
    if(proof){proof.method=(proof.method||'')+' Relevés repris : '+group.map(t=>`p.${t.page} ${t.label}`).join(' ; ');}
    const links={ST:{purpose:'emprise',field:'S'},VT:{purpose:'emprise',field:'S'},VP:{purpose:'emprise',field:'S'},VR:{purpose:'fondations',field:'S',width:Number(String(params.largeurRigole).replace(',','.')),correction:Number(String(params.rigoleCorrection).replace(',','.'))},VB0:{purpose:'fondations',field:'S',width:Number(String(params.largeurSemelle).replace(',','.')),correction:Number(String(params.semelleCorrection).replace(',','.'))},VS:{purpose:'fondations',field:'S',width:Number(String(params.largeurSemelle).replace(',','.')),correction:Number(String(params.semelleCorrection).replace(',','.'))},AS:{purpose:'fondations',field:'V',width:Number(String(params.largeurSemelle).replace(',','.')),correction:Number(String(params.semelleCorrection).replace(',','.')),factor:Number(String(params.hauteurSemelle).replace(',','.'))},VM:{purpose:'soubassements',field:'S',width:Number(String(params.epaisseurMur).replace(',','.')),correction:Number(String(params.murCorrection).replace(',','.'))},CF:{purpose:'soubassements',field:'L'},VF:{purpose:'dallage',field:'S'},SF:{purpose:'dallage',field:'S'},VD:{purpose:'dallage',field:'S'},MA:{purpose:'maconnerie',field:'L'},DR:{purpose:'drainage',field:'L'}};
    const planLink=links[index]||null;
    const input={planLink,preset,outputUnit:unit,dimensions:Object.fromEntries(Object.entries(dimensions).map(([k,val])=>[k,String(val)])),dimensionUnit:'m',count:'1',deduction:'0',openings:[],basis:sourcePurpose==='emprise'||sourcePurpose==='dallage'?'HO':'axes',planMeasurement:proof};
    rows.push({id:crypto.randomUUID(),rowNumber:p.article||'',code:index,report:group.map(t=>t.label).join(' ; ').slice(0,80),label:p.title,lot:p.lot,location:'Relevé sur plan',unitPrice:null,input,result:calculate(input)});
  };
  if(S){add('herbaces_surface','m²',{S},'ST','emprise');add('decapage_surface','m³',{S,h:v('decapage')},'VT','emprise');excav=S*v('plateforme');add('excavation_surface','m³',{S,h:v('plateforme')},'VP','emprise');rows.at(-1).label='Excavation surfacique en classe B, fond dressé à la cote du projet.';rows.at(-1).lot='Terrassement';rows.at(-1).rowNumber='01.02.06';}
  if(Lf){
    const Af=Lf*v('largeurRigole')-v('rigoleCorrection'),As=Lf*v('largeurSemelle')-v('semelleCorrection');if(Af<=0||As<=0)throw new Error('Les corrections des jonctions dépassent les emprises brutes.');
    rigoles=Af*v('profondeurRigole');add('rigoles_surface','m³',{S:Af,h:v('profondeurRigole')},'VR','fondations');Object.assign(rows.at(-1),{label:PRESETS.rigoles.title,lot:'Terrassement',rowNumber:'01.02.07'});
    add('proprete_surface','m³',{S:As,h:v('proprete')},'VB0','fondations');semelles=As*v('hauteurSemelle');add('semelles_surface','m³',{S:As,h:v('hauteurSemelle')},'VS','fondations');add('aciers_semelles','kg',{V:semelles,rho:v('acier')},'AS','fondations');
  }
  if(Lm){const Am=Lm*v('epaisseurMur')-v('murCorrection');if(Am<=0)throw new Error('Les corrections dépassent l’emprise des murets.');add('murets_surface','m³',{S:Am,h:v('hauteurMur')},'VM','soubassements');Object.assign(rows.at(-1),{label:PRESETS.murets.title,lot:'Soubassements',rowNumber:'01.03.04'});add('coffrage','m²',{L:Lm,h:v('hauteurMur'),f:2},'CF','soubassements');}
  if(Sd){add('forme','m³',{S:Sd,h:v('forme')},'VF','dallage');add('film','m²',{S:Sd},'SF','dallage');add('dallage','m³',{S:Sd,h:v('dalle')},'VD','dallage');}
  if(Lmac){add('maconnerie_rdc','m²',{L:Lmac,h:v('hauteurMac')},'MA','maconnerie');const row=rows.at(-1);row.input.deduction=String(v('deductionMac'));row.result=calculate(row.input);}
  if(Ldrain)add('drainage','m',{L:Ldrain},'DR','drainage');
  if(excav+rigoles){add('evacuation','m³',{V:excav+rigoles,R:v('reemploi'),k:v('foisonnement')},'VE',S?'emprise':'fondations');rows.at(-1).input.planLink={field:'V',terms:[...(S?[{purpose:'emprise',width:v('plateforme')}]:[]),...(Lf?[{purpose:'fondations',width:v('largeurRigole'),correction:v('rigoleCorrection'),factor:v('profondeurRigole')}]:[])]};}
  return rows;
}
