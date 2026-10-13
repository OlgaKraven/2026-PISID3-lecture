import type {CSSProperties} from 'react';
import {studioResult,type LaboratoryField} from './laboratory-studio';

export function LaboratoryScene({kind,phase,values,at,lecture,fields=[]}:{kind:string;phase:string;values:Record<string,string|number|boolean|string[]>;at:number;lecture:number;fields?:LaboratoryField[]}){
 const n=(key:string)=>Number(values[key]);
 const b=(key:string)=>Boolean(values[key]);
 const ratio=n('weight')/100;
 const scores=[5*ratio+2*(1-ratio),3*ratio+5*(1-ratio)];
 const studioValues=Object.entries(values).filter(([key])=>key.startsWith('studio_')).map(([,value])=>String(value));
 const labels=kind==='studio'?[...studioValues.slice(0,3),'Проверяемый результат']:kind==='offline'?['OP-'+n('operation')+': +10 ед.','Доставок: '+n('delivered'),b('deduplicate')?'Проверить прежний ID':'Выполнить каждый повтор','Остаток: '+n('stock')]:kind==='rules'?['Партия: '+n('stock')+' ед.',b('quarantine')?'Карантин':'Партия доступна','Заказ: '+n('amount')+' ед.',!b('quarantine')&&n('amount')>0&&n('amount')<=n('stock')?'Отгрузка разрешена':'Отказ без движения']:kind==='auth'?['Предъявить логин','Проверить фактор',b('locked')?'Запись заблокирована':'Ошибок: '+n('failures'),b('loggedIn')?'Сессия создана':'Вход не выполнен']:kind==='prototype'?['Ввод: '+n('quantity')+' ед.','Проверка','Подтверждение','Шаг '+(n('step')+1)]:kind==='form'?['Ввод '+String(values.batch),'Количество: '+String(values.formQuantity),b('pending')?'Сервер проверяет':'Правило партии',String(values.result).startsWith('Отказ')?'Отказ, данные сохранены':String(values.result)?'Приёмка сохранена':'Ожидание']:kind==='history'?['Исходно: 10 ед.','Новое: '+n('quantity')+' ед.','Событий: '+((values.history as string[]).length),'Текущее: '+n('stock')+' ед.']:kind==='cost'?['Операций: '+n('count'),n('seconds')+' с на действие',(n('count')*n('seconds'))+' с в день',(n('count')*n('seconds')/60).toFixed(1)+' мин в день']:kind==='access'?[String(values.role),String(values.action),'Зона: '+String(values.zone),'Проверить полномочия']:kind==='search'?['Поиск: '+String(values.query),'Статус: '+String(values.filter),'Пересечение условий','Совпадения списка']:kind==='contrast'?['Серый: '+n('gray'),'Белый фон','Порог: 4,5:1','Сравнить без округления']:['Исходные условия','Решение','Проверка условий','Наблюдаемый результат'];
 const elapsed=Math.max(0,(Date.now()-at)/1000);
 const blocked=kind==='rules'&&(b('quarantine')||n('amount')<=0||n('amount')>n('stock'));
 const warehouse=lecture===1&&kind==='studio';
 const stored=warehouse&&values.studio_source==='Подтверждено'&&values.studio_temperature==='B-02: 2–8 °C'&&values.studio_capacity==='Есть место';
 const style={'--scene-delay':`${-Math.min(elapsed,3)}s`,'--scene-travel':blocked?'494px':'741px','--warehouse-end-x':stored?'592px':'235px','--warehouse-end-y':stored?'55px':'0px'} as CSSProperties;
 const studio=kind==='studio'&&!warehouse?studioResult(lecture,values):null;
 const wrap=(text:string)=>{const lines:string[]=[];for(const word of text.split(/\s+/)){if(!lines.length||lines.at(-1)!.length+word.length>24)lines.push(word);else lines[lines.length-1]+=' '+word;}return lines;};
 return <figure className="laboratory-scene" aria-label="Наглядный ход эксперимента">
  <svg key={at} viewBox={warehouse?'0 0 1000 220':studio?'0 0 1000 210':'0 0 1000 170'} role="img" aria-label={warehouse?'Размещение партии с температурой 2–8 °C в тёплой или холодной ячейке':studio?'Условия вместе определяют результат: '+studio.result:labels.join(' → ')} style={style}>
   <defs><marker id={'scene-arrow-'+kind} markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0 0 L6 3 L0 6" fill="#4561c8"/></marker></defs>
   {warehouse?<><rect x="24" y="54" width="190" height="98" rx="12" fill="#f4f6fa" stroke="#ced7e8"/><text x="119" y="85" textAnchor="middle" fontSize="21" fill="#263244">Новая партия</text><text x="119" y="116" textAnchor="middle" fontSize="21" fill="#263244">Нужно 2–8 °C</text><path d="M214 103H413M583 103H659V48H731M659 103V166H731" fill="none" stroke="#4561c8" strokeWidth="3"/><rect x="413" y="60" width="170" height="88" rx="12" fill={stored?'#e3f2eb':'#fff0ec'} stroke="#ced7e8"/><text x="498" y="93" textAnchor="middle" fontSize="18" fill="#263244">{stored?'Условия выполнены':'Проверка условий'}</text><text x="498" y="121" textAnchor="middle" fontSize="16" fill="#263244">{stored?'Можно разместить':'Движение запрещено'}</text><rect x="731" y="15" width="240" height="70" rx="9" fill="#fff0ec" stroke="#d8b6ad"/><text x="851" y="45" textAnchor="middle" fontSize="20" fill="#263244">B-01 · тёплая зона</text><text x="851" y="68" textAnchor="middle" fontSize="16" fill="#9c3232">Температура не подходит</text><rect x="731" y="131" width="240" height="70" rx="9" fill="#e3f2eb" stroke="#b8d3c5"/><text x="875" y="160" textAnchor="middle" fontSize="20" fill="#263244">B-02 · 2–8 °C</text><text x="875" y="185" textAnchor="middle" fontSize="17" fill="#263244">{values.studio_capacity==='Есть место'?'Место есть':'Места нет'}</text>{at>0&&<g className="warehouse-packet"><rect x="152" y="99" width="34" height="26" rx="4" fill="#ed131c"/><path d="M157 104h24m-12 0v16" stroke="white" strokeWidth="2"/></g>}</>:studio?<>
    {fields.map((field,i)=>{
     const y=20+i*62,value=String(values['studio_'+field.id]);
     return <g key={field.id}>
      <path d={`M340 ${y+30}H430V105H500`} fill="none" stroke="#4561c8" strokeWidth="2"/>
      <rect x="18" y={y} width="322" height="55" rx="8" fill="#f4f6fa" stroke="#ced7e8"/>
      <text x="30" y={y+18} fontSize="13" fill="#526076">{field.label}</text>
      <text x="30" y={y+39} fontSize="15" fontWeight="650" fill="#263244">{value}</text>
      {at>0&&<circle className="studio-condition-packet" cx="350" cy={y+30} r="6" fill="#ed131c" style={{'--studio-lane-y':`${105-(y+30)}px`} as CSSProperties}/>}
     </g>;
    })}
    <rect x="500" y="28" width="475" height="151" rx="12" fill={studio.issues.length?'#fff0ec':'#e3f2eb'} stroke="#ced7e8"/>
    <text x="520" y="56" fontSize="17" fontWeight="700" fill="#263244">{studio.issues.length?'Условия требуют уточнения':'Условия согласованы'}</text>
    <text x="520" y="83" fontSize="17" fill="#263244">{wrap(studio.result).reduce((lines,line)=>{
      if(lines.length&&lines.at(-1)!.length+line.length<49)lines[lines.length-1]+=' '+line;else lines.push(line);return lines;
     },[] as string[]).map((line,i)=><tspan key={i} x="520" dy={i?23:0}>{line}</tspan>)}</text>
   </>:kind==='weights'?<>{scores.map((score,i)=><g key={i}><text x="20" y={48+i*58} fontSize="20" fill="#263244">{i===0?'A':'B'}</text><rect x="65" y={23+i*58} width="800" height="34" rx="7" fill="#edf0f6"/><rect className="scene-bar" x="65" y={23+i*58} width={score/5*800} height="34" rx="7" fill={i===0&&!b('allowed')?'#aeb8c9':i===0?'#4561c8':'#20794c'}/><text x="885" y={47+i*58} fontSize="20" fill="#263244">{score.toFixed(2)}</text></g>)}<text x="65" y="155" fontSize="17" fill="#526076">{b('allowed')?'Меняются веса и итоговые оценки.':'A исключён обязательным условием, несмотря на его оценку.'}</text></>:<>
    {labels.map((label,i)=><g key={i} className={`scene-station scene-station-${i}`}><rect x={18+i*247} y="34" width="220" height="78" rx="12" fill={i===3?'#e8eefc':'#f4f6fa'} stroke="#ced7e8"/><text x={128+i*247} y={wrap(label).length>1?65:79} textAnchor="middle" fontSize="17" fontWeight="650" fill="#263244">{wrap(label).map((line,j)=><tspan key={j} x={128+i*247} dy={j?21:0}>{line}</tspan>)}</text>{i<3&&<path className="scene-connection" d={`M${238+i*247} 74 H${262+i*247}`} stroke="#4561c8" strokeWidth="3" markerEnd={`url(#scene-arrow-${kind})`}/>}</g>)}
    {at>0&&<g className="scene-packet"><rect x="103" y="117" width="46" height="25" rx="5" fill="#ed131c"/><path d="M108 122h36m-24 0v16" stroke="white" strokeWidth="2"/></g>}
   </>}
  </svg>
  <figcaption>{phase||'Измените условие или выполните действие — анимация покажет путь к результату.'}</figcaption>
 </figure>;
}
