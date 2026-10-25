import {useRef,useEffect,type ReactNode} from 'react';
import {Infographic} from '@olgakraven/lecture-engine';
import type {Slide} from '@olgakraven/lecture-engine';
import experiments from '../public/question-experiments.json';
import {useDemoState} from './experiment-state';
import {PublicControlScope,PublicSelect} from './public-select';
import './question-experiment.css';

export function QuestionExperiment({id,writable,version,children}:{id:string;writable:boolean;version:string;children?:ReactNode}){
 const e=experiments.find(e=>e.id===id)!;
 const [s,update]=useDemoState('practice:experiment:'+id,{scenario:0,step:0,prediction0:'',prediction1:'',trials:[] as string[],scroll:0,hints:false,diagram:false},writable,version);
 const scroll=useRef<HTMLDivElement>(null),scenario=e.scenarios[Number(s.scenario)],step=Number(s.step);
 useEffect(()=>{if(!writable&&scroll.current)scroll.current.scrollTop=Number(s.scroll)*Math.max(0,scroll.current.scrollHeight-scroll.current.clientHeight)},[s.scroll,writable]);
 const values=[scenario.condition,scenario.action,scenario.result];
 const record=()=>update({trials:[...(s.trials as string[]),JSON.stringify({scenario:Number(s.scenario),prediction:String(s['prediction'+s.scenario]).slice(0,500)})]});
 return <PublicControlScope id={'question-experiment:'+id} writable={writable} version={version}><div className="case-scroll question-experiment" ref={scroll} onScroll={event=>{if(writable)update({scroll:event.currentTarget.scrollTop/Math.max(1,event.currentTarget.scrollHeight-event.currentTarget.clientHeight)})}}>
  <h1>Эксперимент: {e.title}</h1><p className="case-environment">Учебная модель двух случаев. Выбирайте условия, прослеживайте решение по шагам и сравнивайте результаты.</p>
  <div className="qe-condition"><span>Условия примера</span><PublicSelect aria-label="Условия примера" value={String(s.scenario)} disabled={!writable} onChange={event=>update({scenario:Number(event.target.value),step:0,diagram:false})}>{e.scenarios.map((v,i)=><option key={v.label} value={String(i)}>{v.label}</option>)}</PublicSelect></div>
  <p className="qe-input">{scenario.condition}</p>
  <label className="case-field">Прогноз для выбранного условия<textarea maxLength={500} readOnly={!writable} value={String(s['prediction'+s.scenario])} onChange={event=>update({['prediction'+s.scenario]:event.target.value})}/></label>
  {writable&&<div className="qe-actions"><button className="button secondary" disabled={step===0} onClick={()=>update({step:step-1})}>Назад по решению</button><button className="button primary" disabled={step===2} onClick={()=>update({step:step+1})}>Следующий шаг решения</button><button className="button secondary" onClick={()=>update({step:0,diagram:false})}>Начать разбор заново</button><button className="button secondary" disabled={step!==2||(s.trials as string[]).length>=8} onClick={record}>Зафиксировать результат запуска</button></div>}
  <ol className="qe-model" aria-label="Ход решения">{['Исходные данные','Действие по правилу','Проверяемый результат'].map((label,i)=><li key={label} aria-current={step===i?'step':undefined} data-complete={step>=i}><h2>{i+1}. {label}</h2><p>{step>=i?values[i]:'Откройте этот шаг после своего прогноза.'}</p></li>)}</ol>
  <p className="qe-step" role="status">Шаг {step+1} из 3: {['проверьте исходные данные','проследите основание действия','сравните результат с прогнозом'][step]}.</p>

  <section className="qe-comparison"><h2>Сравните запуски</h2>{!(s.trials as string[]).length&&<p>Завершите исходный разбор и сохраните результат. Выберите изменённое условие, запишите новый прогноз и повторите шаги.</p>}<ol>{(s.trials as string[]).map((raw,i)=>{const trial=JSON.parse(raw) as {scenario:number;prediction:string},v=e.scenarios[trial.scenario];return <li key={i}><h3>Запуск {i+1}: {v.label}</h3><p><strong>Условие:</strong> {v.condition}</p><p><strong>Прогноз:</strong> {trial.prediction||'Не записан'}</p><p><strong>Действие:</strong> {v.action}</p><p><strong>Результат:</strong> {v.result}</p></li>})}</ol></section>
  <button className="button secondary" aria-expanded={Boolean(s.hints)} disabled={!writable} onClick={()=>update({hints:!s.hints})}>Подсказки для работы</button>
  {s.hints&&<aside className="qe-hints"><ul>{e.hints.map(h=><li key={h}>{h}</li>)}</ul></aside>}
  <button className="button secondary" aria-expanded={Boolean(s.diagram)} disabled={!writable} onClick={()=>update({diagram:!s.diagram})}>Схема исходного случая</button>
  {s.diagram&&<section className="qe-reference"><h2>Как читать исходную схему</h2><p>{e.reading}</p><Infographic visual={e.visual as NonNullable<Slide['visual']>}/><p>{e.transcript}</p><p><strong>Граница:</strong> {e.boundary}</p>{Number(s.scenario)===1&&<p>Эта схема относится к исходному примеру. Изменённое решение показано в шагах выше.</p>}</section>}
  <section className="qe-independent"><h2>Проверьте решение на новых данных</h2><p>Примените изученный способ самостоятельно. Два результата проверяются последовательно; полный разбор открывается после попытки.</p>{children}</section>
 </div></PublicControlScope>;
}
