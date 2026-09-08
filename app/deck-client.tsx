'use client';
/* oxlint-disable next/no-img-element */

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useReducedMotion } from 'motion/react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  BookOpenText,
  Expand,
  ExternalLink,
  FileDown,
  Gauge,
  Moon,
  Pause,
  Play,
  RotateCcw,
  Search,
  Sun,
  UserRoundPen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { assetUrl, SITE_BASE } from './assets';
import { buildDeck, type Course, type Quiz, type TeacherProfile, type Topic } from './course';
import { isQuizCorrect, type SavedAnswer } from './quiz-card';
import { SlideView } from './slide-view';

type DeckState = {
  current: number;
  dark: boolean;
  animation: boolean;
  answers: Record<string, SavedAnswer>;
};

const emptyState: DeckState = { current: 0, dark: false, animation: true, answers: {} };
const emptyTeacher: TeacherProfile = { fullName: '', position: '', department: '' };
const printRoute = `${SITE_BASE}${SITE_BASE ? '/print.html' : '/print'}`;

function storageKey(courseId: string, topicId: string) { return `${courseId}-deck-v3:${topicId}`; }
function teacherKey(courseId: string) { return `${courseId}-teacher-profile-v1`; }
function themeKey(courseId: string) { return `${courseId}-theme-v1`; }
function printHref(params: Record<string, string>) { return `${printRoute}?${new URLSearchParams(params).toString()}`; }
function parseState(value: string | null): DeckState | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<DeckState>;
    return {
      current: Number.isInteger(parsed.current) ? Number(parsed.current) : 0,
      dark: Boolean(parsed.dark),
      animation: parsed.animation !== false,
      answers: parsed.answers && typeof parsed.answers === 'object' ? parsed.answers : {},
    };
  } catch { return null; }
}
function clampSlide(value: unknown, length: number) {
  const index = typeof value === 'number' && Number.isInteger(value) ? value : 0;
  return Math.max(0, Math.min(Math.max(0, length - 1), index));
}
function isCorrect(answer: SavedAnswer | undefined, quiz: Quiz) {
  return Boolean(answer?.submitted && quiz.kind !== 'selfReview' && isQuizCorrect(answer.value, quiz));
}

