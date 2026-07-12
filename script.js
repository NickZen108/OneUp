const POINTS_STORAGE_KEY = 'oneupPoints';
const STEP_PROGRESS_STORAGE_KEY = 'oneupStepProgress';
const DAILY_HISTORY_STORAGE_KEY = 'oneupDailyHistory';
const VILLAGE_STORAGE_KEY = 'oneupVillageResidents';
const MISSION_STORAGE_KEY = 'oneupMissions';
const STEP_BANK_STORAGE_KEY = 'oneupStepBank';
const PROFILE_STORAGE_KEY = 'oneupProfile';
const SETTINGS_STORAGE_KEY = 'oneupSettings';
const HIGH_STEP_WARNING_LIMIT = 60000;
const POINTS_PER_STEP_BLOCK = 1;
const STEPS_PER_POINT_BLOCK = 100;
const BREATHING_POINTS = 5;
const BANK_TTL_DAYS = 7;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll?.(selector) || []);
const byId = (id) => document.getElementById?.(id) || $(`#${id}`);
const setText = (el, value) => { if (el) el.textContent = value; };
const safeNumber = (value) => Math.max(0, Math.floor(Number(value) || 0));

function getTodayKey() {
  const now = typeof window.__oneUpNow === 'function' ? window.__oneUpNow() : new Date();
  return now.toISOString().slice(0, 10);
}
function addDays(dateText, dayCount) { const date = new Date(`${dateText}T12:00:00.000Z`); date.setUTCDate(date.getUTCDate() + dayCount); return date.toISOString().slice(0, 10); }
function daysBetween(from, to) { return Math.floor((new Date(`${to}T12:00:00.000Z`) - new Date(`${from}T12:00:00.000Z`)) / 86400000); }
function readJson(key, fallback) { try { const saved = JSON.parse(localStorage.getItem(key)); return saved ?? fallback; } catch { return fallback; } }
function saveJson(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
function readSavedPoints() { return safeNumber(localStorage.getItem(POINTS_STORAGE_KEY)); }
function savePoints() { localStorage.setItem(POINTS_STORAGE_KEY, String(points)); }

function createEmptyDailyRecord(date) { return { date, steps: 0, stepPoints: 0, boxBreathingCount: 0, breathing478Count: 0, totalPoints: 0, missionBonuses: 0, events: [], donations: { buster: 0, olsen: 0, hansen: 0 } }; }
function normalizeDailyRecord(record, date) {
  const empty = createEmptyDailyRecord(date);
  if (!record || typeof record !== 'object') return empty;
  const steps = safeNumber(record.steps);
  const stepPoints = safeNumber(record.stepPoints ?? record.points);
  const boxBreathingCount = safeNumber(record.boxBreathingCount);
  const breathing478Count = safeNumber(record.breathing478Count);
  const missionBonuses = safeNumber(record.missionBonuses);
  const donations = { ...empty.donations, ...(record.donations || {}) };
  const totalPoints = safeNumber(record.totalPoints || (stepPoints + ((boxBreathingCount + breathing478Count) * BREATHING_POINTS) + missionBonuses));
  return { ...empty, ...record, date, steps, stepPoints, boxBreathingCount, breathing478Count, missionBonuses, totalPoints, donations, events: Array.isArray(record.events) ? record.events : [] };
}
function readDailyHistory() {
  const today = getTodayKey(); let history = {};
  const saved = readJson(DAILY_HISTORY_STORAGE_KEY, {});
  if (saved && typeof saved === 'object' && !Array.isArray(saved)) history = Object.fromEntries(Object.entries(saved).map(([date, record]) => [date, normalizeDailyRecord(record, date)]));
  if (!history[today]) history[today] = createEmptyDailyRecord(today);
  return history;
}
function saveDailyHistory() { saveJson(DAILY_HISTORY_STORAGE_KEY, dailyHistory); }
function getTodayRecord() { const today = getTodayKey(); if (!dailyHistory[today]) dailyHistory[today] = createEmptyDailyRecord(today); return dailyHistory[today]; }
function logEvent(type, text, data = {}) { const r = getTodayRecord(); r.events.push({ type, text, at: new Date().toISOString(), ...data }); saveDailyHistory(); }

function readStepProgress() { const today = getTodayKey(); const fallback = { date: today, steps: 0, points: 0, remainder: 0 }; const saved = readJson(STEP_PROGRESS_STORAGE_KEY, null); if (!saved || saved.date !== today) return fallback; return { date: today, steps: safeNumber(saved.steps), points: safeNumber(saved.points), remainder: safeNumber(saved.remainder) }; }
function saveStepProgress() { saveJson(STEP_PROGRESS_STORAGE_KEY, stepProgress); }
function calculateStepPoints(totalSteps) { return Math.floor(totalSteps / STEPS_PER_POINT_BLOCK) * POINTS_PER_STEP_BLOCK; }
function syncTodayRecordFromStepProgress() { const r = getTodayRecord(); r.steps = stepProgress.steps; r.stepPoints = stepProgress.points; r.totalPoints = r.stepPoints + ((r.boxBreathingCount + r.breathing478Count) * BREATHING_POINTS) + safeNumber(r.missionBonuses); saveDailyHistory(); }

const residentTemplates = {
  buster: { name: 'Buster', fullName: 'Hunden Buster', emoji: '🐶', happyEmoji: '🐕', type: 'steps', goal: 3000, bonus: 15, mood: ['Nysgerrig', 'Gladere', 'Legesyg og aktiv'], story: 'Buster bliver gladere, mere legesyg og mere aktiv, når dine gåture giver liv til landsbyen.', mission: 'Gå en tur med Buster', startLabel: 'Gå en tur med Buster – 3.000 skridt', startMessage: 'De næste skridt bliver en dejlig tur for Buster.', thanks: 'Vuf! Tak for turen!' },
  olsen: { name: 'Fru Olsen', emoji: '👵', happyEmoji: '😊', type: 'steps', goal: 3000, bonus: 25, mood: ['Lidt træt', 'Mere oplagt', 'Energisk og håbefuld'], story: 'Fru Olsen ønsker mere energi og arbejder mod at føle sig lettere. Gåture hjælper hende gradvist uden løfter om et bestemt vægttab.', mission: 'Hjælp Fru Olsen', startLabel: 'Hjælp Fru Olsen – gå 3.000 skridt', startMessage: 'De næste 3.000 skridt hjælper Fru Olsen.', thanks: 'Tak! Den tur gjorde mig godt.' },
  hansen: { name: 'Hr. Hansen', emoji: '👨', happyEmoji: '🙂', type: 'breathing', goal: 5, bonus: 20, mood: ['Stresset og anspændt', 'Roligere', 'Smiler mere og finder ro'], story: 'Åndedrætsøvelser hjælper ham gradvist til mere ro og flere smil.', mission: 'Hjælp Hr. Hansen med at finde ro', startLabel: 'Hjælp Hr. Hansen med at finde ro', startMessage: 'De næste 5 åndedrætsrunder hjælper Hr. Hansen med at finde mere ro.', thanks: 'Tak. Nu kan jeg mærke mere ro.' },
};
const missionMessages = {
  buster: [[500, 'Selv en kort tur gjorde Buster godt.'], [1500, 'Buster nød at komme ud.'], [3000, 'Buster er glad og vil gerne lidt længere.'], [Infinity, 'Buster har fået en dejlig lang tur!']],
  olsen: [[500, 'Du er kommet i gang. Selv en kort tur hjælper.'], [1500, 'Fru Olsen mærker lidt mere energi.'], [3000, 'Fru Olsen er godt på vej og føler sig lettere til mode.'], [Infinity, 'Mission fuldført. Fru Olsen har fået en god lang tur.']],
  hansen: [[2, 'Hr. Hansen tager den første rolige pause.'], [4, 'Hr. Hansen virker mindre anspændt.'], [5, 'Han er næsten helt nede i tempo.'], [Infinity, 'Hr. Hansen smiler og virker mere rolig.']],
};
function freshResident(id, old = {}) { return { id, level: safeNumber(old.level), progress: safeNumber(old.progress), completions: safeNumber(old.completions) }; }
function readVillage() { const saved = readJson(VILLAGE_STORAGE_KEY, {}); return Object.fromEntries(Object.keys(residentTemplates).map((id) => [id, freshResident(id, saved?.[id])])); }
function saveVillage() { saveJson(VILLAGE_STORAGE_KEY, village); }
function getResidentMood(id) { const r = village[id]; const t = residentTemplates[id]; return t.mood[Math.min(t.mood.length - 1, r.level)]; }

function createMission(id, old = {}) { const t = residentTemplates[id]; return { id, status: old.status || 'available', progress: safeNumber(old.progress), completedCount: safeNumber(old.completedCount), allocations: Array.isArray(old.allocations) ? old.allocations : [], bonusAwarded: !!old.bonusAwarded, completedAt: old.completedAt || null, startedMessage: old.startedMessage || '' }; }
function readMissions() { const saved = readJson(MISSION_STORAGE_KEY, {}); return { activeId: saved?.activeId || null, lastCompletedId: saved?.lastCompletedId || null, items: Object.fromEntries(Object.keys(residentTemplates).map((id) => [id, createMission(id, saved?.items?.[id] || saved?.[id])])) }; }
function saveMissions() { saveJson(MISSION_STORAGE_KEY, missions); }
function getActiveMission() { return missions.activeId ? missions.items[missions.activeId] : null; }
function missionProgressText(id) { const t = residentTemplates[id]; const m = missions.items[id]; return `${Math.min(m.progress, t.goal).toLocaleString('da-DK')} / ${t.goal.toLocaleString('da-DK')} ${t.type === 'steps' ? 'skridt' : 'runder'}`; }
function getMissionMessage(id) { const m = missions.items[id]; const progress = m.progress; const t = residentTemplates[id]; if (m.status === 'active' && progress === 0 && m.startedMessage) return m.startedMessage; if (progress >= t.goal) return missionMessages[id].at(-1)[1]; return missionMessages[id].find(([limit]) => progress < limit)?.[1] || missionMessages[id].at(-1)[1]; }
function missionMissingText(id) { const t = residentTemplates[id], m = missions.items[id]; const left = Math.max(0, t.goal - m.progress); return left ? `${left.toLocaleString('da-DK')} ${t.type === 'steps' ? 'skridt' : 'runder'} mangler.` : 'Målet er nået. Tak for hjælpen.'; }
function setMissionStatus(id, status) { if (!missions.items[id]) return; if (status === 'active' && missions.items[id].progress >= residentTemplates[id].goal) { missions.items[id].progress = 0; missions.items[id].allocations = []; missions.items[id].bonusAwarded = false; missions.items[id].completedAt = null; } if (missions.activeId && missions.activeId !== id && status === 'active') missions.items[missions.activeId].status = 'paused'; missions.activeId = status === 'active' ? id : (missions.activeId === id ? null : missions.activeId); missions.items[id].status = status; saveMissions(); updateAllViews(); }
function askMissionChange(currentId, nextId, requestedMode = 'pause') {
  if (requestedMode === 'switch') return Promise.resolve('switch');
  const current = residentTemplates[currentId], next = residentTemplates[nextId];
  return new Promise((resolve) => {
    const dialog = document.createElement('div');
    dialog.className = 'mission-confirm';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.innerHTML = `<div class="mission-confirm-box"><h2>Der er allerede en aktiv mission</h2><p>${current.mission} er aktiv. Hvad vil du gøre med ${next.mission}?</p><div class="button-row"><button type="button" data-choice="keep">Behold nuværende mission</button><button type="button" data-choice="pause">Pause nuværende og start ny</button><button type="button" data-choice="switch">Skift helt til ny</button></div></div>`;
    dialog.addEventListener('click', (event) => {
      const choice = event.target.closest?.('[data-choice]')?.dataset.choice;
      if (!choice) return;
      dialog.remove();
      resolve(choice);
    });
    (document.body || document.documentElement).appendChild(dialog);
  });
}
async function startMission(id, mode = 'pause', options = {}) {
  const current = getActiveMission();
  const t = residentTemplates[id];
  if (!t || !missions.items[id]) return false;
  if (current && current.id !== id) {
    const choice = await askMissionChange(current.id, id, mode);
    if (choice === 'keep') { showCelebration(`Du beholder ${residentTemplates[current.id].mission}.`); return false; }
    current.status = choice === 'switch' ? 'cancelled' : 'paused';
  }
  missions.items[id].startedMessage = t.startMessage;
  setMissionStatus(id, 'active');
  showCelebration(t.startMessage);
  logEvent('mission-start', t.startMessage, { missionId: id });
  if (options.closePanel) closeResidentPanel();
  if (options.goToActivity) showPage('activity');
  if (options.scrollToMission !== false) {
    if (!options.goToActivity) showPage('missions');
    scheduleMissionDetailsScroll(id);
  }
  return true;
}
function pauseMission(id) { if (missions.items[id]?.status === 'active') setMissionStatus(id, 'paused'); }
function resumeMission(id) { startMission(id, 'pause'); }
function cancelMission(id) { if (!missions.items[id]) return; if (missions.activeId === id) missions.activeId = null; missions.items[id].status = 'cancelled'; logEvent('mission-cancelled', 'Missionen er afsluttet. Den indsats, du allerede gjorde, tæller stadig.', { missionId: id }); saveMissions(); showCelebration('Missionen er afsluttet. Den indsats, du allerede gjorde, tæller stadig.'); updateAllViews(); }

function readStepBank() { const saved = readJson(STEP_BANK_STORAGE_KEY, []); return Array.isArray(saved) ? saved.map((e) => ({ date: e.date || getTodayKey(), source: e.source || 'Manuel registrering', steps: safeNumber(e.steps) })).filter((e) => e.steps > 0) : []; }
function pruneStepBank() { const today = getTodayKey(); stepBank = stepBank.filter((e) => e.steps > 0 && daysBetween(e.date, today) < BANK_TTL_DAYS); saveJson(STEP_BANK_STORAGE_KEY, stepBank); }
function bankTotal() { pruneStepBank(); return stepBank.reduce((s, e) => s + e.steps, 0); }
function addToBank(steps, source = 'Overskydende skridt', date = getTodayKey()) { if (steps <= 0) return; stepBank.push({ date, source, steps: safeNumber(steps) }); saveJson(STEP_BANK_STORAGE_KEY, stepBank); logEvent('bank', `${steps} skridt lagt i skridtbanken`, { steps }); }
function removeFromTodayBank(steps) { let remaining = steps; for (let i = stepBank.length - 1; i >= 0 && remaining > 0; i -= 1) { const e = stepBank[i]; if (e.date !== getTodayKey()) continue; const take = Math.min(e.steps, remaining); e.steps -= take; remaining -= take; } stepBank = stepBank.filter((e) => e.steps > 0); saveJson(STEP_BANK_STORAGE_KEY, stepBank); return steps - remaining; }
function withdrawBank(steps) { pruneStepBank(); let remaining = Math.min(safeNumber(steps), bankTotal()); stepBank.sort((a, b) => a.date.localeCompare(b.date)); const taken = remaining; for (const e of stepBank) { const take = Math.min(e.steps, remaining); e.steps -= take; remaining -= take; if (!remaining) break; } stepBank = stepBank.filter((e) => e.steps > 0); saveJson(STEP_BANK_STORAGE_KEY, stepBank); return taken; }
function allocateToMission(id, amount, source) { const m = missions.items[id]; const t = residentTemplates[id]; const room = Math.max(0, t.goal - m.progress); const used = Math.min(safeNumber(amount), room); if (!used) return 0; m.progress += used; m.allocations.push({ date: getTodayKey(), amount: used, source }); getTodayRecord().donations[id] = safeNumber(getTodayRecord().donations[id]) + used; logEvent(t.type === 'steps' ? `mission-${id}-steps` : `mission-${id}-breathing`, `${used} ${t.type === 'steps' ? 'skridt' : 'runder'} til ${t.name}`, { missionId: id, amount: used }); if (m.progress >= t.goal) completeMission(id); saveMissions(); saveDailyHistory(); return used; }
function completeMission(id) { const m = missions.items[id]; const t = residentTemplates[id]; if (m.bonusAwarded) return; m.status = 'completed'; m.completedAt = getTodayKey(); m.completedCount += 1; m.bonusAwarded = true; points += t.bonus; const r = getTodayRecord(); r.missionBonuses += t.bonus; r.totalPoints += t.bonus; village[id].level += 1; village[id].completions += 1; logEvent('mission-bonus', `${t.mission} gennemført: +${t.bonus} point`, { missionId: id, points: t.bonus }); if (missions.activeId === id) missions.activeId = null; missions.lastCompletedId = id; savePoints(); saveVillage(); warmMissionFinish(id); }
function reopenMissionIfNeeded(id) { const m = missions.items[id], t = residentTemplates[id]; if (m.bonusAwarded && m.progress < t.goal) { m.bonusAwarded = false; m.status = 'paused'; m.completedAt = null; points = Math.max(0, points - t.bonus); const r = getTodayRecord(); r.missionBonuses = Math.max(0, r.missionBonuses - t.bonus); r.totalPoints = Math.max(0, r.totalPoints - t.bonus); logEvent('mission-reopened', `${t.name}s mission blev åbnet igen efter en neutral korrektion.`, { missionId: id }); savePoints(); saveDailyHistory(); saveMissions(); } }
function rollbackTodayMissionSteps(steps) { let remaining = steps; const ids = Object.keys(missions.items); for (let i = ids.length - 1; i >= 0 && remaining > 0; i -= 1) { const id = ids[i]; const m = missions.items[id], t = residentTemplates[id]; if (t.type !== 'steps') continue; for (let j = m.allocations.length - 1; j >= 0 && remaining > 0; j -= 1) { const a = m.allocations[j]; if (a.date !== getTodayKey()) continue; const take = Math.min(a.amount, remaining); a.amount -= take; m.progress = Math.max(0, m.progress - take); getTodayRecord().donations[id] = Math.max(0, safeNumber(getTodayRecord().donations[id]) - take); remaining -= take; if (!a.amount) m.allocations.splice(j, 1); reopenMissionIfNeeded(id); } } saveMissions(); saveDailyHistory(); return steps - remaining; }
function distributeNewSteps(delta) { let remaining = safeNumber(delta); const active = getActiveMission(); let used = 0; if (active && residentTemplates[active.id].type === 'steps') { used = allocateToMission(active.id, remaining, 'Dagens nye skridt'); remaining -= used; } if (remaining > 0) addToBank(remaining, active ? 'Overskydende skridt fra aktiv mission' : 'Dagens skridt uden aktiv mission'); if (used && remaining) showCelebration(`${used.toLocaleString('da-DK')} skridt hjalp ${residentTemplates[active.id].name}, og ${remaining.toLocaleString('da-DK')} gik trygt i skridtbanken.`); }

let points = readSavedPoints();
let dailyHistory = readDailyHistory();
let stepProgress = readStepProgress();
let village = readVillage();
let missions = readMissions();
let stepBank = readStepBank();
let profile = readJson(PROFILE_STORAGE_KEY, {});
let settings = readSettings();
let breathingTimerId = null;
let breathingSession = null;

const elements = {
  points: $('#points'), world: $('#world'), worldMessage: $('#world-message'), personFace: $('#person-face'), animalFace: $('#animal-face'), reset: $('#reset-points'), stepInput: $('#step-count'), stepUpdate: $('#update-steps'), stepsToday: $('#steps-today'), stepPointsToday: $('#step-points-today'), stepsToNextPoint: $('#steps-to-next-point'), breathingPhase: $('#breathing-phase'), breathingSeconds: $('#breathing-seconds'), breathingStart: $('#start-breathing'), breathingStop: $('#stop-breathing'), breathingExerciseName: $('#breathing-exercise-name'), breathingRounds: $('#breathing-rounds-session'), breathingPoints: $('#breathing-points-session'), developmentStepsToday: $('#development-steps-today'), developmentBreathingToday: $('#development-breathing-today'), developmentPointsToday: $('#development-points-today'), developmentTotalPoints: $('#development-total-points'), currentStreak: $('#current-streak'), longestStreak: $('#longest-streak'), historyList: $('#history-list'), residentPanel: $('#resident-panel'), celebration: $('#village-celebration'), activeMissionActivity: $('#active-mission-activity'), missionList: $('#mission-list'), bankTotal: $('#bank-total'), bankEntries: $('#bank-entries'), completedMissions: $('#completed-missions'), donatedStats: $('#donated-stats')
};
const breathingChoiceInputs = $$('input[name="breathing-exercise"]');
const worldLevels = [
  { minimumPoints: 0, beauty: 0.12, rainbow: 0, message: 'Niveau 1: Spire. Verdenen er stille, men håbet spirer stille frem.', className: 'level-1', personFace: '🙂', animalFace: '🐶' },
  { minimumPoints: 10, beauty: 0.32, rainbow: 0.1, message: 'Niveau 2: Ro. Mere grønt, blomster og et fredeligt hvilested vokser frem.', className: 'level-2', personFace: '😊', animalFace: '🐶' },
  { minimumPoints: 30, beauty: 0.58, rainbow: 0.25, message: 'Niveau 3: Glæde. Farverne bliver klarere, og verdenen fyldes med leg og liv.', className: 'level-3', personFace: '😄', animalFace: '🐕' },
  { minimumPoints: 50, beauty: 0.82, rainbow: 0.55, message: 'Niveau 4: Omsorg. Venlighed, trygge dyr og små hjerter binder verdenen sammen.', className: 'level-4', personFace: '🥰', animalFace: '🐕‍🦺' },
  { minimumPoints: 80, beauty: 1, rainbow: 0.95, message: 'Niveau 5: Harmoni. Fællesskab, natur og varmt lys skaber en fredelig balance.', className: 'level-5', personFace: '😍', animalFace: '🐕‍🦺' },
];

function readSettings() { const saved = readJson(SETTINGS_STORAGE_KEY, {}); return { vibration: saved.vibration !== false, sound: saved.sound !== false, voices: saved.voices === true }; }
function saveSettings() { saveJson(SETTINGS_STORAGE_KEY, settings); }
function playSoftSound(id) { if (!settings.sound) return; try { const AudioContext = window.AudioContext || window.webkitAudioContext; if (!AudioContext) return; const ctx = new AudioContext(); const oscillator = ctx.createOscillator(); const gain = ctx.createGain(); oscillator.type = id === 'buster' ? 'triangle' : 'sine'; oscillator.frequency.value = id === 'buster' ? 520 : 440; gain.gain.setValueAtTime(0.0001, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.06, ctx.currentTime + 0.04); gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.45); oscillator.connect(gain).connect(ctx.destination); oscillator.start(); oscillator.stop(ctx.currentTime + 0.5); } catch {}
}
function speakResident(id) { const text = residentTemplates[id]?.thanks; if (!settings.voices || !text || !window.speechSynthesis) return; try { window.speechSynthesis.cancel?.(); window.speechSynthesis.speak(new SpeechSynthesisUtterance(text)); } catch {}
}
function warmMissionFinish(id) { const t = residentTemplates[id]; const nav = window.navigator || (typeof navigator !== 'undefined' ? navigator : null); if (settings.vibration && nav?.vibrate) { try { nav.vibrate([80, 40, 80]); } catch {} } playSoftSound(id); speakResident(id); showCelebration(`${t.happyEmoji || t.emoji} ${t.thanks} ${getMissionMessage(id)} +${t.bonus} point.`); updateAllViews(); }

