import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {launchBrowser,siteUrl} from './runtime.mjs';
const course=JSON.parse(await fs.readFile('public/course.json','utf8'));
const browser=await launchBrowser(),report={version:course.contentVersion,laboratories:[],catalog:[],errors:[]};
try{
 const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'}),page=await context.newPage();page.setDefaultTimeout(12000);
 page.on('pageerror',e=>report.errors.push(e.message));
 for(const width of [320,390,1024]){
  await page.setViewportSize({width,height:900});await page.goto(siteUrl+'?tour=1');await page.locator('.ok-topic').first().waitFor();
  assert.equal(await page.locator('.guided-tour').count(),0);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);
  await page.getByRole('button',{name:'Вид: список'}).click();await page.getByRole('searchbox').fill('нет такой темы');await page.getByRole('heading',{name:'Темы не найдены'}).waitFor();
  await page.getByRole('button',{name:'Сбросить поиск'}).click();
  await page.screenshot({path:`output/playwright/catalog-${width}.png`,fullPage:true});report.catalog.push(width);
 }
 await page.setViewportSize({width:1440,height:900});
 for(const l of course.lectures){
  await page.goto(siteUrl+`?lecture=${l.id}&slide=${l.id}-experiment`);await page.locator('.laboratory').waitFor();
  const popup=context.waitForEvent('page');await page.getByRole('button',{name:'Режим показа',exact:true}).click();const audience=await popup;
  await audience.locator('.laboratory').waitFor();
  const lab=page.locator('.mini-stage:not(.next-stage) .laboratory'),screen=audience.locator('.laboratory');
  const controls=lab.getByRole('combobox'),count=await controls.count();
  for(let i=0;i<count;i++){
   const control=controls.nth(i),label=await control.getAttribute('aria-label');
   await control.click();await screen.getByRole('listbox',{name:label+' — варианты',exact:true}).waitFor();
   await control.press('ArrowDown');
   const active=await lab.getByRole('listbox',{name:label+' — варианты',exact:true}).locator('[data-active=true]').innerText();
   await audience.waitForFunction(({label,active})=>[...document.querySelectorAll('[role=listbox]')].some(n=>n.getAttribute('aria-label')===label+' — варианты'&&n.querySelector('[data-active=true]')?.textContent===active),{label,active});
   await control.press('Enter');await screen.getByRole('listbox',{name:label+' — варианты',exact:true}).waitFor({state:'hidden'});
   assert.equal((await screen.getByRole('combobox',{name:label,exact:true}).innerText()).replace('⌄','').trim(),(await control.innerText()).replace('⌄','').trim());
  }
  await lab.getByRole('button',{name:'Развернуть эксперимент'}).click();await audience.locator('dialog[open] .laboratory').waitFor();
  if(l===course.lectures[0])await audience.screenshot({path:'output/playwright/laboratory-new-style.png'});
  await page.getByRole('button',{name:'Подсказки для работы',exact:true}).click();await audience.locator('.laboratory-teacher>p').waitFor();
  await page.getByRole('button',{name:'Зафиксировать результат запуска'}).click();await audience.locator('dialog[open] .laboratory-comparison>ol>li').waitFor();
  await page.keyboard.press('Escape');await audience.locator('dialog[open]').waitFor({state:'hidden'});
  if(l===course.lectures[0]){
   await page.getByLabel('Ещё',{exact:true}).click();await page.getByRole('button',{name:'Сменить тему',exact:true}).click();
   await audience.waitForFunction(()=>document.documentElement.dataset.theme==='dark');
   await page.screenshot({path:'output/playwright/presenter-dark.png'});await audience.screenshot({path:'output/playwright/audience-dark.png'});
   await audience.reload();await audience.locator('.laboratory').waitFor();assert.equal(await audience.locator('.presenter-notes').count(),0);
  }
  report.laboratories.push({id:l.id,dropdowns:count,expandedMirrored:true,trialMirrored:true});console.log(l.id+': '+count+' dropdowns and enlarged experiment');
  await page.getByRole('button',{name:'Завершить показ',exact:true}).click();await audience.close();
 }
 assert.deepEqual(report.errors,[]);report.status='passed';
}catch(e){report.status='failed';report.failure=String(e);throw e;}
finally{await fs.writeFile('reports/display-controls.json',JSON.stringify(report,null,2)+'\n');await browser.close()}
