import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {launchBrowser,siteUrl} from './runtime.mjs';
const labs=JSON.parse(await fs.readFile('public/laboratories.json','utf8'));
const course=JSON.parse(await fs.readFile('public/course.json','utf8'));
const reportPath=process.env.LAB_REPORT||'reports/lab-solutions-third.json';
const report=process.argv.includes('--resume')?JSON.parse(await fs.readFile(reportPath,'utf8')):{url:siteUrl,version:course.contentVersion,startedAt:new Date().toISOString(),labs:[],errors:[]};
assert.equal(report.url,siteUrl);assert.equal(report.version,course.contentVersion);delete report.failure;
const browser=await launchBrowser(),context=await browser.newContext({viewport:{width:1600,height:1000},reducedMotion:'reduce'});
const page=await context.newPage();page.setDefaultTimeout(12000);
page.on('pageerror',e=>report.errors.push(e.message));
let audience,p,a;
async function choose(label,value){const c=p.getByRole('combobox',{name:label,exact:true});if((await c.innerText()).includes(value))return;await c.click();await p.getByRole('option',{name:value,exact:true}).click();}
async function range(label,value){const r=p.getByRole('slider',{name:label,exact:true}),min=Number(await r.getAttribute('min')),max=Number(await r.getAttribute('max'));await r.focus();await r.press(value-min<max-value?'Home':'End');for(let i=0;i<Math.min(value-min,max-value);i++)await r.press(value-min<max-value?'ArrowRight':'ArrowLeft');assert.equal(Number(await r.inputValue()),value);}
async function check(text){await p.locator('[role=status]').filter({hasText:text}).first().waitFor();await a.locator('[role=status]').filter({hasText:text}).first().waitFor();}
const click=name=>p.getByRole('button',{name,exact:true}).click();
try{
for(const [i,lab] of [...labs.entries()].slice(report.labs.length)){
 const l=course.lectures[i];await page.goto(siteUrl+`?lecture=${l.id}&slide=${l.id}-experiment`);
 const popup=context.waitForEvent('page');await page.getByRole('button',{name:'Режим показа',exact:true}).click();audience=await popup;
 p=page.locator('.mini-stage:not(.next-stage) .experiment');a=audience.locator('.audience-slide .experiment');await a.waitFor();
 const checks=[];
 if(lab.kind==='studio'){
  for(const f of lab.fields)await choose(f.label,i===0&&f.id==='capacity'?'Есть место':f.options.at(-1));
  await p.getByText('Условия этого случая согласованы.',{exact:false}).waitFor();await a.getByText('Условия этого случая согласованы.',{exact:false}).waitFor();
  assert.equal(await p.locator('.studio-artifact li').count(),0);checks.push('All specified decisions resolve the case');
 }else switch(lab.kind){
 case 'rules':
  await range('Остаток',10);await range('Заказ',10);await check('останется 0');await range('Заказ',11);await check('превышает остаток');await range('Заказ',10);await p.getByLabel('Партия в карантине').check();await check('карантин имеет приоритет');checks.push('10 allowed; 11 refused; quarantine refused');break;
 case 'history':
  await range('Новое количество',8);await p.getByRole('textbox',{name:'Причина исправления',exact:true}).fill('Пересчёт');await click('Внести исправление');await check('10 → 8');await range('Новое количество',9);await p.getByRole('textbox',{name:'Причина исправления',exact:true}).fill('Повторная проверка');await click('Внести исправление');await check('8 → 9');assert.equal(await a.locator('.experiment-log li').count(),3);checks.push('10 → 8 → 9; both events retained');break;
 case 'coverage':
  for(const name of ['Модель статуса','Серверный запрет','Состояние формы','Отрицательный тест'])await p.getByRole('checkbox',{name,exact:true}).check();await check('4 / 4');checks.push('Four layers required');break;
 case 'weights':
  await range('Вес маршрута',50);await check('Выбор: B');await range('Вес маршрута',80);await check('Выбор: A');await range('Вес маршрута',60);await check('Равенство');await p.getByLabel('A выполняет обязательное условие').uncheck();await check('A исключён');checks.push('50% B; 80% A; 60% tie; mandatory exclusion');break;
 case 'offline':
  await click('Отправить операцию');await click('Отправить операцию');await check('Остаток: 20 ед. · доставок: 2');await choose('Набор условий','Изменённое условие');await click('Отправить операцию');await click('Отправить операцию');await check('Остаток: 30 ед. · доставок: 2');checks.push('Two independent runs: protected 20; unprotected 30');break;
 case 'cost':
  await check('5.0 мин в день');await range('Лишнее действие',5);await check('8.3 мин в день');checks.push('100 × 3 = 300 s; 100 × 5 = 500 s');break;
 case 'search':
  await p.getByRole('textbox',{name:'Номер партии',exact:true}).fill('P-17');await choose('Статус','Доступна');await check('Совпадений нет');await choose('Статус','Все');await check('P-17');checks.push('Intersection empty; reset restores P-17');break;
 case 'prototype':
  await click('Проверить приёмку');await click('Исправить количество');await range('Количество P-18',8);await click('Проверить приёмку');await click('Подтвердить приёмку');await check('P-18 · 8 ед.');checks.push('Back retains input; revised 8 confirmed once');break;
 case 'form':
  await click('Зарегистрировать приёмку');await check('Запрос на сервер ещё не отправлен');await p.getByRole('textbox',{name:/^Партия \(обязательно\)/}).fill('P-17');await p.getByRole('textbox',{name:/^Количество \(обязательно\)/}).fill('5');await click('Зарегистрировать приёмку');await check('Отказ сервера');assert.equal(await a.getByRole('textbox',{name:/^Количество \(обязательно\)/}).inputValue(),'5');await p.getByRole('textbox',{name:/^Партия \(обязательно\)/}).fill('P-18');await click('Зарегистрировать приёмку');await check('Приёмка зарегистрирована');checks.push('Invalid input; quarantine rejected; 5 preserved; valid party accepted');break;
 case 'contrast':
  await range('Яркость текста',119);await check('4.4781:1 — AA для обычного текста не выполнен');await range('Яркость текста',118);await check('4.5422:1 — AA для обычного текста выполнен');checks.push('Unrounded threshold distinguishes #777 and #767');break;
 case 'access':
  await choose('Роль','Руководитель');await choose('Операция','Подтверждение корректировки');await choose('Зона партии','Своя');await check('Учебная проверка разрешает');await click('Выполнить учебный запрос');await p.locator('.access-evidence').filter({hasText:'Остаток: 8 шт.; учётных движений: 1'}).waitFor();await click('Выполнить учебный запрос');await a.locator('.access-evidence').filter({hasText:'второе движение не создано'}).waitFor();await click('Сбросить состояние запроса');await choose('Зона партии','Чужая');await check('Учебная проверка отклоняет');await click('Выполнить учебный запрос');await a.locator('.access-evidence').filter({hasText:'Остаток: 10 шт.; учётных движений: 0'}).waitFor();checks.push('Own independent confirmation 10→8 once; foreign denied without effect');break;
 case 'auth':
  for(let k=0;k<3;k++)await click('Неверный пароль');await check('Вход заблокирован');await click('Верный пароль');await check('Вход заблокирован');await click('Администратор: разблокировать');await click('Верный пароль');await check('Сессия создана');checks.push('Three failures; valid password blocked; authorized reset then login');break;
 default:throw Error('Unreviewed laboratory kind '+lab.kind);
 }
 await p.getByRole('button',{name:'Развернуть эксперимент',exact:true}).click();await audience.locator('.laboratory-dialog[open]').waitFor();await page.keyboard.press('Escape');await audience.locator('.laboratory-dialog').waitFor({state:'hidden'});
 assert(await p.getByRole('button',{name:'Развернуть эксперимент',exact:true}).evaluate(n=>n===document.activeElement),'Focus must return after Escape');
 report.labs.push({id:l.id,kind:lab.kind,checks,audience:true,focusRestored:true});console.log(l.id+': solution and audience checked');
 await page.getByRole('button',{name:'Завершить показ',exact:true}).click();await audience.close();
}
assert.deepEqual(report.errors,[]);report.status='passed';
}catch(e){report.status='failed';report.failure=String(e);await page.screenshot({path:'output/playwright/lab-solution-failure.png'});throw e;}
finally{report.finishedAt=new Date().toISOString();await fs.writeFile(reportPath,JSON.stringify(report,null,2)+'\n');await browser.close();}
