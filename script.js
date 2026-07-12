const POINTS_STORAGE_KEY = 'oneupPoints';
const STEP_PROGRESS_STORAGE_KEY = 'oneupStepProgress';
const DAILY_HISTORY_STORAGE_KEY = 'oneupDailyHistory';
const HIGH_STEP_WARNING_LIMIT = 60000;
const POINTS_PER_STEP_BLOCK = 1;
const STEPS_PER_POINT_BLOCK = 100;
const BREATHING_POINTS = 10;

const pointsElement = document.querySelector('#points');
const worldElement = document.querySelector('#world');
const worldMessageElement = document.querySelector('#world-message');
const personFaceElement = document.querySelector('#person-face');
const animalFaceElement = document.querySelector('#animal-face');
const resetButton = document.querySelector('#reset-points');
const stepInput = document.querySelector('#step-count');
const stepUpdateButton = document.querySelector('#update-steps');
const stepTodayElement = document.querySelector('#steps-today');
const stepPointsTodayElement = document.querySelector('#step-points-today');
const stepsToNextPointElement = document.querySelector('#steps-to-next-point');
const breathingChoiceInputs = document.querySelectorAll('input[name="breathing-exercise"]');
const breathingPhaseElement = document.querySelector('#breathing-phase');
const breathingSecondsElement = document.querySelector('#breathing-seconds');
const breathingStartButton = document.querySelector('#start-breathing');
const breathingStopButton = document.querySelector('#stop-breathing');
const developmentStepsTodayElement = document.querySelector('#development-steps-today');
const developmentBreathingTodayElement = document.querySelector('#development-breathing-today');
const developmentPointsTodayElement = document.querySelector('#development-points-today');
const developmentTotalPointsElement = document.querySelector('#development-total-points');
const currentStreakElement = document.querySelector('#current-streak');
const longestStreakElement = document.querySelector('#longest-streak');
const historyListElement = document.querySelector('#history-list');

function getTodayKey() {
  const now = typeof window.__oneUpNow === 'function' ? window.__oneUpNow() : new Date();

  return now.toISOString().slice(0, 10);
}

function readSavedPoints() {
  const savedPointsText = localStorage.getItem(POINTS_STORAGE_KEY);

  if (savedPointsText === null) {
    return 0;
  }

  const savedPoints = Number(savedPointsText);

  return Number.isFinite(savedPoints) && savedPoints >= 0 ? savedPoints : 0;
}

function savePoints() {
  localStorage.setItem(POINTS_STORAGE_KEY, String(points));
}


function createEmptyDailyRecord(date) {
  return {
    date,
    steps: 0,
    stepPoints: 0,
    boxBreathingCount: 0,
    breathing478Count: 0,
    totalPoints: 0,
  };
}

function normalizeDailyRecord(record, date) {
  const dailyRecord = createEmptyDailyRecord(date);

  if (!record || typeof record !== 'object') {
    return dailyRecord;
  }

  const steps = Math.max(0, Math.floor(Number(record.steps) || 0));
  const stepPoints = Math.max(0, Math.floor(Number(record.stepPoints ?? record.points) || 0));
  const boxBreathingCount = Math.max(0, Math.floor(Number(record.boxBreathingCount) || 0));
  const breathing478Count = Math.max(0, Math.floor(Number(record.breathing478Count) || 0));
  const breathingPoints = (boxBreathingCount + breathing478Count) * BREATHING_POINTS;
  const totalPoints = Math.max(0, Math.floor(Number(record.totalPoints) || (stepPoints + breathingPoints)));

  return {
    date,
    steps,
    stepPoints,
    boxBreathingCount,
    breathing478Count,
    totalPoints,
  };
}

function readDailyHistory() {
  const today = getTodayKey();
  let history = {};

  try {
    const savedHistory = JSON.parse(localStorage.getItem(DAILY_HISTORY_STORAGE_KEY));

    if (savedHistory && typeof savedHistory === 'object' && !Array.isArray(savedHistory)) {
      history = Object.fromEntries(
        Object.entries(savedHistory).map(([date, record]) => [date, normalizeDailyRecord(record, date)]),
      );
    }
  } catch {
    history = {};
  }

  if (!history[today]) {
    history[today] = createEmptyDailyRecord(today);
  }

  return history;
}

