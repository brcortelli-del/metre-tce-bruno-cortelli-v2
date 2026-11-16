#!/usr/bin/env node
// Outil Node local : il ne fait pas partie du code exécuté dans le navigateur
// ou dans le Worker d'hébergement du site.
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {mkdir,writeFile,copyFile,rename,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {VIDEO_SCENARIOS,runScenario} from './video/scenarios.mjs';
import {demoRecordingUrl,runProcess,mediaDuration,montageArgs,captionsFor,assertPublishable} from './video/core.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const args=new Set(process.argv.slice(2)),value=key=>process.argv.find(a=>a.startsWith(key+'='))?.slice(key.length+1);
const voice=value('--voice')||process.env.EDGE_TTS_VOICE||'fr-FR-DeniseNeural';
const url=demoRecordingUrl(value('--url')||process.env.URL_SITE||'http://127.0.0.1:5173');
const output=path.join(ROOT,'public/videos'),temp=path.join(ROOT,'.video-build');
const python=process.env.PYTHON_BIN||(process.platform==='win32'?'python':'python3');
const selected=value('--only')?VIDEO_SCENARIOS.filter((_,i)=>i+1===Number(value('--only'))):VIDEO_SCENARIOS;
if(!selected.length)throw new Error('--only attend un numéro de 1 à 12.');
if(!/^fr-FR-(Denise|Henri)Neural$/.test(voice))throw new Error('Voix admises : fr-FR-DeniseNeural ou fr-FR-HenriNeural.');

async function installCursor(page) {
  await page.evaluate(()=>{
    const cursor=document.createElement('div');cursor.id='tour-cursor';
    cursor.style.cssText='position:fixed;left:32px;top:80px;width:18px;height:18px;border-radius:50%;background:#ef4444;border:2px solid white;box-shadow:0 1px 8px #0008;pointer-events:none;z-index:2147483647;transform:translate(-50%,-50%)';
    document.body.appendChild(cursor);
    addEventListener('mousemove',e=>{cursor.style.left=e.clientX+'px';cursor.style.top=e.clientY+'px';});
    addEventListener('mousedown',()=>{cursor.style.transform='translate(-50%,-50%) scale(1.5)';cursor.style.background='#2563eb';});
    addEventListener('mouseup',()=>{cursor.style.transform='translate(-50%,-50%)';cursor.style.background='#ef4444';});
  });
}
async function recordScenario(browser,scenario,index,work) {
  const context=await browser.newContext({viewport:{width:1280,height:720},recordVideo:{dir:work,size:{width:1280,height:720}},locale:'fr-FR',acceptDownloads:true});
  const apiAttempts=[];
  await context.route('**/api/**',route=>{apiAttempts.push(route.request().url());return route.abort('blockedbyclient');});
  let page,video,created,offset,captureDuration;
  try {
    created=performance.now();page=await context.newPage();video=page.video();
    page.setDefaultTimeout(20000);
    await page.goto(url,{waitUntil:'domcontentloaded',timeout:45000});
    await page.locator('[data-tour="demo-banner"]').waitFor();
    await page.locator('[data-tour="nav-plan"]').waitFor();
    await installCursor(page);
    const hold=ms=>page.waitForTimeout(ms);
    const clickLocator=async locator=>{
      await locator.waitFor({state:'visible'});
      if(await locator.count()!==1)throw new Error('Commande de visite ambiguë.');
      if(!await locator.isEnabled())throw new Error('Commande désactivée : '+await locator.innerText());
      await locator.scrollIntoViewIfNeeded();const box=await locator.boundingBox();
      if(!box)throw new Error('Commande hors écran.');
      await page.mouse.move(box.x+box.width/2,box.y+box.height/2,{steps:22});await hold(180);
      await locator.click();await hold(500);
    };
    const click=name=>clickLocator(page.locator('[data-tour="'+name+'"]'));
    const nav=async name=>{await click('nav-'+name);await page.locator('body[data-view="'+name+'"]').waitFor();};
    const fill=async(selector,value)=>{const field=page.locator(selector);await field.waitFor();if(await field.count()!==1)throw new Error('Champ ambigu : '+selector);await field.scrollIntoViewIfNeeded();await field.fill(value);await hold(400);};
    const point=async(x,y)=>{
      const canvas=page.locator('[data-tour="plan-canvas"]');await canvas.scrollIntoViewIfNeeded();
      const box=await canvas.boundingBox();if(!box)throw new Error('Plan indisponible.');
      await page.mouse.move(box.x+x/1200*box.width,box.y+y/850*box.height,{steps:24});await page.mouse.down();await hold(100);await page.mouse.up();await hold(350);
    };
    const calibrate=async()=>{await page.locator('#planName').filter({hasNotText:'Aucun plan'}).waitFor();await page.locator('#planEmpty').waitFor({state:'hidden'});await click('plan-calibrate');await point(240,165);await point(960,165);await fill('#referenceLength','6');await click('plan-validate-scale');await page.locator('#scaleStatus').filter({hasText:'Échelle définie'}).waitFor();};
    offset=Math.max(0,(performance.now()-created)/1000-.15);
    const start=performance.now();await runScenario(index,{page,click,nav,fill,hold,point,calibrate,root:ROOT,temp:work,clickLocator});await hold(900);
    captureDuration=(performance.now()-start)/1000;
    if(apiAttempts.length)throw new Error('Le mode démo a tenté une communication avec les API de chantier. Enregistrement refusé.');
    const planError=page.locator('#planError');
    if(await planError.isVisible())throw new Error('Le relevé a signalé une erreur : '+await planError.innerText());
  } catch(error) {
    await page?.screenshot({path:path.join(work,'echec.png')}).catch(()=>{});throw error;
  } finally { await context.close(); } // Ferme et finalise réellement le WebM.
  return {video:await video.path(),offset,captureDuration};
}
async function main() {
  if(args.has('--dry-run')) {
    console.log(JSON.stringify({url,voice,resolution:'1280x720',apiKeyRequired:false,networkRequiredForVoice:true,output,scenarios:selected.map(s=>({id:s.id,file:s.stem+'.mp4',characters:s.narration.length}))},null,2));return;
  }
  const require=createRequire(path.join(ROOT,'tools/video-generator/package.json'));
  let ffmpeg,chromium;
  try {ffmpeg=process.env.FFMPEG_PATH||require('ffmpeg-static');if(!args.has('--audio-only'))({chromium}=require('playwright'));}
  catch {throw new Error('Installe les outils : npm install --prefix tools/video-generator ; puis npx --prefix tools/video-generator playwright install chromium.');}
  await runProcess(ffmpeg,['-version']);
  await runProcess(python,['-c','import edge_tts']);
  await mkdir(output,{recursive:true});await mkdir(temp,{recursive:true});
  let browser;
  try {
    // Aucune session ni aucun profil utilisateur n'est réutilisé.
    if(chromium)browser=await chromium.launch({headless:!args.has('--visible')});
    for(const scenario of selected) {
      const index=VIDEO_SCENARIOS.findIndex(s=>s.id===scenario.id);
      console.log(`[${index+1}/12] ${scenario.stem} — synthèse Edge`);
      const work=path.join(temp,scenario.stem);await mkdir(work,{recursive:true});
      const hash=createHash('sha256').update(voice+'\n'+scenario.narration).digest('hex');
      const audio=path.join(work,hash+'.mp3'),text=path.join(work,'narration.txt');
      await writeFile(text,scenario.narration,'utf8');
      let cached=false;try{cached=(await stat(audio)).size>512;}catch{}
      if(!cached)await runProcess(python,[path.join(ROOT,'scripts/video/synthese.py'),'--text-file',text,'--voice',voice,'--output',audio],{timeout:100000});
      const audioDuration=await mediaDuration(ffmpeg,audio);if(audioDuration<1)throw new Error('Narration trop courte.');
      await copyFile(audio,path.join(output,scenario.stem+'.mp3'));
      if(args.has('--audio-only'))continue;
      console.log(`[${index+1}/12] enregistrement du site de démonstration`);
      const capture=await recordScenario(browser,scenario,index,work);
      const duration=Math.ceil(audioDuration+.5),staging=path.join(work,'montage.mp4');
      await runProcess(ffmpeg,montageArgs({...capture,audio,output:staging,duration}),{timeout:300000});
      await assertPublishable(staging);const actualDuration=await mediaDuration(ffmpeg,staging);
      if(Math.abs(actualDuration-duration)>.2)throw new Error('Durée du montage incohérente.');
      await writeFile(path.join(output,scenario.stem+'.vtt'),captionsFor(scenario.narration,audioDuration),'utf8');
      // Les fichiers temporaires ne remplacent jamais une capsule correcte.
      await copyFile(staging,path.join(output,scenario.stem+'.mp4.part'));
      await rename(path.join(output,scenario.stem+'.mp4.part'),path.join(output,scenario.stem+'.mp4'));
      await writeFile(path.join(work,'resultat.json'),JSON.stringify({id:scenario.id,duration:actualDuration,voice,sha256:hash}));
      console.log(`[${index+1}/12] terminé — ${actualDuration} s`);
    }
    console.log(args.has('--audio-only')?'Narrations MP3 terminées.':'Capsules terminées. Contrôle public/videos avant de publier le site privé.');
  } finally {await browser?.close();}
}
main().catch(error=>{console.error('Génération interrompue : '+error.message+'\nLes capsules déjà terminées sont conservées. Vérifie Python, edge-tts, Chromium et la connexion Internet.');process.exitCode=1;});
