import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {launchBrowser,siteUrl} from './runtime.mjs';
const course=JSON.parse(await fs.readFile('public/course.json','utf8'));
const browser=await launchBrowser();
const report={version:course.contentVersion,touch:[],wheel:[],aliases:[],printExperiments:0,errors:[]};
try{
 const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,reducedMotion:'reduce'}),page=await context.newPage();
 page.on('pageerror',e=>report.errors.push(e.message));
 const first=course.lectures[0],second=first.slides[1];
 await page.goto(siteUrl+`?lecture=${first.id}&slide=${second.id}`);await page.locator('.active-slide').waitFor();
 const expected=async(id)=>page.waitForFunction(id=>document.querySelector('.active-slide [data-slide-id]')?.getAttribute('data-slide-id')===id,id);
 const cdp=await context.newCDPSession(page);
 const gesture=async(dx,dy=0)=>{
  const box=await page.locator('.active-slide .slide-kicker').boundingBox();
  const x=box.x+box.width/2,y=Math.min(box.y+box.height/2,600);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});
  for(let i=1;i<=6;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx*i/6,y:y+dy*i/6,id:1}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 };
 await gesture(-100);await expected(first.slides[2].id);
 await gesture(100);await expected(second.id);report.touch=['native Chromium touch left','native Chromium touch right'];
 await page.setViewportSize({width:1440,height:1000});
 await page.locator('.active-slide .slide-kicker').hover();await page.mouse.wheel(150,0);await expected(first.slides[2].id);
 // Opposite direction is a separate gesture, after the momentum guard expires.
 await page.waitForTimeout(650);await page.locator('.active-slide .slide-kicker').hover();await page.mouse.wheel(-150,0);await expected(second.id);
 await page.locator('.active-slide .slide-kicker').hover();await page.mouse.wheel(0,160);await expected(second.id);report.wheel=['horizontal right','horizontal left','vertical scroll preserved'];
 for(const [old,current] of [['01-project-decisions-c1-case','01-project-decisions-c1-walkthrough'],['01-project-decisions-c1-notebook','01-project-decisions-c1-definition'],['01-project-decisions-Q01-connection','01-project-decisions-Q01-worked'],['01-project-decisions-c1-mechanism','01-project-decisions-c1-decision']]){
  await page.goto(siteUrl+`?lecture=${first.id}&slide=${old}`);await expected(current);assert.equal(new URL(page.url()).searchParams.get('slide'),current);report.aliases.push(old);
 }
 for(const l of course.lectures){
  await page.goto(siteUrl+`?mode=print&scope=${l.id}`);await page.locator('.slide-frame').last().waitFor();
  const experiment=page.locator(`[data-slide-id="${l.id}-experiment"]`);
  assert.equal(await experiment.locator('.experiment').count(),0);assert.equal(await experiment.locator('.infographic').count(),1);
  const outside=await experiment.locator('svg[role="img"]').evaluateAll(nodes=>nodes.flatMap(el=>{
    const b=el.viewBox.baseVal;return [...el.querySelectorAll('text')].filter(n=>{const r=n.getBBox();return r.x<b.x-2||r.y<b.y-2||r.x+r.width>b.x+b.width+2||r.y+r.height>b.y+b.height+2;}).map(n=>n.textContent);
  }));
  assert.deepEqual(outside,[],l.id);report.printExperiments++;
 }
 assert.deepEqual(report.errors,[]);report.status='passed';
}catch(e){report.status='failed';report.failure=String(e);throw e;}finally{await fs.writeFile('reports/release-ui.json',JSON.stringify(report,null,2)+'\n');await browser.close();}
console.log(JSON.stringify(report));
