import React, { useEffect, useRef, useState } from 'react';
import { FileText, Loader2, Upload } from 'lucide-react';
import { Modal } from './components.jsx';
import { ASSISTANT_MAX_TEXT } from '../public/assistant-metre.js';
import { ASSISTANT_MAX_EXTRACT, fusionnerTexteAssistant } from '../public/assistant-files.js';

export default function AssistantFileImport({document:doc,currentText,onClose,onApply}){
  const [from,setFrom]=useState('1'),[to,setTo]=useState(String(Math.min(doc.pages||1,5)));
  const [preview,setPreview]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[progress,setProgress]=useState(null),[extraction,setExtraction]=useState(null);
  const [mode,setMode]=useState(currentText.trim()?'append':'replace');
  const request=useRef(null),version=useRef(0);
  const cancel=()=>{version.current++;request.current?.abort();request.current=null;};
  const read=async()=>{
    cancel();const token=version.current,controller=new AbortController();request.current=controller;
    setBusy(true);setError('');setPreview('');setExtraction(null);
    try{
      const data=await doc.read({from:Number(from),to:Number(to),signal:controller.signal,onProgress:p=>{if(token===version.current)setProgress(p);}});
      if(token===version.current){setPreview(data.text);setExtraction(data);}
    }catch(e){if(token===version.current&&e.name!=='AbortError')setError(e.message||'Lecture impossible.');}
    finally{if(token===version.current){setBusy(false);request.current=null;setProgress(null);}}
  };
  useEffect(()=>{void read();return()=>cancel();},[doc]);
  const changePage=(setter,value)=>{cancel();setter(value);setPreview('');setExtraction(null);setError('');setBusy(false);};
  let merged='',mergeError='';try{merged=fusionnerTexteAssistant(currentText,preview,mode);}catch(e){mergeError=e.message;}
  const apply=()=>{
    if(busy||!extraction||mergeError)return;
    onApply({text:merged,mode,source:{name:doc.name,pages:doc.kind==='pdf'?`${extraction.from}–${extraction.to}`:null,modified:preview!==extraction.text}});
  };
  return <Modal title="Importer un descriptif" subtitle={doc.name+(doc.pages?' · '+doc.pages+' page(s)':' · '+doc.encoding)} onClose={onClose} wide>
    <div className="assistant-import-modal">
      <p className="assistant-import-info"><FileText size={17}/>Lecture dans ton navigateur. Le fichier original n’est pas envoyé au serveur.</p>
      {doc.kind==='pdf'&&<div className="assistant-page-controls"><label>Première page<input aria-label="Première page du PDF" type="number" min="1" max={doc.pages} step="1" value={from} onChange={e=>changePage(setFrom,e.target.value)}/></label><label>Dernière page<input aria-label="Dernière page du PDF" type="number" min="1" max={doc.pages} step="1" value={to} onChange={e=>changePage(setTo,e.target.value)}/></label><button className="ux-button" disabled={busy} onClick={read}>{busy?<Loader2 size={15} className="assistant-spin"/>:<FileText size={15}/>}Extraire ces pages</button></div>}
      {doc.kind==='pdf'&&<p className="assistant-muted">30 pages maximum par lecture. La sélection initiale couvre les pages 1 à {Math.min(doc.pages,5)} sur {doc.pages}.</p>}
      {busy&&<p role="status" className="assistant-import-progress"><Loader2 className="assistant-spin" size={16}/>{progress?'Lecture de la page '+progress.page+' ('+progress.index+'/'+progress.total+')…':'Lecture du document…'}</p>}
      {error&&<p className="assistant-error" role="alert">{error}</p>}
      {!!extraction?.emptyPages?.length&&<p className="assistant-import-warning">Aucun texte exploitable dans les pages {extraction.emptyPages.join(', ')}. Elles peuvent contenir des images : vérifie-les avec le document original.</p>}
      <label>Texte à importer <span>(modifiable avant validation)</span><textarea aria-label="Aperçu du texte à importer" rows={10} value={preview} maxLength={ASSISTANT_MAX_EXTRACT} disabled={busy||!extraction} onChange={e=>setPreview(e.target.value)}/></label>
      <fieldset className="assistant-import-mode"><legend>Dans le descriptif du copilote</legend><label><input type="radio" name="assistant-import-mode" value="append" checked={mode==='append'} onChange={()=>setMode('append')}/>Ajouter au texte existant</label><label><input type="radio" name="assistant-import-mode" value="replace" checked={mode==='replace'} onChange={()=>setMode('replace')}/>Remplacer le texte existant</label></fieldset>
      {extraction&&<p className={mergeError?'assistant-import-warning':'assistant-muted'}>{mergeError||`${merged.length.toLocaleString('fr-FR')} / ${ASSISTANT_MAX_TEXT.toLocaleString('fr-FR')} caractères après import.`}</p>}
      <div className="assistant-import-actions"><button className="ux-button" onClick={onClose}>Annuler l’import</button><button className="ux-button primary" data-tour="assistant-confirm-import" disabled={busy||!extraction||!!mergeError} onClick={apply}><Upload size={16}/>Utiliser ce texte</button></div>
    </div>
  </Modal>;
}
