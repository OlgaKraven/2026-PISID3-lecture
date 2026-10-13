export function LaboratoryEntry({interactive}:{interactive:boolean}){
 if(!interactive||new URLSearchParams(location.search).get('mode')==='audience')return null;
 const open=()=>document.querySelector<HTMLButtonElement>('.presenter-controls button[aria-label="Следующий слайд"],.deck-controls button[aria-label="Следующий слайд"]')?.click();
 return <button className="button primary laboratory-entry" onClick={open}>Начать эксперимент</button>;
}
