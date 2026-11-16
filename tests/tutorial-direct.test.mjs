import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,mkdtemp,rm} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {build} from 'esbuild';
import {chapterVideoAsset,TUTORIAL_MEDIA} from '../public/tutorial-media.js';
import {TUTORIAL_SECTIONS} from '../ux/tutorial-model.js';

test('les douze sous-chapitres pointent vers les noms de MP4 attendus dans /videos/',()=>{
  const expected=[
    '01_decouverte_workspace','02_mode_france_luxembourg','03_raccourcis_clavier',
    '04_import_plan_etalonnage','05_traces_surfaces_deductions','06_saisie_sans_plan_import_cao',
    '07_verification_normes_dtu','08_generation_export_cctp','09_verificateur_oublis_audit',
    '10_chiffrage_dpgf_excel','11_bon_commande_materiaux','12_cas_pratique_complet',
  ];
  assert.equal(TUTORIAL_SECTIONS.length,12);
  for(let i=0;i<12;i++){
    const asset=chapterVideoAsset(TUTORIAL_SECTIONS[i].id);
    assert.equal(asset.url,'/videos/'+expected[i]+'.mp4');
    assert.equal(asset.position,0);assert.equal(asset.kind,'chapter');
  }
  assert.equal(new Set(TUTORIAL_MEDIA.map(m=>m.url)).size,12);
  assert.equal(chapterVideoAsset('inconnu'),null);
});
test('le composant ouvre directement un lecteur MP4 dès son premier rendu',async()=>{
  const parent=path.resolve('.sites-runtime');await mkdir(parent,{recursive:true});
  const directory=await mkdtemp(path.join(parent,'direct-reader-'));
  try {
    const output=path.join(directory,'reader.mjs');
    await build({entryPoints:['ux/TutorielVideoSite.jsx'],bundle:true,format:'esm',platform:'node',jsx:'automatic',outfile:output,external:['react','react-dom','lucide-react'],logLevel:'silent'});
    const {default:Reader}=await import(pathToFileURL(output).href);
    const html=renderToStaticMarkup(React.createElement(Reader,{onFermer:()=>{}}));
    assert.match(html,/<video[^>]+src="\/videos\/01_decouverte_workspace\.mp4"/);
    assert.match(html,/preload="auto"/);
    assert.ok(!html.includes('pas encore été générée'));
    assert.ok(!html.includes('Vidéo à générer'));
    assert.ok(!html.includes('Vérification de la vidéo'));
    assert.match(html,/data-tour="tutorial-sc-1-2"/);
  }finally{await rm(directory,{recursive:true,force:true});}
});
