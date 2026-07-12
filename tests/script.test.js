const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function createElement(extra = {}) {
  const listeners = {};

  return {
    className: '',
    textContent: '',
    value: '',
    checked: false,
    listeners,
    style: {
      values: {},
      setProperty(name, value) {
        this.values[name] = value;
      },
    },
    children: [],
    innerHTML: '',
    addEventListener(eventName, handler) {
      listeners[eventName] = handler;
    },
    appendChild(child) {
      this.children.push(child);
    },
    ...extra,
  };
}

function loadApp({ savedPoints = null, confirmResult = true, existingStorage = null, today = '2026-07-12' } = {}) {
  const points = createElement();
  const world = createElement();
  const message = createElement();
  const person = createElement();
  const animal = createElement();
  const reset = createElement();
  const stepInput = createElement({ value: '0' });
  const stepUpdate = createElement();
  const stepsToday = createElement();
  const stepPointsToday = createElement();
  const stepsToNextPoint = createElement();
  const boxChoice = createElement({ value: 'box', checked: true });
  const breathing478Choice = createElement({ value: '478', checked: false });
  const breathingPhase = createElement();
  const breathingSeconds = createElement();
  const breathingStart = createElement();
  const breathingStop = createElement();
  const developmentStepsToday = createElement();
  const developmentBreathingToday = createElement();
  const developmentPointsToday = createElement();
  const developmentTotalPoints = createElement();
  const currentStreak = createElement();
  const longestStreak = createElement();
  const historyList = createElement();
  const root = createElement();
  const storage = existingStorage ?? new Map();
  const intervals = new Map();
  let nextIntervalId = 1;
  let currentToday = today;
  let lastConfirmMessage = null;

  if (savedPoints !== null) {
    storage.set('oneupPoints', String(savedPoints));
  }

  const document = {
    documentElement: root,
    createElement() {
      return createElement();
    },
    querySelector(selector) {
      return {
        '#points': points,
        '#world': world,
        '#world-message': message,
        '#person-face': person,
        '#animal-face': animal,
        '#reset-points': reset,
        '#step-count': stepInput,
        '#update-steps': stepUpdate,
        '#steps-today': stepsToday,
        '#step-points-today': stepPointsToday,
        '#steps-to-next-point': stepsToNextPoint,
        '#breathing-phase': breathingPhase,
        '#breathing-seconds': breathingSeconds,
        '#start-breathing': breathingStart,
        '#stop-breathing': breathingStop,
        '#development-steps-today': developmentStepsToday,
        '#development-breathing-today': developmentBreathingToday,
        '#development-points-today': developmentPointsToday,
        '#development-total-points': developmentTotalPoints,
        '#current-streak': currentStreak,
        '#longest-streak': longestStreak,
        '#history-list': historyList,
      }[selector];
    },
    querySelectorAll(selector) {
      return selector === 'input[name="breathing-exercise"]' ? [boxChoice, breathing478Choice] : [];
    },
  };

  const context = {
    document,
    localStorage: {
      getItem(key) {
        return storage.has(key) ? storage.get(key) : null;
      },
      setItem(key, value) {
        storage.set(key, value);
      },
      removeItem(key) {
        storage.delete(key);
      },
    },
    window: {
      __oneUpNow() {
        return new Date(`${currentToday}T12:00:00.000Z`);
      },
      confirm(message) {
        lastConfirmMessage = message;
        return confirmResult;
      },
      setInterval(handler) {
        const intervalId = nextIntervalId;
        nextIntervalId += 1;
        intervals.set(intervalId, handler);
        return intervalId;
      },
      clearInterval(intervalId) {
        intervals.delete(intervalId);
      },
    },
  };

  vm.runInNewContext(fs.readFileSync('script.js', 'utf8'), context);

  return {
    points,
    world,
    message,
    person,
    animal,
    reset,
    stepInput,
    stepUpdate,
    stepsToday,
    stepPointsToday,
    stepsToNextPoint,
    boxChoice,
    breathing478Choice,
    breathingPhase,
    breathingSeconds,
    breathingStart,
    breathingStop,
    developmentStepsToday,
    developmentBreathingToday,
    developmentPointsToday,
    developmentTotalPoints,
    currentStreak,
    longestStreak,
    historyList,
    root,
    storage,
    get lastConfirmMessage() {
      return lastConfirmMessage;
    },
    setToday(newToday) {
      currentToday = newToday;
    },
    tick(seconds = 1) {
      for (let index = 0; index < seconds; index += 1) {
        Array.from(intervals.values()).forEach((handler) => handler());
      }
    },
  };
}

