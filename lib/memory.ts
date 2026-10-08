export type Memory={id:string;name:string;location:string[];updated_at:string;temporary_until?:string;description?:string;photo?:string;icon?:string;saved_latitude?:number;saved_longitude?:number;saved_location_precision?:'precise'|'approximate';history:{location:string[];timestamp:string;source:string}[]};
export function title(s:string){return s.trim().replace(/(^|[\s-])(\p{L})/gu,(_,p,c)=>p+c.toLocaleUpperCase('nb-NO'));}
export function parseMemory(text:string,item?:string){let s=text.trim().replace(/[.!?]+$/,'');let temporaryUntil='';const temp=s.match(/\s+(?:until|til)\s+(.+)$/i);if(temp){temporaryUntil=temp[1].trim();s=s.slice(0,temp.index).trim();}
const direct=s.match(/^(?:(?:i|jeg)\s+)?(?:put|left|keep|kept|placed|moved|stored|set|have|la|la\s+inn|flyttet|puttet|satte|plasserte|oppbevarer|har)\s+(?:my\s+|the\s+|mitt?\s+|min[et]?\s+|en\s+|et\s+)?(.+?)\s+(?:in|inside|on|at|under|beside|behind|near|by|to|i|på|ved|bak|inni|hos)\s+(?:the\s+|my\s+|den\s+|det\s+|en\s+|et\s+)?(.+)$/i);
const state=s.match(/^(?:my\s+|the\s+|min[et]?\s+|mitt?\s+|den\s+|det\s+)?(.+?)\s+(?:is|are|was|were|er|ligger|står|befinner\s+seg)\s+(?:in|inside|on|at|under|beside|behind|near|by|i|på|ved|bak|inni)\s+(?:the\s+|my\s+|den\s+|det\s+)?(.+)$/i);
const match=direct||state;if(!match)return null;
const name=title(item&&item!=='item'?item:match[1].replace(/^(?:they're|they are|it's|it is|it|them|den|det|denne|dette)\s*/i,'').replace(/\s+(?:min|mitt|mine)$/i,'').trim());if(!name)return null;
const locationText=match[2].replace(/^(?:the|my|den|det|en|et|min|mitt|mine)\s+/i,'').trim();if(!locationText)return null;
const parts=locationText.split(/\s+(?:in|inside|on|i|inni|på)\s+(?:the\s+|my\s+|den\s+|det\s+)?/i).reverse();
if(parts.length===1){const room=locationText.match(/^(bedroom|kitchen|living room|bathroom|hallway|office|garage|basement|attic|soverom|kjøkken|stue|bad|gang|kontor|garasje|kjeller|loft)\s+(.+)$/i);if(room)parts.splice(0,1,room[1],room[2]);}
return {name,location:parts.map(title),temporaryUntil};}
export function searchMemories(items:Memory[],query:string){let q=query.toLowerCase().replace(/[?.,’']/g,' ').replace(/\b(where|did|do|i|put|leave|left|are|is|s|my|the|find|please|a|an|hvor|la|jeg|min|mitt|mine|er|ligger|finn|på)\b/g,' ').trim();const norm=(s:string)=>s.toLowerCase().replace(/earbuds|headphones/g,'airpods').replace(/chargers/g,'charger').replace(/keys|nøkler/g,'key').replace(/\s+/g,' ').trim();q=norm(q);if(!q)return [];return items.filter(i=>{const n=norm(i.name);return n.includes(q)||q.includes(n)||q.split(' ').every(w=>n.includes(w));});}
export function emoji(name:string){
 const n=name.toLocaleLowerCase('nb-NO');
 if(/key|nøkl|nøkkel|nøkkelknipe/.test(n))return '🔑';
 if(/passport|pass\b|document|dokument|identitetskort|id-kort/.test(n))return '📕';
 if(/airpod|earbud|headphone|ørepropp|hodetelefon/.test(n))return '🎧';
 if(/charger|cable|lader|ladekabel|ledning/.test(n))return '🔌';
 if(/phone|telefon|mobil/.test(n))return '📱';
 if(/glasses|glass|brille/.test(n))return '👓';
 if(/wallet|lommebok|pengepung/.test(n))return '👛';
 if(/watch|klokke/.test(n))return '⌚';
 if(/camera|kamera/.test(n))return '📷';
 if(/jakk|coat|jacket|hoodie|genser|jakke/.test(n))return '🧥';
 if(/ryggsekk|backpack|sekk/.test(n))return '🎒';
 if(/bag|veske|handbag/.test(n))return '👜';
 if(/lomme|pocket/.test(n))return '👖';
 if(/laptop|datamaskin|computer|pc\b/.test(n))return '💻';
 if(/medicine|medisin|tablett/.test(n))return '💊';
 if(/book|bok\b|bøker/.test(n))return '📚';
 if(/flashlight|lommelykt/.test(n))return '🔦';
 return '📦';
}
export const examples:Memory[]=[{id:'demo-1',name:'Keys',location:['Kitchen','Drawer'],updated_at:new Date().toISOString(),history:[]},{id:'demo-2',name:'AirPods',location:['Bedroom','Desk'],updated_at:new Date(Date.now()-3600000).toISOString(),history:[]},{id:'demo-3',name:'Passport',location:['Bedroom','Top drawer'],updated_at:new Date(Date.now()-86400000).toISOString(),history:[]},{id:'demo-4',name:'Charger',location:['Living room','TV cabinet'],updated_at:new Date(Date.now()-172800000).toISOString(),history:[]}];