// Contrat partagé entre le générateur Node et le lecteur du site.
export const TUTORIAL_MEDIA = [
  ['sc-1-1','01_decouverte_workspace'],['sc-1-2','02_mode_france_luxembourg'],
  ['sc-1-3','03_raccourcis_clavier'],['sc-2-1','04_import_plan_etalonnage'],
  ['sc-2-2','05_traces_surfaces_deductions'],['sc-2-3','06_saisie_sans_plan_import_cao'],
  ['sc-3-1','07_verification_normes_dtu'],['sc-3-2','08_generation_export_cctp'],
  ['sc-4-1','09_verificateur_oublis_audit'],['sc-4-2','10_chiffrage_dpgf_excel'],
  ['sc-4-3','11_bon_commande_materiaux'],['sc-5-1','12_cas_pratique_complet'],
].map(([id,stem])=>({id,stem,url:'/videos/'+stem+'.mp4',captions:'/videos/'+stem+'.vtt'}));
export function tutorialMedia(id) { return TUTORIAL_MEDIA.find(item=>item.id===id) ?? null; }
// Une sélection correspond directement à un fichier : aucune requête HEAD
// et aucun manifeste distant ne retardent le geste de lecture.
export function chapterVideoAsset(id) {
  const media=tutorialMedia(id);
  return media ? {id:'chapter-'+id,url:media.url,name:media.stem+'.mp4',kind:'chapter',sectionId:id,captions:media.captions,position:0} : null;
}
