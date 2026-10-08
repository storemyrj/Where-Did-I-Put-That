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
type Props={locations:SavedLocation[];recentLocations:string[][];language:'no'|'en';preferences:AppPreferences;initial?:{name:string;location:string[];description?:string;icon?:string;saved_latitude?:number;saved_longitude?:number};onCreate:(draft:Draft)=>void;photo:File|null;onPhoto:(file:File|null)=>void;onCreateLocation:(value:LocationInput)=>Promise<string>};

export function StructuredMemoryForm({locations,recentLocations,language,preferences,onCreate,photo,onPhoto,onCreateLocation,initial}:Props){
  const no=language==='no';
  const [name,setName]=useState(initial?.name||'');
  const [statement,setStatement]=useState('');
  const [inputSource,setInputSource]=useState<'typed'|'voice'|'manual edit'>('typed');
  const [position,setPosition]=useState<Coordinate|null>(null);
  const [suggestionStatus,setSuggestionStatus]=useState('');
  const [listening,setListening]=useState(false);
  const recognition=useRef<{start():void;stop():void;abort():void}|null>(null);
  const locationTouched=useRef(false),nameTouched=useRef(!!initial),noteTouched=useRef(!!initial?.description),attemptedPosition=useRef(false);
  const [note,setNote]=useState(initial?.description||'');
  const [selected,setSelected]=useState(()=>locationTree(locations).find(entry=>entry.path.join(' → ')===initial?.location.join(' → '))?.location.id||'');
  const [icon,setIcon]=useState(initial?.icon||'');
  const [showIcons,setShowIcons]=useState(false);
  const [showNew,setShowNew]=useState(false);
  const [saveCurrentLocation,setSaveCurrentLocation]=useState(false);
  const hasExistingPin=typeof initial?.saved_latitude==='number'&&typeof initial?.saved_longitude==='number';
  const [keepExistingPin,setKeepExistingPin]=useState(hasExistingPin);
  const [precision,setPrecision]=useState<'precise'|'approximate'>(preferences.locationMode==='precise'?'precise':'approximate');
  const [locationStatus,setLocationStatus]=useState('');
  const [busy,setBusy]=useState(false);
  const paths=useMemo(()=>locationTree(locations),[locations]);
  const suggestion=useMemo(()=>suggestMemory(statement,locations,position),[statement,locations,position]);
  function interpret(value:string,source:'typed'|'voice'){
    setStatement(value);setInputSource(source);
    const parsed=suggestMemory(value,locations,position);
    if(parsed.itemName&&!nameTouched.current)setName(parsed.itemName);
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
  useEffect(()=>()=>recognition.current?.abort(),[]);
  function voiceInput(){
    if(!preferences.microphoneEnabled)return;
    if(listening){recognition.current?.stop();return;}
    const SpeechAPI=(window as any).SpeechRecognition||(window as any).webkitSpeechRecognition;
    if(!SpeechAPI){setSuggestionStatus(no?'Tale støttes ikke i nettleseren.':'Speech recognition is not supported here.');return;}
    const speaker=new SpeechAPI();recognition.current=speaker;
    const voiceLang=preferences.speechLanguage==='auto'?language:preferences.speechLanguage;
    speaker.lang=voiceLang==='no'?'nb-NO':'en-US';speaker.interimResults=false;
    speaker.onstart=()=>setListening(true);
    speaker.onend=()=>setListening(false);
    speaker.onerror=()=>{setListening(false);setSuggestionStatus(no?'Kunne ikke bruke mikrofonen. Kontroller tillatelsen.':'Could not use the microphone. Check its permission.');};
    speaker.onresult=(event:any)=>{interpret(event.results[0][0].transcript,'voice');setListening(false);};
    try{speaker.start();}catch{setSuggestionStatus(no?'Kunne ikke starte mikrofonen.':'Could not start the microphone.');}
  }
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
    e.preventDefault();if(!name.trim()||busy)return;
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
  return <form className="structured-memory-form" onSubmit={submit}>
    <div className="memory-autofill"><label htmlFor="memory-autofill-input">{no?'Fortell hva du vil huske':'Describe what to remember'}</label>
      <div className="memory-autofill-compose"><textarea id="memory-autofill-input" value={statement} onChange={e=>interpret(e.target.value,'typed')} placeholder={no?'Jeg la PC-en i sekken på soverommet …':'I put my laptop in the bag in the bedroom …'} rows={2}/>
        <button type="button" className={'mic '+(listening?'listening':'')} onClick={voiceInput} disabled={!preferences.microphoneEnabled} title={no?'Fortell med stemmen':'Speak'} aria-label={no?'Fortell med stemmen':'Speak'}><Mic size={22}/></button>
      </div>
      {suggestion.itemName&&<div className="memory-autofill-result"><span>{no?'Tolket ting:':'Detected item:'} <strong>{suggestion.itemName}</strong> {emoji(suggestion.itemName)}</span>
       {suggestion.best&&<span>{no?'Foreslått sted:':'Suggested place:'} <strong>{suggestion.best.path.join(' → ')}</strong>{suggestion.best.nearby?' · '+(no?'nær deg':'nearby'):''}</span>}
       {suggestion.ambiguous&&<span>{no?'Flere steder passer. Velg riktig nedenfor.':'Several places match. Choose below.'}</span>}
       {!suggestion.candidates.length&&suggestion.placeDescription&&<span>{no?'Stedet finnes ikke ennå. Velg eller opprett et sted nedenfor.':'Place not found yet. Select or create a location below.'}</span>}
       {suggestion.ambiguous&&<div className="suggestion-options">{suggestion.candidates.map(candidate=><button className="secondary" type="button" key={candidate.id} onClick={()=>{setSelected(candidate.id);locationTouched.current=true;}}>{candidate.path.join(' → ')}{candidate.nearby?' · '+(no?'nær deg':'nearby'):''}</button>)}</div>}
      </div>}
      {preferences.locationMode!=='off'&&statement.trim()&&suggestion.candidates.length>1&&<button className="text-button" type="button" onClick={()=>void requestPosition()}>{no?'Bruk min posisjon for å foreslå sted':'Use my location to suggest a place'}</button>}
      {suggestionStatus&&<p className="small muted" role="status">{suggestionStatus}</p>}
      {!preferences.microphoneEnabled&&<p className="small muted">{no?'Mikrofon er deaktivert i Innstillinger.':'Microphone is disabled in Settings.'}</p>}
    </div>
    <label>{no?'Hva vil du huske?':'What should I remember?'}<input value={name} onChange={e=>{nameTouched.current=true;setName(e.target.value);}} placeholder={no?'For eksempel: Passet':'For example: Passport'} autoFocus maxLength={120} required/></label>
    <div className="item-icon-picker"><span>{no?'Ikon':'Icon'}</span><button type="button" className="selected-item-icon" onClick={()=>setShowIcons(v=>!v)} aria-expanded={showIcons}>{icon||emoji(name)}<ChevronDown size={15}/></button>{showIcons&&<div className="item-icon-options"><button type="button" className={!icon?'selected':''} onClick={()=>{setIcon('');setShowIcons(false);}}>{no?'Automatisk':'Auto'}</button>{itemIcons.map(value=><button type="button" key={value} className={icon===value?'selected':''} onClick={()=>{setIcon(value);setShowIcons(false);}}>{value}</button>)}</div>}</div>
    <div className="location-picker">
      <span>{no?'Velg plassering':'Choose a location'}</span>
      {recent.length>0&&<><small className="muted">{no?'Nylig brukt':'Recently used'}</small><div className="quick-location-list">{recent.map(({location,path})=><button type="button" key={location.id} className={selected===location.id?'selected secondary':'secondary'} onClick={()=>{locationTouched.current=true;setSelected(location.id);}}><LocationIcon icon={location.icon} name={location.name} size={15}/>{path.join(' → ')}</button>)}</div></>}
      <select value={selected} onChange={e=>{locationTouched.current=true;setSelected(e.target.value);}} aria-label={no?'Velg eksisterende sted':'Choose an existing place'}><option value="">{no?'Usortert (uten sted)':'Unsorted (no location)'}</option>{paths.map(({location,depth,path})=><option key={location.id} value={location.id}>{'　'.repeat(depth)}{path.join(' → ')}</option>)}</select>
      <button type="button" className="text-button" onClick={()=>setShowNew(v=>!v)}><Plus size={15}/>{no?'Legg til ny plassering':'Add new location'}</button>
      {showNew&&<LocationEditor locations={locations} language={language} initialParent={selected} locationMode={preferences.locationMode} onSave={async value=>{const id=await onCreateLocation(value);setSelected(id);setShowNew(false);}} onCancel={()=>setShowNew(false)}/>}
      <p className="small muted">{no?'Uten valgt sted lagres minnet i Usortert.':'Without a selected place, this memory is saved in Unsorted.'}</p>
    </div>
    <label>{no?'Valgfritt notat':'Optional note'}<textarea value={note} onChange={e=>{noteTouched.current=true;setNote(e.target.value);}} placeholder={no?'Skriv en beskrivelse hvis det hjelper':'Add a description if useful'}/></label>
    {preferences.locationMode!=='off'&&<label className="save-location"><input type="checkbox" checked={saveCurrentLocation} onChange={e=>setSaveCurrentLocation(e.target.checked)}/><span>{no?'Legg ved kartpin der jeg er nå':'Attach a map pin where I am now'}<small>{no?'Kun dette minnet. Ingen løpende sporing.':'This memory only. No ongoing tracking.'}</small></span></label>}
    {preferences.locationMode==='off'&&<p className="small muted">{no?'Posisjon er deaktivert i Innstillinger.':'Location is disabled in Settings.'}</p>}
    {hasExistingPin&&<label className="save-location"><input type="checkbox" checked={keepExistingPin} onChange={e=>setKeepExistingPin(e.target.checked)}/><span>{no?'Behold eksisterende kartpin':'Keep existing map pin'}</span></label>}
    {saveCurrentLocation&&<label>{no?'Nøyaktighet':'Location accuracy'}<select value={precision} onChange={e=>setPrecision(e.target.value as 'precise'|'approximate')}><option value="approximate">{no?'Omtrentlig (ca. 1 km)':'Approximate (about 1 km)'}</option><option value="precise">{no?'Presis posisjon':'Precise location'}</option></select></label>}
    {locationStatus&&<p className="small muted" role="status">{locationStatus}</p>}
    <PhotoPicker file={photo} onChange={onPhoto} language={language}/>
    <button className="primary full" disabled={!name.trim()||busy}><Plus size={17}/>{busy?(no?'Henter posisjon …':'Getting location …'):(initial?(no?'Lagre endringer':'Save changes'):(no?'Opprett minne':'Create memory'))}</button>
  </form>;
}
