import test from 'node:test';
import assert from 'node:assert/strict';
import {TUTORIAL_PROGRAMME,TUTORIAL_SECTIONS,PLANNED_DURATION,formatTutorialTime,parseTutorialTime,validateTutorialTimings,timedTutorialSections,tutorialSectionAtTime,tutorialCanSeek,validateTutorialFile,restoreTutorialProgress} from '../ux/tutorial-model.js';

const starts=()=>Object.fromEntries(TUTORIAL_SECTIONS.map(s=>[s.id,s.start]));
test('programme continu : cinq chapitres, douze séquences et durée indicative cohérente',()=>{
  assert.equal(TUTORIAL_PROGRAMME.length,5);assert.equal(TUTORIAL_SECTIONS.length,12);assert.equal(new Set(TUTORIAL_SECTIONS.map(s=>s.id)).size,12);
  TUTORIAL_SECTIONS.forEach((s,i)=>assert.equal(s.start+s.duration,TUTORIAL_SECTIONS[i+1]?.start??PLANNED_DURATION));
  assert.equal(formatTutorialTime(PLANNED_DURATION),'22:35');
});
test('position de lecture : frontières exactes, retour arrière et fins de vidéo',()=>{
  const sections=timedTutorialSections();
  assert.equal(tutorialSectionAtTime(sections,74.99).id,'sc-1-1');assert.equal(tutorialSectionAtTime(sections,75).id,'sc-1-2');
  assert.equal(tutorialSectionAtTime(sections,905).id,'sc-4-2');assert.equal(tutorialSectionAtTime(sections,0).id,'sc-1-1');
  assert.equal(tutorialSectionAtTime(sections,Infinity).id,'sc-1-1');assert.equal(tutorialSectionAtTime(sections,1800).id,'sc-5-1');
});
test('repères personnalisés : ordre strict, format et compatibilité avec la durée',()=>{
  const custom=starts();custom['sc-1-2']=80;
  assert.equal(validateTutorialTimings(custom,{duration:1356})['sc-1-2'],80);
  const sections=timedTutorialSections(custom);assert.equal(tutorialSectionAtTime(sections,79).id,'sc-1-1');assert.equal(tutorialSectionAtTime(sections,80).id,'sc-1-2');
  assert.throws(()=>validateTutorialTimings({...custom,'sc-1-1':1}));assert.throws(()=>validateTutorialTimings({...custom,'sc-1-2':165}));
  assert.throws(()=>validateTutorialTimings(custom,{duration:1135}));assert.throws(()=>validateTutorialTimings({...custom,'sc-4-1':NaN}));
});
test('horodatages : heures, minutes, secondes et erreurs de saisie',()=>{
  assert.equal(parseTutorialTime('22:35'),1355);assert.equal(parseTutorialTime('01:01:02'),3662);assert.equal(formatTutorialTime(3662),'01:01:02');
  assert.equal(formatTutorialTime(-1),'00:00');assert.equal(formatTutorialTime(NaN),'00:00');
  for(const raw of ['00:60','1:99','01:60:00','-01:00','abc','99:59:59'])assert.throws(()=>parseTutorialTime(raw));
});
test('vidéo courte : aucun saut silencieux à une position hors durée',()=>{
  const sections=timedTutorialSections();assert.ok(tutorialCanSeek(sections[0],10));assert.ok(!tutorialCanSeek(sections[1],10));assert.ok(!tutorialCanSeek(sections[0],NaN));
});
test('vidéos locales : contrôle de taille et extension avant création de Blob URL',()=>{
  assert.ok(validateTutorialFile({name:'cours.MP4',size:4096}));assert.ok(validateTutorialFile({name:'cours.webm',size:4096}));
  assert.throws(()=>validateTutorialFile({name:'cours.html',size:10}));assert.throws(()=>validateTutorialFile({name:'cours.mp4',size:0}));assert.throws(()=>validateTutorialFile({name:'cours.mp4',size:2**31}));
});
test('progression robuste : filtrage des identifiants, doublons et données corrompues',()=>{
  const restored=restoreTutorialProgress(JSON.stringify({version:1,selectedId:'sc-4-2',completed:['sc-1-1','sc-1-1','inconnu'],starts:starts()}));
  assert.equal(restored.selectedId,'sc-4-2');assert.deepEqual(restored.completed,['sc-1-1']);
  assert.equal(restoreTutorialProgress('{').selectedId,'sc-1-1');assert.equal(restoreTutorialProgress({version:99}).completed.length,0);
  assert.equal(restoreTutorialProgress({version:1,selectedId:'inconnu',completed:'incorrect',starts:{}}).selectedId,'sc-1-1');
  assert.deepEqual(restoreTutorialProgress({version:1,starts:{'sc-1-1':99}}).starts,{});
});
