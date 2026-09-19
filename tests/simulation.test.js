import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Simulation, FLOW_G_PER_S } from '../src/simulation.js';
import { parseParams, DEFAULT_PARAMS } from '../src/firmware-params.js';
import { hitTest } from '../src/hmi-screen.js';

const read = name => readFileSync(new URL(`../Code_Board/Arduino_IDE/${name}`, import.meta.url), 'utf8');
const mainSrc = read('esp32_main_dispenser/esp32_main_dispenser.ino');
const displaySrc = read('esp32_touch_hmi_ui/esp32_touch_hmi_ui.ino');
const params = () => parseParams(mainSrc, displaySrc);
const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);

// Boots the cabinet and advances to the recipe-select screen.
function booted(p = params()) {
  const sim = new Simulation(p);
  assert.equal(sim.screen, 'BOOT');
  sim.tick(2);
  assert.equal(sim.screen, 'RECIPE_SELECT');
  return sim;
}
function start(sim, recipe) {
  assert.ok(sim.press(String(recipe)));
  assert.equal(sim.screen, 'RECIPE_DETAIL');
  assert.ok(sim.press('CONFIRM'));
  assert.equal(sim.screen, 'MIXING');
}

test('numbers are read from the shipped sketches and match the firmware', () => {
  const p = params();
  assert.deepEqual(p.warnings, []);
  assert.deepEqual(p.targetG, [[460, 0, 0], [150, 150, 150], [120, 240, 120]]);
  assert.deepEqual(p.npk, [[46, 0, 0], [15, 15, 15], [12, 24, 12]]);
  assert.deepEqual(p.offsetG, [[0, 0, 0], [0, 0, 0], [0, 0, 0]]);
  assert.equal(p.stirMs, 5000);
  assert.equal(p.weightHardLimitG, 1250);
  assert.deepEqual(p.targetG, DEFAULT_PARAMS.targetG);
});

test('a sketch that cannot be parsed falls back to the shipped numbers and says so', () => {
  const p = parseParams('void setup(){}', 'void loop(){}');
  assert.deepEqual(p.targetG, DEFAULT_PARAMS.targetG);
  assert.ok(p.warnings.includes('RECIPE_TARGET_G') && p.warnings.includes('STIR_DURATION_MS'));
});

test('boots to the recipe screen; recipe buttons only work on the two recipe screens', () => {
  const sim = booted();
  assert.equal(sim.press('CONFIRM'), true);          // green 4 on the select screen = emergency release prompt
  assert.equal(sim.screen, 'EMERGENCY_CONFIRM');
  sim.press('CONFIRM');                               // pressing it again confirms
  sim.tick(3);
  assert.equal(sim.screen, 'RECIPE_SELECT');
  sim.press('2');
  assert.equal(sim.selectedRecipe, 2);
  sim.press('3');                                     // re-select while on the detail screen
  assert.equal(sim.selectedRecipe, 3);
  assert.equal(sim.screen, 'RECIPE_DETAIL');
  sim.press('CONFIRM');                               // start
  assert.equal(sim.screen, 'MIXING');
  assert.equal(sim.press('1'), false);                // ignored while mixing
  assert.equal(sim.selectedRecipe, 3);
});

test('every recipe dispenses N then P then K to its own target, skipping zero targets', () => {
  const p = params();
  for (let recipe = 1; recipe <= 3; recipe++) {
    const sim = booted(p);
    start(sim, recipe);
    const targets = p.targetG[recipe - 1];
    const order = [];
    for (let i = 0; i < 60000 && sim.screen === 'MIXING'; i++) {
      sim.tick(0.01);
      if (sim.valve >= 0 && order.at(-1) !== sim.valve) order.push(sim.valve);
    }
    assert.equal(sim.screen, 'MIX_DONE');
    assert.deepEqual(order, [0, 1, 2].filter(i => targets[i] > 0));
    targets.forEach((target, i) => near(sim.dispensedG[i], target, 1e-3));
    near(sim.chamberG, targets[0] + targets[1] + targets[2], 1e-3);
    assert.equal(sim.motor, false);
    assert.equal(sim.stage, 'MIX_DONE_WAITING_RELEASE');
  }
});

test('the gate closes at target - CALIBRATION_OFFSET_G and the offset shows up in the settled weight', () => {
  const p = params();
  p.offsetG = [[0, 0, 0], [40, 0, 25], [0, 0, 0]];
  const sim = booted(p);
  start(sim, 2);
  sim.tick(60);
  assert.equal(sim.screen, 'MIX_DONE');
  near(sim.dispensedG[0], 110, 1e-3); // 150 - 40
  near(sim.dispensedG[1], 150, 1e-3);
  near(sim.dispensedG[2], 125, 1e-3); // 150 - 25
  const line = sim.log.map(l => l.text).find(t => t.startsWith('Ingredient N: closed at'));
  assert.match(line, /closed at 110\.0 g, settled at 110\.0 g \(target 150, error -40\.0 g\)/);
});

