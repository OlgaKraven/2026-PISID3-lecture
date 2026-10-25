import {useEffect,useRef} from 'react';
import {createPortal} from 'react-dom';
import {useDemoState} from './experiment-state';
import './answer-dialog.css';
type Props={id:string;result:{explanation:string;solution:string};readonly:boolean;onClose?:()=>void;options?:{id:string;text:string}[];optionExplanations?:Record<string,string>};
export function AnswerDialog({id,result,readonly,onClose,options=[],optionExplanations}:Props){
 const dialog=useRef<HTMLDialogElement>(null),content=useRef<HTMLDivElement>(null),opener=useRef(document.activeElement as HTMLElement|null);
 const [state,update]=useDemoState('answer-dialog:'+id,{scroll:0,details:readonly?'':JSON.stringify({options,optionExplanations})},!readonly,document.documentElement.dataset.courseVersion||'');
 const shared=JSON.parse(String(state.details)||'{}') as {options?:Props['options'];optionExplanations?:Props['optionExplanations']};
 const publicOptions=readonly?shared.options||[]:options,publicExplanations=readonly?shared.optionExplanations:optionExplanations;
 useEffect(()=>{dialog.current?.showModal();return()=>{if(!readonly)queueMicrotask(()=>opener.current?.isConnected&&opener.current.focus())}},[readonly]);
 useEffect(()=>{if(readonly&&content.current)content.current.scrollTop=Number(state.scroll)*Math.max(0,content.current.scrollHeight-content.current.clientHeight)},[readonly,state.scroll]);
 return createPortal(<dialog className="answer-dialog" ref={dialog} aria-label="Разбор ответа" onCancel={event=>{event.preventDefault();if(!readonly)onClose?.()}}><header><h2>Разбор ответа</h2>{!readonly&&<button type="button" className="button secondary" onClick={onClose}>Закрыть разбор</button>}</header><div className="answer-dialog-content" ref={content} onScroll={event=>{if(!readonly)update({scroll:event.currentTarget.scrollTop/Math.max(1,event.currentTarget.scrollHeight-event.currentTarget.clientHeight)})}}><p>{result.explanation}</p><h3>Правильный ответ</h3><p className="preserve-lines">{result.solution}</p>{publicExplanations&&<ul>{Object.entries(publicExplanations).map(([key,text])=><li key={key}><strong>{publicOptions.find(o=>o.id===key)?.text}: </strong>{text}</li>)}</ul>}</div></dialog>,document.body);
}
