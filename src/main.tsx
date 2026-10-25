import {SlideNavigation} from './navigation';
import aliases from '../authoring/slide-aliases.json';
import './lecture.css';
import {loadStartupNotes} from './startup-notes';
import {installPresentation} from './presentation';
import {PublicViewport} from './public-viewport';
import {CaseTools} from './case-workshop';
import './presentation-design.css';
import './infographic-theme.css';
import {createRoot} from 'react-dom/client';
import {LectureSite,validateCourse} from '@olgakraven/lecture-engine';
import '@olgakraven/lecture-engine/style.css';
const root=createRoot(document.getElementById('root')!);
async function load(){
  root.render(<p role="status">Загружаем курс…</p>);
  try {
    const r=await fetch(import.meta.env.BASE_URL+'course.json',{signal:AbortSignal.timeout(15000),cache:'no-store'});
    if(!r.ok)throw Error('Не удалось загрузить курс: '+r.status);
    const c=await r.json();validateCourse(c);document.documentElement.dataset.courseVersion=c.contentVersion;
    const url=new URL(location.href),previous=url.searchParams.get('slide');
    if(previous){
      const replacement=(aliases as Record<string,string>)[previous]||previous.replace(/-c(\d+)-(mechanism|mistake)$/,'-c$1-decision');
      if(replacement!==previous&&c.lectures.some(l=>l.slides.some(s=>s.id===replacement))){url.searchParams.set('slide',replacement);history.replaceState(history.state,'',url);}
    }
    await loadStartupNotes(c,import.meta.env.BASE_URL);
    installPresentation(c,import.meta.env.BASE_URL);
    root.render(<CaseTools version={c.contentVersion}><LectureSite course={c} base={import.meta.env.BASE_URL}/><SlideNavigation/><PublicViewport version={c.contentVersion}/></CaseTools>);
  }catch(e){root.render(<main><h1>Курс не загрузился</h1><p role="alert">{String(e)}</p><button onClick={()=>void load()}>Загрузить курс снова</button></main>);}
}
void load();