function saveDailyHistory() {
  localStorage.setItem(DAILY_HISTORY_STORAGE_KEY, JSON.stringify(dailyHistory));
}

function getTodayRecord() {
  const today = getTodayKey();

  if (!dailyHistory[today]) {
    dailyHistory[today] = createEmptyDailyRecord(today);
  }

  return dailyHistory[today];
}

function readStepProgress() {

  const today = getTodayKey();
  const fallbackProgress = {
    date: today,
    steps: 0,
    points: 0,
    remainder: 0,
  };

  try {
    const savedProgress = JSON.parse(localStorage.getItem(STEP_PROGRESS_STORAGE_KEY));

    if (!savedProgress || savedProgress.date !== today) {
      return fallbackProgress;
    }

    const steps = Math.max(0, Math.floor(Number(savedProgress.steps) || 0));
    const stepPoints = Math.max(0, Math.floor(Number(savedProgress.points) || 0));
    const remainder = Math.max(0, Math.floor(Number(savedProgress.remainder) || 0));

    return {
      date: today,
      steps,
      points: stepPoints,
      remainder,
    };
  } catch {
    return fallbackProgress;
  }
}

function saveStepProgress() {
  localStorage.setItem(STEP_PROGRESS_STORAGE_KEY, JSON.stringify(stepProgress));
}

function syncTodayRecordFromStepProgress() {
  const todayRecord = getTodayRecord();

  todayRecord.steps = stepProgress.steps;
  todayRecord.stepPoints = stepProgress.points;
  todayRecord.totalPoints = todayRecord.stepPoints + ((todayRecord.boxBreathingCount + todayRecord.breathing478Count) * BREATHING_POINTS);
  saveDailyHistory();
}

let points = readSavedPoints();
let dailyHistory = readDailyHistory();
let stepProgress = readStepProgress();
let breathingTimerId = null;
let breathingExercise = null;
let breathingPhaseIndex = 0;
let breathingSecondsLeft = 0;

const worldLevels = [
  {
    minimumPoints: 0,
    beauty: 0.08,
    rainbow: 0,
    message: 'Niveau 1: Spire. Verdenen er stille, men håbet spirer stille frem.',
    personFace: '🙂',
    animalFace: '🐶',
    className: 'level-1',
  },
  {
    minimumPoints: 10,
    beauty: 0.3,
    rainbow: 0,
    message: 'Niveau 2: Ro. Mere grønt, blomster og et fredeligt hvilested vokser frem.',
    personFace: '😊',
    animalFace: '🐶',
    className: 'level-2',
  },
  {
    minimumPoints: 30,
    beauty: 0.58,
    rainbow: 0.15,
    message: 'Niveau 3: Glæde. Farverne bliver klarere, og verdenen fyldes med leg og liv.',
    personFace: '😄',
    animalFace: '🐕',
    className: 'level-3',
  },
  {
    minimumPoints: 50,
    beauty: 0.82,
    rainbow: 0.45,
    message: 'Niveau 4: Omsorg. Venlighed, trygge dyr og små hjerter binder verdenen sammen.',
    personFace: '🥰',
    animalFace: '🐕‍🦺',
    className: 'level-4',
  },
  {
    minimumPoints: 80,
    beauty: 1,
    rainbow: 0.95,
    message: 'Niveau 5: Harmoni. Fællesskab, natur og varmt lys skaber en fredelig balance.',
    personFace: '😍',
    animalFace: '🐕‍🦺',
    className: 'level-5',
  },
];

const breathingExercises = {
  box: {
    label: 'Box breathing',
    phases: [
      { name: 'Træk vejret ind', seconds: 4 },
      { name: 'Hold vejret', seconds: 4 },
      { name: 'Pust ud', seconds: 4 },
      { name: 'Hold vejret', seconds: 4 },
    ],
  },
  '478': {
    label: '4-7-8 breathing',
    phases: [
      { name: 'Træk vejret ind', seconds: 4 },
      { name: 'Hold vejret', seconds: 7 },
      { name: 'Pust ud', seconds: 8 },
    ],
  },
};

function getCurrentLevel() {
  return worldLevels
    .filter((level) => points >= level.minimumPoints)
    .at(-1);
}

