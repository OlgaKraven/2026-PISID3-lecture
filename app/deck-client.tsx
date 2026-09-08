'use client';
/* oxlint-disable next/no-img-element */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, BarChart3, BookOpen, Expand, Grid3X3, Moon, Printer, RotateCcw, Search, Sparkles, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { assetUrl, SITE_BASE } from './assets';
import { buildDeck, type Course, type Quiz, type TeacherProfile, type Topic } from './course';
import { isQuizCorrect, type SavedAnswer } from './quiz-card';
import { SlideView } from './slide-view';

type DeckState = { current: number; dark: boolean; animation: boolean; answers: Record<string, SavedAnswer> };
const emptyState: DeckState = { current: 0, dark: false, animation: true, answers: {} };
const emptyTeacher: TeacherProfile = { fullName: '', position: '', department: '' };

function storageKey(courseId: string, topicId: string) { return `${courseId}-deck-v2:${topicId}`; }
function teacherKey(courseId: string) { return `${courseId}-teacher-profile-v1`; }
function themeKey(courseId: string) { return `${courseId}-theme-v1`; }
function isCorrect(answer: SavedAnswer | undefined, quiz: Quiz) {
  return Boolean(answer?.submitted && quiz.kind !== 'selfReview' && isQuizCorrect(answer.value, quiz));
}

