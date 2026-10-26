import fs from 'node:fs';
import assert from 'node:assert/strict';
import {validateOpeningResources,addOpeningResources} from '../authoring/opening-resources.mjs';
const course=JSON.parse(fs.readFileSync('public/course.json','utf8'));
const topics=JSON.parse(fs.readFileSync('authoring/original-course.json','utf8')).topics;
validateOpeningResources(course,topics);
const cases={
  'metadata without slides': c=>{c.lectures[0].slides=c.lectures[0].slides.filter(s=>!['literature','materials'].includes(s.kind));},
  'subject sources left at the end': c=>{const l=c.lectures[0],s=l.slides.splice(3,1)[0];l.slides.push(s);},
  'materials missing': c=>{c.lectures[0].slides.splice(4,1);},
  'additional list replaced by primary': c=>{c.lectures[0].slides[2].references=c.literature.primary;},
  'duplicate materials slide': c=>{c.lectures[0].slides.push({...c.lectures[0].slides[4],id:'duplicate-materials'});},
  'missing materials link': c=>{c.materialsUrl='';}
};
for(const mutate of Object.values(cases)){const copy=structuredClone(course);mutate(copy);assert.throws(()=>validateOpeningResources(copy,topics));}
const slides=[];addOpeningResources((id,s)=>slides.push({id,...s}),course,topics[0],[]);
assert.deepEqual(slides.map(s=>s.kind),['literature','literature','materials']);
const aliases=JSON.parse(fs.readFileSync('authoring/slide-aliases.json','utf8'));
for(const l of course.lectures)for(const suffix of ['main-literature','additional-literature','materials'])assert.equal(aliases[l.id+'-'+suffix],undefined);
console.log(JSON.stringify({status:'passed',lectures:course.lectures.length,negativeCases:Object.keys(cases),noSubjectSources:'omitted without empty slide',oldResourceLinks:'retain restored IDs'}));
