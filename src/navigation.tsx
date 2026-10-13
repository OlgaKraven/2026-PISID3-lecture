import {useEffect} from 'react';

const surface = '.active-slide,.mini-stage:not(.next-stage)';
const interactive = 'button,a,input,textarea,select,[contenteditable],[role="slider"],.experiment,.infographic-mobile,.diagram-table-scroll';

export function SlideNavigation() {
  useEffect(() => {
    let gesture: {id: number; x: number; y: number; time: number} | null = null;
    let wheel = 0, lastWheel = 0, lastTurn = 0;
    const navigate = (direction: 1 | -1) => {
      if (document.querySelector('dialog[open],.tour-card') || document.getElementById('root')?.inert) return;
      const control = document.querySelector<HTMLButtonElement>(`${document.querySelector('.presenter-controls') ? '.presenter-controls' : '.deck-controls'} button[aria-label="${direction === 1 ? 'Следующий' : 'Предыдущий'} слайд"]`);
      if (control && !control.disabled) control.click();
    };
    const start = (e: PointerEvent) => {
      const target = e.target as HTMLElement;
      if (e.pointerType === 'touch' && !e.isPrimary) {gesture = null; return;}
      if (e.pointerType !== 'touch' || !e.isPrimary || !target.closest(surface) || target.closest(interactive)) return;
      gesture = {id: e.pointerId, x: e.clientX, y: e.clientY, time: performance.now()};
    };
    const end = (e: PointerEvent) => {
      if (!gesture || gesture.id !== e.pointerId) return;
      const g = gesture; gesture = null;
      const dx = e.clientX - g.x, dy = e.clientY - g.y;
      if (performance.now() - g.time < 1200 && Math.abs(dx) >= 55 && Math.abs(dx) > Math.abs(dy) * 1.5) navigate(dx < 0 ? 1 : -1);
    };
    const cancel = () => {gesture = null;};
    const onWheel = (e: WheelEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(surface) || target.closest(interactive) || e.ctrlKey || Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      const now = performance.now();
      if (now - lastWheel > 180 || Math.sign(e.deltaX) !== Math.sign(wheel)) wheel = 0;
      lastWheel = now; wheel += e.deltaX * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? innerWidth : 1);
      if (Math.abs(wheel) >= 80 && now - lastTurn > 600) {navigate(wheel > 0 ? 1 : -1); wheel = 0; lastTurn = now;}
      e.preventDefault();
    };
    document.addEventListener('pointerdown', start);
    document.addEventListener('pointerup', end);
    document.addEventListener('pointercancel', cancel);
    document.addEventListener('wheel', onWheel, {passive: false});
    return () => {
      document.removeEventListener('pointerdown', start); document.removeEventListener('pointerup', end);
      document.removeEventListener('pointercancel', cancel); document.removeEventListener('wheel', onWheel);
    };
  }, []);
  return null;
}