function TeacherProfileDialog({
  course,
  teacher,
  onTeacherChange,
  open,
  onOpenChange,
  iconOnly = false,
}: {
  course: Course;
  teacher: TeacherProfile;
  onTeacherChange: (teacher: TeacherProfile) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  iconOnly?: boolean;
}) {
  const semesters = Array.from(new Set(course.topics.map((topic) => topic.semester))).sort((a, b) => a - b);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            size={iconOnly ? 'icon' : 'default'}
            className={iconOnly ? 'icon-control' : 'teacher-trigger'}
            aria-label="Данные преподавателя"
          />
        }
      >
        <UserRoundPen />{!iconOnly && 'Данные преподавателя'}
      </DialogTrigger>
      <DialogContent className="teacher-dialog">
        <DialogHeader>
          <DialogTitle>Данные преподавателя</DialogTitle>
          <DialogDescription>Профиль отображается на титульных слайдах и в печатных версиях.</DialogDescription>
        </DialogHeader>
        <div className="teacher-fields dialog-fields">
          <label htmlFor="teacher-full-name">
            <span>ФИО</span>
            <Input id="teacher-full-name" value={teacher.fullName} onChange={(event) => onTeacherChange({ ...teacher, fullName: event.target.value })} placeholder="Фамилия Имя Отчество" />
          </label>
          <label htmlFor="teacher-position">
            <span>Должность</span>
            <Input id="teacher-position" value={teacher.position} onChange={(event) => onTeacherChange({ ...teacher, position: event.target.value })} placeholder="Должность" />
          </label>
          <label htmlFor="teacher-department">
            <span>Кафедра или лаборатория</span>
            <Input id="teacher-department" value={teacher.department} onChange={(event) => onTeacherChange({ ...teacher, department: event.target.value })} placeholder="Подразделение" />
          </label>
        </div>
        <div className="profile-downloads">
          <strong>Студенческие версии курса</strong>
          <div>
            {semesters.map((semester) => (
              <Button
                variant="outline"
                nativeButton={false}
                key={semester}
                render={<a href={printHref({ semester: String(semester), mode: 'student', autoprint: '1' })} target="_blank" rel="noreferrer" aria-label={`Сохранить лекции за ${semester} семестр`} />}
              >
                <FileDown />{semester} семестр
              </Button>
            ))}
            <Button nativeButton={false} render={<a href={printHref({ all: '1', mode: 'student', autoprint: '1' })} target="_blank" rel="noreferrer" aria-label="Сохранить все лекции курса" />}>
              <FileDown />Все лекции
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TopicCatalog({
  course,
  onOpen,
  teacher,
  onTeacherChange,
  dark,
  onDarkChange,
  warning,
}: {
  course: Course;
  onOpen: (topic: Topic) => void;
  teacher: TeacherProfile;
  onTeacherChange: (teacher: TeacherProfile) => void;
  dark: boolean;
  onDarkChange: (dark: boolean) => void;
  warning?: string;
}) {
  const [query, setQuery] = useState('');
  const [semester, setSemester] = useState('all');
  const [teacherOpen, setTeacherOpen] = useState(false);
  const semesters = Array.from(new Set(course.topics.map((topic) => topic.semester))).sort((a, b) => a - b);
  const filtered = course.topics.filter((topic) => {
    const haystack = `${topic.number} ${topic.title} ${topic.shortTitle} ${topic.section}`.toLocaleLowerCase('ru');
    const matchesQuery = haystack.includes(query.trim().toLocaleLowerCase('ru'));
    return matchesQuery && (semester === 'all' || String(topic.semester) === semester);
  });

  return (
    <main className="catalog-shell catalog">
      <header className="catalog-header">
        <a className="brand-lockup" href={SITE_BASE || '/'} aria-label="Каталог курса">
          <img src={assetUrl('/brand/brand-mark.png')} alt="Фирменный знак Университета Синергия" />
          <span><strong>МДК.05.01 · ПиДИС</strong><small>{course.title}</small></span>
        </a>
        <nav aria-label="Действия каталога">
          <TeacherProfileDialog course={course} teacher={teacher} onTeacherChange={onTeacherChange} open={teacherOpen} onOpenChange={setTeacherOpen} />
          <Button className="icon-control" variant="outline" size="icon" onClick={() => onDarkChange(!dark)} aria-label={dark ? 'Включить светлую тему' : 'Включить тёмную тему'}>
            {dark ? <Sun /> : <Moon />}
          </Button>
        </nav>
      </header>

      {warning && <output className="notice">{warning}</output>}

      <section className="catalog-hero">
        <div className="hero-copy catalog-copy">
          <p className="eyebrow">{course.audience}</p>
          <h1>Проектирование и дизайн <span>информационных систем</span></h1>
          <p className="hero-lead">От запроса заказчика и модели предметной области — к обоснованному решению, понятному интерфейсу и проверяемому результату.</p>
          <div className="teacher-summary">
            <span>Преподаватель</span>
            <strong>{teacher.fullName || 'Данные можно заполнить перед занятием'}</strong>
            {teacher.position && <small>{teacher.position}</small>}
            {teacher.department && <small>{teacher.department}</small>}
          </div>
        </div>
        <div className="hero-mascot">
          <div className="chevron-backdrop" />
          <img className="catalog-rhino" src={assetUrl('/brand/rhino-wms.png')} alt="Носорог — проектировщик информационной системы для склада" />
        </div>
      </section>

      <section className="catalog-tools" aria-label="Поиск и фильтры">
        <label className="search-field search-box" htmlFor="topic-search">
          <Search aria-hidden="true" />
          <span className="sr-only">Поиск по темам</span>
          <Input id="topic-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Поиск по темам" />
        </label>
        <div className="semester-filter semester-tabs" aria-label="Фильтр по семестру">
          <button type="button" className={semester === 'all' ? 'is-active active' : ''} aria-pressed={semester === 'all'} onClick={() => setSemester('all')}>Все темы</button>
          {semesters.map((value) => (
            <button type="button" className={semester === String(value) ? 'is-active active' : ''} aria-pressed={semester === String(value)} key={value} onClick={() => setSemester(String(value))}>{value} семестр</button>
          ))}
        </div>
        <a className="materials-link" href={course.materialsUrl} target="_blank" rel="noreferrer"><BookOpen />Материалы<ExternalLink /></a>
      </section>

      <section className="topic-grid" aria-label="Лекционные темы">
        {filtered.map((topic) => {
          const periodIndex = semesters.indexOf(topic.semester);
          const style = {
            '--period-color': periodIndex === 0 ? 'var(--red)' : 'var(--blue)',
            '--period-ghost': periodIndex === 0 ? 'rgb(237 19 28 / 0.1)' : 'rgb(69 97 200 / 0.12)',
          } as CSSProperties;
          return (
            <article className="topic-card" data-topic-id={topic.id} data-period={periodIndex + 1} style={style} key={topic.id}>
              <div className="topic-card-top"><span className="topic-index">{String(topic.number).padStart(2, '0')}</span><span className="semester-tag">{topic.semester} семестр</span></div>
              <h2>{topic.shortTitle}</h2>
              <p>{topic.title}</p>
              <div className="topic-card-footer">
                <div className="topic-card-actions">
                  <Button
                    variant="outline"
                    nativeButton={false}
                    render={<a href={printHref({ topic: topic.id, mode: 'student', autoprint: '1' })} target="_blank" rel="noreferrer" aria-label={`Сохранить лекцию «${topic.title}» в PDF`} />}
                  >
                    <FileDown />Сохранить PDF
                  </Button>
                  <Button onClick={() => onOpen(topic)}>Открыть<ArrowRight /></Button>
                </div>
              </div>
            </article>
          );
        })}
      </section>

      {filtered.length === 0 && <section className="empty-state" aria-live="polite"><h2>Темы не найдены</h2><p>Измените запрос или выберите другой семестр.</p></section>}

      <footer className="catalog-footer"><span>МДК.05.01 · {course.shortTitle}</span><span>{course.topics.length} лекций · {semesters.join('–')} семестры</span></footer>
    </main>
  );
}

