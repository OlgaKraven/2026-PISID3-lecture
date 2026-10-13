import {fileURLToPath} from 'node:url';
import type {Plugin} from 'vite';

// The pinned engine has no feature flags. Apply checked, source-level changes;
// missing signatures stop the build instead of silently restoring old controls.
export function interfacePlugin(): Plugin {
  const interactive = fileURLToPath(new URL('../src/interactive-examples.tsx', import.meta.url));
  const matching = fileURLToPath(new URL('../src/matching-board.tsx', import.meta.url));
  const entry = fileURLToPath(new URL('../src/laboratory-entry.tsx', import.meta.url));
  return {name: 'lecture-interface', enforce: 'pre', transform(source, id) {
    const file = id.split('?')[0].replaceAll('\\', '/');
    if (!file.includes('/@olgakraven/lecture-engine/lib/')) return;
    let code = source;
    const replace = (before: string, after: string) => {
      if (code.split(before).length !== 2) throw Error(`Review interface-plugin.ts: ${before.slice(0, 90)}`);
      code = code.replace(before, after);
    };
    const cut = (start: string, end: string) => {
      const from = code.indexOf(start), to = code.indexOf(end, from + start.length);
      if (from < 0 || to < 0) throw Error(`Review interface-plugin.ts: ${start}`);
      code = code.slice(0, from) + code.slice(to);
    };
    if (file.endsWith('/lecture-engine.js')) {
      cut('//#region src/engine/EditorLogin.tsx', '//#region src/engine/LectureSite.tsx');
      replace('var ge = x(() => import("./CourseEditor-Dfqvo1jW.js")), _e =', 'var _e =');
      cut('\tif (N === "editor" && o) return', '\tif ((G === "presenter"');
      replace('\t\t\t\t\t\t\t/* @__PURE__ */ w("button", {\n\t\t\t\t\t\t\t\tclassName: "button ghost",\n\t\t\t\t\t\t\t\tonClick: () => P("login"),\n\t\t\t\t\t\t\t\tchildren: "Вход"\n\t\t\t\t\t\t\t}),\n', '');
      cut('\t\t\tN === "login" &&', '\t\t\tN === "tools" &&');
      replace('\t\t\t\t\t\t\t\t\tQ(R ? "Отключить анимацию" : "Включить анимацию", w(R ? ee : ne, { size: 19 }), () => we(!R), R),\n', '');
      replace('\t\t\t\t\t\t\t\t\tQ("Повторить анимацию", /* @__PURE__ */ w(pe, { size: 19 }), () => Te(z + 1)),\n', '');
      cut('\t\t\t\t\t/* @__PURE__ */ w(re, {', '\t\t\t\t\t/* @__PURE__ */ T("span", {');
      replace('children: [/* @__PURE__ */ w(_, { size: 18 }), "Назад"]', '"aria-label": "Предыдущий слайд", title: "Предыдущий слайд (←)", children: [/* @__PURE__ */ w(_, { size: 20 })]');
      replace('children: ["Вперёд", /* @__PURE__ */ w(se, { size: 18 })]', '"aria-label": "Следующий слайд", title: "Следующий слайд (→)", children: [/* @__PURE__ */ w(se, { size: 20 })]');
      replace('if (N || t.closest("input,textarea,select,button,a,[contenteditable=\\"true\\"]")) return;', 'if (N || document.querySelector("dialog[open]") || t.closest("input,textarea,select,[contenteditable],.experiment") || (t.closest("button,a") && !t.closest(".deck-controls"))) return;');
      // Auto animation only, and honour the current device preference.
      replace('C(() => m(`${h}:animation`, !matchMedia("(prefers-reduced-motion: reduce)").matches))', 'C(() => !matchMedia("(prefers-reduced-motion: reduce)").matches)');
      replace('Q("Открыть содержание",', '/* @__PURE__ */ w("button", {className: "button secondary experiment-launch", onClick: () => X(K.slides.findIndex(s => s.id.endsWith("-experiment-start"))), children: "Эксперимент"}), Q("Открыть содержание",');
      replace('className: "topic-card-actions",\n\t\t\t\t\t\t\t\t\t\tchildren: [', 'className: "topic-card-actions",\n\t\t\t\t\t\t\t\t\t\tchildren: [/* @__PURE__ */ w("button", {className: "button secondary experiment-launch", onClick: () => Y({lecture: t.id, slide: t.id + "-experiment-start"}), children: "Открыть эксперимент"}), ');
    } else if (file.endsWith('/Teaching-DFPbXmGy.js')) {
      replace('children: [/* @__PURE__ */ w(p, { size: 17 }), "Назад"]', '"aria-label": "Предыдущий слайд", title: "Предыдущий слайд (←)", children: [/* @__PURE__ */ w(p, { size: 20 })]');
      replace('children: ["Вперёд", /* @__PURE__ */ w(v, { size: 17 })]', '"aria-label": "Следующий слайд", title: "Следующий слайд (→)", children: [/* @__PURE__ */ w(v, { size: 20 })]');
      replace('e.target.closest("input,textarea,select,button,[contenteditable]")', '(e.target.closest("input,textarea,select,[contenteditable],.experiment,[role=separator]") || (e.target.closest("button,a") && !e.target.closest(".presenter-controls")))');
      replace('animations: !0,', 'animations: !matchMedia("(prefers-reduced-motion: reduce)").matches,');
      replace('/* @__PURE__ */ w("button", {\n\t\t\t\t\t\t\t\t\t\tclassName: "button ghost",\n\t\t\t\t\t\t\t\t\t\tdisabled: !H,\n\t\t\t\t\t\t\t\t\t\tonClick: () => ge(L + 1),\n\t\t\t\t\t\t\t\t\t\tchildren: "Повтор анимации"\n\t\t\t\t\t\t\t\t\t}),', 'null,');
      replace('className: "session-tools",\n\t\t\t\t\t\t\t\tchildren: [', 'className: "session-tools",\n\t\t\t\t\t\t\t\tchildren: [/* @__PURE__ */ w("button", {className: "button secondary experiment-launch", disabled: !H, onClick: () => Z(s.id + "-experiment-start"), children: "Эксперимент"}), ');
      replace('className: "presenter-notes",\n\t\t\t\t\t\tchildren: [', 'className: "presenter-notes",\n\t\t\t\t\t\tchildren: [/* @__PURE__ */ w("p", {className: "notes-version", children: "Подробный сценарий · " + e.contentVersion}), ');
    } else if (file.endsWith('/CourseTools-C3cpIfZW.js')) {
      cut('function j({ course:', 'function M({ course:');
      code = code.replace('function M({ course:', 'function j() { return null; }\nfunction M({ course:');
      replace('\t\t\t\t\tstudy: "Моё обучение",\n', '');
      cut('\t\t\tg === "study" &&', '\t\t\tg === "glossary" &&');
      replace('Автор пока не добавил термины. Глоссарий можно заполнить в редакторе курса.', 'В этой версии курса ещё нет терминов.');
    } else if (file.endsWith('/SlideView-CKuVrZ7x.js')) {
      replace('n.kind === "agenda" && /* @__PURE__ */ d("ol", {', 'n.id.endsWith("-experiment-start") && /* @__PURE__ */ d(CourseLaboratoryEntry, {interactive: o}), n.kind === "agenda" && /* @__PURE__ */ d("ol", {');
      replace('seed: crypto.getRandomValues(/* @__PURE__ */ new Uint32Array(1))[0],', 'seed: courseTaskSeed(e.id),');
      replace('...$(e),\n\t\t\t\t\tattempts: t.attempts', '...$(e),\n\t\t\t\t\tseed: ((t.seed || courseTaskSeed(e.id)) + 1) >>> 0,\n\t\t\t\t\tattempts: t.attempts');
      replace('a = e.options || [], o = !!i?.result', 'a = courseShuffleOptions(e.options || [], i?.seed ?? courseTaskSeed(e.id)), o = !!i?.result');
      const actions='\t\t\t/* @__PURE__ */ f("div", {\n\t\t\t\tclassName: "task-actions",';
      cut('\t\t\te.type === "matching" && /* @__PURE__ */ d("div", {', actions);
      replace(actions, '\t\t\te.type === "matching" && /* @__PURE__ */ d(CourseMatchingBoard, {task: e, attempt: i, controller: n}),\n' + actions);
      // Keep exact data for the bar and threshold; fit the printed label into
      // its reserved column. Contrast acceptance uses the unrounded value.
      replace('x: 950,\n\t\t\t\t\t\ty: n(r) + 28,\n\t\t\t\t\t\tfontSize: 21,\n\t\t\t\t\t\tfontWeight: 700,\n\t\t\t\t\t\tfill: "#263244",\n\t\t\t\t\t\tchildren: t.value', 'x: 950,\n\t\t\t\t\t\ty: n(r) + 28,\n\t\t\t\t\t\tfontSize: 21,\n\t\t\t\t\t\tfontWeight: 700,\n\t\t\t\t\t\tfill: "#263244",\n\t\t\t\t\t\tchildren: Number(t.value.toFixed(4))');
      replace('n.visual && /* @__PURE__ */ d(et, {\n\t\t\t\t\t\t\t\tvisual: n.visual,\n\t\t\t\t\t\t\t\tbase: i\n\t\t\t\t\t\t\t}, n.id)', 'n.visual && /* @__PURE__ */ d(CourseSuspense, {fallback: /* @__PURE__ */ d(et, {visual: n.visual, base: i}, n.id), children: /* @__PURE__ */ d(CourseInteractiveExample, { slide: n, interactive: o, course: e, fallback: /* @__PURE__ */ d(et, {visual: n.visual, base: i}, n.id) })})');
      code = `import {lazy as courseLazy, Suspense as CourseSuspense} from "react";\nimport {LaboratoryEntry as CourseLaboratoryEntry} from ${JSON.stringify(entry)};\nconst CourseInteractiveExample=courseLazy(()=>import(${JSON.stringify(interactive)}).then(m=>({default:m.InteractiveExample})));\nimport {MatchingBoard as CourseMatchingBoard, shuffledOptions as courseShuffleOptions, taskSeed as courseTaskSeed} from ${JSON.stringify(matching)};\n` + code;
    }
    return code === source ? undefined : {code, map: null};
  }};
}
