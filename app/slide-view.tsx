'use client';
/* oxlint-disable next/no-img-element */

import { motion } from 'motion/react';
import { ExternalLink } from 'lucide-react';
import type { Course, Slide, TeacherProfile, Topic } from './course';
import { assetUrl } from './assets';
import { QuizCard, type SavedAnswer } from './quiz-card';

function LinkedText({ text }: { text: string }) {
  const match = text.match(/https?:\/\/\S+$/);
  if (!match || match.index === undefined) return text;
  return <>{text.slice(0, match.index)}<a href={match[0]} target="_blank" rel="noreferrer">{match[0]}</a></>;
}

function slideKind(slide: Slide) {
  switch (slide.type) {
    case 'title': return 'title';
    case 'course-theme':
    case 'literature':
    case 'materials': return 'service';
    case 'map':
    case 'thesis': return 'intro';
    case 'divider': return 'divider';
    case 'definition': return slide.id === 'start-model' ? 'intro' : 'concept';
    case 'process':
    case 'architecture': return slide.section === 'Практика' ? 'practice' : 'concept';
    case 'case': return slide.section === 'Практика' ? 'practice' : 'example';
    case 'comparison': return 'decision';
    case 'mistake': return 'warning';
    case 'cheatsheet': return ['practice-review', 'cheat'].includes(slide.id) ? 'summary' : 'concept';
    case 'interactive':
    case 'terminal': return 'practice';
    case 'quiz': return slide.id === 'diagnostic' || slide.id === 'practice-reflection' || slide.id.includes('-check-') ? 'check' : 'test';
    case 'bento':
    case 'summary':
    case 'final': return 'summary';
    case 'questions': return 'questions';
    default: return 'concept';
  }
}

function slideLayout(slide: Slide) {
  if (slide.type === 'map') return 'path';
  if (slide.type === 'process' || slide.type === 'architecture' || slide.id === 'start-model') return 'sequence';
  if (slide.type === 'case') return 'case';
  if (slide.type === 'comparison') return 'columns';
  if (slide.type === 'mistake') return 'contrast';
  if (slide.type === 'quiz' && (slide.id === 'diagnostic' || slide.id === 'practice-reflection' || slide.id.includes('-check-'))) return 'recall';
  if (slide.type === 'definition' || slide.type === 'thesis') return 'notebook';
  if (slide.type === 'bento' || slide.type === 'cheatsheet' || slide.type === 'summary' || slide.type === 'final') return 'columns';
  return 'standard';
}

function profileLines(teacher: TeacherProfile) {
  return [
    teacher.fullName || 'ФИО преподавателя',
    teacher.position || 'Должность преподавателя',
    teacher.department || 'Кафедра или лаборатория',
  ];
}