const breathingExercises = { box: { label: 'Box breathing', phases: [{ name: 'Træk vejret ind', seconds: 4 }, { name: 'Hold vejret', seconds: 4 }, { name: 'Pust ud', seconds: 4 }, { name: 'Hold vejret', seconds: 4 }] }, '478': { label: '4-7-8 breathing', phases: [{ name: 'Træk vejret ind', seconds: 4 }, { name: 'Hold vejret', seconds: 7 }, { name: 'Pust ud', seconds: 8 }] } };
function showCelebration(message) { if (!elements.celebration) return; elements.celebration.textContent = message; elements.celebration.classList?.add('show'); window.setTimeout?.(() => elements.celebration.classList.remove('show'), 3200); }
function getCurrentLevel() { return worldLevels.filter((level) => points >= level.minimumPoints).at(-1); }
function updateWorld() { const level = getCurrentLevel(); setText(elements.points, points); if (elements.world) { const stableClasses = new Set(String(elements.world.className || '').split(/\s+/).filter((className) => className && !/^level-/.test(className))); stableClasses.add('world'); stableClasses.add('village'); stableClasses.add(level.className); elements.world.className = Array.from(stableClasses).join(' '); elements.world.style?.setProperty('--beauty', level.beauty); } document.documentElement?.style?.setProperty('--rainbow-strength', level.rainbow); setText(elements.worldMessage, level.message); setText(elements.personFace, level.personFace); setText(elements.animalFace, level.animalFace); updateVillageView(); }
function updateVillageView() { Object.keys(residentTemplates).forEach((id) => { const el = $(`[data-resident="${id}"]`); if (!el) return; el.classList?.toggle('resident-happy', village[id].level > 0); }); if (elements.world?.dataset) elements.world.dataset.villageLevel = String(Math.min(5, Math.floor(points / 25) + Object.values(village).reduce((sum, r) => sum + r.level, 0))); }
function updateStepView() { if (elements.stepInput) elements.stepInput.value = stepProgress.steps; setText(elements.stepsToday, stepProgress.steps); setText(elements.stepPointsToday, stepProgress.points); setText(elements.stepsToNextPoint, stepProgress.remainder === 0 ? STEPS_PER_POINT_BLOCK : STEPS_PER_POINT_BLOCK - stepProgress.remainder); }
function getBreathingCount(record) { return record.boxBreathingCount + record.breathing478Count; }
function isActiveDay(record) { return record.steps >= 1000 || getBreathingCount(record) > 0; }
function formatStreak(dayCount) { return `${dayCount} ${dayCount === 1 ? 'dag' : 'dage'}`; }
function calculateStreaks() { const dates = Object.keys(dailyHistory).sort(); let longest = 0, run = 0, previousDate = null; dates.forEach((date) => { if (!isActiveDay(dailyHistory[date])) { run = 0; previousDate = date; return; } run = previousDate && addDays(previousDate, 1) === date ? run + 1 : 1; longest = Math.max(longest, run); previousDate = date; }); let current = 0, date = getTodayKey(); while (dailyHistory[date] && isActiveDay(dailyHistory[date])) { current += 1; date = addDays(date, -1); } return { current, longest }; }
function updateDevelopmentView() { const r = getTodayRecord(), s = calculateStreaks(); setText(elements.developmentStepsToday, r.steps); setText(elements.developmentBreathingToday, getBreathingCount(r)); setText(elements.developmentPointsToday, r.totalPoints); setText(elements.developmentTotalPoints, points); setText(elements.currentStreak, formatStreak(s.current)); setText(elements.longestStreak, formatStreak(s.longest)); if (elements.historyList) { elements.historyList.textContent = ''; elements.historyList.children.length = 0; for (let i = 6; i >= 0; i -= 1) { const date = addDays(getTodayKey(), -i), rec = dailyHistory[date] || createEmptyDailyRecord(date), li = document.createElement('li'); li.innerHTML = `<span>${date}</span><strong>${rec.steps} skridt</strong><span>${getBreathingCount(rec)} runder</span><strong>${rec.totalPoints} point</strong>`; elements.historyList.appendChild(li); } } updateExtraStats(); }
function updateExtraStats() { const completed = Object.values(missions.items).filter((m) => m.completedCount || m.bonusAwarded); if (elements.completedMissions) elements.completedMissions.innerHTML = completed.length ? completed.map((m) => `<li>${residentTemplates[m.id].mission}: ${m.completedCount} gang(e)</li>`).join('') : '<li>Ingen gennemførte missioner endnu.</li>'; const totals = { buster: 0, olsen: 0, hansen: 0 }; Object.values(dailyHistory).forEach((r) => Object.keys(totals).forEach((id) => { totals[id] += safeNumber(r.donations?.[id]); })); if (elements.donatedStats) elements.donatedStats.innerHTML = Object.keys(totals).map((id) => `<li>${residentTemplates[id].name}: ${totals[id].toLocaleString('da-DK')} ${residentTemplates[id].type === 'steps' ? 'skridt' : 'runder'}</li>`).join(''); }
function refreshStepDate() { const today = getTodayKey(); if (stepProgress.date !== today) { stepProgress = { date: today, steps: 0, points: 0, remainder: 0 }; saveStepProgress(); syncTodayRecordFromStepProgress(); } pruneStepBank(); }
function updateDailySteps(totalSteps) { refreshStepDate(); const safeSteps = safeNumber(totalSteps); if (safeSteps > HIGH_STEP_WARNING_LIMIT && !window.confirm('Det er et usædvanligt højt antal skridt. Vil du rette tallet? Tryk Annuller for at rette eller OK for at gemme det.')) { if (elements.stepInput) elements.stepInput.value = stepProgress.steps; return; } const previousSteps = stepProgress.steps; const delta = safeSteps - previousSteps; const newStepPoints = calculateStepPoints(safeSteps); const pointChange = newStepPoints - stepProgress.points; points = Math.max(0, points + pointChange); stepProgress = { date: getTodayKey(), steps: safeSteps, points: newStepPoints, remainder: safeSteps % STEPS_PER_POINT_BLOCK }; if (delta > 0) distributeNewSteps(delta); if (delta < 0) { const need = Math.abs(delta); const fromBank = removeFromTodayBank(need); rollbackTodayMissionSteps(need - fromBank); showCelebration('Vi har rettet dagens skridt og opdateret missionens fremgang.'); logEvent('step-correction', `Dagens skridt blev rettet ned med ${need}. Det er helt okay at rette tal.`, { amount: need }); } savePoints(); saveStepProgress(); syncTodayRecordFromStepProgress(); updateAllViews(); }
function getSelectedBreathingKey() { return breathingChoiceInputs.find((input) => input.checked)?.value || 'box'; }
function updateBreathingView(message) { if (!breathingSession) { setText(elements.breathingExerciseName, 'Ingen øvelse i gang'); setText(elements.breathingPhase, message || 'Vælg en øvelse og tryk start.'); setText(elements.breathingSeconds, '0'); setText(elements.breathingRounds, '0'); setText(elements.breathingPoints, '0'); return; } const phase = breathingSession.exercise.phases[breathingSession.phaseIndex] || breathingSession.exercise.phases[0]; setText(elements.breathingExerciseName, breathingSession.exercise.label); setText(elements.breathingPhase, `${breathingSession.exercise.label}: ${phase.name}`); setText(elements.breathingSeconds, breathingSession.secondsLeft); setText(elements.breathingRounds, breathingSession.rounds); setText(elements.breathingPoints, breathingSession.rounds * BREATHING_POINTS); }
function saveCompletedBreathingRound(key) { const r = getTodayRecord(); if (key === '478') r.breathing478Count += 1; else r.boxBreathingCount += 1; r.totalPoints += BREATHING_POINTS; points += BREATHING_POINTS; const active = getActiveMission(); if (active?.id === 'hansen') allocateToMission('hansen', 1, key === '478' ? '4-7-8 breathing' : 'Box breathing'); saveDailyHistory(); savePoints(); updateAllViews(); }
function completeBreathingRound() { breathingSession.rounds += 1; saveCompletedBreathingRound(breathingSession.key); breathingSession.phaseIndex = 0; breathingSession.secondsLeft = breathingSession.exercise.phases[0].seconds; updateBreathingView(); }
function tickBreathingTimer() { if (!breathingSession) return; breathingSession.secondsLeft -= 1; if (breathingSession.secondsLeft > 0) { updateBreathingView(); return; } breathingSession.phaseIndex += 1; if (breathingSession.phaseIndex >= breathingSession.exercise.phases.length) { completeBreathingRound(); return; } breathingSession.secondsLeft = breathingSession.exercise.phases[breathingSession.phaseIndex].seconds; updateBreathingView(); }
function startBreathingExercise() { refreshStepDate(); if (breathingTimerId !== null) window.clearInterval(breathingTimerId); const key = getSelectedBreathingKey(); breathingSession = { key, exercise: breathingExercises[key], phaseIndex: 0, secondsLeft: breathingExercises[key].phases[0].seconds, rounds: 0 }; updateBreathingView(); breathingTimerId = window.setInterval(tickBreathingTimer, 1000); }
function stopBreathingExercise() { if (breathingTimerId !== null) window.clearInterval(breathingTimerId); breathingTimerId = null; const earned = breathingSession ? breathingSession.rounds * BREATHING_POINTS : 0; breathingSession = null; updateBreathingView(`Sessionen blev stoppet. Du beholder ${earned} point fra fuldførte runder.`); }
function missionCardHtml(id) { const t = residentTemplates[id], m = missions.items[id], active = missions.activeId === id; return `<article class="mission-card ${active ? 'active' : ''}" id="mission-details-${id}" data-mission-card="${id}" tabindex="-1"><h3>${t.emoji} ${t.mission}</h3><p>${t.story}</p><progress max="${t.goal}" value="${Math.min(m.progress, t.goal)}"></progress><strong>${missionProgressText(id)}</strong><p>${getMissionMessage(id)}</p><p class="mission-missing">${missionMissingText(id)}</p><div class="button-row"><button data-mission-action="start" data-mission-id="${id}">${active ? 'Aktiv mission' : (m.status === 'paused' ? 'Fortsæt mission' : t.startLabel)}</button><button data-mission-action="pause" data-mission-id="${id}">Pause</button><button data-mission-action="switch" data-mission-id="${id}">Skift helt hertil</button><button data-mission-action="cancel" data-mission-id="${id}">Annullér</button></div></article>`; }
function updateMissionsView() { if (elements.activeMissionActivity) { const active = getActiveMission(); elements.activeMissionActivity.innerHTML = active ? `<strong>Mission aktiv: ${residentTemplates[active.id].mission}</strong><br><progress max="${residentTemplates[active.id].goal}" value="${Math.min(active.progress, residentTemplates[active.id].goal)}"></progress><br>${missionProgressText(active.id)}<br>${getMissionMessage(active.id)}<br>${missionMissingText(active.id)}<div class="button-row"><button data-mission-action="pause" data-mission-id="${active.id}">Pause</button><button data-nav="missions">Skift mission</button></div>` : 'Ingen aktiv mission lige nu. Tryk på en beboer eller vælg på Missioner-siden.'; } if (elements.missionList) { const ids = Object.keys(missions.items).sort((a, b) => (missions.activeId === b) - (missions.activeId === a)); elements.missionList.innerHTML = ids.map(missionCardHtml).join('') + '<p class="info-box">Flere aktiviteter som søvn, løb, cykling og naturture kommer senere.</p>'; } }
function updateBankView() { const total = bankTotal(); setText(elements.bankTotal, total.toLocaleString('da-DK')); if (elements.bankEntries) elements.bankEntries.innerHTML = stepBank.length ? stepBank.map((e) => `<li>${e.steps.toLocaleString('da-DK')} skridt fra ${e.source} (${e.date}) – udløber om ${Math.max(0, BANK_TTL_DAYS - daysBetween(e.date, getTodayKey()))} dage</li>`).join('') : '<li>Ingen ufordelte skridt. Ældste skridt bruges først, når du donerer.</li>'; }
function updateAllViews() { updateWorld(); updateStepView(); updateDevelopmentView(); updateMissionsView(); updateBankView(); updateBreathingView(); }
function highlightMissionDetails(element) { if (!element) return; element.classList?.remove('mission-card-highlight'); void element.offsetWidth; element.classList?.add('mission-card-highlight'); window.setTimeout?.(() => element.classList?.remove('mission-card-highlight'), 1400); }
function scrollToMissionDetails(id) { const card = byId(`mission-details-${id}`) || $(`[data-mission-card=\"${id}\"]`); if (!card) return; card.scrollIntoView?.({ behavior: 'smooth', block: 'start' }); card.focus?.({ preventScroll: true }); highlightMissionDetails(card); }
function scheduleMissionDetailsScroll(id) { window.setTimeout?.(() => scrollToMissionDetails(id), 60); }
function openResidentPanel(id) { const t = residentTemplates[id], panel = elements.residentPanel; if (!t || !panel) return; setText($('#resident-name'), t.fullName || t.name); setText($('#resident-story'), t.story); setText($('#resident-mood'), getResidentMood(id)); setText($('#resident-mission'), t.mission); setText($('#resident-progress'), missionProgressText(id)); setText($('#resident-missing'), missionMissingText(id)); const action = $('#resident-primary-action'); if (action) { action.dataset.missionId = id; action.textContent = missions.items[id].status === 'paused' ? 'Fortsæt mission' : t.startLabel; } const pause = $('#resident-pause-action'); if (pause) { pause.dataset.missionId = id; pause.hidden = missions.activeId !== id; } setText($('#resident-status-message'), getMissionMessage(id)); panel.hidden = false; panel.classList?.add('open'); }
function closeResidentPanel() { if (elements.residentPanel) { elements.residentPanel.hidden = true; elements.residentPanel.classList?.remove('open'); } }
function showPage(page) { $$('.app-section').forEach((s) => { s.hidden = s.dataset.page !== page; }); $$('.bottom-nav button').forEach((b) => b.classList.toggle('active', b.dataset.nav === page)); }
function saveProfileFromForm() { const form = $('#profile-form'); if (!form) return; profile = Object.fromEntries($$('#profile-form input:not([type=checkbox]), #profile-form select').map((el) => [el.name, el.value])); settings = { vibration: $('#setting-vibration')?.checked !== false, sound: $('#setting-sound')?.checked !== false, voices: $('#setting-voices')?.checked === true }; saveJson(PROFILE_STORAGE_KEY, profile); saveSettings(); setText($('#profile-save-status'), 'Profilen og indstillingerne er gemt lokalt på din enhed.'); }
function hydrateProfileForm() { Object.entries(profile || {}).forEach(([key, value]) => { const el = $(`[name="${key}"]`); if (el) el.value = value; }); const vib = $('#setting-vibration'), sound = $('#setting-sound'), voices = $('#setting-voices'); if (vib) vib.checked = settings.vibration; if (sound) sound.checked = settings.sound; if (voices) voices.checked = settings.voices; }
function donateFromBank() { const id = $('#bank-target')?.value || 'buster'; const custom = safeNumber($('#bank-custom-amount')?.value); const selected = safeNumber($('[name="bank-quick"]:checked')?.value); const wanted = custom || selected || bankTotal(); const taken = withdrawBank(Math.min(wanted, bankTotal())); allocateToMission(id, taken, 'Skridtbank'); updateAllViews(); }

