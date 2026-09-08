'use client';
/* oxlint-disable next/no-img-element */

import { motion } from 'motion/react';
import { ExternalLink } from 'lucide-react';
import type { Course, Slide, TeacherProfile, Topic } from './course';
import { assetUrl } from './assets';
import { QuizCard, type SavedAnswer } from './quiz-card';

const toneClass = { red: 'tone-red', yellow: 'tone-yellow', green: 'tone-green', blue: 'tone-blue' };

function LinkedText({ text }: { text: string }) {
  const match = text.match(/https?:\/\/\S+$/);
  if (!match || match.index === undefined) return text;
  return <>{text.slice(0, match.index)}<a href={match[0]} target="_blank" rel="noreferrer">{match[0]}</a></>;
}

export function SlideView({ course, topic, slide, index, total, active = false, animation = true, saved, onAnswer, teacher, printMode, revealStep = 99, onReveal }: {
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
  printMode?: 'student' | 'teacher';
  revealStep?: number;
  onReveal?: () => void;
}) {
  const showSideOrnament = ['course-theme', 'divider', 'literature', 'materials', 'questions'].includes(slide.type);
  const revealCount = Math.max(slide.cards?.length ?? 0, slide.steps?.length ?? 0, slide.bullets?.length ?? 0) - 1;
  const content = (
    <article className={`slide slide-${slide.type} ${active ? 'is-active' : ''}`} aria-label={`Экран ${index + 1}: ${slide.title}`} data-slide-id={slide.id}>
      <div className="slide-chrome">
        <img className="brand-logo" src={assetUrl('/favicon.png')} alt="Университет Синергия" />
        <span>{course.shortTitle} · Лекция {topic.number}</span>
        <span>{String(index + 1).padStart(2, '0')} / {total}</span>
      </div>
      <div className="slide-grid">
        <header className="slide-heading">
          {slide.eyebrow && <p className="eyebrow">{slide.eyebrow}</p>}
          <h1>{slide.title}</h1>
          {slide.subtitle && <p className="subtitle">{slide.subtitle}</p>}
        </header>

        {slide.cards && <div className="bento-grid">{slide.cards.map((card, itemIndex) => <div className={`bento-card reveal-item ${itemIndex <= revealStep || printMode ? 'is-revealed' : ''} ${toneClass[card.tone ?? 'red']}`} key={`${card.label}-${card.value}`}><span>{card.label}</span><strong>{card.value}</strong></div>)}</div>}
        {slide.steps && <div className="step-grid">{slide.steps.map((step, itemIndex) => <div className={`step-card reveal-item ${itemIndex <= revealStep || printMode ? 'is-revealed' : ''}`} key={`${step.title}-${step.text}`}><strong>{step.title}</strong><span>{step.text}</span></div>)}</div>}
        {slide.bullets && <ul className="bullet-list">{slide.bullets.map((item, itemIndex) => <li className={`reveal-item ${itemIndex <= revealStep || printMode ? 'is-revealed' : ''}`} key={item}><LinkedText text={item} /></li>)}</ul>}
        {slide.type === 'literature' && slide.bullets && <div className="literature-qr-row">{slide.bullets.map((item, itemIndex) => { const url = item.match(/https?:\/\/\S+$/)?.[0] ?? ''; const label = item.split('.')[0]; return <a href={url} target="_blank" rel="noreferrer" key={url}><span className="literature-qr"><img src={assetUrl(`/qr/${slide.id}-${itemIndex + 1}.svg`)} alt={`QR-код: ${label}`} /></span><strong>{label}</strong><span>Открыть источник</span></a>; })}</div>}
        {slide.compare && <div className="compare-grid"><section className="compare-left"><h2>{slide.compare.leftTitle}</h2><ul>{slide.compare.left.map((item) => <li key={item}>{item}</li>)}</ul></section><section className="compare-right"><h2>{slide.compare.rightTitle}</h2><ul>{slide.compare.right.map((item) => <li key={item}>{item}</li>)}</ul></section></div>}
        {slide.code && <pre className="code-card"><code>{slide.code}</code></pre>}
        {slide.quote && <blockquote>{slide.quote}</blockquote>}
        {slide.quiz && <QuizCard quiz={slide.quiz} saved={saved} onChange={onAnswer} printMode={printMode} />}
        {slide.materialUrl && (
          <div className="materials-panel">
            <div className="qr-frame">
              <img className="qr-code" src={assetUrl(`/qr/${course.id}-materials.svg`)} alt={`QR-код материалов ${course.shortTitle}`} />
              <strong>Отсканируйте меня</strong>
            </div>
            <div className="material-link"><span>Ссылка на материалы</span><a href={slide.materialUrl} target="_blank" rel="noreferrer">{slide.materialUrl}</a></div>
          </div>
        )}
        {slide.type === 'title' && (
          <div className="title-teacher-profile"><strong>{teacher.fullName || 'ФИО преподавателя'}</strong><span>{teacher.position || 'Должность преподавателя'}</span><span>{teacher.department || 'Кафедра или лаборатория'}</span></div>
        )}
        {slide.type === 'title' && slide.image && <img className={`rhino rhino-${slide.image}`} src={assetUrl('/brand/rhino-wms.png')} alt="Фирменный носорог-проектировщик WMS" />}
        {slide.type === 'divider' && <img className="topic-arrow" src={assetUrl('/brand/topic-arrow.webp')} alt="" />}
        {showSideOrnament && <img className="side-ornament" src={assetUrl('/brand/side-ornament.webp')} alt="" />}
        {slide.citation && <a className="citation" href={slide.citation.url} target="_blank" rel="noreferrer"><ExternalLink />{slide.citation.label}</a>}
        {!printMode && onReveal && revealStep < revealCount && <button className="reveal-control" onClick={onReveal}>Показать следующий фрагмент</button>}
      </div>
    </article>
  );

  if (!animation || printMode) return content;
  return <motion.div className="slide-motion" initial={{ opacity: 0, y: 18, scale: .992 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: .34, ease: [0.22, 1, 0.36, 1] }} key={slide.id}>{content}</motion.div>;
}
