export type SlideType =
  | 'title' | 'map' | 'divider' | 'thesis' | 'definition' | 'bento'
  | 'process' | 'interactive' | 'architecture' | 'comparison' | 'terminal'
  | 'case' | 'mistake' | 'cheatsheet' | 'quiz' | 'summary' | 'final'
  | 'course-theme' | 'literature' | 'materials' | 'questions';

export type QuizKind =
  | 'single' | 'multi' | 'trueFalse' | 'matching'
  | 'ordering' | 'diagram' | 'short' | 'selfReview';

export type Source = { label: string; url: string };
export type TeacherProfile = { fullName: string; position: string; department: string };
export type Concept = {
  name: string;
  definition: string;
  principle: string;
  example: string;
  decision?: string;
  pitfall?: string;
  check?: string;
  distractors?: [string, string];
};

export type Topic = {
  id: string;
  number: number;
  semester: number;
  section: string;
  title: string;
  shortTitle: string;
  description: string;
  objective: string;
  deliverable: string;
  caseName: string;
  caseContext: string;
  artifactTemplate?: string[];
  concepts: Concept[];
  sources: Source[];
  tags: string[];
};

export type Quiz = {
  kind: QuizKind;
  prompt: string;
  options?: string[];
  answer: string | string[];
  explanation: string;
};

export type Slide = {
  id: string;
  section: string;
  type: SlideType;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  bullets?: string[];
  cards?: { label: string; value: string; tone?: 'red' | 'green' | 'blue' }[];
  steps?: { title: string; text?: string }[];
  compare?: { leftTitle: string; left: string[]; rightTitle: string; right: string[] };
  code?: string;
  quote?: string;
  citation?: Source;
  image?: 'desk' | 'tablet';
  quiz?: Quiz;
  materialUrl?: string;
  note?: string;
};

export type Course = {
  id: string;
  shortTitle: string;
  title: string;
  subtitle: string;
  audience: string;
  semesterThemes: Record<number, string>;
  materialsUrl: string;
  topics: Topic[];
};

const tones = ['red', 'blue', 'green', 'green'] as const;
const mainLiterature = [
  'Гринченко, Н. Н., Громов, А. Ю., Хизриева, Н. И. Проектирование информационных систем. — Москва : КУРС, 2024. — 176 с. — ISBN 978-5-907352-30-8. — URL: https://www.iprbookshop.ru/144813.html',
  'Белов, В. В., Чистякова, В. И. Проектирование информационных систем. — Москва : КУРС, 2024. — 400 с. — ISBN 978-5-906923-53-0. — URL: https://www.iprbookshop.ru/144814.html',
];
const additionalLiterature = [
  'Золотов, С. Ю. Проектирование информационных систем. — Томск : ТУСУР, 2023. — 61 с. — URL: https://www.iprbookshop.ru/152882.html',
  'Проектирование информационных систем : учебно-методическое пособие. — Астрахань : АГАСУ, 2022. — 70 с. — ISBN 978-5-93026-166-10. — URL: https://www.iprbookshop.ru/123442.html',
];

function conceptCriterion(topic: Topic, concept: Concept): string {
  if (!concept.check) throw new Error(`Тема ${topic.id}, «${concept.name}»: не задан предметный критерий`);
  return concept.check;
}

function conceptMisuse(topic: Topic, concept: Concept): string {
  if (!concept.pitfall) throw new Error(`Тема ${topic.id}, «${concept.name}»: не задана предметная ошибка`);
  return concept.pitfall;
}

function conceptAction(topic: Topic, concept: Concept): string {
  if (!concept.decision) throw new Error(`Тема ${topic.id}, «${concept.name}»: не задано предметное решение`);
  return concept.decision;
}