export function DeckClient({ course }: { course: Course }) {
  const reducedMotion = useReducedMotion();
  const [topicId, setTopicId] = useState<string | null>(null);
  const [state, setState] = useState<DeckState>(emptyState);
  const [teacher, setTeacher] = useState<TeacherProfile>(emptyTeacher);
  const [ready, setReady] = useState(false);
  const [replay, setReplay] = useState(0);
  const [tocOpen, setTocOpen] = useState(false);
  const [resultOpen, setResultOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [routeWarning, setRouteWarning] = useState('');
  const topic = course.topics.find((item) => item.id === topicId) ?? null;
  const slides = useMemo(() => topic ? buildDeck(topic, course) : [], [course, topic]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const savedTeacher = localStorage.getItem(teacherKey(course.id));
    const savedDark = localStorage.getItem(themeKey(course.id)) === 'dark';
    if (savedTeacher) {
      try { setTeacher(JSON.parse(savedTeacher) as TeacherProfile); } catch { localStorage.removeItem(teacherKey(course.id)); }
    }
    const id = params.get('topic');
    const selectedTopic = course.topics.find((item) => item.id === id);
    if (selectedTopic) {
      const parsed = parseState(localStorage.getItem(storageKey(course.id, selectedTopic.id))) ?? emptyState;
      const requested = Number(params.get('slide'));
      const deckLength = buildDeck(selectedTopic, course).length;
      const requestedIndex = Number.isInteger(requested) && requested > 0 ? requested - 1 : parsed.current;
      setState({ ...parsed, dark: savedDark, current: clampSlide(requestedIndex, deckLength) });
      setTopicId(selectedTopic.id);
    } else {
      setState((value) => ({ ...value, dark: savedDark }));
      if (id) {
        setRouteWarning('Тема из ссылки не найдена. Открыт полный каталог курса.');
        const cleanUrl = new URL(window.location.href);
        cleanUrl.searchParams.delete('topic');
        cleanUrl.searchParams.delete('slide');
        window.history.replaceState({}, '', cleanUrl);
      }
    }
    setReady(true);
  }, [course]);

  useEffect(() => { document.documentElement.classList.toggle('dark', state.dark); }, [state.dark]);
  useEffect(() => { if (ready) localStorage.setItem(themeKey(course.id), state.dark ? 'dark' : 'light'); }, [course.id, ready, state.dark]);
  useEffect(() => { if (ready) localStorage.setItem(teacherKey(course.id), JSON.stringify(teacher)); }, [course.id, ready, teacher]);

  useEffect(() => {
    if (!ready || !topic) return;
    localStorage.setItem(storageKey(course.id, topic.id), JSON.stringify(state));
    const url = new URL(window.location.href);
    url.searchParams.set('topic', topic.id);
    url.searchParams.set('slide', String(state.current + 1));
    window.history.replaceState({}, '', url);
  }, [course.id, ready, state, topic]);

  const go = useCallback((next: number) => {
    setState((value) => ({ ...value, current: Math.max(0, Math.min(slides.length - 1, next)) }));
  }, [slides.length]);

  useEffect(() => {
    if (!topic) return;
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (event.defaultPrevented || ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A'].includes(target.tagName) || target.isContentEditable || tocOpen || resultOpen || profileOpen) return;
      if (['ArrowRight', 'PageDown', ' '].includes(event.key)) { event.preventDefault(); go(state.current + 1); }
      if (['ArrowLeft', 'PageUp'].includes(event.key)) { event.preventDefault(); go(state.current - 1); }
      if (event.key === 'Home') { event.preventDefault(); go(0); }
      if (event.key === 'End') { event.preventDefault(); go(slides.length - 1); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, profileOpen, resultOpen, slides.length, state, tocOpen, topic]);

  const openTopic = (nextTopic: Topic) => {
    const saved = parseState(localStorage.getItem(storageKey(course.id, nextTopic.id)));
    const deckLength = buildDeck(nextTopic, course).length;
    setState((current) => ({ ...(saved ?? emptyState), current: clampSlide(saved?.current, deckLength), dark: current.dark }));
    setRouteWarning('');
    setTopicId(nextTopic.id);
  };
  const closeTopic = () => {
    setTopicId(null);
    window.history.replaceState({}, '', window.location.pathname);
  };
  const fullscreen = async () => {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  };

  if (!ready) return <main className="loading-shell">Загрузка курса…</main>;
  if (!topic) return <TopicCatalog course={course} onOpen={openTopic} teacher={teacher} onTeacherChange={setTeacher} dark={state.dark} onDarkChange={(dark) => setState((value) => ({ ...value, dark }))} warning={routeWarning} />;

  const currentSlide = slides[state.current];
  const quizSlides = slides.filter((slide) => slide.quiz && slide.quiz.kind !== 'selfReview');
  const correct = quizSlides.filter((slide) => slide.quiz && isCorrect(state.answers[slide.id], slide.quiz));
  const errors = quizSlides.filter((slide) => state.answers[slide.id]?.submitted && slide.quiz && !isCorrect(state.answers[slide.id], slide.quiz));
  const unanswered = quizSlides.filter((slide) => !state.answers[slide.id]?.submitted);
  const neighbors = [state.current - 1, state.current, state.current + 1].filter((index) => index >= 0 && index < slides.length);
  const percent = Math.round(((state.current + 1) / slides.length) * 100);
  const motionEnabled = state.animation && !reducedMotion;

  return (
    <main className="deck-shell">
      <header className="deck-toolbar">
        <Button className="deck-catalog" variant="outline" onClick={closeTopic}><ArrowLeft />Каталог</Button>
        <div className="deck-topic"><strong>{topic.title}</strong><span>{topic.semester} семестр</span></div>
        <div className="toolbar-actions">
          <Dialog open={tocOpen} onOpenChange={setTocOpen}>
            <DialogTrigger render={<Button className="icon-control" variant="outline" size="icon" aria-label="Открыть содержание" />}><BookOpenText /></DialogTrigger>
            <DialogContent className="toc-dialog">
              <DialogHeader><DialogTitle>Содержание темы</DialogTitle><DialogDescription>{topic.shortTitle}</DialogDescription></DialogHeader>
              <nav className="toc-list" aria-label="Экраны темы">
                {slides.map((slide, index) => (
                  <button type="button" key={slide.id} data-slide-id={slide.id} onClick={() => { go(index); setTocOpen(false); }} className={index === state.current ? 'is-current active' : ''} aria-current={index === state.current ? 'page' : undefined}>
                    <span>{String(index + 1).padStart(2, '0')}</span><strong>{slide.title}</strong>
                  </button>
                ))}
              </nav>
            </DialogContent>
          </Dialog>

          <Dialog open={resultOpen} onOpenChange={setResultOpen}>
            <DialogTrigger render={<Button className="icon-control" variant="outline" size="icon" aria-label="Открыть результаты" />}><Gauge /></DialogTrigger>
            <DialogContent className="result-dialog">
              <DialogHeader><DialogTitle>Результат по теме</DialogTitle><DialogDescription>{topic.title}</DialogDescription></DialogHeader>
              <div className="score-grid"><div className="score-correct"><b>{correct.length}</b><span>правильно</span></div><div className="score-wrong"><b>{errors.length}</b><span>с ошибкой</span></div><div className="score-empty"><b>{unanswered.length}</b><span>без ответа</span></div></div>
              {errors.length > 0 && <div className="error-review"><h3>Разобрать ошибки</h3>{errors.map((slide) => { const saved = state.answers[slide.id]; return <button type="button" key={slide.id} onClick={() => { go(slides.indexOf(slide)); setResultOpen(false); }}><b>{slides.indexOf(slide) + 1}. {slide.quiz?.prompt}</b><span>Ваш ответ: {Array.isArray(saved?.value) ? saved.value.join(', ') : saved?.value}</span><span>Правильный ответ: {Array.isArray(slide.quiz?.answer) ? slide.quiz.answer.join(', ') : slide.quiz?.answer}</span></button>; })}</div>}
              <div className="source-links"><h3>Источники темы</h3>{topic.sources.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.label}</a>)}</div>
              <Button variant="outline" onClick={() => setState((value) => ({ ...value, answers: {} }))}><RotateCcw />Сбросить результаты</Button>
            </DialogContent>
          </Dialog>

          <TeacherProfileDialog course={course} teacher={teacher} onTeacherChange={setTeacher} open={profileOpen} onOpenChange={setProfileOpen} iconOnly />
          <Button className="icon-control" variant="outline" size="icon" onClick={() => setState((value) => ({ ...value, animation: !value.animation }))} aria-label={state.animation ? 'Выключить анимацию' : 'Включить анимацию'}>{state.animation ? <Pause /> : <Play />}</Button>
          <Button className="icon-control replay-control" variant="outline" size="icon" onClick={() => setReplay((value) => value + 1)} aria-label="Повторить анимацию"><RotateCcw /></Button>
          <Button className="icon-control theme-control" variant="outline" size="icon" onClick={() => setState((value) => ({ ...value, dark: !value.dark }))} aria-label={state.dark ? 'Включить светлую тему' : 'Включить тёмную тему'}>{state.dark ? <Sun /> : <Moon />}</Button>
          <Button className="icon-control" variant="outline" size="icon" onClick={() => void fullscreen()} aria-label="Полноэкранный режим"><Expand /></Button>
        </div>
      </header>

      <progress className="deck-progress progress-track" max={slides.length} value={state.current + 1} aria-valuemin={1} aria-valuemax={slides.length} aria-valuenow={state.current + 1} aria-label={`Экран ${state.current + 1} из ${slides.length}`}>{percent}%</progress>

      <section className="stage-wrap player-stage">
        <p className="sr-only" aria-live="polite">Экран {state.current + 1} из {slides.length}: {currentSlide.title}</p>
        <div className="stage active-slide">
          {neighbors.map((index) => {
            const slide = slides[index];
            const active = index === state.current;
            return (
              <div className={`stage-layer ${active ? 'is-current' : 'is-neighbor'}`} aria-hidden={!active} key={active ? `${slide.id}-${replay}` : slide.id}>
                <SlideView course={course} topic={topic} slide={slide} index={index} total={slides.length} active={active} animation={active && motionEnabled} saved={state.answers[slide.id]} onAnswer={(answer) => setState((value) => ({ ...value, answers: { ...value.answers, [slide.id]: answer } }))} teacher={teacher} />
              </div>
            );
          })}
        </div>
      </section>

      <footer className="deck-controls">
        <Button variant="outline" onClick={() => go(state.current - 1)} disabled={state.current === 0} aria-label="Предыдущий экран"><ArrowLeft />Назад</Button>
        <button type="button" className="progress-block slide-counter" onClick={() => setTocOpen(true)} aria-label="Открыть содержание презентации"><span>{state.current + 1} / {slides.length}</span></button>
        <Button className="deck-pdf" variant="outline" onClick={() => window.open(printHref({ topic: topic.id, mode: 'teacher', autoprint: '1' }), '_blank', 'noopener,noreferrer')}><FileDown />PDF преподавателя</Button>
        <Button onClick={() => go(state.current + 1)} disabled={state.current === slides.length - 1} aria-label="Следующий экран">Вперёд<ArrowRight /></Button>
      </footer>
    </main>
  );
}
