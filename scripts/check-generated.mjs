import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const root=process.cwd();
fs.mkdirSync('work',{recursive:true});
const temp=fs.mkdtempSync(path.join(root,'work','generation-'));
if(path.dirname(temp)!==path.join(root,'work'))throw Error('Временный путь вне work');
try{
  for(const file of ['SOURCES.md','authoring/original-course.json','authoring/worked-cases.mjs','authoring/case-visuals.mjs','authoring/teacher-overrides.json','scripts/generate-content.mjs']){
    const target=path.join(temp,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(file,target);
  }
  const result=spawnSync(process.execPath,['scripts/generate-content.mjs'],{cwd:temp,encoding:'utf8'});
  if(result.status!==0)throw Error(result.stderr||result.stdout);
  const files=['public/course.json','public/assessment.json','public/teacher-pack.json','authoring/questions.json','reports/registry.json'];
  const digest=p=>createHash('sha256').update(fs.readFileSync(p,'utf8').replaceAll('\r\n','\n')).digest('hex');
  for(const file of files)if(digest(file)!==digest(path.join(temp,file)))throw Error('Файл расходится с авторскими источниками: '+file+'; выполните npm run generate:content');
  console.log('Генерация воспроизводима: '+files.length+' файлов совпадают с авторскими источниками.');
}finally{
  fs.rmSync(temp,{recursive:true,force:true});
}
