const POINTS_STORAGE_KEY = 'oneupPoints';
const STEP_PROGRESS_STORAGE_KEY = 'oneupStepProgress';
const DAILY_HISTORY_STORAGE_KEY = 'oneupDailyHistory';
const VILLAGE_STORAGE_KEY = 'oneupVillageResidents';
const HIGH_STEP_WARNING_LIMIT = 60000;
const POINTS_PER_STEP_BLOCK = 1;
const STEPS_PER_POINT_BLOCK = 100;
const BREATHING_POINTS = 5;

const $ = (selector) => document.querySelector(selector);
const pointsElement = $('#points');
const worldElement = $('#world');
const worldMessageElement = $('#world-message');
const personFaceElement = $('#person-face');
const animalFaceElement = $('#animal-face');
const resetButton = $('#reset-points');
const stepInput = $('#step-count');
const stepUpdateButton = $('#update-steps');
const stepTodayElement = $('#steps-today');
const stepPointsTodayElement = $('#step-points-today');
const stepsToNextPointElement = $('#steps-to-next-point');
const breathingChoiceInputs = document.querySelectorAll('input[name="breathing-exercise"]');
const breathingPhaseElement = $('#breathing-phase');
const breathingSecondsElement = $('#breathing-seconds');
const breathingStartButton = $('#start-breathing');
const breathingStopButton = $('#stop-breathing');
const breathingExerciseNameElement = $('#breathing-exercise-name');
const breathingRoundsElement = $('#breathing-rounds-session');
const breathingPointsElement = $('#breathing-points-session');
const developmentStepsTodayElement = $('#development-steps-today');
const developmentBreathingTodayElement = $('#development-breathing-today');
const developmentPointsTodayElement = $('#development-points-today');
const developmentTotalPointsElement = $('#development-total-points');
const currentStreakElement = $('#current-streak');
const longestStreakElement = $('#longest-streak');
const historyListElement = $('#history-list');
const residentPanel = $('#resident-panel');
const residentPanelClose = $('#resident-panel-close');
const residentName = $('#resident-name');
const residentStory = $('#resident-story');
const residentMood = $('#resident-mood');
const residentMission = $('#resident-mission');
const residentProgress = $('#resident-progress');
const residentMissing = $('#resident-missing');
const celebrationElement = $('#village-celebration');

function getTodayKey() {
  const now = typeof window.__oneUpNow === 'function' ? window.__oneUpNow() : new Date();
  return now.toISOString().slice(0, 10);
}

function safeNumber(value) { return Math.max(0, Math.floor(Number(value) || 0)); }
function readSavedPoints() { return safeNumber(localStorage.getItem(POINTS_STORAGE_KEY)); }
function savePoints() { localStorage.setItem(POINTS_STORAGE_KEY, String(points)); }
function createEmptyDailyRecord(date) { return { date, steps: 0, stepPoints: 0, boxBreathingCount: 0, breathing478Count: 0, totalPoints: 0 }; }
function normalizeDailyRecord(record, date) {
  const empty = createEmptyDailyRecord(date);
  if (!record || typeof record !== 'object') return empty;
  const steps = safeNumber(record.steps);
  const stepPoints = safeNumber(record.stepPoints ?? record.points);
  const boxBreathingCount = safeNumber(record.boxBreathingCount);
  const breathing478Count = safeNumber(record.breathing478Count);
  const totalPoints = safeNumber(record.totalPoints || (stepPoints + ((boxBreathingCount + breathing478Count) * BREATHING_POINTS)));
  return { date, steps, stepPoints, boxBreathingCount, breathing478Count, totalPoints };
}
function readDailyHistory() {
  const today = getTodayKey();
  let history = {};
  try {
    const saved = JSON.parse(localStorage.getItem(DAILY_HISTORY_STORAGE_KEY));
    if (saved && typeof saved === 'object' && !Array.isArray(saved)) {
      history = Object.fromEntries(Object.entries(saved).map(([date, record]) => [date, normalizeDailyRecord(record, date)]));
    }
  } catch { history = {}; }
  if (!history[today]) history[today] = createEmptyDailyRecord(today);
  return history;
}
function saveDailyHistory() { localStorage.setItem(DAILY_HISTORY_STORAGE_KEY, JSON.stringify(dailyHistory)); }
function getTodayRecord() { const today = getTodayKey(); if (!dailyHistory[today]) dailyHistory[today] = createEmptyDailyRecord(today); return dailyHistory[today]; }
function readStepProgress() {
  const today = getTodayKey();
  const fallback = { date: today, steps: 0, points: 0, remainder: 0 };
  try {
    const saved = JSON.parse(localStorage.getItem(STEP_PROGRESS_STORAGE_KEY));
    if (!saved || saved.date !== today) return fallback;
    return { date: today, steps: safeNumber(saved.steps), points: safeNumber(saved.points), remainder: safeNumber(saved.remainder) };
  } catch { return fallback; }
}
function saveStepProgress() { localStorage.setItem(STEP_PROGRESS_STORAGE_KEY, JSON.stringify(stepProgress)); }
function syncTodayRecordFromStepProgress() {
  const todayRecord = getTodayRecord();
  todayRecord.steps = stepProgress.steps;
  todayRecord.stepPoints = stepProgress.points;
  todayRecord.totalPoints = todayRecord.stepPoints + ((todayRecord.boxBreathingCount + todayRecord.breathing478Count) * BREATHING_POINTS);
  saveDailyHistory();
}

