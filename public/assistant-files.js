import { ASSISTANT_MAX_TEXT } from './assistant-metre.js';

export const ASSISTANT_MAX_FILE_BYTES=20*1024*1024;
export const ASSISTANT_MAX_EXTRACT=200000;
const abortIfNeeded=signal=>{if(signal?.aborted)throw new DOMException('Import annulé.','AbortError');};
export function verifierFichierAssistant(file){
  if(!file||typeof file.name!=='string'||typeof file.arrayBuffer!=='function')throw new Error('Choisis un fichier PDF, TXT, MD ou CSV.');
  const extension=file.name.split('.').at(-1).toLowerCase();
  if(!['pdf','txt','md','csv'].includes(extension))throw new Error('Format refusé : utilise PDF, TXT, MD ou CSV.');
  if(!Number.isFinite(file.size)||file.size<=0||file.size>ASSISTANT_MAX_FILE_BYTES)throw new Error('Le fichier doit être non vide et ne pas dépasser 20 Mo.');
  return extension==='pdf'?'pdf':'text';
}
export function decoderTexteAssistant(bytes){
  const data=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes);let encoding='UTF-8',text;
  if(data[0]===255&&data[1]===254){encoding='UTF-16 LE';text=new TextDecoder('utf-16le',{fatal:true}).decode(data);}
  else if(data[0]===254&&data[1]===255){encoding='UTF-16 BE';text=new TextDecoder('utf-16be',{fatal:true}).decode(data);}
  else try{text=new TextDecoder('utf-8',{fatal:true}).decode(data);}catch{encoding='Windows-1252';text=new TextDecoder('windows-1252').decode(data);}
  text=text.replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n').trim();
  if(!text||/[\u0000-\u0008\u000e-\u001f]/.test(text))throw new Error('Le fichier ne contient pas de texte exploitable.');
  if(text.length>ASSISTANT_MAX_EXTRACT)throw new Error('Le texte dépasse 200 000 caractères. Importe un extrait du document.');
  return {text,encoding};
}
export function textePagePDF(items){
  let text='',lastY=null,lastHeight=10;
  for(const item of items||[]){
    if(typeof item.str!=='string')continue;
    const y=item.transform?.[5],height=Math.abs(item.height||lastHeight);
    if(text&&!text.endsWith('\n')&&Number.isFinite(y)&&Number.isFinite(lastY)&&Math.abs(y-lastY)>Math.max(3,Math.max(height,lastHeight)*0.7))text+='\n';
    else if(text&&!/[\s]$/.test(text)&&item.str&&!/^\s/.test(item.str))text+=' ';
    text+=item.str;
    if(item.hasEOL&&!text.endsWith('\n'))text+='\n';
    if(Number.isFinite(y))lastY=y;lastHeight=height;
  }
  return text.replace(/(\d)\s*([,.])\s*(\d)/g,'$1$2$3').replace(/\bm\s+([²³])/g,'m$1').replace(/[ \t]+\n/g,'\n').trim();
}
export async function extrairePagesAssistant(pdf,{from=1,to=pdf.numPages,signal,onProgress=()=>{}}={}){
  if(!Number.isInteger(from)||!Number.isInteger(to)||from<1||to<from||to>pdf.numPages)throw new Error('Plage de pages invalide.');
  if(to-from+1>30)throw new Error('Extrais au maximum 30 pages à la fois, lot par lot.');
  let text='';const emptyPages=[];
  for(let pageNum=from;pageNum<=to;pageNum++){
    abortIfNeeded(signal);onProgress({page:pageNum,index:pageNum-from+1,total:to-from+1});
    const page=await pdf.getPage(pageNum);
    try{
      abortIfNeeded(signal);const content=await page.getTextContent();abortIfNeeded(signal);
      const part=textePagePDF(content.items);
      if(!part.trim())emptyPages.push(pageNum);
      else text+=(text?'\n\n':'')+'[Page '+pageNum+']\n'+part;
      if(text.length>ASSISTANT_MAX_EXTRACT)throw new Error('Extrait supérieur à 200 000 caractères. Réduis la plage de pages.');
    }finally{page.cleanup?.();}
  }
  if(!text.trim())throw new Error('Aucun texte sélectionnable dans ces pages. Ce PDF peut être un scan : applique un OCR puis réimporte-le.');
  return {text,emptyPages,from,to};
}
let pdfLibrary;
async function chargerPDF(){
  // Import variable : esbuild conserve le module PDF.js déjà hébergé sur le
  // site. Pas de CDN ni de seconde copie dans le bundle du copilote.
  const url='/vendor/pdfjs/pdf.min.mjs';
  return pdfLibrary ||= import(url).then(lib=>{lib.GlobalWorkerOptions.workerSrc='/vendor/pdfjs/pdf.worker.min.mjs';return lib;}).catch(e=>{pdfLibrary=null;throw e;});
}
export async function ouvrirDocumentAssistant(file,{signal,pdfjs}={}){
  const kind=verifierFichierAssistant(file);abortIfNeeded(signal);
  const bytes=new Uint8Array(await file.arrayBuffer());abortIfNeeded(signal);
  if(kind==='text'){
    const {text,encoding}=decoderTexteAssistant(bytes);
    return {kind,name:file.name.slice(0,250),pages:null,encoding,read:async()=>{abortIfNeeded(signal);return {text,emptyPages:[]};},dispose:async()=>{}};
  }
  if(!new TextDecoder('latin1').decode(bytes.subarray(0,1024)).includes('%PDF-'))throw new Error('Le fichier PDF est invalide ou endommagé.');
  const lib=pdfjs||await chargerPDF();abortIfNeeded(signal);
  const task=lib.getDocument({data:bytes,isEvalSupported:false,cMapUrl:'/vendor/pdfjs/cmaps/',cMapPacked:true,standardFontDataUrl:'/vendor/pdfjs/standard_fonts/'});
  let closed=false,password=false;
  const dispose=async()=>{if(closed)return;closed=true;signal?.removeEventListener('abort',onAbort);await task.destroy().catch(()=>{});};
  const onAbort=()=>{void dispose();};
  task.onPassword=()=>{password=true;void dispose();};
  signal?.addEventListener('abort',onAbort,{once:true});
  try{
    const pdf=await task.promise;abortIfNeeded(signal);
    return {kind,name:file.name.slice(0,250),pages:pdf.numPages,encoding:null,read:options=>{if(closed)throw new Error('Document fermé. Réimporte le fichier.');return extrairePagesAssistant(pdf,options);},dispose};
  }catch(error){await dispose();abortIfNeeded(signal);if(password||error.name==='PasswordException')throw new Error('PDF protégé par un mot de passe : importe une copie déverrouillée autorisée.');throw new Error('Impossible de lire ce PDF. Vérifie le fichier, puis réessaie.');}
}
export function fusionnerTexteAssistant(existing,incoming,mode='append'){
  if(typeof incoming!=='string'||!incoming.trim())throw new Error('Aucun texte à importer.');
  if(!['append','replace'].includes(mode))throw new Error('Choisis Ajouter ou Remplacer.');
  const text=mode==='replace'?incoming.trim():[String(existing||'').trim(),incoming.trim()].filter(Boolean).join('\n\n');
  if(text.length>ASSISTANT_MAX_TEXT)throw new Error('Le descriptif dépasserait 12 000 caractères. Réduis la plage de pages ou raccourcis le texte dans l’aperçu.');
  return text;
}