function conceptSlides(topic: Topic, concept: Concept, index: number, primaryTopic?: Topic): Slide[] {
  const n = index + 1;
  const source = topic.sources[index % topic.sources.length];
  const criterion = conceptCriterion(topic, concept);
  const misuse = conceptMisuse(topic, concept);
  const action = conceptAction(topic, concept);
  const distractors = concept.distractors ?? [];
  const contextualName = primaryTopic ? `${concept.name}: новое применение` : concept.name;
  return [
    {
      id: `c${n}-divider`, section: `Концепт ${n}`, type: 'divider',
      eyebrow: `ВОПРОС ${n}`, title: primaryTopic ? `${concept.name}: новое применение` : concept.name,
      subtitle: primaryTopic
        ? `Понятие введено в лекции ${primaryTopic.number}; здесь оно применяется к теме «${topic.shortTitle}»`
        : `Роль понятия в теме «${topic.shortTitle}»`,
    },
    {
      id: `c${n}-definition`, section: `Концепт ${n}`, type: 'definition',
      eyebrow: primaryTopic ? 'ТЕОРИЯ · КРАТКОЕ НАПОМИНАНИЕ' : 'ТЕОРИЯ', title: concept.name,
      quote: concept.definition,
      citation: source,
    },
    {
      id: `c${n}-case`, section: `Концепт ${n}`, type: 'case',
      eyebrow: `ПРИМЕР · ${topic.caseName.toUpperCase()}`, title: `Пример: ${concept.name}`,
      subtitle: concept.example,
    },
    {
      id: `c${n}-decision`, section: `Концепт ${n}`, type: 'comparison',
      eyebrow: 'РАЗБОР ПРИМЕРА', title: `${contextualName}: ошибка и решение`,
      compare: {
        leftTitle: 'Ошибка',
        left: [misuse],
        rightTitle: 'Проектное решение',
        right: [action],
      },
      quote: `Критерий проверки: ${criterion}`,
    },
    {
      id: `c${n}-check-choice`, section: `Концепт ${n}`, type: 'quiz',
      eyebrow: 'САМОПРОВЕРКА · 1 / 4', title: `${concept.name}: выберите действие`,
      quiz: {
        kind: 'single',
        prompt: `Какое действие корректно раскрывает понятие «${concept.name}»?`,
        options: [action, misuse, ...distractors],
        answer: action,
        explanation: criterion,
      },
    },
    {
      id: `c${n}-check-word`, section: `Концепт ${n}`, type: 'quiz',
      eyebrow: 'САМОПРОВЕРКА · 2 / 4', title: `${concept.name}: восстановите термин`,
      quiz: {
        kind: 'short',
        prompt: `Введите понятие, которому соответствует определение: «${concept.definition}»`,
        answer: concept.name,
        explanation: `Это определение понятия «${concept.name}».`,
      },
    },
    {
      id: `c${n}-check-match`, section: `Концепт ${n}`, type: 'quiz',
      eyebrow: 'САМОПРОВЕРКА · 3 / 4', title: `${concept.name}: свяжите с примером`,
      quiz: {
        kind: 'matching',
        prompt: `Отметьте три корректных соответствия для понятия «${concept.name}».`,
        options: [`Понятие: ${concept.name}`, `Пример: ${concept.example}`, `Критерий: ${criterion}`, `Ошибка: ${misuse}`],
        answer: [`Понятие: ${concept.name}`, `Пример: ${concept.example}`, `Критерий: ${criterion}`],
        explanation: `Лишний вариант описывает ошибку: ${misuse}`,
      },
    },
    {
      id: `c${n}-check-judgement`, section: `Концепт ${n}`, type: 'quiz',
      eyebrow: 'САМОПРОВЕРКА · 4 / 4', title: `${concept.name}: оцените утверждение`,
      quiz: {
        kind: 'trueFalse',
        prompt: index % 2 === 0
          ? `Утверждение «${action}» описывает корректное проектное действие.`
          : `Утверждение «${misuse}» описывает корректное проектное действие.`,
        options: ['Верно', 'Неверно'],
        answer: index % 2 === 0 ? 'Верно' : 'Неверно',
        explanation: criterion,
      },
    },
  ];
}

