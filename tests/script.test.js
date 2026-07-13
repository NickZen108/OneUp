const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function el() { return { textContent:'', innerHTML:'', value:'', checked:false, hidden:false, options:[], classList:{toggle(){},add(){},remove(){}}, style:{}, dataset:{}, add(){ this.options.push(...arguments); }, addEventListener(){}, set onclick(v){this._onclick=v}, get onclick(){return this._onclick}, set onchange(v){this._onchange=v}, get onchange(){return this._onchange}, set onsubmit(v){this._onsubmit=v}, get onsubmit(){return this._onsubmit} }; }
function load(storage = new Map()) {
  const ids = ['oneup-score','today-points','header-points','goals-met','today-streak','encouragement','today-activity-cards','activity-manager','entry-list','competition-type','leaderboard','self-summary','self-ranking','development-filter','bars-7','bars-4','weekly-summary','profile-form','settings-form','create-group','group-message','competition-others','competition-self','start-breathing','stop-breathing','breathing-label'];
  const map = Object.fromEntries(ids.map(id => [`#${id}`, el()]));
  map['#development-filter'].value = 'all';
  const context = {
    localStorage:{ getItem:k=>storage.has(k)?storage.get(k):null, setItem:(k,v)=>storage.set(k,String(v)), removeItem:k=>storage.delete(k) },
    window:{ __oneUpNow:()=>new Date('2026-07-13T12:00:00Z'), setInterval(){return 1}, clearInterval(){} },
    document:{ querySelector:s=>map[s] || el(), querySelectorAll:s=>[], createElement:()=>el() },
    Option:function(text,value){ return {text,value}; }, FormData:function(){ return []; }, prompt:()=>null, setInterval(){return 1}, clearInterval(){}
  };
  vm.runInNewContext(fs.readFileSync('script.js','utf8'), context);
  return { context, storage, map };
}

{
  const storage = new Map([
    ['oneupPoints','123'],
    ['oneupVillageResidents','{"buster":{}}'],
    ['oneupMissions','{"activeId":"buster"}'],
    ['oneupDailyHistory','{"2026-07-12":{"totalPoints":44}}']
  ]);
  load(storage);
  assert.equal(storage.get('oneupDataVersion'), '2');
  assert.equal(storage.has('oneupVillageResidents'), false);
  assert.ok(storage.get('oneupArchivedVillageDataV2').includes('oneupVillageResidents'));
}

{
  const { context } = load();
  context.window.__oneUpTest.state.activitySettings.sleep.enabled = true;
  context.window.__oneUpTest.state.log.push({ id:'s', date:'2026-07-13', activity:'steps', value:8000 });
  context.window.__oneUpTest.state.log.push({ id:'b', date:'2026-07-13', activity:'breathing', value:3, mode:'box' });
  context.window.__oneUpTest.state.log.push({ id:'sl', date:'2026-07-13', activity:'sleep', value:6.4, hours:6.4 });
  context.window.__oneUpTest.recalc();
  assert.equal(context.window.__oneUpTest.oneUpScore('2026-07-13'), 80); // 100, 60, 80 averaged and capped
  assert.equal(context.window.__oneUpTest.state.history['2026-07-13'].totalPoints, 95); // 80 step + 15 breathing + 0 sleep
}

{
  const { context } = load();
  const sleep = { activity:'sleep', hours:8 };
  assert.equal(context.window.__oneUpTest.pointsForEntry({ activity:'steps', value:1234 }), 12);
  assert.equal(context.window.__oneUpTest.pointsForEntry({ activity:'breathing', value:2 }), 10);
  assert.equal(context.window.__oneUpTest.pointsForEntry({ activity:'meditation', value:40 }), 30);
  assert.equal(context.window.__oneUpTest.pointsForEntry(sleep), 20);
}
