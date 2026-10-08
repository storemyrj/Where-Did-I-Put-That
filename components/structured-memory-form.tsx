'use client';

import {FormEvent,useMemo,useState} from 'react';
import {Camera,MapPin,Plus} from 'lucide-react';

type Location={id:string;name:string;parent_location_id?:string|null;address?:string|null};

export function StructuredMemoryForm({locations,language,onCreate,onPhoto}:{locations:Location[];language:'no'|'en';onCreate:(draft:{name:string;location:string[];description:string})=>void;onPhoto:(file:File|null)=>void}){
  const [name,setName]=useState('');
  const [note,setNote]=useState('');
  const [selected,setSelected]=useState('');
  const [newPlace,setNewPlace]=useState('');
  const [showNew,setShowNew]=useState(false);
  const choices=useMemo(()=>locations.slice(0,6),[locations]);
  const tr=language==='no';
  function submit(e:FormEvent){e.preventDefault();if(!name.trim())return;const place=selected||newPlace.trim();onCreate({name:name.trim(),location:place?[place]:[],description:note.trim()});}
  return <form className="structured-memory-form" onSubmit={submit}>
    <label>{tr?'Hva vil du huske?':'What should I remember?'}<input value={name} onChange={e=>setName(e.target.value)} placeholder={tr?'For eksempel: Passet':'For example: Passport'} autoFocus/></label>
    <label>{tr?'Valgfritt notat':'Optional note'}<textarea value={note} onChange={e=>setNote(e.target.value)} placeholder={tr?'Skriv litt mer hvis det hjelper':'Add a little context if it helps'}/></label>
    <div className="location-picker"><span>{tr?'Plassering':'Location'}</span><div className="quick-location-list">{choices.map(location=><button type="button" className={selected===location.name?'selected secondary':'secondary'} key={location.id} onClick={()=>{setSelected(location.name);setShowNew(false);}}><MapPin size={14}/>{location.name}</button>)}</div>
      <button type="button" className="text-button" onClick={()=>setShowNew(v=>!v)}><Plus size={15}/>{tr?'Legg til nytt sted':'Add a new place'}</button>
      {showNew&&<input value={newPlace} onChange={e=>{setNewPlace(e.target.value);setSelected('');}} placeholder={tr?'For eksempel: Hytta, bilen eller kontoret':'For example: Cabin, car or office'}/>}
      {!selected&&!newPlace&&<p className="small muted">{tr?'Uten plassering lagres minnet under «Usortert».':'Without a location, this will be saved under “Unsorted”.'}</p>}
    </div>
    <label className="attach"><Camera size={18}/>{tr?'Ta eller velg bilde':'Take or choose photo'}<input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={e=>onPhoto(e.target.files?.[0]??null)}/></label>
    <button className="primary full" disabled={!name.trim()}>{tr?'Opprett minne':'Create memory'}</button>
  </form>;
}