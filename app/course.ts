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
  principle: string;
  example: string;
  decision?: string;
  pitfall?: string;
  check?: string;
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
  cards?: { label: string; value: string; tone?: 'red' | 'yellow' | 'green' | 'blue' }[];
  steps?: { title: string; text: string }[];
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

const tones = ['red', 'blue', 'yellow', 'green'] as const;
const mainLiterature = [
  'Гринченко, Н. Н., Громов, А. Ю., Хизриева, Н. И. Проектирование информационных систем. — Москва : КУРС, 2024. — 176 с. — ISBN 978-5-907352-30-8. — URL: https://www.iprbookshop.ru/144813.html',
  'Белов, В. В., Чистякова, В. И. Проектирование информационных систем. — Москва : КУРС, 2024. — 400 с. — ISBN 978-5-906923-53-0. — URL: https://www.iprbookshop.ru/144814.html',
];
const additionalLiterature = [
  'Золотов, С. Ю. Проектирование информационных систем. — Томск : ТУСУР, 2023. — 61 с. — URL: https://www.iprbookshop.ru/152882.html',
  'Проектирование информационных систем : учебно-методическое пособие. — Астрахань : АГАСУ, 2022. — 70 с. — ISBN 978-5-93026-166-10. — URL: https://www.iprbookshop.ru/123442.html',
  'Цехановский, В. В., Водяхо, А. И. Проектирование информационных систем. — Саратов : Профобразование, 2025. — 256 с. — ISBN 978-5-4488-2577-4. — URL: https://www.iprbookshop.ru/152769.html',
];

type LectureLens = 'decision' | 'requirements' | 'data' | 'ux' | 'access';

function lectureLens(topic: Topic): LectureLens {
  if (topic.number >= 25) return 'access';
  if (topic.number >= 20) return 'ux';
  if (topic.number >= 10 && topic.number <= 15) return 'data';
  if (topic.number >= 4 && topic.number <= 9) return 'requirements';
  return 'decision';
}

function conceptCriterion(topic: Topic, concept: Concept): string {
  switch (lectureLens(topic)) {
    case 'requirements':
      return `В результате «${topic.deliverable}» понятие «${concept.name}» связано с источником, условием и способом приёмки.`;
    case 'data':
      return `В результате «${topic.deliverable}» смысл понятия «${concept.name}» выражен сущностью, атрибутом, связью или ограничением и подтверждён фактом из кейса.`;
    case 'ux':
      return `В сценарии «${topic.caseName}» для понятия «${concept.name}» видны цель пользователя, состояние интерфейса и обратная связь.`;
    case 'access':
      return `Для понятия «${concept.name}» указаны субъект, операция, область данных и результат независимой серверной проверки.`;
    default:
      return `В результате «${topic.deliverable}» выбор по понятию «${concept.name}» связан с ограничением и подтверждён ситуацией из кейса.`;
  }
}

function conceptMisuse(topic: Topic, concept: Concept): string {
  switch (lectureLens(topic)) {
    case 'requirements':
      return `Записать «${concept.name}» без источника, условия и приёмочного примера, хотя в кейсе наблюдается: ${concept.example}`;
    case 'data':
      return `Оставить «${concept.name}» подписью в модели, не выразив правило данными и ограничениями: ${concept.principle}`;
    case 'ux':
      return `Показать «${concept.name}» статичным экраном и не проверить пользовательскую ситуацию: ${concept.example}`;
    case 'access':
      return `Ограничить «${concept.name}» только скрытой кнопкой и не проверить право на сервере в ситуации: ${concept.example}`;
    default:
      return `Выбрать вариант для понятия «${concept.name}» без сравнения последствий, хотя кейс требует учесть ситуацию: ${concept.example}`;
  }
}

