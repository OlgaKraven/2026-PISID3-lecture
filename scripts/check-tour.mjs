import assert from 'node:assert/strict';
import {launchBrowser,siteUrl} from './runtime.mjs';
const browser=await launchBrowser();
try{const page=await browser.newPage();await page.goto(siteUrl+'?tour=1');await page.locator('.ok-topics').waitFor();assert.equal(await page.getByRole('button',{name:'Тур по кнопкам'}).count(),0);assert.equal(await page.locator('.guided-tour').count(),0);assert.equal(await page.locator('#root').evaluate(el=>el.inert),false);console.log('Tour remains disabled, including ?tour=1.')}finally{await browser.close()}
