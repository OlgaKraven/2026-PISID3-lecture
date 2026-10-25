import {useEffect,useRef} from 'react';
import {useDemoState} from './experiment-state';
export function PublicViewport({version}:{version:string}){
 const audience=new URLSearchParams(location.search).get('mode')==='audience';
 const [state,update]=useDemoState('slide-viewport',{slideId:'',selector:'',ratio:0},!audience,version);
 const current=useRef(state);current.current=state;
 useEffect(()=>{
  if(audience){
   const apply=()=>{const s=current.current;const frame=[...document.querySelectorAll<HTMLElement>('.audience-slide [data-slide-id]')].find(n=>n.dataset.slideId===s.slideId);const el=frame?.querySelector<HTMLElement>(String(s.selector)||'.slide-copy');if(el)el.scrollTop=Number(s.ratio)*Math.max(0,el.scrollHeight-el.clientHeight)};
   const observer=new MutationObserver(apply);observer.observe(document.getElementById('root')!,{childList:true,subtree:true});apply();return()=>observer.disconnect();
  }
  const scroll=(event:Event)=>{const el=event.target;if(!(el instanceof HTMLElement)||!el.closest('.slide-frame')||el.closest('.next-stage')||!el.matches('.slide-copy,.choice-grid,.experiment,.infographic'))return;const selector=['slide-copy','choice-grid','experiment','infographic'].find(c=>el.classList.contains(c))!;update({slideId:el.closest<HTMLElement>('[data-slide-id]')!.dataset.slideId!,selector:'.'+selector,ratio:el.scrollTop/Math.max(1,el.scrollHeight-el.clientHeight)})};
  document.addEventListener('scroll',scroll,true);return()=>document.removeEventListener('scroll',scroll,true);
 },[audience,update]);
 useEffect(()=>{if(!audience||!state.selector)return;const el=document.querySelector<HTMLElement>(`.audience-slide [data-slide-id="${state.slideId}"] ${state.selector}`);if(el)el.scrollTop=Number(state.ratio)*Math.max(0,el.scrollHeight-el.clientHeight)},[audience,state]);
 return null;
}