function conceptAction(topic: Topic, concept: Concept): string {
  switch (lectureLens(topic)) {
    case 'requirements':
      return `Связать «${concept.name}» с источником, формулировкой, примером и критерием в результате «${topic.deliverable}».`;
    case 'data':
      return `Выразить «${concept.name}» в модели и проверить на факте из кейса: ${concept.example}`;
    case 'ux':
      return `Провести ситуацию «${concept.example}» через макет, состояние ошибки и обратную связь.`;
    case 'access':
      return `Зафиксировать для «${concept.name}» субъект, операцию, область данных и серверную проверку на примере: ${concept.example}`;
    default:
      return `Сравнить варианты для «${concept.name}» и записать выбор в результате «${topic.deliverable}» с опорой на пример: ${concept.example}`;
  }
}

function mechanismSteps(topic: Topic, concept: Concept): Slide['steps'] {
  const criterion = conceptCriterion(topic, concept);
  switch (lectureLens(topic)) {
    case 'requirements':
      return [
        { title: 'Источник', text: topic.caseContext },
        { title: 'Формулировка', text: concept.principle },
        { title: 'Приёмочный пример', text: concept.example },
        { title: 'Контроль', text: criterion },
      ];
    case 'data':
      return [
        { title: 'Факт предметной области', text: topic.caseContext },
        { title: 'Семантика модели', text: concept.principle },
        { title: 'Проверочный экземпляр', text: concept.example },
        { title: 'Ограничение', text: criterion },
      ];
    case 'ux':
      return [
        { title: 'Цель пользователя', text: topic.caseContext },
        { title: 'Принцип взаимодействия', text: concept.principle },
        { title: 'Состояние интерфейса', text: concept.example },
        { title: 'Проверка сценария', text: criterion },
      ];
    case 'access':
      return [
        { title: 'Субъект и риск', text: topic.caseContext },
        { title: 'Правило доступа', text: concept.principle },
        { title: 'Операция', text: concept.example },
        { title: 'Серверный контроль', text: criterion },
      ];
    default:
      return [
        { title: 'Контекст решения', text: topic.caseContext },
        { title: 'Основание', text: concept.principle },
        { title: 'Вариант в кейсе', text: concept.example },
        { title: 'Критерий выбора', text: criterion },
      ];
  }
}

