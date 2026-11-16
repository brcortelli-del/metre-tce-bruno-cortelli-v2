import { verifierTexte, verifierReponseServeur } from './assistant-metre.js';

// Un seul transport pour les deux moteurs. Aucun repli dans le navigateur :
// si le serveur sécurisé est inaccessible, le résultat est une erreur explicite.
export async function analyserDepuisServeur({texte,lignes=[],country,mode='auto',demo=false,signal},{fetcher=fetch}={}){
  verifierTexte(texte);
  if(!['auto','local'].includes(mode))throw new Error('Mode d’analyse invalide.');
  let response;
  try{response=await fetcher('/api/analyse-metre',{
    method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},
    signal:signal?AbortSignal.any([signal,AbortSignal.timeout(35000)]):AbortSignal.timeout(35000),
    body:JSON.stringify({texteClient:texte,country,mode,demo:demo===true,lignesMetreActuelles:lignes.slice(0,500).map(r=>({designation:r.label??r.designation,lot:r.lot,unite:r.result?.unit??r.unite}))}),
  });}catch(error){
    if(signal?.aborted)throw new DOMException('Analyse annulée.','AbortError');
    throw new Error(error.name==='TimeoutError'?'Le serveur n’a pas répondu à temps. Relance l’analyse.':'Le serveur est inaccessible. Vérifie la connexion et réessaie. Aucun résultat local n’a été fabriqué dans le navigateur.');
  }
  const body=await response.json().catch(()=>null);
  if(!response.ok){
    if(response.status===401)throw new Error('Connecte-toi avec ton compte ChatGPT pour lancer l’analyse sur le serveur.');
    if(response.status===403)throw new Error('L’analyse serveur est réservée au propriétaire connecté.');
    throw new Error(body?.error||'Le serveur ne peut pas terminer l’analyse. Aucun moteur n’a été exécuté dans le navigateur.');
  }
  return verifierReponseServeur(body,texte);
}
