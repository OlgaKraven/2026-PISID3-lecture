# ПиДИС · 3 курс

Интерактивные лекции по МДК.05.01 «Проектирование и дизайн информационных систем» для 5–6 семестров.

- 26 лекционных тем;
- полная колода каждой темы: титульный лист, тема семестра, литература с QR-кодами, учебные вопросы, блоки для конспекта, четыре самопроверки после каждого вопроса, практика и вопросы от аудитории;
- реалистичный сквозной кейс WMS;
- настраиваемые ФИО, должность и кафедра / лаборатория преподавателя с сохранением в браузере и переносом в PDF;
- студенческая и преподавательская печатные версии;
- адаптивный интерфейс, содержание с прокруткой, клавиатурная навигация и полноэкранный режим.

## Локальный запуск

```bash
npm ci
npx playwright install chromium
npm run dev -- --host 127.0.0.1 --port 4173
```

## Проверка и сборка

```bash
npm run lint
npm run spellcheck
npx tsc --noEmit --incremental false
npm run audit:content
npm run validate:qr
npm run test:smoke
npm run build
```

Если локальный просмотр этого курса уже работает на `http://localhost:3000`, smoke-проверка автоматически использует его. Другой адрес можно передать через `SMOKE_BASE_URL`.

Статическая сборка для GitHub Pages:

```bash
GITHUB_PAGES=true NEXT_PUBLIC_BASE_PATH=/2026-PISID3-lecture npm run build:pages
```

PDF одной темы или всего курса:

```bash
npm run export:pdf -- --topic 01-project-decisions
npm run export:pdf
```

Файлы сохраняются в `outputs/pdf/student` и `outputs/pdf/teacher`.

## Публикация

Workflow `.github/workflows/pages.yml` собирает `dist/client` и публикует сайт через GitHub Pages при отправке изменений в `main` или ручном запуске.
