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
  decision: string;
  pitfall: string;
  check: string;
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

function conceptSlides(topic: Topic, concept: Concept, index: number): Slide[] {
  const n = index + 1;
  const source = topic.sources[index % topic.sources.length];
  return [
    {
      id: `c${n}-divider`, section: `Концепт ${n}`, type: 'divider',
      eyebrow: `ВОПРОС ${n}`, title: concept.name,
      subtitle: concept.principle,
    },
    {
      id: `c${n}-definition`, section: `Концепт ${n}`, type: 'definition',
      eyebrow: 'ОПРЕДЕЛЕНИЕ', title: `Что означает «${concept.name}»`,
      quote: concept.principle,
      cards: [
        { label: 'Смысл', value: 'Делает решение однозначным', tone: 'red' },
        { label: 'Артефакт', value: topic.deliverable, tone: 'blue' },
        { label: 'Проверка', value: concept.check, tone: 'green' },
      ],
      citation: source,
    },
    {
      id: `c${n}-mechanism`, section: `Концепт ${n}`, type: n % 2 ? 'process' : 'architecture',
      eyebrow: 'КАК ЭТО РАБОТАЕТ', title: `${concept.name}: логика применения`,
      steps: [
        { title: '01 · Найти', text: `Определить, где в исходных данных проявляется «${concept.name}»` },
        { title: '02 · Зафиксировать', text: 'Записать факт отдельно от предположения проектировщика' },
        { title: '03 · Решить', text: concept.decision },
        { title: '04 · Проверить', text: concept.check },
      ],
    },
    {
      id: `c${n}-case`, section: `Концепт ${n}`, type: 'case',
      eyebrow: `КЕЙС · ${topic.caseName.toUpperCase()}`, title: concept.example,
      subtitle: topic.caseContext,
      cards: [
        { label: 'Наблюдение', value: concept.principle, tone: 'blue' },
        { label: 'Решение', value: concept.decision, tone: 'red' },
      ],
      image: n % 2 ? 'desk' : 'tablet',
    },
    {
      id: `c${n}-decision`, section: `Концепт ${n}`, type: 'comparison',
      eyebrow: 'ВЫБОР ПРОЕКТИРОВЩИКА', title: 'Слабая формулировка или доказуемое решение?',
      compare: {
        leftTitle: 'Слабо',
        left: [`«Решение по аспекту „${concept.name}“ примем как обычно»`, 'Нет источника и критерия проверки', 'Непонятно, кто принял решение'],
        rightTitle: 'Доказуемо',
        right: [concept.decision, `Критерий: ${concept.check}`, `Связь с артефактом: ${topic.deliverable}`],
      },
    },
    {
      id: `c${n}-mistake`, section: `Концепт ${n}`, type: 'mistake',
      eyebrow: 'ТИПОВАЯ ОШИБКА', title: concept.pitfall,
      subtitle: 'Ошибка опасна не сама по себе, а тем, что разрывает трассировку между исходными данными, решением и проверкой.',
      cards: [
        { label: 'Сигнал', value: 'В документе нельзя найти источник решения', tone: 'yellow' },
        { label: 'Последствие', value: 'Команда реализует разные версии ожидания', tone: 'red' },
        { label: 'Исправление', value: concept.check, tone: 'green' },
      ],
    },
    {
      id: `c${n}-check`, section: `Концепт ${n}`, type: 'quiz',
      eyebrow: 'ПРОВЕРКА ПОНИМАНИЯ', title: `Проверьте понимание: ${concept.name}`,
      quiz: {
        kind: n % 2 ? 'single' : 'trueFalse',
        prompt: 'Какой вариант лучше всего подтверждает качество проектного решения?',
        options: [concept.check, concept.pitfall, 'Решение выглядит привычно для команды'],
        answer: concept.check,
        explanation: `Проверяемый критерий для этого концепта: ${concept.check}`,
      },
    },
  ];
}

