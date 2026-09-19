import { DEFAULT_PARAMS } from './firmware-params.js';

// The cabinet follows esp32_main_dispenser.ino step by step: same screens, same
// button handling, same N -> P -> K order, same "close the gate at
// target - CALIBRATION_OFFSET_G, then wait for the weight to settle" rule, then
// the stirring motor and a manual release. Every tunable number comes from the
// sketch itself (see firmware-params.js). The only things the sketch cannot
// tell us are the physical ones below, so they are stated here as assumptions.

// Assumed hopper flow while a gate is open. Not measured on the real machine.
export const FLOW_G_PER_S = 100;
// Grams that keep falling after the gate closes. 0 = the settled weight equals
// the close weight, which is what the calibration offset is meant to correct.
export const AIR_CARRY_G = 0;

const TARE_S = 1.0;      // tare(5) + first stable reading
const SETTLE_S = 0.5;    // STABLE_WINDOW_READINGS (5) at the HX711's 10 Hz
const RELEASE_S = 2.0;   // waitInterruptible(2000) in runRelease()
const BOOT_S = 1.5;      // display "Loading..." animation
const INGREDIENT_CHANNEL = [0, 4, 8];
export const INGREDIENT_NAME = ['N', 'P', 'K'];

export const phaseText = ['Dispensing N', 'Dispensing P', 'Dispensing K', 'Settling...', 'Stirring...', 'Done'];
export const phaseLabels = ['กำลังจ่ายวัตถุดิบ N', 'กำลังจ่ายวัตถุดิบ P', 'กำลังจ่ายวัตถุดิบ K', 'รอค่าน้ำหนักนิ่ง', 'กำลังกวนผสม', 'ผสมเสร็จ'];
export const screenLabels = {
  BOOT: 'กำลังเปิดเครื่อง', RECIPE_SELECT: 'เลือกสูตร', RECIPE_DETAIL: 'ยืนยันสูตร', MIXING: 'กำลังผสม',
  MIX_DONE: 'ผสมเสร็จ · รอปล่อย', POWER_RECOVERY: 'กู้คืนหลังไฟดับ', EMERGENCY_CONFIRM: 'ยืนยันปล่อยฉุกเฉิน',
  ESTOP: 'EMERGENCY STOP', FAULT: 'FAULT',
};
export const faultNames = ['FAULT_SCALE', 'FAULT_TIMEOUT', 'FAULT_OVERWEIGHT'];

const gramsForDisplay = grams => (grams < 0 ? 0 : Math.floor(grams + 0.5));
const fixed = (value, digits = 1) => value.toFixed(digits);

export class Simulation {
  constructor(params = DEFAULT_PARAMS) {
    this.params = params;
    this.speed = 1;
    this.chamberG = 0;   // grams really sitting in the mixing container
    this.outputG = 0;    // grams released into the tray by the last batch
    this.stage = 'IDLE'; // what the ESP32 keeps in NVS: IDLE | MIXING_IN_PROGRESS | MIX_DONE_WAITING_RELEASE
    this.savedRecipe = 0;
    this.estop = false;  // latched E-Stop button: true = pressed (GPIO27 LOW)
    this.logLines = [];
    this.history = [];
    this.totalTime = 0;
    this.powerOn();
  }

  // Applied from the next recipe start; a batch that is running keeps its own copy.
  setParams(params) { this.params = params; }

  get recipes() {
    return this.params.targetG.map((targetG, i) => ({ number: i + 1, npk: this.params.npk[i], targetG }));
  }
  get busy() { return Boolean(this.run) || Boolean(this.releasing) || this.screen === 'BOOT'; }
  get active() { return Boolean(this.run) || Boolean(this.releasing); }
  get loadG() { return this.chamberG - this.tareG; }
  get motor() { return this.run?.step === 'stir' && !this.estop; }
  get valve() { return this.run?.step === 'dose' ? this.run.ing : -1; }
  get fill() { return Math.min(1, Math.max(0, this.chamberG / this.params.weightHardLimitG)); }
  get trayFill() { return Math.min(1, Math.max(0, this.outputG / this.params.weightHardLimitG)); }
  get log() { return this.logLines; }

  addLog(text) {
    this.logLines.push({ t: this.totalTime, text });
    if (this.logLines.length > 240) this.logLines.shift();
  }

