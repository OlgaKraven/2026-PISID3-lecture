import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {launchBrowser,siteUrl} from './runtime.mjs';
const course=JSON.parse(await fs.readFile('public/course.json','utf8'));
const experiments=JSON.parse(await fs.readFile('public/question-experiments.json','utf8'));
const mobileOnly=process.argv.includes('--mobile');
const report=mobileOnly?JSON.parse(await fs.readFile('reports/question-experiments.json','utf8')):{version:course.contentVersion,standalone:[],audience:[],mobile:[],errors:[]};
if(mobileOnly){assert.equal(report.version,course.contentVersion);assert.equal(report.standalone.length,104);assert.equal(report.audience.length,104);report.mobile=[];report.errors=[];delete report.failure;}
assert.equal(experiments.length,104);
for(const l of course.lectures)for(let q=1;q<=4;q++){
 const e=experiments.find(e=>e.lectureId===l.id&&e.question===q),i=l.slides.findIndex(s=>s.id===e.returnSlide);
 assert(i>=0&&l.slides[i+1].task,'Experiment must immediately precede self-assessment: '+e.id);
 assert(l.slides.find(s=>s.id===e.id+'-worked').body,'Worked solution must explain action to student');
 assert.notEqual(e.scenarios[0].result,e.scenarios[1].result);
}
const browser=await launchBrowser(),context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'}),page=await context.newPage();
page.on('pageerror',e=>report.errors.push(e.message));
const panel=()=>page.locator('.case-dialog[open]');
const step=()=>panel().getByRole('button',{name:'Следующий шаг решения',exact:true});
const select=()=>panel().getByRole('combobox',{name:'Условия примера',exact:true});
async function branch(e,i){
 await panel().getByRole('textbox',{name:'Прогноз для выбранного условия',exact:true}).fill('Проверяю условие '+i);
 assert.equal(await panel().locator('.qe-model [data-complete=true]').count(),1);
 await step().click();await step().click();
 assert.ok((await panel().locator('.qe-model').innerText()).includes(e.scenarios[i].result));
 await panel().getByRole('button',{name:'Назад по решению',exact:true}).click();
 assert.equal(await panel().locator('.qe-model [data-complete=true]').count(),2);
 await step().click();await panel().getByRole('button',{name:'Зафиксировать результат запуска',exact:true}).click();
}
let audience;
try{
 if(!mobileOnly){
 for(const e of experiments){
  await page.goto(siteUrl+`?lecture=${e.lectureId}&slide=${e.returnSlide}&experiment=${e.id}`);
  await panel().waitFor();await branch(e,0);
  await select().focus();await select().press('ArrowDown');await select().press('Enter');
  await branch(e,1);assert.equal(await panel().locator('.qe-comparison>ol>li').count(),2);
  await panel().getByRole('button',{name:'Подсказки для работы',exact:true}).click();await panel().locator('.qe-hints').waitFor();
  await panel().getByRole('button',{name:'Схема исходного случая',exact:true}).click();await panel().locator('.qe-reference .infographic').waitFor();
  assert.ok((await panel().locator('.qe-reference').innerText()).includes(e.reading));
  await page.reload();await panel().waitFor();assert.equal(await panel().locator('.qe-comparison>ol>li').count(),2);
  assert.equal(await panel().locator('.case-activity-tabs').count(),0);
  await panel().getByRole('button',{name:'Проверить шаг 1',exact:true}).waitFor();
  await panel().getByRole('button',{name:'Вернуться к слайду',exact:true}).click();await panel().waitFor({state:'hidden'});
  report.standalone.push(e.id);
  if(e.question===4)console.log(e.lectureId+': two conditions, steps, comparison, persistence');
 }
 // A clean context supplies a fresh public presentation session.
 const show=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'}),presenter=await show.newPage();
 await presenter.goto(siteUrl+`?lecture=${experiments[0].lectureId}&slide=${experiments[0].returnSlide}`);
 const popup=show.waitForEvent('page');await presenter.getByRole('button',{name:'Режим показа',exact:true}).click();audience=await popup;
 audience.on('request',r=>{if(r.url().includes('teacher-pack.json'))report.errors.push('Audience requested teacher notes')});
 for(const e of experiments){
  await presenter.evaluate(id=>document.dispatchEvent(new CustomEvent('pisid-experiment',{detail:id})),e.id);
  const p=presenter.locator('.case-dialog[open]'),a=audience.locator('.case-dialog[open]');await a.waitFor();
  await p.getByRole('combobox',{name:'Условия примера',exact:true}).click();
  await a.getByRole('listbox',{name:'Условия примера — варианты',exact:true}).waitFor();
  await p.getByRole('option',{name:'Изменённое условие',exact:true}).click();
  await a.locator('.qe-input').filter({hasText:e.scenarios[1].condition}).waitFor();
  await p.getByRole('textbox',{name:'Прогноз для выбранного условия',exact:true}).fill('Новый прогноз');
  await p.getByRole('button',{name:'Следующий шаг решения',exact:true}).click();
  await p.getByRole('button',{name:'Следующий шаг решения',exact:true}).click();
  await a.locator('.qe-model li').last().filter({hasText:e.scenarios[1].result}).waitFor();
  await p.getByRole('button',{name:'Подсказки для работы',exact:true}).click();await a.locator('.qe-hints').waitFor();
  await p.getByRole('button',{name:'Зафиксировать результат запуска',exact:true}).click();await a.locator('.qe-comparison>ol>li').waitFor();
  if(e.question===4){await audience.reload();await a.waitFor();assert.equal(await a.getByRole('textbox',{name:'Прогноз для выбранного условия',exact:true}).inputValue(),'Новый прогноз');}
  await p.getByRole('button',{name:'Вернуться к слайду',exact:true}).click();await a.waitFor({state:'hidden'});report.audience.push(e.id);
 }
 await presenter.getByRole('button',{name:'Завершить показ',exact:true}).click();await show.close();audience=undefined;
 }
 await page.setViewportSize({width:390,height:844});
 for(const theme of ['light','dark'])for(const e of experiments){
  await page.goto(siteUrl+`?lecture=${e.lectureId}&slide=${e.returnSlide}&experiment=${e.id}`);await panel().waitFor();
  await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);
  const diagramButton=panel().getByRole('button',{name:'Схема исходного случая',exact:true});
  if(await diagramButton.getAttribute('aria-expanded')!=='true')await diagramButton.click();
  await panel().locator('.qe-reference .infographic-mobile').waitFor({state:'visible'});
  assert.equal(await panel().locator('.qe-reference .infographic-canvas').isVisible(),false);
  const overflow=await panel().evaluate(n=>n.scrollWidth>n.clientWidth+2||[...n.querySelectorAll('.qe-model>li')].some(c=>c.getBoundingClientRect().right>n.getBoundingClientRect().right+2));
  assert(!overflow,e.id+' mobile overflow');report.mobile.push({id:e.id,theme});
  if(e.question===4)console.log(e.lectureId+': readable diagram, '+theme+' 390 px');
  if(e.question===1&&['01-project-decisions','16-decision-matrix','26-auth-lockout'].includes(e.lectureId))await panel().locator('.qe-reference').scrollIntoViewIfNeeded();
  if(e.question===1&&['01-project-decisions','16-decision-matrix','26-auth-lockout'].includes(e.lectureId))await page.screenshot({path:`output/playwright/experiment-${e.lectureId}-${theme}-390.png`});
 }
 await page.setViewportSize({width:1440,height:900});await page.goto(siteUrl);await page.getByRole('heading',{level:1}).waitFor();
 assert.equal((await page.getByRole('heading',{level:1}).innerText()).replace(/\s+/g,' '),'Проектирование и дизайн информационных систем');
 await page.screenshot({path:'output/playwright/student-catalog.png'});
 assert.deepEqual(report.errors,[]);report.status='passed';
}catch(e){report.status='failed';report.failure=String(e);throw e}
finally{await fs.writeFile('reports/question-experiments.json',JSON.stringify(report,null,2)+'\n');await browser.close()}
