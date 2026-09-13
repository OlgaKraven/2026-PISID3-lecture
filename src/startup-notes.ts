import {validateTeacherPack, type Course, type Note} from '@olgakraven/lecture-engine';

// The repository pack supplies defaults; locally edited notes always take precedence.
export async function loadStartupNotes(course: Course, base: string) {
  if (new URLSearchParams(window.location.search).get('mode') === 'audience') return;
  const response = await fetch(base + 'teacher-pack.json', {signal: AbortSignal.timeout(15000)});
  if (!response.ok) throw Error('Не удалось загрузить заметки: ' + response.status);
  const pack = await response.json();
  validateTeacherPack(pack, course);
  const key = `lecture:${base}:${course.id}:private:${course.contentVersion}`;
  const raw = localStorage.getItem(key);
  const saved: Record<string, Note> = raw ? JSON.parse(raw) : {};
  if (!saved || typeof saved !== 'object' || Array.isArray(saved)) throw Error('Неверный формат сохранённых заметок. Сохраните резервную копию данных браузера.');
  localStorage.setItem(key, JSON.stringify({...pack.notes, ...saved}));
}
