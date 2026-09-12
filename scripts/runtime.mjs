import {chromium} from 'playwright';
export async function launchBrowser(){try{return await chromium.launch({headless:true});}catch{return chromium.launch({channel:'msedge',headless:true});}}
export const siteUrl=process.env.SITE_URL||'http://127.0.0.1:4176/2026-PISID3-lecture/';