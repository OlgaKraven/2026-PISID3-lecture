import {useEffect, useRef, useState} from 'react';

type Value = string | number | boolean | string[];
type DemoState = Record<string, Value>;
const memory = new Map<string, DemoState>();

// A separate, session-scoped channel carries only the public demonstration state.
// Notes and assessment keys never enter this channel. Audience cannot drive it.
export function useDemoState(id: string, initial: DemoState, writable: boolean, version: string) {
  const session = new URLSearchParams(location.search).get('session');
  const channelName = `lecture-experiment:${location.pathname}:${version}:${session}`;
  const key = `${channelName}:${id}`;
  const savedKey=`pisid-draft:${location.pathname}:${version}:${id}`;
  const [state, setState] = useState<DemoState>(() => {
    if(memory.has(key))return memory.get(key)!;
    if(writable&&id.startsWith('practice:'))try{const saved=JSON.parse(localStorage.getItem(savedKey)||'null');if(saved&&Object.keys(initial).every(k=>typeof saved[k]===typeof initial[k]))return saved;}catch{}
    return initial;
  });
  const current = useRef(state);
  const channel = useRef<BroadcastChannel | null>(null);
  current.current = state;
  const audience = new URLSearchParams(location.search).get('mode') === 'audience';
  useEffect(() => {
    if (!session || typeof BroadcastChannel === 'undefined' || (!writable && !audience)) return;
    const bus = new BroadcastChannel(channelName); channel.current = bus;
    bus.onmessage = ({data}) => {
      if (data?.id !== id || data?.protocol !== 1) return;
      if (data.type === 'HELLO' && writable) bus.postMessage({protocol: 1, type: 'STATE', id, state: current.current});
      if (data.type !== 'STATE' || !audience || !data.state || typeof data.state !== 'object') return;
      const value = data.state as DemoState;
      if (Object.keys(value).length !== Object.keys(initial).length) return;
      for (const [field, template] of Object.entries(initial)) {
        if (Array.isArray(template)) {if (!Array.isArray(value[field]) || (value[field] as string[]).length > 100 || !(value[field] as string[]).every(v => typeof v === 'string' && v.length < 2000)) return;}
        else if (typeof value[field] !== typeof template || (typeof value[field] === 'number' && !Number.isFinite(value[field]))) return;
      }
      memory.set(key, value); setState(value);
    };
    bus.postMessage(writable ? {protocol: 1, type: 'STATE', id, state: current.current} : {protocol: 1, type: 'HELLO', id});
    return () => {bus.close(); channel.current = null;};
    // Initial values describe a fixed schema for this slide; changing state does
    // not recreate the channel or resend HELLO during audience updates.
  }, [id, key, session, channelName, writable, audience]);
  const update = (patch: DemoState) => {
    if (!writable) return;
    const next = {...current.current, ...patch};
    memory.set(key, next); current.current = next; setState(next);
    if(id.startsWith('practice:'))try{localStorage.setItem(savedKey,JSON.stringify(next))}catch{}
    channel.current?.postMessage({protocol: 1, type: 'STATE', id, state: next});
  };
  return [state, update] as const;
}