const residentTemplates = {
  olsen: { name: 'Fru Olsen', emoji: '👵', type: 'steps', goal: 5000, mood: ['Lidt træt', 'Mere oplagt', 'Energisk og håbefuld'], story: 'Fru Olsen vil gerne have mere energi og arbejder stille mod et personligt mål om at tabe 2 kg. Gåture hjælper hende videre mod målet uden at love et bestemt vægttab.', mission: 'Gå samlet 5.000 nye skridt' },
  hansen: { name: 'Hr. Hansen', emoji: '👨', type: 'breathing', goal: 5, mood: ['Stresset og anspændt', 'Roligere', 'Smiler mere og finder ro'], story: 'Hr. Hansen føler sig stresset og anspændt. Åndedrætsøvelser hjælper ham gradvist til mere ro og flere smil.', mission: 'Gennemfør mindst 5 fulde åndedrætsrunder' },
  buster: { name: 'Hunden Buster', emoji: '🐶', type: 'steps', goal: 3000, mood: ['Nysgerrig', 'Gladere', 'Legesyg og aktiv'], story: 'Buster bliver gladere, mere legesyg og mere aktiv, når dine gåture giver liv til landsbyen.', mission: 'Gå samlet 3.000 nye skridt' },
};
function freshResident(id, old = {}) { return { id, level: safeNumber(old.level), progress: safeNumber(old.progress), completions: safeNumber(old.completions) }; }
function readVillage() {
  try { const saved = JSON.parse(localStorage.getItem(VILLAGE_STORAGE_KEY)); return Object.fromEntries(Object.keys(residentTemplates).map((id) => [id, freshResident(id, saved?.[id])])); }
  catch { return Object.fromEntries(Object.keys(residentTemplates).map((id) => [id, freshResident(id)])); }
}
function saveVillage() { localStorage.setItem(VILLAGE_STORAGE_KEY, JSON.stringify(village)); }
function getResidentMood(id) { const r = village[id]; const t = residentTemplates[id]; return t.mood[Math.min(t.mood.length - 1, r.level)]; }
function showCelebration(message) { if (!celebrationElement) return; celebrationElement.textContent = message; celebrationElement.classList.add('show'); window.setTimeout?.(() => celebrationElement.classList.remove('show'), 3200); }
function addVillageProgress(type, amount) {
  Object.keys(residentTemplates).forEach((id) => {
    const t = residentTemplates[id]; if (t.type !== type) return;
    const r = village[id]; r.progress = Math.max(0, r.progress + amount);
    while (r.progress >= t.goal) { r.progress -= t.goal; r.level += 1; r.completions += 1; showCelebration(`${t.name} fejrer din hjælp. ${getResidentMood(id)}! En ny mission er startet.`); }
  });
  saveVillage(); updateVillageView();
}
function updateVillageView() {
  Object.keys(residentTemplates).forEach((id) => {
    const el = $(`[data-resident="${id}"]`); if (!el) return;
    el.classList.toggle('resident-happy', village[id].level > 0);
    const face = el.querySelector?.('.resident-face'); if (face) face.textContent = residentTemplates[id].emoji;
  });
  if (worldElement?.dataset) worldElement.dataset.villageLevel = String(Math.min(5, Math.floor(points / 25) + Object.values(village).reduce((sum, r) => sum + r.level, 0)));
}
function openResidentPanel(id) {
  const t = residentTemplates[id]; const r = village[id]; if (!t || !residentPanel) return;
  residentName.textContent = t.name; residentStory.textContent = t.story; residentMood.textContent = getResidentMood(id); residentMission.textContent = t.mission;
  residentProgress.textContent = `${r.progress} / ${t.goal} ${t.type === 'steps' ? 'skridt' : 'runder'}`;
  residentMissing.textContent = `${Math.max(0, t.goal - r.progress)} ${t.type === 'steps' ? 'skridt' : 'runder'} mangler til næste udviklingstrin.`;
  residentPanel.hidden = false; residentPanel.classList.add('open');
}
function closeResidentPanel() { if (residentPanel) { residentPanel.hidden = true; residentPanel.classList.remove('open'); } }

