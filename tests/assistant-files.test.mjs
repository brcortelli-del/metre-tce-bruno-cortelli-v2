import test from 'node:test';
import assert from 'node:assert/strict';
import { decoderTexteAssistant, verifierFichierAssistant, textePagePDF, extrairePagesAssistant, ouvrirDocumentAssistant, fusionnerTexteAssistant, ASSISTANT_MAX_FILE_BYTES } from '../public/assistant-files.js';
import { analyserLocalement, preparerLigneAssistant } from '../public/assistant-metre.js';
import { nettoyerDemandeIA } from '../server/assistant.js';

const file=(text,name='descriptif.txt')=>new File([text],name);
const item=(str,y=100,hasEOL=true)=>({str,transform:[1,0,0,1,10,y],height:10,hasEOL});
const fakePdf=parts=>({numPages:parts.length,async getPage(n){return{async getTextContent(){return {items:parts[n-1].map(t=>item(t))};},cleanup(){}};}});

test('un véritable File est exigé ; FileList, formats non prévus et fichiers vides sont refusés',()=>{
  assert.equal(verifierFichierAssistant(file('texte')),'text');assert.equal(verifierFichierAssistant(file('%PDF-1.7','cctp.PDF')),'pdf');
  for(const f of [[file('texte')],null,file('x','programme.exe'),file(''),{name:'gros.pdf',size:ASSISTANT_MAX_FILE_BYTES+1,arrayBuffer(){}}])assert.throws(()=>verifierFichierAssistant(f));
});
test('TXT, MD et CSV sont lus comme du texte, sans exécution de leur contenu',async()=>{
  for(const suffix of ['txt','md','csv']){
    const content='Cloisons 42,5 m²\r\n=HYPERLINK("https://example.test")';
    const doc=await ouvrirDocumentAssistant(file(content,'cctp.'+suffix));const result=await doc.read();
    assert.equal(doc.kind,'text');assert.ok(result.text.includes('42,5 m²\n=HYPERLINK'));await doc.dispose();
  }
});
test('UTF-8, UTF-16 BOM et Windows-1252 conservent les accents et les virgules',()=>{
  const raw='Électricité ; 12,5 m²';
  assert.equal(decoderTexteAssistant(new TextEncoder().encode(raw)).text,raw);
  const utf16=Buffer.concat([Buffer.from([255,254]),Buffer.from(raw,'utf16le')]);assert.equal(decoderTexteAssistant(utf16).text,raw);
  assert.equal(decoderTexteAssistant(Uint8Array.from([0xe9,0x6c,0x65,0x63])).text,'élec');
  assert.throws(()=>decoderTexteAssistant(Uint8Array.from([0,1,2,3])),/exploitable/);
});
test('les fragments PDF retrouvent lignes, nombres décimaux et m² sans convertir les cotes',()=>{
  const text=textePagePDF([item('Cloisons',100,false),item('42',100,false),item(',',100,false),item('5',100,false),item('m',100,false),item('²',104,true),item('3 blocs-portes',80)]);
  assert.ok(text.includes('42,5 m²'));assert.ok(text.includes('\n3 blocs-portes'));
  assert.equal(analyserLocalement(text).postes_detectes[0].quantite_estimee,42.5);
});
test('PDF : seules les pages choisies sont extraites, avec leur numéro et sans pages masquées',async()=>{
  const pdf=fakePdf([['Cloisons 42,5 m²'],['3 blocs-portes'],['Peinture 100 m²']]);
  const progress=[];const result=await extrairePagesAssistant(pdf,{from:1,to:2,onProgress:p=>progress.push(p.page)});
  assert.ok(result.text.includes('[Page 1]'));assert.ok(result.text.includes('[Page 2]'));assert.ok(!result.text.includes('Peinture'));assert.deepEqual(progress,[1,2]);
  assert.deepEqual(analyserLocalement(result.text).postes_detectes.map(p=>p.quantite_estimee),[42.5,3]);
  assert.equal(analyserLocalement('Lot Plâtrerie / Isolation\nCréation de 42,5 m² de cloisons hydrofuges.\nLot Menuiseries intérieures\nPose de 3 blocs-portes.').postes_detectes.length,2);
});
test('PDF scanné : aucun nombre inventé ; pages partiellement vides signalées',async()=>{
  await assert.rejects(()=>extrairePagesAssistant(fakePdf([[],[]])),/OCR/);
  const result=await extrairePagesAssistant(fakePdf([['Mur 20 m²'],[]]));assert.deepEqual(result.emptyPages,[2]);assert.ok(!result.text.includes('[Page 2]'));
});
test('plages impossibles et plus de 30 pages refusées, lecture annulable avec nettoyage',async()=>{
  const pdf=fakePdf(Array(31).fill(['Mur 1 m²']));
  for(const range of [{from:0,to:1},{from:2,to:1},{from:1,to:32},{from:1,to:31},{from:1.5,to:2}])await assert.rejects(()=>extrairePagesAssistant(pdf,range));
  const controller=new AbortController();let clean=false;
  const cancellable={numPages:1,async getPage(){return{async getTextContent(){controller.abort();return {items:[item('Mur 20 m²')]};},cleanup(){clean=true;}};}};
  await assert.rejects(()=>extrairePagesAssistant(cancellable,{signal:controller.signal}),{name:'AbortError'});assert.ok(clean);
});
test('aperçu : ajout/remplacement atomique, sans coupure silencieuse des textes longs',()=>{
  assert.equal(fusionnerTexteAssistant('Ancien','Nouveau'),'Ancien\n\nNouveau');assert.equal(fusionnerTexteAssistant('Ancien','Nouveau','replace'),'Nouveau');
  assert.throws(()=>fusionnerTexteAssistant('a'.repeat(11999),'Nouveau'),/12 000/);
  assert.throws(()=>fusionnerTexteAssistant('Ancien','   '),/Aucun texte/);
  assert.throws(()=>fusionnerTexteAssistant('Ancien','Nouveau','incorrect'));
});
test('signature PDF et annulation contrôlées avant de charger le parseur',async()=>{
  await assert.rejects(()=>ouvrirDocumentAssistant(file('pas un PDF','faux.pdf')),/invalide/);
  const controller=new AbortController();controller.abort();await assert.rejects(()=>ouvrirDocumentAssistant(file('Texte'),{signal:controller.signal}),{name:'AbortError'});
});
test('le document PDF libère son worker à la fermeture',async()=>{
  let destroyed=0;const pdf=fakePdf([['Mur 12 m²']]);
  const lib={getDocument(){return{promise:Promise.resolve(pdf),async destroy(){destroyed++;}};}};
  const doc=await ouvrirDocumentAssistant(file('%PDF-1.7','cctp.pdf'),{pdfjs:lib});assert.equal(doc.pages,1);assert.ok((await doc.read({from:1,to:1})).text.includes('12 m²'));
  await doc.dispose();await doc.dispose();assert.equal(destroyed,1);assert.throws(()=>doc.read({from:1,to:1}),/fermé/);
});
test('provenance de fichier conservée sans stocker ses octets dans la ligne',()=>{
  const p=analyserLocalement('Cloisons 42,5 m²').postes_detectes[0];
  const row=preparerLigneAssistant({...p,documents_source:[{name:'CCTP.pdf',pages:'1–2',modified:false,bytes:'NE-PAS-CONSERVER'}]});
  assert.deepEqual(row.assistantSource.documents,[{name:'CCTP.pdf',pages:'1–2',modified:false}]);assert.ok(!JSON.stringify(row).includes('NE-PAS-CONSERVER'));
});
test('le contrat texteClient/lignesMetreActuelles est adapté sans transmettre les prix',()=>{
  const body=nettoyerDemandeIA({texteClient:'Mur 12 m²',lignesMetreActuelles:[{label:'Ancien mur',lot:'Gros œuvre',result:{unit:'m²',total:12},unitPrice:50}]});
  assert.equal(body.text,'Mur 12 m²');assert.deepEqual(body.lignes,[{designation:'Ancien mur',lot:'Gros œuvre',unite:'m²'}]);assert.equal(nettoyerDemandeIA({texteClient:'Mur 1 m²'}).lignes.length,0);
});
