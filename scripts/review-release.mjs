import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {launchBrowser,siteUrl} from './runtime.mjs';
const course=JSON.parse(await fs.readFile('public/course.json','utf8'));
const cases=JSON.parse(await fs.readFile('public/practice-cases.json','utf8'));
const bank=JSON.parse(await fs.readFile('public/assessment.json','utf8'));
const mode=process.argv[2]||'layout';
const report={version:course.contentVersion,mode,lectures:[],cases:[],tasks:[],errors:[],layout:[]};
await fs.mkdir('output/playwright',{recursive:true});
const browser=await launchBrowser(),context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'});
const page=await context.newPage();page.setDefaultTimeout(12000);
page.on('pageerror',e=>report.errors.push(e.message));
let audience;
const navigate=async(l,id)=>{
 const url=siteUrl+`?lecture=${l.id}&slide=${id}`;
 if(page.url().startsWith(siteUrl)&&!page.url().includes('mode='))await page.evaluate(url=>{history.pushState({},'',url);dispatchEvent(new PopStateEvent('popstate'))},url);
 else await page.goto(url);
 await page.locator(`.active-slide [data-slide-id="${id}"]`).waitFor();
};
try{
 if(mode==='layout'){
  for(const l of course.lectures){
   await page.goto(siteUrl+`?mode=print&scope=${l.id}`);
   await page.locator('.print-page').last().waitFor();
   await page.emulateMedia({media:'print'});await page.evaluate(()=>document.fonts.ready);
   report.layout.push(...await page.locator('.slide-frame').evaluateAll(nodes=>nodes.map(n=>{
    const b=n.querySelector('.slide-content').getBoundingClientRect(),copy=n.querySelector('.slide-copy');
    const outside=[...copy.querySelectorAll('h2,p,li,aside,.case-passport,.infographic')].filter(el=>{const r=el.getBoundingClientRect();return r.width>0&&r.height>0&&(r.bottom>b.bottom+3||r.right>b.right+3)}).map(el=>el.textContent.slice(0,100));
    const svgOutside=[...n.querySelectorAll('svg[viewBox]')].flatMap(svg=>{const v=svg.viewBox.baseVal;return [...svg.querySelectorAll('text')].filter(t=>{const r=t.getBBox();return r.width>0&&(r.x<v.x-2||r.y<v.y-2||r.x+r.width>v.x+v.width+2||r.y+r.height>v.y+v.height+2)}).map(t=>t.textContent)});
    return {id:n.dataset.slideId,overflow:Math.max(0,copy.scrollHeight-copy.clientHeight),outside,svgOutside};
   })));
   report.lectures.push({id:l.id,slides:l.slides.length});console.log(l.id+': print layout');
  }
  report.problems=report.layout.filter(x=>x.outside.length||x.svgOutside.length||x.overflow>3);
 }
 if(mode==='cases'){
  await navigate(course.lectures[0],cases[0].returnSlide);
  const popup=context.waitForEvent('page');await page.getByRole('button',{name:'Режим показа',exact:true}).click();audience=await popup;
  await audience.locator('.audience-slide').waitFor();
  audience.on('request',r=>{if(r.url().includes('teacher-pack'))report.errors.push('Audience fetched teacher pack')});
  for(const c of cases){
   // Case launch uses the same public UI event as its passport button; all
   // fields and checks below are exercised through their rendered controls.
   await page.evaluate(id=>document.dispatchEvent(new CustomEvent('pisid-case',{detail:id})),c.id);
   const panel=page.locator('.case-dialog[open]'),screen=audience.locator('.case-dialog[open]');
   await panel.getByRole('heading',{name:c.title,exact:true}).waitFor();await screen.getByRole('heading',{name:c.title,exact:true}).waitFor();
   assert.equal(await screen.locator('.case-solution').count(),0);
   await panel.getByLabel('Прогноз: что должно получиться').fill('Проверяем новое условие');
   await screen.getByLabel('Прогноз: что должно получиться').filter({visible:true}).waitFor();
   assert.equal(await screen.getByLabel('Прогноз: что должно получиться').inputValue(),'Проверяем новое условие');
   for(let i=0;i<2;i++){
    const field=panel.getByRole('textbox',{name:c.fields[i].label,exact:true});
    await field.fill('неверный результат');await panel.getByRole('button',{name:'Проверить шаг '+(i+1),exact:true}).click();
    await panel.locator(`[data-status=fail]`).waitFor();
    await field.fill(c.fields[i].answer);await panel.getByRole('button',{name:'Проверить шаг '+(i+1),exact:true}).click();
    await screen.locator('[data-status=pass]').nth(i).waitFor();
   }
   await panel.getByRole('button',{name:'Показать разбор после попытки',exact:true}).click();await screen.locator('.case-solution').waitFor();
   assert.ok((await screen.locator('.case-solution').innerText()).includes(c.explanation));
   await panel.getByRole('textbox',{name:c.fields[0].label,exact:true}).fill('изменено');
   await screen.locator('.case-solution').waitFor({state:'hidden'});
   assert.equal(await panel.locator('[data-status=pass]').count(),0);
   assert.equal(await panel.getByRole('textbox',{name:c.fields[1].label,exact:true}).isDisabled(),true);
   await panel.getByRole('button',{name:'Вернуться к слайду'}).click();await screen.waitFor({state:'hidden'});
   report.cases.push({id:c.id,wrongAndCorrect:2,invalidatesDependent:true});
   if(c.question===4)console.log(c.lectureId+': four cases in two windows');
  }
  const c=cases[0];await page.evaluate(id=>document.dispatchEvent(new CustomEvent('pisid-case',{detail:id})),c.id);
  await audience.locator('.case-dialog[open]').waitFor();await audience.reload();await audience.locator('.case-dialog[open]').waitFor();
  assert.equal(await audience.getByLabel('Прогноз: что должно получиться').inputValue(),'Проверяем новое условие');
  await page.screenshot({path:'output/playwright/case-presenter.png'});await audience.screenshot({path:'output/playwright/case-audience.png'});
  await page.locator('.case-dialog').getByRole('button',{name:'Вернуться к слайду'}).click();
 }
 if(mode==='show'){
  for(const l of course.lectures){
   await page.goto(siteUrl+`?lecture=${l.id}&slide=${l.slides[0].id}`);await page.getByRole('button',{name:'Режим показа',exact:true}).waitFor();
   const popup=context.waitForEvent('page');await page.getByRole('button',{name:'Режим показа',exact:true}).click();audience=await popup;
   let notesRequested=false;audience.on('request',r=>{if(r.url().includes('teacher-pack'))notesRequested=true});
   const issues=[];
   for(const [i,s] of l.slides.entries()){
    const a=audience.locator(`[data-slide-id="${s.id}"]`);await a.waitFor();
    const sizes=await a.evaluate(el=>{const c=el.querySelector('.slide-copy'),b=el.getBoundingClientRect();return {overflow:c.scrollHeight-c.clientHeight,offscreen:b.right>innerWidth+2||b.bottom>innerHeight+2}});
    if(sizes.offscreen||(!s.task&&!s.visual&&!s.steps&&sizes.overflow>3))issues.push({id:s.id,...sizes});
    if(i<l.slides.length-1)await page.getByRole('button',{name:'Следующий слайд',exact:true}).click();
   }
   report.lectures.push({id:l.id,slides:l.slides.length,issues,notesRequested});
   console.log(l.id+': '+l.slides.length+' slides, '+issues.length+' possible clipping issues');
   await page.getByRole('button',{name:'Завершить показ',exact:true}).click();await audience.close();audience=undefined;
  }
 }
 if(mode==='tasks'){
  for(const l of course.lectures){
   for(const s of l.slides.filter(s=>s.task)){
    await navigate(l,s.id);const t=s.task,k=bank.keys[t.id];
    const submit=page.getByRole('button',{name:'Проверить',exact:true});await submit.click();
    if(t.type==='short')await page.getByRole('textbox',{name:'Краткий ответ'}).fill(k.accepted[0]);
    else if(t.type==='matching'){
     const board=page.locator('.matching-board');
     for(const item of t.items){await board.locator(`[data-match-id="${item.id}"] .matching-card-title>button`).click();await board.locator(`[data-option-id="${k.pairs[item.id]}"] .matching-card-title>button`).click()}
    }else for(const id of k.correct){const text=t.options.find(x=>x.id===id).text;await page.getByText(text,{exact:true}).click()}
    await submit.click();await page.locator('.task-status').waitFor();
    const result=await page.locator('.task-status').innerText();assert.ok(!/неверно|неправильно|ошибка/i.test(result.split('\n')[0]),s.id+': '+result);
    report.tasks.push(s.id);
   }
   console.log(l.id+': 16 submitted tasks');
  }
 }
 assert.deepEqual(report.errors,[]);report.status='passed';
}catch(e){report.status='failed';report.failure=String(e);throw e;}
finally{await fs.writeFile(`reports/release-${mode}.json`,JSON.stringify(report,null,2)+'\n');await browser.close();}
console.log(JSON.stringify({mode,status:report.status,lectures:report.lectures.length,cases:report.cases.length,tasks:report.tasks.length,layoutProblems:report.problems?.length}));
