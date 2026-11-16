import {fmt,lineAmount} from './core.js';
import {workColor} from './professional-core.js';
import {pageSource,extensionResults,premiumProperties} from './premium-metre.js';
export const PRO_TITLE='Atelier Métré Pro';
export const PRO_HEADERS=['Code','Désignation','Lot TCE','Niveau','Zone','Unité','Quantité','PV HT','Montant HT','Couleur','Minute de calcul','Convention déductions','Page source','Surface projetée nette','Pente (%)','Coefficient de pente'];
export const rowProof=row=>(row.result?.steps||[]).join(' | ');
export function groupProfessionalRows(rows,by='lot',project={}) {
  const map=new Map();
  for(const row of rows){
    const source=by==='page'?pageSource(row,project):null;const name=source?source.name:by==='zone'?`${row.level||'Niveau non renseigné'} / ${row.room||row.location||'Zone non renseignée'}`:row.lot||'Sans lot';
    const key=source?source.key:name;if(!map.has(key))map.set(key,{key,name,rows:[],totals:{},amount:0,missing:0});
    const g=map.get(key);g.rows.push(row);
    g.totals[row.result.unit]=(g.totals[row.result.unit]||0)+row.result.total;
    const amount=lineAmount(row.result.total,row.unitPrice);if(amount===null)g.missing++;else g.amount+=amount;
  }
  return [...map.values()];
}
export function professionalRecords(project){return project.rows.map(r=>[r.code||r.rowNumber||'',r.label,r.lot||'',r.level||'',r.room||r.location||'',r.result.unit,r.result.total,r.unitPrice??null,lineAmount(r.result.total,r.unitPrice),workColor(r),rowProof(r),r.input.preset==='minute-pro'?'Globale sur la ligne':'Par élément / voir minute',pageSource(r,project).name,r.result.slope?.projectedNet??null,r.result.slope?.percent??null,r.result.slope?.coefficient??null]);}
export function professionalCSV(project,by=null){
  const cell=v=>{let s=typeof v==='number'?String(v).replace('.',','):String(v??'');if(typeof v!=='number'&&/^\s*[=+\-@\t\r]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';};
  const records=professionalRecords(project);let output=[PRO_HEADERS,...records];if(by){const lookup=new Map(project.rows.map((r,i)=>[r.id,records[i]]));output=[['Regroupement',...PRO_HEADERS],...groupProfessionalRows(project.rows,by,project).flatMap(g=>[...g.rows.map(r=>[g.name,...lookup.get(r.id)]),...Object.entries(g.totals).map(([u,q],i)=>{const a=Array(PRO_HEADERS.length+1).fill('');a[0]='SOUS-TOTAL · '+g.name;a[6]=u;a[7]=q;if(i===0)a[9]=g.amount;return a;})])];}return '\uFEFF'+output.map(r=>r.map(cell).join(';')).join('\r\n');
}
export function createProfessionalWorkbook(project,ExcelJS,view='lot'){
  const wb=new ExcelJS.Workbook();wb.creator=PRO_TITLE;
  const add=(name,headers,records)=>{const sheet=wb.addWorksheet(name);sheet.addRow(headers);sheet.getRow(1).font={bold:true,color:{argb:'FFFFFFFF'}};sheet.getRow(1).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF2563EB'}};sheet.views=[{state:'frozen',ySplit:1}];headers.forEach((_,i)=>sheet.getColumn(i+1).width=i===1?52:22);records.forEach(r=>sheet.addRow(r));sheet.autoFilter={from:'A1',to:{row:1,column:headers.length}};sheet.pageSetup={orientation:'landscape',paperSize:9,fitToPage:true,fitToWidth:1,fitToHeight:0};return sheet;};
  add('Projet',['Champ','Valeur'],[['Émetteur',PRO_TITLE],['Projet',project.title],['Adresse',project.meta?.address||''],['Devise',project.settings?.currency||'EUR'],['Échange','CSV / Excel générique : vérifier le mapping dans le logiciel de devis.'],['Quantités','Valeurs calculées figées à la date de l’export.']]);
  const records=professionalRecords(project),main=add('Passerelle devis',PRO_HEADERS,records);
  records.forEach((r,i)=>{main.getCell(i+2,10).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF'+r[9].slice(1).toUpperCase()}};main.getCell(i+2,11).alignment={wrapText:true};});
  for(const [name,key]of [['Totaux par lot','lot'],['Totaux niveaux-zones','zone'],['Totaux par page','page']])add(name,['Groupe','Unité','Quantité','HT renseigné','Lignes sans prix'],groupProfessionalRows(project.rows,key,project).flatMap(g=>Object.entries(g.totals).map(([u,q],i)=>[g.name,u,q,i===0?g.amount:null,i===0?g.missing:null])));
  add('Minutes calcul',['Code','Ouvrage','N','L','l / ép.','H','Déduction saisie','Formule / justification'],project.rows.map(r=>[r.code||r.rowNumber,r.label,r.input.count,r.input.dimensions.L??'',r.input.dimensions.w??'',r.input.dimensions.h??'',r.input.deduction,rowProof(r)]));
  const recordsById=new Map(project.rows.map((r,i)=>[r.id,records[i]]));
  add('Rapport sélectionné',['Regroupement',...PRO_HEADERS],groupProfessionalRows(project.rows,view,project).flatMap(g=>g.rows.map(r=>[g.name,...recordsById.get(r.id)])));
  add('Besoins des extensions',['Code ouvrage','Ouvrage','Lot','Niveau','Zone','Page','Extension','Composant','Unité','Quantité','Formule / justification','Erreur'],extensionRecords(project));
  add('Géométrie et pente',['Code','Ouvrage','Page source','Brut projeté','Déductions projetées','Net projeté','Net retenu','Unité','Pente (%)','Pente (°)','Coefficient'],project.rows.map(r=>{const p=premiumProperties(r,project);return[r.code||r.rowNumber,r.label,p.source.name,p.gross,p.deductions,p.projectedNet,p.net,p.unit,p.slope.percent,p.slope.degrees,p.slope.coefficient];}));
  return wb;
}
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function professionalPrintHTML(project,by='lot'){
  const groups=groupProfessionalRows(project.rows,by,project),currency=project.settings?.currency||'EUR';
  const money=n=>new Intl.NumberFormat('fr-FR',{style:'currency',currency}).format(n);
  const total=groups.reduce((n,g)=>n+g.amount,0),missing=groups.reduce((n,g)=>n+g.missing,0);
  return `<header><p>DPGF · MINUTES DE CALCUL</p><h1>${PRO_TITLE}</h1><h2>${esc(project.title)}</h2><p>${esc(project.meta?.address)} · ${esc(project.meta?.client)} · ${esc(project.meta?.studyDate)}</p></header>`+groups.map(g=>`<section><h3>${esc(g.name)}</h3><table><thead><tr><th>Code</th><th>Ouvrage / minute</th><th>Niveau / zone</th><th>U</th><th>Quantité</th><th>PV HT</th><th>Montant HT</th></tr></thead><tbody>${g.rows.map(r=>{const amount=lineAmount(r.result.total,r.unitPrice);return `<tr><td><i class="print-color" style="background:${workColor(r)}"></i>${esc(r.code||r.rowNumber)}</td><td><b>${esc(r.label)}</b><small>${esc(rowProof(r))}</small></td><td>${esc(r.level)} / ${esc(r.room||r.location)}<small>${esc(pageSource(r,project).name)}</small></td><td>${esc(r.result.unit)}</td><td class="num">${fmt(r.result.total,6)}</td><td class="num">${r.unitPrice==null?'À renseigner':esc(money(Number(r.unitPrice)))}</td><td class="num">${amount===null?'Non chiffré':esc(money(amount))}</td></tr>`;}).join('')}</tbody></table><p class="print-subtotal">Sous-totaux : ${Object.entries(g.totals).map(([u,q])=>`${fmt(q,6)} ${esc(u)}`).join(' · ')} — HT renseigné : ${esc(money(g.amount))}${g.missing?' · '+g.missing+' ligne(s) sans prix':''}</p></section>`).join('')+extensionPrint(project)+`<footer><b>${missing?'Total HT renseigné — incomplet':'Total HT'} : ${esc(money(total))}</b>${missing?`<p>${missing} ligne(s) sans prix : ne pas utiliser ce document comme devis complet.</p>`:''}<p>Quantités contrôlables par leurs minutes. Les unités différentes ne sont jamais additionnées.</p></footer>`;
}

export function extensionRecords(project){return project.rows.flatMap(r=>(r.tradeExtensions||[]).flatMap(t=>{try{return extensionResults(r,t).map(c=>[r.code||r.rowNumber||'',r.label,r.lot,r.level||'',r.room||r.location||'',pageSource(r,project).name,t.name,c.name,c.unit,c.quantity,c.proof,'']);}catch(e){return[[r.code||r.rowNumber||'',r.label,r.lot,r.level||'',r.room||r.location||'',pageSource(r,project).name,t.name,'À réviser','','','',e.message]];}}));}
function extensionPrint(project){const records=extensionRecords(project);if(!records.length)return '';return '<section><h3>Décomposition des besoins · hors cumul DPGF</h3><p>Ratios d’estimation à adapter. Ces composants ne sont pas additionnés aux ouvrages facturables.</p><table><thead><tr><th>Ouvrage</th><th>Extension / composant</th><th>U</th><th>Quantité</th><th>Justification</th></tr></thead><tbody>'+records.map(r=>`<tr><td>${esc(r[0])} · ${esc(r[1])}<small>${esc(r[5])}</small></td><td>${esc(r[6])}<br>${esc(r[7])}</td><td>${esc(r[8])}</td><td class="num">${r[9]===''?'—':fmt(r[9],6)}</td><td>${esc(r[10]||r[11])}</td></tr>`).join('')+'</tbody></table></section>';}