elements.stepUpdate?.addEventListener('click', () => updateDailySteps(elements.stepInput.value));
elements.breathingStart?.addEventListener('click', startBreathingExercise);
elements.breathingStop?.addEventListener('click', stopBreathingExercise);
$$('[data-resident]').forEach((el) => el.addEventListener('click', () => openResidentPanel(el.dataset.resident)));
$('#resident-panel-close')?.addEventListener('click', closeResidentPanel);
$$('.bottom-nav button').forEach((b) => b.addEventListener('click', () => showPage(b.dataset.nav)));
document.addEventListener?.('click', (event) => { try { const nav = event.target.closest?.('[data-nav]'); if (nav) showPage(nav.dataset.nav); const btn = event.target.closest?.('[data-mission-action]'); if (btn) { const a = btn.dataset.missionAction, id = btn.dataset.missionId; if (a === 'start') void startMission(id, 'pause'); else if (a === 'switch') void startMission(id, 'switch'); else if (a === 'pause') { pauseMission(id); scheduleMissionDetailsScroll(id); } else if (a === 'cancel') { cancelMission(id); scheduleMissionDetailsScroll(id); } else setMissionStatus(id, a); } } catch (error) { console.error('OneUp klik-handler fejlede', error); } });
$('#donate-bank')?.addEventListener('click', donateFromBank);
$('#resident-primary-action')?.addEventListener('click', (event) => { event.preventDefault(); void startMission(event.currentTarget.dataset.missionId, 'pause', { closePanel: true, goToActivity: true }); });
$('#resident-pause-action')?.addEventListener('click', (event) => pauseMission(event.target.dataset.missionId));
$('#profile-form')?.addEventListener('submit', (event) => { event.preventDefault(); saveProfileFromForm(); });
elements.reset?.addEventListener('click', () => { if (!window.confirm('Er du sikker på, at du vil nulstille dine point?')) return; points = 0; stepProgress = { date: getTodayKey(), steps: 0, points: 0, remainder: 0 }; village = Object.fromEntries(Object.keys(residentTemplates).map((id) => [id, freshResident(id)])); missions = readMissions(); missions.items = Object.fromEntries(Object.keys(residentTemplates).map((id) => [id, createMission(id)])); missions.activeId = null; stepBank = []; localStorage.removeItem(POINTS_STORAGE_KEY); localStorage.removeItem(STEP_PROGRESS_STORAGE_KEY); localStorage.removeItem(DAILY_HISTORY_STORAGE_KEY); localStorage.removeItem(VILLAGE_STORAGE_KEY); localStorage.removeItem(MISSION_STORAGE_KEY); localStorage.removeItem(STEP_BANK_STORAGE_KEY); dailyHistory = {}; syncTodayRecordFromStepProgress(); saveMissions(); updateAllViews(); closeResidentPanel(); });

refreshStepDate(); syncTodayRecordFromStepProgress(); hydrateProfileForm(); saveVillage(); saveMissions(); updateAllViews(); showPage('village');
