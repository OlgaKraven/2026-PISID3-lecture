import type {Slide} from '@olgakraven/lecture-engine';
export function artifactLayout(visual:Extract<NonNullable<Slide['visual']>,{type:'callouts'}>,base:string){
 return {height:300,content:<image href={base+visual.image} x={12} y={8} width={1016} height={284} preserveAspectRatio="xMidYMid meet" aria-label={visual.alt} data-artifact-image={visual.image}/>};
}
