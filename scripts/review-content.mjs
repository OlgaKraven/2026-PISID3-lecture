import fs from 'node:fs';
import assert from 'node:assert/strict';
import {validateTeacherPack} from '@olgakraven/lecture-engine';
import {describeVisual} from '../authoring/case-visuals.mjs';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const course=read('public/course.json'), pack=read('public/teacher-pack.json');
const questions=read('authoring/questions.json'), bank=read('public/assessment.json');
validateTeacherPack(pack,course);
const slides=course.lectures.flatMap(l=>l.slides);
assert.deepEqual(Object.keys(pack.notes).sort(),slides.map(s=>s.id).sort());
const normalize=text=>text.replace(/\s+/g,' ').trim();
const duplicates=items=>{
  const groups=new Map();
  for(const [id,text] of items){const key=normalize(text);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(id);}
  return [...groups.values()].filter(ids=>ids.length>1);
};
const noteDuplicates=duplicates(slides.map(s=>[s.id,pack.notes[s.id].script]));
assert.equal(noteDuplicates.length,0,'Полные сценарии повторяются');
for(const q of questions){
  const lecture=course.lectures.find(l=>l.id===q.lectureId);
  const firstTask=lecture.slides.findIndex(s=>s.task?.id===q.taskIds[0]);
  assert.ok(firstTask>=0);
  for(const id of q.evidence)assert.ok(lecture.slides.findIndex(s=>s.id===id)>=0 && lecture.slides.findIndex(s=>s.id===id)<firstTask,id);
}
for(const s of slides){
  const n=pack.notes[s.id];
  assert.ok(n.script.trim() && n.estimatedSeconds>0,s.id);
  if(s.id.endsWith('-worked'))assert.ok(n.script.includes(describeVisual(s.visual)),s.id+': заметка расходится с данными схемы');
  assert.ok(!/(?<!\.)\.\.(?!\.)(?=\s|$)/.test(n.script),s.id+': двойная точка');
  assert.ok(!/^\s*\{\s*"type"/.test(n.answer),s.id+': технический JSON вместо ответа');
  if(s.task?.options)assert.equal(new Set(s.task.options.map(o=>normalize(o.text))).size,s.task.options.length,s.id+': одинаковые варианты');
  if(s.task?.type==='short')assert.ok(bank.keys[s.task.id].accepted.length);
}
const report={version:course.contentVersion,lectures:course.lectures.length,slides:slides.length,notes:Object.keys(pack.notes).length,questions:questions.length,tasks:Object.keys(bank.keys).length,duplicateScripts:noteDuplicates,lecturesReviewed:course.lectures.map(l=>({id:l.id,title:l.title,minutes:Math.round(l.slides.reduce((sum,s)=>sum+pack.notes[s.id].estimatedSeconds,0)/60)})),scope:'Структура, покрытие заметками, порядок объяснений, полные повторы сценариев, варианты и формат ответов. Смысловую экспертизу автоматическая проверка не заменяет.'};
fs.writeFileSync('reports/editorial-review.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({lectures:report.lectures,slides:report.slides,notes:report.notes,duplicateScripts:noteDuplicates.length,status:'passed'}));
