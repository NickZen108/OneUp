const POINTS_STORAGE_KEY = 'oneupPoints';

const pointsElement = document.querySelector('#points');
const worldElement = document.querySelector('#world');
const worldMessageElement = document.querySelector('#world-message');
const personFaceElement = document.querySelector('#person-face');
const animalFaceElement = document.querySelector('#animal-face');
const buttons = document.querySelectorAll('.complete-button');
const resetButton = document.querySelector('#reset-points');

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

let points = readSavedPoints();

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

buttons.forEach((button) => {
  button.addEventListener('click', () => {
    points += 10;
    savePoints();
    updateWorld();
  });
});

resetButton.addEventListener('click', () => {
  const shouldReset = window.confirm('Er du sikker på, at du vil nulstille dine point?');

  if (!shouldReset) {
    return;
  }

  points = 0;
  localStorage.removeItem(POINTS_STORAGE_KEY);
  updateWorld();
});

updateWorld();
