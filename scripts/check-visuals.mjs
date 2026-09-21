import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import caseVisuals from '../authoring/case-visuals.mjs';
import {launchBrowser,siteUrl} from './runtime.mjs';
const c=JSON.parse(await fs.readFile('public/course.json','utf8'));
const slides=c.lectures.flatMap(l=>l.slides);
const worked=c.lectures.flatMap(l=>l.slides.filter(s=>s.id.endsWith('-worked')).map(s=>({lecture:l.id,slide:s})));
assert.equal(caseVisuals.length,26);
assert.ok(caseVisuals.every(v=>v.length===4));
assert.equal(worked.length,104);
assert.equal(slides.filter(s=>/-c\d+-(mechanism|mistake)$/.test(s.id)).length,0);
assert.equal(new Set(worked.map(({slide:s})=>JSON.stringify(s.visual))).size,104);
const types=[...new Set(worked.map(({slide:s})=>s.visual.type))];
assert.ok(types.length>=5);
const strings=value=>typeof value==='string'?[value]:value&&typeof value==='object'?Object.values(value).flatMap(strings):[];
for(const {slide:s} of worked)assert.ok(!strings(s.visual).includes(s.body),s.id+': условия повторены в схеме');
const sampleIds=['01-project-decisions-Q01-worked','12-business-rules-Q04-worked','16-decision-matrix-Q03-worked','14-data-history-Q02-worked','23-forms-validation-states-Q04-worked'];
const browser=await launchBrowser(),report={version:c.contentVersion,caseDiagrams:worked.length,types,viewports:[],errors:[]};
try{
 const page=await browser.newPage({reducedMotion:'reduce'});
 page.on('pageerror',e=>report.errors.push(e.message));
 await fs.mkdir('output/playwright',{recursive:true});
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:width===390?844:1000});
  for(const {lecture,slide:s} of worked){
   await page.goto(siteUrl+`?lecture=${lecture}&slide=${s.id}`);
   await page.locator('.active-slide .infographic').waitFor();
   if(width===1440){
    const svg=page.locator('.active-slide .infographic-canvas svg');
    await svg.waitFor();
    if(s.visual.type==='network'){
     const edges=await svg.locator('[data-relation]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-relation')));
     assert.deepEqual(edges,s.visual.edges.map(e=>`${e.from}:${e.to}`),s.id+': связи SVG отличаются от данных');
    }
    const outside=await svg.evaluate(el=>{const b=el.viewBox.baseVal;return [...el.querySelectorAll('text')].filter(n=>{const r=n.getBBox();return r.x<b.x-2||r.y<b.y-2||r.x+r.width>b.x+b.width+2||r.y+r.height>b.y+b.height+2;}).map(n=>n.textContent);});
    assert.deepEqual(outside,[],s.id+': текст за границей SVG');
   }else await page.locator('.active-slide .infographic-mobile').waitFor({state:'visible'});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),s.id+': горизонтальное переполнение');
   if(sampleIds.includes(s.id))await page.screenshot({path:`output/playwright/visual-${s.id}-${width}.png`,fullPage:width===390});
  }
  report.viewports.push({width,diagrams:worked.length});
  console.log(`Visuals ${width}: ${worked.length}`);
 }
 assert.deepEqual(report.errors,[]);
 report.status='passed';
}catch(e){report.status='failed';report.error=String(e);throw e;}
finally{await fs.writeFile('reports/visual-review.json',JSON.stringify(report,null,2)+'\n');await browser.close();}
