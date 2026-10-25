export function experimentVisual(lab) {
  if(lab.kind==='studio')return {type:'matrix',columns:['Параметр решения','Допустимые условия'],rows:lab.fields.map(f=>[f.label,f.options.join(' / ')]),caption:lab.expected};
  const caption = lab.lesson;
  const process = (items, type = 'process') => ({type, items: items.map(([title, text]) => ({title, text})), caption});
  if (lab.kind === 'choice') return {type: 'matrix', columns: ['Выбор', 'Последствие'], rows: lab.choices, caption};
  switch (lab.kind) {
    case 'rules': return {type:'decision',start:'Отгрузка P-17',question:'0 < заказ ≤ остаток и нет карантина?',yes:'Сохранить одно движение',no:'Отказ; остаток не меняется',caption};
    case 'history': return process([['До','10 единиц'],['Коррекция','10 → 8; причина и автор'],['После','8 единиц, исходное событие сохранено']], 'timeline');
    case 'coverage': return {type:'network',nodes:[{id:'r',title:'REQ-14',text:'Запрет карантина'},{id:'m',title:'Статус',text:'Модель данных'},{id:'p',title:'Доступ',text:'Проверка запроса'},{id:'t',title:'Тест',text:'Отказ без движения'}],edges:[{from:'r',to:'m',label:'представлен'},{from:'r',to:'p',label:'контролируется'},{from:'r',to:'t',label:'проверяется'}],caption};
    case 'weights': return {type:'bars',items:[{label:'A: 5 × 0,5 + 2 × 0,5',value:3.5},{label:'B: 3 × 0,5 + 5 × 0,5',value:4}],max:5,unit:'балла',caption};
    case 'offline': return process([['Клиент','OP-1, +10 единиц'],['Сеть','Повтор той же операции'],['Сервер','По ID возвращает прежний результат']]);
    case 'cost': return {type:'bars',items:[{label:'100 операций × 3 с',value:300},{label:'100 операций × 5 с',value:500}],max:500,unit:'с/день',caption};
    case 'search': return {type:'tree',root:'Партии склада',branches:[{title:'Доступные',items:['P-18, A-01','P-19, A-02']},{title:'Карантин',items:['P-17, A-01']}],caption};
    case 'prototype': return process([['Сканирование','Партия и количество'],['Проверка','Возврат с сохранением данных'],['Подтверждение','Приёмка зарегистрирована']]);
    case 'form': return {type:'decision',start:'Партия и количество',question:'Формат допустим?',yes:'Проверить правило на сервере',no:'Назвать ошибку у поля',caption};
    case 'contrast': return {type:'bars',items:[{label:'#777777 на белом',value:4.478089453577214},{label:'#767676 на белом',value:4.542224959605253}],max:7,threshold:4.5,unit:':1',caption};
    case 'access': return {type:'matrix',columns:['Роль','Просмотр','Создать корректировку','Подтвердить'],rows:[['Кладовщик','Своя зона','Своя зона','Нет'],['Руководитель','Своя зона','Своя зона','Своя зона; не автор'],['Администратор аккаунтов','Нет по этой роли','Нет по этой роли','Нет по этой роли']],caption:'Административная роль не выдаёт складские права. Подтверждение требует независимого согласующего.'};
    case 'auth': return {type:'states',states:['Ожидание','Ошибка','Блокировка','Восстановление','Вход'],cancelFrom:[],caption};
    default: throw Error(`Неизвестный эксперимент: ${lab.kind}`);
  }
}
