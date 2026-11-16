// Extraction locale et validation communes au navigateur et au serveur.
// Aucun prix, seuil DTU ou ratio n'est déduit d'une simple désignation.
export const ASSISTANT_MAX_TEXT = 12000;
export const ASSISTANT_UNITS = ['m²', 'm³', 'm', 'u', 'forfait'];
export const ASSISTANT_ENGINE_LABELS = {local:'Analyse locale serveur',openai:'OpenAI GPT-4o-mini · serveur'};
export const normaliser = value => String(value ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/[’']/g, ' ').replace(/\s+/g, ' ').trim();
const unit = value => ({ m2:'m²', m3:'m³', ml:'m', ens:'forfait', ensemble:'forfait', 'unité':'u', U:'u' }[value] || value);
const number = value => Number(String(value).replace(/[ \u00a0\u202f]/g, '').replace(',', '.'));
const quantites = () => /(?<![\p{L}\p{N}_.])(-?\d+(?:[ \u00a0\u202f]\d{3})*(?:[.,]\d+)?)\s*(m[²2³3]|mètres? carrés?|mètres? cubes?|mètres? linéaires?|ml|m(?![\p{L}\d²³])|unités?|u(?!\p{L})|ensembles?|ens(?!\p{L})|pi[eè]ces?|blocs?[- ]portes?|portes?|fenêtres?|prises?|interrupteurs?|regards?|poteaux?)(?![\p{L}\d])/giu;
const parsedUnit = token => {
  const t=normaliser(token);
  if (/^m[²2]$|carre/.test(t)) return 'm²';
  if (/^m[³3]$|cube/.test(t)) return 'm³';
  if (/^ens/.test(t)) return 'forfait';
  if (/^(m|ml)$|lineaire/.test(t)) return 'm';
  return 'u';
};
const LOTS = [
  ['Fondations', /semelle|fondation|beton de proprete/],
  ['Terrassement', /fouille|terrass|decapage|terre vegetale|remblai|deblais|evacuation des terres/],
  ['Plâtrerie / Isolation', /cloison|ba13|platr|doublage|isolant|isolation|laine/],
  ['Menuiseries intérieures', /blocs?[- ]portes?|porte interieure|menuiserie interieure/],
  ['Menuiseries extérieures', /fenetre|menuiserie|porte|vitrage/],
  ['Revêtements de sol', /carrelage|faience|plinthe|parquet|ragreage|revetement de sol/],
  ['Peinture', /peinture|peindre|enduit|lasure/],
  ['Électricité', /electri|prise|interrupteur|luminaire|tableau electrique/],
  ['Plomberie / Chauffage', /plomb|chauffage|sanitaire|canalisation|tuyau|robinet/],
  ['Charpente', /charpente|ferme|panne|chevron/],
  ['Couverture', /couverture|tuile|ardoise|toiture/],
  ['VRD', /vrd|regard|reseau|drain|assainissement/],
  ['Gros œuvre', /maconnerie|mur|bloc beton|parpaing|beton|dall|poutre|poteau|chainage|linteau/],
];
export function lotDuTexte(text) { const t=normaliser(text); return LOTS.find(([, re])=>re.test(t))?.[0] || 'À classer'; }
const fingerprint = value => { let h=2166136261; for (const c of value) h=Math.imul(h ^ c.charCodeAt(0),16777619); return (h>>>0).toString(36); };
const textField=(value,max,name)=>{if(typeof value!=='string'||!value.trim()||value.length>max)throw new Error(name+' invalide.');return value.trim();};

export function verifierTexte(text) {
  if(typeof text!=='string'||!text.trim())throw new Error('Colle un descriptif à analyser.');
  if(text.length>ASSISTANT_MAX_TEXT)throw new Error('Descriptif limité à 12 000 caractères.');
  return text.trim();
}
export function analyserLocalement(texte) {
  const text=verifierTexte(texte), postes=[], alertes=[];
  // Les virgules décimales et les épaisseurs en mm restent dans leur phrase.
  const clauses=text.split(/\r?\n+|;|(?<=[.!?])\s+(?=[A-ZÀ-Ý])|,\s+(?=[A-Za-zÀ-ÿ])|\s+(?:et|puis)\s+(?=(?:pose|creation|création|fourniture|réalisation|mise|application|dépose|installation|\d)\b)/u).map(t=>t.trim()).filter(Boolean);
  for (const source of clauses) {
    const matches=[...source.matchAll(quantites())], lot=lotDuTexte(source);
    if(!matches.length&&lot==='À classer')continue;
    if(!matches.length&&/^lot\b/.test(normaliser(source))&&source.length<120)continue;
    if(lot==='À classer'&&/^(?:hsp|hauteur|epaisseur|largeur|longueur)\b/.test(normaliser(source))){alertes.push('Cote repérée à reprendre dans les variables ou les dimensions : '+source.slice(0,120));continue;}
    if(postes.length>=80)throw new Error('Plus de 80 postes : analyse le descriptif lot par lot.');
    if(/^(?:sans|hors|exclu|non compris|ne pas|pas de)\b/.test(normaliser(source))) {
      alertes.push('Poste exclu du descriptif, à ne pas ajouter automatiquement : '+source.slice(0,150));continue;
    }
    const match=matches.length===1?matches[0]:null;
    let q=match?number(match[1]):null, u=match?parsedUnit(match[2]):null;
    if(q!==null&&(!Number.isFinite(q)||q<=0||q>1e7||(['u','forfait'].includes(u)&&!Number.isInteger(q)))){q=null;alertes.push('Quantité nulle, négative, excessive ou comptage fractionnaire à vérifier : '+source.slice(0,150));}
    if(u==='m'&&!/plinthe|drain|reseau|tuyau|canalisation|lineaire|gouttiere|cable|\bml\b/.test(normaliser(source))){q=null;u=null;alertes.push('Cote linéaire à interpréter avec les autres dimensions avant de métrer cet ouvrage.');}
    if(matches.length>1){q=null;u=null;alertes.push('Plusieurs cotes ou quantités dans une même phrase : sépare les postes ou calcule les dimensions dans la minute.');}
    // Un nom compté (3 blocs-portes) reste dans la désignation ; « 42 m² » est retiré.
    const isNoun=match&&/porte|fen[eê]tre|prise|interrupteur|regard|poteau/i.test(match[2]);
    let title=match?source.slice(0,match.index)+(isNoun?match[2]:'')+source.slice(match.index+match[0].length):source;
    title=title.replace(/^\s*[-•]\s*/, '').replace(/^(?:création|pose|fourniture et pose|réalisation|application)\s+(?:de|du|des|d[’'])\s*/i,'').replace(/^(?:de|du|des|d[’'])\s+/i,'').replace(/\s+/g,' ').replace(/[.\s]+$/,'').trim() || source;
    const start=source.length>1500?Math.max(0,(match?.index??0)-200):0;
    postes.push({lot,designation:title.slice(0,200),unite:u,quantite_estimee:q,justification:match&&q!==null?'Quantité explicitement indiquée dans le texte.':'Quantité et unité à préciser ; aucun calcul supposé.',extrait_source:source.slice(start,start+1500),key:'texte-'+fingerprint(normaliser(text)+'|'+postes.length)});
  }
  return {postes_detectes:postes,alertes_coherence:[...new Set(alertes)],moteur:'local'};
}

export function verifierResultatIA(value,texte,{maxAlerts=30}={}) {
  verifierTexte(texte);
  if(!value||!Array.isArray(value.postes_detectes)||value.postes_detectes.length>80||!Array.isArray(value.alertes_coherence)||value.alertes_coherence.length>maxAlerts)throw new Error('Réponse d’analyse non conforme au format attendu.');
  const notes=[];
  const postes=value.postes_detectes.map((p,i)=>{
    const designation=textField(p.designation,200,'Désignation'), lot=textField(p.lot,80,'Lot'), source=textField(p.extrait_source,1500,'Extrait source');
    if(!normaliser(texte).includes(normaliser(source)))throw new Error('Une citation proposée par l’IA est absente du texte source. Relance l’analyse locale.');
    const unite=p.unite===null?null:unit(p.unite);
    if(unite!==null&&!ASSISTANT_UNITS.includes(unite))throw new Error('Unité IA non prise en charge.');
    let q=p.quantite_estimee;
    if(q!==null&&(typeof q!=='number'||!Number.isFinite(q)||q<=0||q>1e7))throw new Error('Quantité IA invalide.');
    // Même une réponse JSON valide peut inventer un nombre : le nombre ET son
    // unité doivent être retrouvés dans la citation, sinon la quantité est vide.
    const evidence=[...source.matchAll(quantites())].some(m=>number(m[1])===q&&parsedUnit(m[2])===unite);
    if(q!==null&&(!evidence||((unite==='u'||unite==='forfait')&&!Number.isInteger(q)))){q=null;notes.push('Une quantité proposée sans preuve explicite a été laissée à préciser.');}
    return {designation,lot,unite,quantite_estimee:q,justification:textField(p.justification,500,'Justification'),extrait_source:source,key:'texte-'+fingerprint(normaliser(texte)+'|'+i)};
  });
  return {postes_detectes:postes,alertes_coherence:[...new Set([...value.alertes_coherence.map(a=>textField(a,500,'Alerte')), ...notes])],moteur:'openai'};
}
export function verifierReponseServeur(value,texte){
  if(!value||!Object.hasOwn(ASSISTANT_ENGINE_LABELS,value.moteur)||value.moteur_utilise!==ASSISTANT_ENGINE_LABELS[value.moteur]||!['auto','local'].includes(value.mode_demande)||![null,'cle_absente','api_indisponible','demo'].includes(value.fallback_reason))throw new Error('Le serveur a renvoyé un moteur d’analyse inconnu.');
  if(value.moteur==='openai'&&(value.mode_demande!=='auto'||value.fallback_reason!==null))throw new Error('La réponse du serveur ne correspond pas au mode demandé.');
  const checked=verifierResultatIA(value,texte,{maxAlerts:2000});
  return {...checked,moteur:value.moteur,moteur_utilise:value.moteur_utilise,mode_demande:value.mode_demande,fallback_reason:value.fallback_reason};
}
export function trouverDoublon(poste,rows=[]) {
  return rows.find(r=>{
    if(normaliser(r.location)!==normaliser(poste.localisation))return false;
    const u=unit(poste.unite), q=number(poste.quantite_estimee);
    return (typeof poste.key==='string'&&!!poste.key&&r.assistantSource?.key===poste.key)|| (normaliser(r.label??r.designation)===normaliser(poste.designation)&&unit(r.result?.unit??r.unite)===u&&Number(r.result?.total??r.quantite)===q);
  }) || null;
}
export function preparerLigneAssistant(poste,rows=[]) {
  const designation=textField(poste.designation,200,'Désignation'),lot=textField(poste.lot,80,'Lot'), unite=unit(poste.unite),q=number(poste.quantite_estimee);
  if(!ASSISTANT_UNITS.includes(unite))throw new Error('Choisis l’unité avant d’ajouter le poste.');
  if(poste.quantite_estimee===null||String(poste.quantite_estimee).trim()===''||!Number.isFinite(q)||q<=0||q>1e7)throw new Error('Saisis une quantité strictement positive, au maximum 10 millions.');
  if((unite==='u'||unite==='forfait')&&!Number.isInteger(q))throw new Error('Un comptage ou un ensemble demande un nombre entier.');
  const source=textField(poste.extrait_source,1500,'Extrait source'),location=String(poste.localisation??'').trim();
  if(location.length>200)throw new Error('Localisation limitée à 200 caractères.');
  if(trouverDoublon(poste,rows))throw new Error('Ce poste est déjà dans la minute pour cette localisation. Vérifie les lignes existantes.');
  const documents=Array.isArray(poste.documents_source)?poste.documents_source.slice(0,10).map(d=>({name:String(d.name??'').slice(0,250),pages:typeof d.pages==='string'?d.pages.slice(0,40):null,modified:!!d.modified})):[];
  return {id:crypto.randomUUID(),rowNumber:'',code:'',label:designation,lot,location,report:'Descriptif · quantité validée',unitPrice:null,pricingMode:'manual',assistantSource:{key:String(poste.key??'').slice(0,80),quote:source,engine:poste.moteur==='openai'?'openai':'local',...(poste.execution==='serveur'?{execution:'serveur'}:{}),...(documents.length?{documents}:{})},input:{preset:'reprise',dimensionUnit:'m',outputUnit:unite,basis:'libre',dimensions:{Q:String(q)},count:'1',deduction:'0',openings:[]}};
}

const CHECKS=[
  {when:/fouille|terrass|rigole/,items:[[/evacuation|reemploi|remblai/,'le devenir des terres (réemploi, remblai ou évacuation)'],[/proprete/,'le béton de propreté, selon l’ouvrage et les plans']]},
  {when:/carrelage|faience/,items:[[/plinthe/,'les plinthes, si prévues'],[/ragreage|primaire|preparation du support/,'la préparation du support, selon son état']]},
  {when:/maconnerie|parpaing|bloc beton/,items:[[/arase/,'les arases, selon les détails'],[/chainage/,'les chaînages prévus à l’étude'],[/linteau/,'les linteaux nécessaires aux ouvertures']]},
  {when:/cloison|ba13|platr/,items:[[/bande|joint/,'les bandes et le traitement des joints'],[/isolant|isolation|laine/,'l’isolant, si demandé au descriptif']]},
  {when:/blocs?[- ]portes?/,items:[[/quincaillerie|butee/,'les quincailleries et butées, si elles ne sont pas incluses']]},
  {when:/hydrofuge|sanitaire|salle d eau/,items:[[/etancheite|\bspec\b|protection a l eau/,'la protection à l’eau et les finitions des pièces humides, selon le procédé et les documents du projet']]},
];
export function controlesAssistant(postes,rows=[]) {
  const text=postes.map(p=>normaliser(p.designation)).join(' | '), existing=rows.map(r=>normaliser(r.label??r.designation)).join(' | '), all=text+' | '+existing;
  const alerts=[];
  for(const rule of CHECKS)if(rule.when.test(text))for(const [test,label] of rule.items){const presence=all.replace(new RegExp('\\b(?:sans|hors|pas de|non compris)\\s+(?:de |du |la |les |le )?(?:'+test.source+')\\w*','g'),'');if(!test.test(presence))alerts.push('À vérifier dans les plans et le CCTP : '+label+'. Ce complément peut être inclus dans un autre poste.');}
  return alerts;
}
