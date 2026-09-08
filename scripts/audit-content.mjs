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
    .replace("from './course';", "from './course.mjs';");
  await writeFile(path.join(temporaryDirectory, 'course.mjs'), compile(courseSource, 'course.ts'));
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
  const lectureSummaries = [];

  if (course.topics.length !== 26) failures.push(`Ожидалось 26 лекций, найдено ${course.topics.length}`);

  for (const topic of course.topics) {
    const slides = buildDeck(topic, course);
    const checksByConcept = topic.concepts.map((_, index) =>
      slides.filter((slide) => slide.id.startsWith(`c${index + 1}-check-`)).length,
    );
    if (topic.concepts.length !== 8) failures.push(`Лекция ${topic.number}: найдено ${topic.concepts.length} концептов`);
    if (slides.length < 80) failures.push(`Лекция ${topic.number}: только ${slides.length} слайдов`);
    checksByConcept.forEach((count, index) => {
      if (count !== 4) failures.push(`Лекция ${topic.number}, концепт ${index + 1}: найдено ${count} заданий самопроверки`);
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
  if (massTitleRepeats.length) failures.push(`Массовые повторы учебных заголовков: ${massTitleRepeats.length}`);
  if (massPhraseRepeats.length) failures.push(`Массовые повторы содержательных фраз: ${massPhraseRepeats.length}`);

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