let points = readSavedPoints();
let dailyHistory = readDailyHistory();
let stepProgress = readStepProgress();
let village = readVillage();
let breathingTimerId = null;
let breathingSession = null;

const worldLevels = [
  { minimumPoints: 0, beauty: 0.12, rainbow: 0, message: 'Niveau 1: Spire. Verdenen er stille, men håbet spirer stille frem.', className: 'level-1', personFace: '🙂', animalFace: '🐶' },
  { minimumPoints: 10, beauty: 0.32, rainbow: 0.1, message: 'Niveau 2: Ro. Mere grønt, blomster og et fredeligt hvilested vokser frem.', className: 'level-2', personFace: '😊', animalFace: '🐶' },
  { minimumPoints: 30, beauty: 0.58, rainbow: 0.25, message: 'Niveau 3: Glæde. Farverne bliver klarere, og verdenen fyldes med leg og liv.', className: 'level-3', personFace: '😄', animalFace: '🐕' },
  { minimumPoints: 50, beauty: 0.82, rainbow: 0.55, message: 'Niveau 4: Omsorg. Venlighed, trygge dyr og små hjerter binder verdenen sammen.', className: 'level-4', personFace: '🥰', animalFace: '🐕‍🦺' },
  { minimumPoints: 80, beauty: 1, rainbow: 0.95, message: 'Niveau 5: Harmoni. Fællesskab, natur og varmt lys skaber en fredelig balance.', className: 'level-5', personFace: '😍', animalFace: '🐕‍🦺' },
];
const breathingExercises = { box: { label: 'Box breathing', phases: [{ name: 'Træk vejret ind', seconds: 4 }, { name: 'Hold vejret', seconds: 4 }, { name: 'Pust ud', seconds: 4 }, { name: 'Hold vejret', seconds: 4 }] }, '478': { label: '4-7-8 breathing', phases: [{ name: 'Træk vejret ind', seconds: 4 }, { name: 'Hold vejret', seconds: 7 }, { name: 'Pust ud', seconds: 8 }] } };
function getCurrentLevel() { return worldLevels.filter((level) => points >= level.minimumPoints).at(-1); }
function updateWorld() { const level = getCurrentLevel(); pointsElement.textContent = points; worldElement.className = `world ${level.className}`; worldElement.style.setProperty('--beauty', level.beauty); document.documentElement.style.setProperty('--rainbow-strength', level.rainbow); worldMessageElement.textContent = level.message; if (personFaceElement) personFaceElement.textContent = level.personFace; if (animalFaceElement) animalFaceElement.textContent = level.animalFace; updateVillageView(); }
function updateStepView() { stepInput.value = stepProgress.steps; stepTodayElement.textContent = stepProgress.steps; stepPointsTodayElement.textContent = stepProgress.points; stepsToNextPointElement.textContent = stepProgress.remainder === 0 ? STEPS_PER_POINT_BLOCK : STEPS_PER_POINT_BLOCK - stepProgress.remainder; }
function getBreathingCount(record) { return record.boxBreathingCount + record.breathing478Count; }
function isActiveDay(record) { return record.steps >= 1000 || getBreathingCount(record) > 0; }
function addDays(dateText, dayCount) { const date = new Date(`${dateText}T12:00:00.000Z`); date.setUTCDate(date.getUTCDate() + dayCount); return date.toISOString().slice(0, 10); }
function formatStreak(dayCount) { return `${dayCount} ${dayCount === 1 ? 'dag' : 'dage'}`; }
function calculateStreaks() { const dates = Object.keys(dailyHistory).sort(); let longest = 0, run = 0, previousDate = null; dates.forEach((date) => { if (!isActiveDay(dailyHistory[date])) { run = 0; previousDate = date; return; } run = previousDate && addDays(previousDate, 1) === date ? run + 1 : 1; longest = Math.max(longest, run); previousDate = date; }); let current = 0, date = getTodayKey(); while (dailyHistory[date] && isActiveDay(dailyHistory[date])) { current += 1; date = addDays(date, -1); } return { current, longest }; }
function updateDevelopmentView() { const todayRecord = getTodayRecord(); const streaks = calculateStreaks(); developmentStepsTodayElement.textContent = todayRecord.steps; developmentBreathingTodayElement.textContent = getBreathingCount(todayRecord); developmentPointsTodayElement.textContent = todayRecord.totalPoints; developmentTotalPointsElement.textContent = points; currentStreakElement.textContent = formatStreak(streaks.current); longestStreakElement.textContent = formatStreak(streaks.longest); historyListElement.textContent = ''; historyListElement.children.length = 0; for (let index = 6; index >= 0; index -= 1) { const date = addDays(getTodayKey(), -index); const record = dailyHistory[date] || createEmptyDailyRecord(date); const item = document.createElement('li'); const dayName = new Intl.DateTimeFormat('da-DK', { weekday: 'short', day: '2-digit', month: '2-digit' }).format(new Date(`${date}T12:00:00.000Z`)); item.innerHTML = `<span>${dayName}</span><strong>${record.steps} skridt</strong><span>${getBreathingCount(record)} runder</span><strong>${record.totalPoints} point</strong>`; historyListElement.appendChild(item); } }
function refreshStepDate() { const today = getTodayKey(); if (stepProgress.date !== today) { stepProgress = { date: today, steps: 0, points: 0, remainder: 0 }; saveStepProgress(); syncTodayRecordFromStepProgress(); } }
function calculateStepPoints(totalSteps) { return Math.floor(totalSteps / STEPS_PER_POINT_BLOCK) * POINTS_PER_STEP_BLOCK; }
function updateDailySteps(totalSteps) { refreshStepDate(); const safeSteps = safeNumber(totalSteps); if (safeSteps > HIGH_STEP_WARNING_LIMIT && !window.confirm('Det er et usædvanligt højt antal skridt. Vil du rette tallet? Tryk Annuller for at rette eller OK for at gemme det.')) { stepInput.value = stepProgress.steps; return; } const previousSteps = stepProgress.steps; const newStepPoints = calculateStepPoints(safeSteps); const pointChange = newStepPoints - stepProgress.points; points = Math.max(0, points + pointChange); stepProgress = { date: getTodayKey(), steps: safeSteps, points: newStepPoints, remainder: safeSteps % STEPS_PER_POINT_BLOCK }; savePoints(); saveStepProgress(); syncTodayRecordFromStepProgress(); addVillageProgress('steps', safeSteps - previousSteps); updateWorld(); updateStepView(); updateDevelopmentView(); }
function getSelectedBreathingKey() { return Array.from(breathingChoiceInputs).find((input) => input.checked)?.value || 'box'; }
function updateBreathingView(message) { if (!breathingSession) { breathingExerciseNameElement && (breathingExerciseNameElement.textContent = 'Ingen øvelse i gang'); breathingPhaseElement.textContent = message || 'Vælg en øvelse og tryk start.'; breathingSecondsElement.textContent = '0'; breathingRoundsElement && (breathingRoundsElement.textContent = '0'); breathingPointsElement && (breathingPointsElement.textContent = '0'); return; } const phase = breathingSession.exercise.phases[breathingSession.phaseIndex]; breathingExerciseNameElement && (breathingExerciseNameElement.textContent = breathingSession.exercise.label); breathingPhaseElement.textContent = `${breathingSession.exercise.label}: ${phase.name}`; breathingSecondsElement.textContent = breathingSession.secondsLeft; breathingRoundsElement && (breathingRoundsElement.textContent = breathingSession.rounds); breathingPointsElement && (breathingPointsElement.textContent = breathingSession.rounds * BREATHING_POINTS); }
function saveCompletedBreathingRound(key) { const todayRecord = getTodayRecord(); if (key === '478') todayRecord.breathing478Count += 1; else todayRecord.boxBreathingCount += 1; todayRecord.totalPoints += BREATHING_POINTS; points = Math.max(0, points + BREATHING_POINTS); saveDailyHistory(); savePoints(); addVillageProgress('breathing', 1); updateWorld(); updateDevelopmentView(); }
function completeBreathingRound() { breathingSession.rounds += 1; saveCompletedBreathingRound(breathingSession.key); breathingSession.phaseIndex = 0; breathingSession.secondsLeft = breathingSession.exercise.phases[0].seconds; updateBreathingView(); }
function tickBreathingTimer() { if (!breathingSession) return; breathingSession.secondsLeft -= 1; if (breathingSession.secondsLeft > 0) { updateBreathingView(); return; } breathingSession.phaseIndex += 1; if (breathingSession.phaseIndex >= breathingSession.exercise.phases.length) { completeBreathingRound(); return; } breathingSession.secondsLeft = breathingSession.exercise.phases[breathingSession.phaseIndex].seconds; updateBreathingView(); }
function startBreathingExercise() { refreshStepDate(); if (breathingTimerId !== null) window.clearInterval(breathingTimerId); const key = getSelectedBreathingKey(); breathingSession = { key, exercise: breathingExercises[key], phaseIndex: 0, secondsLeft: breathingExercises[key].phases[0].seconds, rounds: 0 }; updateBreathingView(); breathingTimerId = window.setInterval(tickBreathingTimer, 1000); }
function stopBreathingExercise() { if (breathingTimerId !== null) window.clearInterval(breathingTimerId); breathingTimerId = null; const earned = breathingSession ? breathingSession.rounds * BREATHING_POINTS : 0; breathingSession = null; updateBreathingView(`Sessionen blev stoppet. Du beholder ${earned} point fra fuldførte runder.`); }

