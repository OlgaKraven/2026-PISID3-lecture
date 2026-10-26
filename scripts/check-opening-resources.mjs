import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import jsQR from 'jsqr';
import {launchBrowser,siteUrl} from './runtime.mjs';
const base=process.env.SITE_URL||siteUrl;
const browser=await launchBrowser();
const report={url:base,startedAt:new Date().toISOString(),frames:[],qr:[],mobile:[],print:[],errors:[]};
const decoded=new Map();
async function checkFrame(frame, expected, mobile=false){
  await frame.waitFor();
  assert.equal(await frame.getAttribute('data-slide-id'),expected.id);
  if(expected.kind==='literature'){
    const entries=frame.locator('.reading-entry');assert.equal(await entries.count(),expected.references.length);
    for(const [i,r] of expected.references.entries()){
      assert.equal((await entries.nth(i).locator('p').innerText()).trim(),r.citation);
      if(r.url)assert.equal(await entries.nth(i).locator('a').getAttribute('href'),r.url);
    }
  }
  if(expected.kind==='materials'){
    assert.equal(await frame.locator('.materials-resource a').getAttribute('href'),course.materialsUrl);
    if(mobile)assert.ok(await frame.locator('.materials-resource a').evaluate(n=>parseFloat(getComputedStyle(n).fontSize)>=16),'Readable materials link on mobile');
  }
  if(!['literature','materials'].includes(expected.kind))return;
  const outside=await frame.evaluate((n,mobile)=>{
    const box=n.getBoundingClientRect(),foot=n.querySelector('.slide-footer')?.getBoundingClientRect();
    return [...n.querySelectorAll('.reading-entry,.reading-entry p,.reading-entry a,.materials-resource,.resource-qr')].filter(x=>{
      const r=x.getBoundingClientRect();return r.left<box.left-2||r.right>box.right+2||(!mobile&&(r.bottom>(foot?.top||box.bottom)+2||r.top<box.top-2));
    }).map(x=>({tag:x.className,text:x.textContent?.slice(0,50)}));
  },mobile);
  assert.deepEqual(outside,[],expected.id+': clipped resource');
  const codes=await frame.locator('.resource-qr').evaluateAll(ns=>ns.map(n=>({svg:new XMLSerializer().serializeToString(n),url:n.parentElement.querySelector('a').href})));
  for(const qr of codes)if(!decoded.has(qr.url)){
    const raw=await sharp(Buffer.from(qr.svg)).resize(800,800).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    assert.equal(jsQR(new Uint8ClampedArray(raw.data),raw.info.width,raw.info.height)?.data,qr.url);
    decoded.set(qr.url,true);report.qr.push({url:qr.url,decoded:true});
  }
}
let course;
try{
  const response=await browser.newContext();const bytes=await (await response.request.get(base+'course.json?opening=20261026')).body();course=JSON.parse(bytes);
  report.version=course.contentVersion;report.courseSha256=createHash('sha256').update(bytes).digest('hex');await response.close();
  for(const theme of ['light','dark']){
    const context=await browser.newContext({viewport:{width:1280,height:800},reducedMotion:'reduce'});
    await context.addInitScript(({key,theme})=>localStorage.setItem(key,JSON.stringify(theme)),{key:`lecture:${new URL(base).pathname}:pisid3:theme`,theme});
    const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
    for(const l of course.lectures){
      await page.goto(base+`?lecture=${l.id}&slide=${l.slides[0].id}`);
      await page.locator('.active-slide .slide-frame').waitFor();
      const pending=page.waitForEvent('popup');await page.getByRole('button',{name:'Режим показа',exact:true}).click();const audience=await pending;
      await audience.locator('.audience-slide .slide-frame').waitFor();
      for(const [i,s] of l.slides.slice(0,6).entries()){
        const current=page.locator('.mini-stage:not(.next-stage) .slide-frame');
        await page.waitForFunction(id=>document.querySelector('.mini-stage:not(.next-stage) .slide-frame')?.getAttribute('data-slide-id')===id,s.id);
        await audience.waitForFunction(id=>document.querySelector('.audience-slide .slide-frame')?.getAttribute('data-slide-id')===id,s.id);
        await checkFrame(current,s);await checkFrame(audience.locator('.audience-slide .slide-frame'),s);
        report.frames.push({lecture:l.id,slide:s.id,theme,presenter:true,audience:true});
        if(l===course.lectures[0]&&i===1)await audience.screenshot({path:`output/playwright/opening-literature-${theme}.png`});
        if(i<5)await page.getByRole('button',{name:'Следующий слайд',exact:true}).click();
      }
      await page.getByRole('button',{name:'Предыдущий слайд',exact:true}).focus();await page.keyboard.press('Enter');
      await audience.locator(`[data-slide-id="${l.id}-materials"]`).waitFor();
      await page.keyboard.press('ArrowRight');await audience.locator(`[data-slide-id="${l.id}-route"]`).waitFor();
      await audience.close();
    }
    await context.close();console.log(theme+': all 26 lecture openings synchronized');
  }
  const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'}),page=await context.newPage();
  for(const theme of ['light','dark'])for(const l of [course.lectures[0],course.lectures[7],course.lectures[25]])for(const s of l.slides.slice(1,5)){
    await page.goto(base);await page.evaluate(({key,theme})=>localStorage.setItem(key,JSON.stringify(theme)),{key:`lecture:${new URL(base).pathname}:pisid3:theme`,theme});
    await page.goto(base+`?lecture=${l.id}&slide=${s.id}`);await checkFrame(page.locator('.active-slide .slide-frame'),s,true);
    assert.equal(new URL(page.url()).searchParams.get('slide'),s.id,'Restored ID must not redirect to sources');
    report.mobile.push({id:s.id,theme});
    if(l===course.lectures[0]&&s.kind==='materials')await page.screenshot({path:`output/playwright/opening-materials-mobile-${theme}.png`,fullPage:true});
  }
  await page.setViewportSize({width:1280,height:800});
  for(const l of course.lectures){
    await page.goto(base+`?mode=print&scope=${l.id}`);await page.locator('.slide-frame').last().waitFor();await page.emulateMedia({media:'print'});
    for(const s of l.slides.slice(1,5)){await checkFrame(page.locator(`[data-slide-id="${s.id}"]`),s);report.print.push(s.id);}
    if(l===course.lectures[0]){
      await page.locator('.slide-frame').evaluateAll(nodes=>nodes.slice(5).forEach(n=>n.parentElement.remove()));
      await page.pdf({path:'output/playwright/opening-resources.pdf',preferCSSPageSize:true,printBackground:true});
    }
    await page.emulateMedia({media:'screen'});
  }
  await context.close();assert.deepEqual(report.errors,[]);report.status='passed';
}catch(e){report.status='failed';report.failure=String(e);throw e;}
finally{report.finishedAt=new Date().toISOString();await fs.writeFile(process.env.OPENING_REPORT||'reports/opening-resources.json',JSON.stringify(report,null,2)+'\n');await browser.close();}
console.log(JSON.stringify({status:report.status,frames:report.frames.length,decodedLinks:report.qr.length,mobile:report.mobile.length,print:report.print.length}));