export function buildDeck(topic: Topic, course: Course): Slide[] {
  if (!course) throw new Error(`Тема ${topic.id}: данные курса не переданы в генератор презентации`);
  if (topic.concepts.length !== 8) throw new Error(`Тема ${topic.id}: требуется ровно 8 концептов`);
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
      title: topic.caseName, subtitle: topic.caseContext,
      cards: [
        { label: 'Задача', value: topic.description, tone: 'red' },
        { label: 'Результат', value: topic.deliverable, tone: 'green' },
      ], image: 'tablet',
    },
    {
      id: 'route', section: 'Старт', type: 'map', eyebrow: 'КАРТА ТЕМЫ',
      title: 'От диагностики — к решению и защите',
      steps: topic.concepts.map((concept, index) => ({ title: `${String(index + 1).padStart(2, '0')} · ${concept.name}`, text: concept.check })),
    },
    {
      id: 'start-model', section: 'Старт', type: 'definition', eyebrow: 'РАБОЧАЯ МОДЕЛЬ',
      title: 'Факт → решение → артефакт → проверка',
      steps: [
        { title: 'Факт', text: 'Что явно следует из документов, наблюдения или разговора' },
        { title: 'Решение', text: 'Что выбирает проектировщик и почему' },
        { title: 'Артефакт', text: topic.deliverable },
        { title: 'Проверка', text: 'Как доказать полноту, корректность и применимость' },
      ],
    },
    {
      id: 'outcomes', section: 'Старт', type: 'bento', eyebrow: 'РЕЗУЛЬТАТЫ ОБУЧЕНИЯ',
      title: 'К концу темы вы сможете',
      cards: [
        { label: 'Объяснить', value: topic.concepts[0].principle, tone: 'red' },
        { label: 'Применить', value: topic.concepts[2].decision, tone: 'blue' },
        { label: 'Проверить', value: topic.concepts[5].check, tone: 'yellow' },
        { label: 'Защитить', value: topic.objective, tone: 'green' },
      ],
    },
    {
      id: 'artifact-path', section: 'Старт', type: 'interactive', eyebrow: 'АРТЕФАКТ ЗАНЯТИЯ',
      title: topic.deliverable, subtitle: 'На каждом следующем шаге добавляйте только то, что можете объяснить и проверить.',
      bullets: ['Укажите источник входных данных', 'Отделите факт от допущения', 'Зафиксируйте вариант и критерий выбора', 'Добавьте способ проверки результата'],
    },
    {
      id: 'diagnostic', section: 'Старт', type: 'quiz', eyebrow: 'ВХОДНАЯ ДИАГНОСТИКА',
      title: 'С чего начинается проектное решение?',
      quiz: {
        kind: 'single', prompt: 'Выберите первый обоснованный шаг.',
        options: ['Зафиксировать исходный факт и заинтересованную роль', 'Сразу нарисовать экран', 'Выбрать знакомую технологию'],
        answer: 'Зафиксировать исходный факт и заинтересованную роль',
        explanation: 'Интерфейс и технология появляются после понимания контекста, потребности и ограничения.',
      },
    },
    ...topic.concepts.flatMap((concept, index) => conceptSlides(topic, concept, index)),
    {
      id: 'practice-scenario', section: 'Практика', type: 'case', eyebrow: 'СИТУАЦИОННАЯ ЗАДАЧА',
      title: `Заказчик ${topic.caseName} просит «сделать удобно и быстро»`,
      subtitle: 'Разложите просьбу на наблюдаемый факт, открытый вопрос, требование и критерий проверки.',
      bullets: topic.concepts.slice(0, 4).map((concept) => `Проверьте аспект «${concept.name}»: ${concept.check}`), image: 'desk',
    },
    {
      id: 'practice-artifact', section: 'Практика', type: 'terminal', eyebrow: 'ШАБЛОН АРТЕФАКТА',
      title: `Черновик: ${topic.deliverable}`,
      code: ['ID: DEC-01', `Контекст: ${topic.caseContext}`, 'Источник: документ / интервью / наблюдение', 'Решение: …', 'Обоснование: …', 'Критерий проверки: …'].join('\n'),
    },
    {
      id: 'practice-compare', section: 'Практика', type: 'comparison', eyebrow: 'САМОПРОВЕРКА',
      title: 'Описание или проектная спецификация?',
      compare: {
        leftTitle: 'Описание', left: ['Рассказывает “вообще”', 'Не содержит идентификаторов', 'Нельзя провести проверку'],
        rightTitle: 'Спецификация', right: ['Ссылается на источник', 'Фиксирует решение и границы', 'Содержит критерий приёмки'],
      },
    },
    {
      id: 'practice-process', section: 'Практика', type: 'process', eyebrow: 'МИНИ-ЛАБОРАТОРНАЯ',
      title: 'Соберите решение за четыре шага',
      steps: [
        { title: '1 · Выберите', text: topic.concepts[1].name },
        { title: '2 · Найдите факт', text: topic.concepts[1].example },
        { title: '3 · Запишите решение', text: topic.concepts[1].decision },
        { title: '4 · Проверьте', text: topic.concepts[1].check },
      ],
    },
    {
      id: 'practice-schema', section: 'Практика', type: 'architecture', eyebrow: 'СВЯЗИ',
      title: 'Как тема встраивается в проект',
      steps: [
        { title: 'Вход', text: 'Документы, интервью, формы, выгрузки' },
        { title: 'Обработка', text: topic.title },
        { title: 'Выход', text: topic.deliverable },
        { title: 'Потребитель', text: 'Заказчик, проектировщик и разработчик' },
      ],
    },
    {
      id: 'practice-discussion', section: 'Практика', type: 'interactive', eyebrow: 'ОБСУЖДЕНИЕ В ПАРЕ',
      title: 'Защитите решение перед скептичным заказчиком',
      bullets: ['Один студент играет заказчика и задаёт «почему?»', 'Второй отвечает через факт, критерий и последствия', 'Поменяйтесь ролями через три минуты', 'Зафиксируйте вопрос, на который не хватило данных'],
    },
    {
      id: 'practice-review', section: 'Практика', type: 'cheatsheet', eyebrow: 'ЧЕК-ЛИСТ РЕВИЗИИ',
      title: 'Перед сдачей артефакта',
      bullets: topic.concepts.map((concept) => `${concept.name}: ${concept.check}`),
    },
    {
      id: 'practice-reflection', section: 'Практика', type: 'quiz', eyebrow: 'РЕФЛЕКСИЯ',
      title: 'Что в вашем решении пока остаётся допущением?',
      quiz: {
        kind: 'selfReview', prompt: 'Запишите одно допущение и способ его проверить у заказчика.',
        answer: ['Названо конкретное допущение', 'Указан источник проверки', 'Сформулирован проверяемый вопрос'],
        explanation: 'Хорошая рефлексия превращает скрытое предположение в управляемый вопрос.',
      },
    },
    {
      id: 'test-multi', section: 'Итоговый тест', type: 'quiz', eyebrow: 'ТЕСТ · 1 / 6', title: 'Признаки обоснованного решения',
      quiz: { kind: 'multi', prompt: 'Выберите все обязательные элементы.', options: ['Источник', 'Критерий проверки', 'Последствия', 'Любимый инструмент автора'], answer: ['Источник', 'Критерий проверки', 'Последствия'], explanation: 'Инструмент может быть вариантом, но не доказательством.' },
    },
    {
      id: 'test-order', section: 'Итоговый тест', type: 'quiz', eyebrow: 'ТЕСТ · 2 / 6', title: 'Восстановите порядок',
      quiz: { kind: 'ordering', prompt: 'Нажимайте элементы в правильной последовательности.', options: ['Зафиксировать факт', 'Сформировать варианты', 'Выбрать по критериям', 'Проверить результат'], answer: ['Зафиксировать факт', 'Сформировать варианты', 'Выбрать по критериям', 'Проверить результат'], explanation: 'Решение не должно появляться раньше факта и критериев.' },
    },
    {
      id: 'test-match', section: 'Итоговый тест', type: 'quiz', eyebrow: 'ТЕСТ · 3 / 6', title: 'Найдите корректные пары',
      quiz: { kind: 'matching', prompt: 'Отметьте все корректные соответствия.', options: [`Факт → ${topic.concepts[0].example}`, `Решение → ${topic.concepts[0].decision}`, `Проверка → ${topic.concepts[0].check}`, 'Допущение → подтверждённый факт'], answer: [`Факт → ${topic.concepts[0].example}`, `Решение → ${topic.concepts[0].decision}`, `Проверка → ${topic.concepts[0].check}`], explanation: 'Допущение перестаёт быть допущением только после проверки.' },
    },
    {
      id: 'test-diagram', section: 'Итоговый тест', type: 'quiz', eyebrow: 'ТЕСТ · 4 / 6', title: 'Выберите узел разрыва трассировки',
      quiz: { kind: 'diagram', prompt: 'Факт → ? → Артефакт → Проверка', options: ['Решение', 'Цвет интерфейса', 'Название файла'], answer: 'Решение', explanation: 'Артефакт фиксирует принятое проектное решение.' },
    },
    {
      id: 'test-short', section: 'Итоговый тест', type: 'quiz', eyebrow: 'ТЕСТ · 5 / 6', title: 'Короткий ответ',
      quiz: { kind: 'short', prompt: `Назовите главный результат темы «${topic.shortTitle}».`, answer: topic.deliverable, explanation: `Ожидаемый артефакт: ${topic.deliverable}. Допускается эквивалентная формулировка.` },
    },
    {
      id: 'test-self', section: 'Итоговый тест', type: 'quiz', eyebrow: 'ТЕСТ · 6 / 6', title: 'Экспертная самопроверка',
      quiz: { kind: 'selfReview', prompt: 'Объясните решение в 3–4 предложениях: факт, вариант, критерий, последствие.', answer: ['Есть исходный факт', 'Названо решение или выбранный вариант', 'Есть критерий', 'Описано последствие'], explanation: 'Сверьте ответ с четырьмя критериями и доработайте слабое место.' },
    },
    {
      id: 'cheat', section: 'Финиш', type: 'cheatsheet', eyebrow: 'ШПАРГАЛКА', title: topic.shortTitle,
      bullets: topic.concepts.map((concept) => `${concept.name} — ${concept.principle}`), citation: topic.sources[0],
    },
    {
      id: 'final', section: 'Финиш', type: 'final', eyebrow: 'ТЕМА ЗАВЕРШЕНА',
      title: `Готово: ${topic.deliverable}`, subtitle: `Теперь вы можете: ${topic.objective}`, image: 'tablet',
      quote: 'Следующий шаг — применить решение к собственному проекту и получить независимую ревизию.',
    },
    {
      id: 'questions', section: 'Финиш', type: 'questions', eyebrow: course.shortTitle.toUpperCase(),
      title: 'Вопросы от аудитории', subtitle: topic.title, image: 'desk',
    },
  ];
  if (slides.length !== 85) throw new Error(`Тема ${topic.id}: собрано ${slides.length} слайдов вместо 85`);
  return slides;
}
