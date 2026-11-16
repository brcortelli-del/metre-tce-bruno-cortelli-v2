import React, { useEffect, useRef, useState } from 'react';
import { Bot, FileText, Sparkles, PlusCircle, AlertTriangle, CheckCircle2, Loader2, Settings2, X, ArrowRight, Upload, FileCheck, PanelRightClose, PanelRightOpen, GripVertical } from 'lucide-react';
import { DEMO_MODE, preferenceStore } from '../public/demo-mode.js';
import { ASSISTANT_MAX_TEXT, ASSISTANT_UNITS, trouverDoublon } from '../public/assistant-metre.js';
import { analyserDepuisServeur } from '../public/assistant-client.js';
import { ouvrirDocumentAssistant } from '../public/assistant-files.js';
import AssistantFileImport from './AssistantFileImport.jsx';

function Poste({poste,index,rows,readOnly,onAjouter}) {
  const [draft,setDraft]=useState(()=>({...poste,quantite_estimee:poste.quantite_estimee===null?'':String(poste.quantite_estimee).replace('.',','),unite:poste.unite||'',localisation:''}));
  const [error,setError]=useState(''),[busy,setBusy]=useState(false);
  const duplicate=trouverDoublon(draft,rows), q=Number(String(draft.quantite_estimee).replace(/[ \u00a0\u202f]/g,'').replace(',','.'));
  const valid=draft.designation.trim()&&draft.lot.trim()&&draft.lot!=='À classer'&&ASSISTANT_UNITS.includes(draft.unite)&&q>0&&q<=1e7&&Number.isFinite(q)&&(!['u','forfait'].includes(draft.unite)||Number.isInteger(q));
  const update=(key,value)=>{setDraft(p=>({...p,[key]:value}));setError('');};
  const add=async()=>{if(busy)return;setBusy(true);setError('');try{await onAjouter({...draft,quantite_estimee:q});}catch(e){setError(e.message||'Ajout impossible.');}finally{setBusy(false);}};
  return <article className="assistant-poste" data-tour={'assistant-poste-'+index}>
    <div className="assistant-poste-head"><span>POSTE {String(index+1).padStart(2,'0')}</span><span>{poste.quantite_estimee===null?'À compléter':'Quantité lue dans le texte'}</span></div>
    <label>Lot<input aria-label={'Lot du poste '+(index+1)} value={draft.lot} maxLength={80} onChange={e=>update('lot',e.target.value)}/></label>
    <label>Désignation<textarea aria-label={'Désignation du poste '+(index+1)} rows={2} maxLength={200} value={draft.designation} onChange={e=>update('designation',e.target.value)}/></label>
    <details className="assistant-source"><summary>Voir l’extrait source</summary><blockquote>{poste.extrait_source}</blockquote><p>{poste.justification}</p></details>
    <div className="assistant-quantity"><label>Quantité<input aria-label={'Quantité du poste '+(index+1)} inputMode="decimal" placeholder="À préciser" maxLength={30} value={draft.quantite_estimee} onChange={e=>update('quantite_estimee',e.target.value)}/></label><label>Unité<select aria-label={'Unité du poste '+(index+1)} value={draft.unite} onChange={e=>update('unite',e.target.value)}><option value="">À préciser</option>{ASSISTANT_UNITS.map(u=><option key={u} value={u}>{u==='forfait'?'Ens. / forfait':u==='m'?'ml':u==='u'?'U':u}</option>)}</select></label></div>
    <label>Localisation <span className="assistant-optional">(facultatif)</span><input aria-label={'Localisation du poste '+(index+1)} placeholder="Bâtiment, niveau, pièce…" maxLength={200} value={draft.localisation} onChange={e=>update('localisation',e.target.value)}/></label>
    {duplicate&&<p className="assistant-duplicate"><CheckCircle2 size={14}/>Déjà dans la minute pour cette localisation.</p>}
    {!valid&&!duplicate&&<p className="assistant-muted">Précise un lot, une unité et une quantité positive. Les comptages sont entiers.</p>}
    {error&&<p className="assistant-error" role="alert">{error}</p>}
    <button className="ux-button primary" data-tour={'assistant-add-'+index} disabled={!valid||!!duplicate||readOnly||busy} onClick={add}>{busy?<Loader2 className="assistant-spin" size={15}/>:duplicate?<CheckCircle2 size={15}/>:<PlusCircle size={15}/>} {duplicate?'Déjà dans la minute':'Valider et ajouter à la minute'}</button>
  </article>;
}

