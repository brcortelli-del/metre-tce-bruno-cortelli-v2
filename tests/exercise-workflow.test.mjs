import test from 'node:test';
import assert from 'node:assert/strict';
import {EXERCISE_STEPS,workflowKey,readProgress,cleanProgress,stepComplete,workflowSummary} from '../ux/exercise-workflow-model.js';
test('Une checklist ne valide une étape qu’après les trois contrôles, et reste réversible',()=>{
 const step=EXERCISE_STEPS[0],p=cleanProgress(null);
 assert.equal(stepComplete(p,step),false);
 p.checked[step.id+':0']=true;p.checked[step.id+':1']=true;
 assert.equal(stepComplete(p,step),false);
 p.checked[step.id+':2']=true;assert.equal(stepComplete(p,step),true);
 p.checked[step.id+':1']=false;assert.equal(stepComplete(p,step),false);
});
test('Les notes sont bornées et les données locales corrompues ne donnent aucune étape acquise',()=>{
 const s=EXERCISE_STEPS[1];const p=cleanProgress({step:999,checked:{'plan:0':'true','plan:1':true,'intrus:0':true},notes:{plan:'x'.repeat(3000),intrus:'secret'}});
 assert.equal(p.step,5);assert.equal(p.notes.plan.length,2000);assert.equal(p.notes.intrus,undefined);assert.deepEqual(p.checked,{'plan:1':true});
 assert.deepEqual(readProgress({getItem:()=>'{broken'},'k'),cleanProgress(null));
 assert.deepEqual(readProgress({getItem:()=>{throw Error('storage blocked');}},'k'),cleanProgress(null));
 assert.equal(stepComplete(p,s),false);
});
test('Progression isolée par projet et stable après renommage d’un projet cloud',()=>{
 const a=workflowKey({cloudId:'a',title:'Projet'}),b=workflowKey({cloudId:'b',title:'Projet'});
 assert.notEqual(a,b);assert.equal(a,workflowKey({cloudId:'a',title:'Autre titre'}));
 assert.notEqual(workflowKey({title:'Local A'}),workflowKey({title:'Local B'}));
 const map=new Map([[a,JSON.stringify({checked:{'plan:0':true},notes:{plan:'cote à vérifier'},step:1})]]),store={getItem:k=>map.get(k)||null};
 assert.equal(readProgress(store,a).notes.plan,'cote à vérifier');assert.deepEqual(readProgress(store,b),cleanProgress(null));
});
test('Le fichier de suivi conserve les notes et distingue les étapes partielles des étapes relues',()=>{
 const p=cleanProgress({notes:{plan:'Cote 12,00 m vérifiée'},checked:{'descriptif:0':true,'descriptif:1':true,'descriptif:2':true,'plan:0':true}});
 const out=workflowSummary({title:'Courbet'},p);
 assert.match(out,/Cadrer & analyser — Relu/);assert.match(out,/Calibrer le plan — À poursuivre/);assert.match(out,/Cote 12,00 m vérifiée/);
 assert.match(out,/\[x\]/);assert.match(out,/\[ \]/);assert.equal(EXERCISE_STEPS.length,6);
});