{
  const app = loadApp({ savedPoints: 30 });

  assert.equal(app.points.textContent, 30);
  assert.equal(app.world.className, 'world village level-3');
  assert.equal(app.message.textContent, 'Niveau 3: Glæde. Farverne bliver klarere, og verdenen fyldes med leg og liv.');
  assert.equal(app.person.textContent, '😄');
  assert.equal(app.animal.textContent, '🐕');
}

{
  const app = loadApp({ savedPoints: 80 });

  assert.equal(app.world.className, 'world village level-5');
  assert.equal(app.message.textContent, 'Niveau 5: Harmoni. Fællesskab, natur og varmt lys skaber en fredelig balance.');
  assert.equal(app.person.textContent, '😍');
  assert.equal(app.root.style.values['--rainbow-strength'], 0.95);
}

{
  const app = loadApp({ savedPoints: 'not-a-number' });

  assert.equal(app.points.textContent, 0);
  assert.equal(app.world.className, 'world village level-1');
  assert.equal(app.message.textContent, 'Niveau 1: Spire. Verdenen er stille, men håbet spirer stille frem.');
}

{
  const app = loadApp({ savedPoints: 10 });

  app.stepInput.value = '2000';
  app.stepUpdate.listeners.click();

  assert.equal(app.points.textContent, 30);
  assert.equal(app.storage.get('oneupPoints'), '30');
  assert.equal(app.stepsToday.textContent, 2000);
  assert.equal(app.stepPointsToday.textContent, 20);
  assert.equal(app.stepsToNextPoint.textContent, 100);
}

{
  const app = loadApp({ savedPoints: 0 });

  app.stepInput.value = '2000';
  app.stepUpdate.listeners.click();
  app.stepInput.value = '5500';
  app.stepUpdate.listeners.click();

  assert.equal(app.points.textContent, 55);
  assert.equal(app.stepPointsToday.textContent, 55);
  assert.equal(app.stepsToNextPoint.textContent, 100);
}

{
  const app = loadApp({ savedPoints: 0 });

  app.stepInput.value = '5500';
  app.stepUpdate.listeners.click();
  app.stepInput.value = '4000';
  app.stepUpdate.listeners.click();

  assert.equal(app.points.textContent, 40);
  assert.equal(app.stepPointsToday.textContent, 40);
  assert.equal(app.stepsToNextPoint.textContent, 100);
}

{
  const app = loadApp({ savedPoints: 5 });

  app.stepInput.value = '4000';
  app.stepUpdate.listeners.click();
  app.stepInput.value = '0';
  app.stepUpdate.listeners.click();

  assert.equal(app.points.textContent, 5);
  assert.equal(app.stepPointsToday.textContent, 0);
}

{
  const app = loadApp({ savedPoints: 0, today: '2026-07-12' });

  app.stepInput.value = '3000';
  app.stepUpdate.listeners.click();
  app.setToday('2026-07-13');
  app.stepInput.value = '1000';
  app.stepUpdate.listeners.click();

  assert.equal(app.points.textContent, 40);
  assert.equal(app.stepsToday.textContent, 1000);
  assert.equal(app.stepPointsToday.textContent, 10);
}