function updateWorld() {
  const level = getCurrentLevel();

  pointsElement.textContent = points;
  worldElement.className = `world ${level.className}`.trim();
  worldElement.style.setProperty('--beauty', level.beauty);
  worldElement.style.setProperty('--rainbow-strength', level.rainbow);
  document.documentElement.style.setProperty('--rainbow-strength', level.rainbow);
  worldMessageElement.textContent = level.message;
  personFaceElement.textContent = level.personFace;
  animalFaceElement.textContent = level.animalFace;
}

function updateStepView() {
  stepInput.value = stepProgress.steps;
  stepTodayElement.textContent = stepProgress.steps;
  stepPointsTodayElement.textContent = stepProgress.points;
  stepsToNextPointElement.textContent = stepProgress.remainder === 0
    ? STEPS_PER_POINT_BLOCK
    : STEPS_PER_POINT_BLOCK - stepProgress.remainder;
}

function getBreathingCount(record) {
  return record.boxBreathingCount + record.breathing478Count;
}

function isActiveDay(record) {
  return record.steps >= 1000 || getBreathingCount(record) > 0;
}

function addDays(dateText, dayCount) {
  const date = new Date(`${dateText}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + dayCount);
  return date.toISOString().slice(0, 10);
}

function formatStreak(dayCount) {
  return `${dayCount} ${dayCount === 1 ? 'dag' : 'dage'}`;
}

function calculateStreaks() {
  const dates = Object.keys(dailyHistory).sort();
  let longest = 0;
  let run = 0;
  let previousDate = null;

  dates.forEach((date) => {
    if (!isActiveDay(dailyHistory[date])) {
      run = 0;
      previousDate = date;
      return;
    }

    run = previousDate && addDays(previousDate, 1) === date ? run + 1 : 1;
    longest = Math.max(longest, run);
    previousDate = date;
  });

  let current = 0;
  let date = getTodayKey();
  while (dailyHistory[date] && isActiveDay(dailyHistory[date])) {
    current += 1;
    date = addDays(date, -1);
  }

  return { current, longest };
}

function updateDevelopmentView() {
  const todayRecord = getTodayRecord();
  const streaks = calculateStreaks();

  developmentStepsTodayElement.textContent = todayRecord.steps;
  developmentBreathingTodayElement.textContent = getBreathingCount(todayRecord);
  developmentPointsTodayElement.textContent = todayRecord.totalPoints;
  developmentTotalPointsElement.textContent = points;
  currentStreakElement.textContent = formatStreak(streaks.current);
  longestStreakElement.textContent = formatStreak(streaks.longest);

  historyListElement.textContent = '';
  if (historyListElement.children) {
    historyListElement.children.length = 0;
  }

  for (let index = 6; index >= 0; index -= 1) {
    const date = addDays(getTodayKey(), -index);
    const record = dailyHistory[date] || createEmptyDailyRecord(date);
    const item = document.createElement('li');
    const dayName = new Intl.DateTimeFormat('da-DK', { weekday: 'short', day: '2-digit', month: '2-digit' }).format(new Date(`${date}T12:00:00.000Z`));
    item.innerHTML = `<span>${dayName}</span><strong>${record.steps} skridt</strong><span>${getBreathingCount(record)} øvelser</span><strong>${record.totalPoints} point</strong>`;
    historyListElement.appendChild(item);
  }
}

function refreshStepDate() {
  const today = getTodayKey();

  if (stepProgress.date !== today) {
    stepProgress = {
      date: today,
      steps: 0,
      points: 0,
      remainder: 0,
    };
    saveStepProgress();
    syncTodayRecordFromStepProgress();
  }
}

function calculateStepPoints(totalSteps) {
  return Math.floor(totalSteps / STEPS_PER_POINT_BLOCK) * POINTS_PER_STEP_BLOCK;
}

function updateDailySteps(totalSteps) {
  refreshStepDate();

  const safeSteps = Math.max(0, Math.floor(Number(totalSteps) || 0));
  if (safeSteps > HIGH_STEP_WARNING_LIMIT) {
    const shouldSaveHighSteps = window.confirm('Det er et usædvanligt højt antal skridt. Er du sikker på, at tallet er korrekt?');

    if (!shouldSaveHighSteps) {
      stepInput.value = stepProgress.steps;
      return;
    }
  }

  const newStepPoints = calculateStepPoints(safeSteps);
  const pointChange = newStepPoints - stepProgress.points;

  points = Math.max(0, points + pointChange);
  stepProgress = {
    date: getTodayKey(),
    steps: safeSteps,
    points: newStepPoints,
    remainder: safeSteps % STEPS_PER_POINT_BLOCK,
  };

  savePoints();
  saveStepProgress();
  syncTodayRecordFromStepProgress();
  updateWorld();
  updateStepView();
  updateDevelopmentView();
}

function addActivityPoints(pointAmount) {
  points = Math.max(0, points + pointAmount);
  savePoints();
  updateWorld();
  updateDevelopmentView();
}

function getSelectedBreathingExercise() {
  const selectedInput = Array.from(breathingChoiceInputs).find((input) => input.checked);

  return breathingExercises[selectedInput?.value] || breathingExercises.box;
}

function showBreathingPhase() {
  const phase = breathingExercise.phases[breathingPhaseIndex];

  breathingPhaseElement.textContent = `${breathingExercise.label}: ${phase.name}`;
  breathingSecondsElement.textContent = breathingSecondsLeft;
}

function resetBreathingTimer(message = 'Vælg en øvelse og tryk start.') {
  breathingTimerId = null;
  breathingExercise = null;
  breathingPhaseIndex = 0;
  breathingSecondsLeft = 0;
  breathingPhaseElement.textContent = message;
  breathingSecondsElement.textContent = '0';
}

function finishBreathingExercise() {
  window.clearInterval(breathingTimerId);
  const todayRecord = getTodayRecord();
  if (breathingExercise === breathingExercises['478']) {
    todayRecord.breathing478Count += 1;
  } else {
    todayRecord.boxBreathingCount += 1;
  }
  todayRecord.totalPoints += BREATHING_POINTS;
  saveDailyHistory();
  addActivityPoints(BREATHING_POINTS);
  resetBreathingTimer('Godt gået! Du gennemførte øvelsen og fik 10 point.');
}

function tickBreathingTimer() {
  breathingSecondsLeft -= 1;

  if (breathingSecondsLeft > 0) {
    showBreathingPhase();
    return;
  }

  breathingPhaseIndex += 1;

  if (breathingPhaseIndex >= breathingExercise.phases.length) {
    finishBreathingExercise();
    return;
  }

  breathingSecondsLeft = breathingExercise.phases[breathingPhaseIndex].seconds;
  showBreathingPhase();
}

function startBreathingExercise() {
  refreshStepDate();
  updateStepView();
  updateDevelopmentView();

  if (breathingTimerId !== null) {
    window.clearInterval(breathingTimerId);
  }

  breathingExercise = getSelectedBreathingExercise();
  breathingPhaseIndex = 0;
  breathingSecondsLeft = breathingExercise.phases[0].seconds;
  showBreathingPhase();
  breathingTimerId = window.setInterval(tickBreathingTimer, 1000);
}

function stopBreathingExercise() {
  if (breathingTimerId !== null) {
    window.clearInterval(breathingTimerId);
  }

  resetBreathingTimer('Øvelsen blev stoppet. Start igen for at optjene point.');
}

stepUpdateButton.addEventListener('click', () => {
  updateDailySteps(stepInput.value);
});

breathingStartButton.addEventListener('click', startBreathingExercise);
breathingStopButton.addEventListener('click', stopBreathingExercise);

resetButton.addEventListener('click', () => {
  const shouldReset = window.confirm('Er du sikker på, at du vil nulstille dine point?');

  if (!shouldReset) {
    return;
  }

  points = 0;
  stepProgress = {
    date: getTodayKey(),
    steps: 0,
    points: 0,
    remainder: 0,
  };
  localStorage.removeItem(POINTS_STORAGE_KEY);
  localStorage.removeItem(STEP_PROGRESS_STORAGE_KEY);
  updateWorld();
  localStorage.removeItem(DAILY_HISTORY_STORAGE_KEY);
  dailyHistory = {};
  syncTodayRecordFromStepProgress();
  updateStepView();
  updateDevelopmentView();
  resetBreathingTimer();
});

refreshStepDate();
syncTodayRecordFromStepProgress();
updateWorld();
updateStepView();
updateDevelopmentView();
resetBreathingTimer();
