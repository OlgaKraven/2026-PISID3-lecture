import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import jsQR from 'jsqr';
import {launchBrowser,siteUrl} from './runtime.mjs';
const course=JSON.parse(await fs.readFile('public/course.json','utf8'));
const browser=await launchBrowser(),context=await browser.newContext({viewport:{width:1280,height:640}}),page=await context.newPage();
const report={qr:[],editor:'not tested',offline:'not tested',fonts:[]};
try{
 await page.goto(siteUrl,{waitUntil:'networkidle'});
 await page.getByRole('button',{name:'Открыть',exact:true}).first().waitFor();
 if(process.argv.includes('--preview')){
  await page.goto(siteUrl+'?mode=print&scope='+course.lectures[0].id,{waitUntil:'networkidle'});
  await page.emulateMedia({media:'print'});
  const shot=await page.locator('.slide-frame').first().screenshot();
  await sharp(shot).resize(1280,640,{fit:'contain',background:'#1b1b1b'}).png().toFile('public/brand/course-preview.png');
  await page.emulateMedia({media:'screen'});
 }
 report.fonts=await page.evaluate(()=>[...document.fonts].map(f=>({family:f.family,status:f.status})));
 assert.ok(report.fonts.some(f=>f.status==='loaded'&&f.family.includes('Raleway')));
 for(const l of course.lectures){
  await page.goto(siteUrl+'?mode=print&scope='+l.id,{waitUntil:'networkidle'});
  const codes=await page.locator('.resource-qr').evaluateAll(nodes=>nodes.map(n=>({svg:new XMLSerializer().serializeToString(n),url:n.parentElement.querySelector('a').href})));
  for(const qr of codes){
   const raw=await sharp(Buffer.from(qr.svg)).resize(800,800).ensureAlpha().raw().toBuffer({resolveWithObject:true});
   const decoded=jsQR(new Uint8ClampedArray(raw.data),raw.info.width,raw.info.height);
   assert.equal(decoded?.data,qr.url);report.qr.push({lectureId:l.id,url:qr.url,decoded:true});
  }
 }
 await page.setViewportSize({width:390,height:844});
 await page.goto(siteUrl+'?lecture='+course.lectures[15].id+'&slide='+course.lectures[15].slides.find(s=>s.id.endsWith('Q03-worked')).id,{waitUntil:'networkidle'});
 await page.screenshot({path:'output/playwright/mobile.png',fullPage:true});
 await page.setViewportSize({width:1440,height:1000});await page.goto(siteUrl,{waitUntil:'networkidle'});
 const credentials=JSON.parse(await fs.readFile('private/editor-access.json','utf8'));
 const login=async()=>{await page.getByRole('button',{name:'Вход',exact:true}).click();await page.getByLabel('Логин',{exact:true}).fill(credentials.username);await page.getByLabel('Пароль',{exact:true}).fill(credentials.password);await page.getByRole('button',{name:'Войти',exact:true}).click();await page.getByRole('heading',{name:'Редактор курса',exact:true}).waitFor();};
 await login();const field=page.getByLabel('Название лекции',{exact:true}),title=await field.inputValue();
 await field.fill(title+' · проверка черновика');await page.getByRole('status').filter({hasText:'Черновик сохранён на устройстве'}).waitFor();
 await page.reload();await login();assert.equal(await page.getByLabel('Название лекции',{exact:true}).inputValue(),title+' · проверка черновика');
 await page.getByLabel('Название лекции',{exact:true}).fill(title);await page.getByRole('status').filter({hasText:'Черновик сохранён на устройстве'}).waitFor();report.editor='login, edit, persist across reload, restore: passed';
 await page.getByRole('button',{name:'Закрыть редактор',exact:true}).click();
 const prepared=await page.evaluate(async()=>{
  await navigator.serviceWorker.register('sw.js');const registration=await navigator.serviceWorker.ready;
  return new Promise((resolve,reject)=>{const ch=new MessageChannel();const timer=setTimeout(()=>reject(Error('prepare timeout')),30000);ch.port1.onmessage=e=>{clearTimeout(timer);resolve(e.data);};registration.active.postMessage({type:'PREPARE'},[ch.port2]);});
 });assert.equal(prepared.ready,true,JSON.stringify(prepared));
 await context.setOffline(true);await page.reload();await page.getByRole('button',{name:'Открыть',exact:true}).first().waitFor();
 await page.getByRole('button',{name:'Открыть',exact:true}).first().click();await page.locator('.active-slide .slide-frame').waitFor();report.offline={status:'passed',cachedFiles:prepared.count};
 await fs.writeFile('reports/resources.json',JSON.stringify(report,null,2));console.log(JSON.stringify({qr:report.qr.length,editor:report.editor,offline:report.offline,fonts:report.fonts}));
}finally{await browser.close();}
