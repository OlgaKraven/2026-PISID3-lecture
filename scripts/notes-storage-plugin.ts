import {fileURLToPath} from 'node:url';
import type {Plugin} from 'vite';

// Compatibility bridge for the pinned engine 0.2.0, which has no storage prop.
// Keep the vendor archive intact and fail explicitly if its helper code changes.
export function notesStoragePlugin(): Plugin {
  const adapter = fileURLToPath(new URL('../src/notes-storage.ts', import.meta.url));
  return {
    name: 'lecture-notes-storage',
    enforce: 'pre',
    transform(code, id) {
      if (!id.split('?')[0].replaceAll('\\', '/').endsWith('/@olgakraven/lecture-engine/lib/SlideView-CKuVrZ7x.js')) return;
      const read = 'localStorage.getItem(e)';
      const write = 'localStorage.setItem(e, JSON.stringify(t))';
      if (code.split(read).length !== 2 || code.split(write).length !== 2) {
        throw Error('Lecture engine storage helpers changed; update notes-storage-plugin.ts.');
      }
      return {
        code: `import {notesStorage as lectureNotesStorage} from ${JSON.stringify(adapter)};\n` +
          code.replace(read, 'lectureNotesStorage.getItem(e)').replace(write, 'lectureNotesStorage.setItem(e, JSON.stringify(t))'),
        map: null,
      };
    },
  };
}
