import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {launchBrowser,siteUrl} from './runtime.mjs';
const c=JSON.parse(await fs.readFile('public/course.json','utf8')),entries=c.lectures.flatMap(l=>l.slides.filter(s=>s.visual?.type==='callouts'&&s.visual.image.startsWith('models/')).map(s=>({l,s})));
const forms=new Set(JSON.parse(await fs.readFile('public/form-artifacts.json','utf8')).map(e=>e.id));
const browser=await launchBrowser(),page=await browser.newPage({reducedMotion:'reduce'}),report={url:siteUrl,svg:[],frames:[],errors:[]};
page.on('pageerror',e=>report.errors.push(e.message));
try{
 for(const path of new Set(entries.map(({s})=>s.visual.image))){
  await page.goto(siteUrl+path);await page.evaluate(()=>document.fonts.ready);
  const outside=await page.locator('svg').evaluate(svg=>{const v=svg.viewBox.baseVal;return [...svg.querySelectorAll('text')].filter(n=>{const b=n.getBBox();return b.x<0||b.y<0||b.x+b.width>v.width+1||b.y+b.height>v.height+1}).map(n=>n.textContent);});
  assert.deepEqual(outside,[],path);report.svg.push(path);
 }
 for(const width of [1280,1440,390]){
  await page.setViewportSize({width,height:width===1280?720:900});
  for(const {l,s} of entries){
   await page.goto(siteUrl+`?lecture=${l.id}&slide=${s.id}`);await page.getByRole('button',{name:forms.has(s.id)?'Развернуть пример':'Развернуть схему',exact:true}).waitFor();await page.evaluate(()=>document.fonts.ready);await page.waitForLoadState('networkidle');
   if(width>820){
    await page.waitForFunction(()=>document.querySelector('.active-slide [data-artifact-image]')?.getBoundingClientRect().width>100);
    await page.waitForFunction(()=>{const n=document.querySelector('.active-slide .infographic');return n?.querySelector('image')?.getBoundingClientRect().width>100&&n?.querySelector('svg')?.getBoundingClientRect().width>100});
    const bounds=await page.locator('.active-slide .infographic').evaluate(n=>({ratio:n.querySelector('image').getBoundingClientRect().width/n.querySelector('svg').getBoundingClientRect().width,overflow:n.scrollHeight>n.clientHeight+2}));
    assert(bounds.ratio>=.86,`${s.id} at ${width}: ${bounds.ratio}`);assert(!bounds.overflow,s.id+' clipped');
    if(width===1280){await page.waitForLoadState('networkidle');await page.screenshot({path:'output/playwright/model-'+s.id+'.png',animations:'disabled'});}
   }else{const text=await page.locator('.active-slide .infographic-mobile').innerText();for(const item of s.visual.items)assert(text.includes(item.title)&&text.includes(item.text),s.id+' incomplete mobile representation');}
   report.frames.push({id:s.id,width});
  }
 }
 assert.deepEqual(report.errors,[]);report.status='passed';
}catch(e){report.status='failed';report.failure=String(e);await page.screenshot({path:'output/playwright/model-failure.png',animations:'disabled'});throw e;}
finally{await fs.writeFile(process.env.MODELS_REPORT||'reports/course-models.json',JSON.stringify(report,null,2)+'\n');await browser.close();}