function TopicCatalog({ course, onOpen, teacher, onTeacherChange, dark, onDarkChange }: { course: Course; onOpen: (topic: Topic) => void; teacher: TeacherProfile; onTeacherChange: (teacher: TeacherProfile) => void; dark: boolean; onDarkChange: (dark: boolean) => void }) {
  const [query, setQuery] = useState('');
  const [semester, setSemester] = useState('all');
  const semesters = Array.from(new Set(course.topics.map((topic) => topic.semester))).sort((a, b) => a - b);
  const filtered = course.topics.filter((topic) => {
    const matchesQuery = `${topic.number} ${topic.title} ${topic.tags.join(' ')}`.toLocaleLowerCase('ru').includes(query.toLocaleLowerCase('ru'));
    return matchesQuery && (semester === 'all' || String(topic.semester) === semester);
  });
  return (
    <main className="catalog-shell">
      <header className="catalog-header">
        <img src={assetUrl('/favicon.png')} alt="Университет Синергия" />
        <div>
          <Dialog>
            <DialogTrigger render={<Button variant="outline" />}>Данные преподавателя</DialogTrigger>
            <DialogContent className="teacher-dialog">
              <DialogHeader><DialogTitle>Данные преподавателя</DialogTitle><DialogDescription>Данные появятся на титульных слайдах и в печатных версиях.</DialogDescription></DialogHeader>
              <div className="teacher-fields dialog-fields">
                <Input aria-label="ФИО преподавателя" value={teacher.fullName} onChange={(event) => onTeacherChange({ ...teacher, fullName: event.target.value })} placeholder="ФИО преподавателя" />
                <Input aria-label="Должность преподавателя" value={teacher.position} onChange={(event) => onTeacherChange({ ...teacher, position: event.target.value })} placeholder="Должность" />
                <Input aria-label="Кафедра или лаборатория преподавателя" value={teacher.department} onChange={(event) => onTeacherChange({ ...teacher, department: event.target.value })} placeholder="Кафедра или лаборатория" />
              </div>
              <div className="print-actions">
                {[5, 6].map((value) => <Button variant="outline" key={value} onClick={() => window.open(`${SITE_BASE}${SITE_BASE ? '/print.html' : '/print'}?semester=${value}&mode=student&autoprint=1`, '_blank')}>Сохранить лекции за {value} семестр в PDF</Button>)}
                <Button onClick={() => window.open(`${SITE_BASE}${SITE_BASE ? '/print.html' : '/print'}?all=1&mode=student&autoprint=1`, '_blank')}>Сохранить все лекции в PDF</Button>
              </div>
            </DialogContent>
          </Dialog>
          <div className="theme-switch"><span>{dark ? 'Тёмная тема' : 'Светлая тема'}</span><Switch checked={dark} onCheckedChange={onDarkChange} aria-label="Переключить светлую и тёмную тему" /></div>
        </div>
      </header>
      <header className="catalog-hero">
        <div className="catalog-copy">
          <p className="eyebrow">{course.audience}</p>
          <h1>{course.title}</h1>
          <p>{course.subtitle}</p>
          <div className="catalog-metrics">
            <span><b>{course.topics.length}</b> лекционных тем</span>
            <span><b>{semesters.length}</b> {semesters.length === 1 ? 'семестр' : 'семестра'}</span>
          </div>
        </div>
        <img className="catalog-rhino" src={assetUrl('/brand/rhino-wms.png')} alt="Фирменный носорог-проектировщик WMS" />
      </header>
      <section className="catalog-content">
        <div className="catalog-filters">
          <div className="search-box"><Search /><Input aria-label="Найти тему или понятие" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Найти тему или понятие" /></div>
          <div className="semester-tabs" aria-label="Фильтр по семестру">
            {[['all', 'Все'], ...semesters.map((value) => [String(value), `${value} семестр`])].map(([value, label]) => <button className={semester === value ? 'is-active' : ''} key={value} onClick={() => setSemester(value)}>{label}</button>)}
          </div>
        </div>
        <div className="topic-grid">
          {filtered.map((topic) => (
            <article className="topic-card" data-topic-id={topic.id} key={topic.id}>
              <div className="topic-card-top"><span>Лекция {topic.number}</span><span>{topic.semester} семестр</span></div>
              <p>{topic.section}</p>
              <h2>{topic.title}</h2>
              <div className="tag-row">{topic.tags.slice(0, 3).map((tag) => <span key={tag}>{tag}</span>)}</div>
              <p className="topic-result"><b>Результат:</b> {topic.deliverable}</p>
              <Button onClick={() => onOpen(topic)}>Открыть <ArrowRight /></Button>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

export function DeckClient({ course }: { course: Course }) {
  const [topicId, setTopicId] = useState<string | null>(null);
  const [state, setState] = useState<DeckState>(emptyState);
  const [teacher, setTeacher] = useState<TeacherProfile>(emptyTeacher);
  const [ready, setReady] = useState(false);
  const [replay, setReplay] = useState(0);
  const [tocOpen, setTocOpen] = useState(false);
  const [resultOpen, setResultOpen] = useState(false);
  const [revealStep, setRevealStep] = useState(0);
  const topic = course.topics.find((item) => item.id === topicId) ?? null;
  const slides = useMemo(() => topic ? buildDeck(topic, course) : [], [course, topic]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const savedTeacher = localStorage.getItem(teacherKey(course.id));
    const savedDark = localStorage.getItem(themeKey(course.id)) === 'dark';
    if (savedTeacher) setTeacher(JSON.parse(savedTeacher) as TeacherProfile);
    const id = params.get('topic');
    const selectedTopic = course.topics.find((item) => item.id === id);
    if (selectedTopic) {
      const saved = localStorage.getItem(storageKey(course.id, selectedTopic.id));
      const parsed = saved ? JSON.parse(saved) as DeckState : emptyState;
      const requested = Number(params.get('slide'));
      const deckLength = buildDeck(selectedTopic, course).length;
      setState({ ...parsed, dark: savedDark, current: Number.isFinite(requested) && requested > 0 ? Math.min(deckLength - 1, requested - 1) : Math.min(deckLength - 1, parsed.current) });
      setTopicId(selectedTopic.id);
    } else setState((value) => ({ ...value, dark: savedDark }));
    setReady(true);
  }, [course]);

  useEffect(() => { document.documentElement.classList.toggle('dark', state.dark); }, [state.dark]);
  useEffect(() => { if (ready) localStorage.setItem(themeKey(course.id), state.dark ? 'dark' : 'light'); }, [course.id, ready, state.dark]);
  useEffect(() => {
    if (ready) localStorage.setItem(teacherKey(course.id), JSON.stringify(teacher));
  }, [course.id, ready, teacher]);

  useEffect(() => {
    if (!ready || !topic) return;
    localStorage.setItem(storageKey(course.id, topic.id), JSON.stringify(state));
    const url = new URL(window.location.href);
    url.searchParams.set('topic', topic.id);
    url.searchParams.set('slide', String(state.current + 1));
    window.history.replaceState({}, '', url);
  }, [course.id, ready, state, topic]);

  const go = useCallback((next: number) => { setRevealStep(0); setState((value) => ({ ...value, current: Math.max(0, Math.min(slides.length - 1, next)) })); }, [slides.length]);
  const revealCount = Math.max(slides[state.current]?.cards?.length ?? 0, slides[state.current]?.steps?.length ?? 0, slides[state.current]?.bullets?.length ?? 0) - 1;
  useEffect(() => {
    if (!topic) return;
    const onKey = (event: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((event.target as HTMLElement).tagName)) return;
      if (['ArrowRight', 'PageDown', ' '].includes(event.key)) { event.preventDefault(); if (revealStep < revealCount) setRevealStep((value) => value + 1); else go(state.current + 1); }
      if (['ArrowLeft', 'PageUp'].includes(event.key)) { event.preventDefault(); go(state.current - 1); }
      if (event.key === 'Home') { event.preventDefault(); go(0); }
      if (event.key === 'End') { event.preventDefault(); go(slides.length - 1); }
      if (event.key.toLocaleLowerCase('ru') === 'r') setReplay((value) => value + 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, revealCount, revealStep, slides.length, state, topic]);

  const openTopic = (nextTopic: Topic) => {
    const saved = localStorage.getItem(storageKey(course.id, nextTopic.id));
    setState((current) => ({ ...(saved ? JSON.parse(saved) as DeckState : emptyState), dark: current.dark }));
    setTopicId(nextTopic.id);
  };
  const closeTopic = () => {
    setTopicId(null);
    window.history.replaceState({}, '', `${window.location.pathname}`);
  };
  const fullscreen = () => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
  const reset = () => {
    if (!topic) return;
    localStorage.removeItem(storageKey(course.id, topic.id));
    setState((value) => ({ ...emptyState, dark: value.dark }));
  };

  if (!ready) return <main className="loading-shell">Загрузка курса…</main>;
  if (!topic) return <TopicCatalog course={course} onOpen={openTopic} teacher={teacher} onTeacherChange={setTeacher} dark={state.dark} onDarkChange={(dark) => setState((value) => ({ ...value, dark }))} />;

  const currentSlide = slides[state.current];
  const quizSlides = slides.filter((slide) => slide.quiz);
  const correct = quizSlides.filter((slide) => slide.quiz && isCorrect(state.answers[slide.id], slide.quiz));
  const errors = quizSlides.filter((slide) => state.answers[slide.id]?.submitted && slide.quiz && slide.quiz.kind !== 'selfReview' && !isCorrect(state.answers[slide.id], slide.quiz));
  const unanswered = quizSlides.filter((slide) => !state.answers[slide.id]?.submitted);
  const neighbors = [state.current - 1, state.current, state.current + 1].filter((index) => index >= 0 && index < slides.length);

  return (
    <main className="deck-shell">
      <header className="deck-toolbar">
        <button className="deck-id" onClick={closeTopic} title="Вернуться в каталог">
          <img src={assetUrl('/favicon.png')} alt="" /><span>{course.shortTitle} · Лекция {topic.number}</span>
        </button>
        <div className="toolbar-actions">
          <div className="toggle-label" title="Анимация"><Sparkles aria-hidden="true" /><Switch checked={state.animation} onCheckedChange={(animation) => setState((value) => ({ ...value, animation }))} aria-label="Включить анимацию" /></div>
          <Button variant="ghost" size="icon" onClick={() => setState((value) => ({ ...value, dark: !value.dark }))} aria-label="Сменить тему">{state.dark ? <Sun /> : <Moon />}</Button>
          <Button variant="ghost" size="icon" onClick={fullscreen} aria-label="Полноэкранный режим"><Expand /></Button>
          <Button variant="ghost" size="icon" onClick={() => window.open(`${SITE_BASE}${SITE_BASE ? '/print.html' : '/print'}?topic=${topic.id}&mode=student`, '_blank')} aria-label="Версия для печати"><Printer /></Button>
          <Dialog open={resultOpen} onOpenChange={setResultOpen}>
            <DialogTrigger render={<Button variant="outline" size="sm" />}><BarChart3 /> Результат</DialogTrigger>
            <DialogContent className="result-dialog">
              <DialogHeader><DialogTitle>Результат по теме</DialogTitle><DialogDescription>{topic.title}</DialogDescription></DialogHeader>
              <div className="score-grid"><div className="score-correct"><b>{correct.length}</b><span>правильных</span></div><div className="score-wrong"><b>{errors.length}</b><span>неправильных</span></div><div className="score-empty"><b>{unanswered.length}</b><span>без ответа</span></div></div>
              {errors.length > 0 && <div className="error-review"><h3>Разобрать ошибки</h3>{errors.map((slide) => { const saved = state.answers[slide.id]; return <button key={slide.id} onClick={() => { go(slides.indexOf(slide)); setResultOpen(false); }}><b>{slides.indexOf(slide) + 1}. {slide.quiz?.prompt}</b><span>Ваш ответ: {Array.isArray(saved?.value) ? saved.value.join(', ') : saved?.value}</span><span>Правильный ответ: {Array.isArray(slide.quiz?.answer) ? slide.quiz.answer.join(', ') : slide.quiz?.answer}</span></button>; })}</div>}
              <div className="source-links"><h3>Источники темы</h3>{topic.sources.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.label}</a>)}</div>
              <Button variant="outline" onClick={() => setState((value) => ({ ...value, answers: {} }))}><RotateCcw /> Пройти тесты заново</Button>
            </DialogContent>
          </Dialog>
          <Dialog open={tocOpen} onOpenChange={setTocOpen}>
            <DialogTrigger render={<Button variant="outline" size="sm" />}><BookOpen /> Содержание</DialogTrigger>
            <DialogContent className="toc-dialog">
              <DialogHeader><DialogTitle>Содержание темы</DialogTitle><DialogDescription>{topic.shortTitle}</DialogDescription></DialogHeader>
              <nav className="toc-list">{slides.map((slide, index) => <button key={slide.id} onClick={() => { go(index); setTocOpen(false); }} className={index === state.current ? 'is-current' : ''}><span>{String(index + 1).padStart(2, '0')}</span>{slide.title}</button>)}</nav>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <div className="deck-progress" aria-label={`Пройдено ${state.current + 1} из ${slides.length}`}><span style={{ width: `${((state.current + 1) / slides.length) * 100}%` }} /></div>

      <div className="stage-wrap" aria-live="polite">
        <div className="stage">
          {neighbors.map((index) => {
            const slide = slides[index];
            const active = index === state.current;
            return <div className={`stage-layer ${active ? 'is-current' : 'is-neighbor'}`} aria-hidden={!active} key={active ? `${slide.id}-${replay}` : slide.id}><SlideView course={course} topic={topic} slide={slide} index={index} total={slides.length} active={active} animation={active && state.animation} saved={state.answers[slide.id]} onAnswer={(answer) => setState((value) => ({ ...value, answers: { ...value.answers, [slide.id]: answer } }))} teacher={teacher} revealStep={active ? revealStep : 99} onReveal={() => setRevealStep((value) => value + 1)} /></div>;
          })}
        </div>
      </div>

      <footer className="deck-controls">
        <Button variant="ghost" size="icon" onClick={closeTopic} aria-label="Каталог тем"><Grid3X3 /></Button>
        <Button variant="outline" size="icon-lg" onClick={() => go(state.current - 1)} disabled={state.current === 0} aria-label="Предыдущий экран"><ArrowLeft /></Button>
        <button className="progress-block" onClick={() => setTocOpen(true)} aria-label="Открыть содержание презентации"><Progress value={((state.current + 1) / slides.length) * 100} aria-label="Прогресс презентации" /><span>{state.current + 1} / {slides.length} · {currentSlide.section}</span></button>
        <Button variant="default" size="icon-lg" onClick={() => go(state.current + 1)} disabled={state.current === slides.length - 1} aria-label="Следующий экран"><ArrowRight /></Button>
        <Button variant="ghost" size="icon" onClick={reset} aria-label="Сбросить прогресс"><RotateCcw /></Button>
      </footer>
    </main>
  );
}
