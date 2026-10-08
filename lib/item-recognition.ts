/**
 * Shared, offline item recognition used by icons and search.
 *
 * Keep aliases explicit and categories conservative: never rewrite the name
 * stored by a user. Unknown words only receive typo correction when a single
 * unambiguous known category is one edit away.
 */
export type ItemCategory =
  | 'computer' | 'charger' | 'phone' | 'keys' | 'passport' | 'headphones'
  | 'glasses' | 'wallet' | 'watch' | 'camera' | 'coat' | 'backpack'
  | 'bag' | 'pocket' | 'medicine' | 'book' | 'flashlight' | 'monitor';

type CategoryDefinition = {
  id: ItemCategory;
  icon: string;
  aliases: readonly string[];
};

/** Accessory categories take precedence over the device they belong to. */
export const ITEM_CATEGORIES: readonly CategoryDefinition[] = [
  {id:'charger',icon:'🔌',aliases:[
    'lader','laderen','ladere','ladekabel','ladekabelen','ladning',
    'charger','chargers','charging','cable','cables','kabel','kabelen','ledning','ledningen',
    'adapter','adapteren','powerbank','pclader','pcladeren','laptoplader',
    'laptopladeren','pccharger','laptopcharger','mobillader','mobil lader',
  ]},
  {id:'monitor',icon:'🖥️',aliases:['skjerm','skjermen','monitor','monitoren','display','displays']},
  {id:'bag',icon:'👜',aliases:['veske','veska','vesken','bag','baggen','handbag','handbaggen','pcveske','pcvesken','laptopbag','computerbag','sleeve']},
  {id:'computer',icon:'💻',aliases:[
    'pc','pcen','pcn','pcene','pc-er','computer','computers',
    'laptop','laptops','laptopen','laptoppen','lapptoppen','laptopp',
    'bærbar','bærbaren','datamaskin','datamaskinen','datamaskiner',
    'data','dataen','datan','macbook','macbooken','chromebook','chromebooken',
    'notebook','notebooken','ipad','ipaden','nettbrett','nettbrettet',
  ]},
  {id:'phone',icon:'📱',aliases:['mobil','mobilen','mobiltelefon','mobiltelefonen','telefon','telefonen','phone','phones','iphone','iphonen','smarttelefon','smarttelefonen']},
  {id:'keys',icon:'🔑',aliases:['nøkkel','nøkler','nøklene','nøkkelen','nøkkelknippe','nøkkelknipe','key','keys','keychain']},
  {id:'passport',icon:'📕',aliases:['pass','passet','passport','passports','idkort','identitetskort','dokument','dokumenter','document','documents']},
  {id:'headphones',icon:'🎧',aliases:['airpods','airpod','ørepropper','øreproppene','ørepropp','hodetelefon','hodetelefoner','hodetelefonene','headphones','headphone','earbud','earbuds','headset']},
  {id:'glasses',icon:'👓',aliases:['brille','briller','brillene','brillen','glass','glasses','solbriller','solbrillene','sunglasses']},
  {id:'wallet',icon:'👛',aliases:['lommebok','lommeboka','lommeboken','pengepung','wallet','purse']},
  {id:'watch',icon:'⌚',aliases:['klokke','klokka','klokken','armbåndsur','watch','watches']},
  {id:'camera',icon:'📷',aliases:['kamera','kameraet','camera','cameras','fotokamera']},
  {id:'coat',icon:'🧥',aliases:['jakke','jakka','jakken','jakkene','jacket','coat','frakk','frakken','hoodie','genser','genseren']},
  {id:'backpack',icon:'🎒',aliases:['ryggsekk','ryggsekken','sekk','sekken','backpack','backpacks','rucksack']},
  {id:'pocket',icon:'👖',aliases:['lomme','lomma','lommen','lommene','pocket','pockets']},
  {id:'medicine',icon:'💊',aliases:['medisin','medisinen','tablett','tabletter','pille','piller','medicine','medication','pills']},
  {id:'book',icon:'📚',aliases:['bok','boka','boken','bøker','bøkene','book','books']},
  {id:'flashlight',icon:'🔦',aliases:['lommelykt','lommelykten','flashlight','torch']},
];

const aliases = new Map<string,ItemCategory>();
for (const category of ITEM_CATEGORIES) {
  for (const alias of category.aliases) {
    const key = alias.toLocaleLowerCase('nb-NO').replace(/[^\p{L}\p{N}]/gu,'');
    if (aliases.has(key) && aliases.get(key) !== category.id) {
      throw new Error('Conflicting item alias: ' + alias);
    }
    aliases.set(key,category.id);
  }
}

