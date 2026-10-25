import {Children,createContext,isValidElement,useContext,useEffect,useRef,type ChangeEvent,type ReactNode,type SelectHTMLAttributes} from 'react';
import {useDemoState} from './experiment-state';
const Scope=createContext({id:'',writable:true,version:''});
export function PublicControlScope({id,writable,version,children}:{id:string;writable:boolean;version:string;children:ReactNode}){return <Scope.Provider value={{id,writable,version}}>{children}</Scope.Provider>}
export function PublicSelect(props:SelectHTMLAttributes<HTMLSelectElement>){
 const scope=useContext(Scope),label=props['aria-label']||props.name||'Выбор условия';
 const options=Children.toArray(props.children).filter(isValidElement).map(node=>{const p=node.props as {value?:string;children:ReactNode};return {value:String(p.value??p.children),text:String(p.children)}});
 const value=String(props.value??''),index=Math.max(0,options.findIndex(o=>o.value===value));
 const [state,update]=useDemoState('select:'+scope.id+':'+label,{open:false,active:index},scope.writable,scope.version);
 const root=useRef<HTMLDivElement>(null),button=useRef<HTMLButtonElement>(null);
 const open=Boolean(state.open),disabled=props.disabled||!scope.writable;
 const select=(i:number)=>{if(disabled)return;props.onChange?.({target:{value:options[i].value},currentTarget:{value:options[i].value}} as ChangeEvent<HTMLSelectElement>);update({open:false,active:i});button.current?.focus()};
 useEffect(()=>{if(!open||!scope.writable)return;const close=(e:PointerEvent)=>{if(!root.current?.contains(e.target as Node))update({open:false})};document.addEventListener('pointerdown',close);return()=>document.removeEventListener('pointerdown',close)},[open,scope.writable,update]);
 return <div className="public-select" ref={root}><button ref={button} type="button" role="combobox" aria-label={label} aria-expanded={open} aria-haspopup="listbox" disabled={disabled} onClick={()=>update({open:!open,active:index})} onKeyDown={e=>{
  if(e.key==='Escape'){e.preventDefault();e.stopPropagation();update({open:false})}
  else if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();update({open:true,active:Math.max(0,Math.min(options.length-1,(open?Number(state.active):index)+(e.key==='ArrowDown'?1:-1)))})}
  else if(e.key==='Enter'||e.key===' '){e.preventDefault();if(open)select(Number(state.active));else update({open:true,active:index})}
  else if(e.key==='Tab')update({open:false});
 }}>{options[index]?.text}<span aria-hidden="true">⌄</span></button>{open&&<div role="listbox" aria-label={label+' — варианты'}>{options.map((o,i)=><button type="button" role="option" key={o.value} disabled={!scope.writable} aria-selected={value===o.value} data-active={Number(state.active)===i} onClick={()=>select(i)}>{o.text}</button>)}</div>}</div>;
}
