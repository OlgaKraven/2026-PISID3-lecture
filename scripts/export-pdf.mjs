import fs from 'node:fs/promises';
import path from 'node:path';
import {PDFDocument} from 'pdf-lib';
import {launchBrowser,siteUrl} from './runtime.mjs';
const c=JSON.parse(await fs.readFile('public/course.json','utf8'));
const output=process.env.PDF_OUTPUT||'outputs/pdf/student';
await fs.mkdir(output,{recursive:true});
const selected=process.argv.includes('--topic')?c.lectures.filter(l=>l.id===process.argv[process.argv.indexOf('--topic')+1]):c.lectures;
if(!selected.length)throw Error('Неизвестная лекция');
const browser=await launchBrowser(),report=[];
try{for(const l of selected){
 const page=await browser.newPage({viewport:{width:1600,height:900}});
 await page.goto(siteUrl+'?mode=print&scope='+l.id,{waitUntil:'networkidle'});
 await page.locator('.print-page').first().waitFor();
 await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})));});
 const count=await page.locator('.print-page').count();if(count!==l.slides.length)throw Error('Неверное число слайдов '+l.id);
 if(await page.locator('.task-result,.teacher-notes,.assessment-results').count())throw Error('Приватный интерфейс в печати');
 const target=path.join(output,l.id+'.pdf');
 await page.pdf({path:target,printBackground:true,preferCSSPageSize:true,tagged:true});
 const doc=await PDFDocument.load(await fs.readFile(target));
 if(doc.getPageCount()!==count)throw Error(l.id+': неверное число страниц '+doc.getPageCount());
 report.push({lectureId:l.id,path:target,pages:count,size:doc.getPage(0).getSize()});
 console.log(l.id+': '+count+' страниц');await page.close();
}}finally{await browser.close();}
await fs.mkdir('reports',{recursive:true});await fs.writeFile('reports/pdf.json',JSON.stringify(report,null,2));