{
  const firstSession = loadApp({ savedPoints: 10 });

  firstSession.stepInput.value = '2500';
  firstSession.stepUpdate.listeners.click();
  const reopenedSession = loadApp({ existingStorage: firstSession.storage });

  assert.equal(reopenedSession.points.textContent, 35);
  assert.equal(reopenedSession.world.className, 'world village level-3');
  assert.equal(reopenedSession.stepsToday.textContent, 2500);
  assert.equal(reopenedSession.stepPointsToday.textContent, 25);
  assert.equal(reopenedSession.storage.get('oneupPoints'), '35');
}

{
  const app = loadApp({ savedPoints: 0 });

  app.breathingStart.listeners.click();
  assert.match(app.breathingPhase.textContent, /Box breathing/);
  app.tick(16);

  assert.equal(app.points.textContent, 5);
  assert.match(app.breathingPhase.textContent, /Box breathing/);
}

{
  const app = loadApp({ savedPoints: 0 });

  app.boxChoice.checked = false;
  app.breathing478Choice.checked = true;
  app.breathingStart.listeners.click();
  assert.match(app.breathingPhase.textContent, /4-7-8 breathing/);
  app.tick(19);

  assert.equal(app.points.textContent, 5);
}

{
  const app = loadApp({ savedPoints: 0 });

  app.breathingStart.listeners.click();
  app.tick(3);
  app.breathingStop.listeners.click();
  app.tick(30);

  assert.equal(app.points.textContent, 0);
  assert.match(app.breathingPhase.textContent, /stoppet/);
}

{
  const app = loadApp({ savedPoints: 50, confirmResult: false });

  app.reset.listeners.click();

  assert.equal(app.points.textContent, 50);
  assert.equal(app.storage.get('oneupPoints'), '50');
}

{
  const app = loadApp({ savedPoints: 50, confirmResult: true });

  app.stepInput.value = '2000';
  app.stepUpdate.listeners.click();
  app.reset.listeners.click();

  assert.equal(app.points.textContent, 0);
  assert.equal(app.storage.has('oneupPoints'), false);
  assert.equal(app.storage.has('oneupStepProgress'), false);
  assert.equal(app.world.className, 'world village level-1');
  assert.equal(app.message.textContent, 'Niveau 1: Spire. Verdenen er stille, men håbet spirer stille frem.');
}

{
  const app = loadApp({ savedPoints: 0 });

  app.stepInput.value = '1500';
  app.stepUpdate.listeners.click();
  app.stepInput.value = '2600';
  app.stepUpdate.listeners.click();

  const history = JSON.parse(app.storage.get('oneupDailyHistory'));
  assert.equal(history['2026-07-12'].steps, 2600);
  assert.equal(history['2026-07-12'].stepPoints, 26);
  assert.equal(history['2026-07-12'].totalPoints, 26);
  assert.equal(app.developmentStepsToday.textContent, 2600);
  assert.equal(app.developmentPointsToday.textContent, 26);
  assert.equal(app.developmentTotalPoints.textContent, 26);
}

{
  const app = loadApp({ savedPoints: 0 });

  app.stepInput.value = '5000';
  app.stepUpdate.listeners.click();
  app.stepInput.value = '1200';
  app.stepUpdate.listeners.click();

  const history = JSON.parse(app.storage.get('oneupDailyHistory'));
  assert.equal(app.points.textContent, 12);
  assert.equal(history['2026-07-12'].steps, 1200);
  assert.equal(history['2026-07-12'].stepPoints, 12);
  assert.equal(history['2026-07-12'].totalPoints, 12);
}

{
  const app = loadApp({ savedPoints: 0, confirmResult: false });

  app.stepInput.value = '70000';
  app.stepUpdate.listeners.click();

  assert.match(app.lastConfirmMessage, /usædvanligt højt antal skridt/);
  assert.equal(app.points.textContent, 0);
  assert.equal(app.stepsToday.textContent, 0);
}

