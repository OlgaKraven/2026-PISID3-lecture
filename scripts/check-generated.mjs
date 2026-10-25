import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const root=process.cwd();
fs.mkdirSync('work',{recursive:true});
const temp=fs.mkdtempSync(path.join(root,'work','generation-'));
if(path.dirname(temp)!==path.join(root,'work'))throw Error('Временный путь вне work');
try{
  for(const file of ['public/fonts/raleway-cyrillic.woff2','SOURCES.md','authoring/original-course.json','authoring/worked-cases.mjs','authoring/case-visuals.mjs','authoring/visible-artifacts.mjs','authoring/course-models.mjs','authoring/form-artifacts.mjs','authoring/component-artifacts.mjs','authoring/experiments.json','authoring/experiment-visuals.mjs','authoring/teaching-guidance.mjs','authoring/expanded-blocks.mjs','authoring/student-content.mjs','authoring/concept-artifacts.mjs','authoring/additional-artifacts.mjs','authoring/question-variants.mjs','authoring/laboratory-config.mjs','authoring/practice-cases.mjs','authoring/presenter-speech.mjs','authoring/previous-note-hashes.json','authoring/teacher-overrides.json','scripts/generate-content.mjs']){
    const target=path.join(temp,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(file,target);
  }
  const result=spawnSync(process.execPath,['scripts/generate-content.mjs'],{cwd:temp,encoding:'utf8'});
  if(result.status!==0)throw Error(result.stderr||result.stdout);
  const files=['public/form-artifacts.json','public/teaching-artifacts.json','public/question-experiments.json','public/laboratories.json','public/practice-cases.json','reports/visual-plan.json','public/course.json','public/assessment.json','public/teacher-pack.json','authoring/questions.json','reports/registry.json'];
  for(const folder of ['artifacts','models'])files.push(...fs.readdirSync(path.join(temp,'public/'+folder)).map(name=>'public/'+folder+'/'+name));
  const digest=p=>createHash('sha256').update(fs.readFileSync(p,'utf8').replaceAll('\r\n','\n')).digest('hex');
  for(const file of files)if(digest(file)!==digest(path.join(temp,file)))throw Error('Файл расходится с авторскими источниками: '+file+'; выполните npm run generate:content');
  console.log('Генерация воспроизводима: '+files.length+' файлов совпадают с авторскими источниками.');
}finally{
  fs.rmSync(temp,{recursive:true,force:true});
}
