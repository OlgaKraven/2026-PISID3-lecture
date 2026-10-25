import type {Course} from '@olgakraven/lecture-engine';
type Visual = NonNullable<Course['lectures'][number]['slides'][number]['visual']>;

// Route every relation above the cards. The engine's straight edges cross
// intermediate cards, visually turning a branching graph into a false chain.
export function networkLayout(visual: Extract<Visual, {type: 'network'}>, marker: string) {
  const gap=28, width=(992-gap*(visual.nodes.length-1))/visual.nodes.length;
  const nodeY=visual.edges.length*26+36;
  const center=(id:string)=>24+visual.nodes.findIndex(n=>n.id===id)*(width+gap)+width/2;
  const wrap=(text:string,limit:number)=>{
    const lines:string[]=[];
    for(const word of text.split(/\s+/)){
      if(word.length>limit){for(let i=0;i<word.length;i+=limit)lines.push(word.slice(i,i+limit));}
      else if(!lines.length||lines.at(-1)!.length+word.length+1>limit)lines.push(word);
      else lines[lines.length-1]+=' '+word;
    }
    return lines;
  };
  const nodes=visual.nodes.map(node=>({...node,titleLines:wrap(node.title,Math.max(7,Math.floor((width-36)/15))),bodyLines:wrap(node.text,Math.max(8,Math.floor((width-36)/13)))}));
  const nodeHeight=Math.max(120,...nodes.map(n=>38+n.titleLines.length*32+n.bodyLines.length*30));
  const legends=visual.edges.map((e,i)=>wrap(`${i+1}. ${visual.nodes.find(n=>n.id===e.from)?.title} → ${visual.nodes.find(n=>n.id===e.to)?.title}: ${e.label}`,78));
  const legendY=(i:number)=>nodeY+nodeHeight+34+legends.slice(0,i).reduce((n,x)=>n+x.length*28+8,0);
  return {height:legendY(legends.length)+10,content:<>
    {visual.edges.map((edge,i)=>{
      const from=center(edge.from)-8, to=center(edge.to)+8, lane=20+i*26;
      return <g key={`edge-${i}`}><path data-relation={`${edge.from}:${edge.to}`} d={`M${from} ${nodeY} V${lane} H${to} V${nodeY-4}`} fill="none" stroke="#6B778B" strokeWidth="2" markerEnd={`url(#${marker})`}/><circle cx={(from+to)/2} cy={lane} r="12" fill="white" stroke="#AEB8C8"/><text x={(from+to)/2} y={lane+6} textAnchor="middle" fontSize="18" fill="#334155">{i+1}</text></g>;
    })}
    {nodes.map((node,i)=>{
      const x=24+i*(width+gap);
      return <g key={node.id}><rect x={x} y={nodeY} width={width} height={nodeHeight} rx="12" fill="#F8FAFD" stroke="#D5DDEB"/><path d={`M${x+2} ${nodeY+18} V${nodeY+nodeHeight-18}`} stroke={i===0?'#ED131C':'#4561C8'} strokeWidth="4"/><text x={x+18} y={nodeY+32} fontSize="28" fontWeight="700" fill="#20242C">{node.titleLines.map((line,j)=><tspan key={j} x={x+18} dy={j?32:0}>{line}</tspan>)}</text><text x={x+18} y={nodeY+35+node.titleLines.length*32} fontSize="26" fill="#475569">{node.bodyLines.map((line,j)=><tspan key={j} x={x+18} dy={j?30:0}>{line}</tspan>)}</text></g>;
    })}
    {legends.map((lines,i)=><text key={`legend-${i}`} x="28" y={legendY(i)} fontSize="24" fill="#20242C">{lines.map((line,j)=><tspan key={j} x="28" dy={j?28:0}>{line}</tspan>)}</text>)}
  </>};
}
