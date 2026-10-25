import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const bytes=await fs.readFile('public/course.json'),course=JSON.parse(bytes),pack=JSON.parse(await fs.readFile('public/teacher-pack.json','utf8'));
const output=process.argv[2]||'docs/teaching';await fs.mkdir(output,{recursive:true});
for(const lecture of course.lectures){
 const dir=path.join(output,lecture.id);await fs.mkdir(dir,{recursive:true});
 const teacher=[`# ${lecture.title}`,`МДК.05.01 «${course.discipline}» · ${lecture.semester} семестр`];
 const presenter=[`# ${lecture.title}`,`Сценарий показа · ${lecture.semester} семестр`];
 const slides=[];
 for(const [index,s] of lecture.slides.entries()){
  const n=pack.notes[s.id],anchor='screen-'+String(index+1).padStart(3,'0');
  teacher.push(`<a id="${anchor}"></a>\n\n## Слайд ${index+1}. ${s.title}\n\n${n.script}`);
  presenter.push(`<a id="${anchor}"></a>\n\n## Слайд ${index+1}. ${s.title}\n\n${n.script}\n\n**Подготовка:** ${n.preparation}\n\n**Запишите:** ${n.notebook}${n.questions?'\n\n**Вопросы:**\n\n'+n.questions:''}${n.answer?'\n\n**Разбор для преподавателя:**\n\n'+n.answer:''}`);
  slides.push({lectureId:lecture.id,slideId:s.id,displayNumber:index+1,title:s.title,anchors:{teacher:anchor,presenter:anchor}});
 }
 await fs.writeFile(path.join(dir,'lecture.teacher.md'),teacher.join('\n\n')+'\n');
 await fs.writeFile(path.join(dir,'lecture.presenter.md'),presenter.join('\n\n')+'\n');
 await fs.writeFile(path.join(dir,'teacher-pack.json'),JSON.stringify({schemaVersion:1,courseId:course.id,contentVersion:course.contentVersion,notes:Object.fromEntries(lecture.slides.map(s=>[s.id,pack.notes[s.id]]))},null,2)+'\n');
 await fs.writeFile(path.join(dir,'alignment.json'),JSON.stringify({schemaVersion:1,courseId:course.id,contentVersion:course.contentVersion,sourceKind:'local',sourceSha256:createHash('sha256').update(bytes).digest('hex'),lectureIds:[lecture.id],documents:{teacher:'lecture.teacher.md',presenter:'lecture.presenter.md'},slides},null,2)+'\n');
}
console.log('Exported teacher text, presenter script and alignment for '+course.lectures.length+' lectures');
