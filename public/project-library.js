import {DEMO_MODE,preferenceStore} from './demo-mode.js';
const memory=new Map();let connection;
const db=()=>connection||=(new Promise((resolve,reject)=>{const r=indexedDB.open('metre-tce-library',1);r.onupgradeneeded=()=>r.result.createObjectStore('projects',{keyPath:'id'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);}));
async function op(mode,action){if(DEMO_MODE)return action(null);const d=await db();return new Promise((resolve,reject)=>{const tx=d.transaction('projects',mode),r=action(tx.objectStore('projects'));let value;r.onsuccess=()=>value=r.result;tx.oncomplete=()=>resolve(value);tx.onabort=tx.onerror=()=>reject(tx.error||Error('Bibliothèque locale indisponible.'));});}
let queued=null,timer,writing=Promise.resolve();
const publish=detail=>document.dispatchEvent(new CustomEvent('atelier:local-library',{detail}));
async function put(project){const id=project.localProjectId||project.cloudId;if(!id)throw Error('Identifiant local absent.');const record={id,title:project.title,updatedAt:new Date().toISOString(),rows:project.rows.length,project:structuredClone(project)};
 if(DEMO_MODE)memory.set(id,record);else await op('readwrite',s=>s.put(record));
 let checkpoint=false;try{const text=JSON.stringify(project);if(text.length<2*1024*1024){preferenceStore.setItem('metre-active-checkpoint-v1',text);checkpoint=true;}else preferenceStore.setItem('metre-active-checkpoint-v1',JSON.stringify({largeProject:true,id,updatedAt:record.updatedAt}));}catch{}
 publish({saved:true,checkpoint});return record;
}
export const localProjectLibrary={
 schedule(project){queued=project;clearTimeout(timer);timer=setTimeout(()=>this.flush().catch(e=>publish({error:e.message})),600);},
 flush(){clearTimeout(timer);if(!queued)return writing;const p=queued;queued=null;writing=writing.catch(()=>{}).then(()=>put(p));return writing;},
 async list(){await this.flush();const records=DEMO_MODE?[...memory.values()]:await op('readonly',s=>s.getAll());return records.sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)).map(({project,...meta})=>meta);},
 async load(id){await this.flush();const r=DEMO_MODE?memory.get(id):await op('readonly',s=>s.get(id));if(!r)throw Error('Projet local introuvable.');return structuredClone(r.project);}
};
