'use client';

import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {
  HEADLINE_DECK_KEY,buildHeadlinePool,drawHeadline,localSearchStorageKey,readDeck,
  type Headline,type HeadlineDeck,type HeadlineLanguage,
} from '@/lib/home-prompts';

type Args={
  language:HeadlineLanguage;
  name:string;
  email:string;
  recentItems:readonly string[];
  ready:boolean;
  active:boolean;
};

export function useHomeHeadline({language,name,email,recentItems,ready,active}:Args){
  const [hour,setHour]=useState(()=>new Date().getHours());
  const [visible,setVisible]=useState(true);
  const [reducedMotion,setReducedMotion]=useState(false);
  const [headline,setHeadline]=useState<Headline|null>(null);
  const [count,setCount]=useState(0);
  const [phase,setPhase]=useState<'typing'|'hold'|'deleting'>('typing');
  const initializedKey=useRef<string|null>(null);
  const deckRef=useRef<HeadlineDeck|null>(null);
  const pool=useMemo(()=>buildHeadlinePool({hour,name,recentItems}),[hour,name,recentItems]);
  const key=HEADLINE_DECK_KEY+(email?'-'+localSearchStorageKey(email).split('-').pop():'-guest');

  const advance=useCallback(()=>{
    const next=drawHeadline(pool,deckRef.current);
    deckRef.current=next.deck;
    try{window.localStorage.setItem(key,JSON.stringify(next.deck));}catch{/* private browsing */}
    setHeadline(next.headline);
    setCount(0);
    setPhase('typing');
  },[pool,key]);

  // Read a single durable shuffle bag per account. React StrictMode must not
  // accidentally consume two cards for the same page load.
  useEffect(()=>{
    if(!ready||initializedKey.current===key)return;
    initializedKey.current=key;
    try{deckRef.current=readDeck(window.localStorage.getItem(key));}
    catch{deckRef.current=null;}
    void Promise.resolve().then(advance);
  },[advance,key,ready]);

  useEffect(()=>{
    const media=window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotion=()=>setReducedMotion(media.matches);
    const updateVisibility=()=>setVisible(document.visibilityState!=='hidden');
    const updateHour=()=>setHour(new Date().getHours());
    void Promise.resolve().then(()=>{updateMotion();updateVisibility();updateHour();});
    media.addEventListener('change',updateMotion);
    document.addEventListener('visibilitychange',updateVisibility);
    const clock=window.setInterval(updateHour,60_000);
    return()=>{
      media.removeEventListener('change',updateMotion);
      document.removeEventListener('visibilitychange',updateVisibility);
      window.clearInterval(clock);
    };
  },[]);

  const fullText=headline?.[language]||'';
  const letters=useMemo(()=>Array.from(fullText),[fullText]);
  useEffect(()=>{
    if(!headline||!active||!visible)return;
    // Reduced motion uses complete static sentences, with gentle, infrequent swaps.
    if(reducedMotion){
      const timer=window.setTimeout(advance,9_000);
      return()=>window.clearTimeout(timer);
    }
    if(phase==='typing'&&count>=letters.length){
      const timer=window.setTimeout(()=>setPhase('hold'),50);
      return()=>window.clearTimeout(timer);
    }
    if(phase==='typing'){
      const timer=window.setTimeout(()=>setCount(x=>x+1),55);
      return()=>window.clearTimeout(timer);
    }
    if(phase==='hold'){
      const timer=window.setTimeout(()=>setPhase('deleting'),4_000);
      return()=>window.clearTimeout(timer);
    }
    if(count>0){
      const timer=window.setTimeout(()=>setCount(x=>x-1),25);
      return()=>window.clearTimeout(timer);
    }
    const timer=window.setTimeout(advance,120);
    return()=>window.clearTimeout(timer);
  },[headline,active,visible,reducedMotion,phase,count,letters.length,advance]);

  return {
    headline,
    fullText,
    writtenText:reducedMotion?fullText:letters.slice(0,count).join(''),
    showCaret:!reducedMotion,
    reducedMotion,
  };
}
