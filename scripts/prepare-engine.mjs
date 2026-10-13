import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

// Reproducible course-specific extension of the checked-in engine archive.
// The upstream archive is preserved; only the task-size validation changes.
const root=process.cwd(),work=path.resolve(root,'work','engine-extension');
if(!work.startsWith(path.resolve(root,'work')+path.sep))throw Error('Unsafe engine workspace');
fs.mkdirSync(work,{recursive:true});
execFileSync('tar',['-xzf',path.resolve('vendor/olgakraven-lecture-engine-0.2.0.tgz'),'-C',work]);
const file=path.join(work,'package','lib','SlideView-CKuVrZ7x.js');
let source=fs.readFileSync(file,'utf8');
const before='e.type !== "short" && ue(e.options, i + ".task.options").length !== (e.type === "multiple" ? 5 : 4) && T(i + ".task.options", "нужно " + (e.type === "multiple" ? 5 : 4) + " варианта")';
const after='e.type !== "short" && (ue(e.options, i + ".task.options").length < 4 || e.options.length > 10) && T(i + ".task.options", "нужно от 4 до 10 вариантов")';
if(source.split(before).length!==2)throw Error('Review task option extension');
source=source.replace(before,after);
const matching='e.type === "matching" && ue(e.items, i + ".task.items").length !== 4 && T(i + ".task.items", "нужно 4 пары")';
if(source.split(matching).length!==2)throw Error('Review matching item extension');
source=source.replace(matching,'e.type === "matching" && (ue(e.items, i + ".task.items").length < 4 || e.items.length > 10 || e.items.length !== e.options.length) && T(i + ".task.items", "нужно от 4 до 10 пар и столько же характеристик")');
fs.writeFileSync(file,source);
const manifest=path.join(work,'package','package.json'),pkg=JSON.parse(fs.readFileSync(manifest,'utf8'));
pkg.version='0.2.0-course.5';fs.writeFileSync(manifest,JSON.stringify(pkg,null,2)+'\n');
execFileSync('tar',['-czf',path.resolve('vendor/olgakraven-lecture-engine-0.2.0-course.5.tgz'),'-C',work,'package']);
const project=JSON.parse(fs.readFileSync('package.json','utf8'));
project.dependencies['@olgakraven/lecture-engine']='file:vendor/olgakraven-lecture-engine-0.2.0-course.5.tgz';
fs.writeFileSync('package.json',JSON.stringify(project,null,2)+'\n');
console.log('Engine extension prepared: 4–10 options and matching pairs.');
