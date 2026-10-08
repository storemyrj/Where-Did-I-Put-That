'use client';
import {useState} from 'react';
import {Mic,MapPin,CheckCircle2} from 'lucide-react';
import {type AppPreferences,type LocationMode,type SpeechLanguage} from '@/lib/preferences';

type Props={
 value:AppPreferences;language:'no'|'en';disabled?:boolean;
 onSave:(settings:AppPreferences)=>Promise<void>;
};
export function PrivacyPreferences({value,language,disabled,onSave}:Props){
 const no=language==='no';
 const [saving,setSaving]=useState(false),[status,setStatus]=useState(''),[error,setError]=useState('');
 async function update(change:Partial<AppPreferences>){
  if(disabled||saving)return;
  setSaving(true);setStatus('');setError('');
  try{
   await onSave({...value,...change});
   setStatus(no?'Valget er lagret på kontoen.':'Preference saved to your account.');
  }catch(e){setError(e instanceof Error?e.message:String(e));}
  finally{setSaving(false);}
 }
 return <details className="settings-card compact-settings preferences-settings">
  <summary>{no?'Posisjon og mikrofon':'Location and microphone'}</summary>
  <div className="preferences-body">
   <div className="preferences-heading"><MapPin size={18}/><strong>{no?'Posisjon':'Location'}</strong></div>
   <label>{no?'Standardvalg':'Default'}<select value={value.locationMode} disabled={disabled||saving} onChange={e=>void update({locationMode:e.target.value as LocationMode})}>
     <option value="off">{no?'Ikke bruk posisjon':'Do not use location'}</option>
     <option value="ask">{no?'Spør ved behov':'Ask when needed'}</option>
     <option value="approximate">{no?'Bruk omtrentlig posisjon ved behov':'Use approximate location when needed'}</option>
     <option value="precise">{no?'Bruk presis posisjon ved behov':'Use precise location when needed'}</option>
   </select></label>
   <p className="small muted">{no?'Appen bruker bare posisjonen når du ber om forslag eller lagrer et sted. Vi sporer deg ikke i bakgrunnen. Nettleseren bestemmer fortsatt hvilke tillatelser som er gitt.':'Location is used only for suggestions or when you save a place. No background tracking. Browser permissions still apply.'}</p>
   <div className="preferences-heading"><Mic size={18}/><strong>{no?'Mikrofon':'Microphone'}</strong></div>
   <label className="preferences-checkbox"><input type="checkbox" checked={value.microphoneEnabled} disabled={disabled||saving} onChange={e=>void update({microphoneEnabled:e.target.checked})}/>{no?'Aktiver tale i appen':'Enable speech in the app'}</label>
   <label>{no?'Språk for talegjenkjenning':'Speech recognition language'}<select value={value.speechLanguage} disabled={disabled||saving||!value.microphoneEnabled} onChange={e=>void update({speechLanguage:e.target.value as SpeechLanguage})}>
    <option value="auto">{no?'Følg appens språk':'Follow app language'}</option>
    <option value="no">{no?'Norsk':'Norwegian'}</option>
    <option value="en">{no?'Engelsk':'English'}</option>
   </select></label>
   <p className="small muted">{no?'Mikrofonen starter bare når du trykker på taleknappen. Tillatelse gis på hver enhet.':'Microphone listening starts only when you tap a voice button. Permission is granted per device.'}</p>
   {status&&<p role="status" className="preferences-feedback"><CheckCircle2 size={15}/>{status}</p>}
   {error&&<p role="alert" className="error">{error}</p>}
  </div>
 </details>;
}
