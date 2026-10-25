import {fileURLToPath} from 'node:url';
import type {Plugin} from 'vite';

// Checked extension of the pinned runtime; the vendor archive stays intact.
export function presentationPlugin():Plugin {
 const catalog=fileURLToPath(new URL('../src/CourseCatalog.tsx',import.meta.url));
 const cases=fileURLToPath(new URL('../src/case-workshop.tsx',import.meta.url));
 const overview=fileURLToPath(new URL('../src/assessment-overview.tsx',import.meta.url));
 return {name:'pisid-presentation',enforce:'pre',transform(source,id){
  const file=id.split('?')[0].replaceAll('\\','/');
  if(!file.includes('/@olgakraven/lecture-engine/lib/'))return;
  let code=source;
  const replace=(before:string,after:string)=>{if(code.split(before).length!==2)throw Error('Review presentation extension: '+before.slice(0,80));code=code.replace(before,after);};
  if(file.endsWith('/lecture-engine.js')){
   const start=code.indexOf(' : /* @__PURE__ */ T("main", {\n\t\t\t\tclassName: "catalog",');
   const end=code.indexOf('\n\t\t\tU &&',start);
   if(start<0||end<0)throw Error('Catalog signature changed');
   code=code.slice(0,start)+' : w(CourseCatalog,{course:e,base:t,profile:j,materials:M,theme:A,storagePrefix:h,invalidLecture:g.has("lecture"),onOpenLecture:ke,onPrint:Z,onProfileChange:p=>{xe(p);i(`${h}:profile`,p)},onMaterialsChange:u=>{Se(u);i(`${h}:materials`,u)},onThemeChange:be}),'+code.slice(end);
   code=`import {CourseCatalog} from ${JSON.stringify(catalog)};\n`+code;
   const tools=code.indexOf('children: [',code.indexOf('className: "toolbar-actions"'));
   const toolsEnd=code.indexOf('\n\t\t\t\t\t\t\t\t]',tools);
   if(tools<0||toolsEnd<0)throw Error('Toolbar signature changed');
   code=code.slice(0,tools)+`children: [
    Q("Открыть содержание",w(ue,{size:19}),()=>{I("");P("toc")}),
    Q("Указка",w(ie,{size:19}),()=>{Ee(!B);H(null)},B),
    Q("Полноэкранный режим",w("svg",{width:19,height:19,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,children:w("path",{d:"M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"})}),Ae),
    T("details",{className:"pd-more",children:[w("summary",{className:"icon-button","aria-label":"Ещё",children:"•••"}),T("div",{className:"pd-menu",children:[$,w("button",{className:"button secondary",onClick:()=>P("settings"),children:"Данные преподавателя"}),w("button",{className:"button secondary",onClick:()=>P("results"),children:"Самопроверка"}),w("button",{className:"button secondary",onClick:()=>P("download"),children:"Скачать PDF"}),w("button",{className:"button secondary",onClick:()=>X(K.slides.findIndex(s=>s.id.endsWith("-experiment-start"))),children:"Эксперимент"})]})]}),
    w("button",{className:"button primary",onClick:je,children:"Режим показа"})
   ]`+code.slice(toolsEnd+'\n\t\t\t\t\t\t\t\t]'.length);
   replace('className: "deck-toolbar"','className: "deck-toolbar pd-toolbar"');
   replace('document.documentElement.dataset.theme = A, i(`${h}:theme`, A);','document.documentElement.dataset.theme = A, i(`${h}:theme`, A);');
  }
  if(file.endsWith('/Teaching-DFPbXmGy.js')){
   // Theme changes in a live presentation also reach the audience via storage.
   replace('function A({ course: e, lecture: s, base: f, profile: C, session: E, initialSlide: D, onExit: ae }) {',`function A({ course: e, lecture: s, base: f, profile: C, session: E, initialSlide: D, onExit: ae }) {
    const [outline,setOutline]=S(false);
    b(()=>{const sync=()=>{try{document.documentElement.dataset.theme=JSON.parse(localStorage.getItem(\`lecture:\${f}:\${e.id}:theme\`)||'"light"')}catch{}};window.addEventListener("storage",sync);return()=>window.removeEventListener("storage",sync)},[f,e.id]);`);
   replace('"Завершить"]','"Завершить показ"]');
   replace('children: "Подробный сценарий · " + e.contentVersion','children: "Сценарий преподавателя"');
   replace('className: "presenter-shell"','className: `presenter-shell ${outline?"outline-open":""}`');
   const start=code.indexOf('children: [',code.indexOf('className: "presenter-header"'));
   const end=code.indexOf('\n\t\t\t\t]',start);
   if(start<0||end<0)throw Error('Presenter header changed');
   code=code.slice(0,start)+`children: [
    w("a",{className:"button secondary",href:f,children:"← Каталог"}),
    T("div",{className:"presenter-heading",children:[w("small",{children:e.code+" · "+s.semester+" семестр"}),w("strong",{children:s.title})]}),
    w("button",{className:"icon-button","aria-label":"Содержание",onClick:()=>setOutline(!outline),children:"☰"}),
    w("button",{className:"icon-button","aria-label":"Указка","aria-pressed":R,onClick:()=>{_e(!R);B(null)},children:w(h,{size:19})}),
    w("button",{className:"icon-button","aria-label":"Во весь экран",onClick:()=>document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen(),children:"⛶"}),
    T("details",{className:"pd-more",children:[w("summary",{className:"icon-button","aria-label":"Ещё",children:"•••"}),T("div",{className:"pd-menu",children:[w("button",{className:"button secondary",onClick:()=>{const theme=document.documentElement.dataset.theme==="dark"?"light":"dark";document.documentElement.dataset.theme=theme;localStorage.setItem(\`lecture:\${f}:\${e.id}:theme\`,JSON.stringify(theme))},children:"Сменить тему"}),w("button",{className:"button secondary",onClick:ze,children:"Открыть аудиторию"}),w("span",{className:"connection",role:"status",children:xe})]})]}),
    w("button",{className:"button primary",onClick:He,children:"Завершить показ"})
   ]`+code.slice(end+'\n\t\t\t\t]'.length);
   const font=code.indexOf('/* @__PURE__ */ T("label", {\n\t\t\t\t\t\t\t\tclassName: "note-font"');
   const after=code.indexOf('Ee ? /* @__PURE__ */ w("textarea",',font);
   if(font<0||after<0)throw Error('Note font block changed');
   code=code.slice(0,font)+code.slice(after);
   replace('onClick: () => fe(e.id),','onClick: () => {Z(e.id);setOutline(false)},');

  }
  if(file.endsWith('/SlideView-CKuVrZ7x.js')){
   const start=code.indexOf('function at({ lecture: e, onGo: t }) {'),end=code.indexOf('function st({ task: e, onChange: t }) {',start);
   if(start<0||end<0)throw Error('Assessment overview signature changed');
   code=code.slice(0,start)+'function at({lecture:e,onGo:t}){let n=V(),i=r(Q);return n?null:d(CourseAssessmentOverview,{lecture:e,attempts:i.attempts,onGo:t,onReset:i.reset});}\n'+code.slice(end);
   replace('n.visual && /* @__PURE__ */ d(CourseSuspense,', 'n.id.endsWith("-practice") && /* @__PURE__ */ d(CourseCasePassport,{slide:n,interactive:o}), n.visual && /* @__PURE__ */ d(CourseSuspense,');
   code=`import {CasePassport as CourseCasePassport} from ${JSON.stringify(cases)};\n`+code;
   code=`import {AssessmentOverview as CourseAssessmentOverview} from ${JSON.stringify(overview)};\n`+code;
  }
  if(file.endsWith('/lecture-engine.js')||file.endsWith('/Teaching-DFPbXmGy.js')){
   const label='children: [/* @__PURE__ */ w("b", { children: String(t + 1).padStart(2, "0") }), e.title]';
   replace(label,label.replace('e.title]','courseOutlineLabel(e)]'));
   code='const courseOutlineLabel=s=>s.kind==="section"&&/^Вопрос [0-9]+/.test(s.kicker)?s.kicker+" · "+s.title:s.title;\n'+code;
  }
  return code===source?undefined:{code,map:null};
 }};
}
