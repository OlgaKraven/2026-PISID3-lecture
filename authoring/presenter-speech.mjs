import variants from './question-variants.mjs';
import {describeVisual} from './case-visuals.mjs';
import artifacts from './concept-artifacts.mjs';
import additional from './additional-artifacts.mjs';

const reading={
 matrix:'Каждая строка — отдельный случай или часть артефакта; заголовки задают смысл значений. Сравниваем данные в одной строке, затем различие строк.',
 network:'Узлы — объекты или артефакты, подписи стрелок — отношения между ними. Это не поток товара и не порядок исполнения программы.',
 decision:'В центре проверяем условие по данным случая. Ветка «да» и ветка «нет» — альтернативные исходы; одновременно они не выполняются.',
 process:'Порядок блоков показывает ход данного сценария. Стрелка не разрешает пропуск условия перехода, а расстояние не измеряет время.',
 tree:'Вложенность показывает группы и состав. Дочерние элементы не следует читать как последовательность событий.',
 bars:'Подпись задаёт объект, число и единица — измеренное значение. Сравниваем столбцы по одной шкале; по отдельным измерениям не восстанавливаем неизвестную зависимость.'
};
function modelText(v){
 const nodes=v.type==='network'?v.nodes.map(n=>`${n.title}: ${n.text}.`).join(' ')+' ':'';
 return nodes+describeVisual(v);
}

