/** Couche normative datée, distincte de la transcription des livres.
 * Les notices prouvent un statut/domaine, jamais une clause de paiement cachée.
 * Le moteur de géométrie et les données du chantier ne sont pas modifiés. */
import {readFileSync,writeFileSync} from 'node:fs';
const date='2026-11-13', version='FR-2026-11-13.1';
const read=p=>JSON.parse(readFileSync(new URL(p,import.meta.url),'utf8'));
const write=(p,v)=>writeFileSync(new URL(p,import.meta.url),JSON.stringify(v,null,2)+'\n');
const course=read('../public/data/cctp-library.json'),proofs=read('../public/data/cctp-sources.json');
const previous=read('../public/data/cctp-audit-fr-lu.json');
const families=read('./fr-dtu-parts.json'),transitions=read('./fr-transitions.json'),vrd=read('./fr-vrd-regulations.json');
const byFamily=new Map(families.map(f=>[f.id,f]));
const compact=s=>s.replace(/\s/g,'').toLowerCase();
const oldSources=new Map(previous.sources.map(s=>[s.id,s]));
const sources=[],urls=new Map();
function register(s){
  if(!s?.url)return null;
  if(urls.has(s.url))return urls.get(s.url);
  const id='FR-SOURCE-'+String(sources.length+1).padStart(3,'0');urls.set(s.url,id);
  sources.push({id,titre:s.titre||s.label||s.code,url:s.url,repere:s.repere||'',consulte_le:date});return id;
}
const familyIds=ref=>{
  const t=compact(ref),ids=[];
  for(const f of families){
    const n=f.id.replace('FR_DTU_','').replaceAll('_','.');
    if(new RegExp('dtu'+n.replaceAll('.','\\.')+'(?:$|[^0-9.])').test(t))ids.push(f.id);
  }
  if(/dtu13\.(11|12)(?:$|[^0-9.])/.test(t))ids.push('FR_DTU_13_1');
  return [...new Set(ids)];
};
const transitionFor=ref=>{
  const t=compact(ref);
  if(/bael|eurocode2/.test(t))return transitions.find(x=>x.id==='FR-TRANSITION-BAEL-EC2');
  if(/bpel/.test(t))return transitions.find(x=>x.id==='FR-TRANSITION-BPEL-EC2');
  if(/nv65/.test(t))return transitions.find(x=>x.id==='FR-TRANSITION-NV65-EC1');
  if(/dtu11\.1$/.test(t))return transitions.find(x=>x.id==='FR-ANCIEN-DTU-11-1');
  if(/nft54-090/.test(t))return transitions.find(x=>x.id==='FR-REFERENCE-NFT54-090');
};
const registry=previous.normes.map((n,i)=>{
  const t=transitionFor(n.reference_cours),fs=familyIds(n.reference_cours);
  const ss=t?.sources||n.sources.map(id=>oldSources.get(id)).filter(Boolean);
  const refs=fs.length?fs.flatMap(id=>byFamily.get(id).parties.map(p=>p.code+' — '+p.millesime)):t?t.nouvelles_references.map(r=>r.code):n.references_proposees;
  return {id:'FR-REF-'+String(i+1).padStart(3,'0'),reference_cours:n.reference_cours,
    statut:t?.statut||n.statut,references_proposees:refs,familles_dtu:fs,
    controle:t?[t.conditions_application,t.impact_mise_en_oeuvre].join(' '):n.controle,
    impact_metre:t?.impact_metre||'La mise à jour de la référence ne modifie pas à elle seule la formule géométrique ni les conventions contractuelles de décompte. Les prescriptions de l’étude peuvent modifier les quantités.',
    sources:[...new Set(ss.map(register).concat(fs.flatMap(id=>byFamily.get(id).parties.map(register))).filter(Boolean))],
    seuil_deduction_m2:null,seuil_deduction_m3:null};
});
const byRef=new Map(registry.map(r=>[compact(r.reference_cours),r]));
for(const f of families)for(const p of f.parties)register(p);
for(const x of [...transitions,...vrd]){for(const s of x.sources)register(s);for(const s of x.nouvelles_references)register(s);}
const legal={
  volontariat:{id:'FR-CADRE-NORMALISATION',ancienne_reference:'L1 p.24–25 : présentation générale de l’applicabilité des normes.',statut:'PRÉCISION DU CADRE JURIDIQUE',
    nouvelles_references:[{code:'Décret n°2009-697, article 17',titre:'Normalisation — application volontaire et cas d’obligation',role_cctp:'Distinguer statut normatif, obligation réglementaire et incorporation contractuelle.',url:'https://www.legifrance.gouv.fr/loda/id/JORFTEXT000020749979/'}],
    conditions_application:'Une norme est en principe d’application volontaire ; un arrêté peut la rendre obligatoire. Vérifier aussi les références incorporées au marché et les textes applicables à l’ouvrage.',
    impact_metre:'Aucune règle universelle de déduction ne découle du seul sigle NF DTU.',impact_mise_en_oeuvre:'Identifier les textes opposables et leurs domaines, puis les prescriptions particulières du projet.',alerte:'Une norme en vigueur n’est pas automatiquement obligatoire pour tout chantier.',sources:[]},
  commande:{id:'FR-CADRE-COMMANDE-PUBLIQUE',ancienne_reference:'L1 p.37 : décret du 1er août 2006 / ancien Code des marchés publics.',statut:'CADRE ACTUALISÉ SOUS CONDITION DE DATE DU CONTRAT',
    nouvelles_references:[{code:'Code de la commande publique',titre:'Cadre des marchés publics et concessions',role_cctp:'Identifier les pièces du marché et les références contractuelles ; ne pas appliquer les règles des marchés publics à tous les marchés privés.',url:'https://www.legifrance.gouv.fr/codes/texte_lc/LEGITEXT000037701019/'}],
    conditions_application:'Entrée en vigueur le 1er avril 2019 pour les consultations engagées ou avis envoyés à partir de cette date. Les contrats anciens peuvent rester soumis aux textes antérieurs.',impact_metre:'Identifier le mode de prix et les conditions de constat contradictoire du contrat ; aucun seuil de déduction ajouté.',impact_mise_en_oeuvre:'Les pièces du marché déterminent les référentiels effectivement incorporés.',alerte:'Vérifier la date de procédure, la nature du contrat et les pièces contractuelles.',sources:[{titre:'DAJ — entrée en vigueur du Code de la commande publique',url:'https://www.economie.gouv.fr/daj/les-archives-de-lactualite-de-la-commande-publique',repere:'Actualité du 3 avril 2019.'}]}
};
for(const x of Object.values(legal))for(const s of [...x.sources,...x.nouvelles_references])register(s);
const regMap=new Map([...transitions,...vrd,...Object.values(legal)].map(x=>[x.id,x]));
const net='Aucune convention numérique de non-déduction vérifiée dans le texte intégral applicable. Définir au marché les unités, nus de mesurage, vides, tableaux, réservations et attachements. La quantité géométrique nette du calculateur est pédagogique, distincte du décompte payable.';
const concrete='Pour les bétons de cette prestation, préciser le mode de spécification retenu et les caractéristiques requises selon NF EN 206+A2/CN (décembre 2025, tirage 2 juillet 2026), les plans et les conditions d’environnement. Pour un béton à propriétés spécifiées, renseigner notamment résistance {{classe_resistance}}, exposition {{classes_exposition}}, consistance {{consistance}} et dimension maximale des granulats {{Dmax}}. Le choix des armatures, enrobages, coffrages, cure et contrôles découle de l’étude et du référentiel d’exécution retenus. Aucun dosage ni ratio pédagogique ne vaut dimensionnement. La possibilité d’un béton à composition prescrite se vérifie dans son domaine ; les dosages ne sont pas universellement interdits.';
const profileList=[];
function profile(id,label,dtu,regs,alert,paragraph,extra=[]){
  const fs=dtu.map(x=>byFamily.get(x));
  const regulations=regs.map(x=>regMap.get(x));
  const norms=[...fs.flatMap(f=>f.parties.map(p=>({code:p.code,titre:p.titre,role_cctp:p.role+' — '+f.nom,millesime:p.millesime,statut:p.statut,source_url:p.url}))),
    ...regulations.flatMap(x=>x.nouvelles_references.map(r=>({...r,source_url:r.url,statut:'selon_conditions_application',conditions:x.conditions_application}))),...extra];
  const p={id,nom:label,normes_en_vigueur:norms,
    parties_nf_dtu:fs.map(f=>({famille:f.nom,parties:f.parties,regle_metre:f.regle_metre})),
    regle_metre_officielle_ccs:[...new Set(fs.map(f=>f.regle_metre.texte).concat(net))].join(' '),
    statut_regle_metre:'NON_CERTIFIEE_TEXTE_INTEGRAL_NON_CONSULTE',seuil_deduction_m2:null,seuil_deduction_m3:null,
    alerte_interface_site:alert,paragraphe_cctp_pret_a_inserer:paragraph+' Les éditions, limites de prestations, contrôles et modalités de décompte retenus seront indiqués dans les pièces du marché. Les champs entre accolades restent à compléter avant émission.',
    conditions_application:regulations.map(x=>({reference:x.id,conditions:x.conditions_application})),
    impact_metre:'Pas de substitution automatique des méthodes de dimensionnement. Géométrie et conventions de règlement restent distinctes ; les quantités évoluent seulement si l’étude, les plans ou une règle contractuelle confirmée changent.',
    impact_mise_en_oeuvre:regulations.map(x=>x.impact_mise_en_oeuvre).join(' ')||'Choisir le domaine exact du système, les performances et les contrôles dans les parties techniques, les matériaux dans les CGM, les obligations contractuelles dans les CCS applicables.',
    sources:[...new Set(norms.map(n=>register({titre:n.titre,url:n.source_url})).concat(regulations.flatMap(x=>x.sources.map(register))).filter(Boolean))]};
  profileList.push(p);return p;
}
const en206={code:'NF EN 206+A2/CN',titre:'Béton — spécification, performance, production et conformité — complément national',millesime:'décembre 2025 ; tirage 2 juillet 2026',statut:'en_vigueur_notice_verifiee',role_cctp:'Spécification du béton ; ne définit pas un seuil de déduction des réservations.',source_url:'https://www.boutique.afnor.org/fr-fr/norme/nf-en-206-a2-cn/beton-specification-performance-production-et-conformite-complement-nationa/fa211302/456716'};
const geotechNA={code:'NF EN 1997-1/NA',titre:'Eurocode 7 — Calcul géotechnique — Partie 1 : règles générales — Annexe nationale à la NF EN 1997-1:2005',millesime:'septembre 2018',statut:'en_vigueur_notice_verifiee_ensemble_a_selectionner',role_cctp:'Choix nationaux de la génération concernée. Le projet PR NF EN1997-1/NA de juin2025 ne constitue pas un remplacement publié ; ne pas mélanger les générations.',source_url:'https://www.boutique.afnor.org/fr-fr/norme/nf-en-19971-na/eurocode-7-calcul-geotechnique-partie-1-regles-generales-annexe-nationale-a/fa190693/81354'};
const geotechShallow={code:'NF P94-261 COMPIL1',titre:'Justification des ouvrages géotechniques — Norme d’application nationale de l’Eurocode 7 — Fondations superficielles',millesime:'février 2017 — texte de juin2013 avec A1 février2017',statut:'en_vigueur_notice_verifiee',role_cctp:'Justifications géotechniques, distinctes de l’exécution NF DTU13.1 et du calcul structural du béton. Choisir un ensemble cohérent avec l’étude ; ne pas substituer le projet PR NF P94-261 de septembre2025.',source_url:'https://www.boutique.afnor.org/fr-fr/norme/nf-p94261-compil1/justification-des-ouvrages-geotechniques-norme-dapplication-nationale-de-le/fa191352/335850'};
const geotechDeep={code:'NF P94-262 COMPIL 1',titre:'Justification des ouvrages géotechniques — Normes d’application nationale de l’Eurocode 7 — Fondations profondes',millesime:'juillet 2018 — texte de juillet2012 avec A1 juillet2018',statut:'en_vigueur_notice_verifiee',role_cctp:'Justifications géotechniques des fondations profondes ; ne remplace pas leurs normes d’exécution. Ensemble à désigner par le bureau d’études.',source_url:'https://www.boutique.afnor.org/fr-fr/norme/nf-p94262-compil-1/justification-des-ouvrages-geotechniques-normes-dapplication-nationale-de-l/fa195180/335797'};
profile('general','Généralités / prestation à préciser',[],['FR-CADRE-NORMALISATION','FR-CADRE-COMMANDE-PUBLIQUE'],'Préciser la prestation et son domaine avant de choisir un DTU ; aucun seuil de déduction n’est validé.','Pour {{prestation}}, définir matériaux, performances, implantation, tolérances, contrôles et limites suivant les plans et les documents du marché. Les références historiques ne sont pas reconduites comme prescriptions actuelles.');
profile('earth','Terrassements',[],['VRD-NORM-TERRASSEMENTS','VRD-REG-FOUILLES','VRD-REG-DT-DICT'],'DTU 12 annulé : préciser le référentiel du marché. Distinguer terres en place, foisonnées et compactées.','Exécuter les terrassements suivant les profils {{plans_profils}}, l’étude de sol et les prescriptions contractuelles. Identifier séparément décapage, déblais, réemploi, remblais, évacuation, protections et gestion des eaux. Justifier les états volumiques et coefficients ; ne pas assimiler le volume transporté au volume en place. Prévoir repérage des réseaux, procédures DT-DICT selon les intervenants, protections des fouilles et contrôles de compactage.');
profile('geotech','Reconnaissance géotechnique',[],['FR-ANCIEN-DTU-11-1','VRD-REG-DT-DICT'],'DTU 11.1 annulé : mission, méthode d’essai et normes particulières à préciser par le géotechnicien.','Définir avec le géotechnicien la mission {{mission}}, les investigations {{investigations}}, leurs implantations et les livrables nécessaires à l’étude des fondations et terrassements. Les sondages et essais seront identifiés individuellement avec leur méthode et les conditions de sécurité. Aucun remplacement univoque du DTU 11.1 n’est revendiqué.');
profile('shallow','Fondations superficielles / semi-profondes',['FR_DTU_13_1','FR_DTU_21'],['FR-TRANSITION-BAEL-EC2'],'13.11/13.12 → NF DTU 13.1 (2019), seulement dans son domaine. Étude géotechnique et structure indispensables.','Les fondations {{type_fondation}} seront exécutées suivant l’étude géotechnique, les plans d’exécution et le NF DTU 13.1 de septembre 2019 lorsque son domaine est satisfait. Définir assise, niveaux, géométrie, préparation et réception du fond de fouille ; les éléments en béton relèveront aussi du NF DTU 21 applicable. Les justifications géotechniques seront établies dans l’ensemble cohérent retenu par l’étude, notamment Eurocode7 et NF P94-261 pour la génération concernée, distinctement du calcul structural du béton. '+concrete,[en206,geotechNA,geotechShallow]);
profile('deep','Fondations profondes',['FR_DTU_13_2'],['FR-TRANSITION-BAEL-EC2'],'NF DTU 13.2 (2020) : choisir le procédé et ses normes d’exécution. Le contenu détaillé du règlement P2 reste à vérifier.','Définir le système {{type_fondation_profonde}}, les capacités, niveaux, interfaces, essais et contrôles par les études géotechnique et structure. Exécuter dans le domaine du NF DTU 13.2 de mai 2020 et des normes d’exécution propres au procédé retenu, sans leur substituer une règle générale de pieux. Les justifications géotechniques seront établies dans l’ensemble cohérent retenu par l’étude, notamment Eurocode7 et NF P94-262 pour la génération concernée. Préciser traitement des têtes, attachements et réception.',[geotechNA,geotechDeep]);
profile('concrete','Béton armé / non armé coulé en place',['FR_DTU_21'],['FR-TRANSITION-BAEL-EC2','FR-TRANSITION-BPEL-EC2'],'NF DTU 21 : exécution, Eurocode 2 : calcul. Le seuil de 0,05 m³ n’est pas confirmé dans P2.','Exécuter les ouvrages en béton suivant le NF DTU 21 de juin 2017 dans son domaine et les plans issus de l’étude structure, avec une génération cohérente d’Eurocodes et d’annexes nationales explicitée par le bureau d’études. '+concrete,[en206]);
profile('banché','Murs en béton banché',['FR_DTU_23_1','FR_DTU_21'],['FR-TRANSITION-BAEL-EC2'],'DTU 23.1 conserve une structure ancienne : ne pas lui inventer un CGM ou un CCS moderne.','Les murs en béton banché {{localisation}} seront exécutés suivant NF P 18-210 / DTU 23.1 dans son domaine et NF DTU 21 applicable. Définir reprises, réservations, joints, parements, tolérances et contrôles par l’étude et les plans. '+concrete,[en206]);
profile('masonry','Maçonnerie de petits éléments',['FR_DTU_20_1'],[],'NF DTU 20.1 (2020) : quatre parties. Le seuil général de 0,50 m² n’est pas vérifié ; préciser les déductions au marché.','Les maçonneries {{type_elements}} seront exécutées dans le domaine du NF DTU 20.1 de juillet 2020, avec matériaux choisis suivant P1-2, exécution suivant P1-1 et dispositions constructives applicables de P3. Définir nature, épaisseur, performances mécaniques, mortier, joints, liaisons, protection contre l’humidité et points singuliers suivant l’étude et les plans. Aucune classe de bloc, aucun dosage et aucun seuil de baie ne sont déduits du seul intitulé.');
profile('dallage','Dallages',['FR_DTU_13_3'],[],'NF DTU 13.3 : choisir P1-1-1 hors maisons ou P1-1-2 maisons. Un dallage n’est pas une dalle portée.','Le dallage sur terre-plein {{localisation}} sera conçu et exécuté dans le domaine du NF DTU 13.3 de décembre 2021. Choisir le CCT P1-1-1 ou P1-1-2 selon le cas, avec P1-2 et P2 applicables ; les deux CCT ne sont pas cumulés par défaut. Préciser charges, étude du support, couches, isolation, joints, épaisseur, béton et contrôles suivant les études. Une dalle portée nécessite un référentiel distinct.');
profile('predalle','Planchers à prédalles',['FR_DTU_23_4','FR_DTU_21'],['FR-TRANSITION-BAEL-EC2'],'NF DTU 23.4 : prédalles industrialisées dans son domaine ; ne pas remplacer par le DTU 23.2 des dalles alvéolées.','Les planchers à prédalles industrialisées {{systeme}} relèveront du NF DTU 23.4 de juillet 2021 dans son domaine, complété par les prescriptions applicables du NF DTU 21 et l’étude du système. Définir prédalles, béton complémentaire, appuis, étaiement, liaisons et trémies suivant les plans et la justification structurelle.');
profile('poutrelles','Planchers à poutrelles et entrevous',['FR_DTU_23_5','FR_DTU_21'],['FR-TRANSITION-BAEL-EC2'],'Choisir le système et le domaine du NF DTU 23.5 ; une hauteur 12+4 du cours n’est pas un dimensionnement.','Les planchers à poutrelles et entrevous {{systeme}} seront exécutés dans le domaine du NF DTU 23.5 applicable et suivant les plans de pose et l’étude structure. Définir entrevous, béton complémentaire, appuis, étaiement, chaînages et trémies ; vérifier les dispositions particulières du système et ses justificatifs.');
profile('alveole','Planchers à dalles alvéolées',['FR_DTU_23_2','FR_DTU_21'],['FR-TRANSITION-BPEL-EC2'],'Le NF DTU 23.2 vise les dalles alvéolées, pas tous les planchers préfabriqués.','Les planchers à dalles alvéolées préfabriquées {{systeme}} relèveront du NF DTU 23.2 d’août 2008 dans son domaine et de l’étude du système. Définir appuis, joints, manutention, béton complémentaire et trémies ; aucune découpe ou réservation ne sera déduite d’un simple ratio pédagogique.');
profile('cuvelage','Cuvelages',['FR_DTU_14_1'],[],'Cuvelage : choisir système, niveau d’eau et domaine du NF DTU 14.1 ; ne pas l’assimiler à un simple enduit.','Le cuvelage {{systeme}} sera défini suivant les niveaux d’eau de l’étude, l’usage des locaux et le NF DTU 14.1 de novembre 2020 dans son domaine. Préciser support, continuités, joints, traversées, points singuliers, interfaces structurelles et contrôles avant recouvrement.');
profile('anc','Assainissement non collectif',['FR_DTU_64_1'],['VRD-REG-ANC-TECHNIQUE','VRD-REG-ANC-CONTROLE'],'Vérifier le domaine du DTU 64.1 et la filière : une microstation ne devient pas traditionnelle par changement d’étiquette.','Définir la filière {{filiere_ANC}} à partir de la charge, de l’étude de sol et des prescriptions techniques réglementaires applicables. Employer le NF DTU 64.1 d’août 2013 uniquement dans son domaine ; contrôler l’agrément éventuel du dispositif et les conditions du service compétent. Organiser contrôle de conception et d’exécution, accès d’entretien et réception avant remblaiement.');
profile('sewer','Réseaux et ouvrages d’assainissement',[],['VRD-REG-ASSAIN-CADRE','VRD-REG-ASSAIN-1994','VRD-REG-DT-DICT'],'Séparer réseaux, traitement collectif et ANC ; le fascicule CCTG dépend du marché et du type d’ouvrage.','Les réseaux {{EU_EV_EP}} seront définis suivant profils, débits et prescriptions du gestionnaire. Préciser matériaux, diamètres, pentes, classe de résistance, lit de pose, assemblages, regards, essais et conditions de réception. Retenir les parties du CCTG 70 pertinentes si le marché s’y réfère, sans appliquer au réseau extérieur tous les DTU de plomberie du bâtiment. La réglementation du traitement dépend de la capacité et du système concernés.');
profile('building-water','Calcul des installations sanitaires du bâtiment',['FR_DTU_60_11'],[],'NF DTU 60.11 : P2 traite le calcul EU/EV ; ce n’est pas un CCS. Vérifier le domaine bâtiment / réseau extérieur.','Pour les installations sanitaires du bâtiment {{reseau}}, choisir les parties de calcul du NF DTU 60.11 d’août 2013 correspondant à l’alimentation, au bouclage, à EU/EV ou à EP. Définir interfaces avec les réseaux extérieurs et les prescriptions d’exécution séparément ; ces parties de calcul ne constituent pas des CCS de règlement.');
profile('network','Réseaux extérieurs / voirie / équipement',[],['VRD-REG-DT-DICT'],'Normes du produit et du réseau à préciser ; une référence de sécurité ne valide ni section ni règle de métré.','Pour {{reseau_ou_equipement}}, préciser le système, les caractéristiques, l’implantation, les interfaces concessionnaires et les essais selon les études et le marché. Organiser le repérage des réseaux existants et les obligations DT-DICT de chaque intervenant. Les règles particulières de produit et d’exécution restent à sélectionner ; aucun système ancien du cours n’est présumé autorisé.');
profile('steel','Armatures / treillis',[],['FR-TRANSITION-BAEL-EC2'],'Les anciens tableaux de treillis et ratios kg/m³ ne sont pas une nomenclature de ferraillage actuelle.','Les armatures {{type_acier}} seront définies par les plans et nomenclatures du bureau d’études, avec nuance, ductilité, diamètres, façonnage, assemblages et enrobages requis. Vérifier les normes de produit correspondant aux barres, couronnes ou treillis et leurs domaines ; ne pas utiliser le seul nom commercial d’un ancien tableau ni un ratio de pré-dimensionnement pour commander.');
profile('thermal','Isolation / interfaces thermiques',[],['FR-TRANSITION-RT2012-RE2020'],'RE2020 selon usage, date et travaux : ne pas supprimer rétroactivement RT2012 ni dimensionner l’isolant par une valeur de cours.','Les performances de {{isolation_ou_interface}} découleront de l’étude thermique et environnementale applicable au bâtiment, selon sa date, son usage et la nature des travaux. Préciser résistance thermique, continuité, ponts thermiques, compatibilité et conditions de mise en œuvre du système ; une référence RE2020 ne fixe pas à elle seule une épaisseur d’isolant.');
const pMap=new Map(profileList.map(p=>[p.id,p]));
function classify(o,lot){
  const t=o.designation_courte.toLowerCase(),r=o.clause_cctp.normes_dtu.join(' '),c=o.code;
  if(/cuvelage/.test(t))return 'cuvelage';
  if(/isolation|isolant/.test(t))return 'thermal';
  if(/sondage|reconnaissance|pénétrom|pressiom|carottage/.test(t))return 'geotech';
  if(lot==='01'){
    if(/^(TVRD-5\.(?:3[2-9]|4[0-7])(?:\.|$))/.test(c))return 'anc';
    if(/DTU 64\.1/.test(r)&&!t.includes('général'))return 'anc';
    if(/^TVRD-5\./.test(c)||/assainissement|eaux usées|eaux pluviales|eaux vannes|égout/.test(t))return 'sewer';
    if(/^TVRD-[1234]\./.test(c)||/fouille|décapage|remblai|terrassement|assèchement/.test(t))return 'earth';
    if(/^TVRD-7\./.test(c))return 'network';
    return 'general';
  }
  if(/prédalle/.test(t))return 'predalle';
  if(/alvéolée/.test(t))return 'alveole';
  if(/plancher.*poutrelles.*entrevous/.test(t))return 'poutrelles';
  if(/béton banché/.test(t))return 'banché';
  if(/treillis|armatures|aciers principaux/.test(t))return 'steel';
  if(/^GO-P/.test(c)||/pieu|micropieu/.test(t))return 'deep';
  if(/blindage|assèchement|palplanches|compactage|cylindrage|stabilisation du sol|silicatisation|cimentation du sol/.test(t))return 'earth';
  if(/DTU 13\.(11|12)/.test(r))return 'shallow';
  if(/dallage|NF P 11-213/.test(t+' '+r))return 'dallage';
  if(/maçonnerie|bbm|briques|moellons|béton cellulaire/.test(t))return 'masonry';
  if(/DTU 20\.1/.test(r)&&!/DTU 21/.test(r))return 'masonry';
  if(/béton|coffrage|escalier/.test(t)||/DTU 21/.test(r))return 'concrete';
  return 'general';
}
const proofMap=new Map(proofs.ouvrages.map(p=>[p.code,p]));
const mapping={};
const lots=course.lots.slice(0,2).map(l=>({lot_numero:l.numero_lot,lot_nom:l.nom_lot,ouvrages_normes:l.ouvrages.map(o=>{
  const profileId=classify(o,l.numero_lot),p=pMap.get(profileId),old=o.clause_cctp.normes_dtu;
  const audits=old.map(ref=>byRef.get(compact(ref))).filter(Boolean);
  const product=audits.filter(a=>!a.familles_dtu.length&&!transitionFor(a.reference_cours)&&!/^Eurocode|^CPT|CCTG/.test(a.reference_cours));
  const extra=product.flatMap(a=>a.references_proposees.map(code=>({code,titre:oldSources.get(previous.normes.find(n=>n.reference_cours===a.reference_cours)?.sources[0])?.titre||code,role_cctp:a.controle,statut:a.statut,source_url:sources.find(s=>s.id===a.sources[0])?.url||'',conditions:'Référence citée dans le cours : choisir le produit et vérifier son domaine pour cette prestation.'})));
  const source=proofMap.get(o.code);
  const warning=p.alerte_interface_site+(audits.some(a=>/non.v[eé]rifi|non.r[eé]solu/i.test(a.statut))?' Référence du cours non vérifiée : aucune substitution automatique.':'');
  mapping[o.code]={profil:profileId,references_auditees:audits.map(a=>a.id)};
  return {code_ouvrage:o.code,designation:o.designation_courte,
    statut_audit:profileId==='general'?'RÉFÉRENCES AUDITÉES ; DOMAINE OUVRAGE À PRÉCISER':'ACTUALISATION PROPOSÉE SELON DOMAINE ; CLAUSES INTÉGRALES NON CERTIFIÉES',
    ancienne_norme_cours:old.join(' ; ')||'Aucune référence normative explicite sur cette fiche du cours.',
    normes_en_vigueur:[...p.normes_en_vigueur,...extra],
    regle_metre_officielle_ccs:p.regle_metre_officielle_ccs,alerte_interface_site:warning,
    paragraphe_cctp_pret_a_inserer:o.designation_courte+' — '+p.paragraphe_cctp_pret_a_inserer,
    parties_nf_dtu:p.parties_nf_dtu,parties_nf_dtu_citees_cours:[...new Set(audits.flatMap(a=>a.familles_dtu))].map(id=>byFamily.get(id)),statut_regle_metre:p.statut_regle_metre,
    seuil_deduction_m2:null,seuil_deduction_m3:null,
    impact_metre:p.impact_metre,impact_mise_en_oeuvre:p.impact_mise_en_oeuvre,
    conditions_application:p.conditions_application,rattachement:'Domaine proposé à partir du libellé et des références du cours ; validation de l’étude et du marché nécessaire.',
    profil_normatif:profileId,audit_references_cours:audits,source_cours:source,
    sources:[...new Set(p.sources.concat(audits.flatMap(a=>a.sources)))]};
})}));
const metadata={version,verifie_le:date,lots:['01','02'],ouvrages:lots.reduce((n,l)=>n+l.ouvrages_normes.length,0),
  perimetre:'Les trois PDF sont inventoriés ; cette livraison rapproche les 554 fiches et les 54 références distinctes de la base des lots01/02, avec compléments réglementaires. Les autres lots restent à auditer. Le repérage textuel de 514 pages n’est pas une certification exhaustive des citations, schémas ou notes.',
  limites:['Notices AFNOR/CSTB : statut, édition et domaine ; texte normatif intégral non consulté pour certifier les clauses internes de métré.','Aucun seuil français de déduction n’a été inventé, notamment 0,05m³ pour DTU21P2 ou 0,50m² pour DTU20.1.','Le statut de certaines notices Eurocodes contredit leur date d’annulation : génération et annexe nationale à confirmer avec le bureau d’études.','Les textes CCTP sont des trames originales à compléter et relire, pas des extraits officiels des normes.','Un rattachement par désignation est une proposition de domaine, pas une décision de dimensionnement.']};
const audit={metadata,sources,registre_references:registry,familles_dtu:families,transitions_et_reglements:[...transitions,...vrd,...Object.values(legal)],inventaire_livres:{fichier:'inventaire-normatif-livres.json',statut:'repérage textuel à rapprocher des références ; autres lots en attente'},synthese:{fiches:metadata.ouvrages,references_base:registry.length,familles_dtu:families.length,parties_et_amendements:families.reduce((n,f)=>n+f.parties.length,0),transitions_et_reglements:transitions.length+vrd.length+Object.values(legal).length}};
write('../public/data/referentiel-normatif-france-lots01-02.json',{referentiel_normatif_france:lots,metadata,sources});
write('../public/data/audit-normatif-france.json',audit);
// Index compact : profils partagés + correspondances, sans dupliquer 554 fiches
// et sans charger le registre complet au survol ou à chaque frappe.
write('../public/data/normative-fr-index.json',{metadata,sources,profils:Object.fromEntries(profileList.map(p=>[p.id,p])),ouvrages:mapping,references:Object.fromEntries(registry.map(r=>[r.id,r]))});
console.log(JSON.stringify(audit.synthese));
