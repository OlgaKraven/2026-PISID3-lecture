import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {launchBrowser,siteUrl} from './runtime.mjs';
const course=JSON.parse(await fs.readFile('public/course.json','utf8'));
const models=course.lectures.flatMap(l=>l.slides.filter(s=>/-c\d+-walkthrough$|-additional-case-solution$/.test(s.id)).map(s=>({lecture:l.id,slide:s})));
const report={version:course.contentVersion,url:siteUrl,models:models.length,mobile:[],samples:[],errors:[]};
const browser=await launchBrowser(),context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'}),page=await context.newPage();
page.on('pageerror',e=>report.errors.push(e.message));
try{
 const types=[...new Set(models.map(m=>m.slide.visual.type))];
 for(const type of types){
  const {lecture,slide:s}=models.filter(m=>m.slide.visual.type===type).sort((a,b)=>JSON.stringify(b.slide.visual).length-JSON.stringify(a.slide.visual).length)[0];
  await page.goto(siteUrl+`?lecture=${lecture}&slide=${s.id}`);await page.locator('.active-slide .infographic').waitFor();await page.evaluate(()=>document.fonts.ready);
  await page.screenshot({path:`output/playwright/third-model-${type}-reader.png`});
  const popup=context.waitForEvent('page');await page.getByRole('button',{name:'Режим показа',exact:true}).click();const audience=await popup;await audience.locator('.audience-slide .infographic').waitFor();
  await audience.screenshot({path:`output/playwright/third-model-${type}-audience.png`});
  await page.getByRole('button',{name:'Развернуть схему',exact:true}).first().click();await audience.getByRole('dialog',{name:'Подробная схема',exact:true}).waitFor();
  await audience.screenshot({path:`output/playwright/third-model-${type}-expanded.png`});
  await page.getByRole('button',{name:'Закрыть',exact:true}).last().click();await page.getByRole('button',{name:'Завершить показ',exact:true}).click();await audience.close();
  report.samples.push({id:s.id,type});
 }
 await page.setViewportSize({width:390,height:844});
 for(const theme of (process.argv.includes('--samples')?[]:['light','dark'])){
  for(const {lecture,slide:s} of models){
   await page.goto(siteUrl+`?lecture=${lecture}&slide=${s.id}`);await page.locator('.active-slide .infographic-mobile').waitFor({state:'visible'});await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),s.id+': horizontal overflow');
   const missing=await page.locator('.active-slide .infographic-mobile').evaluate(n=>[...n.querySelectorAll('td,th,p,li')].filter(e=>e.textContent.trim()&&e.clientWidth>0&&e.scrollWidth>e.clientWidth+2).map(e=>e.textContent));
   assert.deepEqual(missing,[],s.id+': clipped mobile text');
   if(report.samples.some(x=>x.id===s.id))await page.screenshot({path:`output/playwright/third-model-${s.visual.type}-${theme}-390.png`,fullPage:true});
  }
  report.mobile.push({theme,models:models.length});console.log(theme+': '+models.length+' subject models at 390 px');
 }
 assert.deepEqual(report.errors,[]);report.status='passed';
}catch(e){report.status='failed';report.failure=String(e);throw e;}
finally{await fs.writeFile(process.argv.includes('--samples')?'reports/third-model-samples.json':'reports/third-models.json',JSON.stringify(report,null,2)+'\n');await browser.close();}
