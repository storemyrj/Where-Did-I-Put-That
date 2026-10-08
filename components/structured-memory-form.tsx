'use client';

import {FormEvent,useEffect,useMemo,useRef,useState} from 'react';
import {ChevronDown,Plus,Mic} from 'lucide-react';
import {suggestMemory,parseDescription,type Coordinate} from '@/lib/memory-suggestions';
import {getPositionOnce} from '@/lib/client-geolocation';
import type {AppPreferences} from '@/lib/preferences';
import {PhotoPicker} from '@/components/photo-picker';
import {emoji} from '@/lib/memory';
import {LocationIcon} from '@/components/location-icon';
import {LocationEditor,locationTree,type LocationInput,type SavedLocation} from '@/components/location-manager';

const itemIcons=['🔑','🎧','📕','🔌','📱','👓','👛','⌚','📷','💊','🧰','🧳','🚲','🪪','📦','🧥','🎒','👜','👖','💻','📚','🔦'];
type Draft={name:string;location:string[];locationId?:string;description:string;icon:string;source?:'typed'|'voice'|'manual edit';latitude?:number;longitude?:number;locationPrecision?:'precise'|'approximate';clearLocationPin?:boolean};
type Props={locations:SavedLocation[];recentLocations:string[][];language:'no'|'en';preferences:AppPreferences;onVoice:()=>void;listening:boolean;initialStatement?:string;initialStatementSource?:'typed'|'voice';initial?:{name:string;location:string[];description?:string;icon?:string;saved_latitude?:number;saved_longitude?:number};onCreate:(draft:Draft)=>void;photo:File|null;onPhoto:(file:File|null)=>void;onCreateLocation:(value:LocationInput)=>Promise<string>};

