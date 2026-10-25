import {useEffect,useRef,type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import type {Slide} from '@olgakraven/lecture-engine';
import cases from '../public/practice-cases.json';
import {useDemoState} from './experiment-state';
import './case-workshop.css';

type Practice=(typeof cases)[number];
export function CasePassport({slide,interactive}:{slide:Slide;interactive:boolean}){
 const c=cases.find(x=>x.returnSlide===slide.id);if(!c)return null;
 return <section className="case-passport"><div><h3>Задача</h3><p>{c.input}</p></div><div><h3>Что проверить</h3><p>Постройте два связанных результата: {c.fields.map(f=>f.label.toLowerCase()).join('; ')}. Обоснуйте решение и проверьте его границу.</p></div><button className="button primary" disabled={!interactive} onClick={()=>document.dispatchEvent(new CustomEvent('pisid-case',{detail:c.id}))}>Интерактивная схема</button><a className="case-print-link" href={`https://olgakraven.github.io/2026-PISID3-lecture/?lecture=${c.lectureId}&slide=${c.returnSlide}&case=${c.id}`}>Интерактивная схема ↗</a></section>;
}
export function CaseTools({children,version}:{children:ReactNode;version:string}){
 const audience=new URLSearchParams(location.search).get('mode')==='audience';
 useEffect(()=>{const sync=()=>{try{document.documentElement.dataset.theme=JSON.parse(localStorage.getItem(`lecture:${import.meta.env.BASE_URL}:pisid3:theme`)||'"light"')}catch{}};window.addEventListener('storage',sync);return()=>window.removeEventListener('storage',sync)},[]);
 const [state,update]=useDemoState('case-window',{caseId:audience?'':new URLSearchParams(location.search).get('case')||''},!audience,version);
 const dialog=useRef<HTMLDialogElement>(null),opener=useRef<HTMLElement|null>(null);
 const id=String(state.caseId),c=cases.find(c=>c.id===id);
 useEffect(()=>{const open=(event:Event)=>{if(!audience){opener.current=document.activeElement as HTMLElement;update({caseId:String((event as CustomEvent).detail)})}};document.addEventListener('pisid-case',open);return()=>document.removeEventListener('pisid-case',open)},[audience,update]);
 useEffect(()=>{if(c&&dialog.current&&!dialog.current.open)dialog.current.showModal()},[c]);
 const close=()=>{if(!audience){update({caseId:''});opener.current?.focus()}};
 return <>{children}{c&&createPortal(<dialog ref={dialog} className="case-dialog" aria-label={'Разбор задачи: '+c.title} onCancel={e=>{e.preventDefault();close()}}><div className="case-top"><strong>Разбор задачи</strong>{!audience&&<button className="button secondary" onClick={close}>Вернуться к слайду</button>}</div><CaseEditor key={id} c={c} writable={!audience} version={version}/></dialog>,document.body)}</>;
}
function CaseEditor({c,writable,version}:{c:Practice;writable:boolean;version:string}){
 const [s,update]=useDemoState('practice:'+c.id,{prediction:'',value0:'',value1:'',status0:'',status1:'',tries:0,revealed:false,reason:'',scroll:0},writable,version+':'+c.revision);
 const content=useRef<HTMLDivElement>(null);
 useEffect(()=>{if(!writable&&content.current)content.current.scrollTop=Number(s.scroll)*Math.max(0,content.current.scrollHeight-content.current.clientHeight)},[s.scroll,writable]);
 const normalize=(v:string)=>v.trim().toLocaleLowerCase('ru').replace(/ё/g,'е').replace(/\s+/g,' ').replace(/(\d),(\d)/g,'$1.$2');
 const check=(i:number)=>{const input=normalize(String(s['value'+i])),expected=normalize(c.fields[i].answer),numeric=/^-?\d+(?:\.\d+)?$/.test(expected),number=input.replace(/\s/g,'');const correct=numeric?/^-?\d+(?:\.\d+)?$/.test(number)&&Number(number)===Number(expected):input===expected;update({['status'+i]:correct?'pass':'fail',tries:Number(s.tries)+1})};
 return <div ref={content} className="case-scroll" onScroll={e=>{if(writable)update({scroll:e.currentTarget.scrollTop/Math.max(1,e.currentTarget.scrollHeight-e.currentTarget.clientHeight)})}}>
  <h1>{c.title}</h1><p className="case-context">Учебные данные · {c.concepts.join(' и ')}</p><p>{c.input}</p><p className="case-environment">{c.environment}</p>
  <label className="case-field">Прогноз: что должно получиться<textarea value={String(s.prediction)} readOnly={!writable} onChange={e=>update({prediction:e.target.value})}/></label>
  <div className="case-trace" aria-label="Построение артефакта"><span>Исходное условие</span><span aria-hidden="true">→</span><span data-active={s.status0==='pass'}>{c.fields[0].label}</span><span aria-hidden="true">→</span><span data-active={s.status1==='pass'}>{c.fields[1].label}</span></div>
  <div className="case-steps">{c.fields.map((f,i)=><fieldset key={f.label} disabled={!writable||(i===1&&s.status0!=='pass')}><legend>Шаг {i+1}. {f.label}</legend><label className="case-field">Результат<input aria-label={f.label} value={String(s['value'+i])} onChange={e=>update({['value'+i]:e.target.value,['status'+i]:'',...(i===0?{status1:'',revealed:false}:{})})}/><small>Введите число, идентификатор или точное название из условия. Обоснование запишите отдельно.</small></label>{writable&&<button className="button primary" onClick={()=>check(i)}>Проверить шаг {i+1}</button>}<p role="status" data-status={String(s['status'+i])}>{s['status'+i]==='pass'?'Результат шага совпал с условием.':s['status'+i]==='fail'?'Пересмотрите результат. '+f.hint:i===1&&s.status0!=='pass'?'Сначала подтвердите первый результат.':'Введите собственный результат по данным условия.'}</p></fieldset>)}</div>
  <label className="case-field">Обоснование и граница вывода<textarea value={String(s.reason)} readOnly={!writable} onChange={e=>update({reason:e.target.value})}/></label><p>Обоснование проверяется по критериям ниже; заполненное поле не означает верный ответ.</p><ul>{c.criteria.map(x=><li key={x}>{x}</li>)}</ul>
  {writable&&<button className="button secondary" disabled={Number(s.tries)===0} onClick={()=>update({revealed:!s.revealed})}>{s.revealed?'Скрыть разбор':'Показать разбор после попытки'}</button>}
  {s.revealed&&<section className="case-solution"><h2>Разбор решения</h2>{c.fields.map((f,i)=><p key={f.label}><strong>Шаг {i+1}: {f.answer}.</strong> {f.hint}</p>)}<p>{c.explanation}</p><p><strong>Граница:</strong> {c.boundary}</p></section>}
 </div>;
}
