export const ARCHIVE_LIMIT=60*1024*1024,ASSET_LIMIT=35*1024*1024;
const b64encode=bytes=>{let s='';for(let i=0;i<bytes.length;i+=32768)s+=String.fromCharCode(...bytes.subarray(i,i+32768));return btoa(s);};
export async function encodeProjectArchive(project,getAsset){
 const snapshot=structuredClone(project),p=snapshot.planWorkspace,assets=[];
 if(p?.assetId){const blob=await getAsset(p.assetId,p.serverAssetId);if(!blob)throw Error('Le fichier original du plan est indisponible. Rechargez-le avant d’exporter une archive complète.');if(blob.size>ASSET_LIMIT)throw Error('Plan trop volumineux (35 Mio maximum).');assets.push({id:p.assetId,name:p.fileName||'plan',type:blob.type||'application/octet-stream',base64:b64encode(new Uint8Array(await blob.arrayBuffer()))});}
 const text=JSON.stringify({format:'metre-tce-archive',version:1,exportedAt:new Date().toISOString(),project:snapshot,assets});if(new Blob([text]).size>ARCHIVE_LIMIT)throw Error('Archive trop volumineuse (60 Mio maximum).');return new Blob([text],{type:'application/json'});
}
export function decodeProjectArchive(text,makeId=()=>crypto.randomUUID()){
 if(typeof text!=='string'||text.length>ARCHIVE_LIMIT)throw Error('Archive trop volumineuse.');let data;try{data=JSON.parse(text);}catch{throw Error('Archive JSON illisible.');}if(data?.format!=='metre-tce-archive')return {project:data,assets:[],complete:false};
 if(data.version!==1||!data.project||!Array.isArray(data.assets)||data.assets.length>1)throw Error('Format d’archive non pris en charge.');const project=structuredClone(data.project),assets=[];
 for(const a of data.assets){if(!a||typeof a.base64!=='string'||a.base64.length>Math.ceil(ASSET_LIMIT/3)*4||a.base64.length%4||!/^[A-Za-z0-9+/]*={0,2}$/.test(a.base64)||typeof a.type!=='string'||a.type.length>100||a.id!==project.planWorkspace?.assetId)throw Error('Plan intégré invalide.');const raw=atob(a.base64),id=makeId();if(raw.length>ASSET_LIMIT)throw Error('Plan intégré trop volumineux.');assets.push({id,blob:new Blob([Uint8Array.from(raw,c=>c.charCodeAt(0))],{type:a.type})});project.planWorkspace.assetId=id;delete project.planWorkspace.serverAssetId;}
 if(project.planWorkspace?.assetId&&!assets.length)throw Error('Fichier de plan absent de l’archive complète.');project.cloudId=null;project.cloudVersion=0;project.localProjectId=makeId();project.approval=null;return {project,assets,complete:true};
}
