import {PublicSelect,PublicControlScope} from './public-select';
import {useEffect, useRef, type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import type {Slide} from '@olgakraven/lecture-engine';
import experiments from '../public/laboratories.json';
import {accessAllowed, grayContrast, loginTransition, weightedScores} from './experiment-math';
import {useDemoState} from './experiment-state';
import {LaboratoryStudio,studioResult,type LaboratoryField} from './laboratory-studio';
import {LaboratoryScene} from './laboratory-scenes';
import './lecture.css';
import {TeachingArtifact,hasTeachingArtifact} from './teaching-artifact';

type Lab = {kind: string; title: string; prompt: string; lesson: string; choices?: string[][]; correct?: number;setup?:string;procedure?:string[];expected?:string;boundary?:string;fields?:LaboratoryField[];teacherGuide?:string};
type Props = {slide: Slide; interactive: boolean; course: {contentVersion: string}; fallback: ReactNode};

export function InteractiveExample({slide, interactive, course, fallback}: Props) {
  const audience = new URLSearchParams(location.search).get('mode') === 'audience';
  if (!interactive && !audience) return fallback;
  if(hasTeachingArtifact(slide.id))return <TeachingArtifact key={slide.id} id={slide.id} writable={interactive&&!audience} version={course.contentVersion} fallback={fallback}/>;
  if (slide.id.endsWith('-experiment')) {
    const index = Number(slide.id.slice(0, 2)) - 1;
    const lab = experiments[index] as Lab;
    if (lab) return <Experiment key={slide.id} lab={lab} id={slide.id} writable={interactive && !audience} version={course.contentVersion}/>;
  }
  if (/-c\d+-decision$/.test(slide.id) && slide.visual?.type === 'comparison') {
    const [wrong, right] = slide.visual.rows[0];
    const flip = Number(slide.id.match(/-c(\d+)-/)?.[1]) % 2 === 0;
    return <Experiment key={slide.id} id={slide.id} writable={interactive && !audience} version={course.contentVersion} lab={{kind: 'choice', title: slide.title, prompt: 'Выберите действие и объясните его последствие.', choices: flip ? [[right, slide.visual.caption], [wrong, 'Это действие не обеспечивает критерий. ' + slide.visual.caption]] : [[wrong, 'Это действие не обеспечивает критерий. ' + slide.visual.caption], [right, slide.visual.caption]], correct: flip ? 0 : 1, lesson: slide.visual.caption}}/>;
  }
  return fallback;
}

function Experiment(props:{lab:Lab;id:string;writable:boolean;version:string}){return <PublicControlScope id={props.id} writable={props.writable} version={props.version}><ExperimentContent {...props}/></PublicControlScope>}
function ExperimentContent({lab, id, writable, version}: {lab: Lab; id: string; writable: boolean; version: string}) {
  const laboratory=id.endsWith('-experiment');
  const [s, setDemo] = useDemoState(id, {choice: -1, stock: 10, amount: 10, quarantine: false, quantity: 10, reason: '', history: [] as string[], coverage: [] as string[], weight: 50, allowed: true, deduplicate: true, delivered: 0, operation: 1, registered: [] as string[], count: 100, seconds: 3, query: '', filter: 'Все', step: 0, batch: '', formQuantity: '', submitted: false, pending: false, result: '', gray: 119, role: 'Кладовщик', action: 'Просмотр', zone: 'Своя', failures: 0, locked: false, loggedIn: false,expanded:false,guideOpen:false,preset:'Исходные условия',observation:'',trials:[] as string[],animationAt:0,...Object.fromEntries((lab.fields||[]).map(field=>['studio_'+field.id,field.value]))}, writable, version);
  const update=(patch:Parameters<typeof setDemo>[0])=>setDemo({...patch,...(laboratory?{animationAt:Date.now(),...(!('preset' in patch)?{preset:'Свои условия'}:{})}: {})});
  const number = (field: string) => s[field] as number;
  const str = (field: string) => s[field] as string;
  const bool = (field: string) => s[field] as boolean;
  const list = (field: string) => s[field] as string[];
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dialog=useRef<HTMLDialogElement>(null);
  const expandButton=useRef<HTMLButtonElement>(null),wasExpanded=useRef(false);
  useEffect(()=>{if(!s.expanded&&wasExpanded.current&&writable)expandButton.current?.focus();wasExpanded.current=Boolean(s.expanded);},[s.expanded,writable]);
  useEffect(()=>{if(s.expanded&&dialog.current&&!dialog.current.open)dialog.current.showModal();},[s.expanded]);
  useEffect(() => () => {if (timer.current) {clearTimeout(timer.current); update({pending: false});}}, []);
  const range = (field: string, label: string, min: number, max: number, unit = '') => <label className="experiment-field"><span>{label}: <strong>{number(field)}{unit}</strong></span><input type="range" aria-label={label} min={min} max={max} value={number(field)} onChange={e => update({[field]: Number(e.target.value)})}/></label>;
  const check = (field: string, label: string) => <label className="experiment-check"><input type="checkbox" checked={bool(field)} onChange={e => update({[field]: e.target.checked})}/>{label}</label>;
  const select = (field: string, label: string, values: string[]) => <label className="experiment-field"><span>{label}</span><PublicSelect aria-label={label} value={str(field)} onChange={e => update({[field]: e.target.value})}>{values.map(v => <option key={v}>{v}</option>)}</PublicSelect></label>;
  const output = (text: ReactNode, success?: boolean) => <div className={`experiment-result ${success === undefined ? '' : success ? 'result-pass' : 'result-fail'}`} role="status" aria-live="polite">{text}</div>;
  let content: ReactNode;
  switch (lab.kind) {
    case 'studio':
      content=<LaboratoryStudio number={Number(id.slice(0,2))} fields={lab.fields||[]} values={s} update={update}/>;
      break;
    case 'choice': {
      const chosen = number('choice');
      content = <><div className="experiment-choices">{lab.choices!.map(([label], i) => <button key={label} type="button" aria-pressed={chosen === i} onClick={() => update({choice: i})}>{label}</button>)}</div>{output(chosen < 0 ? 'Сначала предложите действие. Затем выберите вариант, чтобы увидеть последствие.' : <><strong>{chosen === lab.correct ? 'Решение обосновано.' : 'Проверьте основание решения.'}</strong> {lab.choices![chosen]?.[1]}</>, chosen < 0 ? undefined : chosen === lab.correct)}</>;
      break;
    }
    case 'rules': {
      const valid = !bool('quarantine') && number('amount') > 0 && number('amount') <= number('stock');
      content = <>{range('stock', 'Остаток', 0, 20, ' ед.')}{range('amount', 'Заказ', 0, 21, ' ед.')}{check('quarantine', 'Партия в карантине')}{output(<><strong>{valid ? 'Отгрузка разрешена' : 'Отгрузка запрещена'}</strong><span>{bool('quarantine') ? 'REQ-14: карантин имеет приоритет.' : number('amount') <= 0 ? 'Заказ должен быть положительным.' : number('amount') > number('stock') ? 'Заказ превышает остаток.' : `После отгрузки останется ${number('stock') - number('amount')} ед.`}</span></>, valid)}</>;
      break;
    }
    case 'history':
      content = <>{range('quantity', 'Новое количество', 0, 20, ' ед.')}<label className="experiment-field"><span>Причина исправления</span><input value={str('reason')} onChange={e => update({reason: e.target.value})}/></label><button className="experiment-action" disabled={!str('reason').trim() || number('quantity') === number('stock') || list('history').length >= 20} onClick={() => update({stock: number('quantity'), history: [...list('history'), `Кладовщик: ${number('stock')} → ${number('quantity')} ед.; ${str('reason').trim()}`], reason: ''})}>Внести исправление</button>{output(<><strong>Текущее значение: {number('stock')} ед.</strong><ol className="experiment-log"><li>Исходное событие: приёмка 10 ед.</li>{list('history').map((e, i) => <li key={i}>{e}</li>)}</ol></>)}</>;
      break;
    case 'coverage': {
      const fields = ['Модель статуса', 'Серверный запрет', 'Состояние формы', 'Отрицательный тест'];
      content = <><div className="experiment-coverage">{fields.map(field => <label key={field}><input type="checkbox" checked={list('coverage').includes(field)} onChange={e => update({coverage: e.target.checked ? [...list('coverage'), field] : list('coverage').filter(f => f !== field)})}/>{field}</label>)}</div>{output(<><strong>Проверено: {list('coverage').length} / 4</strong><span>{fields.filter(f => !list('coverage').includes(f)).join('; ') || 'REQ-14 покрыт на всех четырёх уровнях.'}</span></>, list('coverage').length === 4)}</>;
      break;
    }
    case 'weights': {
      const scores = weightedScores(number('weight'));
      const winner = !bool('allowed') ? 'B: A исключён обязательным условием' : Math.abs(scores.a - scores.b) < 1e-9 ? 'Равенство: нужен дополнительный критерий' : scores.a > scores.b ? 'A' : 'B';
      content = <>{range('weight', 'Вес маршрута', 0, 100, '%')}<p>Вес стоимости: {100 - number('weight')}%. Шкала 1–5: больший балл лучше.</p>{check('allowed', 'A выполняет обязательное условие')}<div className="experiment-bars">{Object.entries(scores).map(([k, v]) => <div key={k}><span>{k.toUpperCase()}: {v.toFixed(2)}</span><meter min={0} max={5} value={v}/></div>)}</div>{output(<><strong>Выбор: {winner}</strong><span>A = 5 × {number('weight') / 100} + 2 × {(100 - number('weight')) / 100}; B = 3 × {number('weight') / 100} + 5 × {(100 - number('weight')) / 100}</span></>)}</>;
      break;
    }
    case 'offline': {
      const send = () => {
        const op = `OP-${number('operation')}`;
        const repeat = bool('deduplicate') && list('registered').includes(op);
        update({delivered: number('delivered') + 1, stock: repeat ? number('stock') : number('stock') + 10, registered: [...new Set([...list('registered'), op])], result: repeat ? `${op}: возвращён прежний результат, движение не повторено.` : `${op}: добавлено 10 ед.`});
      };
      content = <>{check('deduplicate', 'Распознавать повтор по ID')}<p>Текущий ID: <strong>OP-{number('operation')}</strong>. Одна операция добавляет 10 ед.</p><div className="experiment-actions"><button onClick={send}>Отправить операцию</button><button onClick={() => update({operation: number('operation') + 1})}>Создать другой ID</button></div>{output(<><strong>Остаток: {number('stock')} ед. · доставок: {number('delivered')}</strong><span>{str('result') || 'Исходный остаток: 10 ед. Отправьте операцию несколько раз.'}</span></>)}</>;
      break;
    }
    case 'cost':
      content = <>{range('count', 'Операций в день', 10, 500)}{range('seconds', 'Лишнее действие', 1, 10, ' с')}{output(<><strong>{(number('count') * number('seconds') / 60).toFixed(1)} мин в день</strong><span>{number('count')} × {number('seconds')} = {number('count') * number('seconds')} секунд. За 20 рабочих дней: {(number('count') * number('seconds') * 20 / 3600).toFixed(1)} ч.</span></>)}</>;
      break;
    case 'search': {
      const batches = [['P-17', 'Карантин', 'A-01'], ['P-18', 'Доступна', 'A-01'], ['P-19', 'Доступна', 'A-02']];
      const rows = batches.filter(([id, status]) => id.toLowerCase().includes(str('query').toLowerCase().trim()) && (str('filter') === 'Все' || status === str('filter')));
      content = <><div className="experiment-inputs"><label className="experiment-field"><span>Номер партии</span><input value={str('query')} onChange={e => update({query: e.target.value})}/></label>{select('filter', 'Статус', ['Все', 'Доступна', 'Карантин'])}</div>{output(rows.length ? <table><thead><tr><th>Партия</th><th>Статус</th><th>Ячейка</th></tr></thead><tbody>{rows.map(row => <tr key={row[0]}>{row.map(cell => <td key={cell}>{cell}</td>)}</tr>)}</tbody></table> : 'Совпадений нет. Измените номер или сбросьте фильтр. Другие партии остаются в системе.')}</>;
      break;
    }
    case 'prototype': {
      const step = number('step');
      content = <><ol className="experiment-route">{['Сканирование', 'Проверка', 'Подтверждение'].map((label, i) => <li key={label} aria-current={step === i ? 'step' : undefined}>{label}</li>)}</ol>{step === 0 ? range('quantity', 'Количество P-18', 1, 20, ' ед.') : output(<><strong>{step === 1 ? 'Проверьте приёмку' : 'Приёмка зарегистрирована'}</strong><span>P-18 · {number('quantity')} ед. {step === 1 ? 'Возврат сохраняет количество.' : 'Одно движение сохранено.'}</span></>, step === 2)}<div className="experiment-actions"><button disabled={step !== 1} onClick={() => update({step: 0})}>Исправить количество</button><button disabled={step === 2} onClick={() => update({step: step + 1})}>{step === 0 ? 'Проверить приёмку' : 'Подтвердить приёмку'}</button><button disabled={step !== 2} onClick={() => update({step: 0, quantity: 10})}>Новая приёмка</button></div></>;
      break;
    }
    case 'form': {
      const quantityValid = /^[1-9]\d*$/.test(str('formQuantity')) && Number(str('formQuantity')) <= 1000;
      const batchValid = /^P-\d+$/.test(str('batch').trim());
      const submit = () => {
        update({submitted: true, result: ''});
        if (!batchValid || !quantityValid) return;
        update({pending: true});
        timer.current = setTimeout(() => update({pending: false, result: str('batch').trim() === 'P-17' ? 'Отказ сервера: партия в карантине. Значения сохранены; выберите доступную партию.' : 'Приёмка зарегистрирована. Складское движение сохранено.'}), 600);
      };
      content = <form onSubmit={e => {e.preventDefault(); submit();}} noValidate><div className="experiment-inputs"><label className="experiment-field"><span>Партия (обязательно)</span><input aria-invalid={bool('submitted') && !batchValid} aria-describedby={`${id}-batch-help`} value={str('batch')} onChange={e => update({batch: e.target.value, result: ''})}/><small id={`${id}-batch-help`}>{bool('submitted') && !batchValid ? 'Введите номер в формате P-18.' : 'Например, P-18.'}</small></label><label className="experiment-field"><span>Количество (обязательно)</span><input inputMode="numeric" aria-invalid={bool('submitted') && !quantityValid} aria-describedby={`${id}-quantity-help`} value={str('formQuantity')} onChange={e => update({formQuantity: e.target.value, result: ''})}/><small id={`${id}-quantity-help`}>Целое число от 1 до 1000.</small></label></div><button className="experiment-action" disabled={bool('pending')} type="submit">{bool('pending') ? 'Сохраняем…' : 'Зарегистрировать приёмку'}</button>{output(bool('pending') ? 'Идёт проверка на сервере. Повторная отправка недоступна.' : str('result') || (bool('submitted') && (!batchValid || !quantityValid) ? 'Исправьте отмеченные поля. Запрос на сервер ещё не отправлен.' : 'Введите партию и количество.'))}</form>;
      break;
    }
    case 'contrast': {
      const ratio = grayContrast(number('gray')), hex = number('gray').toString(16).padStart(2, '0').repeat(3);
      content = <>{range('gray', 'Яркость текста', 0, 255)}<div className="contrast-sample" style={{color: '#' + hex}}>Партия P-18 готова к приёмке.<br/><small>#{hex} на #ffffff</small></div>{output(<><strong>{ratio.toFixed(4)}:1 — {ratio >= 4.5 ? 'AA для обычного текста выполнен' : 'AA для обычного текста не выполнен'}</strong><span>Сравнивается исходное значение, а не округлённое отображение.</span></>, ratio >= 4.5)}</>;
      break;
    }
    case 'access': {
      const allowed = accessAllowed(str('role'), str('action'), str('zone'));
      content = <><div className="experiment-inputs">{select('role', 'Роль', ['Кладовщик', 'Руководитель', 'Администратор'])}{select('action', 'Операция', ['Просмотр', 'Коррекция'])}{select('zone', 'Зона партии', ['Своя', 'Чужая'])}</div>{output(<><strong>{allowed ? 'Сервер разрешает запрос' : 'Сервер отклоняет запрос'}</strong><span>{str('role')} · {str('action')} · партия в зоне «{str('zone')}». Матрица учебная; роль администратора не универсальное разрешение в реальном проекте.</span></>, allowed)}</>;
      break;
    }
    case 'auth': {
      const change = (event: 'fail' | 'success' | 'unlock') => update(loginTransition({failures: number('failures'), locked: bool('locked'), loggedIn: bool('loggedIn')}, event));
      content = <><ol className="experiment-route">{['Ожидание', 'Ошибка', 'Блокировка', 'Вход'].map((label, i) => <li key={label} aria-current={(bool('loggedIn') ? 3 : bool('locked') ? 2 : number('failures') ? 1 : 0) === i ? 'step' : undefined}>{label}</li>)}</ol><div className="experiment-actions"><button disabled={bool('loggedIn')} onClick={() => change('fail')}>Неверный пароль</button><button disabled={bool('loggedIn')} onClick={() => change('success')}>Верный пароль</button><button disabled={!bool('locked')} onClick={() => change('unlock')}>Администратор: разблокировать</button><button disabled={!bool('loggedIn')} onClick={() => update({failures: 0, locked: false, loggedIn: false})}>Выйти</button></div>{output(<><strong>{bool('locked') ? 'Вход заблокирован' : bool('loggedIn') ? 'Сессия создана' : number('failures') ? 'Не удалось войти. Проверьте данные или восстановите доступ.' : 'Ожидание входа'}</strong><span>Учебная панель: ошибок подряд {number('failures')} / 3. Эти сведения показаны для разбора автомата; публичная форма не раскрывает существование записи.</span></>, bool('loggedIn') ? true : bool('locked') ? false : undefined)}</>;
      break;
    }
  }
  const summary=()=>{
    switch(lab.kind){
      case 'studio':return studioResult(Number(id.slice(0,2)),s).result;
      case 'weights':return `Вес маршрута ${number('weight')}%; A=${weightedScores(number('weight')).a.toFixed(2)}; B=${weightedScores(number('weight')).b.toFixed(2)}; допуск A: ${bool('allowed')}`;
      case 'rules':return `${number('amount')} из ${number('stock')} ед.; карантин: ${bool('quarantine')}; ${!bool('quarantine')&&number('amount')>0&&number('amount')<=number('stock')?'отгрузка разрешена':'отказ без движения'}`;
      case 'history':return `Текущее ${number('stock')} ед.; исправлений ${list('history').length}`;
      case 'auth':return `Ошибок ${number('failures')}; блокировка ${bool('locked')}; сессия ${bool('loggedIn')}`;
      case 'contrast':return `Контраст ${grayContrast(number('gray')).toFixed(4)}:1; ${grayContrast(number('gray'))>=4.5?'порог выполнен':'ниже порога'}`;
      case 'cost':return `${number('count')} × ${number('seconds')} с = ${number('count')*number('seconds')} с = ${(number('count')*number('seconds')/60).toFixed(1)} мин в день`;
      case 'offline':return `OP-${number('operation')}; защита по ID: ${bool('deduplicate')}; доставок ${number('delivered')}; остаток ${number('stock')}. ${str('result')}`;
      case 'access':return `${str('role')}; ${str('action')}; зона «${str('zone')}»: ${accessAllowed(str('role'),str('action'),str('zone'))?'разрешено':'отказ'}`;
      case 'search':return `Поиск «${str('query')}»; фильтр «${str('filter')}». Результат — пересечение условий.`;
      case 'prototype':return `Шаг ${number('step')+1}; P-18: ${number('quantity')} ед.; ${number('step')===2?'приёмка подтверждена':'до подтверждения'}`;
      case 'form':return `${str('batch')}; ${str('formQuantity')} ед. ${str('result')||'Ожидание проверки.'}`;
      case 'coverage':return `Проверены ${list('coverage').length} / 4: ${list('coverage').join('; ')||'нет'}`;
      default:return lab.lesson;
    }
  };
  const preset=(name:string)=>{
    if(name==='Свои условия'){setDemo({preset:name});return;}
    const mode=name==='Исходные условия'?0:name==='Изменённое условие'?1:2;
    const patch:Parameters<typeof setDemo>[0]={preset:name};
    for(const field of lab.fields||[])patch['studio_'+field.id]=field.options[mode===0?0:field.options.length-1];
    if(lab.kind==='weights')Object.assign(patch,{weight:[50,80,60][mode],allowed:mode!==2});
    if(lab.kind==='rules')Object.assign(patch,{stock:10,amount:[10,11,10][mode],quarantine:mode===2});
    if(lab.kind==='contrast')patch.gray=[119,118,255][mode];
    if(lab.kind==='access')Object.assign(patch,{role:'Руководитель',action:'Коррекция',zone:mode===1?'Чужая':'Своя'});
    if(lab.kind==='offline')Object.assign(patch,{deduplicate:mode!==1,stock:10,delivered:0,registered:[],operation:1,result:''});
    if(lab.kind==='auth')Object.assign(patch,{failures:mode===2?3:0,locked:mode===2,loggedIn:false});
    if(lab.kind==='form')Object.assign(patch,{batch:mode===1?'P-17':'P-18',formQuantity:mode===2?'0':'5',submitted:false,pending:false,result:''});
    if(lab.kind==='prototype')Object.assign(patch,{step:0,quantity:mode===1?8:10});
    if(lab.kind==='history')Object.assign(patch,{stock:10,quantity:mode===1?8:9,reason:'Пересчёт',history:[]});
    if(lab.kind==='search')Object.assign(patch,{query:'P-17',filter:mode===1?'Доступна':'Все'});
    if(lab.kind==='cost')Object.assign(patch,{count:mode===2?500:100,seconds:[3,5,10][mode]});
    if(lab.kind==='coverage')patch.coverage=mode===0?[]:mode===1?['Модель статуса','Состояние формы']:['Модель статуса','Серверный запрет','Состояние формы','Отрицательный тест'];
    update(patch);
  };
  const frame=<section className={`experiment ${laboratory?'laboratory':''}`} aria-label={lab.title} data-experiment={lab.kind}>
    {laboratory&&<><div className="laboratory-toolbar"><strong>Эксперимент с условиями и результатом</strong>{writable&&<button ref={expandButton} type="button" onClick={()=>setDemo({expanded:!bool('expanded')})}>{bool('expanded')?'Вернуться к лекции':'Развернуть эксперимент'}</button>}</div><p className="laboratory-setup">{lab.setup}</p><details className="laboratory-instructions"><summary>Порядок работы</summary><ol>{lab.procedure?.map(step=><li key={step}>{step}</li>)}</ol><p>Сначала предскажите результат. Затем измените одно условие, выполните действие и сравните два запуска. Граница: {lab.boundary}</p></details><div className="laboratory-modes"><span>Набор условий</span><PublicSelect aria-label="Набор условий" disabled={!writable} value={str('preset')} onChange={e=>preset(e.target.value)}>{['Исходные условия','Изменённое условие','Проверка границы','Свои условия'].map(name=><option key={name}>{name}</option>)}</PublicSelect></div><LaboratoryScene kind={lab.kind} phase={summary()} values={s} at={number('animationAt')} lecture={Number(id.slice(0,2))} fields={lab.fields}/></>}
    <fieldset disabled={!writable || bool('pending')}><legend className="sr-only">Параметры учебного примера</legend>{content}</fieldset>
    <p className="experiment-lesson">{lab.kind === 'choice' && number('choice') < 0 ? 'Обсудите основание выбора перед раскрытием результата.' : lab.lesson}</p>
    {laboratory&&<div className="laboratory-comparison"><h3>Сравните запуски</h3>{writable&&<><label className="experiment-field"><span>Прогноз или наблюдение</span><textarea aria-label="Прогноз или наблюдение" rows={2} maxLength={300} value={str('observation')} onChange={e=>setDemo({observation:e.target.value})}/></label><button type="button" disabled={list('trials').length>=8} onClick={()=>setDemo({trials:[...list('trials'),JSON.stringify({mode:str('preset'),params:(lab.fields||[]).map(f=>f.label+': '+String(s['studio_'+f.id])).join('; '),result:summary(),observation:str('observation')})]})}>Зафиксировать результат запуска</button></>}<ol>{list('trials').map((raw,i)=>{const trial=JSON.parse(raw) as {mode:string;params:string;result:string;observation:string};return <li key={i}><strong>Запуск {i+1}: {trial.mode}</strong>{trial.params&&<p>{trial.params}</p>}<p>{trial.result}</p>{trial.observation&&<p>Наблюдение: {trial.observation}</p>}</li>;})}</ol>{!list('trials').length&&<p>Сохраните исходный результат, измените параметр и сохраните второй. Объясните причину различия.</p>}<div className="laboratory-teacher"><button type="button" disabled={!writable} aria-expanded={bool('guideOpen')} onClick={()=>setDemo({guideOpen:!bool('guideOpen')})}>Подсказки для работы</button>{bool('guideOpen')&&<p>{lab.teacherGuide}</p>}</div></div>}
    {!writable && <p className="experiment-audience">Параметры меняет преподаватель.</p>}
  </section>;
  return bool('expanded')?createPortal(<dialog className="laboratory-dialog" ref={dialog} onCancel={e=>{e.preventDefault();if(writable)setDemo({expanded:false});}}>{frame}</dialog>,document.body):frame;
}
