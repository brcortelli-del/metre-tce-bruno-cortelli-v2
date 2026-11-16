/** Programme fourni par l'utilisateur, adapté au comportement réel du site.
 * Les temps restent prévisionnels : aucun fichier de formation n'a été fourni.
 * Les corrections numériques du cas d'école ne figurent pas dans la recherche. */
export const TUTORIAL_PROGRAMME = [
  { id:'chap-1', title:'Prise en main & interface', icon:'compass', sections:[
    {id:'sc-1-1',title:'Découvrir l’espace de travail',start:0,duration:75,view:'calculator',image:'/manual/capture-calculs.jpeg',summary:'Repérer la navigation, le projet et les vues de plan et de minute.',tip:'Réduis la barre latérale pour gagner de la largeur ; choisis ensuite la vue adaptée à ton travail.',steps:['Vérifie le chantier affiché dans PROJET et son état de sauvegarde.','Repère Relevé sur plan, Feuille de minute, CCTP, Étude de prix et Approvisionnement & audit.','Ouvre la fiche complète d’un ouvrage pour retrouver les dimensions, Index et Report.']},
    {id:'sc-1-2',title:'France / Luxembourg et TVA du projet',start:75,duration:90,view:'project',image:'/manual/capture-calculs.jpeg',summary:'Choisir le pays et contrôler les profils de métré sans modifier automatiquement la TVA.',tip:'Le pays ne choisit pas l’éligibilité fiscale. La TVA saisie est conservée lors du changement France / Luxembourg.',steps:['Enregistre une révision avant de modifier un dossier important.','Choisis le pays, puis vérifie les profils du métier et les conditions du marché.','Contrôle séparément la TVA, les prix et les textes du CCTP. Aucun seuil de déduction universel n’est présumé.']},
    {id:'sc-1-3',title:'Les raccourcis utiles',start:165,duration:70,view:'minute',image:'/manual/capture-minute.jpeg',summary:'Naviguer au clavier et utiliser les outils du plan sans quitter sa saisie.',tip:'L, S et C activent les outils sur le plan, hors champs de saisie. Maj contraint le segment à l’horizontale ou à la verticale.',steps:['Utilise Alt + P, Alt + M et Alt + C pour changer de vue.','Dans la minute, Entrée / Tab passe aux cellules éditables suivantes.','Dans l’étude de prix, Entrée valide ; Tab valide et poursuit ; Échap restaure la valeur enregistrée.']},
  ]},
  { id:'chap-2', title:'Réaliser un avant-métré', icon:'ruler', sections:[
    {id:'sc-2-1',title:'Importer un plan et étalonner l’échelle',start:235,duration:125,view:'plan',image:'/manual/capture-plan.jpeg',summary:'Ouvrir un PDF ou une image et vérifier une distance connue avant de mesurer.',tip:'Prends une cote lisible et suffisamment longue, puis contrôle une seconde cote indépendante.',steps:['Ouvre Relevé sur plan et importe le fichier source.','Étalonne avec deux points et la distance réelle dans l’unité demandée.','Vérifie la page active et une seconde cote avant de tracer.']},
    {id:'sc-2-2',title:'Mesurer, déduire et lier la minute',start:360,duration:150,view:'plan',image:'/manual/capture-plan.jpeg',summary:'Relever des longueurs, surfaces et comptages, puis préparer les ouvrages correspondants.',tip:'Un tracé ne crée pas systématiquement une ligne de minute. Prépare ou crée la ligne liée, puis vérifie les dimensions complémentaires.',steps:['Choisis Linéaire, Surface ou Comptage et affecte le lot / usage du relevé.','Prépare la ligne d’ouvrage à partir du relevé ; renseigne séparément hauteur ou profondeur si nécessaire.','Contrôle les ouvertures et les déductions une seule fois ; vérifie la liaison et les intersections.']},
    {id:'sc-2-3',title:'Saisie directe, variables et import CAO / BIM',start:510,duration:135,view:'import',image:'/manual/capture-minute.jpeg',summary:'Utiliser les variables et fx, ou associer les extractions AutoCAD / Revit aux ouvrages.',tip:'Contrôle l’unité et les groupes cochés avant l’injection. Une quantité BIM nette ne doit pas être déduite une seconde fois.',steps:['Sans plan, saisis les cotes ou une variable définie dans Variables, par exemple HSP.','Utilise fx Formules pour choisir une géométrie et vérifier les unités.','Dans Import CAO / BIM, contrôle le fichier, la mesure choisie, le mapping lot / ouvrage, puis l’aperçu avant injection.']},
  ]},
  { id:'chap-3', title:'CCTP & références normatives', icon:'file', sections:[
    {id:'sc-3-1',title:'Contrôler une référence et son domaine',start:645,duration:80,view:'norms',image:'/manual/capture-cctp.jpeg',summary:'Lire la date d’audit, les parties du document et les sources avant d’adapter le CCTP.',tip:'Le registre n’est pas une veille normative permanente. Une référence actualisée ne crée pas à elle seule une nouvelle règle de métré.',steps:['Recherche la référence ou le métier dans Normes & DTU.','Lis l’édition, le statut, le domaine, les limites et les sources proposées.','Retiens la référence adaptée au marché et au procédé ; relis toute trame insérée dans le CCTP.']},
    {id:'sc-3-2',title:'Préparer le CCTP et exporter en Word .docx',start:725,duration:105,view:'cctp',image:'/manual/capture-cctp.jpeg',summary:'Importer les désignations, compléter les prescriptions et exporter le descriptif en DOCX ou PDF.',tip:'Le format Word réel est .docx. Les quantités et prix du bordereau ne sont pas copiés dans les prescriptions techniques.',steps:['Importe les ouvrages de la minute ou choisis une fiche de bibliothèque.','Adapte lot, sous-lot, description, mise en œuvre, localisation et mode de métré.','Vérifie l’aperçu et la numérotation, puis télécharge Word .docx et/ou PDF.']},
  ]},
  { id:'chap-4', title:'Chiffrage, achats & audit', icon:'money', sections:[
    {id:'sc-4-1',title:'Relire les indices d’oubli',start:830,duration:75,view:'needs',image:'/manual/capture-minute.jpeg',summary:'Examiner les compléments potentiellement absents sans les ajouter automatiquement au projet.',tip:'La gestion des terres et la propreté sont vérifiées séparément. L’absence d’alerte ne garantit pas l’exhaustivité du métré.',steps:['Ouvre Approvisionnement & audit, puis Vérificateur d’oublis.','Lis la ligne, le bâtiment et le niveau du contrôle.','Vérifie les plans, le CCTP et les composants avant de compléter les ouvrages justifiés.']},
    {id:'sc-4-2',title:'DS, coefficient K et bordereau Excel',start:905,duration:140,view:'prices',image:'/manual/capture-calculs.jpeg',summary:'Renseigner les sous-détails, choisir la méthode de K et exporter le document client ou l’étude interne.',tip:'L’écart vente − DS couvre seulement les études complètes. Le fichier client exclut les coûts et coefficients internes.',steps:['Choisis PV saisi ou DS × K pour chaque ligne.','Complète temps MO, matériaux, matériel et taux, puis vérifie les prix manquants et la TVA.','Relis les arrondis et les totaux par lot ; choisis le bordereau client ou l’étude interne avec formules.']},
    {id:'sc-4-3',title:'Besoins matériaux et conditionnements',start:1045,duration:90,view:'needs',image:'/manual/capture-minute.jpeg',summary:'Préparer les quantités nettes, pertes, palettes, boîtes ou sacs par fournisseur.',tip:'Les fichiers CSV, XLSX et PDF sont des préparations de commande. Le site n’envoie rien au fournisseur.',steps:['Affecte un bloc aux ouvrages et le même bloc aux déductions correspondantes.','Vérifie les ratios, pertes, fournisseurs et quantités par colis. Choisis la base physique nette pour les achats lorsque adaptée.','Contrôle la couverture, les contributions et les colis arrondis au supérieur avant l’export. Ne double pas le foisonnement.']},
  ]},
  { id:'chap-5', title:'Cas pratique du garage', icon:'graduation', sections:[
    {id:'sc-5-1',title:'Reproduire le garage de 6 × 4 m',start:1135,duration:220,view:'manual',image:'/manual/plan-garage.png',summary:'Réaliser le cas du manuel : cotes H.O. / D.O., fouilles, fondations, élévation et finitions.',tip:'Réalise ton premier essai avant d’afficher le corrigé. Les cotes et hypothèses du dossier priment sur un exemple générique.',steps:['Lis le sujet : 6,00 × 4,00 m, HSP 2,50 m et trois baies.','Construis ta minute avec les bonnes bases de cotes, Index et Report, puis contrôle les unités.','Compare au corrigé du manuel avant de préparer un chiffrage ou les besoins matériaux.'],correction:['Selon les hypothèses du garage : élévation nette = 19,20 × 2,50 − (2,40 × 2,00 + 0,90 × 2,15 + 1,20 × 1,00) = 40,065 m².','Contrôle physique équivalent pour 20 cm d’épaisseur : 40,065 × 0,20 = 8,013 m³. Les quantités de décompte FR/LU se contrôlent séparément suivant les profils du manuel.']},
  ]},
];
export const TUTORIAL_SECTIONS = TUTORIAL_PROGRAMME.flatMap(chapter=>chapter.sections.map(section=>({...section,chapterId:chapter.id,chapterTitle:chapter.title})));
export const PLANNED_DURATION = 1355;
export function formatTutorialTime(seconds) {
  const n=Number.isFinite(seconds)?Math.max(0,Math.floor(seconds)):0;
  return (n>=3600?String(Math.floor(n/3600)).padStart(2,'0')+':':'')+String(Math.floor(n/60)%60).padStart(2,'0')+':'+String(n%60).padStart(2,'0');
}
export function parseTutorialTime(value) {
  const text=String(value).trim();
  if(!/^\d{1,2}:\d{2}(?::\d{2})?$/.test(text))throw new Error('Utilise mm:ss ou hh:mm:ss.');
  const parts=text.split(':').map(Number);
  if(parts.at(-1)>=60 || (parts.length===3&&parts[1]>=60))throw new Error('Les secondes et les minutes horaires doivent rester inférieures à 60.');
  const seconds=parts.length===3?parts[0]*3600+parts[1]*60+parts[2]:parts[0]*60+parts[1];
  if(seconds>=86400)throw new Error('Repère limité à moins de 24 heures.');
  return seconds;
}
export function validateTutorialTimings(starts,{duration}={}) {
  let previous=-1;const result={};
  for(const [i,section] of TUTORIAL_SECTIONS.entries()) {
    const value=starts[section.id];
    if(!Number.isInteger(value)||value<0||value>=86400||(i===0&&value!==0)||value<=previous)throw new Error('Le premier repère doit être 00:00 ; les suivants doivent être strictement croissants.');
    if(Number.isFinite(duration)&&duration>0&&value>=duration)throw new Error('Chaque repère doit être situé avant la fin de la vidéo.');
    result[section.id]=value;previous=value;
  }
  return result;
}
export function timedTutorialSections(starts={}) {
  return TUTORIAL_SECTIONS.map(s=>({...s,start:starts[s.id]??s.start}));
}
export function tutorialSectionAtTime(sections,time) {
  const t=Number.isFinite(time)?Math.max(0,time):0;
  let low=0,high=sections.length-1;
  while(low<high){const middle=Math.ceil((low+high)/2);if(sections[middle].start<=t)low=middle;else high=middle-1;}
  return sections[low];
}
export function tutorialCanSeek(section,duration) {return Number.isFinite(duration)&&duration>0&&section.start<duration;}
export function validateTutorialFile(file) {
  if(!file||!file.size||file.size>1024*1024*1024)throw new Error('Choisis une vidéo non vide de moins de 1 Go.');
  if(!/\.(mp4|webm|m4v|mov)$/i.test(file.name||''))throw new Error('Formats acceptés : MP4, WebM, M4V ou MOV, selon les codecs du navigateur.');
  return file;
}
export function restoreTutorialProgress(raw) {
  const fallback={selectedId:TUTORIAL_SECTIONS[0].id,completed:[],starts:{}};
  try {
    const value=typeof raw==='string'?JSON.parse(raw):raw;
    if(!value||value.version!==1)return fallback;
    const ids=new Set(TUTORIAL_SECTIONS.map(s=>s.id));
    const starts=value.starts&&Object.keys(value.starts).length?validateTutorialTimings(value.starts):{};
    return {selectedId:ids.has(value.selectedId)?value.selectedId:fallback.selectedId,completed:[...new Set(Array.isArray(value.completed)?value.completed.filter(id=>ids.has(id)):[])],starts};
  }catch{return fallback;}
}