function conceptSlides(topic: Topic, concept: Concept, index: number, primaryTopic?: Topic): Slide[] {
  const n = index + 1;
  const source = topic.sources[index % topic.sources.length];
  const criterion = conceptCriterion(topic, concept);
  const misuse = conceptMisuse(topic, concept);
  const action = conceptAction(topic, concept);
  const contextualName = primaryTopic ? `${concept.name} в теме «${topic.shortTitle}»` : concept.name;
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
      eyebrow: primaryTopic ? 'КРАТКОЕ НАПОМИНАНИЕ И НОВАЯ ГРАНИЦА' : 'ОПРЕДЕЛЕНИЕ И ГРАНИЦА', title: `${contextualName}: рабочее определение`,
      quote: concept.principle,
      cards: [
        { label: 'Тема', value: topic.shortTitle, tone: 'red' },
        { label: 'Учебная задача', value: topic.objective, tone: 'blue' },
        { label: 'Источник', value: source.label, tone: 'green' },
      ],
      citation: source,
    },
    {
      id: `c${n}-mechanism`, section: `Концепт ${n}`, type: n % 2 ? 'process' : 'architecture',
      eyebrow: 'МЕХАНИЗМ', title: `${contextualName} в проектной работе`,
      steps: mechanismSteps(topic, concept),
    },
    {
      id: `c${n}-case`, section: `Концепт ${n}`, type: 'case',
      eyebrow: `КЕЙС · ${topic.caseName.toUpperCase()}`, title: concept.example,
      subtitle: topic.caseContext,
      cards: [
        { label: 'Предмет анализа', value: concept.name, tone: 'blue' },
        { label: 'Наблюдаемое проявление', value: concept.example, tone: 'red' },
      ],
    },
    {
      id: `c${n}-decision`, section: `Концепт ${n}`, type: 'comparison',
      eyebrow: 'РАЗБОР РЕШЕНИЯ', title: `${contextualName}: ошибка и корректное действие`,
      compare: {
        leftTitle: 'Ошибка',
        left: [misuse, `В результате «${topic.deliverable}» нельзя проверить применение понятия.`],
        rightTitle: 'Корректное действие',
        right: [action, criterion],
      },
    },
    {
      id: `c${n}-mistake`, section: `Концепт ${n}`, type: 'mistake',
      eyebrow: 'ДИАГНОСТИКА ОШИБКИ', title: `Как обнаружить ошибку в понятии «${contextualName}»`,
      subtitle: misuse,
      cards: [
        { label: 'След в кейсе', value: concept.example, tone: 'yellow' },
        { label: 'Что проверить', value: criterion, tone: 'red' },
        { label: 'Ожидаемый результат', value: topic.deliverable, tone: 'green' },
      ],
    },
    {
      id: `c${n}-notes`, section: `Концепт ${n}`, type: 'cheatsheet',
      eyebrow: 'В РАБОЧУЮ ТЕТРАДЬ', title: `Краткая запись: ${contextualName}`,
      bullets: [concept.principle, `Пример: ${concept.example}`, `Проверка результата: ${criterion}`],
      citation: source,
    },
    {
      id: `c${n}-check-choice`, section: `Концепт ${n}`, type: 'quiz',
      eyebrow: 'САМОПРОВЕРКА · 1 / 4', title: `${contextualName}: выбор проектного действия`,
      quiz: {
        kind: 'single',
        prompt: `Какое действие корректно раскрывает понятие «${concept.name}» в теме «${topic.shortTitle}»?`,
        options: [action, misuse, `Записать только определение «${concept.name}» без разбора кейса «${topic.caseName}»`, `Перенести решение из другой лекции в результат «${topic.deliverable}» без проверки условий кейса`],
        answer: action,
        explanation: criterion,
      },
    },
    {
      id: `c${n}-check-word`, section: `Концепт ${n}`, type: 'quiz',
      eyebrow: 'САМОПРОВЕРКА · 2 / 4', title: `${contextualName}: восстановление термина`,
      quiz: {
        kind: 'short',
        prompt: `Введите понятие, которому соответствует определение: «${concept.principle}»`,
        answer: concept.name,
        explanation: `В теме «${topic.shortTitle}» определение относится к понятию «${concept.name}».`,
      },
    },
    {
      id: `c${n}-check-match`, section: `Концепт ${n}`, type: 'quiz',
      eyebrow: 'САМОПРОВЕРКА · 3 / 4', title: `${contextualName}: соответствия`,
      quiz: {
        kind: 'matching',
        prompt: `Отметьте три соответствия для понятия «${concept.name}» в результате «${topic.deliverable}».`,
        options: [`Понятие: ${concept.name}`, `Пример: ${concept.example}`, `Критерий: ${criterion}`, `Ошибка: ${misuse}`],
        answer: [`Понятие: ${concept.name}`, `Пример: ${concept.example}`, `Критерий: ${criterion}`],
        explanation: `Лишний вариант описывает ошибку: ${misuse}`,
      },
    },
    {
      id: `c${n}-check-judgement`, section: `Концепт ${n}`, type: 'quiz',
      eyebrow: 'САМОПРОВЕРКА · 4 / 4', title: `${contextualName}: оценка ошибки`,
      quiz: {
        kind: 'trueFalse',
        prompt: `Утверждение «${misuse}» описывает корректное проектное действие.`,
        options: ['Верно', 'Неверно'],
        answer: 'Неверно',
        explanation: criterion,
      },
    },
  ];
}

