import test from 'node:test';
import assert from 'node:assert/strict';
import {emoji,itemCategory,searchMemories,ITEM_CATEGORIES} from '../lib/item-recognition.ts';

const computerNames=[
  'PC','PCen','PC-en',"PC'n",'Laptop','laptopp',
  'Laptoppen','Lapptoppen','Laptopen','Dataen',"Data'n",'Datamaskinen',
  'MacBook','datamasinen',
];

test('all supplied PC spellings and a single-character typo map to one category',()=>{
  for(const name of computerNames){
    assert.equal(itemCategory(name),'computer',name);
    assert.equal(emoji(name),'💻',name);
  }
});

test('accessories beat devices: chargers and bags are not PCs',()=>{
  for(const name of ['PC-lader','PC lader','Laptoplader','Laptopladeren','PC-charger','MacBook-lader','lader til PC']){
    assert.equal(itemCategory(name),'charger',name);
    assert.equal(emoji(name),'🔌',name);
  }
  assert.equal(itemCategory('PC-veske'),'bag');
  assert.equal(itemCategory('Laptop bag'),'bag');
});

test('common existing icons and Norwegian inflections remain stable',()=>{
  const cases=[
    ['Nøkler','🔑'],['Nøklene','🔑'],['Jakken','🧥'],['Ryggsekken','🎒'],
    ['Telefonen','📱'],['Mobilen','📱'],['Passet','📕'],['AirPods','🎧'],
    ['Brillene','👓'],['Lommeboka','👛'],['Laderen','🔌'],['Datamaskinen','💻'],
    ['Fremmed objekt','📦'],
  ];
  for(const [name,icon] of cases) assert.equal(emoji(name),icon,name);
});

test('search understands PC variants while preserving the user-written name',()=>{
  const entries=[
    {name:"PC'n",id:'a'},
    {name:'Laptoppen',id:'b'},
    {name:'Datamaskinen',id:'c'},
    {name:'Laptop-lader',id:'d'},
    {name:'Snus',id:'e'},
  ];
  for(const query of ['hvor er PC-en min?','Hvor la jeg laptopp?','Dataen','Where is my computer?']){
    assert.deepEqual(searchMemories(entries,query).map(x=>x.id),['a','b','c'],query);
  }
  assert.deepEqual(searchMemories(entries,'hvor er laptop-laderen?').map(x=>x.id),['d']);
  assert.deepEqual(searchMemories(entries,'PC-lader').map(x=>x.id),['d']);
  assert.deepEqual(searchMemories(entries,'Snus').map(x=>x.id),['e']);
  assert.equal(entries[0].name,"PC'n");
});

test('short unknown and ambiguous words are never corrected into unrelated categories',()=>{
  assert.equal(itemCategory('pk'),null);
  assert.equal(itemCategory('Datahuset'),null);
  assert.equal(itemCategory('manual'),null);
  assert.deepEqual(searchMemories([{name:'PC'}],''),
    []);
  assert.deepEqual(searchMemories([{name:'PC'}],'hvor er den?'),
    []);
});

test('alias dictionary maps each literal alias unambiguously',()=>{
  assert.ok(ITEM_CATEGORIES.length>=12);
  const seen=new Map();
  for(const category of ITEM_CATEGORIES){
    for(const alias of category.aliases){
      const normalized=alias.replace(/[^\p{L}\p{N}]/gu,'').toLowerCase();
      if(seen.has(normalized))assert.equal(seen.get(normalized),category.id,alias);
      seen.set(normalized,category.id);
    }
  }
});
