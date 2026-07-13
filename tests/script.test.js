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

{
  const { context, storage } = load();
  const t = context.window.__oneUpTest;
  Object.keys(t.state.activitySettings).forEach(id => { t.state.activitySettings[id].enabled = false; t.state.activitySettings[id].streakEnabled = false; });
  t.state.activitySettings.sleep.enabled = true;
  t.state.activitySettings.sleep.streakEnabled = true;
  t.state.activitySettings.sleep.protectionEnabled = false;
  t.state.activitySettings.sleep.sleepCriteria = { duration:true, interval:true, bedtime:true, wake:true, screenfree:false };
  t.state.activitySettings.sleep.sleepMinHours = 7;
  t.state.activitySettings.sleep.sleepMinInterval = 7;
  t.state.activitySettings.sleep.sleepMaxInterval = 9;
  t.state.log.push({ id:'sl1', date:'2026-07-13', activity:'sleep', value:8, hours:8, start:'22:20', end:'06:20', sleepDate:'2026-07-12' });
  t.recalc();
  assert.equal(t.effectiveDate(t.state.log.at(-1)), '2026-07-12');
  assert.equal(t.requirementMet('sleep','2026-07-12'), true);
  assert.equal(t.requirementMet('sleep','2026-07-13'), false);
  assert.ok(storage.get('oneupStreakDataV1').includes('summary'));
}

{
  const { context } = load();
  const t = context.window.__oneUpTest;
  Object.keys(t.state.activitySettings).forEach(id => { t.state.activitySettings[id].enabled = false; t.state.activitySettings[id].streakEnabled = false; });
  t.state.activitySettings.meditation.enabled = true;
  t.state.activitySettings.meditation.streakEnabled = true;
  t.state.activitySettings.meditation.dailyRequirement = 10;
  t.state.activitySettings.meditation.weeklyGoal = 5;
  t.state.activitySettings.meditation.protectionEnabled = false;
  ['2026-07-07','2026-07-08','2026-07-10','2026-07-11','2026-07-13'].forEach((d,i)=>t.state.log.push({ id:`m${i}`, date:d, activity:'meditation', value:10 }));
  t.recalc();
  assert.equal(t.streakInfo('meditation','2026-07-13').current, 1);
  assert.equal(t.weeklyConsistency('meditation','2026-07-13').done, 1);
  assert.equal(t.streakInfo('meditation','2026-07-11').current, 2);
  assert.equal(t.weeklyConsistency('meditation','2026-07-11').done, 4); // missing one day did not reset week
}

{
  const { context } = load();
  const t = context.window.__oneUpTest;
  Object.keys(t.state.activitySettings).forEach(id => { t.state.activitySettings[id].enabled = false; t.state.activitySettings[id].streakEnabled = false; });
  t.state.activitySettings.breathing.enabled = true;
  t.state.activitySettings.breathing.streakEnabled = true;
  t.state.activitySettings.breathing.dailyRequirement = 5;
  t.state.activitySettings.breathing.protectionEnabled = true;
  t.state.activitySettings.breathing.autoProtection = true;
  t.state.log.push({ id:'b1', date:'2026-07-11', activity:'breathing', value:5 });
  t.state.log.push({ id:'b2', date:'2026-07-13', activity:'breathing', value:5 });
  t.recalc();
  t.state.streakData.manualProtection.breathing = { '2026-07-12': true };
  assert.equal(t.dayComplete('breathing','2026-07-12', true), true);
  assert.equal(t.streakInfo('breathing','2026-07-13').current, 3);
  assert.equal(t.dayComplete('breathing','2026-07-10', true), false); // no consecutive / second protection
}

{
  const { context } = load();
  const t = context.window.__oneUpTest;
  ['sleep','meditation','breathing','steps'].forEach(id => { t.state.activitySettings[id].enabled = true; t.state.activitySettings[id].streakEnabled = true; t.state.activitySettings[id].protectionEnabled = false; });
  t.state.log.push({ id:'s', date:'2026-07-13', activity:'steps', value:8000 });
  t.state.log.push({ id:'b', date:'2026-07-13', activity:'breathing', value:5 });
  t.state.log.push({ id:'m', date:'2026-07-13', activity:'meditation', value:10 });
  t.state.log.push({ id:'sl', date:'2026-07-13', activity:'sleep', value:8, hours:8, start:'22:30', end:'06:30' });
  t.recalc();
  assert.equal(t.consistencyScore('2026-07-13') > 40, true);
  t.state.log.find(e=>e.id==='m').value = 0; // correction of old data recalculates
  t.recalc();
  assert.equal(t.requirementMet('meditation','2026-07-13'), false);
}
