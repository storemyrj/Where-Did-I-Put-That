'use client';

import {useEffect,useState} from 'react';
import {Camera,ImagePlus,Trash2} from 'lucide-react';

const MAX_PHOTO_BYTES=5*1024*1024;
const ACCEPTED_TYPES=new Set(['image/jpeg','image/png','image/webp']);

type Props={
  file:File|null;
  onChange:(file:File|null)=>void;
  language:'no'|'en';
};

/**
 * The same picker is used while editing and in the save confirmation.
 * Preview URLs remain device-local and are revoked when replaced/unmounted.
 */
export function PhotoPicker({file,onChange,language}:Props){
  const no=language==='no';
  const [preview,setPreview]=useState<{file:File;url:string}|null>(null);
  const previewUrl=preview?.file===file?preview.url:null;
  const [error,setError]=useState('');

  useEffect(()=>{
    if(!file)return;
    const url=URL.createObjectURL(file);
    // External browser resource: keep the URL in sync with the selected file.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPreview({file,url});
    return()=>URL.revokeObjectURL(url);
  },[file]);

  function selectPhoto(next:File|null){
    if(!next)return;
    if(next.size>MAX_PHOTO_BYTES){
      setError(no?'Bildet er for stort. Velg et bilde under 5 MB.':'This photo is too large. Choose one under 5 MB.');
      return;
    }
    if(!ACCEPTED_TYPES.has(next.type)){
      setError(no?'Velg et JPG-, PNG- eller WebP-bilde.':'Choose a JPG, PNG or WebP image.');
      return;
    }
    setError('');
    onChange(next);
  }
  function clearPhoto(){
    setError('');
    onChange(null);
    setPreview(null);
  }

  return <div className="photo-picker">
    {file&&previewUrl&&<div className="photo-preview">
      {/* Object URLs are short-lived browser resources and cannot use Next image optimization. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={previewUrl} alt={no?'Forhåndsvisning av valgt bilde':'Preview of selected photo'}/>
      <div className="photo-preview-meta">
        <span role="status">{no?'Bilde klart til lagring':'Photo ready to save'}</span>
        <button type="button" className="text-button danger" onClick={clearPhoto}><Trash2 size={15}/>{no?'Fjern bilde':'Remove photo'}</button>
      </div>
    </div>}
    <div className="photo-actions">
      <label className="attach photo-picker-action">
        <Camera size={18}/>{file?(no?'Ta nytt bilde':'Retake photo'):(no?'Ta bilde':'Take photo')}
        <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment"
          aria-label={no?'Ta bilde':'Take photo'}
          onChange={event=>{selectPhoto(event.currentTarget.files?.[0]||null);event.currentTarget.value='';}}/>
      </label>
      <label className="attach photo-picker-action">
        <ImagePlus size={18}/>{file?(no?'Velg et annet':'Choose another'):(no?'Velg fra bilder':'Choose from photos')}
        <input type="file" accept="image/jpeg,image/png,image/webp"
          aria-label={no?'Velg fra bilder':'Choose from photos'}
          onChange={event=>{selectPhoto(event.currentTarget.files?.[0]||null);event.currentTarget.value='';}}/>
      </label>
    </div>
    {error&&<p className="error" role="alert">{error}</p>}
  </div>;
}
