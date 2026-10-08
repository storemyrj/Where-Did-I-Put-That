'use client';

import {Search,Mic,Plus,ArrowRight} from 'lucide-react';

type Props = {
  language:'no'|'en';
  searchText:string;
  onSearchText:(value:string)=>void;
  rememberText:string;
  onRememberText:(value:string)=>void;
  onSearch:()=>void;
  onSearchVoice:()=>void;
  onRemember:()=>void;
  onRememberVoice:()=>void;
  microphoneEnabled:boolean;
  listening:boolean;
  searching:boolean;
};

/** Mobile-only home. Desktop keeps its existing search and recent-memories layout. */
export function MobileHome({
  language,searchText,onSearchText,rememberText,onRememberText,
  onSearch,onSearchVoice,onRemember,onRememberVoice,microphoneEnabled,listening,searching,
}:Props){
  const no=language==='no';
  return <section className="mobile-home-actions" aria-label={no?'Snarveier på forsiden':'Home shortcuts'}>
    <h1>{no?'Appen som husker for deg':'The app that remembers for you'}<span className="green">.</span></h1>
    <div className="home-action-card">
      <div className="home-action-heading"><Search size={21}/><h2>{no?'Finn noe':'Find something'}</h2></div>
      <form className="home-action-controls" role="search" onSubmit={event=>{event.preventDefault();if(searchText.trim())onSearch();}}>
        <label className="sr-only" htmlFor="mobile-home-search">{no?'Hva leter du etter?':'What are you looking for?'}</label>
        <input id="mobile-home-search" value={searchText} onChange={event=>onSearchText(event.target.value)}
          placeholder={no?'Hva leter du etter?':'What are you looking for?'} enterKeyHint="search"/>
        <button type="button" className={'home-action-mic '+(listening?'listening':'')} onClick={onSearchVoice}
          disabled={!microphoneEnabled} aria-label={no?'Søk med stemmen':'Search by voice'} title={no?'Søk med stemmen':'Search by voice'}><Mic size={22}/></button>
        <button type="submit" className="home-action-submit" disabled={!searchText.trim()} aria-label={no?'Finn':'Find'}><ArrowRight size={21}/></button>
      </form>
    </div>
    {!searching&&<div className="home-action-card">
      <div className="home-action-heading"><Plus size={21}/><h2>{no?'Husk noe':'Remember something'}</h2></div>
      <div className="home-action-controls">
        <label className="sr-only" htmlFor="mobile-home-remember">{no?'Hva vil du huske?':'What should I remember?'}</label>
        <input id="mobile-home-remember" value={rememberText} onChange={event=>onRememberText(event.target.value)}
          onKeyDown={event=>{if(event.key==='Enter'){event.preventDefault();onRemember();}}}
          placeholder={no?'Hva vil du huske?':'What should I remember?'} enterKeyHint="done"/>
        <button type="button" className="home-action-mic" onClick={onRememberVoice}
          disabled={!microphoneEnabled} aria-label={no?'Fortell med stemmen':'Speak to remember'} title={no?'Fortell med stemmen':'Speak to remember'}><Mic size={22}/></button>
        <button type="button" className="home-action-submit" onClick={onRemember}
          aria-label={no?'Legg til minne':'Add a memory'}><ArrowRight size={21}/></button>
      </div>
    </div>}
  </section>;
}
