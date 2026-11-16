// Shared text model and same-origin client. Provider credentials stay on the server.
export const ROW_CCTP_MAX=16000;
export const CCTP_HEADINGS=['LOCALISATION & SUPPORT','DESCRIPTION TECHNIQUE & NORMES','MISE EN ŒUVRE & SUJÉTIONS INCLUSES','MODE DE MÉTRÉ & RÈGLEMENT'];
export function rowCctpPayload(row,country='france'){
 return {designation:String(row.label||'').slice(0,200),lot:String(row.lot||'').slice(0,80),zone:String(row.room||row.location||'').slice(0,200),niveau:String(row.level||'').slice(0,80),unite:String(row.result?.unit||'u').slice(0,20),quantite:row.result?.total??0,country:country==='luxembourg'?'luxembourg':'france'};
}
export function rowCctpFingerprint(row,country='france'){
 const text=JSON.stringify(rowCctpPayload(row,country));let h=2166136261;for(const c of text)h=Math.imul(h^c.charCodeAt(0),16777619);return 'v1-'+(h>>>0).toString(36);
}
export function normalizeRowCctp(article){
 if(article==null)return null;
 if(!article||typeof article!=='object'||typeof article.text!=='string'||article.text.length>ROW_CCTP_MAX)throw new Error('Article CCTP de ligne invalide (16 000 caractères maximum).');
 const text=article.text.trim();if(!text)return null;
 return {text,engine:['openai','local','manual'].includes(article.engine)?article.engine:'manual',generatedAt:typeof article.generatedAt==='string'?article.generatedAt.slice(0,40):'',savedAt:typeof article.savedAt==='string'?article.savedAt.slice(0,40):'',sourceFingerprint:typeof article.sourceFingerprint==='string'?article.sourceFingerprint.slice(0,80):''};
}
export function cctpRowIsStale(row,country){return !!row.cctpArticle?.text&&row.cctpArticle.sourceFingerprint!==rowCctpFingerprint(row,country);}
// Static Lucide BookOpenCheck geometry for the legacy DOM tables.
export function rowCctpButtonMarkup(row){const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));return `<button class="quiet row-cctp-button" data-cctp-row="${esc(row.id)}" data-saved="${!!row.cctpArticle?.text}" aria-label="CCTP · ${esc(row.label)}" title="Ouvrir ou rédiger l’article CCTP"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 7v14m-10-3V3h5a5 5 0 0 1 5 4 5 5 0 0 1 5-4h5v15h-5a5 5 0 0 0-5 3 5 5 0 0 0-5-3z"/><path d="m16 10 2 2 4-4"/></svg>CCTP</button>`;}
export function saveCctpToProject(project,rowId,article,expectedFingerprint){
 const index=project.rows.findIndex(r=>r.id===rowId);if(index<0)throw new Error('Cet ouvrage a été supprimé.');
 const row=project.rows[index];if(rowCctpFingerprint(row,project.country)!==expectedFingerprint)throw new Error('L’ouvrage a changé pendant la rédaction. Fermez puis rouvrez CCTP pour reprendre ses données actuelles.');
 const next=normalizeRowCctp({...article,savedAt:new Date().toISOString()});if(!next)throw new Error('Rédigez un article avant de l’enregistrer.');
 return {...project,approval:null,rows:project.rows.map((r,i)=>i===index?{...r,cctpArticle:next}:r)};
}
export function collectRowCctp(project){
 const groups=new Map();for(const row of project.rows||[]){const article=normalizeRowCctp(row.cctpArticle);if(!article)continue;const lot=row.lot||'Sans lot';if(!groups.has(lot))groups.set(lot,[]);groups.get(lot).push({row,article,stale:cctpRowIsStale(row,project.country)});}
 return [...groups.entries()].sort(([a],[b])=>a.localeCompare(b,'fr',{numeric:true})).map(([lot,articles])=>({lot,articles}));
}
export function rowCctpText(project){
 const groups=collectRowCctp(project),count=groups.reduce((n,g)=>n+g.articles.length,0);
 return ['ATELIER MÉTRÉ PRO','CCTP — '+project.title,`Articles enregistrés dans les lignes : ${count} / ${(project.rows||[]).length}`,'Périmètre : tout le projet, indépendamment des filtres.','Brouillons à relire ; références et règles de mesurage à vérifier au marché.',...groups.flatMap(g=>['','LOT : '+g.lot,...g.articles.flatMap(({row,article,stale})=>['',`${row.code||row.rowNumber||'Sans code'} — ${row.label}`,stale?'À RELIRE : les données de l’ouvrage ont changé depuis la rédaction.':'',article.text])])].filter((v,i,a)=>v!==''||a[i-1]!=='').join('\n');
}
export async function generateRowCctp({row,project,context='',demo=false,signal},{fetcher=fetch}={}){
 const response=await fetcher('/api/generer-cctp',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},cache:'no-store',signal,body:JSON.stringify({poste:rowCctpPayload(row,project.country),contexteProjet:context,country:project.country,demo})});
 const data=await response.json().catch(()=>null);
 if(!response.ok)throw new Error(data?.error||(response.status===401?'Connectez-vous avec le compte ChatGPT propriétaire du site.':response.status===403?'Génération réservée au propriétaire du site.':'Le serveur CCTP n’a pas répondu correctement.'));
 if(!data||!['openai','local'].includes(data.moteur)||typeof data.articleCCTP!=='string'||!data.articleCCTP.trim()||data.articleCCTP.length>ROW_CCTP_MAX)throw new Error('Réponse CCTP serveur invalide.');
 return data;
}
