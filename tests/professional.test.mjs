import test from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import {calculate,validateProject} from '../public/core.js';
import {upgradeProject} from '../public/business.js';
import {insertProjectRows,patchProjectPlan} from '../public/project-state.js';
import {makeProfessionalRow,professionalTraceRow,workColor} from '../public/professional-core.js';
import {groupProfessionalRows,professionalCSV,createProfessionalWorkbook,professionalPrintHTML} from '../public/professional-exports.js';
import {createWorkbook} from '../public/exports.js';
const make=(patch={})=>makeProfessionalRow({label:'Ouvrage test',unit:'m²',N:'3',L:'5',w:'2',H:'2',D:'4',level:'RDC',zone:'Séjour',...patch},'pro-1');
const project=rows=>upgradeProject({version:1,title:'Projet test',rows});
test('quatre unités : déduction globale après répétition, surfaces H ou l',()=>{
 for(const [unit,axis,total]of [['m','h',11],['m²','h',26],['m²','w',26],['m³','h',56],['u','h',2]]){
  const r=make({unit,axis,D:unit==='u'?'1':'4'}),v=calculate(r.input);assert.equal(v.total,total);assert.equal(v.deductionScope,'global');assert.ok(v.steps.at(-1).includes(' = '));
 }
 const surface=make({axis:'w',w:'3'});assert.equal(calculate(surface.input).total,41);
 // Existing rows retain (gross - deductions) * N.
 assert.equal(calculate({preset:'surface',dimensionUnit:'m',dimensions:{L:'5',w:'2'},count:'3',deduction:'4',openings:[]}).total,18);
});
test('expressions, cm et vides globaux : pas de double multiplication',()=>{
 const r=make({unit:'m³',N:'2',L:'500',w:'20',H:'250',D:'0',dimensionUnit:'cm',openings:[{w:'100',h:'200',n:'1'}]});
 assert.ok(Math.abs(calculate(r.input).total-4.6)<1e-12);
 const formula=make({L:'2+3',D:'1+1'});assert.equal(calculate(formula.input).total,28);
});
test('refus des déductions excessives, négatifs, unités incohérentes et comptages fractionnaires',()=>{
 for(const patch of [{D:'31'},{N:'0'},{N:'1.5'},{L:'-2'},{unit:'u',D:'0.5'},{unit:'m',openings:[{w:'1',h:'1',n:'1'}]}])assert.throws(()=>calculate(make(patch).input));
 assert.equal(calculate(make({D:'30'}).input).total,0);
});
test('sauvegarde, couleur, niveau, zone et recalcul après réouverture',()=>{
 const p=project([make({workColor:'#b45309',unitPrice:'12,50'})]);const restored=validateProject(JSON.parse(JSON.stringify(p)));const r=restored.rows[0];
 assert.equal(r.result.total,26);assert.equal(r.workColor,'#b45309');assert.equal(r.level,'RDC');assert.equal(r.room,'Séjour');assert.equal(r.unitPrice,12.5);
 assert.match(workColor({workColor:'url(javascript:alert(1))'}),/^#[0-9a-f]{6}$/i);
});
test('relevé injecté lié au plan : mise à jour de géométrie et suppression protégée',()=>{
 const trace={id:'t1',label:'Mur A',lot:'Gros œuvre',level:'R+1',zone:'Bureau',unit:'m',value:5,page:1,reference:5,workColor:'#7c3aed'};
 const state={fileName:'plan.pdf',pages:{1:{reference:5,traces:[trace]}}};
 const empty=project([]);empty.planWorkspace=state;
 const p=insertProjectRows(empty,[professionalTraceRow(trace,'plan.pdf','linked-1')]);
 assert.equal(p.rows[0].result.total,5);assert.equal(p.rows[0].level,'R+1');assert.equal(p.rows[0].workColor,'#7c3aed');
 const next=structuredClone(state);next.pages[1].traces[0].value=8;
 assert.equal(patchProjectPlan(p,next,{traceIds:['t1']}).rows[0].result.total,8);
 next.pages[1].traces=[];assert.throws(()=>patchProjectPlan(p,next,{traceIds:['t1']}),/absent/);
});
test('ventilation sans additionner les unités et sans inventer un prix manquant',()=>{
 const a=make(),b=make({unit:'m',N:'1',D:'0'});b.id='pro-2';
 const p=project([a,b]),g=groupProfessionalRows(p.rows,'zone')[0];assert.deepEqual(g.totals,{'m²':26,m:5});assert.equal(g.missing,2);
});
test('CSV et impression : colonnes de passerelle, anti-injection et titre imposé',()=>{
 const p=project([make({label:'=cmd|malveillant',lot:'<script>alert(1)</script>'})]);
 assert.match(professionalCSV(p),/"Code";"Désignation"/);assert.match(professionalCSV(p),/"'=cmd/);
 const html=professionalPrintHTML(p);assert.ok(html.includes('Atelier Métré Pro'));assert.ok(html.includes('&lt;script&gt;'));assert.ok(!html.includes('<script>'));assert.match(html,/incomplet/);
});
test('Excel : vraie archive XLSX, quantités et montants numériques, détails présents',async()=>{
 const p=project([make({unitPrice:'10'})]),wb=createProfessionalWorkbook(p,ExcelJS),bytes=await wb.xlsx.writeBuffer();
 const read=new ExcelJS.Workbook();await read.xlsx.load(bytes);
 assert.equal(read.getWorksheet('Passerelle devis').getCell('G2').value,26);assert.equal(read.getWorksheet('Passerelle devis').getCell('I2').value,260);assert.equal(read.getWorksheet('Totaux niveaux-zones').getCell('C2').value,26);
 const legacy=await createWorkbook(p,ExcelJS);assert.ok(!legacy.getWorksheet('Minute').getCell('N2').value.formula.includes('undefined'));assert.equal(legacy.getWorksheet('Minute').getCell('O2').value.result,26);
});
