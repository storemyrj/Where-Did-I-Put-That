'use client';

import {Home,Box,Settings} from 'lucide-react';

type View='home'|'bank'|'settings';
type Props={
  language:'no'|'en';
  view:View;
  className:string;
  onNavigate:(view:View)=>void;
};

/** Shared icon-over-label navigation for desktop top bar and mobile bottom bar. */
export function AppNavigation({language,view,className,onNavigate}:Props){
  const no=language==='no';
  const entries=[
    {id:'home' as const,Icon:Home,label:no?'Hjem':'Home'},
    {id:'bank' as const,Icon:Box,label:no?'Minnebank':'Memory bank'},
    {id:'settings' as const,Icon:Settings,label:no?'Innstillinger':'Settings'},
  ];
  return <nav className={'app-navigation '+className} aria-label={no?'Hovedmeny':'Main navigation'}>
    {entries.map(({id,Icon,label})=><button
      key={id}
      type="button"
      className={view===id?'active':''}
      aria-current={view===id?'page':undefined}
      onClick={()=>onNavigate(id)}
    ><Icon size={22} strokeWidth={1.9} aria-hidden="true"/><span>{label}</span></button>)}
  </nav>;
}
