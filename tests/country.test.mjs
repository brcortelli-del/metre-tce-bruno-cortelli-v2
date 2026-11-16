import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ExcelJS from 'exceljs';
import {HyperFormula} from 'hyperformula';
import {unzipSync,strFromU8} from 'fflate';
import {calculate,validateProject} from '../public/core.js';
import {upgradeProject,recalculateProject} from '../public/business.js';
import {patchProjectRow} from '../public/project-state.js';
import {catalogueIndex,fromClause,normalizeCctp,plainBlocks,blocksText} from '../public/cctp-model.js';
import {countryCatalogue,switchCountryCctp,adoptCountryCctp} from '../public/country-cctp.js';
import {measurementRule,openingDecision} from '../public/country-rules.js';
import {createWorkbook} from '../public/exports.js';
import {createCctpDocx} from '../cctp/exports.js';
const read=n=>JSON.parse(readFileSync(new URL('../public/data/'+n,import.meta.url)));
const data=read('cctp-fr-lu.json'),audit=read('cctp-audit-fr-lu.json');
const raw=catalogueIndex(read('cctp-library.json'),read('cctp-sources.json'));
const cat=c=>countryCatalogue(raw,data,c);
const wall=(openings,extra={})=>({preset:'maconnerie_rdc',dimensionUnit:'m',outputUnit:'m²',dimensions:{L:'10',h:'3',w:'.2'},count:'1',deduction:'0',openings,...extra});
const calc=(i,c)=>calculate(i,[],{country:c});
const close=(a,b)=>assert(Math.abs(a-b)<1e-9,`${a} != ${b}`);
test('pays : seuil par baie, égalité conservée et déduction entière au-delà',()=>{
  const i=wall([{w:'1',h:'2.5',n:'3'},{w:'1.0004',h:'2.5',n:'1'}]);
  close(calc(i,'france').deduction,10.001);
  close(calc(i,'luxembourg').deduction,2.501);
  assert(calc(i,'luxembourg').steps.some(s=>s.includes('non déduite')));
  assert(calc(i,'france').steps.some(s=>s.includes('pédagogique')));
});
test('pays : seuil volumique appliqué au volume unitaire, conversions cohérentes',()=>{
  const i=wall([{w:'100',h:'250',n:'2'},{w:'150',h:'200',n:'1'}],{dimensionUnit:'cm',outputUnit:'m³',dimensions:{L:'1000',h:'300',w:'20'},measurementProfile:'concrete'});
  close(calc(i,'france').total,4.4);close(calc(i,'luxembourg').total,5.4);
  const rule=measurementRule(i,'luxembourg','m³');assert.equal(openingDecision(rule,2.5,.2).deduct,false);
  assert.throws(()=>calc({...i,measurementProfile:'plaster'},'luxembourg'),/profil/);
});
test('pays : déductions manuelles conservées et entrées impossibles refusées',()=>{
  const i=wall([{w:'1',h:'1',n:'2'}],{deduction:'1'});
  assert.equal(calc(i,'luxembourg').total,29);assert.equal(calc({...i,measurementProfile:'net'},'luxembourg').total,27);
  assert.throws(()=>calc(wall([{w:'1',h:'1',n:'31'}]),'luxembourg'),/surface réelle/);
  assert.throws(()=>upgradeProject({version:1,rows:[],country:'autre'}),/Pays/);
});
test('pays : rechargement et modification de cellule utilisent le pays du projet',()=>{
  const p=upgradeProject({version:1,title:'LU',country:'luxembourg',rows:[{id:'w',label:'Mur',lot:'GO',unitPrice:null,input:wall([{w:'1',h:'2',n:'2'}])}]});
  assert.equal(p.rows[0].result.total,30);
  assert.equal(validateProject(JSON.parse(JSON.stringify(p))).rows[0].result.total,30);
  const next=patchProjectRow(p,'w',r=>r.input.openings[0].w='2');assert.equal(next.rows[0].result.total,22);
  assert.equal(recalculateProject({...p,country:'france'}).rows[0].result.total,26);
});
test('pays : CCTP FR/LU et brouillons personnalisés restaurés après normalisation',()=>{
  const fr=cat('france'),lu=cat('luxembourg');
  const a=fromClause(fr.find(o=>o.code==='GO-V02'),'a');a.rowIds=['mur'];a.title='Mur de mon projet';a.execution=plainBlocks('Prescription FR personnalisée');
  const d={version:1,articles:[a]};let l=switchCountryCctp(d,'luxembourg',lu,'france');
  assert.match(l.articles[0].references,/CTG 012/);assert.doesNotMatch(l.articles[0].references,/DTU/);assert.equal(l.articles[0].title,'Mur de mon projet');
  l.articles[0].execution=plainBlocks('Prescription LU personnalisée');
  const f=switchCountryCctp(normalizeCctp(l),'france',fr,'luxembourg');
  assert.equal(blocksText(f.articles[0].execution),'Prescription FR personnalisée');
  const again=switchCountryCctp(normalizeCctp(f),'luxembourg',lu,'france');
  assert.equal(blocksText(again.articles[0].execution),'Prescription LU personnalisée');
  assert.equal(again.articles[0].reviewed,false);
  const outside=lu.find(o=>o.code==='VEN-005');assert.match(outside.source.note,/hors adaptation/);
});
test('pays : migration des références historiques préserve les prescriptions personnalisées',()=>{
  const a=fromClause(raw.find(o=>o.code==='GO-F14'),'legacy');
  a.execution=plainBlocks('Prescription du chantier à garder');
  const doc={version:1,articles:[a]},adopted=adoptCountryCctp(doc,'france',cat('france'));
  assert.match(adopted.articles[0].references,/13.1 — septembre 2019/);
  assert.equal(blocksText(adopted.articles[0].execution),'Prescription du chantier à garder');
  assert.equal(adoptCountryCctp(adopted,'france',cat('france')),adopted);
});
test('pays : export Excel recalculé indépendamment garde les seuils vivants',async()=>{
  const p=upgradeProject({version:1,country:'luxembourg',rows:[{id:'w',label:'Mur',unitPrice:10,lot:'GO',input:wall([{w:'1',h:'2.5',n:'3'},{w:'1.2',h:'2.5',n:'1'}])}]});
  const wb=await createWorkbook(p,ExcelJS),sheets={};
  for(const s of wb.worksheets)sheets[s.name]=Array.from({length:s.rowCount},(_,r)=>Array.from({length:s.columnCount},(_,c)=>{const v=s.getCell(r+1,c+1).value;return v?.formula?'='+v.formula:v;}));
  const hf=HyperFormula.buildFromSheets(sheets,{licenseKey:'gpl-v3',precisionRounding:14});
  const addr=(sh,c)=>hf.simpleCellAddressFromString(c,hf.getSheetId(sh));
  assert.equal(hf.getCellValue(addr('Minute','O2')),27);
  assert.equal(hf.getCellValue(addr('Bordereau LU','F2')),270);
  const d=wb.getWorksheet('Détails');const wide=d.getRows(1,d.rowCount).find(r=>r.getCell(2).text==='Largeur ouverture 1').number;
  hf.setCellContents(addr('Détails','D'+wide),[[1.2]]);
  assert.equal(hf.getCellValue(addr('Minute','O2')),18);
  hf.destroy();
});
test('pays : DOCX véritable, titre luxembourgeois et exclusion quantités/prix',()=>{
  const doc={version:1,articles:[fromClause(cat('luxembourg').find(o=>o.code==='GO-V02'),'w')]};
  const bytes=createCctpDocx({title:'Projet témoin',country:'luxembourg',cctp:doc});
  const files=unzipSync(bytes),xml=strFromU8(files['word/document.xml']);
  assert.match(xml,/Descriptif des positions/);assert.match(xml,/Luxembourg/);assert.match(xml,/sans quantités ni prix/);
  assert(!xml.includes('9876.54'));
});
test('pays : JSON complet pour554fiches, unités et références traçables sans certification inventée',()=>{
  assert.deepEqual(data.lots.map(l=>l.ouvrages.length),[296,258]);
  const ids=new Set(data.sources.map(s=>s.id));
  for(const l of data.lots)for(const o of l.ouvrages){
    assert(o.source_cours?.references.length,o.code);
    assert(!['ml','U'].includes(o.unite));
    for(const c of ['france','luxembourg']){assert(o.comparatif_metre[c].sources.every(id=>ids.has(id)));assert(o.clause_cctp['texte_'+c].length);}
  }
  assert.equal(audit.formules.length,99);assert.equal(audit.abreviations.length,267);
  assert(audit.normes.some(n=>!n.sources.length));
  assert(audit.formules.filter(f=>f.statut_audit.includes('historique')).every(f=>!f.application_dimensionnement_automatique));
  assert.match(cat('france').find(o=>o.code==='GO-F14').clause_cctp.normes_dtu.join(),/13.1 — septembre 2019/);
});
