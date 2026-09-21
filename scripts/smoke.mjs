import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {launchBrowser,siteUrl} from './runtime.mjs';
const c=JSON.parse(await fs.readFile('public/course.json','utf8')),bank=JSON.parse(await fs.readFile('public/assessment.json','utf8'));
const browser=await launchBrowser(),report={viewports:[],assessment:[],session:[],errors:[]};
const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'});
const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
const go=async(l,s)=>{await page.goto(siteUrl+'?lecture='+l.id+'&slide='+s.id);await page.locator('.active-slide .slide-frame').waitFor();};
try{
 await page.goto(siteUrl);await page.getByRole('button',{name:'Открыть',exact:true}).first().waitFor();assert.equal(await page.getByRole('button',{name:'Открыть',exact:true}).count(),26);
 await page.getByRole('textbox',{name:'Поиск по всему курсу'}).fill('матрица');assert.ok(await page.getByRole('button',{name:'Открыть',exact:true}).count()<26);
 for(const width of (process.env.VIEWPORTS||'1920,1366,390').split(',').map(Number)){
  await page.setViewportSize({width,height:width===390?844:1080});let checked=0;
  for(const l of c.lectures){
   await go(l,l.slides[0]);
   for(let i=0;i<l.slides.length;i++){
    const expected=l.slides[i].id;await page.waitForFunction(id=>document.querySelector('.active-slide .slide-frame')?.getAttribute('data-slide-id')===id,expected);
    const over=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);assert.ok(over<=2,expected+' horizontal '+over);
    report.lastSlide={width,id:expected};
    if(i<l.slides.length-1){const next=page.getByRole('button',{name:'Вперёд',exact:true});await next.evaluate(el=>el.scrollIntoView({behavior:'instant',block:'center'}));await next.click();}checked++;
   }
  }
  report.viewports.push({width,slides:checked});console.log('Viewer '+width+': '+checked);
 }
 await page.setViewportSize({width:1440,height:900});
 const l=c.lectures[0],tasks=l.slides.filter(s=>s.task).slice(0,4);
 for(const s of tasks){await go(l,s);const t=s.task,k=bank.keys[t.id];await page.getByRole('button',{name:'Проверить',exact:true}).click();await page.getByRole('alert').filter({hasText:'Пустое поле'}).waitFor();
  if(t.type==='single'){await page.getByRole('radio').nth(1).check();await page.getByRole('button',{name:'Проверить',exact:true}).click();await page.locator('.task-status.incorrect').waitFor();await page.getByRole('button',{name:'Ещё попытка'}).click();await page.getByRole('radio').nth(t.options.findIndex(o=>o.id===k.correct[0])).check();}
  if(t.type==='multiple'){await page.getByRole('checkbox').nth(t.options.findIndex(o=>o.id===k.correct[0])).check();await page.getByRole('button',{name:'Проверить',exact:true}).click();await page.locator('.task-status.incorrect').waitFor();await page.getByRole('button',{name:'Ещё попытка'}).click();for(const id of k.correct)await page.getByRole('checkbox').nth(t.options.findIndex(o=>o.id===id)).check();}
  if(t.type==='short'){await page.getByRole('textbox',{name:'Краткий ответ'}).fill('0');await page.getByRole('button',{name:'Проверить',exact:true}).click();await page.locator('.task-status.incorrect').waitFor();await page.getByRole('button',{name:'Ещё попытка'}).click();await page.getByRole('textbox',{name:'Краткий ответ'}).fill('  '+k.accepted[0].toUpperCase()+'  ');}
  if(t.type==='matching'){await page.getByRole('combobox').first().selectOption(k.pairs[t.items[0].id]);await page.getByRole('button',{name:'Проверить',exact:true}).click();assert.match(await page.locator('.task-status').innerText(),/0,25/);await page.getByRole('button',{name:'Ещё попытка'}).click();for(const [i,item] of t.items.entries())await page.getByRole('combobox').nth(i).selectOption(k.pairs[item.id]);}
  await page.getByRole('button',{name:'Проверить',exact:true}).click();await page.locator('.task-status.correct').waitFor();await page.getByRole('button',{name:'Разбор ответа',exact:true}).click();await page.getByRole('dialog').waitFor();await page.keyboard.press('Escape');await page.reload();await page.locator('.task-status.correct').waitFor();
  await page.setViewportSize({width:390,height:844});await page.getByRole('status').filter({hasText:'Ответ сохранён'}).waitFor();assert.equal(await page.getByRole('button',{name:'Разбор ответа',exact:true}).count(),0);assert.equal(await page.getByRole('button',{name:'Ещё попытка'}).count(),0);await page.reload();await page.getByRole('status').filter({hasText:'Ответ сохранён'}).waitFor();await page.setViewportSize({width:1440,height:900});report.assessment.push(t.type);
 }
 const worked=l.slides.find(s=>s.id.endsWith('Q01-worked'));await go(l,worked);
 const popup=context.waitForEvent('page');await page.getByRole('button',{name:'Начать занятие в двух окнах'}).click();const audience=await popup,requests=[];audience.on('request',r=>requests.push(r.url()));
 await audience.locator('[data-slide-id="'+worked.id+'"]').waitFor();await page.locator('.connection.connected').waitFor();
 await page.locator('input[type=file]').setInputFiles('public/teacher-pack.json');await page.getByRole('button',{name:'Применить заметки'}).click();assert.match(await page.getByRole('tabpanel').innerText(),/P-17/);assert.equal(await audience.locator('.note-reader').count(),0);
 await page.getByRole('button',{name:'Рассмотреть схему',exact:true}).click();await audience.getByRole('dialog').waitFor();await page.keyboard.press('Escape');await audience.getByRole('dialog').waitFor({state:'hidden'});
 await page.getByRole('button',{name:'Вперёд',exact:true}).click();await audience.locator('[data-slide-id="'+tasks[0].id+'"]').waitFor();await audience.reload();await audience.locator('[data-slide-id="'+tasks[0].id+'"]').waitFor();
 await page.getByRole('button',{name:'Чёрный экран',exact:true}).click();await audience.locator('.black-screen').waitFor();await page.getByRole('button',{name:'Вернуть слайд'}).click();await audience.locator('[data-slide-id]').waitFor();assert.ok(!requests.some(u=>u.endsWith('/assessment.json')));report.session=['two windows','notes import','diagram open/close sync','navigation','audience reload','black screen','no bank request'];
 await page.screenshot({path:'output/playwright/presenter.png',fullPage:true});await audience.screenshot({path:'output/playwright/audience.png'});
 assert.deepEqual(report.errors,[]);report.status='passed';
}catch(e){report.failure=String(e);throw e;}finally{await fs.writeFile('reports/browser.json',JSON.stringify(report,null,2));await browser.close();}
