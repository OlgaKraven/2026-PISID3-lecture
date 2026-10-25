import {describeVisual} from './case-visuals.mjs';

export function refineNote({slide:s,topic:t,cases, guidance:g,note,practiceCases,laboratory}){
 const suffix=s.id.slice(t.id.length+1),ci=Number(suffix.match(/^c(\d+)-/)?.[1]||0)-1;
 const qi=suffix.startsWith('Q')?Number(suffix[2])-1:ci>=0?Math.floor(ci/2):-1;
 const w=cases[qi],x=t.concepts[ci];
 let speech;
 if(x){
  if(suffix.endsWith('-definition'))speech=`${x.definition}\n\n${x.principle} ${g.mechanisms[qi]}`;
  else if(suffix.endsWith('-explanation'))speech=`${x.example}\n\nЗдесь существенна связь: ${x.principle} Сравним с соседним понятием: ${t.concepts[ci%2?ci-1:ci+1].principle}\n\n${x.check}`;
  else if(suffix.endsWith('-walkthrough'))speech=`${x.example}\n\nОснование решения: ${x.principle}\n\n${x.decision} ${x.check}\n\nЕсли ${x.pitfall.charAt(0).toLowerCase()+x.pitfall.slice(1)}, нужная проверка не подтверждена. В полном примере это различие проявляется так: ${w[0]}`;
  else if(suffix.endsWith('-decision')){speech=`${x.example}\n\nКакое действие обеспечивает следующий результат: ${x.check}? Сначала сформулируйте собственное решение, затем сопоставьте его с вариантами на схеме.`;note.answer=`${x.decision}\n\nОшибка: ${x.pitfall}\n\n${x.principle}`;}
 }
 if(qi>=0&&!x){
  if(s.task){speech=`${s.task.prompt}\n\nСначала выполните задание самостоятельно. Для обоснования используйте различие понятий «${t.concepts[qi*2].name}» и «${t.concepts[qi*2+1].name}» и данные разобранного случая. После ответа сопоставим решение с критерием; правильный вариант пока не раскрываем.`;}
  else if(suffix.endsWith('-practice')){const c=practiceCases.find(c=>c.returnSlide===s.id);speech=`${c.input}\n\nОткроем «Интерактивную схему». Сначала запишите прогноз, затем заполните два результата артефакта: ${c.fields.map(f=>f.label.toLowerCase()).join('; ')}. Первый результат проверяется до второго. После попытки разбор можно раскрыть отдельной кнопкой; обоснование обсудим по указанным критериям.`;note.answer=c.fields.map((f,i)=>`Шаг ${i+1}: ${f.answer}. ${f.hint}`).join('\n')+'\n\n'+c.explanation+'\n\n'+c.boundary;}
  else if(s.kind==='section')speech=`${w[0]}\n\nВ этой ситуации нужно различить «${t.concepts[qi*2].name}» и «${t.concepts[qi*2+1].name}». Первое понятие задаёт один ракурс решения, второе помогает проверить его основание. Начнём с точного смысла каждого термина.`;
  else if(suffix.endsWith('-mechanism'))speech=`${g.mechanisms[qi]}\n\n${w[0]} ${w[1]}\n\nИз этих действий следует результат: ${w[2]} Он справедлив при условиях исходного случая, которые сейчас сохраняем.`;
  else if(suffix.endsWith('-input')){speech=`${w[0]}\n\nНазовите исходные факты и предложите действие. Пока не переносим сюда правило из другой ситуации; следующий экран позволит сравнить собственное рассуждение с полным разбором.`;note.answer=w.slice(1).join('\n\n');}
  else if(suffix.endsWith('-worked'))speech=`${w[0]}\n\n${describeVisual(s.visual)}\n\n${w[1]} Поэтому ${w[2]}\n\nСвязи схемы описывают именно эту задачу: ${s.visual.caption} Отдельно проверим изменение условия, чтобы не принять успешный пример за универсальное правило.`;
  else if(suffix.endsWith('-boundary'))speech=`Ранее получен результат: ${w[2]}\n\n${w[3]} Изменилось основание вывода, поэтому прежнее действие нельзя переносить автоматически. Для сравнения критерии двух понятий остаются различными: ${t.concepts[qi*2].check} ${t.concepts[qi*2+1].check}`;
 }
 if(!speech){
  const extra=g.extra;
  if(suffix==='start')speech=`${t.caseContext}\n\nТема «${t.title}» помогает решить конкретную задачу: ${t.objective} Результат работы — ${t.deliverable}.`;
  else if(suffix==='route')speech=`Вопросы связаны по ходу проектной работы: ${[0,1,2,3].map(i=>t.concepts[i*2].name+' и '+t.concepts[i*2+1].name).join('; ')}. Каждый вопрос завершается отдельным новым случаем и самопроверкой.`;
  else if(suffix==='why')speech=`${t.objective}\n\n${cases[0][0]} ${cases[0][1]}\n\nРезультат оформляется как ${t.deliverable}. Его содержание позволяет проверить решение независимо от рассказа автора.`;
  else if(suffix==='case')speech=`${t.caseContext}\n\nWMS управляет складской работой; ТСД используется рядом с товаром, ERP связывает учёт с предприятием. Данные наших случаев учебные; область вывода ограничивается явно названными условиями.`;
  else if(suffix==='prerequisites')speech=`${g.prerequisite}\n\nВ дальнейшем различаем исходное состояние, действие и наблюдаемый результат. Например: ${cases[0][0]}`;
  else if(suffix==='explanation')speech=`${g.overview}\n\n${g.mechanisms[0]}\n\n${g.mechanisms[3]}`;
  else if(suffix==='additional-case-input'){speech=`${extra.input}\n\nПредложите действие и ожидаемый результат до раскрытия следующего экрана. Назовите, какое ограничение существенно для вашего решения.`;note.answer=extra.steps.join('\n')+'\n\n'+extra.result;}
  else if(suffix==='additional-case-solution')speech=`${extra.steps.join('\n\n')}\n\n${extra.result}`;
  else if(suffix==='additional-case-boundary')speech=`${extra.boundary}\n\nПолученный результат «${extra.result}» относится к прежним условиям. Здесь нужно проверить, сохраняется ли основание каждого шага.`;
  else if(suffix==='summary')speech=cases.map(w=>w[2]).join('\n\n');
  else if(suffix==='sources')speech=`Источники помогают уточнить понятия и границы решений этой темы. ${t.description} Учебный складской пример не заменяет правила конкретной организации.`;
  else if(suffix==='final')speech=`В собственном проекте подготовьте ${t.deliverable}. Зафиксируйте подтверждённые исходные данные, выбранное решение и способ проверки. ${cases[3][3]}`;
  else if(suffix==='questions')speech=`Вернёмся к исходной цели: ${t.objective} Какие условия примеров можно подтвердить в вашем проекте, а какие пока остаются предположениями?`;
  else if(suffix==='exam-context')speech=`${s.body}\n\nВ этой теме результат подготовки — ${t.deliverable}. ${g.overview}`;
  else if(suffix==='experiment-start')speech=`${s.body}\n\nОткроем следующий экран. Сначала прогнозируем результат, затем меняем одно условие и сравниваем два запуска. Значения и их интерпретация должны относиться к одному набору данных.`;
  else if(suffix==='experiment')speech=`${laboratory.setup}\n\nСначала сравним прогноз с исходным состоянием. ${g.overview}\n\nИзменим одно условие и сохраним результат запуска. ${laboratory.expected}\n\nГраница объяснения: ${laboratory.boundary} Параметры и числа учебные; модель не исполняет операции реального склада.`;
  else if(suffix==='experiment-review')speech=`${s.body}\n\n${(s.bullets||[]).join('\n\n')}`;
  else speech=note.script;
 }
 return {...note,script:speech,notebook:s.notebook||''};
}
