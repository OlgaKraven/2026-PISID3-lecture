import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {launchBrowser,siteUrl} from './runtime.mjs';
const c=JSON.parse(await fs.readFile('public/course.json','utf8')),pack=JSON.parse(await fs.readFile('public/teacher-pack.json','utf8')),labs=JSON.parse(await fs.readFile('public/laboratories.json','utf8')),bank=JSON.parse(await fs.readFile('public/assessment.json','utf8'));
const report={version:c.contentVersion,lectures:[],laboratories:[],mobileLaboratories:[],choices:0,matching:[],notes:[],errors:[]};
const browser=await launchBrowser();
await fs.mkdir('output/playwright',{recursive:true});
try{
 const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'no-preference'}),page=await context.newPage();
 page.on('pageerror',e=>report.errors.push(e.message));
 const go=async(l,id)=>{await page.goto(siteUrl+`?lecture=${l.id}&slide=${id}`);await page.locator('.active-slide .slide-frame').waitFor();};
 await page.goto(siteUrl);await page.getByRole('button',{name:'Открыть эксперимент',exact:true}).first().waitFor();assert.equal(await page.getByRole('button',{name:'Открыть эксперимент',exact:true}).count(),26);
 await page.getByRole('button',{name:'Открыть эксперимент',exact:true}).first().click();await page.locator('[data-slide-id="01-project-decisions-experiment-start"]').waitFor();
 await page.getByRole('button',{name:'Начать эксперимент',exact:true}).click();await page.locator('.laboratory').waitFor();await page.getByRole('button',{name:'Развернуть эксперимент'}).click();await page.locator('dialog[open]').waitFor();
 await page.getByRole('combobox',{name:'Статус ограничения',exact:true}).selectOption('Подтверждено');await page.getByRole('combobox',{name:'Ячейка',exact:true}).selectOption('B-02: 2–8 °C');
 assert.match(await page.locator('.studio-artifact').innerText(),/Разместить в B-02/);
 const animation=await page.locator('.warehouse-packet').evaluate(el=>getComputedStyle(el).animationName);assert.equal(animation,'warehouse-delivery');
 await page.getByRole('button',{name:'Зафиксировать результат запуска'}).click();await page.getByRole('combobox',{name:'Вместимость B-02'}).selectOption('Места нет');await page.getByRole('button',{name:'Зафиксировать результат запуска'}).click();assert.equal(await page.locator('.laboratory-comparison>ol>li').count(),2);
 await page.screenshot({path:'output/playwright/v5-large-laboratory.png'});await page.keyboard.press('Escape');await page.locator('dialog[open]').waitFor({state:'hidden'});
 for(const [index,l] of c.lectures.entries()){
  assert.ok(l.slides.length>=80);
  assert.equal(l.slides.filter(s=>/-c\d+-explanation$/.test(s.id)).length,8);
  assert.equal(l.slides.filter(s=>/-c\d+-walkthrough$/.test(s.id)).length,8);
  assert.equal(l.slides.filter(s=>/-Q\d+-input$/.test(s.id)).length,4);
  assert.equal(l.slides.filter(s=>/-Q\d+-boundary$/.test(s.id)).length,4);
  for(const s of l.slides)assert.ok(pack.notes[s.id].script.length>=500,s.id);
  report.lectures.push({id:l.id,slides:l.slides.length,notes:l.slides.length});
  await go(l,l.id+'-experiment');await page.locator('.laboratory').waitFor();assert.equal(await page.locator('.laboratory').getAttribute('data-experiment'),labs[index].kind);
  await page.getByRole('button',{name:'Развернуть эксперимент'}).click();
  const area=page.locator('dialog[open] .laboratory');await area.waitFor();
  if(labs[index].kind==='studio'){
   for(const field of labs[index].fields)await area.getByRole('combobox',{name:field.label,exact:true}).selectOption(field.options.at(-1));
   assert.ok((await area.locator('.studio-artifact').innerText()).length>100);
  }else{
   await area.getByRole('combobox',{name:'Набор условий'}).selectOption('Изменённое условие');
   if(labs[index].kind==='offline')await area.getByRole('button',{name:'Отправить операцию'}).click();
   if(labs[index].kind==='auth')await area.getByRole('button',{name:'Неверный пароль'}).click();
   if(labs[index].kind==='form'){await area.getByRole('button',{name:'Зарегистрировать приёмку'}).click();await area.getByRole('status').filter({hasText:'Отказ сервера'}).waitFor();}
  }
  await area.getByRole('button',{name:'Зафиксировать результат запуска'}).click();
  assert.equal(await area.locator('.laboratory-comparison>ol>li').count(),1);
  await page.keyboard.press('Escape');report.laboratories.push({id:l.id,kind:labs[index].kind});
 }
 const first=c.lectures[0],matching=first.slides.find(s=>s.task?.type==='matching');await go(first,matching.id);
 const popup=context.waitForEvent('page');await page.getByRole('button',{name:'Начать занятие в двух окнах'}).click();const audience=await popup;
 audience.on('pageerror',e=>report.errors.push(e.message));await page.locator('.connection.connected').waitFor();await audience.locator('.matching-board').waitFor();
 const board=page.locator('.mini-stage:not(.next-stage) .matching-board'),key=bank.keys[matching.task.id];
 for(const item of matching.task.items){await board.getByRole('combobox',{name:'Соответствие: '+item.text,exact:true}).selectOption(key.pairs[item.id]);await audience.locator(`[data-match-id="${item.id}"] [data-match-value="${key.pairs[item.id]}"]`).waitFor();}
 const leftIds=async(p)=>p.locator('[data-match-id]').evaluateAll(nodes=>nodes.map(el=>el.getAttribute('data-match-id')));
 const rightIds=async(p)=>p.locator('[data-option-id]').evaluateAll(nodes=>nodes.map(el=>el.getAttribute('data-option-id')));
 const move=board.locator('.matching-list').first().getByRole('button',{name:/Опустить понятие/}).first();await move.click();
 await audience.waitForFunction(ids=>JSON.stringify([...document.querySelectorAll('[data-match-id]')].map(n=>n.dataset.matchId))===JSON.stringify(ids),await leftIds(board));
 await board.getByRole('button',{name:'Перемешать списки'}).click();
 await audience.waitForFunction(ids=>JSON.stringify([...document.querySelectorAll('[data-option-id]')].map(n=>n.dataset.optionId))===JSON.stringify(ids),await rightIds(board));
 await board.locator('.matching-list').first().evaluate(el=>{el.scrollTop=90;});
 const scroll=await board.locator('.matching-list').first().evaluate(el=>el.scrollTop/Math.max(1,el.scrollHeight-el.clientHeight));
 await audience.waitForFunction(ratio=>{const el=document.querySelector('.matching-list');return Math.abs(el.scrollTop-ratio*Math.max(0,el.scrollHeight-el.clientHeight))<2;},scroll);
 await audience.reload();await audience.locator('.matching-board').waitFor();for(const item of matching.task.items)await audience.locator(`[data-match-id="${item.id}"] [data-match-value="${key.pairs[item.id]}"]`).waitFor();
 assert.deepEqual(await leftIds(audience),await leftIds(board));assert.deepEqual(await rightIds(audience),await rightIds(board));
 report.matching=['selected pairs visible','left reorder','both lists shuffle','scroll position','audience reload'];
 await page.screenshot({path:'output/playwright/v5-matching-presenter.png'});await audience.screenshot({path:'output/playwright/v5-matching-audience.png'});
 const panel=page.getByRole('tabpanel');assert.equal((await panel.innerText()).trim(),pack.notes[matching.id].script.trim());assert.match(await page.locator('.notes-version').innerText(),/teaching-v5/);report.notes.push('fresh published v5 scenario shown in presenter');
 await page.getByRole('button',{name:'Эксперимент',exact:true}).click();await audience.locator('[data-slide-id="'+first.id+'-experiment-start"]').waitFor();await page.getByRole('button',{name:'Следующий слайд'}).click();await audience.locator('.laboratory').waitFor();
 await page.getByRole('button',{name:'Развернуть эксперимент'}).click();await audience.locator('dialog[open]').waitFor();
 await page.locator('dialog[open]').getByRole('combobox',{name:'Статус ограничения'}).selectOption('Подтверждено');await page.locator('dialog[open]').getByRole('combobox',{name:'Ячейка',exact:true}).selectOption('B-02: 2–8 °C');
 await audience.locator('dialog[open] .studio-artifact').filter({hasText:'Разместить в B-02'}).waitFor();
 const timing=await Promise.all([page,audience].map(p=>p.locator('dialog[open] .warehouse-packet').evaluate(el=>Number.parseFloat(getComputedStyle(el).animationDelay))));assert.ok(Math.abs(timing[0]-timing[1])<.7,JSON.stringify(timing));
 await page.getByRole('button',{name:'Зафиксировать результат запуска'}).click();await audience.locator('.laboratory-comparison>ol>li').waitFor();
 await page.keyboard.press('Escape');await audience.locator('dialog[open]').waitFor({state:'hidden'});
 await audience.close();
 await page.setViewportSize({width:390,height:844});
 for(const l of c.lectures){
  await go(l,l.id+'-experiment');await page.getByRole('button',{name:'Развернуть эксперимент'}).click();
  const area=page.locator('dialog[open] .laboratory');await area.waitFor();
  await area.getByRole('combobox',{name:'Набор условий'}).selectOption('Проверка границы');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),l.id);
  await area.getByRole('button',{name:'Зафиксировать результат запуска'}).click();
  assert.ok(await area.locator('.laboratory-comparison>ol>li').count()>0);
  if(l===first)await page.screenshot({path:'output/playwright/v5-laboratory-mobile.png'});
  report.mobileLaboratories.push(l.id);await page.keyboard.press('Escape');
 }
 await page.setViewportSize({width:1440,height:1000});
 for(const l of c.lectures)for(const slide of l.slides.filter(s=>/-c\d+-decision$/.test(s.id))){
  await go(l,slide.id);await page.locator('.experiment-choices').waitFor();
  for(const button of await page.locator('.experiment-choices button').all()){
   await button.click();assert.ok(await page.locator('.experiment-result strong').innerText());
  }
  report.choices++;
 }
 assert.deepEqual(report.errors,[]);report.status='passed';
}catch(error){report.status='failed';report.failure=String(error);throw error;}finally{
 const result=JSON.stringify(report,null,2)+'\n';
 await fs.writeFile('reports/teaching-v5.json',result);await fs.writeFile('reports/interactions.json',result);await browser.close();
}
console.log(JSON.stringify({status:report.status,laboratories:report.laboratories.length,mobileLaboratories:report.mobileLaboratories.length,choices:report.choices,lectures:report.lectures.length,matching:report.matching,notes:report.notes}));
