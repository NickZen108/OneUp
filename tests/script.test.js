const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function createElement() {
  const listeners = {};

  return {
    className: '',
    textContent: '',
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
  };
}

function loadApp({ savedPoints = null, confirmResult = true } = {}) {
  const points = createElement();
  const world = createElement();
  const message = createElement();
  const person = createElement();
  const animal = createElement();
  const reset = createElement();
  const completeButtons = [createElement(), createElement()];
  const root = createElement();
  const storage = new Map();

  if (savedPoints !== null) {
    storage.set('oneup-points', String(savedPoints));
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
      }[selector];
    },
    querySelectorAll(selector) {
      return selector === '.complete-button' ? completeButtons : [];
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
    },
    window: {
      confirm() {
        return confirmResult;
      },
    },
  };

  vm.runInNewContext(fs.readFileSync('script.js', 'utf8'), context);

  return { points, world, message, person, animal, reset, completeButtons, root, storage };
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
  const app = loadApp({ savedPoints: 10 });

  app.completeButtons[0].listeners.click();

  assert.equal(app.points.textContent, 20);
  assert.equal(app.storage.get('oneup-points'), '20');
  assert.equal(app.world.className, 'world level-1');
}

{
  const app = loadApp({ savedPoints: 50, confirmResult: false });

  app.reset.listeners.click();

  assert.equal(app.points.textContent, 50);
  assert.equal(app.storage.get('oneup-points'), '50');
}

{
  const app = loadApp({ savedPoints: 50, confirmResult: true });

  app.reset.listeners.click();

  assert.equal(app.points.textContent, 0);
  assert.equal(app.storage.get('oneup-points'), '0');
  assert.equal(app.world.className, 'world');
  assert.equal(app.message.textContent, 'Start roligt. Hver lille handling tæller.');
}
