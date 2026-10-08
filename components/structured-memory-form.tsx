'use client';

import {FormEvent,useMemo,useState} from 'react';
import {ChevronDown,Plus} from 'lucide-react';
import {PhotoPicker} from '@/components/photo-picker';
import {emoji} from '@/lib/memory';
import {LocationIcon} from '@/components/location-icon';
import {LocationEditor,locationTree,type LocationInput,type SavedLocation} from '@/components/location-manager';

const itemIcons=['🔑','🎧','📕','🔌','📱','👓','👛','⌚','📷','💊','🧰','🧳','🚲','🪪','📦','🧥','🎒','👜','👖','💻','📚','🔦'];
type Draft={name:string;location:string[];description:string;icon:string;latitude?:number;longitude?:number;locationPrecision?:'precise'|'approximate';clearLocationPin?:boolean};
type Props={locations:SavedLocation[];recentLocations:string[][];language:'no'|'en';initial?:{name:string;location:string[];description?:string;icon?:string;saved_latitude?:number;saved_longitude?:number};onCreate:(draft:Draft)=>void;photo:File|null;onPhoto:(file:File|null)=>void;onCreateLocation:(value:LocationInput)=>Promise<string>};

export function StructuredMemoryForm({locations,recentLocations,language,onCreate,photo,onPhoto,onCreateLocation,initial}:Props){
  const no=language==='no';
  const [name,setName]=useState(initial?.name||'');
  const [note,setNote]=useState(initial?.description||'');
  const [selected,setSelected]=useState(()=>locationTree(locations).find(entry=>entry.path.join(' → ')===initial?.location.join(' → '))?.location.id||'');
  const [icon,setIcon]=useState(initial?.icon||'');
  const [showIcons,setShowIcons]=useState(false);
  const [showNew,setShowNew]=useState(false);
  const [saveCurrentLocation,setSaveCurrentLocation]=useState(false);
  const hasExistingPin=typeof initial?.saved_latitude==='number'&&typeof initial?.saved_longitude==='number';
  const [keepExistingPin,setKeepExistingPin]=useState(hasExistingPin);
  const [precision,setPrecision]=useState<'precise'|'approximate'>('approximate');
  const [locationStatus,setLocationStatus]=useState('');
  const [busy,setBusy]=useState(false);
  const paths=useMemo(()=>locationTree(locations),[locations]);
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
    const create=(position?:GeolocationPosition)=>{
      const latitude=position?.coords.latitude,longitude=position?.coords.longitude;
      onCreate({name:name.trim(),location:match?.path||[],description:note.trim(),icon,clearLocationPin:hasExistingPin&&!keepExistingPin,...(latitude===undefined||longitude===undefined?{}:{latitude:precision==='approximate'?Math.round(latitude*100)/100:latitude,longitude:precision==='approximate'?Math.round(longitude*100)/100:longitude,locationPrecision:precision})});
      setBusy(false);
    };
    if(!saveCurrentLocation){create();return;}
    if(!navigator.geolocation){setLocationStatus(no?'Posisjon støttes ikke. Minnet lagres uten kartpin.':'Location is unsupported. This memory will have no map pin.');create();return;}
    setBusy(true);setLocationStatus(no?'Henter posisjon …':'Getting location …');
    navigator.geolocation.getCurrentPosition(create,()=>{setLocationStatus(no?'Kunne ikke hente posisjon. Minnet kan fortsatt lagres.':'Could not get your location. You can still save the memory.');create();},{enableHighAccuracy:precision==='precise',timeout:8000,maximumAge:300000});
  }
  return <form className="structured-memory-form" onSubmit={submit}>
    <label>{no?'Hva vil du huske?':'What should I remember?'}<input value={name} onChange={e=>setName(e.target.value)} placeholder={no?'For eksempel: Passet':'For example: Passport'} autoFocus maxLength={120} required/></label>
    <div className="item-icon-picker"><span>{no?'Ikon':'Icon'}</span><button type="button" className="selected-item-icon" onClick={()=>setShowIcons(v=>!v)} aria-expanded={showIcons}>{icon||emoji(name)}<ChevronDown size={15}/></button>{showIcons&&<div className="item-icon-options"><button type="button" className={!icon?'selected':''} onClick={()=>{setIcon('');setShowIcons(false);}}>{no?'Automatisk':'Auto'}</button>{itemIcons.map(value=><button type="button" key={value} className={icon===value?'selected':''} onClick={()=>{setIcon(value);setShowIcons(false);}}>{value}</button>)}</div>}</div>
    <div className="location-picker">
      <span>{no?'Velg plassering':'Choose a location'}</span>
      {recent.length>0&&<><small className="muted">{no?'Nylig brukt':'Recently used'}</small><div className="quick-location-list">{recent.map(({location,path})=><button type="button" key={location.id} className={selected===location.id?'selected secondary':'secondary'} onClick={()=>setSelected(location.id)}><LocationIcon icon={location.icon} name={location.name} size={15}/>{path.join(' → ')}</button>)}</div></>}
      <select value={selected} onChange={e=>setSelected(e.target.value)} aria-label={no?'Velg eksisterende sted':'Choose an existing place'}><option value="">{no?'Usortert (uten sted)':'Unsorted (no location)'}</option>{paths.map(({location,depth,path})=><option key={location.id} value={location.id}>{'　'.repeat(depth)}{path.join(' → ')}</option>)}</select>
      <button type="button" className="text-button" onClick={()=>setShowNew(v=>!v)}><Plus size={15}/>{no?'Legg til ny plassering':'Add new location'}</button>
      {showNew&&<LocationEditor locations={locations} language={language} initialParent={selected} onSave={async value=>{const id=await onCreateLocation(value);setSelected(id);setShowNew(false);}} onCancel={()=>setShowNew(false)}/>}
      <p className="small muted">{no?'Uten valgt sted lagres minnet i Usortert.':'Without a selected place, this memory is saved in Unsorted.'}</p>
    </div>
    <label>{no?'Valgfritt notat':'Optional note'}<textarea value={note} onChange={e=>setNote(e.target.value)} placeholder={no?'Skriv en beskrivelse hvis det hjelper':'Add a description if useful'}/></label>
    <label className="save-location"><input type="checkbox" checked={saveCurrentLocation} onChange={e=>setSaveCurrentLocation(e.target.checked)}/><span>{no?'Legg ved kartpin der jeg er nå':'Attach a map pin where I am now'}<small>{no?'Kun dette minnet. Ingen løpende sporing.':'This memory only. No ongoing tracking.'}</small></span></label>
    {hasExistingPin&&<label className="save-location"><input type="checkbox" checked={keepExistingPin} onChange={e=>setKeepExistingPin(e.target.checked)}/><span>{no?'Behold eksisterende kartpin':'Keep existing map pin'}</span></label>}
    {saveCurrentLocation&&<label>{no?'Nøyaktighet':'Location accuracy'}<select value={precision} onChange={e=>setPrecision(e.target.value as 'precise'|'approximate')}><option value="approximate">{no?'Omtrentlig (ca. 1 km)':'Approximate (about 1 km)'}</option><option value="precise">{no?'Presis posisjon':'Precise location'}</option></select></label>}
    {locationStatus&&<p className="small muted" role="status">{locationStatus}</p>}
    <PhotoPicker file={photo} onChange={onPhoto} language={language}/>
    <button className="primary full" disabled={!name.trim()||busy}><Plus size={17}/>{busy?(no?'Henter posisjon …':'Getting location …'):(initial?(no?'Lagre endringer':'Save changes'):(no?'Opprett minne':'Create memory'))}</button>
  </form>;
}
