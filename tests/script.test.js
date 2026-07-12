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
    addEventListener(eventName, handler) {
      listeners[eventName] = handler;
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
  const root = createElement();
  const storage = existingStorage ?? new Map();
  const intervals = new Map();
  let nextIntervalId = 1;
  let currentToday = today;

  if (savedPoints !== null) {
    storage.set('oneupPoints', String(savedPoints));
  }

  const document = {
    documentElement: root,
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
      confirm() {
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
    root,
    storage,
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
  assert.equal(app.world.className, 'world level-2');
  assert.equal(app.message.textContent, 'Fantastisk. Mennesker og dyr bliver mere rolige.');
  assert.equal(app.person.textContent, '😄');
  assert.equal(app.animal.textContent, '🐕');
}

{
  const app = loadApp({ savedPoints: 'not-a-number' });

  assert.equal(app.points.textContent, 0);
  assert.equal(app.world.className, 'world');
  assert.equal(app.message.textContent, 'Start roligt. Hver lille handling tæller.');
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
  assert.equal(reopenedSession.world.className, 'world level-2');
  assert.equal(reopenedSession.stepsToday.textContent, 2500);
  assert.equal(reopenedSession.stepPointsToday.textContent, 25);
  assert.equal(reopenedSession.storage.get('oneupPoints'), '35');
}

{
  const app = loadApp({ savedPoints: 0 });

  app.breathingStart.listeners.click();
  assert.match(app.breathingPhase.textContent, /Box breathing/);
  app.tick(16);

  assert.equal(app.points.textContent, 10);
  assert.match(app.breathingPhase.textContent, /gennemførte/);
}

{
  const app = loadApp({ savedPoints: 0 });

  app.boxChoice.checked = false;
  app.breathing478Choice.checked = true;
  app.breathingStart.listeners.click();
  assert.match(app.breathingPhase.textContent, /4-7-8 breathing/);
  app.tick(19);

  assert.equal(app.points.textContent, 10);
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
  assert.equal(app.world.className, 'world');
  assert.equal(app.message.textContent, 'Start roligt. Hver lille handling tæller.');
}
