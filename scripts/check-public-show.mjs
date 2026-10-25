import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {launchBrowser} from './runtime.mjs';
const base=process.env.SITE_URL||'https://olgakraven.github.io/2026-PISID3-lecture/';
const browser=await launchBrowser(),context=await browser.newContext({viewport:{width:1600,height:1000},reducedMotion:'reduce'});
const page=await context.newPage();page.setDefaultTimeout(12000);
const report={url:base,startedAt:new Date().toISOString(),lectures:[],cases:[],matching:[],labs:[],errors:[]};
const courseBytes=await (await context.request.get(base+'course.json?review=third')).body();
const course=JSON.parse(courseBytes);report.version=course.contentVersion;report.courseSha256=createHash('sha256').update(courseBytes).digest('hex');
const cases=await (await context.request.get(base+'practice-cases.json?review=third')).json();
const bank=await (await context.request.get(base+'assessment.json?review=third')).json();
report.inventory={lectures:course.lectures.length,cases:cases.length,matching:course.lectures.flatMap(l=>l.slides).filter(s=>s.task?.type==='matching').length};
page.on('pageerror',e=>report.errors.push({type:'script',message:e.message}));
let audience;
const active=()=>page.locator('.mini-stage:not(.next-stage)');
const panel=()=>page.locator('.case-dialog[open]');
const screen=()=>audience.locator('.case-dialog[open]');
const save=()=>fs.writeFile('reports/public-show-third-pass.json',JSON.stringify(report,null,2)+'\n');
async function go(l,id){
 if(await active().locator(`[data-slide-id="${id}"]`).count())return;
 const s=l.slides.find(s=>s.id===id),n=l.slides.indexOf(s)+1;
 await page.getByRole('button',{name:'Содержание',exact:true}).click();
 await page.getByRole('button',{name:String(n).padStart(2,'0')+' '+s.title,exact:true}).click();
 await audience.locator(`[data-slide-id="${id}"]`).waitFor();
}
async function keyboard(button,key='Enter'){
 await button.focus();await page.keyboard.press('Shift+Tab');await page.keyboard.press('Tab');
 assert.equal(await button.evaluate(n=>document.activeElement===n),true,'Control must be reachable with Tab');
 await page.keyboard.press(key);
}
try{
 for(const l of course.lectures){
  const own=cases.filter(c=>c.lectureId===l.id);
  await page.goto(base+`?lecture=${l.id}&slide=${own[0].returnSlide}`);
  const popup=context.waitForEvent('page');await page.getByRole('button',{name:'Режим показа',exact:true}).click();audience=await popup;
  await audience.locator('.audience-slide').waitFor();
  for(const c of own){
   await go(l,c.returnSlide);
   const open=active().getByRole('button',{name:'Начать эксперимент',exact:true});
   await open.click();await screen().waitFor();
   assert.equal(await screen().locator('.case-solution').count(),0);
   await panel().getByRole('textbox',{name:'Прогноз для выбранного условия',exact:true}).fill('Сравню исходное и изменённое условие');
   await audience.waitForFunction(()=>document.querySelector('.question-experiment textarea')?.value==='Сравню исходное и изменённое условие');
   const next=panel().getByRole('button',{name:'Следующий шаг решения',exact:true});
   await next.click();await next.click();await screen().locator('.qe-model li[data-complete=true]').nth(2).waitFor();
   await panel().getByRole('button',{name:'Зафиксировать результат запуска',exact:true}).click();
   const selector=panel().getByRole('combobox',{name:'Условия примера',exact:true});
   await selector.click();await screen().getByRole('listbox',{name:'Условия примера — варианты',exact:true}).waitFor();
   if(c.question%2){await selector.press('ArrowDown');await selector.press('Enter')}
   else await panel().getByRole('option',{name:'Изменённое условие',exact:true}).click();
   assert.equal(await panel().locator('.qe-model li[data-complete=true]').count(),1);
   await next.click();await next.click();await screen().locator('.qe-model li[data-complete=true]').nth(2).waitFor();
   await panel().getByRole('button',{name:'Зафиксировать результат запуска',exact:true}).click();await screen().locator('.qe-comparison>ol>li').nth(1).waitFor();
   await panel().getByRole('button',{name:'Подсказки для работы',exact:true}).click();await screen().locator('.qe-hints').waitFor();
   for(let i=0;i<2;i++){
    const field=panel().getByRole('textbox',{name:c.fields[i].label,exact:true});
    await field.fill('заведомо неверно');await panel().getByRole('button',{name:'Проверить шаг '+(i+1),exact:true}).click();await screen().locator('[data-status=fail]').waitFor();
    await field.fill(c.fields[i].answer);await panel().getByRole('button',{name:'Проверить шаг '+(i+1),exact:true}).click();await screen().locator('[data-status=pass]').nth(i).waitFor();
   }
   await panel().getByRole('button',{name:'Показать разбор после попытки',exact:true}).click();await screen().locator('.case-solution').waitFor();
   assert.ok((await screen().locator('.case-solution').innerText()).includes(c.explanation));
   await panel().getByRole('textbox',{name:c.fields[0].label,exact:true}).fill('изменённый ответ');await screen().locator('.case-solution').waitFor({state:'hidden'});
   assert.equal(await screen().locator('[data-status=pass]').count(),0);
   if(c.question===4){await audience.reload();await screen().waitFor();assert.equal(await screen().getByRole('textbox',{name:c.fields[0].label,exact:true}).inputValue(),'изменённый ответ')}
   if(c.question%2)await panel().getByRole('button',{name:'Вернуться к слайду',exact:true}).click();else await page.keyboard.press('Escape');
   await screen().waitFor({state:'hidden'});assert.equal(await open.evaluate(n=>document.activeElement===n),true,'Return focus to real opener');
   await keyboard(open);await screen().waitFor();await page.keyboard.press('Escape');await screen().waitFor({state:'hidden'});
   report.cases.push({id:c.id,openedThroughPassport:true,closedByButtonAndEscape:true,wrongAndCorrectAnswers:4,dependentInvalidation:true,comparisonMirrored:true});
   const s=l.slides.find(s=>s.id===c.id+'-T04'),t=s.task,key=bank.keys[t.id];await go(l,s.id);
   const b=active().locator('.matching-board'),a=audience.locator('.matching-board');await a.waitFor();
   for(const [i,item] of t.items.entries()){
    const left=b.locator(`[data-match-id="${item.id}"] .matching-card-title>button`),right=b.locator(`[data-option-id="${key.pairs[item.id]}"] .matching-card-title>button`);
    if(i%2){await keyboard(left,'Space');await keyboard(right)}else{await left.click();await right.click()}
    await a.locator(`[data-match-id="${item.id}"] [data-match-value="${key.pairs[item.id]}"]`).waitFor();
   }
   const order=await b.locator('[data-match-id]').evaluateAll(nodes=>nodes.map(n=>n.dataset.matchId));
   await b.getByRole('button',{name:'Перемешать списки',exact:true}).click();
   const shuffled=await b.locator('[data-match-id]').evaluateAll(nodes=>nodes.map(n=>n.dataset.matchId));
   await audience.waitForFunction(order=>JSON.stringify([...document.querySelectorAll('.matching-board [data-match-id]')].map(n=>n.dataset.matchId))===JSON.stringify(order),shuffled);
   const first=b.locator('[data-match-id]').first();await first.getByRole('button',{name:/^Опустить понятие /}).click();
   const moved=await b.locator('[data-match-id]').evaluateAll(nodes=>nodes.map(n=>n.dataset.matchId));
   await audience.waitForFunction(order=>JSON.stringify([...document.querySelectorAll('.matching-board [data-match-id]')].map(n=>n.dataset.matchId))===JSON.stringify(order),moved);
   await active().getByRole('button',{name:'Проверить',exact:true}).click();await audience.locator('.task-status').waitFor();
   const result=await audience.locator('.task-status').innerText();assert.ok(!/неверно|ошибка/i.test(result.split('\n')[0]));
   report.matching.push({id:s.id,pairs:t.items.length,mouse:true,keyboard:true,tabReachability:true,shuffleMirrored:true,reorderMirrored:true,answerMirrored:true,previousOrder:order});
   await save();
  }
  await go(l,l.id+'-experiment');const lab=active().locator('.laboratory');await lab.waitFor();
  await lab.getByRole('button',{name:'Развернуть эксперимент',exact:true}).click();await audience.locator('.laboratory-dialog[open]').waitFor();
  await page.getByRole('button',{name:'Подсказки для работы',exact:true}).click();await audience.locator('.laboratory-teacher>p').waitFor();
  await page.keyboard.press('Escape');await audience.locator('.laboratory-dialog[open]').waitFor({state:'hidden'});
  report.labs.push(l.id);report.lectures.push(l.id);await save();console.log(l.id+': 4 real modal launches + 4 matching boards, both input methods');
  await page.getByRole('button',{name:'Завершить показ',exact:true}).click();await audience.close();audience=undefined;
 }
 assert.deepEqual(report.errors,[]);report.status='passed';
}catch(error){report.status='failed';report.failure=String(error);report.failedUrl=page.url();await page.screenshot({path:'output/playwright/public-show-third-failure.png'});throw error}
finally{report.finishedAt=new Date().toISOString();await save();await browser.close()}