stepUpdateButton.addEventListener('click', () => updateDailySteps(stepInput.value));
breathingStartButton.addEventListener('click', startBreathingExercise);
breathingStopButton.addEventListener('click', stopBreathingExercise);
document.querySelectorAll?.('[data-resident]').forEach?.((el) => el.addEventListener('click', () => openResidentPanel(el.dataset.resident)));
residentPanelClose?.addEventListener('click', closeResidentPanel);
resetButton.addEventListener('click', () => { if (!window.confirm('Er du sikker på, at du vil nulstille dine point?')) return; points = 0; stepProgress = { date: getTodayKey(), steps: 0, points: 0, remainder: 0 }; village = readVillage(); Object.keys(village).forEach((id) => { village[id] = freshResident(id); }); localStorage.removeItem(POINTS_STORAGE_KEY); localStorage.removeItem(STEP_PROGRESS_STORAGE_KEY); localStorage.removeItem(DAILY_HISTORY_STORAGE_KEY); localStorage.removeItem(VILLAGE_STORAGE_KEY); dailyHistory = {}; syncTodayRecordFromStepProgress(); updateWorld(); updateStepView(); updateDevelopmentView(); updateBreathingView(); closeResidentPanel(); });

refreshStepDate(); syncTodayRecordFromStepProgress(); updateWorld(); updateStepView(); updateDevelopmentView(); updateBreathingView(); saveVillage();
