import type {Note} from '@olgakraven/lecture-engine';

type Notes = Record<string, Note>;
const defaults = new Map<string, Notes>();

export function registerNotes(key: string, notes: Notes) {
  defaults.set(key, notes);
}

function parseNotes(raw: string | null): Notes {
  const notes = raw === null ? {} : JSON.parse(raw);
  if (!notes || typeof notes !== 'object' || Array.isArray(notes)) {
    throw Error('Неверный формат сохранённых заметок. Сохраните резервную копию данных браузера.');
  }
  return notes;
}

// Used only by the engine storage helpers, without changing browser globals.
export const notesStorage = {
  getItem(key: string): string | null {
    const raw = localStorage.getItem(key);
    const source = defaults.get(key);
    return source ? JSON.stringify({...source, ...parseNotes(raw)}) : raw;
  },
  setItem(key: string, value: string): void {
    const source = defaults.get(key);
    if (!source) {
      localStorage.setItem(key, value);
      return;
    }
    const notes = parseNotes(value);
    const changes = Object.fromEntries(Object.entries(notes).filter(([id, note]) => {
      const original = source[id];
      return !original || JSON.stringify(note) !== JSON.stringify(original);
    }));
    // A single atomic write preserves the old data if the quota is exceeded.
    if (Object.keys(changes).length) localStorage.setItem(key, JSON.stringify(changes));
    else localStorage.removeItem(key);
  },
};