export function buildDeck(topic: Topic, course: Course): Slide[] {
  if (!course) throw new Error(`Тема ${topic.id}: данные курса не переданы в генератор презентации`);
  if (topic.concepts.length !== 8) throw new Error(`Тема ${topic.id}: требуется ровно 8 концептов`);
  if (!topic.artifactTemplate?.length) throw new Error(`Тема ${topic.id}: не задан предметный шаблон артефакта`);
  topic.concepts.forEach((concept) => {
    if (!concept.decision || !concept.pitfall || !concept.check) throw new Error(`Тема ${topic.id}, «${concept.name}»: не задан предметный разбор`);
    if (!concept.distractors || concept.distractors.length !== 2) throw new Error(`Тема ${topic.id}, «${concept.name}»: нужны два предметных дистрактора`);
  });
  const primaryTopics = topic.concepts.map((concept) =>
    course.topics.find((candidate) =>
      candidate.number < topic.number && candidate.concepts.some((item) => item.name === concept.name),
    ),
  );
  const slides: Slide[] = [
    {
      id: 'start', section: 'Старт', type: 'title', eyebrow: `ЛЕКЦИЯ ${topic.number} · СЕМЕСТР ${topic.semester}`,
      title: topic.title, subtitle: topic.description, image: 'desk', note: `Результат занятия: ${topic.objective}`,
    },
    {
      id: 'course-theme', section: 'Старт', type: 'course-theme', eyebrow: `ТЕМА КУРСА · ${topic.semester} СЕМЕСТР`,
      title: course.semesterThemes[topic.semester], subtitle: topic.section,
      quote: `Лекция ${topic.number}: ${topic.title}`,
    },
    {
      id: 'main-literature', section: 'Литература', type: 'literature', eyebrow: 'УЧЕБНЫЕ ИЗДАНИЯ',
      title: 'Основная литература', bullets: mainLiterature,
    },
    {
      id: 'additional-literature', section: 'Литература', type: 'literature', eyebrow: 'ДЛЯ УГЛУБЛЁННОЙ РАБОТЫ',
      title: 'Дополнительная литература', bullets: additionalLiterature,
    },
    {
      id: 'materials', section: 'Материалы', type: 'materials', eyebrow: 'МАТЕРИАЛЫ К ЗАНЯТИЯМ',
      title: 'Презентации, задания и исходные файлы', subtitle: 'Отсканируйте QR-код или откройте ссылку на общую папку курса.',
      materialUrl: course.materialsUrl,
    },
    {
      id: 'why', section: 'Старт', type: 'thesis', eyebrow: 'ЗАЧЕМ ЭТО ПРОЕКТИРОВЩИКУ',
      title: `${topic.shortTitle}: от теории к проверяемому решению`,
      cards: topic.tags.slice(0, 4).map((tag, index) => ({ label: `Фокус ${index + 1}`, value: tag, tone: tones[index] })),
    },
    {
      id: 'route', section: 'Старт', type: 'map', eyebrow: 'КАРТА ТЕМЫ',
      title: `${topic.shortTitle}: восемь вопросов лекции`,
      steps: topic.concepts.map((concept, index) => ({ title: `${String(index + 1).padStart(2, '0')} · ${concept.name}` })),
    },
    {
      id: 'start-model', section: 'Старт', type: 'definition', eyebrow: 'РАБОЧАЯ МОДЕЛЬ',
      title: topic.number === 1 ? 'От факта к результату стадии' : `Как будет построена работа по теме «${topic.shortTitle}»`,
      steps: topic.number === 1
        ? [
          { title: 'Факт', text: 'Подтверждённое исходное сведение' },
          { title: 'Проектное решение', text: 'Обоснованный выбор с учётом ограничений' },
          { title: 'Реализация', text: 'Воплощение решения в выбранной технологии' },
          { title: 'Результат стадии', text: 'Артефакт, который можно проверить и передать' },
        ]
        : [
          { title: 'Теория', text: 'Определение ключевого понятия' },
          { title: 'Принцип', text: 'Правило, граница и критерий' },
          { title: 'Пример', text: `Применение в ситуации «${topic.caseName}»` },
          { title: 'Проверка', text: `Связь с результатом «${topic.deliverable}»` },
        ],
    },
    {
      id: 'artifact-path', section: 'Старт', type: 'interactive', eyebrow: 'АРТЕФАКТ ЗАНЯТИЯ',
      title: topic.deliverable, subtitle: `Рабочий результат лекции «${topic.shortTitle}»`,
      bullets: topic.concepts.slice(0, 4).map((concept) => `${concept.name}: ${conceptCriterion(topic, concept)}`),
    },
    {
      id: 'case', section: 'Старт', type: 'case', eyebrow: 'СКВОЗНОЙ ПРИМЕР',
      title: topic.caseName, subtitle: topic.caseContext, image: 'tablet',
    },
    {
      id: 'diagnostic', section: 'Старт', type: 'quiz', eyebrow: 'ВХОДНАЯ ДИАГНОСТИКА',
      title: `Стартовая задача по теме «${topic.shortTitle}»`,
      quiz: {
        kind: 'single', prompt: `Какой первый шаг помогает получить результат «${topic.deliverable}»?`,
        options: [`Уточнить контекст: ${topic.caseContext}`, `Сразу выбрать привычный инструмент для темы «${topic.shortTitle}»`, `Скопировать решение для результата «${topic.deliverable}»`, `Начать тему «${topic.shortTitle}» с оформления документа`],
        answer: `Уточнить контекст: ${topic.caseContext}`,
        explanation: `Контекст задаёт границы работы по теме «${topic.shortTitle}».`,
      },
    },
    ...topic.concepts.flatMap((concept, index) => conceptSlides(topic, concept, index, primaryTopics[index])),
    {
      id: 'practice-scenario', section: 'Практика', type: 'case', eyebrow: 'СИТУАЦИОННАЯ ЗАДАЧА',
      title: `${topic.shortTitle}: запрос заказчика «сделать удобно и быстро»`,
      subtitle: `Разберите просьбу с опорой на вопросы темы «${topic.shortTitle}».`,
      bullets: [
        `Найдите в ситуации признак понятия «${topic.concepts[0].name}» и назовите подтверждающий факт.`,
        `Сформулируйте спорный выбор через понятие «${topic.concepts[2].name}».`,
        `Покажите, какое ограничение выявляет понятие «${topic.concepts[5].name}».`,
        `Подготовьте вопрос заказчику о понятии «${topic.concepts[7].name}».`,
      ], image: 'desk',
    },
    {
      id: 'practice-artifact', section: 'Практика', type: 'terminal', eyebrow: 'ШАБЛОН АРТЕФАКТА',
      title: `Черновик: ${topic.deliverable}`,
      code: topic.artifactTemplate.join('\n'),
    },
    {
      id: 'practice-process', section: 'Практика', type: 'process', eyebrow: 'МИНИ-ЛАБОРАТОРНАЯ',
      title: `Практическая сборка результата «${topic.deliverable}»`,
      steps: [
        { title: '1 · Выберите', text: `Укажите элемент результата, связанный с понятием «${topic.concepts[1].name}»` },
        { title: '2 · Обоснуйте', text: `Найдите в кейсе «${topic.caseName}» свидетельство для «${topic.concepts[1].name}»` },
        { title: '3 · Зафиксируйте', text: `Запишите собственное решение через понятие «${topic.concepts[4].name}»` },
        { title: '4 · Проверьте', text: `Предложите наблюдаемый признак качества через «${topic.concepts[7].name}»` },
      ],
    },
    {
      id: 'practice-schema', section: 'Практика', type: 'architecture', eyebrow: 'СВЯЗИ',
      title: `Место темы «${topic.shortTitle}» в проекте`,
      steps: [
        { title: 'Вход', text: topic.caseContext },
        { title: 'Обработка', text: topic.title },
        { title: 'Выход', text: topic.deliverable },
        { title: 'Потребитель', text: `Участники кейса «${topic.caseName}», которые принимают результат «${topic.deliverable}»` },
      ],
    },
    {
      id: 'practice-discussion', section: 'Практика', type: 'interactive', eyebrow: 'ОБСУЖДЕНИЕ В ПАРЕ',
      title: `Обсуждение результата «${topic.deliverable}»`,
      bullets: [`Один студент представляет заказчика кейса «${topic.caseName}» и формулирует запрос по теме «${topic.shortTitle}»`, `Второй объясняет понятие «${topic.concepts[2].name}» на примере темы «${topic.shortTitle}»`, `Через три минуты разберите понятие «${topic.concepts[5].name}» в том же кейсе`, `Зафиксируйте открытый вопрос по результату «${topic.deliverable}»`],
    },
    {
      id: 'practice-review', section: 'Практика', type: 'cheatsheet', eyebrow: 'ЧЕК-ЛИСТ РЕВИЗИИ',
      title: `Проверка результата «${topic.deliverable}»`,
      bullets: topic.concepts.map((concept) => `${concept.name}: ${conceptCriterion(topic, concept)}`),
    },
    {
      id: 'practice-reflection', section: 'Практика', type: 'quiz', eyebrow: 'РЕФЛЕКСИЯ',
      title: `Открытые вопросы темы «${topic.shortTitle}»`,
      quiz: {
        kind: 'selfReview', prompt: `Запишите одно допущение о результате «${topic.deliverable}» и способ его проверки.`,
        answer: [`Названо допущение по теме «${topic.shortTitle}»`, `Указан источник проверки для кейса «${topic.caseName}»`, `Сформулирован вопрос о результате «${topic.deliverable}»`],
        explanation: `Рефлексия должна выявить неизвестное, которое влияет на результат «${topic.deliverable}».`,
      },
    },
    {
      id: 'test-multi', section: 'Итоговый тест', type: 'quiz', eyebrow: 'ТЕСТ · 1 / 6', title: `${topic.shortTitle}: ключевые понятия`,
      quiz: { kind: 'multi', prompt: `Выберите понятия лекции «${topic.shortTitle}».`, options: [topic.concepts[0].name, topic.concepts[2].name, topic.concepts[5].name, `Постороннее понятие для темы «${topic.shortTitle}»`], answer: [topic.concepts[0].name, topic.concepts[2].name, topic.concepts[5].name], explanation: `Все выбранные понятия входят в тему «${topic.title}».` },
    },
    {
      id: 'test-order', section: 'Итоговый тест', type: 'quiz', eyebrow: 'ТЕСТ · 2 / 6', title: `${topic.shortTitle}: последовательность разбора`,
      quiz: { kind: 'ordering', prompt: `Расположите четыре понятия в порядке их раскрытия в лекции «${topic.shortTitle}».`, options: topic.concepts.slice(0, 4).map((concept) => concept.name), answer: topic.concepts.slice(0, 4).map((concept) => concept.name), explanation: `Порядок соответствует карте темы «${topic.shortTitle}».` },
    },
    {
      id: 'test-match', section: 'Итоговый тест', type: 'quiz', eyebrow: 'ТЕСТ · 3 / 6', title: `${topic.concepts[0].name}: итоговые соответствия`,
      quiz: { kind: 'matching', prompt: `Отметьте корректные соответствия для понятия «${topic.concepts[0].name}».`, options: [`Пример: ${topic.concepts[0].example}`, `Правило: ${topic.concepts[0].principle}`, `Проверка: ${conceptCriterion(topic, topic.concepts[0])}`, `Ошибка: ${conceptMisuse(topic, topic.concepts[0])}`], answer: [`Пример: ${topic.concepts[0].example}`, `Правило: ${topic.concepts[0].principle}`, `Проверка: ${conceptCriterion(topic, topic.concepts[0])}`], explanation: `Соответствия опираются на разбор понятия «${topic.concepts[0].name}».` },
    },
    {
      id: 'test-diagram', section: 'Итоговый тест', type: 'quiz', eyebrow: 'ТЕСТ · 4 / 6', title: `${topic.shortTitle}: связь с результатом`,
      quiz: { kind: 'diagram', prompt: `Какое понятие сильнее всего связано с результатом «${topic.deliverable}»?`, options: [topic.concepts[4].name, topic.concepts[7].name, topic.concepts[1].name, 'Ни одно из перечисленных'], answer: topic.concepts[4].name, explanation: conceptCriterion(topic, topic.concepts[4]) },
    },
    {
      id: 'test-short', section: 'Итоговый тест', type: 'quiz', eyebrow: 'ТЕСТ · 5 / 6', title: `${topic.shortTitle}: результат лекции`,
      quiz: { kind: 'short', prompt: `Назовите главный результат темы «${topic.shortTitle}».`, answer: topic.deliverable, explanation: `Ожидаемый артефакт: ${topic.deliverable}. Допускается эквивалентная формулировка.` },
    },
    {
      id: 'test-self', section: 'Итоговый тест', type: 'quiz', eyebrow: 'ТЕСТ · 6 / 6', title: `${topic.shortTitle}: объяснение решения`,
      quiz: { kind: 'selfReview', prompt: `Объясните, как два понятия лекции помогают получить результат «${topic.deliverable}».`, answer: [`Названы два понятия темы «${topic.shortTitle}»`, `Приведено применение в кейсе «${topic.caseName}»`, `Показана связь с результатом «${topic.deliverable}»`, `Указана проверка через понятие «${topic.concepts[7].name}»`], explanation: `Дополните недостающие связи между кейсом «${topic.caseName}» и результатом «${topic.deliverable}».` },
    },
    {
      id: 'cheat', section: 'Финиш', type: 'cheatsheet', eyebrow: 'ШПАРГАЛКА', title: topic.shortTitle,
      bullets: topic.concepts.map((concept) => `${concept.name} — ${concept.principle}`), citation: topic.sources[0],
    },
    {
      id: 'final', section: 'Финиш', type: 'final', eyebrow: 'ТЕМА ЗАВЕРШЕНА',
      title: `Готово: ${topic.deliverable}`, subtitle: `Теперь вы можете: ${topic.objective}`, image: 'tablet',
      quote: `Следующий шаг: применить результат «${topic.deliverable}» к собственному проекту и проверить его по критериям лекции.`,
    },
    {
      id: 'questions', section: 'Финиш', type: 'questions', eyebrow: course.shortTitle.toUpperCase(),
      title: 'Вопросы от аудитории', subtitle: topic.title, image: 'desk',
    },
  ];
  if (slides.length < 80) throw new Error(`Тема ${topic.id}: собрано только ${slides.length} слайдов; требуется не менее 80`);
  return slides;
}
