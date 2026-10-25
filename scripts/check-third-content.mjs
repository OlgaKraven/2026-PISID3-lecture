import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import concepts from '../authoring/concept-artifacts.mjs';
import additional from '../authoring/additional-artifacts.mjs';
import worked from '../authoring/worked-cases.mjs';
import variants from '../authoring/question-variants.mjs';
import {artifactFor,artifactVisual,artifactSpeech,artifactLead} from '../authoring/visible-artifacts.mjs';
import {formFor,formVisual,formSpeech,formLead} from '../authoring/form-artifacts.mjs';
import {describeVisual} from '../authoring/case-visuals.mjs';
const bytes=await fs.readFile('public/course.json'),c=JSON.parse(bytes);
const pack=JSON.parse(await fs.readFile('public/teacher-pack.json','utf8'));
const bank=JSON.parse(await fs.readFile('public/assessment.json','utf8'));
const cases=JSON.parse(await fs.readFile('public/practice-cases.json','utf8'));
let models=0,tasks=0,notes=0;
for(const [i,l] of c.lectures.entries()){
 const dir='docs/teaching/'+l.id;
 const alignment=JSON.parse(await fs.readFile(dir+'/alignment.json','utf8'));
 assert.equal(alignment.sourceSha256,createHash('sha256').update(bytes).digest('hex'));
 assert.deepEqual(alignment.slides.map(s=>s.slideId),l.slides.map(s=>s.id));
 const teacher=await fs.readFile(dir+'/lecture.teacher.md','utf8'),presenter=await fs.readFile(dir+'/lecture.presenter.md','utf8');
 for(const [j,s] of l.slides.entries()){
  const n=pack.notes[s.id];assert(n.script.trim());
  assert(teacher.includes(n.script),s.id+': teacher export out of date');assert(presenter.includes(n.script),s.id+': presenter export out of date');
  assert.equal(alignment.slides[j].title,s.title);notes++;
  const k=s.id.match(/-c(\d+)-walkthrough$/),extra=s.id.endsWith('-additional-case-solution');
  if(k||extra){
   const e=extra?additional[i]:concepts[i][Number(k[1])-1],artifact=artifactFor(s.id),form=formFor(s.id);assert.equal(s.steps,undefined);
   if(form){assert.equal(s.body,formLead(form));assert.deepEqual(s.visual,formVisual(form));assert(n.script.includes(formSpeech(form)));}
   else if(artifact){assert.equal(s.body,artifactLead(artifact));assert.deepEqual(s.visual,artifactVisual(artifact));assert(n.script.includes(artifactSpeech(artifact)));}
   else{assert.equal(s.body,e.input,s.id);assert.deepEqual(s.visual,e.visual);assert(n.script.includes(e.input),s.id);assert(n.script.includes(e.why),s.id);assert(n.script.includes(describeVisual(e.visual)),s.id+': visual meaning missing from teacher text');}
   models++;
  }
  if(s.id.endsWith('-practice')){
   const item=cases.find(x=>x.returnSlide===s.id),q=item.question-1;
   assert(n.script.indexOf(worked[i][q][0])<n.script.indexOf(item.input),s.id+': different initial datasets mixed');
   assert(n.script.includes(variants[i][q].condition));assert(n.script.includes(variants[i][q].result));
   for(const field of item.fields)assert(n.script.includes(field.answer));
  }
  if(s.task){
   const t=s.task,key=bank.keys[t.id];
   const answers=key.type==='matching'?t.items.flatMap(x=>[x.text,t.options.find(o=>o.id===key.pairs[x.id]).text]):key.type==='short'?key.accepted:key.correct.map(id=>t.options.find(o=>o.id===id).text);
   for(const answer of answers)assert(n.script.includes(answer),s.id+': answer missing from full script');tasks++;
  }
 }
}
assert.equal(models,234);assert.equal(tasks,416);
assert.equal(pack.previousNoteRevisions.at(-1).contentVersion,'pisid3-2026.10.25-artifacts');
const report={version:c.contentVersion,courseSha256:createHash('sha256').update(bytes).digest('hex'),models,tasks,notes,exportedLectures:c.lectures.length,status:'passed',scope:'Alignment and data regression; does not establish pedagogical sufficiency by itself'};
await fs.writeFile('reports/teaching-alignment.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
