import test from 'node:test';
import assert from 'node:assert/strict';
import {parseDescription,suggestMemory,metersBetween} from '../lib/memory-suggestions.ts';

const locations=[
 {id:'home',name:'Hjem',parent_location_id:null,latitude:59.91,longitude:10.75,geo_precision:'precise'},
 {id:'bedroom',name:'Soverommet',parent_location_id:'home'},
 {id:'bag',name:'Sekken',parent_location_id:'bedroom'},
 {id:'drawer-home',name:'Skuffen',parent_location_id:'home'},
 {id:'office',name:'Kontor',parent_location_id:null,latitude:59.95,longitude:10.85,geo_precision:'precise'},
 {id:'drawer-office',name:'Skuffen',parent_location_id:'office'},
];
test('Parses Norwegian and English free text without saving it',()=>{
 assert.deepEqual(parseDescription('Jeg la PC-en i sekken på soverommet.'),{itemName:'PC-en',placeDescription:'sekken på soverommet',note:''});
 assert.deepEqual(parseDescription('I put my laptop in the bag in the bedroom.'),{itemName:'laptop',placeDescription:'bag in the bedroom',note:''});
 assert.deepEqual(parseDescription('Nøklene ligger i skuffen, notat: Den øverste.'),{itemName:'Nøklene',placeDescription:'skuffen',note:'Den øverste'});
 assert.equal(parseDescription('PC-en').itemName,'');
});
test('Auto-suggest unique full place hierarchy',()=>{
 const r=suggestMemory('Jeg la PC-en i sekken på soverommet',locations);
 assert.equal(r.itemName,'PC-en');
 assert.equal(r.best?.id,'bag');
 assert.deepEqual(r.best?.path,['Hjem','Soverommet','Sekken']);
});
test('Never choose between identical place names with no location fix',()=>{
 const r=suggestMemory('Jeg la nøklene i skuffen',locations);
 assert.equal(r.ambiguous,true);
 assert.equal(r.best,null);
 assert.ok(r.candidates.some(candidate=>candidate.id==='drawer-home'));
 assert.ok(r.candidates.some(candidate=>candidate.id==='drawer-office'));
});
test('GPS resolves a documented and accurate ambiguity',()=>{
 const r=suggestMemory('Jeg la nøklene i skuffen',locations,{latitude:59.91,longitude:10.75,accuracy:30});
 assert.equal(r.best?.id,'drawer-home');
 assert.equal(r.best?.nearby,true);
});
test('Approximate GPS can rank a known place without claiming precise accuracy',()=>{
 const r=suggestMemory('Jeg la nøklene i skuffen',locations,{latitude:59.91,longitude:10.75,accuracy:1100});
 assert.equal(r.best?.id,'drawer-home');
});
test('Poor accuracy cannot silently resolve a same-named location',()=>{
 const r=suggestMemory('Jeg la nøklene i skuffen',locations,{latitude:59.91,longitude:10.75,accuracy:3500});
 assert.equal(r.best,null);
 assert.equal(r.ambiguous,true);
});
test('Near a different saved location, a matched child can win',()=>{
 const r=suggestMemory('I put the keys in the skuffen',locations,{latitude:59.95,longitude:10.85,accuracy:18});
 assert.equal(r.best?.id,'drawer-office');
});
test('Geographic proximity alone cannot invent an unrelated named place',()=>{
 const r=suggestMemory('Jeg la telefonen under den blå jakken',locations,{latitude:59.91,longitude:10.75,accuracy:10});
 assert.equal(r.best,null);
});
test('Missing coordinates are ignored without geocoding the address',()=>{
 const copy=locations.map(loc=>({...loc,latitude:undefined,longitude:undefined}));
 const r=suggestMemory('Jeg la nøklene i skuffen',copy,{latitude:59.91,longitude:10.75,accuracy:10});
 assert.equal(r.best,null);
});
test('Haversine distances have expected order of magnitude',()=>{
 assert.equal(metersBetween({latitude:59.91,longitude:10.75},{latitude:59.91,longitude:10.75}),0);
 assert.ok(metersBetween({latitude:59.91,longitude:10.75},{latitude:59.95,longitude:10.85})>1000);
});
