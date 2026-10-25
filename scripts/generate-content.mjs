import fs from 'node:fs';
import crypto from 'node:crypto';
import cases from '../authoring/worked-cases.mjs';
import caseVisuals, {describeVisual} from '../authoring/case-visuals.mjs';
import {experimentVisual} from '../authoring/experiment-visuals.mjs';
import guidance from '../authoring/teaching-guidance.mjs';
import {buildPracticeCases} from '../authoring/practice-cases.mjs';
import {refineNote} from '../authoring/presenter-speech.mjs';
import {studentSlide,buildQuestionExperiments} from '../authoring/student-content.mjs';
import {buildLaboratories} from '../authoring/laboratory-config.mjs';
import {addTeachingIntroduction,addConceptExplanation,addQuestionExplanation,addBoundaryExample,addAdditionalCase} from '../authoring/expanded-blocks.mjs';
const experiments=JSON.parse(fs.readFileSync('authoring/experiments.json','utf8'));
const original=JSON.parse(fs.readFileSync('authoring/original-course.json','utf8'));
const version='pisid3-2026.10.25-student';
const practiceCases=buildPracticeCases(original.topics);
const laboratories=buildLaboratories(experiments,guidance);
const c={schemaVersion:1,contentVersion:version,id:'pisid3',code:'МДК.05.01',discipline:original.title,year:'2026–2027',heroTitle:'Проектирование и дизайн',heroAccent:'информационных систем',slogan:'3 курс · Проектируем WMS: решения, данные, взаимодействие.',mascot:'brand/rhino-pisid-design.png',mascotAlt:'Носорог и проектирование складской системы',logo:'brand/brand-mark.png',ornament:'brand/side-ornament.webp',font:'fonts/raleway-cyrillic.woff2',topicArrow:'brand/topic-arrow.webp',materialsUrl:original.materialsUrl,demo:false,semesters:[5,6],assessment:{mode:'autonomous',url:'assessment.json'},literature:{primary:[],additional:[]},glossary:[],curriculum:[],lectures:[]};
let group='';for(const line of fs.readFileSync('SOURCES.md','utf8').split('\n')){if(line.startsWith('## Основная'))group='primary';else if(line.startsWith('## Дополнительная'))group='additional';else if(line.startsWith('## '))group='';if(group&&line.startsWith('- ')){const url=line.match(/\]\((https[^)]+)\)/)?.[1];c.literature[group].push({citation:line.slice(2).replaceAll('*','').replace(/\[([^\]]+)\]\([^)]+\)/g,'$1').replace('ISBN 978-5-93026-166-10','ISBN требует уточнения').trim(),...(url?{url}:{})});}}
const bank={schemaVersion:1,courseId:c.id,contentVersion:version,mode:'autonomous-educational',notice:'Ключи учебной автономной самопроверки доступны технически.',keys:{}};
const teacher={schemaVersion:1,courseId:c.id,contentVersion:version,notes:{}};
const source={courseId:c.id,contentVersion:version,slides:{}};
const prior=JSON.parse(fs.readFileSync('authoring/teacher-overrides.json','utf8'));
if(!prior.slides || typeof prior.slides!=='object' || Array.isArray(prior.slides))throw Error('Неверный формат authoring/teacher-overrides.json');
const withTeacher=true,questions=[],registry=[];
// Remove doubled sentence stops introduced when authored text already ends in a period.
const cleanText=value=>JSON.parse(JSON.stringify(value,(_key,item)=>typeof item==='string'?item.replace(/(?<!\.)\.\.(?!\.)(?=\s|$)/g,'.'):item));
const digest=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
const explanationOf=x=>x.definition.replace(/^[^—]+—\s*(это\s+)?/,'').replace(/\.$/,'');
const examUrl='https://disk.yandex.ru/d/Pn1NcJ-UexwpjQ';
const examContext=n=>n<=3?'КИМ 09.02.07-5-2027, задание 1: анализ документов производственного предприятия и ER-диаграмма в PDF. WMS здесь — отдельный учебный кейс: переносится способ анализа документов и построения модели.':n>=10&&n<=15?'КИМ 2027, задание 1 требует 3НФ, ссылочную целостность, осмысленное именование, первичные и внешние ключи; типы данных на этапе ER-диаграммы необязательны. Эта лекция разбирает отдельную часть подготовки модели.':n>=25?'В ТЗ задания 4 КИМ 2027 заданы роли администратора и пользователя, CAPTCHA-пазл и блокировка после трёх подряд неудач пароля или пазла. Условия экзамена реализуют по ТЗ; альтернативы WMS в этой лекции не отменяют их.':null;
for(const [li,t] of original.topics.entries()){
 const l={id:t.id,title:t.title,sourceTitle:t.section,semester:t.semester,question:t.shortTitle,slides:[]};
 const add=(suffix,slide,comment={})=>{
   const s=cleanText(studentSlide({id:t.id+'-'+suffix,kicker:'ПиДИС · 3 курс',...slide},t,li,cases[li]));l.slides.push(s);
  if(withTeacher){
   let note=comment.note||{script:comment.script,preparation:comment.preparation||'Учебный пример WMS; значения условные. '+t.caseContext,notebook:s.notebook||'Отдельная запись не требуется.',questions:comment.questions||'',answer:comment.answer||'',estimatedSeconds:comment.seconds||75};
   if(!note.script)throw Error('Не написана заметка '+s.id);
   if(prior?.slides[s.id]){if(prior.slides[s.id].contentHash!==digest(s))throw Error('Согласуйте заметку изменённого слайда: '+s.id);note=prior.slides[s.id].note;}
   note=refineNote({slide:s,topic:t,index:li,cases:cases[li],guidance:guidance[li],note,practiceCases,laboratory:laboratories[li]});
   note=cleanText(note);teacher.notes[s.id]=note;source.slides[s.id]={contentHash:digest(s),note};
  }
  return s.id;
 };
 add('start',{kind:'title',title:t.shortTitle,kicker:`Лекция ${t.number} · 3 курс`,body:t.description},{script:`Сегодня разбираем тему «${t.title}». Наша цель — ${t.objective}. ${t.caseContext} В конце получим ${t.deliverable}. Пройдём четыре вопроса от смысла понятий к проверяемому решению. В каждом вопросе сопоставим корректное действие с ошибкой, разберём конкретные данные и выполним четыре задания. Важен не выбор знакомого слова, а объяснение результата и границы применимости.`,seconds:40});
 add('route',{kind:'agenda',title:'Вопросы темы',kicker:'Маршрут занятия'},{script:`Маршрут темы «${t.shortTitle}» состоит из четырёх связанных вопросов: ${[0,1,2,3].map(q=>t.concepts[q*2].name+' и '+t.concepts[q*2+1].name).join('; ')}. Для каждого вопроса сначала уточним значения, затем сравним ошибку и действие, выполним законченный пример и самопроверку. ${t.objective} — ориентир всего маршрута. Оглавление строится из реальных разделителей: оно должно оставаться согласованным при изменении структуры.`,seconds:45});
 add('why',{kind:'theory',title:'Результат нашей работы',body:t.objective,bullets:[t.deliverable,'Обоснование решения по данным и ограничениям','Проверка результата и отрицательного случая']},{script:`Здесь результат темы «${t.shortTitle}» раскрывается как ${t.deliverable}. Для качества важны источник, смысл решения и способ проверки. ${cases[li][0][0]} Именно на таких данных нужно объяснить выбор. Документ без решения не выполняет цель, а решение без проверки остаётся утверждением автора. Вопросы на слайдах помогут перейти от описания к наблюдаемому результату; отдельно сохраним то, что зависит от ответа владельца процесса.`});
 add('case',{kind:'example',title:t.caseName,body:t.caseContext,kicker:'Сквозной кейс WMS'},{script:`Контекст темы «${t.shortTitle}»: ${t.caseContext} WMS — система управления складом; ТСД — терминал сбора данных; ERP — система планирования ресурсов предприятия. Идентификаторы, сроки и числа в примерах условны. ${cases[li][0][0]} ${cases[li][0][3]} Не переносим отдельное правило склада на любую организацию: сначала проверяем исходные условия и полномочия владельца решения.`});
 addTeachingIntroduction(add,t,li);
 const exam=examContext(t.number);if(exam)add('exam-context',{kind:'theory',title:'Связь с ДЭ 2027',body:exam,source:'КИМ 09.02.07-5-2027, с. 28–32; приложение 1'},{script:`Свяжем тему «${t.shortTitle}» с предоставленным комплектом. ${exam} На экзамене необходимо читать конкретное выданное задание и приложения. Предметная область образца — производство, а лекции используют WMS. Переносится способ анализа и проверки, а не готовые сущности, числа или макеты. Вариативная часть и вид аттестации группы не указаны.`});
 for(let qi=0;qi<4;qi++){
  const pair=t.concepts.slice(qi*2,qi*2+2),[a,b]=pair,w=cases[li][qi],prefix=`Q0${qi+1}`,start=l.slides.length,title=a.name+' и '+b.name;
  const qa=`Как обнаружить ошибку при применении понятия «${a.name}»?\nКак проверить результат для понятия «${b.name}»?`;
  const context=(script,extra={})=>({script,questions:qa,answer:`${a.name}: ${a.check}.\n${b.name}: ${b.check}.`,...extra});
  add(prefix,{kind:'section',title,kicker:`Вопрос ${qi+1}`,body:w[0]},{script:`Переходим к вопросу «${title}». Эти понятия раскрываются в одном рабочем контексте: ${w[0]}`,seconds:30});
  for(const [j,x] of pair.entries()){
   const n=qi*2+j+1,base=`c${n}`;
   const definition=add(base+'-definition',{kind:'theory',title:x.name,kicker:'Понятие',body:x.principle,notebook:x.definition},context(`${x.definition} ${x.principle}`));
   addConceptExplanation(add,base,x,pair,w,t,li,qi);
   add(base+'-decision',{kind:'comparison',title:x.name+': выбор действия',kicker:'Разбор выбора',body:`Проверьте, какое действие обеспечивает результат: ${x.check}`,visual:{type:'comparison',columns:['Ошибка','Действие'],rows:[[x.pitfall,x.decision]],caption:'Критерий: '+x.check}},context(`Предложите выбор действия для ситуации «${x.example}» до раскрытия последствий. Сравните варианты для понятия «${x.name}». Ошибка: ${x.pitfall}. Попросите объяснить, почему она мешает выполнить критерий: ${x.check}. Затем обсудите исправление: ${x.decision}`));
   c.glossary.push({term:x.name,definition:x.definition,slideIds:[definition]});
  }
  addQuestionExplanation(add,prefix,pair,w,t,li,qi);
  add(prefix+'-worked',{kind:'example',title:'Полный разбор решения',kicker:'Учебные данные',visual:caseVisuals[li][qi]},context(`Разберём вопрос «${title}» целиком. Схема показывает следующие связи и значения. ${describeVisual(caseVisuals[li][qi])} Вывод по схеме: ${caseVisuals[li][qi].caption} ${w[0]} ${w[1]} Получаем: ${w[2]} Проверяем границу: ${w[3]} В этом рассуждении ${a.name.toLowerCase()} и ${b.name.toLowerCase()} выполняют разные функции. ${a.check}. ${b.check}. После самостоятельной попытки сравните не только итог, но и основание каждого шага. Не добавляйте не подтверждённое исходными данными правило.`,{seconds:130,answer:w[2]+' '+w[3]}));
  addBoundaryExample(add,prefix,pair,w,li,qi);
  const practice=practiceCases.find(c=>c.id===t.id+'-'+prefix);
  add(prefix+'-practice',{kind:'example',title:practice.title,kicker:'Самостоятельный случай',body:'Постройте артефакт по новым данным и объясните границу решения.'},{script:practice.input,answer:practice.explanation,seconds:180});
  const evidence=l.slides.slice(start).filter(s=>s.kind!=='section').map(s=>s.id),taskIds=[];
  const make=(tn,type,prompt,options,extra,key)=>{const id=`L${String(li+1).padStart(3,'0')}-${prefix}-T0${tn}`,task={id,type,prompt,...(options?{options}:{}),...extra};bank.keys[id]=key;taskIds.push(id);add(prefix+'-T0'+tn,{kind:'test',title:['Один ответ','Несколько ответов','Краткий ответ','Соответствие'][tn-1],kicker:`Самопроверка · ${tn}/4`,task},context(`Проверяем вопрос «${title}». ${prompt} Дайте время сформулировать ответ до раскрытия. ${key.explanation} Основание ответа уже было показано в определении и разборе: ${w[2]} Если возникла ошибка, вернитесь к различию понятий и критерию, а не запоминайте позицию варианта. ${w[3]}`,{answer:key.type==='matching'?task.items.map(item=>item.text+' → '+task.options.find(o=>o.id===key.pairs[item.id]).text).join('\n'):key.type==='short'?key.accepted.join('; '):key.correct.map(id=>task.options.find(o=>o.id===id).text).join('\n'),seconds:[65,85,60,100][tn-1]}));};
  const rotate=(arr,n)=>[...arr.slice(n),...arr.slice(0,n)];
  make(1,'single',`Какое действие соответствует понятию «${a.name}» в рассмотренном контексте? Выберите один ответ.`,rotate([a.decision,a.pitfall,...a.distractors].map((text,i)=>({id:'s'+i,text})),(li+qi)%4),{}, {type:'single',correct:['s0'],explanation:`${a.decision} Критерий: ${a.check}. Остальные варианты воспроизводят ошибку или нарушают назначение понятия.`,optionExplanations:{s0:a.check,s1:'Ошибка: '+a.pitfall,s2:'Не обеспечивает: '+a.check,s3:'Не обеспечивает: '+a.check}});
  const correctCount=2+(li+qi)%3;
  const positives=[a.decision,b.decision,a.check,b.check].slice(0,correctCount);
  const allChoices=[...positives,a.pitfall,b.pitfall,a.distractors[0],b.distractors[0]].map((text,i)=>({id:'m'+i,text}));
  make(2,'multiple',`Выберите ${correctCount} корректных действий или проверок для текущей ситуации.`,rotate(allChoices,(li+qi)%allChoices.length),{choose:correctCount},{type:'multiple',correct:positives.map((_,i)=>'m'+i),explanation:`Обоснованы: ${positives.join(' ')} Для каждого вывода назовите исходное условие и наблюдаемый признак результата.`,optionExplanations:Object.fromEntries(allChoices.map((o,i)=>[o.id,i<correctCount?'Соответствует: '+o.text:'Ошибка не обеспечивает критерии '+a.name+' и '+b.name]))});
  make(3,'short',`Назовите понятие: «${explanationOf(b)}». Используйте точное название со слайдов; регистр не важен.`,null,{}, {type:'short',accepted:[b.name],explanation:`Ответ: ${b.name}. ${b.definition} Это название понятия, а не пример его применения.`});
  const matchingRows=[[a.name,a.principle],[b.name,b.principle],['Ошибка: '+a.name,a.pitfall],['Ошибка: '+b.name,b.pitfall],['Действие: '+a.name,a.decision],['Действие: '+b.name,b.decision],...((li+qi)%2?[['Проверка: '+a.name,a.check],['Проверка: '+b.name,b.check]]:[])];
  make(4,'matching','Сопоставьте понятия, действия, ошибки и проверки. Каждая характеристика используется один раз.',rotate(matchingRows.map((row,i)=>({id:'r'+i,text:row[1]})),2+(li%3)),{items:matchingRows.map((row,i)=>({id:'i'+i,text:row[0]}))},{type:'matching',pairs:Object.fromEntries(matchingRows.map((_,i)=>['i'+i,'r'+i])),explanation:matchingRows.map(row=>row[0]+' → '+row[1]).join('\n')});
  questions.push({lectureId:l.id,questionId:`L${li+1}-${prefix}`,title,sourceConcepts:pair.map(x=>x.name),slideIds:l.slides.slice(start).map(s=>s.id),taskIds,evidence,outcome:w[2],source:'authoring/original-course.json; authoring/worked-cases.mjs',officialHours:null});
  c.curriculum.push({topic:title,outcome:w[2],source:'Авторская группировка исходных тем; РПД не предоставлена.',slideIds:evidence,taskIds});
 }
 addAdditionalCase(add,t,li);
 const lab=laboratories[li],laboratory=lab;
 add('experiment-start',{kind:'section',title:'Лаборатория: '+lab.title,kicker:'Эксперимент',body:laboratory.setup},{script:`Представьте полноценный сценарий лаборатории. ${laboratory.setup}

Цель: ${laboratory.expected}

Порядок работы: ${laboratory.procedure.join(' ')}

Откройте следующий слайд кнопкой «Следующий слайд» или кнопкой «Эксперимент». В лаборатории доступны несколько условий и режимов: исходный, изменённый и граничный. Попросите прогноз до изменения, затем зафиксируйте результаты двух запусков и сопоставьте их.`,answer:laboratory.expected,seconds:120});
 add('experiment',{kind:'example',title:lab.title,kicker:'Лаборатория',visual:experimentVisual(lab)},{preparation:laboratory.setup,questions:laboratory.procedure.join('\n'),script:laboratory.teacherGuide+'\n\n'+`Эксперимент темы «${t.shortTitle}»: ${lab.prompt} Попросите предсказать результат, затем измените параметр или выберите действие и сопоставьте вывод с прогнозом. ${lab.lesson} ${describeVisual(experimentVisual(lab))} Условия и числа учебные. На проекторе параметры обновляются из панели преподавателя; в печати остаётся схема исходного случая.`,answer:lab.lesson,seconds:180});
 add('experiment-review',{kind:'summary',title:'Лаборатория: выводы и границы',body:laboratory.expected,bullets:[laboratory.boundary,'Сравните два запуска и объясните, какое условие изменило результат.']},{script:`Разбор лаборатории темы «${t.shortTitle}». ${laboratory.setup} ${laboratory.procedure.join(' ')}

Обоснованный итог: ${laboratory.expected}

Отрицательный случай: ${laboratory.boundary}

Попросите прочитать два зафиксированных результата. Если изменённое условие не названо, попросите вернуться к параметрам. Если назван только итог, уточните, какое правило его обеспечивает. Для переноса в другой проект проверяются источник условия и полномочие владельца решения.`,answer:laboratory.expected+' '+laboratory.boundary,seconds:180});
 add('summary',{kind:'summary',title:'Связи и выводы темы',bullets:cases[li].map(w=>w[2])},{script:`Подведём итог темы «${t.shortTitle}». ${cases[li].map(w=>w[2]).join(' ')} Эти результаты помогают получить ${t.deliverable}. Различайте исходные факты и принятые решения; условия примеров не являются универсальными правилами. Для собственного проекта проверьте источники и владельцев спорных условий. Вопросы по границам результата: ${cases[li].map(w=>w[3]).join(' ')}`});
 add('sources',{kind:'literature',title:'Предметные источники',references:t.sources.map(s=>({citation:s.label,url:s.url})).slice(0,3).concat(exam?[{citation:'КИМ 09.02.07-5-2027 · комплект преподавателя',url:examUrl}]:[])},{script:`Для углубления темы «${t.shortTitle}» используйте предметные источники. ${t.description} Наличие ссылки не доказывает актуальность нормативного документа: статус и область применения сверяют отдельно. Примеры и числа WMS авторские; они демонстрируют ход решения. Комплект ДЭ 2027 предоставлен преподавателем и используется только для отмеченных связей с экзаменом. РПД и официальные часы не восстановлены по предположению. Ограничения проверки источников перечислены в документации проекта.`,seconds:35});
 add('final',{kind:'summary',title:'Перенос в свой проект',bullets:['Подготовьте: '+t.deliverable,'Укажите исходные факты и допущения.','Покажите успешный и отрицательный случай.','Откройте итоговый файл и проверьте согласованность.']},{script:`Самостоятельный результат темы «${t.shortTitle}» — ${t.deliverable}. Переносим способ анализа и проверки на ваши данные. ${cases[li][3][0]} ${cases[li][3][1]} ${cases[li][3][2]} ${cases[li][3][3]} В собственном проекте сначала замените учебные предположения подтверждёнными условиями, затем проверьте критерии каждого решения. Файл должен позволять другому участнику понять основание результата без устного пересказа всей лекции.`});
 add('questions',{kind:'questions',title:'Вопросы от аудитории',bullets:[`Как проверить результат «${t.deliverable}»?`,`Как исходные данные меняют выбор: ${t.concepts[0].name.toLowerCase()}?`,`Как обнаружить ошибку: ${t.concepts[6].name.toLowerCase()}?`]},{script:`Завершим тему «${t.shortTitle}» обсуждением. ${cases[li].map(w=>w[3]).join(' ')} Вернитесь к любому примеру и назовите факт, действие и проверяемый результат. Если вопрос выходит за подтверждённые условия, фиксируем его вместе с предполагаемым источником ответа. Ключевой итог занятия: ${t.objective}. Сохраняем конспект и список уточнений для следующей темы.`});
 c.lectures.push(l);registry.push({lectureId:l.id,title:l.title,semester:l.semester,hours:null,slides:l.slides.length,questions:4,tasks:16,visuals:l.slides.filter(s=>s.visual||s.steps||s.rows).length,contentVersion:version,estimatedMinutes:withTeacher?Math.round(l.slides.reduce((n,s)=>n+teacher.notes[s.id].estimatedSeconds,0)/60):null});
}
const glossary=new Map();for(const g of c.glossary){const key=g.term+'|'+g.definition;if(glossary.has(key))glossary.get(key).slideIds.push(...g.slideIds);else glossary.set(key,g);}c.glossary=[...glossary.values()];
for(const id of Object.keys(prior.slides))if(!source.slides[id])throw Error('Заметка ссылается на отсутствующий слайд: '+id);
for(const d of ['public','reports','private','private/lectures'])fs.mkdirSync(d,{recursive:true});
const write=(p,v)=>fs.writeFileSync(p,JSON.stringify(cleanText(v),null,2)+'\n');
write('public/laboratories.json',laboratories);
write('public/practice-cases.json',practiceCases);
write('public/question-experiments.json',buildQuestionExperiments(original.topics,cases,caseVisuals));
write('reports/visual-plan.json',practiceCases.map(c=>({lectureId:c.lectureId,question:c.question,slideId:c.returnSlide,goal:c.title,notation:c.notation,shows:c.fields.map(f=>f.label)})));
write('public/course.json',c);write('public/assessment.json',bank);write('authoring/questions.json',questions);write('reports/registry.json',registry);
const previousNotes=JSON.parse(fs.readFileSync('authoring/previous-note-hashes.json','utf8'));
teacher.previousNoteRevisions=[{contentVersion:previousNotes.contentVersion,hashes:previousNotes.hashes},previousNotes.recent];
teacher.previousContentVersion=previousNotes.contentVersion;teacher.previousNoteHashes=previousNotes.hashes;
write('public/teacher-pack.json',teacher);
if(process.argv.includes('--teacher')){write('private/teacher-pack.json',teacher);write('private/teacher-source.json',source);for(const l of c.lectures){const notes=Object.fromEntries(l.slides.map(s=>[s.id,teacher.notes[s.id]]));write('private/lectures/'+l.id+'.json',{...teacher,notes});fs.writeFileSync('private/lectures/'+l.id+'.md','# '+l.title+'\n\n'+l.slides.map(s=>{const n=notes[s.id];return `## ${s.id} · ${s.title}\n\n${n.script}\n\nПодготовка: ${n.preparation}\n\nКонспект: ${n.notebook}\n\n${n.questions}\n\n${n.answer}\n\nОценка: ${n.estimatedSeconds} с.\n`;}).join('\n'));}write('private/preparation-cards.json',c.lectures.map((l,i)=>({lectureId:l.id,logic:questions.filter(q=>q.lectureId===l.id).map(q=>q.title),prerequisites:i?'Предшествующие темы курса; факт, решение, проверка.':'Понятие ИС и описание рабочей задачи.',uncertainties:['РПД и официальные часы не предоставлены.','Учебные данные WMS условны.'],estimatedMinutes:registry[i].estimatedMinutes})));}
console.log(JSON.stringify({lectures:c.lectures.length,slides:c.lectures.reduce((n,l)=>n+l.slides.length,0),tasks:Object.keys(bank.keys).length,notes:Object.keys(teacher.notes).length}));