export function buildDeck(topic: Topic, course: Course): Slide[] {
  if (!course) throw new Error(`Тема ${topic.id}: данные курса не переданы в генератор презентации`);
  if (topic.concepts.length !== 8) throw new Error(`Тема ${topic.id}: требуется ровно 8 концептов`);
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
      title: topic.objective, quote: `Сильный проект связывает исходный факт, принятое решение и способ проверки. Сегодня создаём: ${topic.deliverable}.`,
      cards: topic.tags.slice(0, 4).map((tag, index) => ({ label: `Фокус ${index + 1}`, value: tag, tone: tones[index] })),
    },
    {
      id: 'case', section: 'Старт', type: 'case', eyebrow: 'СКВОЗНОЙ РЕАЛИСТИЧНЫЙ КЕЙС',
      title: `${topic.caseName}: ${topic.shortTitle}`, subtitle: topic.caseContext,
      cards: [
        { label: 'Задача', value: topic.description, tone: 'red' },
        { label: 'Результат', value: topic.deliverable, tone: 'green' },
      ], image: 'tablet',
    },
    {
      id: 'route', section: 'Старт', type: 'map', eyebrow: 'КАРТА ТЕМЫ',
      title: `${topic.shortTitle}: восемь вопросов лекции`,
      steps: topic.concepts.map((concept, index) => ({ title: `${String(index + 1).padStart(2, '0')} · ${concept.name}`, text: conceptCriterion(topic, concept) })),
    },
    {
      id: 'start-model', section: 'Старт', type: 'definition', eyebrow: 'РАБОЧАЯ МОДЕЛЬ',
      title: `Как будет построена работа по теме «${topic.shortTitle}»`,
      steps: [
        { title: 'Контекст', text: topic.caseContext },
        { title: 'Решение', text: topic.objective },
        { title: 'Артефакт', text: topic.deliverable },
        { title: 'Проверка', text: conceptCriterion(topic, topic.concepts[7]) },
      ],
    },
    {
      id: 'outcomes', section: 'Старт', type: 'bento', eyebrow: 'РЕЗУЛЬТАТЫ ОБУЧЕНИЯ',
      title: `Результаты темы «${topic.shortTitle}»`,
      cards: [
        { label: 'Объяснить', value: topic.concepts[0].principle, tone: 'red' },
        { label: 'Применить', value: topic.concepts[2].example, tone: 'blue' },
        { label: 'Проверить', value: conceptCriterion(topic, topic.concepts[5]), tone: 'yellow' },
        { label: 'Защитить', value: topic.objective, tone: 'green' },
      ],
    },
    {
      id: 'artifact-path', section: 'Старт', type: 'interactive', eyebrow: 'АРТЕФАКТ ЗАНЯТИЯ',
      title: topic.deliverable, subtitle: `Рабочий результат лекции «${topic.shortTitle}»`,
      bullets: topic.concepts.slice(0, 4).map((concept) => `${concept.name}: ${conceptCriterion(topic, concept)}`),
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
      bullets: topic.concepts.slice(0, 4).map((concept) => `${concept.name}: ${conceptCriterion(topic, concept)}`), image: 'desk',
    },
    {
      id: 'practice-artifact', section: 'Практика', type: 'terminal', eyebrow: 'ШАБЛОН АРТЕФАКТА',
      title: `Черновик: ${topic.deliverable}`,
      code: ['ID: DEC-01', `Контекст: ${topic.caseContext}`, 'Источник: документ / интервью / наблюдение', 'Решение: …', 'Обоснование: …', 'Критерий проверки: …'].join('\n'),
    },
    {
      id: 'practice-compare', section: 'Практика', type: 'comparison', eyebrow: 'САМОПРОВЕРКА',
      title: `${topic.shortTitle}: описание и проверяемый результат`,
      compare: {
        leftTitle: 'Непроверенное описание', left: [conceptMisuse(topic, topic.concepts[1]), conceptMisuse(topic, topic.concepts[4])],
        rightTitle: topic.deliverable, right: [conceptAction(topic, topic.concepts[1]), conceptAction(topic, topic.concepts[4])],
      },
    },
    {
      id: 'practice-process', section: 'Практика', type: 'process', eyebrow: 'МИНИ-ЛАБОРАТОРНАЯ',
      title: `Практическая сборка результата «${topic.deliverable}»`,
      steps: [
        { title: '1 · Выберите', text: topic.concepts[1].name },
        { title: '2 · Найдите факт', text: topic.concepts[1].example },
        { title: '3 · Разберите пример', text: topic.concepts[1].example },
        { title: '4 · Проверьте', text: conceptCriterion(topic, topic.concepts[1]) },
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
