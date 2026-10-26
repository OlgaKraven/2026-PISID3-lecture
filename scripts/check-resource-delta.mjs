import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const baseline='41b97b03257ae229e8ce7fe84a0a0c97ebb1e291';
const gitJson=path=>JSON.parse(execFileSync('git',['show',baseline+':'+path],{encoding:'utf8',maxBuffer:40*1024*1024}));
const old=gitJson('public/course.json'),oldPack=gitJson('public/teacher-pack.json');
const course=JSON.parse(fs.readFileSync('public/course.json','utf8')),pack=JSON.parse(fs.readFileSync('public/teacher-pack.json','utf8'));
const omit=(o,key)=>Object.fromEntries(Object.entries(o).filter(([k])=>k!==key));
assert.deepEqual(omit(omit(old,'lectures'),'contentVersion'),omit(omit(course,'lectures'),'contentVersion'));
const added=[],moved=[],changedNotes=[],preserved=[];
for(const [i,l] of course.lectures.entries()){
  const before=old.lectures[i];assert.deepEqual(omit(l,'slides'),omit(before,'slides'));
  const oldSlides=new Map(before.slides.map(s=>[s.id,s]));
  for(const s of l.slides){
    if(oldSlides.has(s.id)){
      assert.deepEqual(s,oldSlides.get(s.id),s.id+': unrelated slide changed');preserved.push(s.id);
      if(s.id===l.id+'-sources'){moved.push(s.id);changedNotes.push(s.id);}
      else assert.deepEqual(pack.notes[s.id],oldPack.notes[s.id],s.id+': unrelated teacher note changed');
    }else{assert(['main-literature','additional-literature','materials'].some(x=>s.id===l.id+'-'+x));added.push(s.id);}
  }
  assert.deepEqual(l.slides.filter(s=>oldSlides.has(s.id)&&s.id!==l.id+'-sources').map(s=>s.id),before.slides.filter(s=>s.id!==l.id+'-sources').map(s=>s.id));
  for(const [j,urls] of [[1,['https://www.iprbookshop.ru/144813.html','https://www.iprbookshop.ru/144814.html']],[2,['https://www.iprbookshop.ru/152882.html','https://www.iprbookshop.ru/123442.html']]])assert.deepEqual(l.slides[j].references.map(r=>r.url),urls);
}
assert.equal(preserved.length,2299);assert.equal(added.length,78);assert.equal(moved.length,26);
assert.equal(course.materialsUrl,'https://disk.yandex.ru/d/DZrrswBj5gcUuw');
const aliases=JSON.parse(fs.readFileSync('authoring/slide-aliases.json','utf8')),oldAliases=gitJson('authoring/slide-aliases.json');
assert.deepEqual(aliases,Object.fromEntries(Object.entries(oldAliases).filter(([k])=>!added.includes(k))));
const touchedRuntime=execFileSync('git',['diff','--name-only',baseline,'--','src','public/models','public/artifacts','public/fonts','public/question-experiments.json','public/practice-cases.json','public/laboratories.json','public/form-artifacts.json','public/teaching-artifacts.json'],{encoding:'utf8'}).trim().split('\n');
assert.deepEqual(touchedRuntime,['src/presentation-design.css'],'Subject rendering, interaction logic and artifact bytes must be preserved');
const bank=JSON.parse(fs.readFileSync('public/assessment.json','utf8'));assert.deepEqual(omit(bank,'contentVersion'),omit(gitJson('public/assessment.json'),'contentVersion'));
const oldCss=execFileSync('git',['show',baseline+':src/presentation-design.css'],{encoding:'utf8'}).replaceAll('\r\n','\n');
const newCss=fs.readFileSync('src/presentation-design.css','utf8').replaceAll('\r\n','\n');
assert.ok(newCss.includes('font-size:16px'),'Readable mobile material text');
const addition=newCss.slice(oldCss.indexOf('@media screen and (max-width:820px){.active-slide .slide-frame[data-slide-id].kind-literature'),newCss.indexOf('@media screen and (max-width:820px){.active-slide .slide-frame[data-slide-id].kind-literature'));
assert.ok(addition.includes('.kind-materials .materials-resource'));assert.equal(newCss.replace(addition,''),oldCss,'Only scoped mobile resource styles may change');
const report={status:'passed',baselineCommit:baseline,version:course.contentVersion,courseSha256:createHash('sha256').update(fs.readFileSync('public/course.json')).digest('hex'),preservedSlides:preserved.length,unchangedExistingNotes:preserved.length-changedNotes.length,added,moved,changedNotes,scope:'Opening resources, their teacher text, old resource aliases and scoped mobile material styles only. Existing subject slides, tasks, diagrams and interactive data unchanged. Prior subject proof remains applicable to unchanged content.'};
fs.writeFileSync('reports/resource-delta.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,preserved:preserved.length,added:added.length,moved:moved.length,unchangedNotes:report.unchangedExistingNotes}));
