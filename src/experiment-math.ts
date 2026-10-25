export function weightedScores(routeWeight: number) {
  const w = Math.max(0, Math.min(100, routeWeight)) / 100;
  return {a: 5 * w + 2 * (1 - w), b: 3 * w + 5 * (1 - w)};
}
export function grayContrast(gray: number) {
  const channel = gray / 255;
  const luminance = channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  return 1.05 / (luminance + 0.05);
}
export function accessAllowed(role: string, operation: string, zone: string, isAuthor=false) {
  if(!['Кладовщик','Руководитель'].includes(role)||zone!=='Своя')return false;
  if(operation==='Просмотр'||operation==='Создание корректировки')return true;
  return operation==='Подтверждение корректировки'&&role==='Руководитель'&&!isAuthor;
}
export function loginTransition(state: {failures: number; locked: boolean; loggedIn: boolean}, event: 'fail' | 'success' | 'unlock') {
  if (event === 'unlock') return {failures: 0, locked: false, loggedIn: false};
  if (state.locked || state.loggedIn) return state;
  if (event === 'success') return {failures: 0, locked: false, loggedIn: true};
  const failures = state.failures + 1;
  return {failures, locked: failures >= 3, loggedIn: false};
}
