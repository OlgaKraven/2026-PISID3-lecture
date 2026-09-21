import {fileURLToPath} from 'node:url';
import type {Plugin} from 'vite';
export function diagramLayoutPlugin():Plugin {
  const adapter=fileURLToPath(new URL('../src/network-layout.tsx',import.meta.url));
  return {name:'lecture-network-relations',enforce:'pre',transform(code,id){
    if(!id.split('?')[0].replaceAll('\\','/').endsWith('/@olgakraven/lecture-engine/lib/SlideView-CKuVrZ7x.js'))return;
    const signature='function Ze(e, t, n) {';
    if(code.split(signature).length!==2)throw Error('Engine diagram layout changed; review diagram-layout-plugin.ts.');
    return {code:`import {networkLayout as courseNetworkLayout} from ${JSON.stringify(adapter)};\n`+code.replace(signature,signature+'\n if(e.type === "network") return courseNetworkLayout(e, t);'),map:null};
  }};
}
