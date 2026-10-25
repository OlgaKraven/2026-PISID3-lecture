import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {launchBrowser,siteUrl} from './runtime.mjs';
const entries=JSON.parse(await fs.readFile('public/teaching-artifacts.json','utf8'));
const course=JSON.parse(await fs.readFile('public/course.json','utf8'));
const report={url:siteUrl,frames:[],errors:[]};
const browser=await launchBrowser(),page=await browser.newPage({reducedMotion:'reduce'});
page.on('pageerror',e=>report.errors.push(e.message));
try{
 for(const width of [1280,1440,390]){
  await page.setViewportSize({width,height:width===1280?720:900});
  for(const e of entries){
   const l=course.lectures.find(l=>e.id.startsWith(l.id+'-'));
   await page.goto(siteUrl+`?lecture=${l.id}&slide=${e.id}`);
   await page.getByRole('button',{name:'Развернуть пример',exact:true}).waitFor();
   await page.evaluate(()=>document.fonts.ready);
   if(width>820){
    await page.waitForFunction(()=>document.querySelector('.active-slide [data-artifact-image]')?.getBoundingClientRect().width>100);
    const result=await page.locator('.active-slide .infographic').evaluate(n=>{
     const image=n.querySelector('[data-artifact-image]'),svg=n.querySelector('svg');
     return {ratio:image.getBoundingClientRect().width/svg.getBoundingClientRect().width,overflow:n.scrollHeight>n.clientHeight+2};
    });
    assert(result.ratio>=.86,`${e.id}: illustration too small at ${width}: ${result.ratio}`);
    assert(!result.overflow,`${e.id}: clipped illustration at ${width}`);
    report.frames.push({id:e.id,width,...result});
   }else{
    const text=await page.locator('.active-slide .infographic-mobile').innerText();
    assert(e.kind==='story'?text.includes('Как кладовщик, я хочу')&&text.includes('Когда:')&&text.includes('Тогда:'):text.includes('Исправить количество')&&text.includes('10 + 8 = 18'),e.id+': mobile artifact incomplete');
    report.frames.push({id:e.id,width,fullText:true});
   }
   if(e.id.endsWith('c1-walkthrough')&&width===1280){await page.waitForLoadState('networkidle');await page.screenshot({path:`output/playwright/artifact-${l.id}-normal-1280.png`,animations:'disabled'});}
  }
 }
 assert.deepEqual(report.errors,[]);report.status='passed';
}catch(e){report.status='failed';report.failure=String(e);throw e;}
finally{await fs.writeFile(process.env.FRAMES_REPORT||'reports/artifact-frames.json',JSON.stringify(report,null,2)+'\n');await browser.close();}