export default function AssistantMetreIA({bridge,lignesMetreActuelles=[],onAjouterLigne,ouvert,onOuvrir,onFermer}) {
  const [internalOpen,setInternalOpen]=useState(true);
  const visible=ouvert??internalOpen;
  const [present,setPresent]=useState(visible),[minimised,setMinimised]=useState(false);
  const [panelWidth,setPanelWidth]=useState(()=>{try{return Math.max(360,Math.min(680,Number(preferenceStore.getItem('atelier-copilot-width'))||424));}catch{return 424;}});
  const resizing=useRef(null);
  const resizeWidth=value=>setPanelWidth(Math.max(360,Math.min(680,window.innerWidth-24,value)));
  useEffect(()=>{if(visible){setPresent(true);setMinimised(false);return;}const timer=setTimeout(()=>setPresent(false),220);return()=>clearTimeout(timer);},[visible]);
  useEffect(()=>{
    document.body.classList.toggle('assistant-expanded',visible&&!minimised);
    document.documentElement.style.setProperty('--copilot-width',panelWidth+'px');
    return()=>document.body.classList.remove('assistant-expanded');
  },[visible,minimised,panelWidth]);
  useEffect(()=>{const timer=setTimeout(()=>{try{preferenceStore.setItem('atelier-copilot-width',String(panelWidth));}catch{}},200);return()=>clearTimeout(timer);},[panelWidth]);
  const close=()=>{discardImport();setInternalOpen(false);onFermer?.();};
  const [project,setProject]=useState(()=>bridge?.get()||null),[readOnly,setReadOnly]=useState(()=>bridge?.readOnly()||false);
  const [texte,setTexte]=useState(''),[loading,setLoading]=useState(false),[resultat,setResultat]=useState(null),[error,setError]=useState(''),[notice,setNotice]=useState('');
  const [options,setOptions]=useState(false),[modeAnalyse,setModeAnalyse]=useState('auto'),[capability,setCapability]=useState(null);
  const panel=useRef(null),request=useRef(null),version=useRef(0),analysis=useRef(0);
  const [readingFile,setReadingFile]=useState(false),[importDoc,setImportDoc]=useState(null),[documentSources,setDocumentSources]=useState([]),[dragging,setDragging]=useState(false);
  const fileRef=useRef(null),importRequest=useRef(null),importVersion=useRef(0),documentRef=useRef(null);
  const discardImport=()=>{importVersion.current++;importRequest.current?.abort();importRequest.current=null;void documentRef.current?.dispose();documentRef.current=null;setImportDoc(null);setReadingFile(false);};
  const rows=bridge?project?.rows||[]:lignesMetreActuelles;
  const cancel=()=>{version.current++;request.current?.abort();request.current=null;setLoading(false);};
  useEffect(()=>{
    if(!bridge)return;
    const sync=()=>{setProject(bridge.get());setReadOnly(bridge.readOnly());};
    const reset=e=>{if(e.detail?.reset){cancel();discardImport();setDocumentSources([]);setResultat(null);setTexte('');setNotice('Contexte mis à jour : relance l’analyse.');}};
    document.addEventListener('atelier:meta',sync);document.addEventListener('atelier:project',reset);
    return()=>{document.removeEventListener('atelier:meta',sync);document.removeEventListener('atelier:project',reset);};
  },[bridge]);
  useEffect(()=>()=>{version.current++;request.current?.abort();importVersion.current++;importRequest.current?.abort();void documentRef.current?.dispose();},[]);
  useEffect(()=>{
    if(!visible)return;
    const previous=document.activeElement;
    const escape=e=>{if(e.key==='Escape'&&panel.current?.contains(e.target)&&!e.target.closest('dialog[open]')){e.preventDefault();e.stopPropagation();discardImport();setInternalOpen(false);onFermer?.();}};
    document.addEventListener('keydown',escape,true);
    panel.current?.querySelector('textarea')?.focus();
    return()=>{document.removeEventListener('keydown',escape,true);if(previous?.isConnected)previous.focus();};
  },[visible,onFermer]);
  useEffect(()=>{
    if(!options)return;
    const controller=new AbortController();
    fetch('/api/analyse-metre',{credentials:'same-origin',cache:'no-store',signal:controller.signal}).then(async r=>r.ok?await r.json():{configured:false}).then(data=>setCapability(data)).catch(e=>{if(e.name!=='AbortError')setCapability({configured:false});});
    return()=>controller.abort();
  },[options]);
  const alerts=resultat?.alertes_coherence||[];
  const changerMode=mode=>{cancel();setModeAnalyse(mode);setResultat(null);setError('');setNotice('');};
  const changeText=(value,sources=[])=>{cancel();setTexte(value);setDocumentSources(sources);setResultat(null);setError('');setNotice('');};
  const chooseFiles=async files=>{
    if(files.length!==1){setError('Importe un seul fichier à la fois.');return;}
    discardImport();cancel();const token=importVersion.current,controller=new AbortController();importRequest.current=controller;setError('');setReadingFile(true);
    try{const doc=await ouvrirDocumentAssistant(files[0],{signal:controller.signal});if(token!==importVersion.current){await doc.dispose();return;}documentRef.current=doc;setImportDoc(doc);}
    catch(e){if(token===importVersion.current&&e.name!=='AbortError')setError(e.message||'Import impossible.');}
    finally{if(token===importVersion.current)setReadingFile(false);}
  };
  const applyImport=({text,mode,source})=>{const sources=mode==='append'?[...documentSources,source]:[source];if(sources.length>10){setError('Maximum 10 fichiers de contexte : remplace le descriptif pour commencer un autre lot.');discardImport();return;}changeText(text,sources);setNotice('Texte importé. Vérifie la transcription avec le document original avant l’analyse.');discardImport();};
  const drop=e=>{const files=Array.from(e.dataTransfer.files||[]);if(!files.length)return;e.preventDefault();setDragging(false);void chooseFiles(files);};
  const analyse=async()=>{
    cancel();const token=version.current;setLoading(true);setError('');setNotice('');setResultat(null);
    try{
      const controller=new AbortController();request.current=controller;
      const data=await analyserDepuisServeur({texte,lignes:rows,country:project?.country,mode:modeAnalyse,demo:DEMO_MODE,signal:controller.signal});
      if(token===version.current)setResultat({...data,id:++analysis.current});
    }catch(e){if(token===version.current&&e.name!=='AbortError')setError(e.message||'Analyse impossible.');}
    finally{if(token===version.current){setLoading(false);request.current=null;}}
  };
  const add=async poste=>{
    const payload={...poste,moteur:resultat?.moteur,execution:'serveur',documents_source:documentSources};
    if(bridge)bridge.addAssistantPost(payload);
    else if(onAjouterLigne)await onAjouterLigne(payload);
    else throw new Error('L’ajout doit être relié à la feuille de minute.');
    setNotice('Poste ajouté. La quantité et l’extrait source sont conservés dans la minute.');
  };
  if(!visible&&!present)return <button className="assistant-launch" data-tour="assistant-open" onClick={()=>{setMinimised(false);setInternalOpen(true);onOuvrir?.();}}><Bot size={20}/><span>Copilote Métré</span><kbd>IA</kbd></button>;
  return <aside ref={panel} className={'assistant-panel'+(minimised?' is-minimised':'')} style={{'--assistant-width':panelWidth+'px'}} data-open={visible} inert={!visible||undefined} aria-labelledby="assistant-title" data-tour="assistant-panel">
    <div className="assistant-resize" role="separator" aria-label="Redimensionner le Copilote" aria-orientation="vertical" aria-valuemin={360} aria-valuemax={680} aria-valuenow={panelWidth} tabIndex={minimised?-1:0}
      onPointerDown={e=>{if(e.button!==0)return;e.preventDefault();resizing.current={x:e.clientX,width:panelWidth};e.currentTarget.setPointerCapture(e.pointerId);}}
      onPointerMove={e=>{if(resizing.current)resizeWidth(resizing.current.width+resizing.current.x-e.clientX);}}
      onPointerUp={e=>{resizing.current=null;if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);}}
      onPointerCancel={()=>{resizing.current=null;}}
      onKeyDown={e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();resizeWidth(e.key==='Home'?360:e.key==='End'?680:panelWidth+(e.key==='ArrowLeft'?24:-24));}}}><GripVertical size={16}/></div>
    <header className="assistant-heading"><div className="assistant-avatar"><Bot size={23}/></div><div><h2 id="assistant-title">Copilote Métré TCE</h2><p>Du descriptif aux ouvrages</p></div><button className="ux-icon-button assistant-collapse" aria-label={minimised?'Déployer le Copilote':'Replier le Copilote'} title={minimised?'Déployer le Copilote':'Replier le Copilote'} aria-expanded={!minimised} onClick={()=>setMinimised(v=>!v)}>{minimised?<PanelRightOpen size={16}/>:<PanelRightClose size={16}/>}</button><button className="ux-icon-button assistant-settings" aria-label="Options de l’assistant" aria-expanded={options} onClick={()=>setOptions(o=>!o)}><Settings2 size={18}/></button><button className="ux-icon-button" aria-label="Fermer l’assistant" onClick={close}><X size={18}/></button></header>
    <div className="assistant-scroll" hidden={minimised}>
      {options&&<section className="assistant-options"><h3>Analyse sur le serveur sécurisé</h3><p>Connexion du propriétaire requise dans les deux modes. Le texte et au plus 500 désignations sont transmis au serveur, sans les prix, marges ni fichiers de plans.</p><p>{capability?.configured?'Une clé OpenAI est configurée sur le serveur. Auto peut utiliser l’API facturée.':capability?'OpenAI n’est pas disponible pour cette session. Sans clé configurée, Auto utilise l’analyse locale serveur.':'Vérification de la configuration…'} Aucune clé n’est demandée dans le navigateur.</p><p>Si OpenAI échoue, le serveur utilise le moteur local et le signale. Une panne du serveur ou une connexion manquante est affichée comme une erreur.</p></section>}
      <div className="assistant-mode" data-engine={resultat?.moteur||'ready'}><span className="status-dot"/>{resultat?.moteur_utilise||(modeAnalyse==='auto'?'Prêt · Auto (serveur)':'Prêt · Local rapide (serveur)')}<span>{rows.length} lignes dans la minute</span></div>
      <div className={'assistant-input assistant-dropzone'+(dragging?' dragging':'')} onDragOver={e=>{if(Array.from(e.dataTransfer.types||[]).includes('Files')){e.preventDefault();setDragging(true);}}} onDragLeave={e=>{if(!e.currentTarget.contains(e.relatedTarget))setDragging(false);}} onDrop={drop} data-tour="assistant-dropzone">
        <label htmlFor="assistant-texte"><FileText size={16}/>Énoncé client ou extrait CCTP</label>
        <input ref={fileRef} type="file" accept=".pdf,.txt,.md,.csv" hidden onChange={e=>{const files=Array.from(e.target.files||[]);e.target.value='';if(files.length)void chooseFiles(files);}}/>
        <button className="ux-button assistant-import-button" data-tour="assistant-import" disabled={readingFile} onClick={()=>fileRef.current?.click()}>{readingFile?<Loader2 size={16} className="assistant-spin"/>:<Upload size={16}/>} {readingFile?'Ouverture du fichier…':'Importer PDF / TXT / MD / CSV'}</button>
        <p className="assistant-drop-hint">Ou glisse un fichier ici · 20 Mo maximum · aperçu avant import.</p>
        {readingFile&&<button className="assistant-cancel" onClick={discardImport}>Annuler l’ouverture</button>}
        {!!documentSources.length&&<div className="assistant-file-list">{documentSources.map((source,i)=><p key={i}><FileCheck size={14}/><span>{source.name}{source.pages?' · p. '+source.pages:''}{source.modified?' · texte modifié':''}</span></p>)}<button onClick={()=>changeText('')}>Effacer le descriptif importé</button></div>}
        <textarea id="assistant-texte" data-tour="assistant-text" rows={6} maxLength={ASSISTANT_MAX_TEXT} placeholder="Glisse un CCTP PDF ici ou colle le descriptif client…" value={texte} disabled={readingFile} onChange={e=>changeText(e.target.value,documentSources.map(s=>({...s,modified:true})))}/>
        <div className="assistant-input-foot"><button disabled={readingFile} onClick={()=>changeText('Création de 42,5 m² de cloisons hydrofuges et pose de 3 blocs-portes.')}>Charger un exemple</button><span>{texte.length.toLocaleString('fr-FR')} / 12 000</span></div>
        <div className="assistant-engine-control" role="group" aria-label="Moteur d’analyse"><span>Moteur</span><div><button type="button" data-tour="assistant-mode-auto" aria-pressed={modeAnalyse==='auto'} onClick={()=>changerMode('auto')}>Auto · IA si disponible</button><button type="button" data-tour="assistant-mode-local" aria-pressed={modeAnalyse==='local'} onClick={()=>changerMode('local')}>Local rapide</button></div></div>
        <p className="assistant-engine-info">{DEMO_MODE?'Démo : analyse locale sur le serveur ; les ajouts au chantier restent temporaires.':modeAnalyse==='local'?'Texte et désignations envoyés au serveur. Aucun appel OpenAI.':'OpenAI si une clé serveur est configurée, sinon extraction locale serveur. API facturée si utilisée.'}</p>
        <button className="ux-button primary assistant-analyse" data-tour="assistant-analyse" disabled={loading||readingFile||!texte.trim()} onClick={analyse}>{loading?<Loader2 size={17} className="assistant-spin"/>:<Sparkles size={17}/>} {loading?'Analyse sur le serveur…':'Analyser & extraire les postes'}</button>{loading&&<button className="assistant-cancel" onClick={cancel}>Annuler l’analyse</button>}
      </div>
      {error&&<p role="alert" className="assistant-error">{error}</p>}
      {resultat?.fallback_reason&&<p className="assistant-fallback" role="status">{resultat.fallback_reason==='cle_absente'?'Clé OpenAI absente : le serveur a utilisé son moteur local.':resultat.fallback_reason==='demo'?'Démonstration : moteur local serveur utilisé, sans consommation OpenAI.':'OpenAI indisponible ou réponse inutilisable : bascule vers le moteur local serveur.'}</p>}
      <p className="assistant-notice" role="status">{notice||'Vérifie chaque proposition avant ajout. Une cote isolée ne suffit pas à calculer un ouvrage ; aucune norme n’est vérifiée par ce module.'}</p>
      {readOnly&&<p className="assistant-notice">Projet en consultation : analyse possible, ajout à la minute verrouillé.</p>}
      {resultat?<>
        {!!alerts.length&&<section className="assistant-alerts"><h3><AlertTriangle size={16}/>Points à vérifier ({alerts.length})</h3><ul>{alerts.map((a,i)=><li key={i}>{a}</li>)}</ul></section>}
        <div className="assistant-result-heading"><h3>Postes extraits <span>{resultat.postes_detectes.length}</span></h3><span>{resultat.moteur_utilise}</span></div>
        {resultat.postes_detectes.map((p,i)=><Poste key={resultat.id+':'+p.key} poste={p} index={i} rows={rows} readOnly={readOnly} onAjouter={add}/>)}
        {!resultat.postes_detectes.length&&<div className="assistant-empty"><FileText size={30}/><h3>Aucun poste reconnu</h3><p>Essaie une désignation d’ouvrage et une quantité avec son unité, ou ajoute la ligne directement dans la minute.</p></div>}
      </>:<div className="assistant-empty"><Bot size={34}/><h3>Du texte à ta feuille de minute</h3><p>Colle ton descriptif. Relis les postes proposés, complète les quantités manquantes, puis valide chaque ajout.</p><span>Aucun ouvrage de démonstration ajouté automatiquement.</span></div>}
    </div>
    <footer className="assistant-footer" hidden={minimised}><button className="ux-button" onClick={()=>{bridge?.showView('minute');close();}}>Ouvrir la minute<ArrowRight size={15}/></button><span>{DEMO_MODE?'Démo · ajouts temporaires':'Ajouts annulables avec Ctrl Z'}</span></footer>
    {importDoc&&<AssistantFileImport document={importDoc} currentText={texte} onClose={discardImport} onApply={applyImport}/>}
  </aside>;
}
