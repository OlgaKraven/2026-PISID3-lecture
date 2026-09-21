import {useEffect, useLayoutEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import './guided-tour.css';

type Screen = 'catalog' | 'lecture' | 'presenter' | 'hidden';
type Step = {title: string; text: string; target: () => HTMLElement | null; action?: string; nextScreen?: Screen};
const find = (selector: string) => document.querySelector<HTMLElement>(`#root ${selector}`);
const button = (name: string) => [...document.querySelectorAll<HTMLButtonElement>('#root button')]
  .find(el => (el.getAttribute('aria-label') || el.textContent?.trim()) === name && el.getClientRects().length > 0) || null;
const screen = (): Screen => {
  const mode = new URLSearchParams(location.search).get('mode');
  if (mode === 'audience' || mode === 'print') return 'hidden';
  if (find('[aria-label="Разделы заметок"]')) return 'presenter';
  if (find('.deck-controls')) return 'lecture';
  if (find('[aria-label="Поиск по всему курсу"]')) return 'catalog';
  return 'hidden';
};
const steps: Record<Exclude<Screen, 'hidden'>, Step[]> = {
  catalog: [
    {title: 'Найдите нужную лекцию', text: 'Введите тему или термин в поиск. Курс найдёт совпадения в названиях и содержании слайдов. Для первого знакомства оставьте поиск пустым.', target: () => find('[aria-label="Поиск по всему курсу"]')},
    {title: 'Подготовьте занятие', text: '«Настройка перед занятием» открывает параметры преподавателя, материалов и оформления. Эти настройки сохраняются в вашем браузере.', target: () => button('Настройка перед занятием')},
    {title: 'Подготовьте курс без интернета', text: 'В «Инструментах курса» можно проверить готовность и скачать курс для офлайн-работы. Дождитесь подтверждения загрузки. Внешние файлы Яндекс Диска скачиваются отдельно.', target: () => button('Инструменты курса')},
    {title: 'Сохраните лекцию в PDF', text: 'Кнопка «Сохранить PDF» в карточке открывает печатное представление. В диалоге печати выберите сохранение в PDF. Заметки преподавателя в файл не входят.', target: () => button('Сохранить PDF')},
    {title: 'Откройте лекцию', text: 'Нажмите кнопку ниже — откроется первая видимая лекция, и тур продолжится уже на её кнопках. Позже так можно открыть любую тему в каталоге.', target: () => button('Открыть'), action: 'Открыть лекцию и продолжить', nextScreen: 'lecture'},
  ],
  lecture: [
    {title: 'Перелистывайте слайды', text: 'Кнопки «Назад» и «Вперёд» находятся под слайдом. После завершения тура также работают стрелки клавиатуры. Счётчик показывает текущую страницу и общее число слайдов.', target: () => find('.deck-controls')},
    {title: 'Перейдите сразу к нужному вопросу', text: 'Кнопка «Открыть содержание» показывает список слайдов и поиск по лекции. Такой же список открывается нажатием на счётчик под слайдом.', target: () => button('Открыть содержание')},
    {title: 'Разверните лекцию на весь экран', text: 'Эта кнопка включает полноэкранный режим текущего окна. Для выхода используйте Escape. В режиме двух окон полный экран для аудитории включается в самом окне аудитории.', target: () => button('Полноэкранный режим')},
    {title: 'Скачайте текущую лекцию', text: '«Скачать лекцию» открывает варианты сохранения. Для PDF откроется печатное представление; проверьте страницы перед сохранением.', target: () => button('Скачать лекцию')},
    {title: 'Запустите занятие в двух окнах', text: 'Кнопка ниже действительно откроет окно аудитории и панель преподавателя. Перенесите окно аудитории на проектор. Если браузер заблокирует новое окно, разрешите всплывающие окна и воспользуйтесь «Открыть аудиторию» в панели.', target: () => button('Начать занятие в двух окнах'), action: 'Запустить два окна и продолжить', nextScreen: 'presenter'},
  ],
  presenter: [
    {title: 'Подключите окно аудитории', text: '«Открыть аудиторию» повторно открывает окно показа, если оно закрыто или было заблокировано. На проектор переносите именно его: заметки остаются в панели преподавателя.', target: () => button('Открыть аудиторию')},
    {title: 'Читайте сценарий к текущему слайду', text: 'Здесь уже загружены заметки курса. Вкладки «Подготовка», «Запись», «Вопросы» и «Ответы» показывают соответствующие части сценария. Переключение вкладок не меняет слайд аудитории.', target: () => find('[aria-label="Разделы заметок"]')},
    {title: 'Настройте размер заметок', text: 'Ползунок меняет только размер текста сценария в вашей панели. Текст на проекторе остаётся прежним.', target: () => find('.note-font')},
    {title: 'Дополните сценарий', text: 'Нажмите «Редактировать», чтобы изменить заметку выбранного слайда. Правки сохраняются в этом браузере. Они не публикуются на сайте и не переносятся на другой компьютер автоматически.', target: () => button('Редактировать') || button('Читать')},
    {title: 'Сохраните свои заметки', text: '«Сохранить заметки» скачивает резервную копию в JSON. «Загрузить заметки» позволяет перенести совместимый файл. Перед импортом сохраните текущие правки. Файл должен соответствовать версии курса.', target: () => find('.notes-files')},
    {title: 'Сделайте паузу в показе', text: '«Чёрный экран» скрывает слайд у аудитории, сохраняя вашу панель. Нажмите «Вернуть слайд», чтобы продолжить показ.', target: () => button('Чёрный экран') || button('Вернуть слайд')},
    {title: 'Завершите занятие', text: 'Кнопка «Завершить» выходит из панели преподавателя. Тур можно повторить в любой момент кнопкой «Тур по кнопкам». Сейчас нажмите «Готово» и попробуйте управление самостоятельно.', target: () => button('Завершить')},
  ],
};

export function GuidedTour() {
  const [current, setCurrent] = useState<Screen>(screen);
  const [active, setActive] = useState(false);
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState({top: 0, left: 0, width: 0, height: 0});
  const [missing, setMissing] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState('');
  const [cardHeight, setCardHeight] = useState(300);
  const panel = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const expected = useRef<Screen | null>(null);
  const requested = useRef(new URLSearchParams(location.search).get('tour') === '1');
  const list = current === 'hidden' ? [] : steps[current];
  const step = list[index];

  useEffect(() => {
    const update = () => setCurrent(screen());
    const observer = new MutationObserver(update);
    observer.observe(document.getElementById('root')!, {childList: true, subtree: true});
    window.addEventListener('popstate', update);
    update();
    return () => {observer.disconnect(); window.removeEventListener('popstate', update);};
  }, []);

  useEffect(() => {
    setIndex(0);
    if (current !== 'hidden') {
      setWaiting(false); expected.current = null;
      if (requested.current) {
        requested.current = false; setActive(true);
        const url = new URL(location.href); url.searchParams.delete('tour');
        history.replaceState(history.state, '', url);
      }
    }
  }, [current]);

  useEffect(() => {
    if (!active) return;
    const root = document.getElementById('root')!;
    const oldInert = root.inert;
    root.inert = true;
    const keys = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {event.preventDefault(); setActive(false);}
      if (event.key === 'Tab') {
        const buttons = [...(panel.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') || [])];
        const first = buttons[0], last = buttons.at(-1);
        if (event.shiftKey && (document.activeElement === first || !panel.current?.contains(document.activeElement))) {event.preventDefault(); last?.focus();}
        else if (!event.shiftKey && (document.activeElement === last || !panel.current?.contains(document.activeElement))) {event.preventDefault(); first?.focus();}
      }
      event.stopImmediatePropagation();
    };
    window.addEventListener('keydown', keys, true);
    return () => {root.inert = oldInert; window.removeEventListener('keydown', keys, true); previousFocus.current?.focus();};
  }, [active]);

  useLayoutEffect(() => {
    if (!active || !step || waiting) return;
    const target = step.target();
    target?.scrollIntoView({behavior: 'instant', block: 'center', inline: 'nearest'});
    panel.current?.focus({preventScroll: true});
    const update = () => {
      const el = step.target();
      setMissing(!el || !el.getClientRects().length);
      const r = el?.getBoundingClientRect();
      if (r) setRect(old => old.top === r.top && old.left === r.left && old.width === r.width && old.height === r.height ? old : {top: r.top, left: r.left, width: r.width, height: r.height});
    };
    update();
    const timer = window.setInterval(update, 200);
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {clearInterval(timer); window.removeEventListener('resize', update); window.removeEventListener('scroll', update, true);};
  }, [active, step, waiting]);

  useLayoutEffect(() => {
    if (!active || !panel.current) return;
    const measure = () => setCardHeight(panel.current?.getBoundingClientRect().height || 300);
    const observer = new ResizeObserver(measure);
    observer.observe(panel.current); measure();
    return () => observer.disconnect();
  }, [active]);

  useEffect(() => {
    if (!waiting) return;
    const timer = window.setTimeout(() => {
      if (expected.current) {setWaiting(false); setError('Переход не завершился. Закройте тур, откройте нужный режим и запустите тур снова.');}
    }, 8000);
    return () => clearTimeout(timer);
  }, [waiting]);

  const start = () => {previousFocus.current = document.activeElement as HTMLElement; setIndex(0); setError(''); setActive(true);};
  const next = () => {
    setError('');
    if (step?.action) {
      const target = step.target();
      if (!target) {setError('Кнопка сейчас недоступна. Закройте тур и очистите поиск или выберите другую лекцию.'); return;}
      // Keep window.open in the user's click gesture, so popup blockers can allow it.
      expected.current = step.nextScreen || null;
      setWaiting(true); target.click();
    } else if (index + 1 < list.length) setIndex(index + 1);
    else setActive(false);
  };
  const compact = innerWidth < 720;
  const cardWidth = Math.min(390, innerWidth - 24);
  const below = rect.top + rect.height + 18;
  const cardTop = Math.max(12, Math.min(innerHeight - cardHeight - 12, below + cardHeight < innerHeight - 12 ? below : rect.top - cardHeight - 18));
  const cardLeft = Math.max(12, Math.min(rect.left, innerWidth - cardWidth - 12));

  if (!active && current === 'hidden') return null;
  return createPortal(<div className="guided-tour">
    {!active && <button className="tour-launch" onClick={start}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m10 8 6 4-6 4z"/></svg>Тур по кнопкам</button>}
    {active && <>
      <div className="tour-shield" aria-hidden="true" />
      {!missing && !waiting && step && <div className="tour-spotlight" aria-hidden="true" style={{top: rect.top - 5, left: rect.left - 5, width: rect.width + 10, height: rect.height + 10}} />}
      <div className="tour-card" ref={panel} role="dialog" aria-modal="true" aria-labelledby="tour-title" aria-describedby="tour-text" tabIndex={-1}
        style={compact ? {...(rect.top > innerHeight * .45 ? {top: 12} : {bottom: 12}), left: 12, right: 12} : {top: cardTop, left: cardLeft, width: cardWidth}}>
        <div className="tour-heading"><span>{current === 'catalog' ? 'Знакомство с курсом' : current === 'lecture' ? 'Просмотр лекции' : 'Панель преподавателя'} · {index + 1} / {list.length || 1}</span><button onClick={() => setActive(false)} aria-label="Закрыть тур">×</button></div>
        <div className="tour-progress" aria-hidden="true"><span style={{width: `${(index + 1) / (list.length || 1) * 100}%`}} /></div>
        <h2 id="tour-title">{waiting ? 'Открываем следующий режим…' : step?.title || 'Дождитесь загрузки'}</h2>
        <p id="tour-text">{waiting ? 'Тур продолжится после появления кнопок.' : step?.text || 'Если экран не появился, закройте тур и повторите запуск.'}</p>
        {missing && !waiting && <p className="tour-error">Этот элемент сейчас не виден. Можно пропустить пояснение или закрыть тур и изменить поиск.</p>}
        {error && <p role="alert" className="tour-error">{error}</p>}
        <div className="tour-actions"><button disabled={index === 0 || waiting} onClick={() => {setError(''); setIndex(index - 1);}}>Назад</button><button className="tour-next" disabled={waiting || !step || (missing && Boolean(step.action))} onClick={next}>{step?.action || (index + 1 === list.length ? 'Готово' : 'Далее')}</button></div>
        <p className="tour-hint">Esc — закрыть. Повторный запуск — «Тур по кнопкам».</p>
      </div>
    </>}
  </div>, document.body);
}

