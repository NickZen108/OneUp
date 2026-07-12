const POINTS_STORAGE_KEY = 'oneupPoints';
const STEP_PROGRESS_STORAGE_KEY = 'oneupStepProgress';
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

let points = readSavedPoints();
let stepProgress = readStepProgress();
let breathingTimerId = null;
let breathingExercise = null;
let breathingPhaseIndex = 0;
let breathingSecondsLeft = 0;

const worldLevels = [
  {
    minimumPoints: 0,
    beauty: 0,
    rainbow: 0,
    message: 'Start roligt. Hver lille handling tæller.',
    personFace: '🙂',
    animalFace: '🐶',
    className: '',
  },
  {
    minimumPoints: 10,
    beauty: 0.28,
    rainbow: 0.25,
    message: 'Dejligt! Verdenen føles allerede lidt lysere.',
    personFace: '😊',
    animalFace: '🐶',
    className: 'level-1',
  },
  {
    minimumPoints: 30,
    beauty: 0.62,
    rainbow: 0.55,
    message: 'Fantastisk. Mennesker og dyr bliver mere rolige.',
    personFace: '😄',
    animalFace: '🐕',
    className: 'level-2',
  },
  {
    minimumPoints: 50,
    beauty: 1,
    rainbow: 0.95,
    message: 'Hvor er det omsorgsfuldt! Din verden stråler.',
    personFace: '🥰',
    animalFace: '🐕‍🦺',
    className: 'level-3',
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
  }
}

function calculateStepPoints(totalSteps) {
  return Math.floor(totalSteps / STEPS_PER_POINT_BLOCK) * POINTS_PER_STEP_BLOCK;
}

function updateDailySteps(totalSteps) {
  refreshStepDate();

  const safeSteps = Math.max(0, Math.floor(Number(totalSteps) || 0));
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
  updateWorld();
  updateStepView();
}

function addActivityPoints(pointAmount) {
  points = Math.max(0, points + pointAmount);
  savePoints();
  updateWorld();
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
  updateStepView();
  resetBreathingTimer();
});

refreshStepDate();
updateWorld();
updateStepView();
resetBreathingTimer();
