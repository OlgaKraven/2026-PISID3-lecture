import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {launchBrowser,siteUrl} from './runtime.mjs';
const c=JSON.parse(await fs.readFile('public/course.json','utf8')),l=c.lectures.find(l=>l.id.startsWith('23-')),entries=JSON.parse(await fs.readFile('public/form-artifacts.json','utf8'));
const report={url:siteUrl,version:c.contentVersion,examples:[],mobile:[],errors:[]};
const b=await launchBrowser(),ctx=await b.newContext({viewport:{width:1600,height:1100},reducedMotion:'reduce'}),page=await ctx.newPage();page.setDefaultTimeout(12000);page.on('pageerror',e=>report.errors.push(e.message));
let audience,p,a;
const button=name=>p.getByRole('button',{name,exact:true});
const code=()=>p.getByLabel('Код партии',{exact:true}),qty=()=>p.getByLabel('Количество, шт.',{exact:true});
async function choose(name){await button(name).click();await code().waitFor();}
async function send(){await button('Подтвердить отбор').click();await a.getByRole('button',{name:'Подтверждаем…',exact:true}).waitFor();assert(await code().getAttribute('readonly')!==null);await button('Показать ответ системы').click();}
async function evidence(text){await a.locator('.artifact-evidence').filter({hasText:text}).waitFor();assert((await p.locator('.artifact-evidence').innerText()).includes(text));}
try{
 await page.goto(siteUrl+`?lecture=${l.id}&slide=${entries[0].id}`);const popup=ctx.waitForEvent('page');await page.getByRole('button',{name:'Режим показа',exact:true}).click();audience=await popup;await audience.locator('.audience-slide').waitFor();
 for(const e of entries){
  if(e!==entries[0]){const n=l.slides.findIndex(s=>s.id===e.id)+1,s=l.slides[n-1];await page.getByRole('button',{name:'Содержание',exact:true}).click();await page.getByRole('button',{name:String(n).padStart(2,'0')+' '+s.title,exact:true}).click();await audience.locator('[data-slide-id="'+e.id+'"]').waitFor();}
  const launch=page.getByRole('button',{name:'Развернуть пример',exact:true});await launch.focus();await page.keyboard.press('Enter');p=page.locator('.form-artifact-dialog[open]');a=audience.locator('.form-artifact-dialog[open]');await a.waitFor();
  await choose('Обычный отбор');await qty().fill('');await button('Сохранить черновик').click();await a.getByRole('status').filter({hasText:'Учёт не подтверждён'}).waitFor();await evidence('Актуальный остаток: 10 шт.; документов отбора: 0');
  await qty().fill('-1');await button('Подтвердить отбор').click();await a.getByRole('alert').filter({hasText:'целое число'}).waitFor();assert(await qty().evaluate(n=>document.activeElement===n));
  for(const bad of ['12','AB12']){await code().fill(bad);await qty().fill('8');await button('Подтвердить отбор').click();await a.getByRole('alert').filter({hasText:'четыре цифры'}).waitFor();assert.equal(await code().inputValue(),bad);assert(await code().evaluate(n=>document.activeElement===n));}
  await code().fill('0012');await send();await evidence('Актуальный остаток: 2 шт.; документов отбора: 1');await a.getByRole('heading',{name:'D23 подтверждён',exact:true}).waitFor();
  await choose('Остаток изменился');await qty().fill('8');await send();await a.getByRole('alert').filter({hasText:'доступно 5'}).waitFor();assert.equal(await qty().inputValue(),'8');await evidence('Актуальный остаток: 5 шт.; документов отбора: 0');
  if(e.id.endsWith('Q01-worked')){await page.screenshot({path:'output/playwright/form-server-refusal-presenter.png'});await audience.screenshot({path:'output/playwright/form-server-refusal-audience.png'});}
  await qty().fill('5');await send();await evidence('Актуальный остаток: 0 шт.; документов отбора: 1');await a.getByRole('heading',{name:'D24 подтверждён',exact:true}).waitFor();
  await choose('Партия не найдена');await qty().fill('8');await send();await a.getByRole('alert').filter({hasText:'Партия не найдена'}).waitFor();assert.equal(await qty().inputValue(),'8');await evidence('Актуальный остаток: 10 шт.; документов отбора: 0');
  await choose('Карантин');await send();await a.getByRole('alert').filter({hasText:'карантине'}).waitFor();assert.equal(await qty().inputValue(),'5');await evidence('Актуальный остаток: 10 шт.; документов отбора: 0');
  for(const recovery of ['Уточнить исход','Повторить тот же запрос']){await choose('Ответ потерян');await qty().fill('8');await send();await evidence('Исход пока неизвестен пользователю');await button(recovery).click();await evidence('Актуальный остаток: 2 шт.; документов отбора: 1');}
  await choose('Пустой результат');await button('Найти партию').click();await a.locator('.form-search [role=status]').filter({hasText:'Ничего не найдено'}).waitFor();await button('Изменить условия').click();await p.getByLabel('Код для поиска',{exact:true}).fill('0012');await button('Найти партию').click();await a.locator('.form-search [role=status]').filter({hasText:'Найдена 0012'}).waitFor();
  await choose('Сбой сети в поиске');await button('Найти партию').click();await a.locator('.form-search [role=alert]').filter({hasText:'Не удалось загрузить'}).waitFor();await button('Повторить поиск').click();assert(await p.locator('.form-search [role=alert]').isVisible());
  if(e.id.endsWith('Q01-worked')){await audience.reload();await audience.locator('.form-artifact-dialog[open]').waitFor();}
  await page.keyboard.press('Escape');await audience.locator('.form-artifact-dialog').waitFor({state:'hidden'});assert(await launch.evaluate(n=>document.activeElement===n));await launch.click();await a.waitFor();await button('Вернуться к слайду').click();await a.waitFor({state:'hidden'});assert(await launch.evaluate(n=>document.activeElement===n));
  report.examples.push({id:e.id,draft:true,clientFormat:true,serverRefusal:true,correctedAttempt:true,quarantine:true,unknown:true,safeRepeat:true,emptyVsFailure:true,audience:true,keyboard:true});console.log(e.id+': passed');
 }
 await page.getByRole('button',{name:'Завершить показ',exact:true}).click();await audience.close();
 for(const theme of ['light','dark']){await page.setViewportSize({width:390,height:844});await page.goto(siteUrl+`?lecture=${l.id}&slide=${l.id}-Q01-worked`);await page.getByRole('button',{name:'Развернуть пример',exact:true}).waitFor();await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);await page.getByRole('button',{name:'Развернуть пример',exact:true}).click();const d=page.locator('.form-artifact-dialog[open]');await d.waitFor();assert(await d.evaluate(n=>n.scrollWidth<=n.clientWidth+2));await d.getByRole('button',{name:'Обычный отбор',exact:true}).click();assert((await d.getByLabel('Код партии',{exact:true}).boundingBox()).height>=44);await page.screenshot({path:'output/playwright/form-'+theme+'-390.png'});await d.getByRole('button',{name:'Вернуться к слайду',exact:true}).click();report.mobile.push(theme);}
 assert.equal(report.examples.length,entries.length);assert.deepEqual(report.errors,[]);report.status='passed';
}catch(e){report.status='failed';report.failure=String(e);await page.screenshot({path:'output/playwright/form-failure.png'});throw e;}
finally{await fs.writeFile(process.env.FORM_REPORT||'reports/form-artifacts.json',JSON.stringify(report,null,2)+'\n');await b.close();}
