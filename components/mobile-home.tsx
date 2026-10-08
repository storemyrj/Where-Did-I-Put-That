'use client';

import {Search,Mic,Plus,ArrowRight} from 'lucide-react';

type Props={
  language:'no'|'en';
  onSearch:()=>void;
  onSearchVoice:()=>void;
  onRemember:()=>void;
  onRememberVoice:()=>void;
  microphoneEnabled:boolean;
  listening:boolean;
  searching:boolean;
};

/** Equal-size, tap-friendly mobile actions; inputs live in their own dialogs. */
export function MobileHome({
  language,onSearch,onSearchVoice,onRemember,onRememberVoice,
  microphoneEnabled,listening,searching,
}:Props){
  const no=language==='no';
  return <section className="mobile-home-actions" aria-label={no?'Snarveier på forsiden':'Home shortcuts'}>
    <h1>{no?'Appen som husker for deg':'The app that remembers for you'}<span className="green">.</span></h1>
    <article className="home-action-card">
      <button type="button" className="home-action-main" onClick={onSearch}
        aria-label={no?'Åpne Finn noe':'Open Find something'}>
        <span className="home-action-heading"><Search size={26}/><strong>{no?'Finn noe':'Find something'}</strong></span>
        <span className="home-action-bottom">
          <span className="home-action-caption">{no?'Søk etter tingene dine':'Find your belongings'}</span>
          <span className="home-action-arrow"><ArrowRight size={24}/></span>
        </span>
      </button>
      <button type="button" className={'home-action-mic '+(listening?'listening':'')}
        onClick={onSearchVoice} disabled={!microphoneEnabled}
        aria-label={no?'Åpne søk og start mikrofon':'Open search and start microphone'}
        title={no?'Søk med stemmen':'Search by voice'}><Mic size={30}/></button>
    </article>
    {!searching&&<article className="home-action-card">
      <button type="button" className="home-action-main" onClick={onRemember}
        aria-label={no?'Åpne Husk noe':'Open Remember something'}>
        <span className="home-action-heading"><Plus size={26}/><strong>{no?'Husk noe':'Remember something'}</strong></span>
        <span className="home-action-bottom">
          <span className="home-action-caption">{no?'Fortell hva du vil huske':'Tell me what to remember'}</span>
          <span className="home-action-arrow"><ArrowRight size={24}/></span>
        </span>
      </button>
      <button type="button" className={'home-action-mic '+(listening?'listening':'')}
        onClick={onRememberVoice} disabled={!microphoneEnabled}
        aria-label={no?'Åpne Husk noe og start mikrofon':'Open Remember something and start microphone'}
        title={no?'Fortell med stemmen':'Speak to remember'}><Mic size={30}/></button>
    </article>}
  </section>;
}
