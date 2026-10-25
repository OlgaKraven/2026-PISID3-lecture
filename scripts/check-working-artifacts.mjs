import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {launchBrowser,siteUrl} from './runtime.mjs';
const course=JSON.parse(await fs.readFile('public/course.json','utf8'));
const entries=JSON.parse(await fs.readFile('public/teaching-artifacts.json','utf8'));
const staticOnly=process.argv.includes('--static'),mobileOnly=process.argv.includes('--mobile');
const report={mode:staticOnly?'static':mobileOnly?'mobile':'full',url:siteUrl,version:course.contentVersion,examples:[],static:[],mobile:[],errors:[]};
const browser=await launchBrowser(),context=await browser.newContext({viewport:{width:1600,height:1100},reducedMotion:'reduce'}),page=await context.newPage();page.setDefaultTimeout(12000);
page.on('pageerror',e=>report.errors.push(e.message));
let audience,p,a;
const button=name=>p.getByRole('button',{name,exact:true});
async function choose(name){await button(name).click();assert(await p.isVisible());}
async function edit(){const start=button('Продолжить черновик D-17');if(await start.isVisible())await start.click();}
async function submit(ship,amount){await edit();await p.getByLabel('Количество, шт.',{exact:true}).fill(String(amount));await button('Продолжить').click();await button(ship?'Подтвердить отбор':'Подтвердить приёмку').click();await a.getByRole('button',{name:'Подтверждение выполняется',exact:true}).waitFor();await button('Показать ответ системы').click();}
async function evidence(text){await a.locator('.artifact-evidence').filter({hasText:text}).waitFor();assert((await p.locator('.artifact-evidence').innerText()).includes(text));}
async function go(l,s){
 const n=l.slides.findIndex(x=>x.id===s.id)+1;
 if(await page.locator('.mini-stage:not(.next-stage) [data-slide-id="'+s.id+'"]').count())return;
 await page.getByRole('button',{name:'Содержание',exact:true}).click();await page.getByRole('button',{name:String(n).padStart(2,'0')+' '+s.title,exact:true}).click();await audience.locator('[data-slide-id="'+s.id+'"]').waitFor();
}
try{
 for(const l of (staticOnly||mobileOnly?[]:course.lectures).filter(l=>entries.some(e=>e.id.startsWith(l.id+'-')))){
  const own=entries.filter(e=>e.id.startsWith(l.id+'-'));
  await page.goto(siteUrl+`?lecture=${l.id}&slide=${own[0].id}`);const popup=context.waitForEvent('page');await page.getByRole('button',{name:'Режим показа',exact:true}).click();audience=await popup;await audience.locator('.audience-slide').waitFor();
  for(const e of own){
   const s=l.slides.find(s=>s.id===e.id);await go(l,s);
   const launch=page.getByRole('button',{name:'Развернуть пример',exact:true});await launch.focus();await page.keyboard.press('Enter');
   p=page.locator('.artifact-dialog[open]');a=audience.locator('.artifact-dialog[open]');await a.waitFor();
   const ship=e.operation==='shipment';
   if(e.kind==='story'){
    const sentence=await p.locator('.story-sentence').innerText();assert(sentence.startsWith('Как кладовщик, я хочу '));assert(sentence.includes(', чтобы '));
    await button('Цель').click();await a.locator('mark[data-focus=true]').filter({hasText:ship?'подтвердить отбор':'зарегистрировать поступившую'}).waitFor();assert.equal(await p.locator('.story-sentence').innerText(),sentence);
    await button('Ценность').click();await a.locator('mark[data-focus=true]').filter({hasText:ship?'не передать':'остаток соответствовал'}).waitFor();assert.equal(await p.locator('.story-sentence').innerText(),sentence);
   }
   await choose(ship?'Разрешённая партия':'Обычная приёмка');await edit();
   await p.getByLabel('Количество, шт.',{exact:true}).fill(ship?'2':'10');await button('Продолжить').click();await button('Исправить количество').click();assert.equal(await p.getByLabel('Количество, шт.',{exact:true}).inputValue(),ship?'2':'10');
   await submit(ship,ship?2:8);await evidence(ship?'→ 7 шт.; подтверждений 1':'→ 18 шт.; подтверждений 1');
   if(ship){
    await choose('Карантин');await submit(true,2);await a.getByRole('alert').filter({hasText:'карантине'}).waitFor();await evidence('→ 9 шт.; подтверждений 0');
    await choose('Дефект: списание до проверки');await submit(true,2);await evidence('Критерий НЕ выполнен');
   }else{
    await choose('Партия не найдена');await edit();await button('Продолжить').click();await a.getByRole('alert').filter({hasText:'Партия не найдена'}).waitFor();assert.equal(await p.getByLabel('Количество, шт.',{exact:true}).inputValue(),'quantity' in e?e.quantity:'8');await evidence('→ 10 шт.; подтверждений 0');
    await choose('Повтор OP-17');await submit(false,8);await evidence('→ 18 шт.; подтверждений 1');
    await choose('Повтор OP-17');await submit(false,9);await a.getByRole('alert').filter({hasText:'Конфликт OP-17'}).waitFor();await evidence('→ 18 шт.; подтверждений 1');
    await choose('Ответ потерян');await submit(false,8);await evidence('Исход пока неизвестен клиенту');await button('Уточнить исход OP-17').click();await evidence('→ 18 шт.; подтверждений 1');
    await choose('Длинный код');await edit();await p.getByLabel('Количество, шт.',{exact:true}).fill('8');await button('Продолжить').click();await a.locator('.wireframe-code').filter({hasText:'P-2026-000018-0000000012345678901234567890'}).waitFor();
   }
   if(e.id.endsWith('Q01-worked')){await page.screenshot({path:`output/playwright/artifact-${l.id}-presenter.png`});await audience.screenshot({path:`output/playwright/artifact-${l.id}-audience.png`});await audience.reload();await audience.locator('.artifact-dialog[open]').waitFor();}
   await page.keyboard.press('Escape');await audience.locator('.artifact-dialog').waitFor({state:'hidden'});assert(await launch.evaluate(n=>document.activeElement===n));await launch.click();await a.waitFor();await button('Вернуться к слайду').click();await a.waitFor({state:'hidden'});assert(await launch.evaluate(n=>document.activeElement===n));
   report.examples.push({id:e.id,fullArtifact:true,positive:true,negative:true,returnPreservesInput:true,audience:true,focusRestored:true});console.log(e.id+': actual artifact and interaction passed');
  }
  await page.getByRole('button',{name:'Завершить показ',exact:true}).click();await audience.close();audience=undefined;
 }
 for(const e of entries){
  await page.goto(siteUrl+`artifacts/${e.id}.svg`);await page.evaluate(()=>document.fonts.ready);
  const outside=await page.locator('svg').evaluate(svg=>{const b=svg.viewBox.baseVal;return [...svg.querySelectorAll('text')].filter(n=>{const r=n.getBBox();return r.x<0||r.y<0||r.x+r.width>b.width+1||r.y+r.height>b.height+1}).map(n=>n.textContent)});assert.deepEqual(outside,[],e.id+' static text outside canvas');
  report.static.push(e.id);
 }
 await page.setViewportSize({width:390,height:844});
 for(const theme of (staticOnly?[]:['light','dark']))for(const e of entries.filter(e=>e.id.endsWith('Q01-worked'))){
  const l=course.lectures.find(l=>e.id.startsWith(l.id+'-'));await page.goto(siteUrl+`?lecture=${l.id}&slide=${e.id}`);await page.getByRole('button',{name:'Развернуть пример',exact:true}).waitFor();await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);await page.getByRole('button',{name:'Развернуть пример',exact:true}).click();const dialog=page.locator('.artifact-dialog[open]');await dialog.waitFor();
  assert(await dialog.evaluate(n=>n.scrollWidth<=n.clientWidth+2),e.id+' mobile overflow');assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
  await page.screenshot({path:`output/playwright/artifact-${l.id}-${theme}-390.png`});await dialog.getByRole('button',{name:'Вернуться к слайду',exact:true}).click();report.mobile.push({id:e.id,theme});
 }
 if(!staticOnly&&!mobileOnly)assert.equal(report.examples.length,entries.length);assert.deepEqual(report.errors,[]);report.status='passed';
}catch(error){report.status='failed';report.failure=String(error);await page.screenshot({path:'output/playwright/artifact-working-failure.png'});throw error;}
finally{await fs.writeFile(process.env.ARTIFACT_REPORT||(staticOnly?'reports/static-artifacts.json':mobileOnly?'reports/mobile-artifacts.json':'reports/working-artifacts.json'),JSON.stringify(report,null,2)+'\n');await browser.close();}