test('timing: tare, dose at the assumed flow, settle, then stir for STIR_DURATION_MS', () => {
  const sim = booted();
  start(sim, 1);
  assert.equal(sim.mixPhase, 3);
  sim.tick(1.0);                                     // tare + first stable reading
  assert.equal(sim.valve, 0);
  sim.tick(2);
  near(sim.dispensedG[0], 2 * FLOW_G_PER_S, 1e-6);
  sim.tick(460 / FLOW_G_PER_S - 2);                  // reaches 460 g
  assert.equal(sim.valve, -1);
  assert.equal(sim.mixPhase, 3);                     // settling
  sim.tick(0.5);
  assert.equal(sim.mixPhase, 4);
  assert.equal(sim.motor, true);
  sim.tick(4.9);
  assert.equal(sim.screen, 'MIXING');
  sim.tick(0.2);
  assert.equal(sim.screen, 'MIX_DONE');
  assert.equal(sim.motor, false);
});

test('release empties the container and returns to recipe select; nothing starts by itself', () => {
  const sim = booted();
  start(sim, 2);
  sim.tick(60);
  assert.equal(sim.screen, 'MIX_DONE');
  assert.ok(sim.press('CONFIRM'));
  assert.equal(sim.releasing !== null, true);
  assert.equal(sim.press('CONFIRM'), false);          // blocked while the gate is open
  sim.tick(1);
  near(sim.chamberG, 225, 1e-6);
  sim.tick(1.1);
  assert.equal(sim.screen, 'RECIPE_SELECT');
  near(sim.chamberG, 0);
  near(sim.outputG, 450, 1e-6);
  assert.equal(sim.stage, 'IDLE');
  sim.tick(100);
  assert.equal(sim.screen, 'RECIPE_SELECT');
});

test('E-Stop mid-recipe stops gates and motor, shows ESTOP, and returns to recipe select by itself when released', () => {
  for (const at of [0.5, 2, 3.4, 4.2, 5.5, 8]) {
    const sim = booted();
    start(sim, 1);
    sim.tick(at);
    sim.setEstop(true);
    assert.equal(sim.screen, 'ESTOP', `at ${at}s`);
    assert.equal(sim.run, null);
    assert.equal(sim.valve, -1);
    assert.equal(sim.motor, false);
    assert.equal(sim.stage, 'IDLE');
    const snapshot = JSON.stringify([sim.dispensedG, sim.chamberG]);
    sim.tick(1000);
    assert.equal(JSON.stringify([sim.dispensedG, sim.chamberG]), snapshot);
    assert.equal(sim.press('CONFIRM'), false);
    sim.setEstop(false);
    assert.equal(sim.screen, 'RECIPE_SELECT');
    sim.tick(100);
    assert.equal(sim.screen, 'RECIPE_SELECT');        // nothing restarts on its own
  }
});

test('E-Stop pressed on any idle screen shows the stop screen; the motor is dead while it is latched', () => {
  const sim = booted();
  sim.press('1');
  sim.setEstop(true);
  assert.equal(sim.screen, 'ESTOP');
  assert.equal(sim.motor, false);
  sim.setEstop(false);
  assert.equal(sim.screen, 'RECIPE_SELECT');
});

test('E-Stop during the release aborts it', () => {
  const sim = booted();
  start(sim, 3);
  sim.tick(60);
  sim.press('CONFIRM');
  sim.tick(0.5);
  sim.setEstop(true);
  assert.equal(sim.screen, 'ESTOP');
  assert.equal(sim.releasing, null);
  assert.ok(sim.chamberG > 0 && sim.chamberG < 480);
});

test('the force-release prompt cancels itself after EMERGENCY_CONFIRM_TIMEOUT_MS', () => {
  const sim = booted();
  sim.press('CONFIRM');
  assert.equal(sim.screen, 'EMERGENCY_CONFIRM');
  sim.tick(9.9);
  assert.equal(sim.screen, 'EMERGENCY_CONFIRM');
  sim.tick(0.2);
  assert.equal(sim.screen, 'RECIPE_SELECT');
  sim.press('CONFIRM');
  assert.ok(hitTest(sim, 220, 150) === 'NO');
  sim.command('NO');
  assert.equal(sim.screen, 'RECIPE_SELECT');
});

