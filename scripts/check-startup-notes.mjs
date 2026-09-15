import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {launchBrowser} from './runtime.mjs';
const course=JSON.parse(await fs.readFile('public/course.json','utf8'));
const pack=JSON.parse(await fs.readFile('public/teacher-pack.json','utf8'));
const base=process.env.SITE_URL || `http://127.0.0.1:${course.id==='pisid3'?4176:4174}/2026-PISID${course.id.slice(-1)}-lecture/`;
const browser=await launchBrowser();
try {
  const context=await browser.newContext();
  // A quota shared with other courses must not prevent startup. Full-pack
  // writes fail here, while small local edits still fit.
  await context.addInitScript(() => {
    const setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) {
      if (key.includes(':private:') && value.length > 65536) {
        throw new DOMException('Storage quota exceeded', 'QuotaExceededError');
      }
      return setItem.call(this, key, value);
    };
  });
  const page=await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const lecture=course.lectures[0],slide=lecture.slides[0];
  const url=base+`?mode=presenter&lecture=${lecture.id}&slide=${slide.id}&session=startup-check`;
  await page.goto(url);
  const panel=page.getByRole('tabpanel');
  await panel.waitFor();
  assert.equal((await panel.innerText()).trim(),pack.notes[slide.id].script.trim());
  const key=`lecture:${new URL(base).pathname}:${course.id}:private:${course.contentVersion}`;
  assert.equal(await page.evaluate(k=>localStorage.getItem(k),key),null);
  await page.getByRole('button',{name:'Редактировать',exact:true}).click();
  await page.getByRole('textbox',{name:'Редактировать: Сценарий',exact:true}).fill('Моя сохранённая правка преподавателя');
  await page.waitForFunction(({key,id})=>JSON.parse(localStorage.getItem(key)||'{}')[id]?.script==='Моя сохранённая правка преподавателя',{key,id:slide.id});
  assert.equal(await page.evaluate(k=>Object.keys(JSON.parse(localStorage.getItem(k))).length,key),1);
  await page.reload();await panel.waitFor();
  assert.equal((await panel.innerText()).trim(),'Моя сохранённая правка преподавателя');
  const last=course.lectures.at(-1),lastSlide=last.slides.at(-1);
  await page.goto(base+`?mode=presenter&lecture=${last.id}&slide=${lastSlide.id}&session=startup-last`);
  await panel.waitFor();assert.equal((await panel.innerText()).trim(),pack.notes[lastSlide.id].script.trim());
  // Opening an existing (legacy) record must not overwrite its edits.
  await page.evaluate(({key,id,note})=>localStorage.setItem(key,JSON.stringify({[id]:note})),{key,id:slide.id,note:{...pack.notes[slide.id],script:'Правка из старого сохранения'}});
  await page.goto(url);await panel.waitFor();
  assert.equal((await panel.innerText()).trim(),'Правка из старого сохранения');
  const fullContext=await browser.newContext();
  await fullContext.addInitScript(() => {
    Storage.prototype.setItem = function() {throw new DOMException('Full', 'QuotaExceededError');};
  });
  const fullPage=await fullContext.newPage();
  fullPage.on('pageerror',e=>errors.push(e.message));
  await fullPage.goto(url);
  await fullPage.getByRole('tabpanel').waitFor();
  assert.equal((await fullPage.getByRole('tabpanel').innerText()).trim(),pack.notes[slide.id].script.trim());
  await fullContext.close();
  const audienceContext=await browser.newContext();const audience=await audienceContext.newPage();
  const requests=[];audience.on('request',r=>requests.push(r.url()));
  await audience.goto(base+`?mode=audience&lecture=${lecture.id}&session=startup-audience`);
  await audience.getByRole('button',{name:'На весь экран',exact:true}).waitFor();
  assert(!requests.some(u=>u.includes('teacher-pack.json')));
  assert(!(await audience.locator('body').innerText()).includes(pack.notes[slide.id].script));
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({course:course.id,notes:Object.keys(pack.notes).length,firstLaunch:true,localEditsPreserved:true,lastLecture:true,quotaExceededStartup:true,onlyEditsStored:true,audienceDoesNotLoadPack:true,status:'passed'}));
} finally { await browser.close(); }