export function refineNote({slide:s,topic:t,index,cases, guidance:g,note,practiceCases,laboratory,assessment}){
 const suffix=s.id.slice(t.id.length+1),ci=Number(suffix.match(/^c(\d+)-/)?.[1]||0)-1;
 const qi=suffix.startsWith('Q')?Number(suffix[2])-1:ci>=0?Math.floor(ci/2):-1;
 const w=cases[qi],x=t.concepts[ci];
 let speech;
 if(x){
  if(suffix.endsWith('-definition'))speech=`${x.definition}\n\n${x.principle} ${g.mechanisms[qi]}`;
  else if(suffix.endsWith('-explanation'))speech=`${x.example}\n\nЗдесь существенна связь: ${x.principle} Сравним с соседним понятием: ${t.concepts[ci%2?ci-1:ci+1].principle}\n\n${x.check}`;
  else if(suffix.endsWith('-walkthrough')){
   const e=artifacts[index][ci];
   speech=`${e.input}\n\n${reading[e.visual.type]}\n\n${modelText(e.visual)}\n\n${e.why}\n\nИменно так в этом примере работает понятие «${x.name}»: ${x.principle} Проверяемый признак: ${x.check}. На следующем экране сравним действия по этому признаку; объяснять выбор нужно через условие, а не через место варианта на экране.`;
   note.preparation=e.input+' '+reading[e.visual.type];note.answer=e.why;
  }
  else if(suffix.endsWith('-decision')){speech=`${x.example}\n\nКакое действие обеспечивает следующий результат: ${x.check}? Сначала сформулируем собственное решение, затем сопоставим его с вариантами.\n\nВерное действие: ${x.decision} Ошибка: ${x.pitfall} Почему это различие существенно, уже видно в разобранном примере: ${artifacts[index][ci].why}\n\nОценивать ответ нужно по условию и наблюдаемому результату. Следующий экран ${ci%2===0?'вводит второе понятие этого вопроса: «'+t.concepts[ci+1].name+'».':'связывает оба понятия в общем механизме решения.'}`;note.answer=`${x.decision}\n\nОшибка: ${x.pitfall}\n\n${x.principle}`;}
 }
 if(qi>=0&&!x){
  if(s.task){
   const task=s.task,k=assessment;
   const answer=k.type==='matching'?task.items.map(i=>`${i.text} → ${task.options.find(o=>o.id===k.pairs[i.id]).text}`).join('\n'):k.type==='short'?k.accepted.join('; '):k.correct.map(id=>task.options.find(o=>o.id===id).text).join('\n');
   speech=`${task.prompt}\n\nСначала самостоятельная попытка без раскрытия ответа. Здесь проверяется различие «${t.concepts[qi*2].name}» и «${t.concepts[qi*2+1].name}». ${task.type==='matching'?'Сначала выберите строку слева, затем характеристику справа. Клавиатурой: Tab переводит фокус, Enter или пробел выбирает пару. Перестановка строк не меняет смысл соответствия.':task.type==='short'?'Нужно точное название понятия со слайдов; проверка регистра не различает.':task.type==='multiple'?'Выбираем указанное число ответов; каждый выбор обосновывается отдельно.':'Выбираем одно действие и объясняем, почему оно выполняет критерий.'}\n\nПосле попытки откроем «Разбор ответа». Эталон для преподавателя:\n${answer}\n\n${k.explanation}\n\n${k.optionExplanations?task.options.map(o=>`${o.text}: ${k.optionExplanations[o.id]}`).join('\n'):''}\n\nОкно разбора показывает аудитории открытый ответ; его прокрутка следует за преподавателем. Закроем разбор кнопкой или Escape. ${task.type==='matching'?'Четыре задания вопроса завершены. Перейдём к следующему вопросу либо дополнительному случаю и объясним, какие данные теперь новые.':'После обсуждения перейдём к следующему способу самопроверки этого вопроса.'}`;
   note.answer=answer+'\n\n'+k.explanation;
  }
  else if(suffix.endsWith('-practice')){
   const c=practiceCases.find(c=>c.returnSlide===s.id),v=variants[index][qi];
   speech=`Откроем «Начать эксперимент». Первым показано исходное условие: ${w[0]} Сначала запишем прогноз, затем кнопкой «Следующий шаг решения» раскроем действие и результат. ${w[1]} Отсюда получаем: ${w[2]} Сохраним запуск кнопкой «Зафиксировать результат запуска».\n\nВ списке «Условия примера» выберем «Изменённое условие». Изменилось только следующее: ${v.condition} Остальные условия исходного случая сохраняются. Новый ход: ${v.action} Результат: ${v.result} Запишем новый прогноз до раскрытия и сохраним второй запуск. Сравним, почему вывод изменился или сохранился. ${w[3]}\n\nКнопка «Схема исходного случая» открывает прежний разобранный пример; она не перестраивается в схему изменённого случая. При выборе изменённого условия это явно подписано.\n\nНиже расположен другой набор данных — «Проверьте решение на новых данных»: ${c.input} Здесь требуется ${c.fields.map(f=>f.label.toLowerCase()).join('; ')}. Проверим первый результат, затем второй. После попытки можно открыть «Показать разбор после попытки». Разбор: ${c.fields.map((f,i)=>`шаг ${i+1} — ${f.answer}; ${f.hint}`).join(' ')} ${c.explanation} ${c.boundary}\n\nКнопка «Вернуться к слайду» или Escape закрывает окно в обоих окнах показа. После эксперимента начинаются четыре задания самопроверки этого вопроса; условия независимого случая не подменяют формулировки заданий.`;
   note.preparation='Исходный эксперимент: '+w[0]+' Отдельный самостоятельный случай: '+c.input;
   note.answer=c.fields.map((f,i)=>`Шаг ${i+1}: ${f.answer}. ${f.hint}`).join('\n')+'\n\n'+c.explanation+'\n\n'+c.boundary;
  }
  else if(s.kind==='section')speech=`${qi>0?'В предыдущем вопросе получили следующий результат: '+cases[qi-1][2]+' Теперь рассмотрим отдельный случай. ':''}${w[0]}\n\nВ этой ситуации нужно различить «${t.concepts[qi*2].name}» и «${t.concepts[qi*2+1].name}». ${t.concepts[qi*2].principle} ${t.concepts[qi*2+1].principle}\n\nСвязь этих понятий в решении: ${g.mechanisms[qi]} Начнём с определения, затем проверим различие на данных примера.`;
  else if(suffix.endsWith('-mechanism'))speech=`${g.mechanisms[qi]}\n\n${w[0]} ${w[1]}\n\nИз этих действий следует результат: ${w[2]} Он справедлив при условиях исходного случая, которые сейчас сохраняем.`;
  else if(suffix.endsWith('-input')){speech=`${w[0]}\n\nНазовите исходные факты и предложите действие. Пока не переносим сюда правило из другой ситуации; следующий экран позволит сравнить собственное рассуждение с полным разбором.`;note.answer=w.slice(1).join('\n\n');}
  else if(suffix.endsWith('-worked'))speech=`${w[0]}\n\n${describeVisual(s.visual)}\n\n${w[1]} Поэтому ${w[2]}\n\nСвязи схемы описывают именно эту задачу: ${s.visual.caption} Отдельно проверим изменение условия, чтобы не принять успешный пример за универсальное правило.`;
  else if(suffix.endsWith('-boundary')){const v=variants[t.number-1][qi];speech=`Исходный результат: ${w[2]}\n\nИзменилось условие: ${v.condition}\n\n${v.action}\n\nПолучаем: ${v.result}\n\nГраница: ${w[3]}`;note.answer=v.result;}
 }
 if(!speech){
  const extra=g.extra,e=additional[index];
  if(suffix==='start')speech=`${t.caseContext}\n\nТема «${t.title}» помогает решить конкретную задачу: ${t.objective} Результат работы — ${t.deliverable}.`;
  else if(suffix==='route')speech=`Вопросы связаны по ходу проектной работы: ${[0,1,2,3].map(i=>t.concepts[i*2].name+' и '+t.concepts[i*2+1].name).join('; ')}. Каждый вопрос завершается отдельным новым случаем и самопроверкой.`;
  else if(suffix==='why')speech=`${t.objective}\n\n${cases[0][0]} ${cases[0][1]}\n\nРезультат оформляется как ${t.deliverable}. Его содержание позволяет проверить решение независимо от рассказа автора.`;
  else if(suffix==='case')speech=`${t.caseContext}\n\nWMS управляет складской работой; ТСД используется рядом с товаром, ERP связывает учёт с предприятием. Данные наших случаев учебные; область вывода ограничивается явно названными условиями.`;
  else if(suffix==='prerequisites')speech=`${g.prerequisite}\n\nВ дальнейшем различаем исходное состояние, действие и наблюдаемый результат. Например: ${cases[0][0]}`;
  else if(suffix==='explanation')speech=`${g.overview}\n\n${g.mechanisms[0]}\n\n${g.mechanisms[3]}`;
  else if(suffix==='additional-case-input'){speech=`${e.input}\n\nПредложите действие и ожидаемый результат до раскрытия следующего экрана. Отделите известные данные от тех, которые ещё нужно уточнить. ${extra.boundary}`;note.answer=e.why;note.preparation=e.input;}
  else if(suffix==='additional-case-solution'){speech=`${e.input}\n\n${reading[e.visual.type]}\n\n${modelText(e.visual)}\n\n${e.why}\n\nСледующий экран проверяет ошибочное применение результата: ${extra.boundary}`;note.answer=e.why;note.preparation=e.input;}
  else if(suffix==='additional-case-boundary')speech=`${extra.boundary}\n\nПолученный результат «${extra.result}» относится к прежним условиям. Здесь нужно проверить, сохраняется ли основание каждого шага.`;
  else if(suffix==='summary')speech=cases.map(w=>w[2]).join('\n\n');
  else if(suffix==='sources')speech=`Источники помогают уточнить понятия и границы решений этой темы. ${t.description} Учебный складской пример не заменяет правила конкретной организации.`;
  else if(suffix==='final')speech=`В собственном проекте подготовьте ${t.deliverable}. Зафиксируйте подтверждённые исходные данные, выбранное решение и способ проверки. ${cases[3][3]}`;
  else if(suffix==='questions'){
   const v=variants[index][0],x=t.concepts[6];
   speech=`Вернёмся к исходной цели: ${t.objective}\n\nПервый вопрос: как проверить ${t.deliverable}? В ответе нужны исходное условие, содержательное решение и свидетельство результата. Для разобранных случаев такими результатами были: ${cases.map(w=>w[2]).join(' ')} Одно название документа не подтверждает его содержание.\n\nВторой вопрос: как исходные данные меняют выбор для понятия «${t.concepts[0].name}»? В исходном случае: ${cases[0][0]} Решение: ${cases[0][1]} Изменение: ${v.condition} Теперь ${v.action} Получается: ${v.result} По этому сравнению видно, какое основание вывода изменилось.\n\nТретий вопрос: как обнаружить ошибку при применении понятия «${x.name}»? Типичная ошибка: ${x.pitfall} Проверяемый признак: ${x.check}. В конкретном примере: ${artifacts[index][6].why}\n\nДля собственного проекта отделим подтверждённые условия от допущений. Допустим ответ с другим решением, если названы его условия, полномочие принятия и наблюдаемая проверка; учебные числа не переносятся автоматически.`;
   note.answer=speech;
  }
  else if(suffix==='exam-context')speech=`${s.body}\n\nВ этой теме результат подготовки — ${t.deliverable}. ${g.overview}`;
  else if(suffix==='experiment-start')speech=`${s.body}\n\nОткроем следующий экран. Сначала прогнозируем результат, затем меняем одно условие и сравниваем два запуска. Значения и их интерпретация должны относиться к одному набору данных.`;
  else if(suffix==='experiment')speech=`${laboratory.setup}\n\n${laboratory.procedure.join('\n\n')}\n\n${laboratory.fields?.length?laboratory.fields.map(f=>`Параметр «${f.label}» сравнивает ${f.options.map(o=>'«'+o+'»').join(' и ')}.`).join(' '):''}\n\nСначала запишем прогноз и сравним с исходным состоянием. Изменим одно существенное условие, выполним действие и зафиксируем результат запуска. ${laboratory.expected}\n\n${modelText(s.visual)}\n\n${laboratory.boundary} Эта схема в печати описывает исходный случай. В работающей лаборатории вывод относится к выбранным параметрам; перед переносом результата нужно назвать их. Параметры и числа учебные; модель не исполняет операции реального склада.`;
  else if(suffix==='experiment-review')speech=`${s.body}\n\n${(s.bullets||[]).join('\n\n')}`;
  else speech=note.script;
 }
 return {...note,script:speech,notebook:s.notebook||''};
}
