import {useEffect, useLayoutEffect, useRef} from 'react';
import type {Slide} from '@olgakraven/lecture-engine';
import {useDemoState} from './experiment-state';

type Task=NonNullable<Slide['task']>;
type Attempt={draft: unknown;seed?: number;result?: unknown};
type Controller={readonly:boolean;change:(task:Task,value:Record<string,string>)=>void};
export function taskSeed(id:string){let hash=2166136261;for(const c of id)hash=Math.imul(hash^c.charCodeAt(0),16777619);return hash>>>0;}
export function shuffledOptions<T>(values:T[],seed:number){
 const result=[...values];let state=seed>>>0;
 for(let i=result.length-1;i>0;i--){state=(Math.imul(state,1664525)+1013904223)>>>0;const j=state%(i+1);[result[i],result[j]]=[result[j],result[i]];}
 return result;
}
export function MatchingBoard({task,attempt,controller}:{task:Task;attempt?:Attempt;controller:Controller}){
 const seed=attempt?.seed??taskSeed(task.id),locked=controller.readonly||Boolean(attempt?.result);
 const items=task.items||[],options=task.options||[];
 const [layout,update]=useDemoState('matching:'+task.id,{left:shuffledOptions(items,seed).map(i=>i.id),right:shuffledOptions(options,seed+17).map(o=>o.id),active:'',scrollLeft:0,scrollRight:0,seed,shuffles:0},!controller.readonly,document.documentElement.dataset.courseVersion||'');
 const left=layout.left as string[],right=layout.right as string[];
 const draft=attempt?.draft&&typeof attempt.draft==='object'&&!Array.isArray(attempt.draft)?attempt.draft as Record<string,string>:{};
 const leftList=useRef<HTMLDivElement>(null),rightList=useRef<HTMLDivElement>(null);
 useEffect(()=>{if(!controller.readonly&&layout.seed!==seed)update({left:shuffledOptions(items,seed).map(i=>i.id),right:shuffledOptions(options,seed+17).map(o=>o.id),active:'',scrollLeft:0,scrollRight:0,seed});},[seed,controller.readonly]);
 useLayoutEffect(()=>{if(controller.readonly){if(leftList.current)leftList.current.scrollTop=Number(layout.scrollLeft)*Math.max(0,leftList.current.scrollHeight-leftList.current.clientHeight);if(rightList.current)rightList.current.scrollTop=Number(layout.scrollRight)*Math.max(0,rightList.current.scrollHeight-rightList.current.clientHeight);}},[layout.scrollLeft,layout.scrollRight,controller.readonly]);
 const move=(side:'left'|'right',id:string,direction:number)=>{
  const next=[...(layout[side] as string[])],index=next.indexOf(id),to=index+direction;
  if(to<0||to>=next.length)return;[next[index],next[to]]=[next[to],next[index]];update({[side]:next});
 };
 const choose=(id:string,value:string)=>{if(!locked)controller.change(task,{...draft,[id]:value});};
 const moves=(side:'left'|'right',id:string,index:number,total:number,label:string)=>!controller.readonly&&<span className="matching-moves"><button type="button" aria-label={`Поднять ${label}`} disabled={index===0} onClick={()=>move(side,id,-1)}>↑</button><button type="button" aria-label={`Опустить ${label}`} disabled={index===total-1} onClick={()=>move(side,id,1)}>↓</button></span>;
 return <section className="matching-board" aria-label="Связанные списки соответствия">
  <div className="matching-board-heading"><p>Выберите понятие слева и характеристику справа. Пары показаны целиком.</p>{!controller.readonly&&<button type="button" className="button ghost" onClick={()=>update({left:shuffledOptions(items,Number(layout.seed)+31+Number(layout.shuffles)*13).map(i=>i.id),right:shuffledOptions(options,Number(layout.seed)+47+Number(layout.shuffles)*17).map(o=>o.id),shuffles:Number(layout.shuffles)+1})}>Перемешать списки</button>}</div>
  <div className="matching-columns">
   <div className="matching-list" ref={leftList} aria-label="Понятия и выбранные пары" onScroll={e=>{if(!controller.readonly)update({scrollLeft:e.currentTarget.scrollTop/Math.max(1,e.currentTarget.scrollHeight-e.currentTarget.clientHeight)});}}>
    {left.map((id,index)=>{const item=items.find(i=>i.id===id);if(!item)return null;const value=draft[id]||'',chosen=options.find(o=>o.id===value);return <div className={`matching-card ${layout.active===id?'matching-active':''}`} key={id} data-match-id={id}>
     <div className="matching-card-title">{controller.readonly?<strong>{item.text}</strong>:<button type="button" disabled={locked} aria-pressed={layout.active===id} onClick={()=>update({active:id})}>{index+1}. {item.text}</button>}{moves('left',id,index,left.length,'понятие '+item.text)}</div>

     <p className="matching-selected" data-match-value={value}>{chosen?chosen.text:'Пара пока не выбрана'}</p>
    </div>;})}
   </div>
   <div className="matching-list" ref={rightList} aria-label="Характеристики" onScroll={e=>{if(!controller.readonly)update({scrollRight:e.currentTarget.scrollTop/Math.max(1,e.currentTarget.scrollHeight-e.currentTarget.clientHeight)});}}>
    {right.map((id,index)=>{const option=options.find(o=>o.id===id);if(!option)return null;const linked=items.filter(i=>draft[i.id]===id);return <div className={`matching-card ${linked.length?'matching-linked':''}`} key={id} data-option-id={id}><div className="matching-card-title">{controller.readonly?<strong>{String.fromCharCode(1040+index)}</strong>:<button type="button" disabled={locked||!layout.active} onClick={()=>choose(String(layout.active),id)}>{String.fromCharCode(1040+index)}. {option.text}</button>}{moves('right',id,index,right.length,'характеристику '+option.text)}</div>{controller.readonly&&<p>{option.text}</p>}{linked.length>0&&<p className="matching-links">Связано: {linked.map(i=>i.text).join('; ')}</p>}</div>;})}
   </div>
  </div>
 </section>;
}