export function SlideView({
  course,
  topic,
  slide,
  index,
  total: _total,
  active = false,
  animation = true,
  saved,
  onAnswer,
  teacher,
  printMode,
}: {
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
}) {
  const kind = slideKind(slide);
  const layout = slideLayout(slide);
  const showMascot = kind === 'title';
  const showSideOrnament = !showMascot;
  const longTitle = kind === 'title' && slide.title.length > 44;
  const showProfile = kind === 'title';
  const content = (
    <article
      className={`slide slide-frame slide-${slide.type} kind-${kind} layout-${layout} ${active ? 'is-active' : ''} ${longTitle ? 'long-title' : ''} ${showMascot ? 'has-mascot' : ''}`}
      aria-label={`Экран ${index + 1}: ${slide.title}`}
      data-slide-id={slide.id}
    >
      {showSideOrnament && <img className="side-ornament" src={assetUrl('/brand/side-ornament.webp')} alt="" aria-hidden="true" />}
      <header className="slide-header slide-chrome">
        <div className="slide-brand">
          <img className="brand-logo" src={assetUrl('/brand/brand-mark.png')} alt="" aria-hidden="true" />
          <span>МДК.05.01 · {topic.semester} семестр</span>
        </div>
        <span className="slide-number">{String(index + 1).padStart(2, '0')}</span>
      </header>

      <div className="slide-content slide-grid">
        <div className="slide-copy">
          {slide.eyebrow && <p className="slide-kicker eyebrow">{slide.eyebrow}</p>}
          <h2>{slide.title}</h2>
          {slide.subtitle && <p className="slide-body-copy subtitle">{slide.subtitle}</p>}
          {slide.note && <aside className="write-note title-note"><span>Результат занятия</span><strong>{slide.note.replace(/^Результат занятия:\s*/i, '')}</strong></aside>}

          {slide.quote && slide.type === 'definition' && slide.id !== 'start-model' && (
            <section className="classic-definition" aria-label="Классическое определение">
              <span>Классическое определение · запишите</span>
              <p>{slide.quote}</p>
            </section>
          )}

          {slide.cards && (
            <div className="study-blocks card-blocks" aria-label="Опорный конспект">
              {slide.cards.map((card, itemIndex) => (
                <section className={`study-block tone-${card.tone ?? 'red'}`} key={`${card.label}-${card.value}-${itemIndex}`}>
                  <h3>{card.label}</h3><p>{card.value}</p>
                </section>
              ))}
            </div>
          )}

          {slide.steps && slide.type === 'map' && (
            <nav className="topic-path" aria-label="Карта темы">
              <ol>{slide.steps.map((step, itemIndex) => <li key={`${step.title}-${itemIndex}`}><span>{String(itemIndex + 1).padStart(2, '0')}</span><div><strong>{step.title.replace(/^\d+\s*·\s*/, '')}</strong>{step.text && <p>{step.text}</p>}</div></li>)}</ol>
            </nav>
          )}

          {slide.steps && slide.type !== 'map' && (
            <div className="study-blocks step-blocks" aria-label="Последовательность">
              {slide.steps.map((step, itemIndex) => <section className="study-block" key={`${step.title}-${step.text}-${itemIndex}`}><h3>{step.title}</h3>{step.text && <p>{step.text}</p>}</section>)}
            </div>
          )}

          {slide.bullets && (
            <ul className={slide.type === 'literature' ? 'bullet-list bibliography-list' : 'bullet-list'}>
              {slide.bullets.map((item, itemIndex) => <li key={`${item}-${itemIndex}`}><LinkedText text={item} /></li>)}
            </ul>
          )}

          {slide.type === 'literature' && slide.bullets && (
            <div className="literature-qr-grid" aria-label={`QR-коды: ${slide.title}`}>
              {slide.bullets.map((item, itemIndex) => {
                const url = item.match(/https?:\/\/\S+$/)?.[0] ?? '';
                const label = item.split('.')[0];
                return (
                  <a className="literature-qr-card" href={url} target="_blank" rel="noreferrer" key={`${url}-${itemIndex}`}>
                    <img src={assetUrl(`/qr/${slide.id}-${itemIndex + 1}.svg`)} alt={`QR-код: ${label}`} />
                    <span><strong>{label}</strong><small>Открыть источник<ExternalLink /></small></span>
                  </a>
                );
              })}
            </div>
          )}

          {slide.compare && (
            <div className="study-blocks compare-grid">
              <section className="study-block compare-left"><h3>{slide.compare.leftTitle}</h3><ul>{slide.compare.left.map((item) => <li key={item}>{item}</li>)}</ul></section>
              <section className="study-block compare-right"><h3>{slide.compare.rightTitle}</h3><ul>{slide.compare.right.map((item) => <li key={item}>{item}</li>)}</ul></section>
            </div>
          )}

          {slide.code && <div className="code-block code-card"><span>Шаблон</span><pre><code>{slide.code}</code></pre></div>}
          {slide.quote && !(slide.type === 'definition' && slide.id !== 'start-model') && <blockquote className="slide-quote">{slide.quote}</blockquote>}
          {slide.quiz && <QuizCard quiz={slide.quiz} saved={saved} onChange={onAnswer} printMode={printMode} />}

          {slide.materialUrl && (
            <div className="materials-panel">
              <a className="materials-qr-card qr-frame" href={slide.materialUrl} target="_blank" rel="noreferrer">
                <img className="qr-code" src={assetUrl(`/qr/${course.id}-materials.svg`)} alt={`QR-код материалов ${course.shortTitle}`} />
                <strong>Отсканируйте меня</strong>
              </a>
              <div className="materials-link-card material-link"><span>Ссылка на материалы</span><a href={slide.materialUrl} target="_blank" rel="noreferrer">{slide.materialUrl}<ExternalLink /></a></div>
            </div>
          )}

        </div>

        {kind === 'divider' && <img className="divider-arrow topic-arrow" src={assetUrl('/brand/topic-arrow.webp')} alt="" aria-hidden="true" />}
        {showMascot && <div className="mascot-mask" aria-hidden="true"><img className="rhino" src={assetUrl('/brand/rhino-wms.png')} alt="" /></div>}
      </div>

      <footer className="slide-footer">
        <div className="profile-lines">
          {showProfile ? profileLines(teacher).map((line) => <span key={line}>{line}</span>) : <span>{slide.section}</span>}
        </div>
        {slide.citation && <a className="footer-citation citation" href={slide.citation.url} target="_blank" rel="noreferrer"><ExternalLink />{slide.citation.label}</a>}
      </footer>
    </article>
  );

  if (!animation || printMode) return content;
  return <motion.div className="slide-motion" initial={{ opacity: 0, x: 28 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: .28, ease: 'easeOut' }} key={slide.id}>{content}</motion.div>;
}
