import { chapterVideoAsset } from '../public/tutorial-media.js';
import { DEMO_MODE, preferenceStore } from '../public/demo-mode.js';
import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { ArrowLeft, ArrowRight, BookOpen, Check, CheckCircle2, ChevronDown, Compass, FileText, Film, GraduationCap, Lightbulb, ListVideo, Play, Ruler, Search, SlidersHorizontal, Upload, X, Banknote } from 'lucide-react';
import { Modal } from './components.jsx';
import { TUTORIAL_PROGRAMME, TUTORIAL_SECTIONS, formatTutorialTime, parseTutorialTime, validateTutorialTimings, timedTutorialSections, tutorialSectionAtTime, tutorialCanSeek, validateTutorialFile, restoreTutorialProgress } from './tutorial-model.js';

const STORAGE_KEY='atelier-tutorial-progress-v1';
const icons={compass:Compass,ruler:Ruler,file:FileText,money:Banknote,graduation:GraduationCap};
// Une File/Blob URL est lue en flux par le navigateur, sans base64, sans copie
// dans le projet, et sans upload. Elle reste disponible pendant cet onglet.
let sessionAsset=null;
function loadProgress(){try{return restoreTutorialProgress(preferenceStore.getItem(STORAGE_KEY));}catch{return restoreTutorialProgress(null);}}

const VideoReadout=memo(function VideoReadout({videoRef,assetId}){
  const [time,setTime]=useState({current:0,duration:0});
  useEffect(()=>{
    const video=videoRef.current;if(!video)return;
    const update=()=>setTime({current:video.currentTime,duration:video.duration});
    for(const name of ['timeupdate','loadedmetadata','durationchange','seeked'])video.addEventListener(name,update);
    update();return()=>{for(const name of ['timeupdate','loadedmetadata','durationchange','seeked'])video.removeEventListener(name,update);};
  },[videoRef,assetId]);
  return <span className="tutorial-time" aria-label="Position de lecture">{formatTutorialTime(time.current)} / {Number.isFinite(time.duration)&&time.duration>0?formatTutorialTime(time.duration):'—'}</span>;
});

function TimingsEditor({sections,duration,onApply,onClose}){
  const [values,setValues]=useState(()=>Object.fromEntries(sections.map(s=>[s.id,formatTutorialTime(s.start)]))),[error,setError]=useState('');
  return <Modal title="Adapter les repères à ta vidéo" subtitle="Les temps proposés sont ceux du programme, pas des positions vérifiées dans un film fourni." onClose={onClose} wide><div className="tutorial-timing-editor">
    <p>Premier repère : 00:00. Les autres doivent être strictement croissants. Formats : mm:ss ou hh:mm:ss.{Number.isFinite(duration)&&duration>0?' Durée du fichier : '+formatTutorialTime(duration)+'.':''}</p>
    <div className="tutorial-timing-list">{sections.map((s,i)=><label key={s.id}><span><small>{i+1} · {s.chapterTitle}</small>{s.title}</span><input aria-label={'Début · '+s.title} value={values[s.id]} onChange={e=>setValues({...values,[s.id]:e.target.value})} inputMode="text" maxLength={8}/></label>)}</div>
    {error&&<p className="tutorial-error" role="alert">{error}</p>}
    <div className="tutorial-toolbar"><button className="ux-button" onClick={()=>{setValues(Object.fromEntries(TUTORIAL_SECTIONS.map(s=>[s.id,formatTutorialTime(s.start)])));setError('');}}>Repères du programme</button><button className="ux-button primary" onClick={()=>{try{const starts=validateTutorialTimings(Object.fromEntries(Object.entries(values).map(([id,value])=>[id,parseTutorialTime(value)])),{duration});onApply(starts);onClose();}catch(e){setError(e.message);}}}>Enregistrer les repères</button></div>
  </div></Modal>;
}

