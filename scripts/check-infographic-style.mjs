import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {launchBrowser,siteUrl} from './runtime.mjs';
const course=JSON.parse(await fs.readFile('public/course.json','utf8'));
const browser=await launchBrowser(),report={version:course.contentVersion,themes:[],expanded:[],laboratories:[],problems:[]};
const legacy=['#3154a4','#4561c8','#237447','#256777','#79416b','#4e5489','#586579','#6b778b','#263244','#ced7e8','#e8eefc','#20794c','#be123c','#fff0ec','#e3f2eb'];
try{
 const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'}),page=await context.newPage();
 for(const theme of ['light','dark']){
  let figures=0;
  for(const l of course.lectures){
   await page.goto(siteUrl+`?mode=print&scope=${l.id}`);await page.locator('.print-page').last().waitFor();
   await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);await page.evaluate(()=>document.fonts.ready);
   const records=await page.evaluate(legacy=>{const nodes=[...document.querySelectorAll('.print-page .infographic')];
    const rgb=hex=>{const n=parseInt(hex.slice(1),16);return `rgb(${n>>16}, ${n>>8&255}, ${n&255})`};const forbidden=new Set(legacy.map(rgb));
    return nodes.map(n=>{const old=[];for(const el of n.querySelectorAll('svg *,figcaption')){const s=getComputedStyle(el);for(const prop of ['fill','stroke','color','backgroundColor','borderLeftColor','borderTopColor','borderRightColor','borderBottomColor'])if(forbidden.has(s[prop]))old.push({tag:el.tagName,prop,value:s[prop]})}const c=n.querySelector('figcaption');return {id:n.closest('[data-slide-id]')?.dataset.slideId,type:n.className,old,captionFont:c&&getComputedStyle(c).fontFamily}})
   },legacy);
   figures+=records.length;report.problems.push(...records.filter(x=>x.old.length||!x.captionFont.includes('Raleway')).map(x=>({theme,...x})));
  }
  report.themes.push({theme,figures});console.log(theme+': '+figures+' static diagrams checked');
 }
 const types=new Map();for(const l of course.lectures)for(const s of l.slides)if(s.id.endsWith('-worked')&&!types.has(s.visual.type))types.set(s.visual.type,{l,s});
 for(const [type,{l,s}] of types){
  await page.goto(siteUrl+`?lecture=${l.id}&slide=${s.id}`);await page.getByRole('button',{name:'Развернуть схему',exact:true}).waitFor();
  const popup=context.waitForEvent('page');await page.getByRole('button',{name:'Режим показа',exact:true}).click();const audience=await popup;
  await audience.locator('.infographic').waitFor();await page.getByRole('button',{name:'Развернуть схему',exact:true}).click();
  await audience.getByRole('dialog',{name:'Подробная схема',exact:true}).waitFor();
  for(const p of [page,audience])await p.evaluate(()=>document.documentElement.dataset.theme='dark');
  if(type==='network'||type==='matrix')await audience.screenshot({path:`output/playwright/infographic-${type}-dark.png`});
  await page.getByRole('button',{name:'Текстовое представление',exact:true}).click();await audience.getByRole('dialog',{name:'Текстовое представление',exact:true}).waitFor();
  await page.getByRole('button',{name:'Показать схему',exact:true}).click();await audience.getByRole('dialog',{name:'Подробная схема',exact:true}).waitFor();
  await page.getByRole('button',{name:'Закрыть',exact:true}).last().click();await audience.getByRole('dialog').waitFor({state:'hidden'});
  report.expanded.push(type);await page.getByRole('button',{name:'Завершить показ',exact:true}).click();await audience.close();
 }
 assert.deepEqual(report.problems,[]);report.status='passed';
}catch(e){report.status='failed';report.failure=String(e);throw e;}
finally{await fs.writeFile('reports/infographic-style.json',JSON.stringify(report,null,2)+'\n');await browser.close()}
