import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {launchBrowser,siteUrl} from './runtime.mjs';
const course=JSON.parse(await fs.readFile('public/course.json','utf8')),l=course.lectures.find(x=>x.id.startsWith('24-'));
const theme=process.env.COMPONENT_THEME||'light';
const report={url:siteUrl,version:course.contentVersion,theme,cases:[],errors:[]},b=await launchBrowser(),ctx=await b.newContext({viewport:{width:1600,height:1100},reducedMotion:'reduce'}),p=await ctx.newPage();p.setDefaultTimeout(12000);p.on('pageerror',e=>report.errors.push(e.message));let a;
try{
 await p.goto(siteUrl+`?lecture=${l.id}&slide=${l.id}-Q01-practice`);const popup=ctx.waitForEvent('page');await p.getByRole('button',{name:'Режим показа',exact:true}).click();a=await popup;await a.locator('.audience-slide').waitFor();for(const page of [p,a])await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);
 for(let q=1;q<=4;q++){
  const id=l.id+'-Q0'+q,slide=l.slides.find(s=>s.id===id+'-practice'),index=l.slides.indexOf(slide)+1;await p.getByRole('button',{name:'Содержание',exact:true}).click();await p.getByRole('button',{name:String(index).padStart(2,'0')+' '+slide.title,exact:true}).click();const launch=p.locator('.mini-stage:not(.next-stage) .case-passport').getByRole('button',{name:'Начать эксперимент',exact:true});await launch.focus();await p.keyboard.press('Enter');const d=p.locator('.case-dialog[open]'),ad=a.locator('.case-dialog[open]');await ad.waitFor();
  for(let v=0;v<2;v++){
   if(v){const select=d.getByRole('combobox',{name:'Условия примера',exact:true});await select.click();await d.getByRole('option').last().click();}
   const w=d.locator('.ds-workbench'),aw=ad.locator('.ds-workbench');await aw.waitFor();
   if(q===1){
    if(v)assert.equal(await w.getByLabel('Переносить длинный код',{exact:true}).isChecked(),false);
    await w.getByLabel('Переносить длинный код',{exact:true}).check();await aw.locator('[data-wrap=true]').waitFor();
    assert(await w.locator('.ds-layout-sample').evaluate(n=>n.scrollWidth<=n.clientWidth+2),'Repaired long code must fit 320 px');
    assert((await w.locator('.ds-code').innerText()).includes(v?'P-2026-':'P2402'));
    await w.getByLabel('Экран ТСД 320 px',{exact:true}).uncheck();await aw.locator('[data-narrow=false]').waitFor();
   }else if(q===2){
    await w.getByLabel('Общий токен вместо локальных цветов',{exact:true}).check();await w.getByLabel('Изменить общий токен',{exact:true}).check();
    const colors=()=>w.locator('.ds-error').evaluateAll(ns=>ns.map(n=>getComputedStyle(n).color));
    if(v)assert.notEqual((await colors())[0],(await colors())[2],'Local override demonstrates drift');
    await w.getByLabel('Локальное исключение у третьей формы',{exact:true}).uncheck();
    assert.deepEqual(await colors(),Array(3).fill(theme==='dark'?'rgb(255, 113, 106)':'rgb(122, 0, 22)'));
    const ratios=await w.locator('.ds-error').evaluateAll(ns=>{const luminance=color=>{const rgb=color.match(/[\d.]+/g).slice(0,3).map(Number).map(n=>n/255).map(n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722};return ns.map(n=>{const ink=luminance(getComputedStyle(n).color),paper=luminance(getComputedStyle(n.closest('.ds-field-example')).backgroundColor);return (Math.max(ink,paper)+.05)/(Math.min(ink,paper)+.05)})});assert(ratios.every(r=>r>=4.5),'Error text must remain readable in current theme');
    await aw.getByRole('status').filter({hasText:'Все три экземпляра используют один токен.'}).waitFor();
    await w.getByRole('textbox',{name:'Количество, шт.',exact:true}).first().fill('5');assert.equal(await w.locator('.ds-error').count(),2);await aw.locator('.ds-field-example [role=status]').waitFor();
   }else if(q===3){
    await w.getByLabel('Подписывать состояния текстом',{exact:true}).check();await w.getByLabel('Без цветового сигнала',{exact:true}).check();
    await w.locator('.ds-action').hover();await aw.locator('.ds-action[data-hover=true]').waitFor();
    await w.getByRole('button',{name:'Показать реальный фокус',exact:true}).click();assert(await w.locator('.ds-action').evaluate(n=>n===document.activeElement));
    await p.keyboard.press('Enter');await aw.locator('.ds-action[data-component-state=loading]').waitFor();assert(await w.locator('.ds-action').isDisabled());
    await w.getByRole('button',{name:'Показать учебный отказ',exact:true}).click();await aw.getByRole('alert').filter({hasText:'ячейка A-24 не подходит'}).waitFor();assert.equal(await w.getByLabel('Количество, шт.',{exact:true}).inputValue(),'12');
    await w.getByRole('button',{name:'Недоступна',exact:true}).click();assert(await w.locator('.ds-action').isDisabled());await aw.getByText('Действие недоступно: сначала выберите задание.',{exact:true}).waitFor();
   }else{
    const scan=w.locator('.ds-scanner');if(v)assert.equal(await scan.getAttribute('tabindex'),'-1');else assert.equal(await scan.getAttribute('aria-label'),null);
    await w.getByLabel('Исправить имя, Tab и фокус ошибки',{exact:true}).check();const code=w.getByLabel('Код партии',{exact:true});await code.focus();await p.keyboard.press('Tab');assert(await scan.evaluate(n=>n===document.activeElement));assert.equal(await scan.getAttribute('aria-label'),'Сканировать партию');
    await p.keyboard.press('Enter');await a.locator('.ds-scan-dialog[open]').waitFor();await p.keyboard.press('Escape');await a.locator('.ds-scan-dialog').waitFor({state:'hidden'});assert(await scan.evaluate(n=>n===document.activeElement));assert(await d.isVisible(),'Escape must close scanner only');
    await p.keyboard.press('Enter');await p.locator('.ds-scan-dialog[open]').getByRole('button',{name:'Вставить код 0012',exact:true}).click();assert.equal(await code.inputValue(),'0012');await aw.getByLabel('Код партии',{exact:true}).waitFor();
    await w.getByRole('button',{name:'Проверить ввод',exact:true}).click();const qty=w.getByLabel('Количество, шт.',{exact:true});assert(await qty.evaluate(n=>n===document.activeElement));await aw.getByRole('alert').filter({hasText:'целое количество'}).waitFor();await qty.fill('8');await w.getByRole('button',{name:'Проверить ввод',exact:true}).click();await aw.getByRole('status').filter({hasText:'0012, 8 шт.'}).waitFor();
   }
   await p.screenshot({path:`output/playwright/components-${theme}-q${q}-v${v}.png`});report.cases.push({question:q,variant:v,audience:true,actualComponent:true,repair:true});
  }
  await d.getByRole('button',{name:'Вернуться к слайду',exact:true}).click();await ad.waitFor({state:'hidden'});assert(await launch.evaluate(n=>document.activeElement===n));
 }
 assert.deepEqual(report.errors,[]);report.status='passed';
}catch(e){report.status='failed';report.failure=String(e);await p.screenshot({path:'output/playwright/components-failure.png'});throw e;}
finally{await fs.writeFile(process.env.COMPONENT_REPORT||'reports/components.json',JSON.stringify(report,null,2)+'\n');await b.close();}
