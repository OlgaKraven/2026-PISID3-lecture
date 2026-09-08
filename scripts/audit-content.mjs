import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const projectRoot = process.cwd();
const temporaryDirectory = path.join(tmpdir(), `pisid3-content-audit-${process.pid}`);
const reportDirectory = path.join(projectRoot, 'reports');
const allowedServiceIds = new Set([
  'main-literature',
  'additional-literature',
  'materials',
  'course-theme',
  'questions',
]);

function compile(source, fileName) {
  return ts.transpileModule(source, {
    fileName,
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
}

function normalize(value) {
  return value.replace(/\s+/g, ' ').trim();
}

function slidePhrases(slide) {
  const values = [slide.title, slide.subtitle, slide.quote, slide.note];
  values.push(...(slide.bullets ?? []));
  values.push(...(slide.cards ?? []).flatMap((card) => [card.label, card.value]));
  values.push(...(slide.steps ?? []).flatMap((step) => [step.title, step.text]));
  if (slide.compare) {
    values.push(slide.compare.leftTitle, ...slide.compare.left, slide.compare.rightTitle, ...slide.compare.right);
  }
  if (slide.quiz) {
    values.push(slide.quiz.prompt, slide.quiz.explanation, ...(slide.quiz.options ?? []));
  }
  return values.filter(Boolean).map(normalize).filter((value) => value.length >= 45);
}

await mkdir(temporaryDirectory, { recursive: true });
try {
  const courseSource = await readFile(path.join(projectRoot, 'app', 'course.ts'), 'utf8');
  const dataSource = (await readFile(path.join(projectRoot, 'app', 'course-data.ts'), 'utf8'))
    .replace("from './course';", "from './course.mjs';")
    .replace("from './artifact-templates';", "from './artifact-templates.mjs';")
    .replace("from './concept-definitions';", "from './concept-definitions.mjs';")
    .replace("from './concept-guidance';", "from './concept-guidance.mjs';");
  const definitionIndexSource = (await readFile(path.join(projectRoot, 'app', 'concept-definitions.ts'), 'utf8'))
    .replace("from './concept-definitions-03-10';", "from './concept-definitions-03-10.mjs';")
    .replace("from './concept-definitions-11-18';", "from './concept-definitions-11-18.mjs';")
    .replace("from './concept-definitions-19-26';", "from './concept-definitions-19-26.mjs';");
  const guidanceIndexSource = (await readFile(path.join(projectRoot, 'app', 'concept-guidance.ts'), 'utf8'))
    .replace("from './concept-guidance-01-02';", "from './concept-guidance-01-02.mjs';")
    .replace("from './concept-guidance-03-10';", "from './concept-guidance-03-10.mjs';")
    .replace("from './concept-guidance-11-18';", "from './concept-guidance-11-18.mjs';")
    .replace("from './concept-guidance-19-26';", "from './concept-guidance-19-26.mjs';");
  await writeFile(path.join(temporaryDirectory, 'course.mjs'), compile(courseSource, 'course.ts'));
  for (const name of [
    'artifact-templates',
    'concept-definitions-03-10',
    'concept-definitions-11-18',
    'concept-definitions-19-26',
    'concept-guidance-01-02',
    'concept-guidance-03-10',
    'concept-guidance-11-18',
    'concept-guidance-19-26',
  ]) {
    const source = await readFile(path.join(projectRoot, 'app', `${name}.ts`), 'utf8');
    await writeFile(path.join(temporaryDirectory, `${name}.mjs`), compile(source, `${name}.ts`));
  }
  await writeFile(path.join(temporaryDirectory, 'concept-definitions.mjs'), compile(definitionIndexSource, 'concept-definitions.ts'));
  await writeFile(path.join(temporaryDirectory, 'concept-guidance.mjs'), compile(guidanceIndexSource, 'concept-guidance.ts'));
  await writeFile(path.join(temporaryDirectory, 'course-data.mjs'), compile(dataSource, 'course-data.ts'));

  const { course } = await import(`${pathToFileURL(path.join(temporaryDirectory, 'course-data.mjs')).href}?v=${Date.now()}`);
  const { buildDeck } = await import(`${pathToFileURL(path.join(temporaryDirectory, 'course.mjs')).href}?v=${Date.now()}`);
  const failures = [];
  const allowedSharedPhrases = new Set([
    ...Object.values(course.semesterThemes),
    ...course.topics.flatMap((topic) => topic.sources.map((source) => source.label)),
  ]);
  const titleOccurrences = new Map();
  const phraseOccurrences = new Map();
  const guidanceOccurrences = new Map();
  const artifactTemplateOccurrences = new Map();
  const lectureSummaries = [];

  if (course.topics.length !== 26) failures.push(`Ожидалось 26 лекций, найдено ${course.topics.length}`);

  for (const topic of course.topics) {
    const slides = buildDeck(topic, course);
    const checksByConcept = topic.concepts.map((_, index) =>
      slides.filter((slide) => slide.id.startsWith(`c${index + 1}-check-`)).length,
    );
    if (topic.concepts.length !== 8) failures.push(`Лекция ${topic.number}: найдено ${topic.concepts.length} концептов`);
    if (slides.length < 80) failures.push(`Лекция ${topic.number}: только ${slides.length} слайдов`);
    if (!topic.artifactTemplate || topic.artifactTemplate.length < 5) failures.push(`Лекция ${topic.number}: нет предметного шаблона артефакта`);
    const artifactTemplate = normalize((topic.artifactTemplate ?? []).join(' | '));
    const artifactEntry = artifactTemplateOccurrences.get(artifactTemplate) ?? [];
    artifactEntry.push(topic.number);
    artifactTemplateOccurrences.set(artifactTemplate, artifactEntry);
    const artifactSlide = slides.find((slide) => slide.id === 'practice-artifact');
    if (artifactSlide?.code !== topic.artifactTemplate?.join('\n')) failures.push(`Лекция ${topic.number}: слайд практики не использует предметный шаблон артефакта`);
    if (slides.some((slide) => slide.id === 'practice-compare')) failures.push(`Лекция ${topic.number}: сохранён дублирующий экран practice-compare`);
    if (slides.find((slide) => slide.id === 'why')?.quote) failures.push(`Лекция ${topic.number}: вводный экран повторяет описание титульного`);
    const judgementAnswers = slides
      .filter((slide) => /c\d+-check-judgement/.test(slide.id))
      .map((slide) => slide.quiz?.answer);
    if (judgementAnswers.filter((answer) => answer === 'Верно').length !== 4 || judgementAnswers.filter((answer) => answer === 'Неверно').length !== 4) {
      failures.push(`Лекция ${topic.number}: утверждения самопроверки не сбалансированы 4/4`);
    }
    checksByConcept.forEach((count, index) => {
      if (count !== 4) failures.push(`Лекция ${topic.number}, концепт ${index + 1}: найдено ${count} заданий самопроверки`);
    });
    topic.concepts.forEach((concept, index) => {
      const guidance = [concept.decision, concept.pitfall, concept.check, ...(concept.distractors ?? [])];
      if (guidance.length !== 5 || guidance.some((value) => !value)) {
        failures.push(`Лекция ${topic.number}, «${concept.name}»: неполный предметный разбор или дистракторы`);
      }
      if (new Set(guidance.map((value) => normalize(value ?? ''))).size !== 5) {
        failures.push(`Лекция ${topic.number}, «${concept.name}»: повтор текста внутри предметного разбора`);
      }
      for (const value of guidance) {
        if (!value) continue;
        const normalizedValue = normalize(value);
        const entries = guidanceOccurrences.get(normalizedValue) ?? [];
        entries.push(`${topic.number}:${concept.name}`);
        guidanceOccurrences.set(normalizedValue, entries);
      }
      const prefix = `${concept.name} — это `;
      if (!normalize(concept.definition).startsWith(prefix)) {
        failures.push(`Лекция ${topic.number}, «${concept.name}»: нет классического определения в форме «термин — это …»`);
      }
      const definitionId = `c${index + 1}-definition`;
      const caseId = `c${index + 1}-case`;
      const decisionId = `c${index + 1}-decision`;
      const checkId = `c${index + 1}-check-choice`;
      const definitionIndex = slides.findIndex((slide) => slide.id === definitionId);
      const caseIndex = slides.findIndex((slide) => slide.id === caseId);
      const decisionIndex = slides.findIndex((slide) => slide.id === decisionId);
      const checkIndex = slides.findIndex((slide) => slide.id === checkId);
      if (!(definitionIndex >= 0 && definitionIndex < caseIndex && caseIndex < decisionIndex && decisionIndex < checkIndex)) {
        failures.push(`Лекция ${topic.number}, «${concept.name}»: нарушен порядок «теория → пример → разбор → проверка»`);
      }
      const definitionSlide = slides[definitionIndex];
      if (definitionSlide?.quote !== concept.definition || definitionSlide?.cards?.length) {
        failures.push(`Лекция ${topic.number}, «${concept.name}»: экран определения подменён другим текстом или служебными карточками`);
      }
    });
    lectureSummaries.push({
      lecture: topic.number,
      title: topic.title,
      concepts: topic.concepts.length,
      slides: slides.length,
      selfChecks: checksByConcept.reduce((sum, count) => sum + count, 0),
    });

    for (const slide of slides) {
      if (allowedServiceIds.has(slide.id)) continue;
      const title = normalize(slide.title);
      const titleEntry = titleOccurrences.get(title) ?? new Set();
      titleEntry.add(topic.number);
      titleOccurrences.set(title, titleEntry);
      for (const phrase of slidePhrases(slide)) {
        if (allowedSharedPhrases.has(phrase)) continue;
        const phraseEntry = phraseOccurrences.get(phrase) ?? new Set();
        phraseEntry.add(topic.number);
        phraseOccurrences.set(phrase, phraseEntry);
      }
    }
  }

  const repeatedTitles = [...titleOccurrences]
    .filter(([, lectures]) => lectures.size > 1)
    .map(([text, lectures]) => ({ text, lectures: [...lectures] }))
    .sort((a, b) => b.lectures.length - a.lectures.length || a.text.localeCompare(b.text, 'ru'));
  const repeatedPhrases = [...phraseOccurrences]
    .filter(([, lectures]) => lectures.size > 1)
    .map(([text, lectures]) => ({ text, lectures: [...lectures] }))
    .sort((a, b) => b.lectures.length - a.lectures.length || a.text.localeCompare(b.text, 'ru'));

  const massTitleRepeats = repeatedTitles.filter((item) => item.lectures.length >= 8);
  const massPhraseRepeats = repeatedPhrases.filter((item) => item.lectures.length >= 8);
  const repeatedGuidance = [...guidanceOccurrences].filter(([, entries]) => entries.length > 1);
  const repeatedArtifactTemplates = [...artifactTemplateOccurrences].filter(([, lectures]) => lectures.length > 1);
  if (massTitleRepeats.length) failures.push(`Массовые повторы учебных заголовков: ${massTitleRepeats.length}`);
  if (massPhraseRepeats.length) failures.push(`Массовые повторы содержательных фраз: ${massPhraseRepeats.length}`);
  if (repeatedGuidance.length) failures.push(`Точные повторы предметных решений, ошибок, проверок или дистракторов: ${repeatedGuidance.length}`);
  if (repeatedArtifactTemplates.length) failures.push(`Повторяющиеся шаблоны практического артефакта: ${repeatedArtifactTemplates.length}`);

  const report = {
    generatedAt: new Date().toISOString(),
    totals: {
      lectures: course.topics.length,
      slides: lectureSummaries.reduce((sum, item) => sum + item.slides, 0),
      concepts: lectureSummaries.reduce((sum, item) => sum + item.concepts, 0),
      selfChecks: lectureSummaries.reduce((sum, item) => sum + item.selfChecks, 0),
    },
    failures,
    repeatedTitles,
    repeatedPhrases,
    repeatedGuidance,
    repeatedArtifactTemplates,
    lectures: lectureSummaries,
  };
  await mkdir(reportDirectory, { recursive: true });
  await writeFile(path.join(reportDirectory, 'content-audit.json'), `${JSON.stringify(report, null, 2)}\n`);

  console.log(`Лекций: ${report.totals.lectures}; слайдов: ${report.totals.slides}; концептов: ${report.totals.concepts}; самопроверок: ${report.totals.selfChecks}`);
  console.log(`Повторяющиеся учебные заголовки между лекциями: ${repeatedTitles.length}`);
  console.log(`Повторяющиеся содержательные фразы между лекциями: ${repeatedPhrases.length}`);
  if (failures.length) {
    failures.forEach((failure) => console.error(`Ошибка: ${failure}`));
    process.exitCode = 1;
  }
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true });
}
