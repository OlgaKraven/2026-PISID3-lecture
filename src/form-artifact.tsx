import {useEffect,useRef,type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import entries from '../public/form-artifacts.json';
import {useDemoState} from './experiment-state';
import './teaching-artifact.css';

export const hasFormArtifact=(id:string)=>entries.some(e=>e.id===id);
export function FormArtifact({id,writable,version,fallback}:{id:string;writable:boolean;version:string;fallback:ReactNode}){
 const e=entries.find(e=>e.id===id)!;
 const initial={expanded:false,phase:'edit',code:e.code,quantity:e.quantity,scenario:e.scenario,serverStock:e.scenario==='stale'?5:10,documents:0,number:23,error:'',field:'',draft:'',failed:false,query:e.focus==='empty'?'0099':'0012',search:'start',scroll:0};
 const [s,update]=useDemoState('form:'+id,initial,writable,version);
 const dialog=useRef<HTMLDialogElement>(null),opener=useRef<HTMLElement|null>(null),wasOpen=useRef(false),scroller=useRef<HTMLDivElement>(null),codeInput=useRef<HTMLInputElement>(null),quantityInput=useRef<HTMLInputElement>(null),queryInput=useRef<HTMLInputElement>(null);
 useEffect(()=>{const open=(ev?:Event)=>{if(ev&&(ev as CustomEvent).detail!==id)return;const frame=[...document.querySelectorAll<HTMLElement>(`[data-slide-id="${id}"]`)].find(f=>f.dataset.formRequest==='open');if(frame&&writable){delete frame.dataset.formRequest;opener.current=document.activeElement as HTMLElement;update({expanded:true,scroll:0});}};document.addEventListener('pisid-form-open',open);open();return()=>document.removeEventListener('pisid-form-open',open);},[id,writable]);
 useEffect(()=>{if(s.expanded&&dialog.current&&!dialog.current.open)dialog.current.showModal();if(!s.expanded&&wasOpen.current&&writable)queueMicrotask(()=>opener.current?.focus());wasOpen.current=Boolean(s.expanded);},[s.expanded,writable]);
 useEffect(()=>{if(!writable&&scroller.current)scroller.current.scrollTop=Number(s.scroll)*Math.max(0,scroller.current.scrollHeight-scroller.current.clientHeight);},[s.scroll,writable]);
 useEffect(()=>{if(writable&&s.error)(s.field==='code'?codeInput:quantityInput).current?.focus();},[s.error,writable]);
 const phase=String(s.phase),n=Number(s.quantity),operation='OP'+s.number,documentId='D'+s.number;
 const locked=!writable||phase!=='edit';
 function reset(scenario='normal'){
  update({...initial,expanded:s.expanded,scenario,code:scenario==='quarantine'?'0017':scenario==='unknown'?'0099':'0012',quantity:scenario==='quarantine'?'5':e.focus==='required'?'':'8',serverStock:scenario==='stale'?5:10,query:scenario==='empty'?'0099':'0012',search:'start'});
 }
 function confirm(){
  if(!/^\d{4}$/.test(String(s.code))){update({error:'Код партии должен содержать четыре цифры, например 0012.',field:'code'});return;}
  if(!Number.isInteger(n)||n<=0||n>1000){update({error:'Количество для подтверждения — целое число от 1 до 1000.',field:'quantity'});return;}
  update({phase:'pending',error:'',field:'',draft:'',number:Number(s.number)+(s.failed?1:0),failed:false});
 }
 function reply(){
  const failure=String(s.code)==='0017'?'Отбор запрещён: партия в карантине. Введённые данные сохранены.':String(s.code)!=='0012'?'Партия не найдена. Проверьте код; количество сохранено.':n>Number(s.serverStock)?`Остаток изменился: доступно ${s.serverStock} шт., введено ${s.quantity}. Измените количество; ввод сохранён.`:'';
  if(failure){update({phase:'edit',error:failure,field:String(s.code)!=='0012'?'code':'quantity',failed:true});return;}
  update({serverStock:Number(s.serverStock)-n,documents:1,phase:s.scenario==='lost'?'unknown':'result'});
 }
 function search(){update({search:s.scenario==='network'?'error':['0012','0017'].includes(String(s.query))?'found':'empty'});}
 const body=<figure className="infographic teaching-artifact" data-form-artifact={id}>
  <div className="artifact-scroll" ref={scroller} onScroll={ev=>{if(writable)update({scroll:ev.currentTarget.scrollTop/Math.max(1,ev.currentTarget.scrollHeight-ev.currentTarget.clientHeight)});}}>
   <div className="artifact-workspace">
    <section className="artifact-criteria" aria-label="Условия проверки формы">
     <h3>Проверьте форму действием</h3><p>{e.why}</p>
     <p>Коды имеют четыре цифры. 0012 разрешена; 0017 в карантине; 0099 отсутствует. На экране исходно 10 шт.</p>
     <fieldset className="artifact-conditions" disabled={!writable}><legend>Учебные условия ответа</legend>{[['normal','Обычный отбор'],['stale','Остаток изменился'],['unknown','Партия не найдена'],['quarantine','Карантин'],['lost','Ответ потерян'],['empty','Пустой результат'],['network','Сбой сети в поиске']].map(([key,label])=><button key={key} type="button" aria-pressed={s.scenario===key} onClick={()=>reset(key)}>{label}</button>)}</fieldset>
     <section className="form-search"><h4>Поиск партии</h4><label>Код для поиска<input ref={queryInput} value={String(s.query)} readOnly={!writable} onChange={ev=>update({query:ev.currentTarget.value,search:'start'})}/></label><button type="button" disabled={!writable} onClick={search}>Найти партию</button>
      {s.search==='empty'&&<div role="status"><strong>Ничего не найдено</strong><p>Запрос выполнен, строк 0. Проверьте код и условия.</p><button type="button" disabled={!writable} onClick={()=>{update({query:'',search:'start'});queryInput.current?.focus();}}>Изменить условия</button></div>}
      {s.search==='error'&&<div role="alert"><strong>Не удалось загрузить</strong><p>Запрос не выполнен. Нельзя утверждать, что партии нет.</p><button type="button" disabled={!writable} onClick={search}>Повторить поиск</button></div>}
      {s.search==='found'&&<div role="status">Найдена {String(s.query)}: {s.query==='0017'?'карантин':'разрешена'}. Результат поиска не подтверждает отбор.</div>}
     </section>
    </section>
    <section className="wireframe-screen wireframe-high" aria-label="Учебная форма отбора">
     <header><span>WMS / Отбор</span><strong>{({edit:'Ввод данных',pending:'Ожидание ответа',unknown:'Исход неизвестен',result:'Отбор подтверждён'} as Record<string,string>)[phase]}</strong></header>
     <form noValidate onSubmit={ev=>{ev.preventDefault();if(!locked)confirm();}}>
      <label>Код партии<input ref={codeInput} value={String(s.code)} inputMode="numeric" readOnly={locked} aria-invalid={Boolean(s.error)&&s.field==='code'} aria-describedby={id+'-code-hint'+(s.field==='code'&&s.error?' '+id+'-error':'')} onChange={ev=>update({code:ev.currentTarget.value,error:'',draft:''})}/></label><small id={id+'-code-hint'}>Четыре цифры; ведущие нули сохраняются. Для подтверждения обязательно.</small>
      <label>Количество, шт.<input ref={quantityInput} value={String(s.quantity)} inputMode="numeric" readOnly={locked} aria-invalid={Boolean(s.error)&&s.field==='quantity'} aria-describedby={id+'-quantity-hint'+(s.field==='quantity'&&s.error?' '+id+'-error':'')} onChange={ev=>update({quantity:ev.currentTarget.value,error:'',draft:''})}/></label><small id={id+'-quantity-hint'}>Для подтверждения обязательно целое &gt; 0. В черновике может отсутствовать.</small>
      <p>Показанный до отправки остаток: 10 шт.</p>
      {Boolean(s.error)&&<p className="wireframe-error" role="alert" id={id+'-error'}>{String(s.error)}</p>}
      {Boolean(s.draft)&&<p role="status">{String(s.draft)}</p>}
      {phase==='edit'&&<><button type="button" disabled={!writable} onClick={()=>update({draft:`Черновик сохранён: код «${s.code}», количество «${s.quantity||'не задано'}». Учёт не подтверждён.`,error:''})}>Сохранить черновик</button><button className="wireframe-primary" type="submit" disabled={!writable}>Подтвердить отбор</button></>}
      {phase==='pending'&&<><p>Запрос {operation} отправлен.</p><button type="button" disabled>Подтверждаем…</button><p className="wireframe-model-label">Учебный ответ системы</p><button type="button" disabled={!writable} onClick={reply}>Показать ответ системы</button></>}
      {phase==='unknown'&&<><p>Ответ потерян. Код, количество и {operation} сохранены. Операция могла выполниться.</p><button type="button" disabled={!writable} onClick={()=>update({phase:'result'})}>Уточнить исход</button><button type="button" disabled={!writable} onClick={()=>update({phase:'result'})}>Повторить тот же запрос</button></>}
      {phase==='result'&&<><h4>{documentId} подтверждён</h4><p>{String(s.code)} · {String(s.quantity)} шт. · один документ</p><button type="button" disabled={!writable} onClick={()=>reset(String(s.scenario))}>Сбросить пример</button></>}
     </form><footer>Учебная форма · {operation}</footer>
    </section>
   </div>
   <section className="artifact-evidence" aria-live="polite"><strong>Независимая проверка данных</strong><p>{phase==='unknown'?'Исход пока неизвестен пользователю.':`Актуальный остаток: ${s.serverStock} шт.; документов отбора: ${s.documents}.`}</p>{phase==='result'&&<p>{s.scenario==='stale'?'5':'10'} − {String(s.quantity)} = {s.serverStock}. Выяснение исхода или повтор того же ID не создаёт ещё один документ.</p>}</section>
  </div>
 </figure>;
 return <>{fallback}{Boolean(s.expanded)&&createPortal(<dialog ref={dialog} className="artifact-dialog form-artifact-dialog" aria-labelledby={'form-title-'+id} onCancel={ev=>{ev.preventDefault();if(writable)update({expanded:false});}}><header><h2 id={'form-title-'+id}>Форма: поля, проверки и состояния</h2><button type="button" disabled={!writable} onClick={()=>update({expanded:false})}>Вернуться к слайду</button></header>{body}</dialog>,document.body)}</>;
}
