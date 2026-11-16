import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtemp,rm,writeFile,stat} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {isDemoUrl,createDemoStore} from '../public/demo-mode.js';
import {createDemoProject} from '../public/demo-project.js';
import {TUTORIAL_MEDIA,tutorialMedia} from '../public/tutorial-media.js';
import {TUTORIAL_SECTIONS} from '../ux/tutorial-model.js';
import {VIDEO_SCENARIOS} from '../scripts/video/scenarios.mjs';
import {demoRecordingUrl,runProcess,mediaDuration,montageArgs,captionsFor} from '../scripts/video/core.mjs';

test('la démo est explicite et le robot refuse une adresse de production',()=>{
  assert.ok(isDemoUrl('https://example.test/?demo=true'));assert.ok(!isDemoUrl('https://example.test/?demo=false'));
  assert.ok(!isDemoUrl('https://example.test/?demo=1'));assert.ok(!isDemoUrl('invalide'));
  assert.equal(demoRecordingUrl('http://localhost:5173/ancien?x=1'),'http://localhost:5173/?demo=true');
  for(const url of ['https://example.test','http://example.test','http://user:secret@localhost:5173'])assert.throws(()=>demoRecordingUrl(url));
});
test('le stockage démo travaille par copies et conserve les plans uniquement en mémoire',async()=>{
  const initial={version:1,title:'Fictif',rows:[]},events=[];
  const store=createDemoStore(initial,{onStatus:e=>events.push(e)});
  const first=await store.load();first.title='Modification';assert.equal((await store.load()).title,'Fictif');
  store.schedule(first);first.title='Nouvelle mutation';await store.flush();assert.equal((await store.load()).title,'Modification');
  assert.equal(initial.title,'Fictif');assert.equal(store.hasPending(),false);assert.equal(events[0].demo,true);
  const file=new Blob(['plan']);await store.putAsset('demo',file);assert.equal(await store.getAsset('demo'),file);
  await store.dispose();assert.equal(await store.getAsset('demo'),null);
});
test('la branche de démonstration ne touche aucune API, aucun localStorage et aucune IndexedDB',()=>{
  const result=spawnSync(process.execPath,['--input-type=module','-e',`
    globalThis.location={href:'http://localhost/?demo=true'};
    const forbidden=()=>{throw new Error('Accès persistant interdit');};
    Object.defineProperty(globalThis,'localStorage',{get:forbidden});
    Object.defineProperty(globalThis,'indexedDB',{get:forbidden});
    globalThis.fetch=forbidden;
    const {preferenceStore,createDemoStore}=await import('./public/demo-mode.js');
    const {initCloud}=await import('./public/cloud.js');
    let p={rows:[],revisions:[]};const cloud=initCloud({get:()=>p,empty:()=>({rows:[]}),replace:n=>p=n,onStatus:()=>{}});
    await cloud.ready;await cloud.connect();cloud.changed();await cloud.flush();await cloud.saveAsset(new Blob(['x']));await cloud.create();
    preferenceStore.setItem('atelier-theme','dark');if(preferenceStore.getItem('atelier-theme')!=='dark')throw new Error('Préférence perdue');
    const store=createDemoStore(p);store.schedule(p);await store.load();await store.putAsset('x',new Blob(['y']));await store.getAsset('x');await store.flush();
  `],{cwd:new URL('..',import.meta.url),encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
});
test('le garage fictif est cohérent et indépendant entre deux ouvertures',()=>{
  const a=createDemoProject(),b=createDemoProject();assert.equal(a.rows.length,6);assert.equal(a.cloudId,null);
  assert.equal(a.rows.find(r=>r.code==='GO-V02').result.total,40.065);
  assert.equal(a.rows.find(r=>r.code==='DL01').result.total,2.4192);
  a.rows[0].label='Modifié';assert.notEqual(a.rows[0].label,b.rows[0].label);
  assert.equal(a.planWorkspace.assetId,'demo-garage-plan');
});
test('douze capsules distinctes correspondent exactement aux douze séquences du lecteur',()=>{
  assert.deepEqual(TUTORIAL_MEDIA.map(s=>s.id),TUTORIAL_SECTIONS.map(s=>s.id));
  assert.equal(new Set(TUTORIAL_MEDIA.map(s=>s.url)).size,12);assert.equal(tutorialMedia('inconnu'),null);
  for(const s of VIDEO_SCENARIOS){assert.ok(s.url.startsWith('/videos/'));assert.ok(s.narration.length>200);assert.ok(s.narration.length<4096);}
});
test('le montage conserve toutes les actions et adapte la capture à la narration',()=>{
  const args=montageArgs({video:'capture.webm',audio:'voix.mp3',output:'fini.mp4',duration:12,offset:2,captureDuration:24});
  assert.match(args[args.indexOf('-vf')+1],/scale=1280:720/);assert.match(args[args.indexOf('-vf')+1],/setpts=\(PTS-STARTPTS\)\*0.5/);
  assert.equal(args[args.indexOf('-t')+1],'12');assert.ok(args.includes('+faststart'));
  assert.throws(()=>montageArgs({duration:0}));assert.throws(()=>montageArgs({duration:3,captureDuration:0}));
});
test('les sous-titres sont des VTT valides, bornés à la durée audio',()=>{
  const vtt=captionsFor('Bonjour. Ceci est une démonstration de métré.',8.5);
  assert.ok(vtt.startsWith('WEBVTT\n'));assert.match(vtt,/00:00:00.000 --> 00:00:08.500/);
});
test('FFmpeg produit réellement une vidéo HD lisible avec une piste audio',{timeout:30000},async t=>{
  const bin=process.env.FFMPEG_PATH||'ffmpeg';if(spawnSync(bin,['-version']).status!==0){t.skip('FFmpeg absent de cet environnement');return;}
  const dir=await mkdtemp(path.join(os.tmpdir(),'atelier-video-'));
  try{
    const video=path.join(dir,'capture.webm'),audio=path.join(dir,'voix.wav'),output=path.join(dir,'resultat.mp4');
    await runProcess(bin,['-hide_banner','-loglevel','error','-y','-f','lavfi','-i','color=c=navy:s=640x360:r=10','-t','2','-c:v','libvpx','-b:v','100k',video]);
    await runProcess(bin,['-hide_banner','-loglevel','error','-y','-f','lavfi','-i','sine=frequency=440:sample_rate=48000','-t','1','-c:a','pcm_s16le',audio]);
    await runProcess(bin,montageArgs({video,audio,output,duration:2,captureDuration:2}));
    assert.ok((await stat(output)).size>1024);assert.ok(Math.abs(await mediaDuration(bin,output)-2)<.15);
    const {err}=await runProcess(bin,['-hide_banner','-i',output,'-t','0','-f','null','-']);
    assert.match(err,/1280x720/);assert.match(err,/Audio: aac/);assert.match(err,/Video: h264/);
  }finally{await rm(dir,{recursive:true,force:true});}
});