  // ---------- power / boot ----------
  powerOn() {
    this.run = null;
    this.releasing = null;
    this.selectedRecipe = 1;
    this.dispensedG = [0, 0, 0];
    this.shownTargetG = [0, 0, 0];
    this.mixPhase = 3;
    this.hasResult = false;
    this.faultKind = 0;
    this.confirmT = 0;
    this.bootT = 0;
    this.screenBeforeEmergency = 'RECIPE_SELECT';
    this.tareG = this.chamberG; // the HX711 is tared at power-up: the container must be empty
    this.screen = 'BOOT';
    this.addLog('ESP32 38pin main board: dispenser controller + screen state owner');
    this.addLog('Starting Bluetooth SPP server, waiting for display to connect...');
  }
  powerCycle() { this.powerOn(); }
  reset() {
    this.chamberG = 0; this.outputG = 0; this.stage = 'IDLE'; this.savedRecipe = 0;
    this.logLines = []; this.history = []; this.totalTime = 0;
    this.powerOn();
  }
  finishBoot() {
    // The display's READY message decides what to show after a power cut.
    this.addLog(`READY received. NVS raw stage=${this.stage} recipe=${this.savedRecipe}`);
    if (this.stage === 'MIX_DONE_WAITING_RELEASE') { this.selectedRecipe = this.savedRecipe || 1; this.goToScreen('MIX_DONE'); }
    else if (this.stage === 'MIXING_IN_PROGRESS') { this.selectedRecipe = this.savedRecipe || 1; this.goToScreen('POWER_RECOVERY'); }
    else { this.selectedRecipe = 1; this.goToScreen('RECIPE_SELECT'); }
    this.addLog('Ready.');
    this.pollEstop();
  }

  // ---------- screens ----------
  goToScreen(screen) {
    this.screen = screen;
    if (screen === 'EMERGENCY_CONFIRM') this.confirmT = 0;
    if (screen === 'RECIPE_DETAIL' || screen === 'MIXING') this.shownTargetG = this.params.targetG[this.selectedRecipe - 1].map(gramsForDisplay);
    this.addLog(`-> SCREEN ${screen === 'FAULT' ? faultNames[this.faultKind] : screen} ${this.selectedRecipe}`);
    this.history.push({ screen, at: this.totalTime });
  }
  saveStage(stage, recipe) { this.stage = stage; this.savedRecipe = recipe; }

  // The four green buttons. Recipe 1/2/3 only act on the two recipe screens; the
  // fourth is reused: which command it sends depends on the current screen.
  press(button) {
    if (button === 'CONFIRM') {
      const byScreen = { RECIPE_SELECT: 'EMERGENCY', RECIPE_DETAIL: 'TOP', MIX_DONE: 'RELEASE', POWER_RECOVERY: 'RELEASE_NOW', EMERGENCY_CONFIRM: 'YES', FAULT: 'OK' };
      return this.command(byScreen[this.screen]);
    }
    return this.command(button);
  }

  // Same table as handleButton() in the sketch. Returns false when ignored.
  command(btn) {
    if (!btn || this.busy) return false; // the sketch blocks while it runs a recipe or a release
    const recipe = /^[123]$/.test(btn) ? Number(btn) : 0;
    switch (this.screen) {
      case 'RECIPE_SELECT':
        if (recipe) { this.selectedRecipe = recipe; this.goToScreen('RECIPE_DETAIL'); return true; }
        if (btn === 'EMERGENCY') { this.screenBeforeEmergency = 'RECIPE_SELECT'; this.goToScreen('EMERGENCY_CONFIRM'); return true; }
        return false;
      case 'RECIPE_DETAIL':
        if (recipe) { this.selectedRecipe = recipe; this.goToScreen('RECIPE_DETAIL'); return true; }
        if (btn === 'BOTTOM') { this.goToScreen('RECIPE_SELECT'); return true; }
        if (btn === 'TOP') {
          if (this.estop) { this.goToScreen('ESTOP'); return true; }
          this.saveStage('MIXING_IN_PROGRESS', this.selectedRecipe);
          this.goToScreen('MIXING');
          this.startRun();
          return true;
        }
        return false;
      case 'MIX_DONE':
        if (btn === 'RELEASE') { this.startRelease('RECIPE_SELECT'); return true; }
        return false;
      case 'POWER_RECOVERY':
        if (btn === 'RELEASE_NOW') { this.startRelease('RECIPE_SELECT'); return true; }
        if (btn === 'DISCARD') { this.saveStage('IDLE', 0); this.goToScreen('RECIPE_SELECT'); return true; }
        return false;
      case 'EMERGENCY_CONFIRM':
        if (btn === 'YES') { this.startRelease(this.screenBeforeEmergency); return true; }
        if (btn === 'NO') { this.goToScreen(this.screenBeforeEmergency); return true; }
        return false;
      case 'FAULT':
        if (btn === 'OK') { this.goToScreen('RECIPE_SELECT'); return true; }
        return false;
      default:
        return false;
    }
  }

