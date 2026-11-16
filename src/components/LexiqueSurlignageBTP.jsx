import React,{useEffect,useLayoutEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {BookOpen,X,Sparkles,Loader2,Search} from 'lucide-react';
import {Modal} from '../../ux/components.jsx';
import {DEMO_MODE} from '../../public/demo-mode.js';
import {LEXIQUE_TECHNIQUE_BTP,normaliserMot,trouverTerme} from '../data/lexiqueBTP.js';
export {LEXIQUE_TECHNIQUE_BTP} from '../data/lexiqueBTP.js';
export function ouvrirLexique(){document.dispatchEvent(new Event('atelier:lexique'));}
export default function LexiqueSurlignageBTP(){
 const [bubble,setBubble]=useState(null),[open,setOpen]=useState(false),[query,setQuery]=useState(''),[detail,setDetail]=useState(null),[loading,setLoading]=useState(false),[error,setError]=useState(''),[position,setPosition]=useState({left:8,top:8});
 const cache=useRef({}),box=useRef(null),pending=useRef(null),serial=useRef(0);
 const cancel=()=>{serial.current++;pending.current?.abort();pending.current=null;setLoading(false);setError('');};
 useEffect(()=>{
  const select=e=>{const target=e.target instanceof Element?e.target:null;if(target?.closest('[data-lexique-bulle], [data-lexique-library],button,input[type="password"]'))return;if(e.key==='Escape'){cancel();setBubble(null);return;}
   const sel=window.getSelection();let text=sel?.toString().trim(),rect=sel?.rangeCount?sel.getRangeAt(0).getBoundingClientRect():null;
   if(target?.matches('textarea,input[type="text"],input:not([type])')&&target.selectionEnd>target.selectionStart){text=target.value.slice(target.selectionStart,target.selectionEnd).trim();rect=target.getBoundingClientRect();}
   if(!text||text.length<3||text.length>80||!rect||!rect.width){if(!text){cancel();setBubble(null);}return;}
   cancel();const entry=trouverTerme(text,cache.current);setBubble({raw:text,entry,rect:{left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom}});
  };
  const launch=()=>{cancel();setBubble(null);setOpen(true);setDetail(null);};const closeOnMove=e=>{if(e.target instanceof Element&&e.target.closest('[data-lexique-bulle]'))return;setBubble(null);};
  document.addEventListener('mouseup',select);document.addEventListener('keyup',select);document.addEventListener('touchend',select);document.addEventListener('atelier:lexique',launch);window.addEventListener('scroll',closeOnMove,true);window.addEventListener('resize',closeOnMove);
  return()=>{document.removeEventListener('mouseup',select);document.removeEventListener('keyup',select);document.removeEventListener('touchend',select);document.removeEventListener('atelier:lexique',launch);window.removeEventListener('scroll',closeOnMove,true);window.removeEventListener('resize',closeOnMove);pending.current?.abort();};
 },[]);
 useLayoutEffect(()=>{if(!bubble||!box.current)return;const b=box.current.getBoundingClientRect(),r=bubble.rect,w=window.innerWidth,h=window.innerHeight;setPosition({left:Math.max(8,Math.min((r.left+r.right-b.width)/2,w-b.width-8)),top:Math.max(8,Math.min(r.top-b.height-10>=8?r.top-b.height-10:r.bottom+10,h-b.height-8))});},[bubble,loading,error]);
 const ask=async(raw,inLibrary=false)=>{cancel();const token=++serial.current;const controller=new AbortController();pending.current=controller;setLoading(true);try{
  if(DEMO_MODE)throw Error('Démo : les définitions locales sont disponibles ; la recherche OpenAI nécessite le site connecté.');
  const response=await fetch('/api/definir-terme',{method:'POST',headers:{'content-type':'application/json'},credentials:'same-origin',body:JSON.stringify({terme:raw}),signal:controller.signal});const data=await response.json();if(!response.ok)throw Error(data.error||'Recherche indisponible.');if(data.moteur!=='openai')throw Error(data.definition||'Définition IA indisponible.');if(!['terme','categorie','definition'].every(k=>typeof data[k]==='string'&&data[k].trim()))throw Error('Réponse de définition invalide.');if(token!==serial.current)return;cache.current[normaliserMot(raw)]=data;if(inLibrary)setDetail(data);else setBubble(v=>v&&v.raw===raw?{...v,entry:data}:v);
 }catch(e){if(token===serial.current&&e.name!=='AbortError')setError(e.message);}finally{if(token===serial.current)setLoading(false);}};
 const entries=Object.values(LEXIQUE_TECHNIQUE_BTP).filter(v=>normaliserMot(v.terme+' '+v.categorie+' '+v.definition).includes(normaliserMot(query)));
 const card=e=><><span className="lex-category">{e.categorie} · {e.moteur==='openai'?'Définition IA':'Lexique local'}</span><p>{e.definition}</p><small>Repère pédagogique à contextualiser selon les pièces du projet.</small></>;
 return createPortal(<>{bubble&&<aside ref={box} data-lexique-bulle="true" role="dialog" aria-label="Définition technique BTP" className="lex-bubble" style={position}><header><strong><BookOpen/>{bubble.entry?.terme||bubble.raw}</strong><button aria-label="Fermer la définition" onClick={()=>{cancel();setBubble(null);}}><X/></button></header>{bubble.entry?card(bubble.entry):<><button className="ux-button" disabled={loading} onClick={()=>ask(bubble.raw)}>{loading?<Loader2 className="lex-spin"/>:<Sparkles/>}{loading?'Recherche…':'Définir avec l’IA'}</button><small>Seul le terme sélectionné est envoyé ; recherche réservée au propriétaire connecté.</small></>}{error&&<p role="alert">{error}</p>}</aside>}
 {open&&<Modal wide title="Lexique BTP" subtitle="24 repères techniques · surlignez aussi un terme dans votre espace de travail." onClose={()=>{cancel();setOpen(false);}}><div className="lex-library" data-lexique-library="true"><label><Search/>Rechercher un terme<input autoFocus aria-label="Rechercher dans le lexique BTP" value={query} maxLength={80} onChange={e=>{cancel();setQuery(e.target.value);setDetail(null);}}/></label><p className="premium-note">Définitions pédagogiques du lexique fourni. Les valeurs, domaines d’emploi et règles de métré restent à vérifier pour le projet.</p>{detail&&<article><h3>{detail.terme}</h3>{card(detail)}</article>}<div className="lex-grid">{entries.map(e=><article key={e.terme}><h3>{e.terme}</h3>{card(e)}</article>)}</div>{!entries.length&&<p>Aucun terme local trouvé.</p>}{query.trim().length>=3&&!trouverTerme(query)&&<button className="ux-button" disabled={loading} onClick={()=>ask(query,true)}>{loading?<Loader2 className="lex-spin"/>:<Sparkles/>}Définir avec l’IA : {query}</button>}{error&&<p role="alert" className="ux-error">{error}</p>}</div></Modal>}</>,document.body);
}
