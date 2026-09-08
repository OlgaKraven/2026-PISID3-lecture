'use client';

import { useMemo } from 'react';
import { Check, CircleAlert, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { Quiz } from './course';

export type SavedAnswer = { value: string | string[]; submitted: boolean };

function normalize(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('ru');
}

function stableHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function criterion(quiz: Quiz) {
  if (quiz.kind === 'selfReview' && Array.isArray(quiz.answer)) return quiz.answer.join(' · ');
  if (quiz.kind === 'ordering') return 'Все элементы указаны в верной последовательности без пропусков.';
  if (quiz.kind === 'multi' || quiz.kind === 'matching') return 'Выбраны все верные варианты и ни одного лишнего.';
  if (quiz.kind === 'short') return 'Формулировка по смыслу совпадает с ожидаемым результатом.';
  return 'Выбран один верный вариант.';
}

export function isQuizCorrect(value: string | string[], quiz: Quiz) {
  const answer = quiz.answer;
  if (Array.isArray(answer)) {
    if (!Array.isArray(value) || value.length !== answer.length) return false;
    if (quiz.kind === 'ordering') return answer.every((item, index) => value[index] === item);
    return answer.every((item) => value.includes(item));
  }
  if (Array.isArray(value)) return false;
  return normalize(value) === normalize(answer);
}

export function QuizCard({ quiz, saved, onChange, printMode }: {
  quiz: Quiz;
  saved?: SavedAnswer;
  onChange?: (answer: SavedAnswer) => void;
  printMode?: 'student' | 'teacher';
}) {
  const value = saved?.value ?? (['multi', 'matching', 'ordering'].includes(quiz.kind) ? [] : '');
  const submitted = Boolean(saved?.submitted);
  const correct = isQuizCorrect(value, quiz);
  const options = useMemo(() => {
    if (!quiz.options) return quiz.options;
    return [...quiz.options].sort((left, right) => stableHash(`${quiz.prompt}|${left}`) - stableHash(`${quiz.prompt}|${right}`));
  }, [quiz.options, quiz.prompt]);
  const letters = ['А', 'Б', 'В', 'Г'];
  const fieldId = `quiz-${stableHash(quiz.prompt)}`;

  if (printMode) {
    return (
      <section className="quiz-card print-quiz">
        <p className="quiz-prompt">{quiz.prompt}</p>
        {options && <ol>{options.map((option) => <li key={option}>{option}</li>)}</ol>}
        {!quiz.options && <div className="answer-lines" aria-hidden="true" />}
        {printMode === 'teacher' && (
          <div className="teacher-answer">
            <strong>Правильный ответ</strong><p>{Array.isArray(quiz.answer) ? quiz.answer.join(' · ') : quiz.answer}</p>
            <strong>Пояснение</strong><p>{quiz.explanation}</p>
            <strong>Критерий проверки</strong><p>{criterion(quiz)}</p>
          </div>
        )}
      </section>
    );
  }

  const setValue = (next: string | string[]) => onChange?.({ value: next, submitted: false });
  const toggle = (option: string) => {
    const values = Array.isArray(value) ? value : [];
    setValue(values.includes(option) ? values.filter((item) => item !== option) : [...values, option]);
  };
  const chooseOrder = (option: string) => {
    const values = Array.isArray(value) ? value : [];
    if (values.includes(option)) setValue(values.filter((item) => item !== option));
    else setValue([...values, option]);
  };

  return (
    <section className="quiz-card">
      <p className="quiz-kind">{quiz.kind === 'ordering' ? 'Установите порядок' : quiz.kind === 'matching' ? 'Сопоставление' : quiz.kind === 'multi' ? 'Несколько вариантов' : quiz.kind === 'selfReview' ? 'Самопроверка' : 'Один ответ'}</p>
      <p className="quiz-prompt">{quiz.prompt}</p>

      {['single', 'trueFalse', 'diagram'].includes(quiz.kind) && (
        <div className="quiz-options">
          {options?.map((option, optionIndex) => (
            <button type="button" aria-pressed={value === option} className={value === option ? 'is-selected' : ''} key={option} onClick={() => setValue(option)}>
              <span className="option-letter">{letters[optionIndex]}</span><span className="option-marker" />{option}
            </button>
          ))}
        </div>
      )}

      {['multi', 'matching'].includes(quiz.kind) && (
        <div className="quiz-options">
          {options?.map((option, optionIndex) => {
            const selected = Array.isArray(value) && value.includes(option);
            return <button type="button" aria-pressed={selected} className={selected ? 'is-selected' : ''} key={option} onClick={() => toggle(option)}><span className="option-letter">{letters[optionIndex]}</span><span className="check-marker">{selected && <Check />}</span>{option}</button>;
          })}
        </div>
      )}

      {quiz.kind === 'ordering' && (
        <div className="order-board">
          <div className="order-sequence">
            {(Array.isArray(value) ? value : []).map((option, index) => <button type="button" key={option} onClick={() => chooseOrder(option)} aria-label={`Убрать шаг ${index + 1}: ${option}`}><b>{index + 1}</b>{option}</button>)}
          </div>
          <div className="order-bank">
            {options?.filter((option) => !Array.isArray(value) || !value.includes(option)).map((option) => <button type="button" key={option} onClick={() => chooseOrder(option)} aria-label={`Добавить следующий шаг: ${option}`}><GripVertical />{option}</button>)}
          </div>
        </div>
      )}

      {quiz.kind === 'short' && <label className="quiz-text-answer" htmlFor={fieldId}><span>Краткий ответ</span><Input id={fieldId} value={String(value)} onChange={(event) => setValue(event.target.value)} placeholder="Введите краткий ответ" /></label>}
      {quiz.kind === 'selfReview' && <label className="quiz-text-answer" htmlFor={fieldId}><span>Ваше рассуждение</span><Textarea id={fieldId} value={String(value)} onChange={(event) => setValue(event.target.value)} placeholder="Запишите рассуждение…" /></label>}

      <div className="quiz-actions">
        <Button onClick={() => onChange?.({ value, submitted: true })} disabled={(Array.isArray(value) ? value.length === 0 : !value.trim())}>Проверить</Button>
        {submitted && <p className={quiz.kind === 'selfReview' || correct ? 'is-correct' : 'is-wrong'}>{quiz.kind === 'selfReview' ? <Check /> : correct ? <Check /> : <CircleAlert />}{quiz.kind === 'selfReview' ? 'Сверьте с критериями' : correct ? 'Правильно' : 'Есть ошибка'} </p>}
      </div>
      {submitted && <output className="quiz-feedback">
        {quiz.kind === 'selfReview' && Array.isArray(quiz.answer) ? <ul>{quiz.answer.map((item) => <li key={item}>{item}</li>)}</ul> : <p>{correct ? quiz.explanation : 'Проверьте выбранный ответ и попробуйте ещё раз. Точный разбор доступен в разделе «Результат».'}</p>}
      </output>}
    </section>
  );
}