{
  const app = loadApp({ savedPoints: 0, confirmResult: true });

  app.stepInput.value = '70000';
  app.stepUpdate.listeners.click();

  assert.equal(app.points.textContent, 700);
  assert.equal(app.stepsToday.textContent, 70000);
}

{
  const app = loadApp({ savedPoints: 0 });

  app.breathingStart.listeners.click();
  app.tick(16);
  app.boxChoice.checked = false;
  app.breathing478Choice.checked = true;
  app.breathingStart.listeners.click();
  app.tick(19);

  const history = JSON.parse(app.storage.get('oneupDailyHistory'));
  assert.equal(history['2026-07-12'].boxBreathingCount, 1);
  assert.equal(history['2026-07-12'].breathing478Count, 1);
  assert.equal(history['2026-07-12'].totalPoints, 10);
  assert.equal(app.developmentBreathingToday.textContent, 2);
}

{
  const app = loadApp({ savedPoints: 0, today: '2026-07-10' });

  app.stepInput.value = '1000';
  app.stepUpdate.listeners.click();
  app.setToday('2026-07-11');
  app.stepInput.value = '1000';
  app.stepUpdate.listeners.click();
  app.setToday('2026-07-12');
  app.breathingStart.listeners.click();
  app.tick(16);

  const history = JSON.parse(app.storage.get('oneupDailyHistory'));
  assert.equal(history['2026-07-10'].steps, 1000);
  assert.equal(history['2026-07-11'].steps, 1000);
  assert.equal(history['2026-07-12'].boxBreathingCount, 1);
  assert.equal(app.currentStreak.textContent, '3 dage');
  assert.equal(app.longestStreak.textContent, '3 dage');
  assert.equal(app.historyList.children.length, 7);
}

{
  const firstSession = loadApp({ savedPoints: 7 });

  firstSession.stepInput.value = '1100';
  firstSession.stepUpdate.listeners.click();
  firstSession.breathingStart.listeners.click();
  firstSession.tick(16);

  const reopenedSession = loadApp({ existingStorage: firstSession.storage });
  assert.equal(reopenedSession.developmentStepsToday.textContent, 1100);
  assert.equal(reopenedSession.developmentBreathingToday.textContent, 1);
  assert.equal(reopenedSession.developmentPointsToday.textContent, 16);
  assert.equal(reopenedSession.developmentTotalPoints.textContent, 23);
}

{
  const storage = new Map();
  storage.set('oneupPoints', '42');
  const app = loadApp({ existingStorage: storage });

  assert.equal(app.points.textContent, 42);
  assert.equal(app.developmentTotalPoints.textContent, 42);
  assert.ok(app.storage.get('oneupDailyHistory'));
}


{
  const source = fs.readFileSync('script.js', 'utf8');
  assert.match(source, /stableClasses\.add\('village'\)/);
  assert.match(source, /scrollIntoView\?\.\(\{ behavior: 'smooth', block: 'start' \}\)/);
}

{
  const source = fs.readFileSync('script.js', 'utf8');
  assert.match(source, /function showPage\(page\)/);
  assert.match(source, /page === 'village' && world/);
  assert.match(source, /world\.classList\?\.add\('world', 'village'\)/);
  assert.match(source, /if \(world\.style\?\.display === 'none'\) world\.style\.display = ''/);
}

{
  const source = fs.readFileSync('script.js', 'utf8');
  assert.match(source, /function findMissionDetailsElement\(id\)/);
  assert.match(source, /function isElementReadyForScroll\(element\)/);
  assert.match(source, /requestAnimationFrame/);
  assert.match(source, /scrollIntoView\?\.\(\{ behavior: 'smooth', block: 'start' \}\)/);
  assert.match(source, /console\.log\?\.\('mission valgt'/);
  assert.match(source, /console\.log\?\.\('fanen skiftet'/);
  assert.match(source, /console\.log\?\.\('detaljeelement fundet'/);
  assert.match(source, /console\.log\?\.\('scroll udført'/);
}