  // ---------- E-Stop ----------
  // Latching button. Its NC contact cuts the motor's 12V in hardware (motor getter);
  // its NO contact on GPIO27 is what the software reacts to.
  setEstop(pressed) {
    pressed = Boolean(pressed);
    if (pressed === this.estop) return;
    this.estop = pressed;
    this.addLog(`E-Stop pin (GPIO27) is now ${pressed ? 'LOW = pressed' : 'HIGH = released'}`);
    this.pollEstop();
  }
  pollEstop() {
    if (this.run) { if (this.estop) this.abortRun(); return; }
    if (this.releasing) { if (this.estop) this.abortRelease(); return; }
    if (this.screen === 'BOOT') return;
    if (this.estop && this.screen !== 'ESTOP') { this.saveStage('IDLE', 0); this.goToScreen('ESTOP'); }
    else if (!this.estop && this.screen === 'ESTOP') { this.saveStage('IDLE', 0); this.goToScreen('RECIPE_SELECT'); }
  }

  // ---------- recipe run (runRecipeBlocking) ----------
  startRun() {
    const p = this.params;
    const idx = this.selectedRecipe - 1;
    const targets = p.targetG[idx];
    const total = targets[0] + targets[1] + targets[2];
    this.dispensedG = [0, 0, 0];
    this.mixPhase = 3;
    this.hasResult = false;
    this.outputG = 0;
    this.addLog(`Running recipe ${this.selectedRecipe}`);
    if (total > p.weightLimitG) this.addLog(`WARNING: recipe total ${fixed(total, 0)} g is over WEIGHT_LIMIT_G.`);
    this.addLog(`Weight before tare (container should be empty): ${fixed(this.loadG)} g`);
    this.tareG = this.chamberG;
    this.run = { idx, p, step: 'tare', t: 0, order: [0, 1, 2].filter(i => targets[i] > 0), k: 0, ing: -1, live: 0, closedAt: 0 };
  }
  beginNext() {
    const r = this.run;
    if (r.k < r.order.length) {
      const i = r.order[r.k++];
      const target = r.p.targetG[r.idx][i];
      const closeAt = Math.max(1, target - r.p.offsetG[r.idx][i]);
      r.ing = i; r.step = 'dose'; r.t = 0; r.live = 0;
      this.dispensedG[i] = 0;
      this.mixPhase = i;
      this.addLog(`Ingredient ${INGREDIENT_NAME[i]} (channel ${INGREDIENT_CHANNEL[i]}): target ${fixed(target, 0)} g, closing gate at ${fixed(closeAt, 0)} g dispensed`);
    } else {
      const total = this.dispensedG[0] + this.dispensedG[1] + this.dispensedG[2];
      this.addLog(`All ingredients in, total ${fixed(total)} g. Starting stirring motor.`);
      this.addLog(`Stirring for ${r.p.stirMs} ms`);
      r.step = 'stir'; r.t = 0; r.ing = -1;
      this.mixPhase = 4;
    }
  }
  endRunWithFault(kind) {
    const r = this.run;
    if (r.ing >= 0 && r.step === 'dose') this.addLog(`Ingredient ${INGREDIENT_NAME[r.ing]} stopped early (E-Stop or fault).`);
    this.run = null;
    this.faultKind = kind;
    this.saveStage('IDLE', 0);
    this.goToScreen('FAULT');
  }
  abortRun() {
    const r = this.run;
    if (r.step === 'dose') this.addLog(`Ingredient ${INGREDIENT_NAME[r.ing]} stopped early (E-Stop or fault).`);
    if (r.step === 'stir') this.addLog('Stir aborted by Emergency Stop.');
    this.run = null;
    this.saveStage('IDLE', 0);
    this.goToScreen('ESTOP');
  }
  // Advances the run by at most `dt` simulated seconds and returns what is left.
  advanceRun(dt) {
    const r = this.run;
    const p = r.p;
    if (r.step === 'tare') {
      const use = Math.min(dt, TARE_S - r.t);
      r.t += use;
      if (r.t >= TARE_S - 1e-9) this.beginNext();
      return dt - use;
    }
    if (r.step === 'dose') {
      const i = r.ing;
      const closeAt = Math.max(1, p.targetG[r.idx][i] - p.offsetG[r.idx][i]);
      const timeout = p.dispenseTimeoutMs / 1000;
      const closeGate = () => {
        r.closedAt = r.live;
        r.live += AIR_CARRY_G; this.chamberG += AIR_CARRY_G;
        r.step = 'settle'; r.t = 0; this.mixPhase = 3;
        this.dispensedG[i] = r.live;
      };
      if (this.loadG > p.weightHardLimitG + 1e-9) { this.endRunWithFault(2); return 0; }
      if (r.live >= closeAt - 1e-9) { closeGate(); return dt; }
      if (r.t >= timeout - 1e-9) { this.endRunWithFault(1); return 0; }
      const use = Math.min(dt, (closeAt - r.live) / FLOW_G_PER_S, (p.weightHardLimitG - this.loadG) / FLOW_G_PER_S + 1e-6, timeout - r.t);
      r.t += use;
      r.live += FLOW_G_PER_S * use;
      this.chamberG += FLOW_G_PER_S * use;
      this.dispensedG[i] = r.live;
      if (r.live >= closeAt - 1e-9) closeGate();
      return dt - use;
    }
    if (r.step === 'settle') {
      const use = Math.min(dt, SETTLE_S - r.t);
      r.t += use;
      if (r.t >= SETTLE_S - 1e-9) {
        const i = r.ing;
        const target = p.targetG[r.idx][i];
        this.dispensedG[i] = r.live;
        this.addLog(`Ingredient ${INGREDIENT_NAME[i]}: closed at ${fixed(r.closedAt)} g, settled at ${fixed(r.live)} g (target ${fixed(target, 0)}, error ${fixed(r.live - target)} g)`);
        this.beginNext();
      }
      return dt - use;
    }
    // stir
    const stirS = p.stirMs / 1000;
    const use = Math.min(dt, stirS - r.t);
    r.t += use;
    if (r.t >= stirS - 1e-9) {
      this.addLog('Stir complete.');
      this.addLog('Recipe complete.');
      this.mixPhase = 5;
      this.hasResult = true;
      this.run = null;
      this.saveStage('MIX_DONE_WAITING_RELEASE', this.selectedRecipe);
      this.goToScreen('MIX_DONE');
    }
    return dt - use;
  }

