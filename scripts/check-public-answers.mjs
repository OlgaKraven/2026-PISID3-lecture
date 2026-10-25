import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {launchBrowser} from './runtime.mjs';
const base=process.env.SITE_URL||'https://olgakraven.github.io/2026-PISID3-lecture/';
const browser=await launchBrowser(),context=await browser.newContext({viewport:{width:1600,height:1000},reducedMotion:'reduce'}),page=await context.newPage();page.setDefaultTimeout(12000);
const course=await (await context.request.get(base+'course.json?review=answers')).json(),bank=await (await context.request.get(base+'assessment.json?review=answers')).json();
const report={url:base,version:course.contentVersion,startedAt:new Date().toISOString(),answers:[],errors:[]};
const selected=process.argv.includes('--first')?course.lectures.slice(0,1):course.lectures;
page.on('pageerror',e=>report.errors.push(e.message));let audience;
const active=()=>page.locator('.mini-stage:not(.next-stage)');
const pDialog=()=>page.getByRole('dialog',{name:'Разбор ответа',exact:true});
const aDialog=()=>audience.getByRole('dialog',{name:'Разбор ответа',exact:true});
async function fill(task,key,wrong=false){
 if(task.type==='matching')for(const [i,item] of task.items.entries()){
  const b=active().locator('.matching-board');await b.locator(`[data-match-id="${item.id}"] .matching-card-title>button`).click();
  const value=wrong&&i===0?task.options.find(o=>o.id!==key.pairs[item.id]).id:key.pairs[item.id];
  const target=b.locator(`[data-option-id="${value}"] .matching-card-title>button`);if(i%2){await target.focus();await target.press('Enter')}else await target.click();
 }else if(task.type==='short')await active().getByRole('textbox',{name:'Краткий ответ',exact:true}).fill(wrong?'заведомо неверный ответ':key.accepted[0]);
 else{
  const ids=wrong?[...(task.type==='multiple'?key.correct.slice(0,-1):[]),task.options.find(o=>!key.correct.includes(o.id)).id]:key.correct;
  for(const id of ids)await active().getByText(task.options.find(o=>o.id===id).text,{exact:true}).click();
 }
}
async function reveal(){
 const opener=active().getByRole('button',{name:'Разбор ответа',exact:true});await opener.click();await pDialog().waitFor();await aDialog().waitFor();
 const expected=await pDialog().locator('.answer-dialog-content').innerText();
 if(report.answers.length===3){await page.screenshot({path:'output/playwright/third-answer-presenter.png'});await audience.screenshot({path:'output/playwright/third-answer-audience.png'});}
 await audience.waitForFunction(text=>document.querySelector('.answer-dialog-content')?.innerText===text,expected);
 await audience.keyboard.press('Escape');assert.equal(await aDialog().isVisible(),true,'Audience cannot close a public answer independently');
 const content=pDialog().locator('.answer-dialog-content'),range=await content.evaluate(n=>n.scrollHeight-n.clientHeight);
 if(range>20){await content.hover();await page.mouse.wheel(0,300);await audience.waitForFunction(()=>{const n=document.querySelector('.answer-dialog-content');return n&&n.scrollTop>0});}
 await pDialog().getByRole('button',{name:'Закрыть разбор',exact:true}).click();await aDialog().waitFor({state:'hidden'});
 await page.waitForFunction(()=>document.activeElement?.textContent==='Разбор ответа');
 await opener.press('Enter');await aDialog().waitFor();await page.keyboard.press('Escape');await aDialog().waitFor({state:'hidden'});
}
try{
 for(const l of selected){
  const slides=l.slides.filter(s=>s.task);await page.goto(base+`?lecture=${l.id}&slide=${slides[0].id}`);
  const popup=context.waitForEvent('page');await page.getByRole('button',{name:'Режим показа',exact:true}).click();audience=await popup;await audience.locator('.audience-slide').waitFor();
  for(const s of slides){
   if(!await active().locator(`[data-slide-id="${s.id}"]`).count()){
    await page.getByRole('button',{name:'Содержание',exact:true}).click();await page.getByRole('button',{name:String(l.slides.indexOf(s)+1).padStart(2,'0')+' '+s.title,exact:true}).click();await audience.locator(`[data-slide-id="${s.id}"]`).waitFor();
   }
   const task=s.task,key=bank.keys[task.id];
   await fill(task,key,true);await active().getByRole('button',{name:'Проверить',exact:true}).click();await audience.locator('.task-status.incorrect').waitFor();await reveal();
   await active().getByRole('button',{name:'Ещё попытка',exact:true}).click();await audience.locator('.task-status').waitFor({state:'hidden'});
   await fill(task,key);await active().getByRole('button',{name:'Проверить',exact:true}).click();await audience.locator('.task-status.correct').waitFor();await reveal();
   if(s.id.endsWith('Q04-T04')){await active().getByRole('button',{name:'Разбор ответа',exact:true}).click();await audience.reload();await aDialog().waitFor();await page.keyboard.press('Escape');await aDialog().waitFor({state:'hidden'});}
   report.answers.push({id:s.id,type:task.type,wrongAndCorrect:true,sameModalAndTextInBothWindows:true,closedByButtonAndEscape:true,focusRestored:true});
   await fs.writeFile(process.env.ANSWER_REPORT||'reports/public-answers-third.json',JSON.stringify(report,null,2)+'\n');
  }
  console.log(l.id+': 16 answer dialogs, incorrect + correct, both windows');await page.getByRole('button',{name:'Завершить показ',exact:true}).click();await audience.close();audience=undefined;
 }
 assert.deepEqual(report.errors,[]);report.status='passed';
}catch(e){report.status='failed';report.failure=String(e);await page.screenshot({path:'output/playwright/third-answer-failure.png'});throw e}
finally{report.finishedAt=new Date().toISOString();await fs.writeFile(process.env.ANSWER_REPORT||'reports/public-answers-third.json',JSON.stringify(report,null,2)+'\n');await browser.close()}
