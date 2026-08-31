'use client';
/* oxlint-disable next/no-img-element */

import { motion } from 'motion/react';
import { ExternalLink } from 'lucide-react';
import { Input } from '@/components/ui/input';
import type { Course, Slide, TeacherProfile, Topic } from './course';
import { assetUrl } from './assets';
import { QuizCard, type SavedAnswer } from './quiz-card';

const toneClass = { red: 'tone-red', yellow: 'tone-yellow', green: 'tone-green', blue: 'tone-blue' };

export function SlideView({ course, topic, slide, index, total, active = false, animation = true, saved, onAnswer, teacher, onTeacherChange, printMode }: {
  course: Course;
  topic: Topic;
  slide: Slide;
  index: number;
  total: number;
  active?: boolean;
  animation?: boolean;
  saved?: SavedAnswer;
  onAnswer?: (answer: SavedAnswer) => void;
  teacher: TeacherProfile;
  onTeacherChange?: (teacher: TeacherProfile) => void;
  printMode?: 'student' | 'teacher';
}) {
  const showTeacherFooter = ['course-theme', 'divider', 'questions'].includes(slide.type) || (slide.type === 'title' && Boolean(printMode));
  const showSideOrnament = ['course-theme', 'divider', 'literature', 'materials', 'questions'].includes(slide.type);
  const content = (
    <article className={`slide slide-${slide.type} ${active ? 'is-active' : ''}`} aria-label={`Экран ${index + 1}: ${slide.title}`} data-slide-id={slide.id}>
      <div className="slide-chrome">
        <img className="brand-logo" src={assetUrl('/brand/synergy-logo.webp')} alt="Университет Синергия" />
        <span>{course.shortTitle} · Лекция {topic.number}</span>
        <span>{String(index + 1).padStart(2, '0')} / {total}</span>
      </div>
      <div className="slide-grid">
        <header className="slide-heading">
          {slide.eyebrow && <p className="eyebrow">{slide.eyebrow}</p>}
          <h1>{slide.title}</h1>
          {slide.subtitle && <p className="subtitle">{slide.subtitle}</p>}
        </header>

        {slide.cards && <div className="bento-grid">{slide.cards.map((card) => <div className={`bento-card ${toneClass[card.tone ?? 'red']}`} key={`${card.label}-${card.value}`}><span>{card.label}</span><strong>{card.value}</strong></div>)}</div>}
        {slide.steps && <div className="step-grid">{slide.steps.map((step) => <div className="step-card" key={`${step.title}-${step.text}`}><strong>{step.title}</strong><span>{step.text}</span></div>)}</div>}
        {slide.bullets && <ul className="bullet-list">{slide.bullets.map((item) => <li key={item}>{item}</li>)}</ul>}
        {slide.compare && <div className="compare-grid"><section className="compare-left"><h2>{slide.compare.leftTitle}</h2><ul>{slide.compare.left.map((item) => <li key={item}>{item}</li>)}</ul></section><section className="compare-right"><h2>{slide.compare.rightTitle}</h2><ul>{slide.compare.right.map((item) => <li key={item}>{item}</li>)}</ul></section></div>}
        {slide.code && <pre className="code-card"><code>{slide.code}</code></pre>}
        {slide.quote && <blockquote>{slide.quote}</blockquote>}
        {slide.quiz && <QuizCard quiz={slide.quiz} saved={saved} onChange={onAnswer} printMode={printMode} />}
        {slide.materialUrl && (
          <div className="materials-panel">
            <div className="qr-frame">
              <img className="qr-code" src={assetUrl(`/qr/${course.id}-materials.svg`)} alt={`QR-код материалов ${course.shortTitle}`} />
              <img className="qr-mark" src={assetUrl('/brand/brand-mark.webp')} alt="" />
              <strong>Просканируй меня</strong>
            </div>
            <div className="material-link"><span>Ссылка на материалы</span><a href={slide.materialUrl} target="_blank" rel="noreferrer">{slide.materialUrl}</a></div>
          </div>
        )}
        {slide.type === 'title' && !printMode && onTeacherChange && (
          <div className="teacher-editor">
            <strong>Данные преподавателя</strong>
            <Input aria-label="ФИО преподавателя на титульном листе" value={teacher.fullName} onChange={(event) => onTeacherChange({ ...teacher, fullName: event.target.value })} placeholder="ФИО преподавателя" />
            <Input aria-label="Должность преподавателя на титульном листе" value={teacher.position} onChange={(event) => onTeacherChange({ ...teacher, position: event.target.value })} placeholder="Должность" />
            <Input aria-label="Кафедра преподавателя на титульном листе" value={teacher.department} onChange={(event) => onTeacherChange({ ...teacher, department: event.target.value })} placeholder="Кафедра" />
          </div>
        )}
        {showTeacherFooter && (teacher.fullName || teacher.position || teacher.department) && (
          <div className="teacher-footer"><span aria-hidden="true">↗</span><p><strong>{teacher.fullName || 'ФИО преподавателя'}</strong>{teacher.position && <><br />{teacher.position}</>}{teacher.department && <><br />кафедра {teacher.department.replace(/^кафедра\s+/i, '')}</>}</p></div>
        )}
        {slide.image && <img className={`rhino rhino-${slide.image}`} src={assetUrl('/brand/rhino-designer.webp')} alt="Фирменный носорог-проектировщик" />}
        {slide.type === 'divider' && <img className="topic-arrow" src={assetUrl('/brand/topic-arrow.webp')} alt="" />}
        {showSideOrnament && <img className="side-ornament" src={assetUrl('/brand/side-ornament.webp')} alt="" />}
        {slide.citation && <a className="citation" href={slide.citation.url} target="_blank" rel="noreferrer"><ExternalLink />{slide.citation.label}</a>}
      </div>
    </article>
  );

  if (!animation || printMode) return content;
  return <motion.div className="slide-motion" initial={{ opacity: 0, y: 18, scale: .992 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: .34, ease: [0.22, 1, 0.36, 1] }} key={slide.id}>{content}</motion.div>;
}