function normalize(value:string):string {
  return value.toLocaleLowerCase('nb-NO').normalize('NFKC')
    .replace(/[’‘`´]/g,"'")
    // PC-en, PC'n and data'n are one noun, not two search tokens.
    .replace(/\b(pc|data)\s*[-']\s*(en|n)\b/gu,(_,stem:string,suffix:string)=>stem+(suffix==='n'?'n':'en'))
    .replace(/[^\p{L}\p{N}]+/gu,' ').trim();
}

function tokens(value:string):string[] {
  return normalize(value).split(/\s+/u).filter(Boolean);
}

/** One substitution, deletion or insertion, with an early exit. */
function oneEditApart(a:string,b:string):boolean {
  if(Math.abs(a.length-b.length)>1||a===b)return false;
  let i=0,j=0,edits=0;
  while(i<a.length&&j<b.length){
    if(a[i]===b[j]){i++;j++;continue;}
    if(++edits>1)return false;
    if(a.length>b.length)i++;
    else if(b.length>a.length)j++;
    else{i++;j++;}
  }
  return edits+(a.length-i)+(b.length-j)<=1;
}

function matchToken(token:string):ItemCategory|null {
  const exact = aliases.get(token);
  if(exact)return exact;

  // Compound nouns: a PC charger is a charger, not the PC itself.
  if(/^(?:pc|laptop|laptopp|data|datamaskin|macbook|mobil|telefon|usb|iphone)(?:en|n)?(?:lader|laderen|charger|chargers|ladekabel)$/.test(token))return 'charger';
  if(/^(?:pc|laptop|macbook|computer)(?:en|n)?(?:veske|vesken|bag)$/.test(token))return 'bag';

  // Never typo-correct short words (e.g. PC, bag or pass).
  if(token.length<5)return null;
  const candidates=new Set<ItemCategory>();
  for(const [alias,category] of aliases){
    if(alias.length<5||alias[0]!==token[0]||Math.abs(alias.length-token.length)>1)continue;
    if(oneEditApart(token,alias))candidates.add(category);
    if(candidates.size>1)return null;
  }
  return candidates.size===1?[...candidates][0]:null;
}

export function itemCategory(name:string):ItemCategory|null {
  const found = new Set<ItemCategory>();
  for(const token of tokens(name)){
    const match=matchToken(token);
    if(match)found.add(match);
  }
  // Keep accessory context intact: "PC-lader" must never become a laptop.
  for(const spec of ITEM_CATEGORIES)if(found.has(spec.id))return spec.id;
  return null;
}

export function emoji(name:string):string {
  const category=itemCategory(name);
  return ITEM_CATEGORIES.find(definition=>definition.id===category)?.icon??'📦';
}

const STOPWORDS=new Set([
  'hvor','hva','er','ble','la','lagt','ligger','står','jeg','vi','du','min','mitt','mine',
  'den','det','de','en','et','ei','på','i','til','fra','har','kan','finn','finne',
  'where','what','is','are','was','were','did','do','does','the','a','an','my',
  'me','i','you','your','put','left','leave','find','please','it','them','in','at','on',
]);

function queryTokens(value:string):string[] {
  // Locations following a preposition are not part of the object name.
  const raw=value.replace(/[’‘`´]/g,"'");
  const withoutLocation=raw.split(/\s+(?:i|på|inni|under|in|inside|at|on)\s+/iu)[0];
  return tokens(withoutLocation).filter(token=>!STOPWORDS.has(token));
}

function meaningfulNameTokens(value:string):string[] {
  return tokens(value).filter(token=>!STOPWORDS.has(token));
}

export function searchMemories<T extends {name:string}>(items:readonly T[],query:string):T[] {
  const sought=queryTokens(query);
  if(sought.length===0)return [];
  const category=itemCategory(sought.join(' '));

  return items.filter(item=>{
    const own=meaningfulNameTokens(item.name);
    if(own.length===0)return false;
    const ownCategory=itemCategory(item.name);
    if(category&&ownCategory){
      return category===ownCategory;
    }
    // Unknown names keep literal matching without aggressive typo guessing.
    return sought.every(term=>own.some(word=>
      word===term || (term.length>=3&&word.startsWith(term)) || (term.length>=4&&word.length>=4&&term.startsWith(word))
    ));
  });
}
