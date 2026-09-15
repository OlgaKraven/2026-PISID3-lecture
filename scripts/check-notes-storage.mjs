import assert from 'node:assert/strict';
import {notesStorage, registerNotes} from '../src/notes-storage.ts';

const data = new Map();
let failWrites = false;
Object.defineProperty(globalThis, 'localStorage', {value: {
  getItem: key => data.get(key) ?? null,
  setItem(key, value) {
    if (failWrites) throw new DOMException('Full', 'QuotaExceededError');
    data.set(key, value);
  },
  removeItem: key => data.delete(key),
}});
const key = 'lecture:/course/:id:private:v1';
const note = {script:'Default', preparation:'', notebook:'', questions:'', answer:'', estimatedSeconds:60};
const source = {one:note, two:{...note,script:'Second'}};
registerNotes(key, source);
assert.deepEqual(JSON.parse(notesStorage.getItem(key)), source);
assert.equal(data.size, 0);
const edited = {...source, one:{...note,script:''}, extra:{...note,script:'Imported'}};
notesStorage.setItem(key, JSON.stringify(edited));
assert.deepEqual(JSON.parse(data.get(key)), {one:edited.one,extra:edited.extra});
assert.deepEqual(JSON.parse(notesStorage.getItem(key)), edited);
// Legacy full snapshots are readable and compacted on the next successful save.
data.set(key, JSON.stringify(edited));
assert.deepEqual(JSON.parse(notesStorage.getItem(key)), edited);
failWrites = true;
const before = data.get(key);
assert.throws(()=>notesStorage.setItem(key, JSON.stringify(edited)), {name:'QuotaExceededError'});
assert.equal(data.get(key), before);
failWrites = false;
notesStorage.setItem(key, JSON.stringify(edited));
assert.equal(Object.keys(JSON.parse(data.get(key))).length, 2);
notesStorage.setItem(key, JSON.stringify(source));
assert.equal(data.has(key), false);
notesStorage.setItem('unrelated', 'raw value');
assert.equal(notesStorage.getItem('unrelated'), 'raw value');
for (const raw of ['null','[]','broken']) {
  data.set(key, raw);
  assert.throws(()=>notesStorage.getItem(key));
  assert.equal(data.get(key), raw);
}
console.log('Notes storage: defaults, edits, legacy data, quota failure and invalid data passed.');
