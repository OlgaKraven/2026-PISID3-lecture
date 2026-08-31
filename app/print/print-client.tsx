'use client';

import { useEffect, useState } from 'react';
import { buildDeck, type TeacherProfile, type Topic } from '../course';
import { course } from '../course-data';
import { SlideView } from '../slide-view';

declare global { interface Window { __DECK_READY__?: boolean } }

export function PrintClient() {
  const [topic, setTopic] = useState<Topic | null>(null);
  const [mode, setMode] = useState<'student' | 'teacher'>('student');
  const [teacher, setTeacher] = useState<TeacherProfile>({ fullName: '', position: '', department: '' });
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const selected = course.topics.find((item) => item.id === params.get('topic')) ?? course.topics[0];
    setTopic(selected);
    setMode(params.get('mode') === 'teacher' ? 'teacher' : 'student');
    const savedTeacher = localStorage.getItem(`${course.id}-teacher-profile-v1`);
    if (savedTeacher) setTeacher(JSON.parse(savedTeacher) as TeacherProfile);
  }, []);
  useEffect(() => {
    if (!topic) return;
    void Promise.all([document.fonts.ready, ...Array.from(document.images).map((image) => image.complete ? Promise.resolve() : new Promise<void>((resolve) => { image.addEventListener('load', () => resolve(), { once: true }); image.addEventListener('error', () => resolve(), { once: true }); }))]).then(() => requestAnimationFrame(() => { window.__DECK_READY__ = true; }));
  }, [teacher, topic]);
  if (!topic) return <main className="loading-shell">Подготовка печатной версии…</main>;
  const slides = buildDeck(topic, course);
  return <main className={`print-deck print-${mode}`}>{slides.map((slide, index) => <div className="print-page" key={slide.id}><SlideView course={course} topic={topic} slide={slide} index={index} total={slides.length} teacher={teacher} printMode={mode} animation={false} /></div>)}</main>;
}
