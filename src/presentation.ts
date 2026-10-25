import type {Course} from '@olgakraven/lecture-engine'
export function installPresentation(course:Course,base:string){
 const entries=new Map(course.lectures.flatMap((l,li)=>l.slides.map((s,i)=>[s.id,{slide:s,lecture:l,topic:li+1,page:i+1}] as const)))
 const create=(tag:string,className:string,text='')=>{const node=document.createElement(tag);node.className=className;node.textContent=text;return node}
 let scheduled=false
 const seenHeadings=new WeakSet<Element>()
 const decorate=()=>{
  observer.disconnect();scheduled=false
  for(const frame of document.querySelectorAll<HTMLElement>('.slide-frame[data-slide-id]')){
   const entry=entries.get(frame.dataset.slideId||'');if(!entry)continue
   const {slide,lecture,topic,page}=entry
   for(const old of frame.querySelectorAll('.presentation-added'))old.remove()
   const content=frame.querySelector('.slide-content'),brand=frame.querySelector('.slide-brand'),footer=frame.querySelector('.slide-footer')
   let actions=frame.querySelector('.slide-header-actions');if(!actions){actions=create('div','slide-header-actions');frame.querySelector('.slide-header')?.append(actions)}
   const img=brand?.querySelector('img');if(img){img.classList.toggle('presentation-wordmark',slide.kind==='title');img.setAttribute('src',base+'brand/synergy-wordmark.jpg')}
   const topicLabel=create('span','presentation-topic presentation-added',`Тема ${String(topic).padStart(2,'0')}`);actions?.append(topicLabel)
   if(slide.kind!=='title'){const mark=create('img','presentation-mark presentation-added') as HTMLImageElement;mark.src=base+'brand/synergy-mark.png';mark.alt='';actions?.append(mark)}
   if(frame.querySelector('.infographic')&&!frame.closest('.audience-slide,.print-page,.next-stage')){
    const artifact=slide.visual?.type==='callouts'&&slide.visual.image.startsWith('artifacts/');
    if(artifact){const graphic=frame.querySelector('.infographic');graphic?.setAttribute('aria-label',slide.visual?.type==='callouts'?slide.visual.alt:'');graphic?.removeAttribute('aria-describedby');}
    const button=create('button','pd-diagram-open presentation-added',artifact?'Развернуть пример':'Развернуть схему') as HTMLButtonElement;button.type='button';button.setAttribute('aria-haspopup','dialog');button.addEventListener('click',()=>{if(artifact){frame.dataset.artifactRequest='open';document.dispatchEvent(new CustomEvent('pisid-artifact-open',{detail:slide.id}));}else frame.querySelector<HTMLButtonElement>('.diagram-open-button')?.click()});actions?.prepend(button)
   }
   const circle=create('div','presentation-circles presentation-added');frame.prepend(circle)
   const concept=slide.id.match(/-c(\d+)-/)
   const match=slide.id.match(/-Q0?(\d)(?:-|$)/)||slide.kicker.match(/^Вопрос (\d+)/)||(concept?['',String(Math.ceil(Number(concept[1])/2))]:null)
   footer?.append(create('span','presentation-question presentation-added',match?`Вопрос ${Number(match[1])}`:''),create('span','presentation-page presentation-added',String(page).padStart(2,'0')))
   if(slide.kind==='title'){
    const profile=frame.querySelector('.title-profile');profile?.prepend(create('small','presentation-added','Преподаватель'));const name=profile?.querySelector('strong');if(name?.textContent==='Преподаватель')name.setAttribute('data-empty-profile','true');else name?.removeAttribute('data-empty-profile')
    const body=frame.querySelector('.slide-body-copy');body?.classList.add('presentation-discipline');if(body)body.textContent=course.discipline
   }
   if(slide.kind==='section'){
    content?.append(create('div','presentation-chevron presentation-added'))
    const h=frame.querySelector<HTMLElement>('.slide-copy>h2');if(h){
     if(!seenHeadings.has(h)){seenHeadings.add(h);sizes.observe(h)}
     h.replaceChildren(...slide.title.split(' ').flatMap((word,i)=>{const span=create('span','question-word',word);return i?[document.createTextNode(' '),span]:[span]}))
     const words=[...h.querySelectorAll<HTMLElement>('.question-word')],lines=[...new Set(words.map(w=>Math.round(w.getBoundingClientRect().top)))]
     if(lines.length===2)for(const word of words)if(Math.round(word.getBoundingClientRect().top)===lines[1])word.style.color='var(--pd-red)'
    }
   }
   const span=brand?.querySelector('span');if(span)span.textContent=`${course.code} · ${lecture.semester} семестр`
  }
  // Hide old template service announcements without touching lecture content.
  for(const node of document.querySelectorAll('span.sr-only'))if(node.textContent?.includes('шаблон'))(node as HTMLElement).hidden=true
  observer.observe(document.getElementById('root')!,{childList:true,subtree:true})
 }
 const schedule=()=>{if(!scheduled){scheduled=true;requestAnimationFrame(decorate)}}
 const sizes=new ResizeObserver(schedule)
 const observer=new MutationObserver(schedule)
 observer.observe(document.getElementById('root')!,{childList:true,subtree:true})
 window.addEventListener('resize',schedule)
 document.fonts.ready.then(schedule)
 document.fonts.addEventListener('loadingdone',schedule)
 schedule()
}
