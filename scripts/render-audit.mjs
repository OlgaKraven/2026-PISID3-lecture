import fs from 'node:fs/promises';
import {launchBrowser,siteUrl} from './runtime.mjs';
const c=JSON.parse(await fs.readFile('public/course.json','utf8'));
await fs.mkdir('output/playwright',{recursive:true});
const browser=await launchBrowser(),report=[];
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
 await page.goto(siteUrl);await page.getByRole('button',{name:'Открыть',exact:true}).first().waitFor();
 await page.screenshot({path:'output/playwright/catalog.png',fullPage:true});
 for(const l of c.lectures){
  await page.goto(siteUrl+'?mode=print&scope='+l.id,{waitUntil:'networkidle'});
  await page.emulateMedia({media:'print',reducedMotion:'reduce'});
  await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})));});
  const results=await page.locator('.slide-frame').evaluateAll(nodes=>nodes.map(n=>{
   const frame=n.getBoundingClientRect(),content=n.querySelector('.slide-content').getBoundingClientRect(),copy=n.querySelector('.slide-copy');
   const out=[];
   for(const el of n.querySelectorAll('.slide-copy h2,.slide-copy p,.slide-copy li,.slide-copy .write-note,.slide-copy .infographic,.slide-copy .reading-entry')){
    const r=el.getBoundingClientRect();if(r.bottom>content.bottom+3||r.right>frame.right+3)out.push({tag:el.tagName,text:el.textContent.slice(0,90),bottom:Math.round(r.bottom-content.bottom),right:Math.round(r.right-frame.right)});
   }
   return {id:n.dataset.slideId,copyOverflow:copy.scrollHeight-copy.clientHeight,out};
  }));
  report.push(...results);
  console.log(l.id+': '+results.filter(r=>r.out.length||r.copyOverflow>3).length+' возможных переполнений');
 }
 await fs.writeFile('reports/geometry-print.json',JSON.stringify(report,null,2));
}finally{await browser.close();}
