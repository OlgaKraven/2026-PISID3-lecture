import {useEffect,useRef,type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import artifacts from '../public/teaching-artifacts.json';
import {useDemoState} from './experiment-state';
import './teaching-artifact.css';

export const hasTeachingArtifact=(id:string)=>artifacts.some(a=>a.id===id);
export function TeachingArtifact({id,writable,version,fallback}:{id:string;writable:boolean;version:string;fallback:ReactNode}){
 const e=artifacts.find(a=>a.id===id)!;
 const ship=e.operation==='shipment';
 const initial={phase:('start' in e&&e.start==='list'?'list':'edit'),batch:ship?'P-17':'P-18',quantity:'quantity' in e?String(e.quantity):ship?'2':'8',scenario:e.scenario,focus:e.focus,error:'',result:'',confirmed:false,scroll:0,fidelity:e.focus==='fidelity'?'high':'low',expanded:false};
 const [s,update]=useDemoState('artifact:'+id,initial,writable,version);
 const batch=String(s.batch),quantity=String(s.quantity),scenario=String(s.scenario),phase=String(s.phase);
 const input=useRef<HTMLInputElement>(null),scroll=useRef<HTMLDivElement>(null);
 const dialog=useRef<HTMLDialogElement>(null),opener=useRef<HTMLElement|null>(null),wasExpanded=useRef(false);
 useEffect(()=>{const open=(ev?:Event)=>{if(ev&&(ev as CustomEvent).detail!==id)return;const frame=[...document.querySelectorAll<HTMLElement>(`[data-slide-id="${id}"]`)].find(f=>f.dataset.artifactRequest==='open');if(frame&&writable){delete frame.dataset.artifactRequest;opener.current=document.activeElement as HTMLElement;update({expanded:true,scroll:0});}};document.addEventListener('pisid-artifact-open',open);open();return()=>document.removeEventListener('pisid-artifact-open',open);},[id,writable]);
 useEffect(()=>{if(s.expanded&&dialog.current&&!dialog.current.open)dialog.current.showModal();if(!s.expanded&&wasExpanded.current&&writable)queueMicrotask(()=>opener.current?.focus());wasExpanded.current=Boolean(s.expanded);},[s.expanded,writable]);
 useEffect(()=>{if(!writable&&scroll.current)scroll.current.scrollTop=Number(s.scroll)*Math.max(0,scroll.current.scrollHeight-scroll.current.clientHeight);},[s.scroll,writable]);
 const repeat=scenario==='repeat',lost=scenario==='lost',fault=scenario==='late-check',quarantine=scenario==='quarantine';
 const knownBatch=batch.trim()==='P-18'||(ship&&batch.trim()==='P-17')||batch==='P-2026-000018-0000000012345678901234567890';
 const before=ship?9:repeat?18:10,n=Number(quantity);
 const affected=Boolean(s.confirmed),after=affected?(ship?before-n:repeat?before:before+n):before;
 const story=ship?'US-02':'US-01';
 const role='кладовщик',goal=ship?'подтвердить отбор только разрешённой партии':'зарегистрировать поступившую партию по коду и фактическому количеству',value=ship?'не передать карантинный товар в отгрузку':'складской остаток соответствовал принятому товару';
 const reset=(nextScenario=e.scenario)=>update({...initial,expanded:s.expanded,scenario:nextScenario,quantity:nextScenario==='repeat'?'8':initial.quantity,batch:nextScenario==='unknown'?'P-999':nextScenario==='long'?'P-2026-000018-0000000012345678901234567890':ship?'P-17':'P-18'});
 function review(){
  if(!batch.trim()){update({error:'Укажите код партии.'});input.current?.focus();return;}
  if(!Number.isInteger(n)||n<=0||n>1000){update({error:'Количество — целое число от 1 до 1000.'});return;}
  if(!knownBatch){update({error:'Партия не найдена. Проверьте код; количество сохранено.'});input.current?.focus();return;}
  update({phase:'review',error:''});
 }
 function answer(){
  if(repeat&&(n!==8||batch!=='P-18')){update({phase:'edit',error:'Конфликт OP-17: содержание отличается от принятой операции. Прежние 18 шт. и D-17 на 8 сохранены.',confirmed:false});return;}
  if(ship&&quarantine){update({phase:'edit',error:'Отбор запрещён: партия в карантине. Движение не создано.',confirmed:false});return;}
  if(ship&&fault){update({phase:'result',error:'Дефект: карантин проверен после списания. Ошибка показана, но критерий уже нарушен.',confirmed:true,result:'Ошибка отгрузки'});return;}
  if(ship&&n>before){update({phase:'edit',error:'Недостаточно доступного остатка. Движение не создано.',confirmed:false});return;}
  update({phase:lost?'unknown':'result',confirmed:true,result:repeat?'Прежний результат OP-17':'D-17 подтверждён',error:''});
 }
 const then=!knownBatch?'Партия не найдена; учёт не изменён.':!Number.isInteger(n)||n<=0||n>1000?'Отказ: недопустимое количество; учёт не изменён.':repeat&&(n!==8||batch!=='P-18')?'Конфликт OP-17; прежние 18 шт. и D-17 на 8 сохранены.':quarantine||fault?'Отказ; остаток 9 шт.; движений 0.':ship&&n>before?'Отказ: недостаточно остатка; учёт не изменён.':ship?`Остаток ${before-n} шт.; одно движение отбора.`:repeat?'Прежний D-17; остаток 18 шт.; второго документа нет.':`D-17 на ${n} шт.; остаток ${before+n} шт.; один документ.`;
 const outcome=phase==='unknown'?'Исход пока неизвестен клиенту':affected?`${after} шт.; подтверждений 1`:`${before} шт.; подтверждений ${repeat?1:0}`;
 const figure=<figure className="infographic teaching-artifact" data-teaching-artifact={e.kind} data-artifact-id={id}>
  <div className="artifact-scroll" ref={scroll} onScroll={ev=>{if(writable)update({scroll:ev.currentTarget.scrollTop/Math.max(1,ev.currentTarget.scrollHeight-ev.currentTarget.clientHeight)})}}>
   {e.kind==='story'&&<section className="story-sheet" aria-label="Полная пользовательская история">
    <header><strong>{story}</strong><span>{ship?'Отбор разрешённой партии':'Приёмка одной партии'}</span></header>
    <p className="story-sentence">Как <mark data-focus={s.focus==='role'}>{role}</mark>, я хочу <mark data-focus={s.focus==='goal'}>{goal}</mark>, чтобы <mark data-focus={s.focus==='value'}>{value}</mark>.</p>
    <fieldset className="story-focus" disabled={!writable}><legend>Разберите части неизменной истории</legend>{[['role','Роль'],['goal','Цель'],['value','Ценность']].map(([key,label])=><button key={key} type="button" aria-pressed={s.focus===key} onClick={()=>update({focus:key})}>{label}</button>)}</fieldset>
    {e.focus==='boundary'&&<div className="story-scope"><strong>Граница US-01: одна приёмка до подтверждения.</strong><p>Другие истории: US-03 — инвентаризация; US-04 — отчётность; US-05 — управление пользователями. Они не входят в критерий этой приёмки.</p></div>}
   </section>}
   <div className="artifact-workspace">
    <section className="artifact-criteria" aria-label={e.kind==='story'?'Критерий приёмки':'Задача проверки прототипа'}>
     <h3>{e.kind==='story'?'AC-01 · Проверяем историю':'Пройдите задачу на каркасе'}</h3>
     {e.kind==='story'?<dl className="gwt"><div data-active={phase==='edit'||phase==='list'}><dt>Given · Дано</dt><dd>{batch||'Код не указан'}; {!knownBatch?'не найдена':quarantine||fault?'карантин':'разрешена'}; остаток {before} шт.{repeat?' OP-17 уже выполнен.':''}</dd></div><div data-active={phase==='review'||phase==='pending'}><dt>When · Когда</dt><dd>Кладовщик подтверждает {ship?'отбор':'приёмку'} {quantity} шт.</dd></div><div data-active={phase==='result'||Boolean(s.error)}><dt>Then · Тогда</dt><dd>{then}</dd></div></dl>:<><p>{e.why}</p><ol className="wireflow-key"><li>Ввод: партия и количество.</li><li>Проверка: можно вернуться и исправить.</li><li>Результат: документ либо объяснимый отказ.</li></ol></>}
     <fieldset className="artifact-conditions" disabled={!writable}><legend>Начальные данные для сравнения</legend>
      {(ship?[['allowed','Разрешённая партия'],['quarantine','Карантин'],['late-check','Дефект: списание до проверки']]:[['allowed','Обычная приёмка'],['unknown','Партия не найдена'],['repeat','Повтор OP-17'],['lost','Ответ потерян'],['long','Длинный код']]).map(([key,label])=><button type="button" key={key} aria-pressed={scenario===key} onClick={()=>reset(key)}>{label}</button>)}
     </fieldset>
    </section>
    <section className={'wireframe-screen '+(s.fidelity==='high'?'wireframe-high':'')} aria-label="Работающий учебный каркас">
     <header><span>WMS / {ship?'Отбор':'Приёмка'}</span><strong>{({list:'Мои черновики',edit:'Ввод данных',review:'Проверка',pending:'Ожидание ответа',unknown:'Ответ не получен',result:'Результат'} as Record<string,string>)[phase]}</strong></header>
     {phase==='list'?<><p>Незавершённая приёмка D-17</p><dl><dt>Партия</dt><dd>P-18</dd><dt>Количество</dt><dd>{quantity} шт.</dd></dl><button type="button" disabled={!writable} onClick={()=>update({phase:'edit'})}>Продолжить черновик D-17</button></>:
      phase==='edit'?<form onSubmit={ev=>{ev.preventDefault();review();}} noValidate><label>Код партии<input ref={input} value={batch} readOnly={!writable} aria-invalid={Boolean(s.error)&&(!batch||String(s.error).includes('найдена'))} onChange={ev=>update({batch:ev.currentTarget.value,error:''})}/></label><label>Количество, шт.<input inputMode="numeric" value={quantity} readOnly={!writable} aria-invalid={Boolean(s.error)&&String(s.error).includes('Количество')} onChange={ev=>update({quantity:ev.currentTarget.value,error:''})}/></label>{Boolean(s.error)&&<p className="wireframe-error" role="alert">{String(s.error)}</p>}<button className="wireframe-primary" type="submit" disabled={!writable}>Продолжить</button>{e.kind==='wireframe'&&<button type="button" disabled={!writable} onClick={()=>update({phase:'list'})}>К черновикам — сохранить ввод</button>}</form>:
      phase==='review'?<><h4>Проверьте {ship?'отбор':'приёмку'}</h4><p className="wireframe-code">{batch}</p><p>Количество: <strong>{quantity} шт.</strong></p><p>До операции: {before} шт.</p><button type="button" disabled={!writable} onClick={()=>update({phase:'edit'})}>Исправить количество</button><button className="wireframe-primary" type="button" disabled={!writable} onClick={()=>update({phase:'pending'})}>{ship?'Подтвердить отбор':'Подтвердить приёмку'}</button></>:
      phase==='pending'?<><h4>Запрос OP-17 отправлен</h4><p>Идёт проверка. Повторное подтверждение недоступно.</p><button type="button" disabled>Подтверждение выполняется</button><p className="wireframe-model-label">Учебный ответ системы</p><button type="button" disabled={!writable} onClick={answer}>Показать ответ системы</button></>:
      phase==='unknown'?<><h4>Ответ не получен</h4><p>Данные сохранены: {batch}, {quantity} шт.</p><p>Операция могла выполниться. Сохраняем OP-17.</p><button type="button" disabled={!writable} onClick={()=>update({phase:'result',result:'Найден прежний D-17 по OP-17'})}>Уточнить исход OP-17</button></>:
      <><h4>{String(s.result)}</h4><p className="wireframe-code">{batch}</p><p>Документ: D-17 · {quantity} шт.</p>{Boolean(s.error)&&<p className="wireframe-error" role="alert">{String(s.error)}</p>}<button type="button" disabled={!writable} onClick={()=>reset(scenario)}>Сбросить пример</button></>}
     <footer>Учебный прототип · OP-17</footer>
    </section>
   </div>
   <section className="artifact-evidence" aria-live="polite"><strong>Проверка данных, отдельно от сообщения экрана</strong><p>До запуска: {before} шт. → {outcome}</p>{fault&&affected&&<p>Ожидалось 9 шт. и 0 движений; получено {after} шт. и 1 движение. Критерий НЕ выполнен.</p>}{!fault&&phase==='result'&&<p>{ship?`${before} − ${n} = ${after}`:repeat?`${before} → ${after}; повтор не прибавляет количество`:`${before} + ${n} = ${after}`} шт.</p>}</section>
   {e.kind==='wireframe'&&<fieldset className="wireframe-level" disabled={!writable}><legend>Один маршрут, разная детализация</legend><button type="button" aria-pressed={s.fidelity==='low'} onClick={()=>update({fidelity:'low'})}>Каркас</button><button type="button" aria-pressed={s.fidelity==='high'} onClick={()=>update({fidelity:'high'})}>Компоненты и состояния</button></fieldset>}
  </div>
  {e.kind==='story'&&<figcaption>{e.why}</figcaption>}
 </figure>;
 return <>{fallback}{Boolean(s.expanded)&&createPortal(<dialog ref={dialog} className="artifact-dialog" aria-labelledby={'artifact-title-'+id} onCancel={ev=>{ev.preventDefault();if(writable)update({expanded:false});}}><header><h2 id={'artifact-title-'+id}>{e.kind==='story'?'Пользовательская история и её проверка':'Wireframe: проверка сценария'}</h2><button type="button" disabled={!writable} onClick={()=>update({expanded:false})}>Вернуться к слайду</button></header>{figure}</dialog>,document.body)}</>;
}
