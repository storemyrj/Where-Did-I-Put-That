/** Short, localized home headlines. This module performs no tracking or network calls. */
export type HeadlineLanguage='no'|'en';
export type HeadlineIcon='hand'|'sunrise'|'sun'|'sunset'|'moon'|'search'|'key-round'|
  'package-search'|'map-pin'|'brain'|'move-right'|'package-plus'|'lightbulb'|
  'check-circle-2'|'sparkles'|'shield-check'|'search-check';

export type Headline={id:string;icon:HeadlineIcon;no:string;en:string};
export type HeadlineDeck={version:1;remaining:string[];previous:string|null};
export const HEADLINE_DECK_KEY='wdipt-headline-deck-v1';
export const HEADLINE_SEARCH_KEY='wdipt-headline-search-v1';

const staticHeadlines:Headline[]=[
  {id:'find-today',icon:'search',no:'Hva vil du finne i dag?',en:'What would you like to find today?'},
  {id:'find-together',icon:'package-search',no:'Skal vi finne noe sammen?',en:'Shall we find something together?'},
  {id:'find-again',icon:'search-check',no:'Hva skal vi finne igjen?',en:'What should we find again?'},
  {id:'find-location',icon:'map-pin',no:'Vi finner nok ut hvor den er.',en:"We'll figure out where it is."},
  {id:'remember-today',icon:'brain',no:'Hva vil du huske i dag?',en:'What would you like to remember today?'},
  {id:'remember-moved',icon:'move-right',no:'Har du flyttet noe i det siste?',en:'Moved anything recently?'},
  {id:'remember-new',icon:'package-plus',no:'Lagt noe på et nytt sted?',en:'Put something somewhere new?'},
  {id:'remember-clever',icon:'lightbulb',no:'Var det stedet kanskje litt for lurt?',en:'Was that hiding spot a little too clever?'},
  {id:'personality-remember',icon:'check-circle-2',no:'Jeg husker. Du slipper.',en:"I'll remember. You don't have to."},
  {id:'personality-relief',icon:'sparkles',no:'Små ting. Stor lettelse.',en:'Little things. Big relief.'},
  {id:'personality-location',icon:'shield-check',no:'Du legger det fra deg. Jeg husker hvor.',en:"You put it down. I'll remember where."},
  {id:'personality-search',icon:'search-check',no:'Én ting mindre å lete etter.',en:'One less thing to search for.'},
];

const greetingTemplates:Headline[]=[
  {id:'hello',icon:'hand',no:'Heisann{name}!',en:'Hey there{name}!'},
  {id:'morning',icon:'sunrise',no:'God morgen{name}!',en:'Good morning{name}!'},
  {id:'afternoon',icon:'sun',no:'God ettermiddag{name}!',en:'Good afternoon{name}!'},
  {id:'evening',icon:'sunset',no:'God kveld{name}!',en:'Good evening{name}!'},
  {id:'night',icon:'moon',no:'Fortsatt våken{name}?',en:'Still awake{name}?'},
];

