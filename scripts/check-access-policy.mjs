import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {accessAllowed,loginTransition} from '../src/experiment-math.ts';
import {launchBrowser,siteUrl} from './runtime.mjs';
const course=JSON.parse(await fs.readFile('public/course.json','utf8')),l=course.lectures.find(l=>l.id.startsWith('25-'));
// These permissions are the stated WMS policy, independent of the implementation.
const matrix={Кладовщик:[true,true,false],Руководитель:[true,true,true],Администратор:[false,false,false]};
const operations=['Просмотр','Создание корректировки','Подтверждение корректировки'];
const report={url:siteUrl,version:course.contentVersion,requests:[],auth:[],errors:[]};
for(const [role,rights] of Object.entries(matrix))for(const [i,action] of operations.entries())for(const zone of ['Своя','Чужая'])for(const author of [false,true])assert.equal(accessAllowed(role,action,zone,author),rights[i]&&zone==='Своя'&&!(i===2&&author));
assert.equal(accessAllowed('Unknown','Просмотр','Своя'),false);assert.equal(accessAllowed('Руководитель','Unknown','Своя'),false);
const b=await launchBrowser(),ctx=await b.newContext({viewport:{width:1600,height:1100},reducedMotion:'reduce'}),p=await ctx.newPage();p.setDefaultTimeout(12000);p.on('pageerror',e=>report.errors.push(e.message));let a;
try{
 await p.goto(siteUrl+`?lecture=${l.id}&slide=${l.id}-experiment`);const popup=ctx.waitForEvent('page');await p.getByRole('button',{name:'Режим показа',exact:true}).click();a=await popup;let area=p.locator('.mini-stage:not(.next-stage) .experiment'),aud=a.locator('.audience-slide .experiment');await aud.waitFor();
 const choose=async(label,value)=>{const c=area.getByRole('combobox',{name:label,exact:true});if((await c.innerText()).includes(value))return;await c.click();await area.getByRole('option',{name:value,exact:true}).click();};
 for(const [role,rights] of Object.entries(matrix))for(const [i,action] of operations.entries())for(const zone of ['Своя','Чужая'])for(const author of [false,true]){
  await area.getByRole('button',{name:'Сбросить состояние запроса',exact:true}).click();await choose('Роль',role);await choose('Операция',action);await choose('Зона партии',zone);await area.getByLabel('Инициатор корректировки — тот же пользователь',{exact:true}).setChecked(author);
  const allowed=rights[i]&&zone==='Своя'&&!(i===2&&author),stock=allowed&&i===2?8:10,moves=allowed&&i===2?1:0;
  await area.getByRole('button',{name:'Выполнить учебный запрос',exact:true}).click();await aud.locator('.access-evidence').filter({hasText:`Остаток: ${stock} шт.; учётных движений: ${moves}; попыток: 1`}).waitFor();
  await aud.getByRole('status').filter({hasText:allowed?'Учебная проверка разрешает запрос':'Учебная проверка отклоняет запрос'}).waitFor();
  if(allowed&&i===2){await area.getByRole('button',{name:'Выполнить учебный запрос',exact:true}).click();await aud.locator('.access-evidence').filter({hasText:'Прежнее подтверждение C25; второе движение не создано.'}).waitFor();}
  report.requests.push({role,action,zone,author,allowed,stock,moves});
 }
 for(const name of ['Исходные условия','Изменённое условие','Проверка границы']){await choose('Набор условий',name);await area.getByRole('button',{name:'Выполнить учебный запрос',exact:true}).click();await aud.locator('.access-evidence').filter({hasText:`Остаток: ${name==='Исходные условия'?8:10} шт.`}).waitFor();}
 await p.screenshot({path:'output/playwright/access-policy-boundary.png'});await p.getByRole('button',{name:'Завершить показ',exact:true}).click();await a.close();
 const auth=course.lectures.find(l=>l.id.startsWith('26-'));await p.goto(siteUrl+`?lecture=${auth.id}&slide=${auth.id}-experiment`);const popup2=ctx.waitForEvent('page');await p.getByRole('button',{name:'Режим показа',exact:true}).click();a=await popup2;area=p.locator('.mini-stage:not(.next-stage) .experiment');aud=a.locator('.audience-slide .experiment');await aud.waitFor();
 for(let i=1;i<=3;i++){await area.getByRole('button',{name:'Неверный пароль',exact:true}).click();await aud.getByText(`Учебная панель: ошибок подряд ${i} / 3.`,{exact:false}).waitFor();}
 await area.getByRole('button',{name:'Верный пароль',exact:true}).click();await aud.getByText('Вход заблокирован',{exact:true}).waitFor();assert.equal(await aud.getByText('Сессия создана',{exact:true}).count(),0);
 await area.getByRole('button',{name:'Администратор: разблокировать',exact:true}).click();await aud.getByText('Ожидание входа',{exact:true}).waitFor();await area.getByRole('button',{name:'Верный пароль',exact:true}).click();await aud.locator('fieldset [role=status] strong').filter({hasText:'Сессия создана'}).waitFor();await area.getByRole('button',{name:'Выйти',exact:true}).click();await aud.getByText('Ожидание входа',{exact:true}).waitFor();report.auth=['3 failures lock','valid password cannot bypass lock','unlock does not create session','separate login','logout'];
 assert.deepEqual(loginTransition({failures:3,locked:true,loggedIn:false},'success'),{failures:3,locked:true,loggedIn:false});assert.deepEqual(report.errors,[]);report.status='passed';
}catch(e){report.status='failed';report.failure=String(e);await p.screenshot({path:'output/playwright/access-policy-failure.png'});throw e;}
finally{await fs.writeFile(process.env.ACCESS_REPORT||'reports/access-policy.json',JSON.stringify(report,null,2)+'\n');await b.close();}
