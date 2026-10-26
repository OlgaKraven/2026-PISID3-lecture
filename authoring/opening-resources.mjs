import assert from 'node:assert/strict';

export function subjectReferences(topic, exam, examUrl) {
  return (topic.sources || []).map(s => ({citation:s.label,url:s.url})).concat(
    exam ? [{citation:'КИМ 09.02.07-5-2027 · комплект преподавателя',url:examUrl}] : []);
}

export function addOpeningResources(add, course, topic, references) {
  for (const [group, title] of [['primary','Основная литература'],['additional','Дополнительная литература']]) {
    add(group==='primary'?'main-literature':'additional-literature', {kind:'literature',title,readingGroup:group,references:course.literature[group]}, {
      script:`Для темы «${topic.shortTitle}» используем ${group==='primary'?'основную':'дополнительную'} литературу курса. ${course.literature[group].map(r=>r.citation).join(' ')} Откройте нужное издание по ссылке или QR-коду. Доступ к полному тексту может требовать входа в электронную библиотеку. ${group==='primary'?'На следующем слайде приведены дополнительные издания.':'Далее перейдём к '+(references.length?'предметным источникам этой темы.':'общей папке материалов курса.')}`,
      preparation:'Проверьте доступ к выбранному изданию в электронной библиотеке.',seconds:35
    });
  }
  if (references.length) add('sources', {kind:'literature',title:'Предметные источники',references}, {
    script:`Тема «${topic.shortTitle}»: ${topic.description} Для уточнения понятий и границ решений используем следующие источники: ${references.map(r=>r.citation).join('; ')}. Откройте нужный документ по ссылке или QR-коду. Учебный складской пример не заменяет правила конкретной организации. Затем откроем общую папку материалов курса.`,seconds:35
  });
  add('materials', {kind:'materials',title:'Материалы курса'}, {
    script:`Материалы темы «${topic.shortTitle}» доступны в общей папке курса: ${course.materialsUrl}. Откройте ссылку «Ссылка на материалы» или отсканируйте QR-код. Если материалы показываются на проекторе, сохраните ссылку на своём устройстве. Далее рассмотрим четыре вопроса темы и ожидаемый результат работы.`,
    preparation:'Проверьте открытие общей папки материалов курса.',seconds:30
  });
}

// Metadata alone does not prove that students can see the resources in a lecture.
export function validateOpeningResources(course, topics) {
  for (const [index, lecture] of course.lectures.entries()) {
    const prefix=lecture.id+'-', references=subjectReferences(topics[index],
      [1,2,3,10,11,12,13,14,15,25,26].includes(topics[index].number),
      'https://disk.yandex.ru/d/Pn1NcJ-UexwpjQ');
    const suffixes=['start','main-literature','additional-literature',...(references.length?['sources']:[]),'materials','route'];
    assert.deepEqual(lecture.slides.slice(0,suffixes.length).map(s=>s.id),suffixes.map(s=>prefix+s),lecture.id+': порядок вводных слайдов');
    assert.equal(lecture.slides[0].kind,'title');
    for (const group of ['primary','additional']) {
      const s=lecture.slides.find(s=>s.id===prefix+(group==='primary'?'main-literature':'additional-literature'));
      assert.equal(s.kind,'literature');assert.equal(s.readingGroup,group);
      assert.ok(course.literature[group].length>0,lecture.id+': пустая литература');
      assert.deepEqual(s.references,course.literature[group]);
    }
    const sources=lecture.slides.filter(s=>s.id===prefix+'sources');
    assert.equal(sources.length,references.length?1:0);
    if(references.length) assert.deepEqual(sources[0].references,references);
    assert.equal(lecture.slides.filter(s=>s.kind==='materials').length,1);
    assert.ok(/^https:\/\//.test(course.materialsUrl),lecture.id+': ссылка на материалы');
  }
}