  // ---------- release gate (runRelease) ----------
  startRelease(returnScreen) {
    this.addLog('Releasing gate (channel 12)');
    this.releasing = { t: 0, from: this.chamberG, outFrom: this.outputG, returnScreen };
  }
  advanceRelease(dt) {
    const rel = this.releasing;
    const use = Math.min(dt, RELEASE_S - rel.t);
    rel.t += use;
    const done = Math.min(1, rel.t / RELEASE_S);
    this.chamberG = rel.from * (1 - done);
    this.outputG = rel.outFrom + rel.from * done;
    if (rel.t >= RELEASE_S - 1e-9) {
      this.chamberG = 0;
      this.addLog('Release complete.');
      this.releasing = null;
      this.saveStage('IDLE', 0);
      this.goToScreen(rel.returnScreen);
      this.pollEstop();
    }
    return dt - use;
  }
  abortRelease() {
    this.addLog('Release aborted by Emergency Stop.');
    this.releasing = null;
    this.saveStage('IDLE', 0);
    this.goToScreen('ESTOP');
  }

  // ---------- time ----------
  tick(dt) {
    if (!Number.isFinite(dt) || dt <= 0) return;
    let remaining = dt * this.speed;
    for (let guard = 0; remaining > 1e-12 && guard < 20000; guard++) {
      let left;
      if (this.run) left = this.advanceRun(remaining);
      else if (this.releasing) left = this.advanceRelease(remaining);
      else if (this.screen === 'BOOT') {
        left = remaining - Math.min(remaining, BOOT_S - this.bootT);
        this.bootT = Math.min(BOOT_S, this.bootT + remaining);
        if (this.bootT >= BOOT_S - 1e-9) this.finishBoot();
      } else if (this.screen === 'EMERGENCY_CONFIRM') {
        const timeout = this.params.emergencyConfirmTimeoutMs / 1000;
        const use = Math.min(remaining, timeout - this.confirmT);
        this.confirmT += use;
        left = remaining - use;
        if (this.confirmT >= timeout - 1e-9) {
          this.addLog('Emergency release prompt timed out, cancelling.');
          this.goToScreen(this.screenBeforeEmergency);
        }
      } else left = 0;
      this.totalTime += remaining - left;
      remaining = left;
    }
    this.pollEstop();
  }
}
