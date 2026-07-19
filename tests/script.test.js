const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function el() { return { textContent:'', innerHTML:'', value:'', checked:false, hidden:false, options:[], classList:{toggle(){},add(){},remove(){}}, style:{}, dataset:{}, add(){ this.options.push(...arguments); }, addEventListener(){}, set onclick(v){this._onclick=v}, get onclick(){return this._onclick}, set onchange(v){this._onchange=v}, get onchange(){return this._onchange}, set onsubmit(v){this._onsubmit=v}, get onsubmit(){return this._onsubmit} }; }
function load(storage = new Map()) {
  const ids = ['oneup-score','today-points','goals-met','today-streak','encouragement','today-goal-summary','personal-goal-list','show-all-personal-goals','app-version-label','app-build-label','activity-manager','entry-list','competition-type','leaderboard','self-summary','self-ranking','development-filter','bars-7','bars-4','weekly-summary','profile-form','settings-form','create-group','group-message','competition-others','competition-self'];
  const map = Object.fromEntries(ids.map(id => [`#${id}`, el()]));
  map['#development-filter'].value = 'all';
  const context = {
    localStorage:{ getItem:k=>storage.has(k)?storage.get(k):null, setItem:(k,v)=>storage.set(k,String(v)), removeItem:k=>storage.delete(k) },
    window:{ __oneUpNow:()=>new Date('2026-07-13T12:00:00Z'), setInterval(){return 1}, clearInterval(){}, setTimeout(fn){ if(typeof fn==='function') fn(); return 1; }, clearTimeout(){} },
    document:{ readyState:'complete', body:el(), addEventListener(){}, querySelector:s=>map[s] || el(), querySelectorAll:s=>[], createElement:()=>el() },
    Option:function(text,value){ return {text,value}; }, FormData:function(){ return []; }, prompt:()=>null, setInterval(){return 1}, clearInterval(){}, setTimeout(fn){ if(typeof fn==='function') fn(); return 1; }, clearTimeout(){}, requestAnimationFrame(fn){ if(typeof fn==='function') fn(); return 1; }, setTimeout(fn){ if(typeof fn==='function') fn(); return 1; }, clearTimeout(){}
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
  const t = context.window.__oneUpTest;
  Object.keys(t.state.activitySettings).forEach(id => { t.state.activitySettings[id].enabled = false; });
  t.state.activitySettings.stairs.enabled = true;
  t.state.activitySettings.stairs.goalPeriod = 'daily';
  t.state.activitySettings.stairs.targetCount = 300;
  t.state.activitySettings.stairs.goal = 300;
  t.state.activitySettings.stairs.direction = 'up';
  t.state.log.push({ id:'su', date:'2026-07-13', activity:'stairs', activityType:'stairs', direction:'up', goalPeriod:'daily', targetCount:300, completedCount:150, value:150, timestamp:'2026-07-13T10:20:00.000Z' });
  t.state.log.push({ id:'sd', date:'2026-07-13', activity:'stairs', activityType:'stairs', direction:'down', goalPeriod:'daily', targetCount:300, completedCount:200, value:200, timestamp:'2026-07-13T10:21:00.000Z' });
  t.recalc();
  assert.equal(t.heroScore('daily','2026-07-13').percent, 0); // legacy manual stairs are no longer shown on home
  t.state.activitySettings.stairs.direction = 'combined';
  assert.equal(t.heroScore('daily','2026-07-13').percent, 0);
  t.state.activitySettings.stairs.goalPeriod = 'weekly';
  t.state.activitySettings.stairs.targetCount = 1000;
  t.state.activitySettings.stairs.goal = 1000;
  assert.equal(t.heroScore('weekly','2026-07-13').percent, 0); // legacy manual stairs are no longer shown on home
}

{
  const { context } = load();
  context.window.__oneUpTest.state.activitySettings.sleep.enabled = true;
  context.window.__oneUpTest.state.log.push({ id:'s', date:'2026-07-13', activity:'steps', value:8000 });
  context.window.__oneUpTest.state.log.push({ id:'b', date:'2026-07-13', activity:'breathing', value:3, mode:'box' });
  context.window.__oneUpTest.state.log.push({ id:'sl', date:'2026-07-13', activity:'sleep', value:6.4, hours:6.4 });
  context.window.__oneUpTest.recalc();
  assert.equal(context.window.__oneUpTest.oneUpScore('2026-07-13'), 100); // removed legacy sleep activity no longer lowers active goal score
  assert.equal(context.window.__oneUpTest.state.history['2026-07-13'].totalPoints, 115); // historical sleep entries are preserved
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

{
  const { context, storage } = load();
  const t = context.window.__oneUpTest;
  t.state.profile.nickname = 'Anna';
  t.state.activitySettings.steps.enabled = true;
  t.state.activitySettings.meditation.enabled = true;
  const c = t.createCompetition({ type:'others', name:'Familieudfordringen', activities:['steps','meditation'], startDate:'2026-07-13', endDate:'2026-07-20', weightingMode:'custom', weights:{steps:60,meditation:40}, participants:[{id:'bo',name:'Bo',demo:true,friend:true}] });
  assert.equal(c.creator, 'you');
  assert.equal(t.isCompetitionLeader(c), true);
  assert.equal(c.leaders.join(','), 'you');
  assert.ok(c.changeLog[0].what.includes('oprettede'));
  assert.ok(storage.get('oneupCompetitionsV1').includes('Familieudfordringen'));
  t.state.log.push({ id:'s1', date:'2026-07-13', activity:'steps', value:8800 });
  t.state.log.push({ id:'m1', date:'2026-07-13', activity:'meditation', value:12 });
  t.recalc();
  t.recalcCompetitions();
  assert.equal(t.competitionActivityScore(c,'steps',{id:'you',name:'Anna'},'2026-07-13'), 100);
  assert.equal(t.competitionActivityScore(c,'meditation',{id:'you',name:'Anna'},'2026-07-13'), 100);
  assert.equal(c.results.userScore, 100);
  assert.equal(t.competitionLeaderboard(c).some(r => r.participant.id === 'bo'), true);
}

{
  const { context } = load();
  const t = context.window.__oneUpTest;
  const c = t.createCompetition({ type:'self', name:'Mental balance', activities:['breathing','meditation'], startDate:'2026-07-13', endDate:'2026-07-19' });
  assert.equal(c.participants.length, 1);
  assert.equal(c.type, 'self');
  assert.equal(c.scoringMethod, 'configuredGoals');
  assert.equal(Object.values(c.weighting.weights).reduce((a,b)=>a+b,0), 100);
  t.archiveCompetition(c.id);
  assert.equal(c.status, 'archived');
}

{
  const { context } = load();
  const t = context.window.__oneUpTest;
  assert.equal(t.normalizeCompetitionType('others'), 'versus');
  assert.equal(t.competitionTypeLabel('coop'), 'Samarbejde om fælles mål');
  const c = t.createCompetition({ type:'coop', name:'Fælles skridt', activities:['dailyStepTarget'], startDate:'2026-07-13', endDate:'2026-07-19', participants:[{id:'bo',name:'Bo',demo:true}] });
  assert.equal(c.type, 'coop');
  assert.equal(t.isCoopCompetition(c), true);
  assert.equal(c.settings.coopGoal, true);
  assert.equal(c.participants.length, 2);
}


{
  const { context } = load();
  const t = context.window.__oneUpTest;
  const self = t.createCompetition({ type:'self', name:'Mere bevægelse', activities:['dailyStepTarget','bedtime'], startDate:'2026-07-13', endDate:'2026-08-11' });
  const home = t.competitionCard(self, false);
  assert.ok(home.includes('Åbn hele konkurrencen'));
  assert.ok(home.includes('home-activity-row'));
  assert.equal(home.includes('Konkurrenceledere'), false);
  assert.equal(home.includes('Scoring:'), false);
  assert.equal(home.includes('Fold sammen'), false);
  const detail = t.competitionCard(self, true);
  assert.ok(detail.includes('Konkurrenceledere'));
  assert.ok(detail.includes('Scoring:'));
}

{
  const { context } = load();
  const t = context.window.__oneUpTest;
  const versus = t.createCompetition({ type:'versus', name:'Vennerne', activities:['dailyStepTarget'], startDate:'2026-07-13', endDate:'2026-07-31', participants:[{id:'a',name:'A',demo:true},{id:'b',name:'B',demo:true},{id:'c',name:'C',demo:true},{id:'d',name:'D',demo:true},{id:'e',name:'E',demo:true},{id:'f',name:'F',demo:true}] });
  const html = t.competitionCard(versus, false);
  assert.ok(html.includes('Top 5'));
  assert.equal((html.match(/<li class=/g)||[]).length, 5);
  assert.equal(html.includes('streak'), false);
  assert.equal(html.includes('gennemførte'), false);
}

{
  const { context } = load();
  const t = context.window.__oneUpTest;
  const coop = t.createCompetition({ type:'coop', name:'Sammen', activities:['dailyStepTarget','cycling'], startDate:'2026-07-13', endDate:'2026-07-31', participants:[{id:'a',name:'A',demo:true}] });
  coop.activityGoals.dailyStepTarget.target = 1000000;
  coop.activityGoals.cycling.target = 500;
  const html = t.competitionCard(coop, false);
  assert.ok(html.includes('home-coop-row'));
  assert.ok(html.includes('af'));
  assert.ok(html.includes('home-progress'));
  assert.equal(html.includes('Deltagerne samarbejder om at nå et fælles mål.'), false);
  assert.ok(t.coopActivityValue(coop, 'dailyStepTarget') > 0);
}

{
  const { context, map } = load();
  const t = context.window.__oneUpTest;
  Object.keys(t.state.activitySettings).forEach(id => { t.state.activitySettings[id].enabled = false; });
  t.state.activitySettings.breathing.enabled = true;
  t.state.activitySettings.meditation.enabled = true;
  t.renderToday();
  const html = map['#today-goal-summary'].textContent;
  assert.equal(html.includes('Åndedræt'), false);
  assert.equal(html.includes('Meditation'), false);
  assert.equal(html.includes('Skridt'), false);
  assert.equal(html.includes('Søvn'), false);
  assert.equal(html, '');
  assert.ok(!map['#personal-goal-list'].innerHTML.includes('Åndedrætsøvelser'));
}

{
  const { context, map } = load();
  const t = context.window.__oneUpTest;
  t.state.activitySettings.steps.goal = 9000;
  t.state.log.push({ id:'old-steps', date:'2026-07-13', activity:'steps', value:7000 });
  t.state.log.push({ id:'old-sleep', date:'2026-07-13', activity:'sleep', value:7.5, hours:7.5 });
  t.state.activitySettings.steps.enabled = true;
  t.state.activitySettings.sleep.enabled = true;
  t.renderToday();
  const html = map['#today-goal-summary'].textContent;
  assert.equal(html.includes('Skridt'), false);
  assert.equal(html.includes('Søvn'), false);
  assert.equal(html.includes('9.000 skridt'), false);
  assert.equal(t.state.log.length, 2);
  assert.equal(t.state.activitySettings.steps.goal, 9000);
}

{
  const { context, map } = load();
  const t = context.window.__oneUpTest;
  Object.keys(t.state.activitySettings).forEach(id => { t.state.activitySettings[id].enabled = false; });
  t.renderToday();
  const html = map['#today-goal-summary'].textContent;
  assert.equal(html, '');
  assert.ok(map['#personal-goal-list'].innerHTML.includes('Vælg aktiviteter under'));
}


{
  const { context, map } = load();
  const t = context.window.__oneUpTest;
  t.state.activitySettings.dailyStepTarget.enabled = true;
  t.state.healthConnect = { permissions:{ steps:true }, values:{ steps:6421 }, availability:{ steps:{dataAvailable:true} } };
  t.state.log.push({ id:'steps-now', date:'2026-07-13', activity:'dailyStepTarget', value:6421 });
  t.renderToday();
  const html = map['#personal-goal-list'].innerHTML;
  assert.ok(html.includes('Skridt'));
  assert.ok(html.includes('6.421'));
  assert.ok(!html.includes('Åndedrætsøvelser'));
  assert.equal(html.includes('progressbar'), false);
  assert.equal(html.includes('Health Connect ikke forbundet'), false);
}

{
  const { context, map } = load();
  const t = context.window.__oneUpTest;
  const acts = ['dailyStepTarget','running','cycling','walking'];
  acts.forEach(activity => { if(t.state.activitySettings[activity]) t.state.activitySettings[activity].enabled = true; });
  acts.forEach((activity, i) => t.state.log.push({ id:`many-${activity}`, date:'2026-07-13', activity, value: activity==='bedtime'?22.15:i+1, hours: activity==='sleepDuration'?7.5:undefined }));
  t.renderToday();
  assert.equal((map['#personal-goal-list'].innerHTML.match(/personal-goal-row/g)||[]).length, 0);
  assert.equal(map['#show-all-personal-goals'].hidden, true);
}

{
  const { context } = load();
  const t = context.window.__oneUpTest;
  assert.equal(t.personalMetricDisplayValue('steps', {available:true, value:6421}), '6.421');
  assert.equal(t.personalMetricDisplayValue('sleepDuration', {available:true, value:7.5}), '7,5 t');
  assert.equal(t.personalMetricDisplayValue('bedtime', {available:true, value:22.15}), '22.15');
  assert.equal(t.personalMetricDisplayValue('distance', {available:true, value:5.2}), '5,2 km');
  assert.equal(t.personalMetricDisplayValue('restingHeartRate', {available:true, value:58}), '58 bpm');
  assert.equal(t.personalMetricDisplayValue('heartRateVariability', {available:true, value:42}), '42 ms');
}


{
  const { context, map } = load();
  const t = context.window.__oneUpTest;
  t.setPersonalMetricEnabled('socialMediaTime', true);
  assert.equal(t.state.personalGoals.socialMediaTime.enabled, false);
  assert.equal(t.state.personalGoals.socialMediaTime.front, false);
  assert.equal(t.state.activitySettings.socialMediaFree.enabled, false);
  t.renderActivities();
  assert.ok(!map['#activity-manager'].innerHTML.includes('data-personal-enabled="socialMediaTime" type="checkbox" checked'));
}

{
  const { context, map } = load();
  const t = context.window.__oneUpTest;
  t.setPersonalMetricEnabled('socialMediaTime', true);
  t.setPersonalMetricEnabled('socialMediaTime', false);
  assert.equal(t.state.personalGoals.socialMediaTime.enabled, false);
  assert.equal(t.state.personalGoals.socialMediaTime.front, false);
  assert.equal(t.state.activitySettings.socialMediaFree.enabled, false);
  t.renderActivities();
  assert.ok(!map['#activity-manager'].innerHTML.includes('data-personal-enabled="socialMediaTime" type="checkbox" checked'));
}

{
  const { context, map } = load();
  const t = context.window.__oneUpTest;
  t.setPersonalMetricEnabled('totalScreenTime', true);
  assert.equal(t.state.personalGoals.totalScreenTime.enabled, false);
  assert.equal(t.state.personalGoals.totalScreenTime.front, false);
  assert.equal(t.state.activitySettings.totalScreenTime.enabled, false);
  t.renderActivities();
  assert.ok(!map['#activity-manager'].innerHTML.includes('data-personal-enabled="totalScreenTime" type="checkbox" checked'));
}

{
  const { context, map } = load();
  const t = context.window.__oneUpTest;
  t.setPersonalMetricEnabled('steps', true);
  assert.equal(t.state.personalGoals.steps.enabled, true);
  assert.equal(t.state.activitySettings.dailyStepTarget.enabled, true);
  t.renderActivities();
  assert.ok(map['#activity-manager'].innerHTML.includes('data-personal-enabled="steps" type="checkbox" checked'));
  t.setPersonalMetricEnabled('steps', false);
  assert.equal(t.state.personalGoals.steps.enabled, false);
  assert.equal(t.state.activitySettings.dailyStepTarget.enabled, false);
  t.renderActivities();
  assert.ok(!map['#activity-manager'].innerHTML.includes('data-personal-enabled="steps" type="checkbox" checked'));
}

{
  const { context } = load();
  const t = context.window.__oneUpTest;
  for (const [metricId, metric] of Object.entries(t.personalMetrics)) {
    if (metric.activity) assert.ok(t.activities[metric.activity], `${metricId} maps to existing activity ${metric.activity}`);
  }
}

{
  const { context } = load();
  const t = context.window.__oneUpTest;
  assert.equal(t.competitionActivityIds().length, 26);
  assert.equal(t.competitionActivityIds().includes('sleep'), false);
  assert.equal(t.competitionActivityIds().includes('breathing'), false);
  assert.equal(t.competitionActivityIds().includes('meditation'), false);
  assert.equal(t.competitionActivityIds().includes('strength'), false);
  assert.equal(t.competitionActivityIds().includes('swimming'), false);
  assert.equal(t.competitionActivityIds().includes('yoga'), false);
  assert.equal(t.competitionActivityIds().includes('mobility'), false);
  assert.equal(t.competitionActivityIds().includes('workouts'), false);
  assert.equal(t.competitionActivityIds().includes('sleepDuration'), true);
  assert.ok(t.competitionActivityIds().includes('bedtime'));
  assert.equal(t.competitionActivityIds().includes('wakeTime'), false);
  assert.equal(t.sanitizeActivityIds(['screenfree','socialfree','unknown']).join(','), 'screenFreeBeforeBed,socialMediaFree');
  const weights = t.defaultWeights(['steps','sleep','breathing']);
  assert.equal(`${weights.steps},${weights.sleep},${weights.breathing}`, '33.34,33.33,33.33');
}

{
  const html = fs.readFileSync('index.html','utf8');
  const source = fs.readFileSync('script.js','utf8');
  assert.equal(html.includes('id="header-points"'), false);
  assert.equal(source.includes('#header-points'), false);
  assert.equal(html.includes('data-open-profile'), false);
  assert.ok(html.includes('data-main-nav="profile"'));
  assert.ok(source.includes("showPage('profile')") || source.includes('dataMainNav'));
  assert.equal(html.includes('bottom-nav'), false);
}

{
  const { context, map } = load();
  context.window.__oneUpTest.renderVersion();
  assert.equal(map['#app-version-label'].textContent, 'Version: 1.16.4');
  assert.ok(map['#app-build-label'].textContent.includes('København nu:'));
  assert.ok(map['#app-build-label'].textContent.includes('Opdateret: 19. juli 2026 kl. 21.40'));
}


{
  const source = fs.readFileSync('script.js','utf8');
  assert.equal(source.includes('home-card-drag-handle'), false);
  assert.equal(source.includes('data-home-drag-handle'), false);
  assert.ok(source.includes('aria-label="Åbn menu til flytning af kort"'));
  assert.ok(source.includes("closeHomeCardMenu(); if(b.dataset.homeMove==='reset')"));
  assert.ok(source.includes("if(openHomeCardMenu){ closeHomeCardMenu(true); return; }"));
  assert.ok(source.includes("openHomeCardMenu===menu ? closeHomeCardMenu()"));
  assert.ok(source.includes('handleHomeCardOutsidePointer'));
}

{
  const source = fs.readFileSync('script.js','utf8');
  assert.ok(source.includes('class="stepper-display"'));
  assert.ok(source.includes('data-stepper-number="${id}"'));
  assert.ok(source.includes('editor.querySelectorAll(`[data-stepper-number="${id}"]`)'));
}

{
  const { context, map } = load();
  const t = context.window.__oneUpTest;
  t.renderActivities();
  const html = map['#activity-manager'].innerHTML;
  assert.ok(html.includes('class="checkbox-row"'));
  assert.equal(html.includes('class="switch"'), false);
  assert.equal(html.includes('> Aktiv</label>'), false);
  assert.ok(html.includes('class="activity-title-row"'));
  assert.ok(html.includes('data-toggle="dailyStepTarget"'));
  assert.equal(html.includes('Vis på forsiden'), false);
  assert.ok(html.includes('<span>Streak til</span>'));
  assert.ok(html.includes('<span>Streak-beskyttelse</span>'));
  assert.ok(html.includes('<span>Brug automatisk streak-beskyttelse</span>'));
  assert.equal(html.includes('Søvnlængde'), true);
  assert.equal(html.includes('Søvn</h3>'), false);
}

{
  const { context } = load();
  const t = context.window.__oneUpTest;
  assert.equal(t.scoreMoreIsBetter(30,30,60), 100);
  assert.equal(t.scoreMoreIsBetter(45,30,60), 100);
  assert.equal(t.scoreMoreIsBetter(60,30,60), 100);
  assert.equal(t.scoreLessIsBetter(30,30,15), 100);
  assert.equal(t.scoreLessIsBetter(15,30,15), 100);
}

{
  const { context } = load();
  const t = context.window.__oneUpTest;
  t.state.activitySettings.steps.goal = 9000;
  const c = t.createCompetition({ name:'Gammel opsætning', activities:['steps'], startDate:'2026-07-13', endDate:'2026-07-20' });
  assert.equal(c.activities.includes('dailyStepTarget'), true);
  assert.equal(c.activityGoals.dailyStepTarget.target, 8000);
  assert.equal(t.state.activitySettings.steps.goal, 9000);
}


{
  const { context } = load();
  const t = context.window.__oneUpTest;
  const defaults = {
    strength: 1,
    screenFreeBeforeBed: 30,
    socialMediaFree: 60,
    running: 5,
    cycling: 10,
    dailyStepTarget: 8000,
    mostSteps: 0
  };
  for (const [id, expected] of Object.entries(defaults)) {
    assert.equal(t.newCompetitionGoalDefault(id), expected, `${id} starts at explicit competition default`);
  }
}

{
  const { context } = load();
  const t = context.window.__oneUpTest;
  t.competitionDraft = { activityGoals:{}, activities:[] };
  const strength = t.draftGoal('strength');
  assert.equal(strength.target, 1);
  assert.equal(strength.complete, true);
  assert.equal(strength.migratedFromLegacy, false);
  assert.equal(strength.needsReconfiguration, false);
  assert.equal(strength.migrationNotice, '');
}

{
  const source = fs.readFileSync('script.js', 'utf8');
  assert.ok(source.includes('const raw = Number(cfg.target); const current = Number.isFinite(raw) ? raw : min; const next = clamp(current + delta, min, max);'));
  assert.ok(!source.includes('num(cfg.target||min)+delta'));
  assert.ok(source.includes('cfg.migratedFromLegacy===true||cfg.needsReconfiguration===true'));
}


{
  const { context } = load();
  const t = context.window.__oneUpTest;
  assert.equal(t.normalizeGoalConfig('bedtime', { activityId:'bedtime', target:22.25, bonusTarget:21.75 }).complete, true);
  assert.equal(t.normalizeGoalConfig('bedtime', { activityId:'bedtime', target:22.25, bonusTarget:22.5 }).bonusTarget, null);
  assert.equal(t.goalSummary({ activityId:'bedtime', target:22.25, bonusTarget:21.75 }).includes('senest kl. 22.15'), true);
}

{
  const { context } = load();
  const t = context.window.__oneUpTest;
  assert.equal(t.scoreMoreIsBetter(1,2,null), 50);
  assert.equal(t.scoreMoreIsBetter(2.4,2,null), 100);
}

{
  const { context } = load();
  const t = context.window.__oneUpTest;
  assert.equal(t.normalizeGoalConfig('running', { activityId:'running', metric:'minutes', target:30 }).needsReconfiguration, true);
  assert.equal(t.normalizeGoalConfig('running', { activityId:'running', metric:'kilometers', target:10, bonusTarget:15, period:'weekly' }).complete, true);
  assert.equal(t.normalizeGoalConfig('running', { activityId:'running', metric:'kilometers', target:10, bonusTarget:15, period:'weekly' }).bonusTarget, null);
  assert.ok(t.goalSummary({ activityId:'cycling', metric:'kilometers', target:25, bonusTarget:40, period:'weekly' }).includes('25 km pr. uge'));
}

{
  const { context } = load();
  const t = context.window.__oneUpTest;
  const cfg = t.normalizeGoalConfig('socialMediaFree', { activityId:'socialMediaFree', target:60, bonusTarget:30, period:'daily' });
  assert.equal(cfg.comparisonMode, 'lessIsBetter');
  assert.equal(t.scoreLessIsBetter(60,60,30), 100);
  assert.equal(t.scoreLessIsBetter(30,60,null), 100);
  assert.equal(t.scoreLessIsBetter(90,60,30), 50);
}

{
  const { context } = load();
  const t = context.window.__oneUpTest;
  assert.ok(t.sanitizeActivityIds(['sleepDuration','wakeTime','sleepGoalNights']).includes('sleepDuration'));
  assert.equal(t.competitionActivityIds().includes('sleepDuration'), true);
  assert.ok(t.goalSummary({ activityId:'sleepDuration', target:7 }).includes('7'));
}

{
  const source = fs.readFileSync('script.js','utf8');
  assert.equal(source.includes('function rerenderActivitySelectionPreservingPosition(step, activityId)'), false);
  assert.ok(source.includes('function activityOptionHtml(id)'));
  assert.ok(source.includes('ids.map(activityOptionHtml).join'));
  assert.ok(source.includes('function updateActivityOption(id,step)'));
  assert.ok(source.includes('currentCard.replaceWith(newCard)'));
  assert.ok(source.includes('function bindActivityOption(card,step)'));
  assert.ok(source.includes('function bindGoalControls(container=document,step=1)'));
  assert.equal(source.includes('rerenderActivitySelectionPreservingPosition(step,id);'), false);
  assert.equal(source.includes("window.scrollTo({top:oldWindowY+delta,behavior:'auto'})"), false);
  assert.equal(source.includes('newModal.scrollTop += delta'), false);
  assert.equal(source.includes('Konkurrencemål er adskilt fra dine personlige hverdagsmål.'), false);
  assert.equal(source.includes('Aktiviteten er konfigureret.'), false);
  assert.equal(source.includes('data-activity-validation-status'), false);
}

{
  const source = fs.readFileSync('script.js','utf8');
  assert.ok(source.includes('class="detail-navigation"'));
  assert.ok(source.includes('data-go-home aria-label="Tilbage til forsiden"'));
  assert.equal(source.includes('Detaljeside</p><h2>${c.name}</h2>'), false);
  assert.ok(source.includes("function goToHomeFromCompetition(){ setCompetitionDetailMode(false); selectedCompetitionId=null; showPage(competitionReturnPage==='today'?'today':'friends');"));
  assert.ok(source.includes("$('#competition-system')"));
  assert.ok(source.includes("$$('[data-go-home]').forEach(b=>b.onclick=goToHomeFromCompetition)"));
}

{
  const { context } = load();
  const t = context.window.__oneUpTest;
  assert.equal(t.formatDuration(30), '30 min.');
  assert.equal(t.formatDuration(60), '1 t.');
  assert.equal(t.formatDuration(90), '1 t. 30 min.');
  assert.equal(t.formatDuration(180), '3 t.');
  assert.equal(t.formatDuration(450), '7 t. 30 min.');
  assert.equal(t.combineDuration(3, 0), 180);
  assert.equal(t.combineDuration(1, 30), 90);
  assert.equal(t.validateDurationInterval(420, 540), true);
  assert.equal(t.validateDurationInterval(540, 420), false);
}


{
  const { context } = load();
  const t = context.window.__oneUpTest;
  assert.equal(t.durationStepValue(120, 'hours', 1), 180);
  assert.equal(t.durationStepValue(180, 'hours', -1), 120);
  assert.equal(t.durationStepValue(20, 'minutes', 1), 25);
  assert.equal(t.durationStepValue(20, 'minutes', -1), 15);
  assert.equal(t.durationStepValue(175, 'minutes', 1), 180);
  assert.equal(t.durationStepValue(180, 'minutes', -1), 175);
  assert.equal(t.durationStepValue(0, 'minutes', -1), 0);
  assert.equal(t.durationStepValue(120, 'minutes', -1), 115);
  assert.equal(t.durationStepValue(55, 'minutes', 1), 60);
  assert.equal(t.formatDuration(200), '3 t. 20 min.');
}

{
  const source = fs.readFileSync('script.js','utf8');
  assert.ok(source.includes('data-duration-step="hours:1"'));
  assert.ok(source.includes('data-duration-step="minutes:1"'));
  assert.ok(source.includes('data-duration-quick'));
  assert.ok(source.includes('onSave(current)'));
  assert.ok(source.includes('toast-action'));
  assert.ok(source.includes('pointerup'));
  assert.ok(source.includes('Number(delta)||0'));
  assert.ok(source.includes('document.body.style.overflow=previousOverflow'));
  assert.ok(source.includes('validateDurationInterval'));
}


{
  const { context } = load();
  const t = context.window.__oneUpTest;
  const e1 = t.addBodyMeasurement('bodyFat', '18.5', '2026-07-13');
  assert.equal(e1.unit, '%');
  assert.equal(e1.week, 29);
  assert.equal(t.state.log.length, 1);
  const e2 = t.addBodyMeasurement('bodyFat', '18.1', '2026-07-15');
  assert.equal(e2.id, e1.id);
  assert.equal(t.state.log.length, 1);
  assert.equal(t.state.log[0].value, 18.1);
  assert.equal(t.addBodyMeasurement('bodyFat', 71, '2026-07-15'), false);
}

{
  const { context } = load();
  const t = context.window.__oneUpTest;
  t.addBodyMeasurement('muscleMass', '34.8', '2026-07-13');
  t.addBodyMeasurement('muscleMass', '35.2', '2026-07-20');
  assert.equal(t.state.log.length, 2);
  assert.equal(t.measurementStatus('muscleMass','2026-07-20').change.toFixed(1), '0.4');
  assert.equal(t.addBodyMeasurement('muscleMass', 4.9, '2026-07-20'), false);
}

{
  const { context } = load();
  const t = context.window.__oneUpTest;
  assert.equal(t.copenhagenDateKey(new Date('2026-03-29T21:59:00Z')), '2026-03-29');
  assert.equal(t.copenhagenDateKey(new Date('2026-03-29T22:01:00Z')), '2026-03-30');
  assert.notEqual(t.measurementWeekKey('bodyFat','2026-07-19'), t.measurementWeekKey('bodyFat','2026-07-20'));
}

{
  const { context } = load();
  const t = context.window.__oneUpTest;
  for(let i=0;i<7;i++) t.state.log.push({id:`s${i}`,date:t.day(i,'2026-07-01'),activity:'dailyStepTarget',value:10000});
  for(let i=0;i<30;i++) t.state.log.push({id:`s15${i}`,date:t.day(i,'2026-06-01'),activity:'dailyStepTarget',value:15000});
  t.recalc();
  assert.equal(t.trophyProgress(t.trophyDefinitions.find(x=>x.id==='steps-10k-7')).met, true);
  assert.equal(t.trophyProgress(t.trophyDefinitions.find(x=>x.id==='steps-15k-30')).met, true);
}

{
  const { context } = load();
  const t = context.window.__oneUpTest;
  for(let i=0;i<7;i++) t.state.log.push({id:`old${i}`,date:t.day(i,'2026-06-01'),activity:'sleepScore',value:70});
  for(let i=0;i<7;i++) t.state.log.push({id:`new${i}`,date:t.day(i,'2026-06-10'),activity:'sleepScore',value:80});
  t.recalc();
  const p=t.trophyProgress(t.trophyDefinitions.find(x=>x.id==='sleep-above-avg-7'));
  assert.equal(p.met, true);
  assert.equal(Math.round(p.meta.reference), 70);
}


{
  const { context } = load();
  const t = context.window.__oneUpTest;
  const range = t.healthConnectLocalDayRange(new Date('2026-01-15T23:30:00Z'), 'Europe/Copenhagen');
  assert.equal(range.startLocal, '2026-01-16T00:00:00');
  assert.equal(range.timeZone, 'Europe/Copenhagen');
}

{
  const { context } = load();
  const t = context.window.__oneUpTest;
  Object.keys(t.state.activitySettings).forEach(id => { t.state.activitySettings[id].enabled = false; });
  t.state.activitySettings.running.enabled = true;
  t.state.activitySettings.caloriesBurned.enabled = true;
  assert.equal(t.healthConnectTypesForEnabledActivities().sort().join(','), 'activeCalories,distance');
}

{
  const { context } = load();
  const t = context.window.__oneUpTest;
  t.state.healthConnect.permissions.distance = false;
  assert.equal(t.healthConnectStatusForActivity('running').status, 'Health Connect ikke forbundet');
  t.state.healthConnect.permissions.distance = true;
  t.state.healthConnect.connected = true;
  t.state.healthConnect.values.distance = 0;
  assert.equal(t.healthConnectStatusForActivity('running').status, 'Ingen data registreret i dag');
}

{
  const { context } = load();
  const t = context.window.__oneUpTest;
  const lvl = t.levelForXp(140);
  assert.equal(lvl.level, 2);
  assert.equal(lvl.totalXp, 140);
  assert.equal(lvl.remaining > 0, true);
}

{
  const { context } = load();
  const t = context.window.__oneUpTest;
  Object.keys(t.state.activitySettings).forEach(id => { t.state.activitySettings[id].enabled = false; });
  t.state.activitySettings.dailyStepTarget.enabled = true;
  t.state.healthConnect = { permissions:{ steps:true }, values:{ steps:8000 }, availability:{ steps:{dataAvailable:true} } };
  t.state.personalGoals.steps = { enabled:true, front:true, target:8000, direction:'minimum' };
  t.state.log.push({ id:'s1', date:'2026-07-13', activity:'dailyStepTarget', value:8000 });
  t.recalc();
  const xpAfterFirst = t.state.retention.xp.total;
  t.recalc();
  assert.equal(t.state.retention.xp.total, xpAfterFirst);
  assert.equal(t.state.retention.streak.current, 1);
}

{
  const retention = { version: 1, xp: { total: 420, grants: { 'old-entry': { amount: 40, at: '2026-07-13T09:00:00.000Z' } } }, goals: {}, streak: { current: 9, best: 9, lastChecked: '2026-07-12', rescues: {}, message: 'bevaret' }, weekly: { '2026-W28': { activeDays: { '2026-07-12': true }, goals: 1, unlocked: true } }, missions: { '2026-07-13': { id: 'm1', completedAt: '2026-07-13T09:00:00.000Z' } }, opened: {} };
  const analytics = [{ type: 'retention-check', at: '2026-07-13T12:00:00.000Z' }];
  const healthConnect = { connected: true, status: 'Forbundet', lastSyncedAt: '2026-07-13T10:00:00.000Z', values: { steps: 1234 }, permissions: { steps: true } };
  const storage = new Map([
    ['oneupRetentionV1', JSON.stringify(retention)],
    ['oneupAnalyticsEventsV1', JSON.stringify(analytics)],
    ['oneupHealthConnectV1', JSON.stringify(healthConnect)],
    ['oneupPersonalGoalsV1', JSON.stringify({ steps: { enabled: true, target: 9000, direction: 'minimum', front: true } })],
    ['oneupCompetitionsV1', JSON.stringify([{ id: 'legacy-comp', type: 'versus', name: 'Legacy', activities: ['dailyStepTarget'], participants: [], leaders: ['you'], status: 'active' }])]
  ]);
  const { context } = load(storage);
  const state = context.window.__oneUpTest.state;
  assert.equal(state.retention.xp.total, 420);
  assert.equal(state.retention.xp.grants['old-entry'].amount, 40);
  assert.equal(state.retention.streak.current >= 9, true);
  assert.ok(storage.get('oneupAnalyticsEventsV1').includes('retention-check'));
  assert.equal(state.healthConnect.lastSyncedAt, '2026-07-13T10:00:00.000Z');
  assert.equal(state.healthConnect.values.steps, 1234);
  assert.equal(state.personalGoals.steps.target, 9000);
  assert.equal(state.competitions[0].id, 'legacy-comp');
}

{
  const storage = new Map([
    ['oneupActivityLogV2', '{not valid json'],
    ['oneupRetentionV1', '{not valid json'],
    ['oneupHealthConnectV1', '{not valid json']
  ]);
  const { context } = load(storage);
  const state = context.window.__oneUpTest.state;
  assert.ok(Array.isArray(state.log));
  assert.ok(state.retention);
  assert.ok(state.healthConnect);
}

{
  const { context } = load();
  const t = context.window.__oneUpTest;
  assert.equal(t.appCategory('com.instagram.android'), 'Social');
  assert.equal(t.appCategory('com.netflix.mediaclient'), 'Streaming');
  assert.equal(t.appCategory('com.android.systemui'), 'System / ignoreret');
  t.state.screenTimeCategories.overrides['com.google.android.youtube'] = 'Social';
  assert.equal(t.appCategory('com.google.android.youtube'), 'Social');
}

{
  const { context } = load();
  const t = context.window.__oneUpTest;
  t.storeScreenTimeResult({ granted:true, startTimeMs: Date.parse('2026-07-13T00:00:00+02:00'), endTimeMs: Date.parse('2026-07-13T12:00:00+02:00'), apps:[
    { packageName:'com.instagram.android', appLabel:'Instagram', foregroundTimeMs: 45*60000 },
    { packageName:'com.netflix.mediaclient', appLabel:'Netflix', foregroundTimeMs: 90*60000 },
    { packageName:'com.android.systemui', appLabel:'System UI', foregroundTimeMs: 999*60000 },
    { packageName:'dk.oneup.app', appLabel:'OneUp', foregroundTimeMs: 30*60000 },
    { packageName:'com.todoist', appLabel:'Todoist', foregroundTimeMs: 30*1000 }
  ]});
  assert.equal(t.screenTimeTotal('social','2026-07-13'), 45);
  assert.equal(t.screenTimeTotal('streaming','2026-07-13'), 90);
  assert.equal(t.screenTimeTotal('total','2026-07-13'), 135);
  assert.equal(t.personalMetricValue('socialMediaTime','2026-07-13').value, 45);
  assert.equal(t.personalMetricValue('streamingTime','2026-07-13').value, 90);
}

{
  const { context } = load(new Map([['oneupScreenTimeV1','not-json']]));
  const t = context.window.__oneUpTest;
  assert.equal(Object.keys(t.state.screenTime.days).length, 0);
  assert.equal(t.screenTimeTotal('total','2026-07-13'), 0);
}

{
  const { context } = load();
  const t = context.window.__oneUpTest;
  t.storeScreenTimeResult({ granted:true, startTimeMs: Date.parse('2026-07-13T00:00:00+02:00'), endTimeMs: Date.parse('2026-07-13T23:00:00+02:00'), apps:[{ packageName:'com.instagram.android', foregroundTimeMs: 150*60000 }]});
  t.state.personalGoals.socialMediaTime = { enabled:true, target:45, direction:'maximum' };
  const status = t.personalGoalStatus('socialMediaTime', t.personalMetricValue('socialMediaTime','2026-07-13'), t.state.personalGoals.socialMediaTime);
  assert.equal(status.reached, false);
  assert.ok(status.label.includes('over dit valgte mål'));
  const c = t.createCompetition({ type:'versus', name:'Lavest social', activities:['socialMediaFree'], startDate:'2026-07-13', endDate:'2026-07-13', participants:[{id:'bo',name:'Bo',demo:true}] });
  assert.equal(t.goalSummary(c.activityGoals.socialMediaFree).includes('Jo mindre jo bedre'), true);
}


{
  const { context, map } = load();
  const t = context.window.__oneUpTest;
  Object.keys(t.state.activitySettings).forEach(id => { t.state.activitySettings[id].enabled = false; });
  assert.equal(t.activityCanToggle('breathing'), false);
  t.setPersonalMetricEnabled('breathingActivities', true);
  assert.equal(t.state.activitySettings.breathing.enabled, false);
  t.renderToday();
  assert.ok(!map['#personal-goal-list'].innerHTML.includes('Åndedrætsøvelser'));
  t.setPersonalMetricEnabled('breathingActivities', false);
  assert.equal(t.state.activitySettings.breathing.enabled, false)
  assert.equal(t.state.log.length, 0); // history is not deleted by disabling
}

{
  const { context, map } = load();
  const t = context.window.__oneUpTest;
  t.state.log.push({ id:'b', date:'2026-07-13', activity:'breathing', value:1 });
  t.setPersonalMetricEnabled('breathingActivities', true);
  t.renderToday();
  assert.ok(!map['#personal-goal-list'].innerHTML.includes('Åndedrætsøvelser'));
  t.setPersonalMetricEnabled('breathingActivities', false);
  t.renderToday();
  assert.ok(!map['#personal-goal-list'].innerHTML.includes('Åndedrætsøvelser'));
  assert.equal(t.state.log.length, 1); // historical data is preserved
}

{
  const { context, map } = load();
  const t = context.window.__oneUpTest;
  assert.equal(t.activityCanToggle('totalScreenTime'), false);
  t.state.activitySettings.totalScreenTime.enabled = true;
  t.renderActivities();
  assert.equal(t.state.activitySettings.totalScreenTime.enabled, true);
  assert.ok(map['#activity-manager'].innerHTML.includes('Kommer senere'));
  assert.ok(map['#activity-manager'].innerHTML.includes('aria-disabled="true"'));
  t.renderToday();
  assert.ok(!map['#personal-goal-list'].innerHTML.includes('Samlet skærmtid'));
}

{
  const { context, map } = load();
  const t = context.window.__oneUpTest;
  Object.keys(t.state.activitySettings).forEach(id => { t.state.activitySettings[id].enabled = false; });
  t.state.activitySettings.dailyStepTarget.enabled = true;
  t.state.healthConnect = { connected:false, permissions:{ steps:false }, values:{}, steps:null };
  t.renderToday();
  assert.ok(map['#personal-goal-list'].innerHTML.includes('Health Connect ikke forbundet') || t.healthConnectStatusForActivity('dailyStepTarget').status === 'Health Connect ikke forbundet');
}

{
  const { context, map } = load(new Map([
    ['oneupActivitySettingsV2', JSON.stringify({ breathing:{ enabled:true }, totalScreenTime:{ enabled:true } })],
    ['oneupPersonalGoalsV1', JSON.stringify({ breathingActivities:{ enabled:true, front:true }, totalScreenTime:{ enabled:true, front:true } })]
  ]));
  const t = context.window.__oneUpTest;
  assert.equal(t.state.activitySettings.breathing.enabled, false);
  assert.equal(t.state.activitySettings.totalScreenTime.enabled, false);
  assert.equal(t.state.personalGoals.totalScreenTime.enabled, false);
  t.renderToday();
  assert.ok(!map['#personal-goal-list'].innerHTML.includes('Samlet skærmtid'));
}

{
  const { context } = load(new Map([
    ['oneupActivitySettingsV2', '[]'],
    ['oneupPersonalGoalsV1', '[]']
  ]));
  const t = context.window.__oneUpTest;
  assert.equal(typeof t.state.activitySettings.breathing, 'object');
  assert.equal(t.state.personalGoals && typeof t.state.personalGoals, 'object');
}

{
  const { context } = load();
  const t = context.window.__oneUpTest;
  t.state.healthConnect = { permissions:{ steps:true }, values:{ steps:9000 }, availability:{ steps:{dataAvailable:true} } };
  t.state.activitySettings.dailyStepTarget.enabled = true;
  assert.equal(t.isActivityEligibleForHome('dailyStepTarget'), true);
}

{
  const { context } = load();
  const t = context.window.__oneUpTest;
  t.state.healthConnect = { permissions:{ steps:false }, values:{ steps:9000 }, availability:{ steps:{dataAvailable:true} } };
  t.state.activitySettings.dailyStepTarget.enabled = true;
  assert.equal(t.isActivityEligibleForHome('dailyStepTarget'), false);
  assert.equal(t.activityAvailabilityStatus('dailyStepTarget').connectionStatus, 'permissionRequired');
}

{
  const { context } = load();
  const t = context.window.__oneUpTest;
  t.state.healthConnect = { connected:true, permissions:{ steps:true }, values:{}, availability:{ steps:{dataAvailable:false} } };
  t.state.activitySettings.dailyStepTarget.enabled = true;
  assert.equal(t.isActivityEligibleForHome('dailyStepTarget'), true);
  assert.equal(t.activityAvailabilityStatus('dailyStepTarget').label, 'Ingen data registreret i dag');
}

{
  const { context } = load();
  const t = context.window.__oneUpTest;
  t.state.healthConnect = { permissions:{ steps:true }, values:{ steps:8000 }, availability:{ steps:{dataAvailable:true} } };
  t.state.activitySettings.dailyStepTarget.enabled = false;
  assert.equal(t.isActivityEligibleForHome('dailyStepTarget'), false);
}

{
  const { context } = load();
  const t = context.window.__oneUpTest;
  t.state.activitySettings.sleepScore.enabled = true;
  assert.equal(t.isActivityEligibleForHome('sleepScore'), false);
  assert.equal(t.activityAvailabilityStatus('sleepScore').implementationStatus, 'comingSoon');
}

{
  const { context } = load();
  const t = context.window.__oneUpTest;
  t.state.healthConnect = { permissions:{ steps:true }, values:{ steps:8000 }, availability:{ steps:{dataAvailable:true} } };
  t.state.activitySettings.dailyStepTarget.enabled = true;
  assert.equal(t.isActivityEligibleForHome('dailyStepTarget'), true);
  t.state.healthConnect.availability.steps = { dataAvailable:false, lost:true };
  t.state.healthConnect.values.steps = 0;
  assert.equal(t.isActivityEligibleForHome('dailyStepTarget'), false);
  assert.equal(t.activityAvailabilityStatus('dailyStepTarget').label, 'Datakilden er ikke længere tilgængelig');
}

{
  const { context } = load();
  const t = context.window.__oneUpTest;
  t.state.healthConnect = { permissions:{ steps:true }, values:{ steps:0 }, availability:{ steps:{dataAvailable:false} } };
  t.state.activitySettings.dailyStepTarget.enabled = true;
  assert.equal(t.isActivityEligibleForHome('dailyStepTarget'), true);
  t.state.healthConnect.values.steps = 7000;
  t.state.healthConnect.availability.steps = { dataAvailable:true };
  assert.equal(t.isActivityEligibleForHome('dailyStepTarget'), true);
}

{
  const { context } = load();
  const t = context.window.__oneUpTest;
  t.state.healthConnect = { permissions:{ sleepDuration:true }, values:{ sleepDuration:8 }, availability:{ sleepDuration:{dataAvailable:true} } };
  t.state.activitySettings.sleepDuration.enabled = true;
  t.state.activitySettings.sleepScore.enabled = true;
  assert.equal(t.isActivityEligibleForHome('sleepDuration'), true);
  assert.equal(t.isActivityEligibleForHome('sleepScore'), false);
}

{
  const { context } = load();
  const t = context.window.__oneUpTest;
  assert.equal(t.stairsUpFromFloors(7.5, 16), 120);
  assert.equal(Number.isInteger(t.stairsUpFromFloors(7.5, 16)), true);
  assert.equal(t.stairsUpFromFloors(7.5, 20), 150);
  assert.equal(t.stairsUpFromFloors(null, 16), null);
}

{
  const { context } = load();
  const t = context.window.__oneUpTest;
  t.state.healthConnect = { permissions:{ floorsClimbed:true }, values:{ floorsClimbed:0 }, availability:{ floorsClimbed:{dataAvailable:false} } };
  t.state.activitySettings.stairsUp.enabled = true;
  assert.equal(t.isActivityEligibleForHome('stairsUp'), true);
  assert.equal(t.activityAvailabilityStatus('stairsDown').implementationStatus, 'comingSoon');
  assert.equal(t.activityAvailabilityStatus('stairsTotal').implementationStatus, 'comingSoon');
}

{
  const { context } = load();
  const t = context.window.__oneUpTest;
  t.state.log.push({ id:'old', date:'2026-07-13', activity:'dailyStepTarget', value:10000 });
  t.state.healthConnect = { permissions:{ steps:true }, values:{}, availability:{ steps:{dataAvailable:false} } };
  t.state.activitySettings.dailyStepTarget.enabled = true;
  t.recalc();
  assert.equal(t.state.history['2026-07-13'].steps, 10000);
}

{
  const { context } = load(new Map([['oneupHealthConnectV1', '{broken']]));
  const t = context.window.__oneUpTest;
  assert.equal(t.activityAvailabilityStatus('dailyStepTarget').connectionStatus, 'notConnected');
}


{
  const { context } = load();
  const t = context.window.__oneUpTest;
  let parsed = t.parseOneUpInviteUrl('https://nickzen108.github.io/OneUp/join/competition/AbC123');
  assert.equal(parsed.type, 'competition'); assert.equal(parsed.inviteToken, 'AbC123');
  parsed = t.parseOneUpInviteUrl('https://nickzen108.github.io/OneUp/?join=collaboration&invite=XyZ987');
  assert.equal(parsed.type, 'collaboration'); assert.equal(parsed.inviteToken, 'XyZ987');
  parsed = t.parseOneUpInviteUrl('oneup://join/competition/TOKEN-42');
  assert.equal(parsed.type, 'competition'); assert.equal(parsed.inviteToken, 'TOKEN-42');
  assert.equal(t.parseOneUpInviteUrl('https://nickzen108.github.io/OneUp/?join=bad&invite=1'), null);
}

{
  const { context } = load();
  const t = context.window.__oneUpTest;
  const c = t.createCompetition({ type:'versus', name:'Sommer “Sprint” & styrke', activities:['dailyStepTarget'], startDate:'2026-07-18', endDate:'2026-07-25', participants:[] });
  const vm = t.invitationViewModel(c);
  assert.equal(vm.type, 'competition');
  assert.equal(vm.title, 'Sommer “Sprint” & styrke');
  assert.ok(t.inviteUrlFor(c).includes('?join=competition&invite='));
  assert.ok(vm.inviteCode.includes('-'));
}

{
  const { context } = load();
  const t = context.window.__oneUpTest;
  const c = t.createCompetition({ type:'coop', name:'Fælles mål', activities:['breathing'], startDate:'2026-07-18', endDate:'2026-07-25', participants:[] });
  assert.equal(t.invitationViewModel(c).type, 'collaboration');
  assert.ok(t.inviteUrlFor(c).includes('?join=collaboration&invite='));
}

{
  const { context } = load();
  const t = context.window.__oneUpTest;
  const c = t.createCompetition({ type:'versus', name:'Dublet', activities:['dailyStepTarget'], participants:[] });
  c.creator = 'owner'; c.participants = [];
  const token = c.invite.token;
  const first = t.InviteRepository.joinInvite('competition', token);
  const second = t.InviteRepository.joinInvite('competition', token);
  assert.equal(first.ok, true);
  assert.equal(second.already, true);
  assert.equal(c.participants.filter(p => p.id === 'you').length, 1);
}

{
  const { context } = load();
  const t = context.window.__oneUpTest;
  const c = t.createCompetition({ type:'versus', name:'Forny', activities:['dailyStepTarget'], participants:[] });
  const old = c.invite.token;
  t.InviteRepository.regenerateInvite(c);
  assert.notEqual(c.invite.token, old);
  assert.ok(c.invite.revokedTokens.includes(old));
}

{
  const { context, map } = load();
  const t = context.window.__oneUpTest;
  Object.keys(t.state.activitySettings).forEach(id => { t.state.activitySettings[id].enabled = false; });
  Object.keys(t.state.personalGoals).forEach(id => { t.state.personalGoals[id].enabled = false; t.state.personalGoals[id].front = false; });
  t.state.activitySettings.dailyStepTarget.enabled = true;
  t.state.personalGoals.steps = { enabled:true, front:true, target:8000, direction:'minimum' };
  t.state.healthConnect = { connected:false, permissions:{ steps:false }, values:{}, availability:{} };
  t.renderToday();
  assert.equal(t.heroScore('daily','2026-07-13').total, 0);
  assert.equal(map['#personal-goal-list'].innerHTML.includes('Skridt'), false);
  assert.ok(map['#personal-goal-list'].innerHTML.includes('Dine valgte aktiviteter kan endnu ikke måles.'));
  assert.ok(map['#personal-goal-list'].innerHTML.includes('Kontrollér forbindelser'));
}

{
  const { context, map } = load();
  const t = context.window.__oneUpTest;
  Object.keys(t.state.activitySettings).forEach(id => { t.state.activitySettings[id].enabled = false; });
  t.state.activitySettings.dailyStepTarget.enabled = true;
  t.state.personalGoals.steps = { enabled:true, front:true, target:8000, direction:'minimum' };
  t.state.healthConnect = { connected:true, permissions:{ steps:true }, values:{ steps:3200 }, availability:{ steps:{dataAvailable:true} } };
  t.renderToday();
  assert.equal(t.heroScore('daily','2026-07-13').total, 1);
  assert.ok(map['#personal-goal-list'].innerHTML.includes('Skridt'));
}

{
  const { context, map } = load();
  const t = context.window.__oneUpTest;
  Object.keys(t.state.activitySettings).forEach(id => { t.state.activitySettings[id].enabled = false; });
  t.state.activitySettings.dailyStepTarget.enabled = true;
  t.state.personalGoals.steps = { enabled:true, front:true, target:8000, direction:'minimum' };
  t.state.healthConnect = { connected:true, permissions:{ steps:false }, values:{ steps:3200 }, availability:{ steps:{dataAvailable:true} } };
  t.renderToday();
  assert.equal(t.heroScore('daily','2026-07-13').total, 0);
  assert.equal(map['#personal-goal-list'].innerHTML.includes('Skridt'), false);
  assert.equal(t.activityAvailabilityStatus('dailyStepTarget').label, 'Tillad adgang til skridt for at vise aktiviteten på forsiden.');
}

{
  const { context, map } = load();
  const t = context.window.__oneUpTest;
  Object.keys(t.state.activitySettings).forEach(id => { t.state.activitySettings[id].enabled = false; });
  t.state.activitySettings.dailyStepTarget.enabled = true;
  t.state.personalGoals.steps = { enabled:true, front:true, target:8000, direction:'minimum' };
  t.state.healthConnect = { connected:true, permissions:{ steps:true }, values:{ steps:0 }, availability:{ steps:{dataAvailable:false} } };
  t.renderToday();
  assert.ok(map['#personal-goal-list'].innerHTML.includes('Skridt'));
  assert.ok(map['#personal-goal-list'].innerHTML.includes('0'));
  assert.equal(t.heroScore('daily','2026-07-13').total, 1);
}

{
  const { context, map } = load();
  const t = context.window.__oneUpTest;
  Object.keys(t.state.activitySettings).forEach(id => { t.state.activitySettings[id].enabled = false; });
  t.state.activitySettings.breathing.enabled = true;
  t.state.personalGoals.breathingActivities = { enabled:true, front:true, target:1, direction:'minimum' };
  t.state.healthConnect = { connected:false, permissions:{}, values:{}, availability:{} };
  t.renderToday();
  assert.ok(!map['#personal-goal-list'].innerHTML.includes('Åndedrætsøvelser'));
}

{
  const { context, map } = load();
  const t = context.window.__oneUpTest;
  Object.keys(t.state.activitySettings).forEach(id => { t.state.activitySettings[id].enabled = false; });
  Object.keys(t.state.personalGoals).forEach(id => { t.state.personalGoals[id].enabled = false; t.state.personalGoals[id].front = false; });
  t.renderToday();
  assert.ok(map['#personal-goal-list'].innerHTML.includes('Vælg aktiviteter under'));
}

{
  const { context, map } = load();
  const t = context.window.__oneUpTest;
  Object.keys(t.state.activitySettings).forEach(id => { t.state.activitySettings[id].enabled = false; });
  t.state.activitySettings.dailyStepTarget.enabled = true;
  t.state.personalGoals.steps = { enabled:true, front:true, target:8000, direction:'minimum' };
  t.state.healthConnect = { connected:false, permissions:{ steps:false }, values:{}, availability:{} };
  t.renderToday();
  assert.equal(map['#personal-goal-list'].innerHTML.includes('Skridt'), false);
  t.state.healthConnect = { connected:true, permissions:{ steps:true }, values:{ steps:1000 }, availability:{ steps:{dataAvailable:true} } };
  t.renderToday();
  assert.ok(map['#personal-goal-list'].innerHTML.includes('Skridt'));
  t.state.healthConnect.connected = false;
  t.renderToday();
  assert.equal(map['#personal-goal-list'].innerHTML.includes('Skridt'), false);
  assert.equal(t.heroScore('daily','2026-07-13').total, 0);
}
