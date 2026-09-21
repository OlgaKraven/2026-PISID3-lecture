import type {Course} from '@olgakraven/lecture-engine';
type Visual = NonNullable<Course['lectures'][number]['slides'][number]['visual']>;

// Route every relation above the cards. The engine's straight edges cross
// intermediate cards, visually turning a branching graph into a false chain.
export function networkLayout(visual: Extract<Visual, {type: 'network'}>, marker: string) {
  const gap=28, width=(992-gap*(visual.nodes.length-1))/visual.nodes.length;
  const nodeY=visual.edges.length*34+45, nodeHeight=130;
  const center=(id:string)=>24+visual.nodes.findIndex(n=>n.id===id)*(width+gap)+width/2;
  const wrap=(text:string,limit:number)=>{
    const lines:string[]=[];
    for(const word of text.split(/\s+/)){if(!lines.length||lines.at(-1)!.length+word.length+1>limit)lines.push(word);else lines[lines.length-1]+=' '+word;}
    return lines;
  };
  return {height:nodeY+nodeHeight+40+visual.edges.length*32,content:<>
    {visual.edges.map((edge,i)=>{
      const from=center(edge.from)-8, to=center(edge.to)+8, lane=24+i*34;
      return <g key={`edge-${i}`}><path data-relation={`${edge.from}:${edge.to}`} d={`M${from} ${nodeY} V${lane} H${to} V${nodeY-4}`} fill="none" stroke="#6B778B" strokeWidth="2" markerEnd={`url(#${marker})`}/><circle cx={(from+to)/2} cy={lane} r="12" fill="white" stroke="#AEB8C8"/><text x={(from+to)/2} y={lane+5} textAnchor="middle" fontSize="15" fill="#334155">{i+1}</text></g>;
    })}
    {visual.nodes.map((node,i)=>{
      const x=24+i*(width+gap), titleLines=wrap(node.title,Math.floor((width-36)/13));
      return <g key={node.id}><rect x={x} y={nodeY} width={width} height={nodeHeight} rx="12" fill="#F8FAFD" stroke="#D5DDEB"/><path d={`M${x+2} ${nodeY+18} V${nodeY+nodeHeight-18}`} stroke={i===0?'#ED131C':'#4561C8'} strokeWidth="4"/><text x={x+18} y={nodeY+31} fontSize="22" fontWeight="700" fill="#20242C">{titleLines.map((line,j)=><tspan key={j} x={x+18} dy={j?26:0}>{line}</tspan>)}</text><text x={x+18} y={nodeY+34+titleLines.length*26} fontSize="18" fill="#475569">{wrap(node.text,Math.floor((width-36)/10)).map((line,j)=><tspan key={j} x={x+18} dy={j?22:0}>{line}</tspan>)}</text></g>;
    })}
    {visual.edges.map((edge,i)=><text key={`legend-${i}`} x="28" y={nodeY+nodeHeight+32+i*32} fontSize="18" fill="#20242C">{i+1}. {visual.nodes.find(n=>n.id===edge.from)?.title} → {visual.nodes.find(n=>n.id===edge.to)?.title}: {edge.label}</text>)}
  </>};
}