test('power lost while mixing shows Power Recovery; power lost at MIX_DONE returns to MIX_DONE', () => {
  const sim = booted();
  start(sim, 1);
  sim.tick(3);
  sim.powerCycle();
  assert.equal(sim.run, null);
  sim.tick(2);
  assert.equal(sim.screen, 'POWER_RECOVERY');
  assert.equal(sim.selectedRecipe, 1);
  sim.command('DISCARD');
  assert.equal(sim.screen, 'RECIPE_SELECT');
  assert.equal(sim.stage, 'IDLE');

  const done = booted();
  start(done, 2);
  done.tick(60);
  done.powerCycle();
  done.tick(2);
  assert.equal(done.screen, 'MIX_DONE');
  assert.equal(done.selectedRecipe, 2);
});

test('a recipe over the hard weight limit closes the gate and shows the overweight fault', () => {
  const p = params();
  p.targetG = [[1300, 0, 0], [150, 150, 150], [120, 240, 120]];
  const sim = booted(p);
  start(sim, 1);
  sim.tick(60);
  assert.equal(sim.screen, 'FAULT');
  assert.equal(sim.faultKind, 2);
  assert.equal(sim.valve, -1);
  assert.ok(sim.chamberG <= 1251);
  sim.press('CONFIRM');                               // OK
  assert.equal(sim.screen, 'RECIPE_SELECT');
});

test('a running batch keeps the numbers it started with when the code is edited', () => {
  const p = params();
  const sim = booted(p);
  start(sim, 1);
  sim.tick(2);
  const edited = params();
  edited.targetG = [[100, 0, 0], [150, 150, 150], [120, 240, 120]];
  sim.setParams(edited);
  sim.tick(60);
  near(sim.dispensedG[0], 460, 1e-3);
  sim.press('CONFIRM'); sim.tick(3);
  start(sim, 1);
  sim.tick(60);
  near(sim.dispensedG[0], 100, 1e-3);
});

test('taps on the display map to the same commands the sketch sends', () => {
  const sim = booted();
  assert.equal(hitTest(sim, 160, 80), '1');
  assert.equal(hitTest(sim, 160, 120), '2');
  assert.equal(hitTest(sim, 160, 160), '3');
  assert.equal(hitTest(sim, 160, 200), 'EMERGENCY');
  assert.equal(hitTest(sim, 5, 5), null);
  sim.command('1');
  assert.equal(hitTest(sim, 160, 100), 'TOP');
  assert.equal(hitTest(sim, 160, 170), 'BOTTOM');
  sim.command('TOP');
  assert.equal(hitTest(sim, 160, 100), null);         // ignored while mixing
});

test('non-finite or non-positive time steps change nothing; accelerated time matches real time', () => {
  const a = booted(), b = booted();
  start(a, 3); start(b, 3);
  a.tick(NaN); a.tick(-1); a.tick(0);
  a.tick(12);
  for (let i = 0; i < 120; i++) b.tick(0.1);
  assert.equal(a.mixPhase, b.mixPhase);
  near(a.chamberG, b.chamberG, 1e-4);
  const fast = booted(); fast.speed = 4; start(fast, 3); fast.tick(3);
  near(fast.chamberG, a.chamberG, 1e-4);
});

test('every display screen draws without error (fake canvas)', async () => {
  const { drawHmi } = await import('../src/hmi-screen.js');
  const calls = [];
  const ctx = new Proxy({}, {
    get: (_, name) => (name === 'measureText' ? () => ({ width: 10 }) : (...args) => calls.push([name, ...args])),
    set: () => true,
  });
  const sim = booted();
  const seen = new Set();
  const draw = () => { drawHmi(ctx, sim, 2); seen.add(sim.faultKind + sim.screen); };
  draw();                                             // RECIPE_SELECT
  sim.press('1'); draw();                              // RECIPE_DETAIL
  sim.press('CONFIRM'); sim.tick(3); draw();          // MIXING
  sim.tick(60); draw();                               // MIX_DONE
  sim.press('CONFIRM'); draw(); sim.tick(3);          // "Dispensing..."
  sim.press('CONFIRM'); draw(); sim.command('NO');    // EMERGENCY_CONFIRM
  sim.setEstop(true); draw(); sim.setEstop(false);    // ESTOP
  start(sim, 1); sim.tick(2); sim.powerCycle(); draw(); sim.tick(2); draw(); // BOOT, POWER_RECOVERY
  sim.command('DISCARD');
  const p = params(); p.targetG = [[1300, 0, 0], [150, 150, 150], [120, 240, 120]];
  const faulty = booted(p); start(faulty, 1); faulty.tick(60);
  drawHmi(ctx, faulty, 2);                            // FAULT
  assert.equal(faulty.screen, 'FAULT');
  assert.ok(calls.length > 100);
  assert.ok(seen.size >= 7, `screens drawn: ${[...seen]}`);
});
