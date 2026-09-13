import fs from 'node:fs/promises';
import path from 'node:path';
async function files(dir){return(await Promise.all((await fs.readdir(dir,{withFileTypes:true})).map(e=>e.isDirectory()?files(path.join(dir,e.name)):path.join(dir,e.name)))).flat();}
const list=await files('dist');
const publishedPack=JSON.parse(await fs.readFile('dist/teacher-pack.json','utf8'));
const {validateTeacherPack}=await import('@olgakraven/lecture-engine');
validateTeacherPack(publishedPack,JSON.parse(await fs.readFile('dist/course.json','utf8')));

const notes=Object.values(publishedPack.notes).map(n=>n.script);
for(const p of list){if(p.replaceAll("\\","/") === "dist/teacher-pack.json") continue;if(/teacher|private|\.map$|source-course|units\.mjs/i.test(p))throw Error('Приватный путь в сборке: '+p);if(/\.(js|html|json|txt)$/.test(p)){const text=await fs.readFile(p,'utf8');for(const note of notes)if(text.includes(note)||text.includes(JSON.stringify(note).slice(1,-1)))throw Error('Сценарий в сборке: '+p);}}
const course=JSON.parse(await fs.readFile('dist/course.json','utf8'));
for(const l of course.lectures)for(const s of l.slides)if(!publishedPack.notes[s.id]?.script?.trim())throw Error('Нет стартовой заметки: '+s.id);
for(const l of course.lectures)for(const s of l.slides)for(const k of ['script','preparation','notes','answer','correct'])if(k in s)throw Error('Приватное поле '+s.id);
console.log(JSON.stringify({files:list.length,teacherScriptsChecked:notes.length,status:'passed'}));