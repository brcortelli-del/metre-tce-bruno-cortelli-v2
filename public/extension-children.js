import {canonical,validateExtension,extensionResults} from './premium-metre.js';
export function estimationTemplate(e){return validateExtension({id:e.id,name:e.nom,baseUnit:canonical(e.uniteSource),parameters:[],components:e.composants.map(c=>({name:c.designation,unit:canonical(c.unite),formula:`Q * ${c.coefficient}`,unitPrice:c.prixUnitaireHT}))});}
export function extensionChildRows(parent,template,makeId=()=>crypto.randomUUID()){
 const t=validateExtension(template),results=extensionResults(parent,t);
 return results.map((c,i)=>({id:makeId(),label:c.name,lot:parent.lot||'Sans lot',level:parent.level||'',room:parent.room||'',location:parent.location||'',building:parent.building||'',workColor:parent.workColor,code:'',rowNumber:'',unitPrice:c.unitPrice??null,report:'Extension métier',extensionParentId:parent.id,extensionTemplateId:t.id,input:{preset:'reprise',dimensionUnit:'m',outputUnit:c.unit,dimensions:{Q:String(c.quantity)},count:'1',deduction:'0',openings:[],basis:'libre',extensionOrigin:`[Ext. ${t.name}] Parent : ${parent.code||parent.label} ; ${c.proof}`}}));
}