export function StructuredMemoryForm({locations,recentLocations,language,preferences,onVoice,listening,initialStatement='',initialStatementSource='typed',onCreate,photo,onPhoto,onCreateLocation,initial}:Props){
  const no=language==='no';
  const [name,setName]=useState(initial?.name||'');
  const [statement,setStatement]=useState('');
  const [inputSource,setInputSource]=useState<'typed'|'voice'|'manual edit'>('typed');
  const [position,setPosition]=useState<Coordinate|null>(null);
  const [suggestionStatus,setSuggestionStatus]=useState('');
  const [showTextInput,setShowTextInput]=useState(Boolean(initialStatement)&&initialStatementSource==='typed');
  const detailsRef=useRef<HTMLDetailsElement>(null);
  const pinRef=useRef<HTMLDetailsElement>(null);
  const nameRef=useRef<HTMLInputElement>(null);
  const lastIncomingStatement=useRef('');
  const [validationHint,setValidationHint]=useState('');
  const locationTouched=useRef(false),nameTouched=useRef(!!initial),noteTouched=useRef(!!initial?.description),attemptedPosition=useRef(false);
  const [note,setNote]=useState(initial?.description||'');
  const [selected,setSelected]=useState(()=>locationTree(locations).find(entry=>entry.path.join(' → ')===initial?.location.join(' → '))?.location.id||'');
  const [manualLocationSelected,setManualLocationSelected]=useState(false);
  const [icon,setIcon]=useState(initial?.icon||'');
  const [showIcons,setShowIcons]=useState(false);
  const [showNew,setShowNew]=useState(false);
  const [saveCurrentLocation,setSaveCurrentLocation]=useState(false);
  const hasExistingPin=typeof initial?.saved_latitude==='number'&&typeof initial?.saved_longitude==='number';
  const [keepExistingPin,setKeepExistingPin]=useState(hasExistingPin);
  useEffect(()=>{
    if(initial&&detailsRef.current)detailsRef.current.open=true;
    if(hasExistingPin&&pinRef.current)pinRef.current.open=true;
  },[initial,hasExistingPin]);
  const [precision,setPrecision]=useState<'precise'|'approximate'>(preferences.locationMode==='precise'?'precise':'approximate');
  const [locationStatus,setLocationStatus]=useState('');
  const [busy,setBusy]=useState(false);
  const paths=useMemo(()=>locationTree(locations),[locations]);
  const suggestion=useMemo(()=>suggestMemory(statement,locations,position),[statement,locations,position]);
  useEffect(()=>{
    if(!initialStatement||initialStatement===lastIncomingStatement.current)return;
    lastIncomingStatement.current=initialStatement;
    const pending=Promise.resolve().then(()=>{
      const parsed=suggestMemory(initialStatement,locations,position);
      setStatement(initialStatement);setInputSource(initialStatementSource);
      if(!nameTouched.current)setName(parsed.itemName||(initialStatement.trim().length<=80&&!/\s(?:i|på|in|at|under|ved)\s/i.test(initialStatement)?initialStatement.trim():''));
      if(parsed.note&&!noteTouched.current)setNote(parsed.note);
      if(!locationTouched.current)setSelected(parsed.best?.id||'');
    });
    void pending;
  },[initialStatement,initialStatementSource,locations,position]);
  function interpret(value:string,source:'typed'|'voice'){
    setStatement(value);setInputSource(source);
    const parsed=suggestMemory(value,locations,position);
    if(!nameTouched.current)setName(parsed.itemName||(value.trim().length<=80&&!/\s(?:i|på|in|at|under|ved)\s/i.test(value)?value.trim():''));
    if(parsed.note&&!noteTouched.current)setNote(parsed.note);
    if(!locationTouched.current)setSelected(parsed.best?.id||'');
  }
  async function requestPosition(){
    if(preferences.locationMode==='off')return;
    setSuggestionStatus(no?'Henter posisjon …':'Getting location …');
    try{
      const location=await getPositionOnce(preferences.locationMode==='precise'?'precise':'approximate');
      setPosition(location);
      const enriched=suggestMemory(statement,locations,location);
      if(!locationTouched.current&&enriched.best)setSelected(enriched.best.id);
      setSuggestionStatus(no?'Nærhet er tatt med i forslagene.':'Nearby places are considered in suggestions.');
    }catch{
      setSuggestionStatus(no?'Posisjon er ikke tilgjengelig. Velg sted manuelt.':'Location unavailable. Choose a place manually.');
    }
  }
  useEffect(()=>{
    if(attemptedPosition.current||!statement.trim()||!suggestion.ambiguous||
       (preferences.locationMode!=='approximate'&&preferences.locationMode!=='precise'))return;
    attemptedPosition.current=true;
    const timer=setTimeout(()=>{void requestPosition();},500);
    return()=>clearTimeout(timer);
  // Position lookup is deliberately triggered only once, after a recognized ambiguous phrase.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[statement,suggestion.ambiguous,preferences.locationMode]);
  const recent=useMemo(()=>{
    const selectedIds=new Set<string>();
    for(const recentPath of recentLocations){
      const match=paths.find(p=>p.path.join(' → ').toLowerCase()===recentPath.join(' → ').toLowerCase());
      if(match)selectedIds.add(match.location.id);
      if(selectedIds.size>=6)break;
    }
    return paths.filter(p=>selectedIds.has(p.location.id)).sort((a,b)=>Array.from(selectedIds).indexOf(a.location.id)-Array.from(selectedIds).indexOf(b.location.id));
  },[paths,recentLocations]);

  function submit(e:FormEvent){
    e.preventDefault();
    if(busy)return;
    if(!name.trim()||(suggestion.placeDescription&&!selected&&!locationTouched.current)){
      detailsRef.current?.setAttribute('open','');
      const needsPlace=!!name.trim();
      setValidationHint(needsPlace?(no?'Jeg fant ikke en sikker plassering. Velg et sted, opprett et nytt, eller velg Usortert under Flere valg.':'I could not identify one location. Select an existing place, create one or choose Unsorted in More options.'):(no?'Fortell hva du vil huske, eller skriv inn navnet under Flere valg.':'Tell me what to remember, or enter the name under More options.'));
      if(!needsPlace)requestAnimationFrame(()=>nameRef.current?.focus());
      return;
    }
    setValidationHint('');
    const match=paths.find(p=>p.location.id===selected);
    const create=(position?:Coordinate)=>{
      const latitude=position?.latitude,longitude=position?.longitude;
      onCreate({name:name.trim(),location:match?.path||[],...(match?{locationId:match.location.id}:{}),description:note.trim(),icon,source:inputSource,clearLocationPin:hasExistingPin&&!keepExistingPin,...(latitude===undefined||longitude===undefined?{}:{latitude:precision==='approximate'?Math.round(latitude*100)/100:latitude,longitude:precision==='approximate'?Math.round(longitude*100)/100:longitude,locationPrecision:precision})});
      setBusy(false);
    };
    if(!saveCurrentLocation||preferences.locationMode==='off'){create();return;}
    setBusy(true);setLocationStatus(no?'Henter posisjon …':'Getting location …');
    void getPositionOnce(precision)
      .then(location=>create(location))
      .catch(()=>{setLocationStatus(no?'Kunne ikke hente posisjon. Minnet kan fortsatt lagres.':'Could not get your location. You can still save the memory.');create();});
  }
  const chosen=paths.find(entry=>entry.location.id===selected);
  const hasProposedMemory=!!name.trim()||!!suggestion.placeDescription||!!statement.trim();
  const ambiguousPlace=!!suggestion.placeDescription&&!selected&&!manualLocationSelected;
  return <form className="structured-memory-form quick-memory-form" onSubmit={submit}>
    <section className={'memory-voice-entry '+(statement.trim()&&!listening?'has-content':'')} aria-label={no?'Legg til minne med tale eller tekst':'Remember using voice or text'}>
      <button type="button" className={'memory-voice-primary '+(listening?'listening is-listening':'')} onClick={onVoice}
        disabled={!preferences.microphoneEnabled}
        aria-label={listening?(no?'Stopp taleopptak':'Stop listening'):(no?'Start tale':'Start speech recognition')}>
        <span className="memory-voice-orb"><Mic size={34}/></span>
        <span className="memory-voice-label">{listening?(no?'Jeg lytter …':'Listening …'):(statement?(no?'Fortell noe mer':'Speak again'):(no?'Trykk for å fortelle':'Tap to speak'))}</span>
      </button>
      {listening&&<p role="status" className="memory-listening-hint">{no?'Trykk igjen for å stoppe.':'Tap again to stop.'}</p>}
      <button type="button" className="memory-type-toggle" aria-expanded={showTextInput}
        onClick={()=>setShowTextInput(value=>!value)}>
        {showTextInput?(no?'Skjul tekstfelt':'Hide text input'):(statement?(no?'Rediger teksten':'Edit the text'):(no?'Skriv i stedet':'Type instead'))}
      </button>
      {showTextInput?<label className="memory-statement-field" htmlFor="memory-autofill-input">
        {no?'Beskriv minnet':'Describe the memory'}
        <textarea id="memory-autofill-input" value={statement} onChange={e=>interpret(e.target.value,'typed')}
          placeholder={no?'Jeg la PC-en i sekken på soverommet …':'I put my laptop in the bag in the bedroom …'} rows={3}/>
      </label>:statement.trim()&&<div className="memory-transcript">
        <span className="memory-transcript-caption">{no?'Du fortalte:':'You said:'}</span>
        <p>{statement}</p>
      </div>}
      {!preferences.microphoneEnabled&&<p className="small muted">{no?'Mikrofon er deaktivert i Innstillinger. Velg «Skriv i stedet».':'Microphone is disabled in Settings. Choose Type instead.'}</p>}
    </section>
    {hasProposedMemory&&<section className="memory-autofill-summary" aria-label={no?'Foreslått minne':'Suggested memory'}>
      <div className="memory-summary-top">
        <span>{no?'FORESLÅTT MINNE':'SUGGESTED MEMORY'}</span>
        <button type="button" className="text-button" onClick={()=>{if(detailsRef.current){detailsRef.current.open=true;detailsRef.current.scrollIntoView({block:'nearest',behavior:'smooth'});}}}>
          {no?'Rediger':'Edit'} <ChevronDown size={15}/>
        </button>
      </div>
      <div className="memory-summary-item">
        <span className="memory-summary-icon" aria-hidden="true">{icon||emoji(name)}</span>
        <div>
          <strong>{name|| (no?'Ukjent ting':'Unknown item')}</strong>
          <p>{chosen?.path.join(' → ')||(no?'Ingen plassering valgt':'No location selected')}{chosen&&suggestion.best?.id===chosen.location.id&&suggestion.best.nearby?(no?' · nær deg':' · nearby'):''}</p>
        </div>
      </div>
      {note.trim()&&<p className="memory-summary-note">{no?'Notat:':'Note:'} {note}</p>}
      {suggestion.ambiguous&&!manualLocationSelected&&<p className="memory-summary-warning">{no?'Flere steder passer. Velg riktig sted:':'Several places match. Choose the correct location:'}</p>}
      {ambiguousPlace&&!suggestion.ambiguous&&<p className="memory-summary-warning">{no?'Jeg fant ikke dette stedet sikkert. Velg eller opprett et sted under Flere valg, eller fortsett uten sted.':'I could not confidently identify this place. Select or create one in More options, or continue without a place.'}</p>}
      {!!suggestion.placeDescription&&!selected&&!manualLocationSelected&&<button type="button" className="memory-unsorted-button secondary"
        onClick={()=>{locationTouched.current=true;setManualLocationSelected(true);setSelected('');}}>
        {no?'Fortsett uten sted (Usortert)':'Continue without a place (Unsorted)'}
      </button>}
      {suggestion.ambiguous&&!manualLocationSelected&&<div className="suggestion-options">
        {suggestion.candidates.map(candidate=><button type="button" className="secondary" key={candidate.id}
          onClick={()=>{setSelected(candidate.id);locationTouched.current=true;setManualLocationSelected(true);}}>
          {candidate.path.join(' → ')}{candidate.nearby?(no?' · nær deg':' · nearby'):''}
        </button>)}
      </div>}
      {preferences.locationMode!=='off'&&suggestion.ambiguous&&!manualLocationSelected&&<button
        type="button" className="text-button" onClick={()=>void requestPosition()}>
        {no?'Bruk posisjon til stedsforslag':'Use location to help choose a place'}
      </button>}
      {suggestionStatus&&<p className="small muted" role="status">{suggestionStatus}</p>}
    </section>}
    <details ref={detailsRef} className="memory-extra-details" key={initial?'edit-details':'add-details'}>
      <summary>{no?'Flere valg':'More options'}<ChevronDown size={18} aria-hidden="true"/></summary>
      <div className="memory-details-fields">
    <label>{no?'Hva vil du huske?':'What should I remember?'}<input ref={nameRef} value={name} onChange={e=>{nameTouched.current=true;setName(e.target.value);}} placeholder={no?'For eksempel: Passet':'For example: Passport'} maxLength={120}/></label>
    <div className="item-icon-picker"><span>{no?'Ikon':'Icon'}</span><button type="button" className="selected-item-icon" onClick={()=>setShowIcons(v=>!v)} aria-expanded={showIcons}>{icon||emoji(name)}<ChevronDown size={15}/></button>{showIcons&&<div className="item-icon-options"><button type="button" className={!icon?'selected':''} onClick={()=>{setIcon('');setShowIcons(false);}}>{no?'Automatisk':'Auto'}</button>{itemIcons.map(value=><button type="button" key={value} className={icon===value?'selected':''} onClick={()=>{setIcon(value);setShowIcons(false);}}>{value}</button>)}</div>}</div>
    <div className="location-picker">
      <span>{no?'Velg plassering':'Choose a location'}</span>
      {recent.length>0&&<><small className="muted">{no?'Nylig brukt':'Recently used'}</small><div className="quick-location-list">{recent.map(({location,path})=><button type="button" key={location.id} className={selected===location.id?'selected secondary':'secondary'} onClick={()=>{locationTouched.current=true;setManualLocationSelected(true);setSelected(location.id);}}><LocationIcon icon={location.icon} name={location.name} size={15}/>{path.join(' → ')}</button>)}</div></>}
      <select value={selected} onChange={e=>{locationTouched.current=true;setManualLocationSelected(true);setSelected(e.target.value);}} aria-label={no?'Velg eksisterende sted':'Choose an existing place'}><option value="">{no?'Usortert (uten sted)':'Unsorted (no location)'}</option>{paths.map(({location,depth,path})=><option key={location.id} value={location.id}>{'　'.repeat(depth)}{path.join(' → ')}</option>)}</select>
      <button type="button" className="text-button" onClick={()=>setShowNew(v=>!v)}><Plus size={15}/>{no?'Legg til ny plassering':'Add new location'}</button>
      {showNew&&<LocationEditor locations={locations} language={language} initialParent={selected} locationMode={preferences.locationMode} onSave={async value=>{const id=await onCreateLocation(value);setSelected(id);locationTouched.current=true;setManualLocationSelected(true);setShowNew(false);}} onCancel={()=>setShowNew(false)}/>}
      <p className="small muted">{no?'Uten valgt sted lagres minnet i Usortert.':'Without a selected place, this memory is saved in Unsorted.'}</p>
    </div>
    <label>{no?'Valgfritt notat':'Optional note'}<textarea value={note} onChange={e=>{noteTouched.current=true;setNote(e.target.value);}} placeholder={no?'Skriv en beskrivelse hvis det hjelper':'Add a description if useful'}/></label>
    <details ref={pinRef} className="memory-pin-options">
      <summary>{no?'Kartpin (valgfritt)':'Map pin (optional)'}</summary>
    {preferences.locationMode!=='off'&&<label className="save-location"><input type="checkbox" checked={saveCurrentLocation} onChange={e=>setSaveCurrentLocation(e.target.checked)}/><span>{no?'Legg ved kartpin der jeg er nå':'Attach a map pin where I am now'}<small>{no?'Kun dette minnet. Ingen løpende sporing.':'This memory only. No ongoing tracking.'}</small></span></label>}
    {preferences.locationMode==='off'&&<p className="small muted">{no?'Posisjon er deaktivert i Innstillinger.':'Location is disabled in Settings.'}</p>}
    {hasExistingPin&&<label className="save-location"><input type="checkbox" checked={keepExistingPin} onChange={e=>setKeepExistingPin(e.target.checked)}/><span>{no?'Behold eksisterende kartpin':'Keep existing map pin'}</span></label>}
    {saveCurrentLocation&&<label>{no?'Nøyaktighet':'Location accuracy'}<select value={precision} onChange={e=>setPrecision(e.target.value as 'precise'|'approximate')}><option value="approximate">{no?'Omtrentlig (ca. 1 km)':'Approximate (about 1 km)'}</option><option value="precise">{no?'Presis posisjon':'Precise location'}</option></select></label>}
    {locationStatus&&<p className="small muted" role="status">{locationStatus}</p>}
    </details>
      </div>
    </details>
    <section className="memory-photo-section" aria-label={no?'Bilde':'Photo'}>
      <h3>{no?'Legg til bilde (valgfritt)':'Add a photo (optional)'}</h3>
      <PhotoPicker file={photo} onChange={onPhoto} language={language}/>
    </section>
    {validationHint&&<p role="alert" className="error">{validationHint}</p>}
    <button className="primary full" disabled={busy}><Plus size={17}/>{busy?(no?'Henter posisjon …':'Getting location …'):(initial?(no?'Lagre endringer':'Save changes'):(no?'Opprett minne':'Create memory'))}</button>
  </form>;
}
