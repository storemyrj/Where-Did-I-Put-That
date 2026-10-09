import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildHeadlinePool,drawHeadline,readDeck,
  recordRecentFoundItem,readRecentFoundItems,localSearchStorageKey,
} from '../lib/home-prompts.ts';

test('12 evergreen prompts, contextual greetings and no emoji',()=>{
  const morning=buildHeadlinePool({hour:8,name:'Joachim Storemyr'});
  assert.equal(morning.filter(p=>p.id==='hello').length,1);
  assert.equal(morning.find(p=>p.id==='morning')?.no,'God morgen, Joachim!');
  assert.equal(morning.find(p=>p.id==='morning')?.en,'Good morning, Joachim!');
  assert.equal(morning.length,14);
  assert.ok(!morning.some(p=>p.id==='night'));
  assert.ok(morning.every(p=>p.no&&!p.no.includes('👋')&&p.en&&!p.en.includes('🌄')));
  const evening=buildHeadlinePool({hour:19});
  assert.equal(evening.find(p=>p.id==='evening')?.no,'God kveld!');
  assert.ok(!evening.some(p=>p.id==='morning'));
  const late=buildHeadlinePool({hour:2});
  assert.equal(late.find(p=>p.id==='night')?.en,'Still awake?');
  assert.ok(!late.some(p=>p.id==='evening'));
});

test('Name is optional and email fallback never leaks to greetings',()=>{
  const first=buildHeadlinePool({hour:8,name:'user@example.com'}).find(p=>p.id==='morning');
  assert.equal(first?.no,'God morgen!');
  assert.equal(buildHeadlinePool({hour:8,name:'Anne-Marie Vik'}).find(p=>p.id==='hello')?.no,'Heisann, Anne-Marie!');
});

test('Recent found item templates adapt to five distinct actual items',()=>{
  const phrases=buildHeadlinePool({hour:12,recentItems:['PC-en','Nøkler','Briller','Pass','Sykkel','Ekstra']});
  const dynamic=phrases.filter(p=>p.id.startsWith('recent-'));
  assert.equal(dynamic.length,10);
  assert.ok(dynamic.some(p=>p.no.includes('«PC-en»')));
  assert.ok(dynamic.some(p=>p.en.includes('“Nøkler”')));
  assert.ok(!dynamic.some(p=>p.no.includes('Ekstra')));
  assert.equal(new Set(dynamic.map(p=>p.id)).size,10);
});

test('Shuffle bag shows each eligible phrase before repeating',()=>{
  const pool=buildHeadlinePool({hour:12});
  let deck=null;
  const seen=[];
  for(let i=0;i<pool.length;i++){
    const next=drawHeadline(pool,deck,()=>0.75);
    deck=next.deck;
    seen.push(next.headline.id);
  }
  assert.equal(new Set(seen).size,pool.length);
  assert.equal(deck.remaining.length,0);
  const next=drawHeadline(pool,deck,()=>0.75);
  assert.notEqual(next.headline.id,seen.at(-1));
});

test('Refresh uses persisted queue, never immediately repeats',()=>{
  const pool=buildHeadlinePool({hour:21});
  const initial=drawHeadline(pool,null,()=>0.1);
  const restored=readDeck(JSON.stringify(initial.deck));
  assert.deepEqual(restored,initial.deck);
  const another=drawHeadline(pool,restored,()=>0.1);
  assert.notEqual(another.headline.id,initial.headline.id);
  assert.equal(another.deck.remaining.length,initial.deck.remaining.length-1);
});

test('Invalid and stale shuffle bags recover safely',()=>{
  assert.equal(readDeck('{broken'),null);
  assert.equal(readDeck('{"version":2,"remaining":[],"previous":null}'),null);
  assert.equal(readDeck('{"version":1,"remaining":[5],"previous":null}'),null);
  const pool=buildHeadlinePool({hour:2});
  const fallback=drawHeadline(pool,{version:1,remaining:['missing-phrase'],previous:pool[0].id},()=>0);
  assert.ok(pool.some(item=>item.id===fallback.headline.id));
  assert.notEqual(fallback.headline.id,pool[0].id);
});

test('Recent items contain only five distinct non-empty names',()=>{
  let data=[];
  for(const name of ['PC-en','Nøkler','Briller','Pass','Sekken','Kamera','nøkler']){
    data=recordRecentFoundItem(data,name);
  }
  assert.deepEqual(data,['nøkler','Kamera','Sekken','Pass','Briller']);
  const persisted=readRecentFoundItems(JSON.stringify(data));
  assert.deepEqual(persisted,data);
  assert.deepEqual(readRecentFoundItems('garbage'),[]);
  assert.ok(!recordRecentFoundItem([], '<Private>\n')[0].includes('<'));
});

test('Local-only account keys are stable and separated',()=>{
  assert.equal(localSearchStorageKey('PERSON@Example.com'),localSearchStorageKey('person@example.com'));
  assert.notEqual(localSearchStorageKey('a@example.com'),localSearchStorageKey('b@example.com'));
});
