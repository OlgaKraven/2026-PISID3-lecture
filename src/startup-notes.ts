import {validateTeacherPack, type Course,type TeacherPack} from '@olgakraven/lecture-engine';
import {notesStorage, registerNotes} from './notes-storage';

// The repository pack supplies defaults; locally edited notes always take precedence.
export async function loadStartupNotes(course: Course, base: string) {
  if (['audience','print'].includes(new URLSearchParams(window.location.search).get('mode')||'')) return;
  const response = await fetch(base + 'teacher-pack.json', {signal: AbortSignal.timeout(15000),cache:'no-store'});
  if (!response.ok) throw Error('Не удалось загрузить заметки: ' + response.status);
  const pack = await response.json();
  validateTeacherPack(pack, course);
  const migration=pack as TeacherPack & {previousContentVersion?:string;previousNoteHashes?:Record<string,Record<string,string>>};
  const key = `lecture:${base}:${course.id}:private:${course.contentVersion}`;
  const previous:typeof pack.notes={};
  if(migration.previousContentVersion)try{
    const saved=JSON.parse(localStorage.getItem(`lecture:${base}:${course.id}:private:${migration.previousContentVersion}`)||'{}');
    for(const [id,note] of Object.entries(saved)){
      if(!pack.notes[id]||!note||typeof note!=='object')continue;
      const merged={...pack.notes[id]};let personal=false;
      for(const [field,value] of Object.entries(note)){
        if(!['script','preparation','notebook','questions','answer'].includes(field))continue;
        if(typeof value!=='string'||!value.trim())continue;
        const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));
        const hash=[...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('');
        if(migration.previousNoteHashes?.[id]?.[field]!==hash){merged[field as 'script']=value;personal=true;}
      }
      if(personal)previous[id]=merged;
    }
  }catch{/* Keep the old storage intact and use the published script. */}
  registerNotes(key, pack.notes,previous);
  // Validate existing data, but do not require any storage write to open a course.
  notesStorage.getItem(key);
}
