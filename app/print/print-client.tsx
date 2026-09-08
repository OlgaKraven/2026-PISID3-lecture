'use client';

import { useEffect, useState } from 'react';
import { buildDeck, type TeacherProfile, type Topic } from '../course';
import { course } from '../course-data';
import { SlideView } from '../slide-view';

declare global { interface Window { __DECK_READY__?: boolean } }

export function PrintClient() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [mode, setMode] = useState<'student' | 'teacher'>('student');
  const [teacher, setTeacher] = useState<TeacherProfile>({ fullName: '', position: '', department: '' });
  const [error, setError] = useState('');
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedTopic = params.get('topic');
    const requestedSemester = params.get('semester');
    const selected = requestedTopic ? course.topics.find((item) => item.id === requestedTopic) : undefined;
    const semester = requestedSemester ? Number(requestedSemester) : null;
    let selectedTopics: Topic[] = [];
    if (params.get('all') === '1') selectedTopics = course.topics;
    else if (requestedSemester && Number.isInteger(semester)) selectedTopics = course.topics.filter((item) => item.semester === semester);
    else if (requestedTopic && selected) selectedTopics = [selected];
    else if (!requestedTopic && !requestedSemester) selectedTopics = [course.topics[0]];
    if (selectedTopics.length === 0) {
      setError('Печатная версия не найдена: проверьте тему или семестр в ссылке.');
      return;
    }
    setTopics(selectedTopics);
    setMode(params.get('mode') === 'teacher' ? 'teacher' : 'student');
    const savedTeacher = localStorage.getItem(`${course.id}-teacher-profile-v1`);
    if (savedTeacher) {
      try { setTeacher(JSON.parse(savedTeacher) as TeacherProfile); } catch { localStorage.removeItem(`${course.id}-teacher-profile-v1`); }
    }
  }, []);
  useEffect(() => {
    if (topics.length === 0) return;
    void Promise.all([document.fonts.ready, ...Array.from(document.images).map((image) => image.complete ? Promise.resolve() : new Promise<void>((resolve) => { image.addEventListener('load', () => resolve(), { once: true }); image.addEventListener('error', () => resolve(), { once: true }); }))]).then(() => requestAnimationFrame(() => { window.__DECK_READY__ = true; if (new URLSearchParams(window.location.search).get('autoprint') === '1') window.print(); }));
  }, [teacher, topics]);
  if (error) return <main className="route-error"><h1>Печатная версия недоступна</h1><p>{error}</p></main>;
  if (topics.length === 0) return <main className="loading-shell">Подготовка печатной версии…</main>;
  return <main className={`print-deck print-${mode}`}>{topics.flatMap((topic) => { const slides = buildDeck(topic, course); return slides.map((slide, index) => <div className="print-page" key={`${topic.id}-${slide.id}`}><SlideView course={course} topic={topic} slide={slide} index={index} total={slides.length} teacher={teacher} printMode={mode} animation={false} /></div>); })}</main>;
}
