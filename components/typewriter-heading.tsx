'use client';

import {
  Hand,Sunrise,Sun,Sunset,Moon,Search,KeyRound,PackageSearch,MapPin,
  Brain,MoveRight,PackagePlus,Lightbulb,CheckCircle2,Sparkles,
  ShieldCheck,SearchCheck,type LucideIcon,
} from 'lucide-react';
import type {Headline,HeadlineIcon} from '@/lib/home-prompts';

const icons:Record<HeadlineIcon,LucideIcon>={
  'hand':Hand,'sunrise':Sunrise,'sun':Sun,'sunset':Sunset,'moon':Moon,
  'search':Search,'key-round':KeyRound,'package-search':PackageSearch,
  'map-pin':MapPin,'brain':Brain,'move-right':MoveRight,
  'package-plus':PackagePlus,'lightbulb':Lightbulb,'check-circle-2':CheckCircle2,
  'sparkles':Sparkles,'shield-check':ShieldCheck,'search-check':SearchCheck,
};

export type TypewriterHeadlineProps={
  headline:Headline|null;
  fullText:string;
  writtenText:string;
  showCaret:boolean;
};

/** The rotating headline replaces the former fixed heading on both layouts. */
export function TypewriterHeading({headline,fullText,writtenText,showCaret}:TypewriterHeadlineProps){
  const Icon=headline?icons[headline.icon]:null;
  return <div className="typewriter-heading">
    <h1 className="typewriter-title" aria-label={fullText||undefined}>
      {Icon&&<Icon className="typewriter-icon" aria-hidden="true" strokeWidth={1.9}/>}
      <span className="typewriter-letters" aria-hidden="true">{writtenText}{showCaret&&<span className="typewriter-caret"/>}</span>
    </h1>
  </div>;
}