export default function TutorielVideoSite({urlVideo=null,onFermer,onNavigate}){
  const videoRef=useRef(null),fileRef=useRef(null),pendingSeek=useRef(null),playRequest=useRef(0);
  const [progress,setProgress]=useState(loadProgress),progressRef=useRef(progress);
  const [asset,setAsset]=useState(()=>sessionAsset||(urlVideo?{id:'hosted',url:urlVideo,name:'Vidéo du tutoriel',kind:'hosted',position:0}:chapterVideoAsset(progress.selectedId)));
  const [mode,setMode]=useState('video'),[duration,setDuration]=useState(null),[speed,setSpeed]=useState(1);
  const [opened,setOpened]=useState(()=>({'chap-1':true,'chap-2':true,[TUTORIAL_SECTIONS.find(s=>s.id===progress.selectedId)?.chapterId||'chap-1']:true})),[query,setQuery]=useState(''),[message,setMessage]=useState(''),[mediaError,setMediaError]=useState('');
  const [editing,setEditing]=useState(false),[showCorrection,setShowCorrection]=useState(false),[storageError,setStorageError]=useState(false);
  const sections=useMemo(()=>timedTutorialSections(progress.starts),[progress.starts]);
  const active=sections.find(s=>s.id===progress.selectedId)||sections[0],activeIndex=sections.findIndex(s=>s.id===active.id);
  const selectedEnd=sections[activeIndex+1]?.start??(Number.isFinite(duration)&&duration>active.start?duration:active.start+active.duration);
  const matches=useMemo(()=>{const search=query.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase().trim();return new Set(sections.filter(s=>!search||[s.title,s.summary,s.chapterTitle].join(' ').normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase().includes(search)).map(s=>s.id));},[query,sections]);
  useEffect(()=>{progressRef.current=progress;try{preferenceStore.setItem(STORAGE_KEY,JSON.stringify({version:1,...progress}));setStorageError(false);}catch{setStorageError(true);}},[progress]);
  useEffect(()=>()=>{videoRef.current?.pause();},[]);
  const play=(video=videoRef.current)=>{
    if(!video)return;
    const token=++playRequest.current;
    // Appelé dans le clic utilisateur, pas après une vérification réseau.
    try {
      const request=video.play();
      request?.catch(error=>{
        if(token!==playRequest.current||error.name==='AbortError')return;
        if(error.name==='NotAllowedError')setMessage('Appuie sur Lecture dans le lecteur pour démarrer la vidéo.');
      });
    } catch(error) {if(error.name==='NotAllowedError')setMessage('Appuie sur Lecture dans le lecteur pour démarrer la vidéo.');}
  };
  const loadChapter=(section)=>{
    const next=chapterVideoAsset(section.id);if(!next)return;
    const same=asset?.id===next.id;
    ++playRequest.current;videoRef.current?.pause();pendingSeek.current=null;
    // Le nouveau src doit être monté avant play(), tout en conservant le clic
    // comme geste de lecture autorisé par le navigateur.
    flushSync(()=>{setAsset(next);setMode('video');setMediaError('');setMessage('');if(!same)setDuration(null);});
    const video=videoRef.current;if(!video)return;
    video.playbackRate=speed;
    if(video.error)video.load();
    else if(same&&video.readyState>=1)video.currentTime=0;
    play(video);
  };
  const select=(section)=>{
    setProgress(previous=>({...previous,selectedId:section.id}));
    setOpened(previous=>({...previous,[section.chapterId]:true}));
    loadChapter(section);
  };
  const seekPersonal=(section,{forceVideo=false}={})=>{
    setProgress(previous=>({...previous,selectedId:section.id}));setOpened(previous=>({...previous,[section.chapterId]:true}));setMessage('');
    if(!asset||asset.kind==='chapter'){loadChapter(section);return;}
    if(asset&&(forceVideo||mode==='video')&&!mediaError){
      // Les métadonnées peuvent être prêtes avant le prochain rendu React.
      const seekDuration=videoRef.current?.readyState>=1?videoRef.current.duration:duration;
      if(seekDuration===null){pendingSeek.current={time:section.start,play:true};setMode('video');setMessage('Chargement des informations de la vidéo…');return;}
      if(!tutorialCanSeek(section,seekDuration)){setMode('fiche');videoRef.current?.pause();setMessage('Ce repère dépasse la durée du fichier. La fiche reste disponible ; adapte les repères à ta vidéo.');return;}
      setMode('video');const video=videoRef.current;if(video){video.currentTime=section.start;play();}
    }
  };
  const chooseFile=event=>{
    const file=event.target.files?.[0];if(!file)return;
    try{
      validateTutorialFile(file);playRequest.current++;videoRef.current?.pause();
      const next={id:crypto.randomUUID(),url:URL.createObjectURL(file),name:file.name,kind:'local',position:0};
      if(sessionAsset?.kind==='local')URL.revokeObjectURL(sessionAsset.url);
      sessionAsset=next;setAsset(next);setDuration(null);setMediaError('');setMessage('');setMode('video');pendingSeek.current={time:0,play:false};setProgress(p=>({...p,selectedId:sections[0].id}));
    }catch(e){setMessage(e.message);}finally{event.target.value='';}
  };
  const removeFile=()=>{playRequest.current++;videoRef.current?.pause();if(sessionAsset?.kind==='local')URL.revokeObjectURL(sessionAsset.url);sessionAsset=null;setAsset(chapterVideoAsset(active.id));setDuration(null);setMediaError('');setMode('fiche');pendingSeek.current=null;setMessage('La vidéo est retirée du lecteur. Le fichier d’origine est conservé sur ton appareil.');};
  const metadata=()=>{
    const video=videoRef.current;if(!video)return;
    if(!Number.isFinite(video.duration)||video.duration<=0){setMediaError('La durée de cette vidéo n’est pas disponible. Choisis un fichier vidéo lisible.');setMode('fiche');return;}
    setDuration(video.duration);video.playbackRate=speed;
    if(asset?.kind==='chapter')return;
    const pending=pendingSeek.current;pendingSeek.current=null;
    const target=asset?.kind==='chapter'?0:pending?.time??asset?.position??0;
    if(target<video.duration){video.currentTime=target;if(pending?.play)play();}
    else{setMode('fiche');setMessage('Le repère demandé est hors de la durée du fichier. Adapte les repères ou utilise les fiches.');}
  };
  const updateFromVideo=()=>{
    const video=videoRef.current;if(!video)return;
    if(asset)asset.position=video.currentTime;
    if(mode!=='video'||asset?.kind==='chapter')return;
    const next=tutorialSectionAtTime(sections,video.currentTime);
    // Les timeupdate ne redessinent pas le sommaire à chaque frame. Le compteur
    // a son propre état ; ce parent change seulement à une frontière de séquence.
    if(progressRef.current.selectedId!==next.id){setProgress(p=>p.selectedId===next.id?p:{...p,selectedId:next.id});setOpened(p=>({...p,[next.chapterId]:true}));}
  };
  const toggleComplete=()=>setProgress(p=>({...p,completed:p.completed.includes(active.id)?p.completed.filter(id=>id!==active.id):[...p.completed,active.id]}));
  return <section className="tutorial-app" aria-labelledby="tutorial-title">
    <header className="tutorial-hero"><div><span className="tutorial-eyebrow"><Film size={16}/> APPRENDRE À TON RYTHME</span><h1 id="tutorial-title">Tutoriel vidéo & parcours guidé</h1><p>5 chapitres · 12 séquences · une capsule vidéo par séquence.</p></div><button className="ux-button" onClick={onFermer}><ArrowLeft size={16}/>Retour à mon chantier</button></header>
    <div className="tutorial-layout"><div className="tutorial-main">
      <div className="tutorial-source-bar"><div className="tutorial-mode" aria-label="Mode de formation"><button aria-pressed={mode==='fiche'} onClick={()=>{videoRef.current?.pause();setMode('fiche');}}><BookOpen size={16}/>Fiches illustrées</button><button aria-pressed={mode==='video'} disabled={!asset||!!mediaError} onClick={()=>seekPersonal(active,{forceVideo:true})}><Play size={16}/>{asset?.kind==='chapter'?'Vidéo de la séquence':'Ma vidéo'}</button></div><button className="ux-button" data-tour="tutorial-play-chapter" onClick={()=>loadChapter(active)}><Play size={16}/>Lire depuis le début</button><input ref={fileRef} type="file" accept=".mp4,.webm,.m4v,.mov" hidden onChange={chooseFile}/><button className="ux-button primary" onClick={()=>fileRef.current?.click()}><Upload size={16}/>{asset?'Changer de vidéo':'Choisir une vidéo'}</button></div>

      {asset&&<div className="tutorial-file"><span><Film size={15}/>{asset.name}<small>{asset.kind==='local'?'Fichier local · à sélectionner de nouveau après actualisation':asset.kind==='chapter'?'Capsule du site · voix de synthèse':'Vidéo hébergée'}</small></span><button className="ux-icon-button" aria-label="Retirer la vidéo du lecteur" onClick={removeFile}><X size={16}/></button></div>}
      {asset&&<div className={'tutorial-video'+(mode!=='video'?' tutorial-video-hidden':'')}><video key={asset.id} ref={videoRef} src={asset.url} controls preload="auto" playsInline poster={active.image} onLoadedMetadata={metadata} onTimeUpdate={updateFromVideo} onSeeked={updateFromVideo} onError={()=>{setMediaError(asset.kind==='chapter'?'Impossible de lire '+asset.name+'. Vérifie le fichier et les codecs, puis relance la lecture.':'Le navigateur ne peut pas lire ce fichier. Vérifie son format et ses codecs, puis choisis une autre vidéo. Les fiches restent accessibles.');}}>{asset.captions&&<track key={asset.id} kind="captions" src={asset.captions} srcLang="fr" label="Français"/>}La lecture HTML5 n’est pas disponible dans ce navigateur.</video></div>}
      {mode==='fiche'&&<figure className="tutorial-illustration"><img src={active.image} alt={'Repère visuel du manuel : '+active.title}/><figcaption><BookOpen size={15}/>Fiche illustrée · image du manuel, sans enregistrement vidéo</figcaption></figure>}
      {mediaError&&<p className="tutorial-error" role="alert">{mediaError}</p>}
      {message&&<p className="tutorial-message" role="status">{message}</p>}
      {asset&&<div className="tutorial-player-options"><VideoReadout videoRef={videoRef} assetId={asset.id}/><label>Vitesse<select aria-label="Vitesse de lecture" value={speed} onChange={e=>{const value=Number(e.target.value);setSpeed(value);if(videoRef.current)videoRef.current.playbackRate=value;}}>{[.75,1,1.25,1.5,2].map(rate=><option key={rate} value={rate}>{rate}×</option>)}</select></label>{asset.kind!=='chapter'&&<button className="ux-button" onClick={()=>setEditing(true)}><SlidersHorizontal size={15}/>Adapter les repères</button>}</div>}
      <article className="tutorial-memo" aria-label="Fiche mémo de la séquence"><div className="tutorial-memo-heading"><div><span className="tutorial-eyebrow">SÉQUENCE {activeIndex+1} / {sections.length}</span><h2>{active.title}</h2><p>{active.summary}</p></div><span className="tutorial-stamp">{asset?.kind==='chapter'?formatTutorialTime(duration||0):formatTutorialTime(active.start)}<small>{asset?.kind==='chapter'?'durée de la capsule':'repère de ton film complet'}</small></span></div><ol>{active.steps.map(step=><li key={step}>{step}</li>)}</ol><aside className="tutorial-tip"><Lightbulb size={19}/><div><strong>Astuce de métré</strong><p>{active.tip}</p></div></aside>
        {active.correction&&<div className="tutorial-correction"><p>Réalise le sujet avant de consulter les résultats. Une vidéo personnelle peut contenir sa propre correction ; le bouton ci-dessous protège seulement ces fiches.</p><button className="ux-button" aria-expanded={showCorrection} onClick={()=>setShowCorrection(!showCorrection)}>{showCorrection?'Masquer les résultats du cas':'Afficher les résultats du cas'}</button>{showCorrection&&<ul>{active.correction.map(text=><li key={text}>{text}</li>)}</ul>}</div>}
        <div className="tutorial-toolbar"><button className="ux-button" onClick={()=>onNavigate?.(active.view)}>{active.view==='manual'?'Ouvrir le manuel et l’exercice':'Pratiquer dans l’atelier'}<ArrowRight size={15}/></button><button className={'ux-button '+(progress.completed.includes(active.id)?'':'primary')} aria-pressed={progress.completed.includes(active.id)} onClick={toggleComplete}><CheckCircle2 size={16}/>{progress.completed.includes(active.id)?'Séquence terminée':'Marquer comme terminée'}</button></div>
      </article>
      <div className="tutorial-pagination"><button className="ux-button" disabled={activeIndex===0} onClick={()=>select(sections[activeIndex-1])}><ArrowLeft size={16}/>Précédent</button><span>{asset?.kind==='local'?<>Repère prévu : {formatTutorialTime(active.start)} – {formatTutorialTime(selectedEnd)}</>:<>Séquence {activeIndex+1} / 12</>}</span><button className="ux-button primary" disabled={activeIndex===sections.length-1} onClick={()=>select(sections[activeIndex+1])}>Suivant<ArrowRight size={16}/></button></div>
      <p className="tutorial-footnote">Les capsules du site démarrent chacune à zéro. Les repères du programme concernent seulement un éventuel film complet personnel. Les fiches suivent le site actuel : TVA conservée, DOCX réel, règles de métré par profil et audit indicatif. Consulter ce parcours ne modifie pas le chantier.</p>
    </div><aside className="tutorial-index" aria-label="Sommaire de la formation"><div className="tutorial-index-heading"><ListVideo size={20}/><div><h2>Ton parcours</h2><p>{progress.completed.length} / {sections.length} séquences terminées</p></div></div><progress value={progress.completed.length} max={sections.length} aria-label="Progression des séquences"/><label className="tutorial-search"><Search size={16}/><input aria-label="Rechercher une séquence" placeholder="Plan, CCTP, colisage…" value={query} onChange={e=>setQuery(e.target.value)}/></label>
      <nav>{TUTORIAL_PROGRAMME.map((chapter,index)=>{
        const own=sections.filter(s=>s.chapterId===chapter.id&&matches.has(s.id));if(!own.length)return null;
        const Icon=icons[chapter.icon]||BookOpen,isOpen=!!opened[chapter.id]||!!query;
        return <section className="tutorial-chapter" key={chapter.id}><button className="tutorial-chapter-button" aria-expanded={isOpen} aria-controls={'tutorial-'+chapter.id} onClick={()=>setOpened(p=>({...p,[chapter.id]:!isOpen}))}><Icon size={18}/><span>{index+1}. {chapter.title}</span><ChevronDown size={16} className={isOpen?'open':''}/></button>{isOpen&&<div id={'tutorial-'+chapter.id}>{own.map(section=><button key={section.id} data-tour={'tutorial-'+section.id} data-video-src={chapterVideoAsset(section.id)?.url} className={'tutorial-sequence '+(section.id===active.id?'active':'')} aria-current={section.id===active.id?'step':undefined} onClick={()=>select(section)}><span className="tutorial-sequence-symbol">{progress.completed.includes(section.id)?<Check size={14}/>:section.id===active.id?<Play size={12}/>:String(sections.findIndex(s=>s.id===section.id)+1).padStart(2,'0')}</span><span><strong>{section.title}</strong><small>{asset?.kind==='local'?formatTutorialTime(section.start)+' · repère prévu':'Lire la vidéo'}</small></span></button>)}</div>}</section>;
      })}</nav>{!matches.size&&<p className="tutorial-empty-search">Aucune séquence correspondante.</p>}
      <div className="tutorial-index-note"><p>{DEMO_MODE?'La progression de cet essai est temporaire.':'Les chapitres validés et tes repères sont mémorisés sur cet appareil.'} La vidéo locale n’est pas intégrée à la sauvegarde du projet.</p>{storageError&&<p role="status">La progression ne peut pas être enregistrée dans ce navigateur pour le moment.</p>}<button className="ux-button" onClick={()=>onNavigate?.('manual')}><BookOpen size={15}/>Manuel & exercices</button></div>
    </aside></div>
    {editing&&<TimingsEditor sections={sections} duration={duration} onApply={starts=>{setProgress(p=>({...p,starts}));setMessage('Repères enregistrés sur cet appareil. Vérifie-les pendant la lecture.');}} onClose={()=>setEditing(false)}/>}
  </section>;
}