function safeFirstName(fullName:string):string{
  if(fullName.includes('@'))return '';
  const part=fullName.trim().split(/\s+/u)[0]||'';
  return /^[\p{L}][\p{L}'-]{0,23}$/u.test(part)?part:'';
}

export function buildHeadlinePool({
  hour,name='',recentItems=[],
}:{hour:number;name?:string;recentItems?:readonly string[]}):Headline[]{
  const safeHour=Number.isFinite(hour)?Math.max(0,Math.min(23,Math.floor(hour))):12;
  const first=safeFirstName(name);
  const greetingName=first?', '+first:'';
  const greetingId=safeHour>=5&&safeHour<11?'morning':
    safeHour>=11&&safeHour<17?'afternoon':
    safeHour>=17&&safeHour<22?'evening':'night';
  const allowed=new Set(['hello',greetingId]);
  const greetings=greetingTemplates.filter(entry=>allowed.has(entry.id)).map(entry=>({
    ...entry,no:entry.no.replace('{name}',greetingName),en:entry.en.replace('{name}',greetingName),
  }));
  const unique=new Set<string>();
  const dynamic:Headline[]=[];
  for(const item of recentItems){
    const clean=item.trim().replace(/[\r\n\t<>]/gu,' ').replace(/\s+/gu,' ').slice(0,42).trim();
    if(!clean||!/[\p{L}\p{N}]/u.test(clean)||unique.has(clean.toLocaleLowerCase('nb-NO')))continue;
    unique.add(clean.toLocaleLowerCase('nb-NO'));
    const slot=dynamic.length/2;
    dynamic.push({
      id:'recent-'+slot+'-again',icon:'key-round',
      no:'Leter du fortsatt etter «'+clean+'»?',
      en:'Still looking for “'+clean+'”?',
    },{
      id:'recent-'+slot+'-where',icon:'package-search',
      no:'Hvor ble det av «'+clean+'»?',
      en:'Where did you put “'+clean+'”?',
    });
    if(dynamic.length>=10)break;
  }
  return [...staticHeadlines,...greetings,...dynamic];
}

export function shuffleHeadlineIds(ids:readonly string[],random:()=>number=Math.random):string[]{
  const copy=[...ids];
  for(let i=copy.length-1;i>0;i--){
    const j=Math.min(i,Math.floor(Math.max(0,random())*(i+1)));
    [copy[i],copy[j]]=[copy[j],copy[i]];
  }
  return copy;
}

/** Advances exactly one card and returns the persisted continuation for the next load. */
export function drawHeadline(
  pool:readonly Headline[],deck:HeadlineDeck|null,random:()=>number=Math.random,
):{headline:Headline;deck:HeadlineDeck}{
  if(!pool.length)throw Error('Headline pool must not be empty');
  const eligible=new Map(pool.map(entry=>[entry.id,entry]));
  const last=deck?.version===1?deck.previous:null;
  const kept=deck?.version===1?Array.from(new Set(deck.remaining.filter(id=>eligible.has(id)))):[];
  const remaining=kept.length?kept:shuffleHeadlineIds([...eligible.keys()],random);
  // On a fresh cycle, avoid showing the previous card twice in a row.
  if(!kept.length&&remaining.length>1&&remaining[0]===last){
    const swap=remaining.findIndex(id=>id!==last);
    [remaining[0],remaining[swap]]=[remaining[swap],remaining[0]];
  }
  const id=remaining.shift()!;
  return {headline:eligible.get(id)!,deck:{version:1,remaining,previous:id}};
}

export function readDeck(raw:string|null):HeadlineDeck|null{
  if(!raw)return null;
  try{
    const p:unknown=JSON.parse(raw);
    if(!p||typeof p!=='object')return null;
    const v=p as Record<string,unknown>;
    if(v.version!==1||!Array.isArray(v.remaining)||v.remaining.some(x=>typeof x!=='string')||!(v.previous===null||typeof v.previous==='string'))return null;
    return {version:1,previous:v.previous as string|null,remaining:v.remaining.slice(0,100)};
  }catch{return null;}
}

export function recordRecentFoundItem(current:readonly string[],name:string):string[]{
  const cleaned=name.trim().replace(/[\r\n\t<>]/gu,' ').replace(/\s+/gu,' ').slice(0,42).trim();
  if(!cleaned)return [...current].slice(0,5);
  return [cleaned,...current.filter(entry=>entry.toLocaleLowerCase('nb-NO')!==cleaned.toLocaleLowerCase('nb-NO'))].slice(0,5);
}

export function readRecentFoundItems(raw:string|null):string[]{
  if(!raw)return [];
  try{
    const p:unknown=JSON.parse(raw);
    if(!Array.isArray(p))return [];
    return p.filter((item):item is string=>typeof item==='string')
      .reduce<string[]>((all,item)=>recordRecentFoundItem(all,item),[]).reverse().slice(0,5);
  }catch{return [];}
}

/** Local-only isolation, not an authentication or cryptographic security boundary. */
export function localSearchStorageKey(email:string):string{
  let hash=2166136261;
  for(const code of email.trim().toLocaleLowerCase().split('')){
    hash=Math.imul(hash^code.charCodeAt(0),16777619);
  }
  return HEADLINE_SEARCH_KEY+'-'+(hash>>>0).toString(36);
}
