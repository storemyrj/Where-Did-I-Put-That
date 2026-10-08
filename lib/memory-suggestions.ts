/** Privacy-safe, deterministic suggestions. Does not access browser APIs or store location. */
export type Coordinate={latitude:number;longitude:number;accuracy?:number};
export type SuggestedLocation={
  id:string;name:string;parent_location_id:string|null;
  latitude?:number|string|null;longitude?:number|string|null;
  geo_precision?:'approximate'|'precise'|null;
};
export type Candidate={id:string;path:string[];score:number;nearby:boolean;distanceMeters?:number};
export type Interpretation={
  itemName:string;placeDescription:string;note:string;
  candidates:Candidate[];best:Candidate|null;ambiguous:boolean;
};

export function parseDescription(raw:string):Pick<Interpretation,'itemName'|'placeDescription'|'note'>{
 const s=raw.trim().replace(/[.!?]+$/u,'');
 const divider=s.match(/\s*[,;]\s*(?:notat|note|husk at|remember that)\s*:?\s*/iu);
 const note=divider?s.slice((divider.index??0)+divider[0].length).trim():'';
 const sentence=divider?s.slice(0,divider.index).trim():s;
 const patterns=[
   /^(?:(?:jeg|i)\s+)?(?:la|lagt|puttet|plasserte|flyttet|oppbevarer|har lagt|satte|stored|put|left|placed|moved|keep|kept)\s+(.+?)\s+(?:i|inni|på|ved|under|hos|in|inside|on|at|under|by)\s+(.+)$/iu,
   /^(?:min|mitt|mine|my|the)?\s*(.+?)\s+(?:er|ligger|står|is|are|was|were)\s+(?:i|inni|på|ved|under|hos|in|inside|on|at|under|by)\s+(.+)$/iu,
   /^(.+?)\s+(?:i|inni|på|ved|under|hos|in|inside|on|at|under|by)\s+(.+)$/iu,
 ];
 const match=patterns.map(pattern=>sentence.match(pattern)).find(Boolean);
 if(!match)return {itemName:'',placeDescription:'',note};
 return {
  itemName:match[1].trim().replace(/^(?:min|mitt|mine|my|the|en|et|ei)\s+/iu,''),
  placeDescription:match[2].trim().replace(/^(?:the|my|den|det|en|et|ei)\s+/iu,''),
  note,
 };
}

function normalizeToken(s:string):string{
 const t=s.toLocaleLowerCase('nb-NO').normalize('NFKC').replace(/[^\p{L}\p{N}]/gu,'');
 const rewrites:[RegExp,string][]=[
  [/^(?:skuffen|skuffa|skuffene)$/u,'skuff'],
  [/^(?:sekken|sekka|sekkene|backpacken|ryggsekken)$/u,'sekk'],
  [/^(?:jakken|jakka|jakkene)$/u,'jakke'],
  [/^(?:innerlomma|innerlommen|lomma|lommen|lommene)$/u,'lomme'],
  [/^(?:soverommet|soveromma)$/u,'soverom'],
  [/^(?:kjøkkenet|kjøkken)$/u,'kjøkken'],
  [/^(?:kontoret|kontor)$/u,'kontor'],
  [/^(?:bilen|bila)$/u,'bil'],
  [/^(?:hjemme|hjemmet)$/u,'hjem'],
  [/^(?:hytta|hytten)$/u,'hytte'],
  [/^(?:the|den|det|en|et|ei|my|mitt|min|mine|blå|røde|grønne|black|blue|red|green)$/u,''],
 ];
 for(const [pattern,replace] of rewrites)if(pattern.test(t))return replace;
 return t;
}
function words(s:string):string[]{
 return s.toLocaleLowerCase('nb-NO').split(/[^\p{L}\p{N}]+/u).map(normalizeToken).filter(Boolean);
}
function matched(a:string,b:string):boolean{
 return a===b || (a.length>3&&b.length>3&&(a.startsWith(b)||b.startsWith(a)));
}
export function metersBetween(a:Coordinate,b:Coordinate):number{
 const rad=Math.PI/180;
 const dLat=(b.latitude-a.latitude)*rad,dLon=(b.longitude-a.longitude)*rad;
 const h=Math.sin(dLat/2)**2+
   Math.cos(a.latitude*rad)*Math.cos(b.latitude*rad)*Math.sin(dLon/2)**2;
 return 6371000*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h));
}
export function suggestMemory(input:string,locations:readonly SuggestedLocation[],position?:Coordinate|null):Interpretation{
 const parsed=parseDescription(input);
 const empty:Interpretation={...parsed,candidates:[],best:null,ambiguous:false};
 if(!parsed.itemName||!parsed.placeDescription)return empty;
 const phrase=words(parsed.placeDescription);
 const nodes=new Map(locations.map(loc=>[loc.id,loc]));
 const rows:Candidate[]=[];
 for(const location of locations){
  const path:SuggestedLocation[]=[];
  const seen=new Set<string>();
  let cur:SuggestedLocation|undefined=location;
  while(cur&&!seen.has(cur.id)){seen.add(cur.id);path.unshift(cur);cur=cur.parent_location_id?nodes.get(cur.parent_location_id):undefined;}
  if(!path.length)continue;
  const leafWords=words(location.name);
  const leafMatches=leafWords.filter(word=>phrase.some(term=>matched(word,term))).length;
  const parentMatches=path.slice(0,-1).flatMap(node=>words(node.name)).filter(word=>phrase.some(term=>matched(word,term))).length;
  if(leafMatches===0&&parentMatches===0)continue;
  let score=leafMatches*5+parentMatches*2;
  let nearby=false,distanceMeters: number|undefined;
  if(position){
   const withCoordinates=[...path].reverse().find(node=>node.latitude!=null&&node.longitude!=null);
   if(withCoordinates){
    const lat=Number(withCoordinates.latitude),lon=Number(withCoordinates.longitude);
    if(Number.isFinite(lat)&&Number.isFinite(lon)&&Math.abs(lat)<=90&&Math.abs(lon)<=180){
     distanceMeters=metersBetween(position,{latitude:lat,longitude:lon});
     const approximate=withCoordinates.geo_precision==='approximate'||(position.accuracy??0)>=1000;
     const radius=approximate?2500:300;
     // Inaccurate current GPS readings must not break ties.
     if(position.accuracy===undefined||position.accuracy<=radius){
      if(distanceMeters<=radius){nearby=true;score+=3;}
     }
    }
   }
  }
  rows.push({id:location.id,path:path.map(node=>node.name),score,nearby,distanceMeters});
 }
 rows.sort((a,b)=>b.score-a.score||a.path.length-b.path.length||a.path.join('/').localeCompare(b.path.join('/')));
 const first=rows[0];
 const second=rows[1];
 // A candidate wins only if distinct from the runner-up; do not guess identical names.
 const best=first&&(!second||first.score>second.score)?first:null;
 return {...parsed,candidates:rows.slice(0,7),best,ambiguous:!!first&&!best};
}
