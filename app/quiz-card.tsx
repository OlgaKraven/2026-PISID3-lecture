'use client';

import { Check, CircleAlert, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { Quiz } from './course';

export type SavedAnswer = { value: string | string[]; submitted: boolean };

function sameAnswer(value: string | string[], answer: string | string[]) {
  if (Array.isArray(answer)) {
    if (!Array.isArray(value) || value.length !== answer.length) return false;
    return answer.every((item, index) => value[index] === item);
  }
  if (Array.isArray(value)) return false;
  return value.trim().toLocaleLowerCase('ru').includes(answer.trim().toLocaleLowerCase('ru'));
}

export function QuizCard({ quiz, saved, onChange, printMode }: {
  quiz: Quiz;
  saved?: SavedAnswer;
  onChange?: (answer: SavedAnswer) => void;
  printMode?: 'student' | 'teacher';
}) {
  const value = saved?.value ?? (['multi', 'matching', 'ordering'].includes(quiz.kind) ? [] : '');
  const submitted = Boolean(saved?.submitted);
  const correct = sameAnswer(value, quiz.answer);

  if (printMode) {
    return (
      <section className="quiz-card print-quiz">
        <p className="quiz-prompt">{quiz.prompt}</p>
        {quiz.options && <ol>{quiz.options.map((option) => <li key={option}>{option}</li>)}</ol>}
        {!quiz.options && <div className="answer-lines" aria-hidden="true" />}
        {printMode === 'teacher' && (
          <div className="teacher-answer">
            <strong>Ответ:</strong> {Array.isArray(quiz.answer) ? quiz.answer.join(' · ') : quiz.answer}
            <p>{quiz.explanation}</p>
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
          {quiz.options?.map((option) => (
            <button className={value === option ? 'is-selected' : ''} key={option} onClick={() => setValue(option)}>
              <span className="option-marker" />{option}
            </button>
          ))}
        </div>
      )}

      {['multi', 'matching'].includes(quiz.kind) && (
        <div className="quiz-options">
          {quiz.options?.map((option) => {
            const selected = Array.isArray(value) && value.includes(option);
            return <button className={selected ? 'is-selected' : ''} key={option} onClick={() => toggle(option)}><span className="check-marker">{selected && <Check />}</span>{option}</button>;
          })}
        </div>
      )}

      {quiz.kind === 'ordering' && (
        <div className="order-board">
          <div className="order-sequence">
            {(Array.isArray(value) ? value : []).map((option, index) => <button key={option} onClick={() => chooseOrder(option)}><b>{index + 1}</b>{option}</button>)}
          </div>
          <div className="order-bank">
            {quiz.options?.filter((option) => !Array.isArray(value) || !value.includes(option)).map((option) => <button key={option} onClick={() => chooseOrder(option)}><GripVertical />{option}</button>)}
          </div>
        </div>
      )}

      {quiz.kind === 'short' && <Input value={String(value)} onChange={(event) => setValue(event.target.value)} placeholder="Введите краткий ответ" />}
      {quiz.kind === 'selfReview' && <Textarea value={String(value)} onChange={(event) => setValue(event.target.value)} placeholder="Запишите рассуждение…" />}

      <div className="quiz-actions">
        <Button onClick={() => onChange?.({ value, submitted: true })} disabled={(Array.isArray(value) ? value.length === 0 : !value.trim())}>Проверить</Button>
        {submitted && <p className={quiz.kind === 'selfReview' || correct ? 'is-correct' : 'is-wrong'}>{quiz.kind === 'selfReview' ? <Check /> : correct ? <Check /> : <CircleAlert />}{quiz.kind === 'selfReview' ? 'Сверьте с критериями' : correct ? 'Верно' : 'Нужно пересмотреть'} </p>}
      </div>
      {submitted && (
        <div className="quiz-feedback">
          {quiz.kind === 'selfReview' && Array.isArray(quiz.answer) && <ul>{quiz.answer.map((item) => <li key={item}>{item}</li>)}</ul>}
          <p>{quiz.explanation}</p>
        </div>
      )}
    </section>
  );
}
