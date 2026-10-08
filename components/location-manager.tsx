'use client';

import {useMemo,useState} from 'react';
import {Check,Ellipsis,Plus,Trash2,X} from 'lucide-react';
import {LocationIcon,locationIconChoices,suggestedLocationIcon} from '@/components/location-icon';

export type SavedLocation={id:string;name:string;parent_location_id:string|null;address?:string|null;icon?:string|null};
export type LocationInput={name:string;parentId:string|null;address:string|null;icon:string|null};

export function locationTree(locations:SavedLocation[]){
  const byId=new Map(locations.map(l=>[l.id,l]));
  const flattened:{location:SavedLocation;depth:number;path:string[]}[]=[];
  const seen=new Set<string>();
  function walk(location:SavedLocation,depth:number,path:string[]){
    if(seen.has(location.id))return;
    seen.add(location.id);
    const next=[...path,location.name];
    flattened.push({location,depth,path:next});
    locations.filter(l=>l.parent_location_id===location.id).forEach(child=>walk(child,depth+1,next));
  }
  locations.filter(l=>!l.parent_location_id||!byId.has(l.parent_location_id)).forEach(l=>walk(l,0,[]));
  locations.forEach(l=>walk(l,0,[]));
  return flattened;
}

type EditorProps={
  locations:SavedLocation[];language:'no'|'en';initialParent?:string;
  existing?:SavedLocation;onSave:(value:LocationInput,id?:string)=>Promise<void>;
  onCancel:()=>void;
};
export function LocationEditor({locations,language,initialParent='',existing,onSave,onCancel}:EditorProps){
  const no=language==='no';
  const [name,setName]=useState(existing?.name||'');
  const [parentId,setParentId]=useState(existing?.parent_location_id||initialParent);
  const [icon,setIcon]=useState(existing?.icon||'');
  const [address,setAddress]=useState(existing?.address||'');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const options=useMemo(()=>locationTree(locations).filter(entry=>{
    let current:SavedLocation|undefined=entry.location;
    const visited=new Set<string>();
    while(current&&!visited.has(current.id)){
      if(current.id===existing?.id)return false;
      visited.add(current.id);
      current=locations.find(l=>l.id===current?.parent_location_id);
    }
    return true;
  }),[locations,existing]);
  async function submit(){
    if(!name.trim()||busy)return;
    setBusy(true);setError('');
    try{await onSave({name:name.trim(),parentId:parentId||null,address:parentId?null:address.trim()||null,icon:icon||null},existing?.id);}
    catch(e){setError(e instanceof Error?e.message:String(e));}
    finally{setBusy(false);}
  }
  return <div className="location-editor" onKeyDown={e=>{if(e.key==='Enter'&&(e.target as HTMLElement).tagName==='INPUT'){e.preventDefault();e.stopPropagation();void submit();}}}> 
    <div className="location-editor-heading"><strong>{existing?(no?'Rediger sted':'Edit location'):(no?'Nytt sted':'New location')}</strong><button type="button" className="icon-button" onClick={onCancel} aria-label={no?'Lukk':'Close'}><X size={17}/></button></div>
    <div className="location-editor-fields">
      <label>{no?'Navn':'Name'}<input value={name} onChange={e=>setName(e.target.value)} placeholder={no?'F.eks. Soverom':'E.g. Bedroom'} autoFocus maxLength={100} required/></label>
      <label>{no?'Ikon':'Icon'}<select value={icon} onChange={e=>setIcon(e.target.value)}><option value="">{no?'Automatisk':'Automatic'} ({locationIconChoices.find(([value])=>value===suggestedLocationIcon(name))?.[1]||'Place'})</option>{locationIconChoices.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
      <label>{no?'Legg under':'Parent location'}<select value={parentId} onChange={e=>{setParentId(e.target.value);if(e.target.value)setAddress('');}}><option value="">{no?'Øverste nivå':'Top level'}</option>{options.map(({location,depth})=><option key={location.id} value={location.id}>{'　'.repeat(depth)}{location.name}</option>)}</select></label>
      {!parentId&&<label>{no?'Adresse (valgfritt)':'Address (optional)'}<input value={address} onChange={e=>setAddress(e.target.value)} placeholder={no?'Gateadresse for hjem, hytte osv.':'Street address for home, cabin, etc.'}/></label>}
    </div>
    {error&&<p role="alert" className="error">{error}</p>}
    <div className="location-editor-actions"><button type="button" className="secondary" onClick={onCancel}>{no?'Avbryt':'Cancel'}</button><button type="button" className="primary" onClick={()=>void submit()} disabled={busy||!name.trim()}><Check size={16}/>{busy?(no?'Lagrer…':'Saving…'):(no?'Lagre sted':'Save location')}</button></div>
  </div>;
}

type BlockingEntry={id:string;name:string};
type LocationBlockers={children:BlockingEntry[];items:BlockingEntry[];history:BlockingEntry[]};
type ManagerProps={
  locations:SavedLocation[];language:'no'|'en';
  onMutate:(payload:Record<string,unknown>)=>Promise<unknown>;
  onChanged:()=>Promise<void>;
  onOpenMemory:(id:string)=>void;
};
export function LocationManager({locations,language,onMutate,onChanged,onOpenMemory}:ManagerProps){
  const no=language==='no';
  const [editing,setEditing]=useState<{id?:string;parent?:string}|null>(null);
  const [menu,setMenu]=useState<string|null>(null);
  const [error,setError]=useState('');
  const [blocked,setBlocked]=useState<LocationBlockers|null>(null);
  const rows=useMemo(()=>locationTree(locations),[locations]);
  async function save(value:LocationInput,id?:string){
    await onMutate({action:id?'location_update':'location_create',...(id?{id}:{}),...value});
    await onChanged();setEditing(null);setMenu(null);setBlocked(null);setError('');
  }
  async function remove(location:SavedLocation){
    if(!window.confirm(no?`Slette «${location.name}»? Steder med undernivåer eller minner kan ikke slettes.`:`Delete “${location.name}”? Locations with children or memories cannot be deleted.`))return;
    try{
      setError('');setBlocked(null);
      await onMutate({action:'location_delete',id:location.id});
      await onChanged();setMenu(null);
    }catch(e){
      const failure=e as Error&{code?:string;blockers?:LocationBlockers};
      if(failure.code==='LOCATION_IN_USE'&&failure.blockers){
        setBlocked(failure.blockers);
        setError(no?`«${location.name}» kan ikke slettes før tilknyttede steder og minner er håndtert.`:`“${location.name}” cannot be deleted until its linked places and memories are handled.`);
      }else{
        setError(failure.message||String(e));
      }
    }
  }
  return <div className="location-manager">
    <div className="location-manager-head"><div><h2>{no?'Administrer steder':'Manage locations'}</h2><p>{no?'Organiser steder i nivåer. Bruk + ved et sted for å legge til rom, skap og skuffer.':'Organize nested places. Use + beside a location to add rooms and drawers.'}</p></div><button className="secondary" onClick={()=>{setMenu(null);setEditing({});}}><Plus size={16}/>{no?'Nytt sted':'New place'}</button></div>
    {editing&&<LocationEditor key={(editing.id||'new')+':'+(editing.parent||'')} locations={locations} language={language} initialParent={editing.parent} existing={locations.find(l=>l.id===editing.id)} onSave={save} onCancel={()=>setEditing(null)}/>}
    {error&&<div className="location-delete-error" role="alert">
      <p className="error">{error}</p>
      {blocked&&<div className="location-blockers">
        {blocked.children.map(child=><button type="button" key={'child-'+child.id} className="secondary" onClick={()=>{setEditing({id:child.id});setMenu(null);setBlocked(null);setError('');}}>
          <LocationIcon name={child.name} size={15}/>{no?'Rediger understed:':'Edit sublocation:'} {child.name}
        </button>)}
        {blocked.items.map(item=><button type="button" key={'item-'+item.id} className="secondary" onClick={()=>onOpenMemory(item.id)}>
          {no?'Åpne minne:':'Open memory:'} {item.name}
        </button>)}
        {blocked.history.filter(item=>!blocked.items.some(current=>current.id===item.id)).map(item=><button type="button" key={'history-'+item.id} className="secondary" onClick={()=>onOpenMemory(item.id)}>
          {no?'Åpne historikk for:':'Open history for:'} {item.name}
        </button>)}
        {blocked.history.length>0&&<p className="small muted">{no?'Steder brukt i historikken kan ikke slettes bare ved å flytte minnet. Den historiske koblingen bevares til det tilknyttede minnet slettes.':'Moving a memory does not erase its location history. Historical links remain until the associated memory is deleted.'}</p>}
      </div>}
    </div>}
    <div className="location-hierarchy">{rows.length?rows.map(({location,depth})=><div className="location-node" key={location.id}>
      <div className="location-node-content" style={{paddingLeft:12+depth*23}}><LocationIcon icon={location.icon} name={location.name} size={19}/><div className="location-node-name"><strong>{location.name}</strong>{location.address&&<a href={'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(location.address)} target="_blank" rel="noreferrer">{location.address} ↗</a>}</div></div>
      <button className="icon-button" onClick={()=>{setMenu(null);setEditing({parent:location.id});}} title={no?'Legg til undernivå':'Add sublocation'} aria-label={(no?'Legg til under ':'Add child to ')+location.name}><Plus size={17}/></button>
      <div className="location-node-menu"><button className="icon-button" onClick={()=>setMenu(menu===location.id?null:location.id)} aria-label={(no?'Flere valg for ':'More options for ')+location.name} aria-expanded={menu===location.id}><Ellipsis size={19}/></button>{menu===location.id&&<div className="location-node-popover"><button onClick={()=>{setEditing({id:location.id});setMenu(null);}}>{no?'Rediger':'Edit'}</button><button className="danger" onClick={()=>remove(location)}><Trash2 size={14}/>{no?'Slett':'Delete'}</button></div>}</div>
    </div>):<p className="empty-locations">{no?'Ingen steder ennå. Opprett for eksempel Hjem, Hytte eller Bil.':'No locations yet. Start with Home, Cabin or Car.'}</p>}</div>
  </div>;
}
