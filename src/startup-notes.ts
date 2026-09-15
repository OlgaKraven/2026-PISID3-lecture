import {validateTeacherPack, type Course} from '@olgakraven/lecture-engine';
import {notesStorage, registerNotes} from './notes-storage';

// The repository pack supplies defaults; locally edited notes always take precedence.
export async function loadStartupNotes(course: Course, base: string) {
  if (new URLSearchParams(window.location.search).get('mode') === 'audience') return;
  const response = await fetch(base + 'teacher-pack.json', {signal: AbortSignal.timeout(15000)});
  if (!response.ok) throw Error('Не удалось загрузить заметки: ' + response.status);
  const pack = await response.json();
  validateTeacherPack(pack, course);
  const key = `lecture:${base}:${course.id}:private:${course.contentVersion}`;
  registerNotes(key, pack.notes);
  // Validate existing data, but do not require any storage write to open a course.
  notesStorage.getItem(key);
}
