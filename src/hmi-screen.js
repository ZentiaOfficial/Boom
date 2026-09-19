// Draws the ESP32-2432S028 screen exactly as esp32_touch_hmi_ui.ino lays it out
// (320 x 240, same buttons, same texts) and maps a tap to the command string the
// display sends to the main board ("BTN 1", "BTN TOP", ...).
import { phaseText } from './simulation.js';

export const HMI_W = 320;
export const HMI_H = 240;

const C = {
  black: '#000000', white: '#ffffff', lightgrey: '#d3d3d3', darkgrey: '#7b7d7b', cyan: '#00ffff',
  yellow: '#ffff00', green: '#00ff00', orange: '#ffb400', red: '#ff0000',
  darkgreen: '#007c00', navy: '#000078', maroon: '#780000',
};
const INGREDIENT_COLORS = [C.green, C.orange, C.cyan];
const LETTERS = ['N', 'P', 'K'];
const NPK_COLUMN_X = [190, 235, 280];
const CHART = { x: 236, y: 40, w: 40, h: 178, maxG: 1250, limitG: 1000 };
const chartInner = CHART.h - 2;

const recipeRows = [
  { x: 15, y: 62, w: 290, h: 34, label: 'RECIPE 1', fill: C.darkgreen, cmd: '1' },
  { x: 15, y: 102, w: 290, h: 34, label: 'RECIPE 2', fill: C.navy, cmd: '2' },
  { x: 15, y: 142, w: 290, h: 34, label: 'RECIPE 3', fill: C.maroon, cmd: '3' },
];
const buttons = {
  emergency: { x: 15, y: 182, w: 290, h: 34, label: 'EMERGENCY RELEASE', fill: C.red, cmd: 'EMERGENCY' },
  startMix: { x: 40, y: 65, w: 240, h: 75, label: 'START MIXING', fill: C.darkgreen, cmd: 'TOP' },
  back: { x: 40, y: 155, w: 240, h: 45, label: 'BACK', fill: C.maroon, cmd: 'BOTTOM' },
  release: { x: 40, y: 112, w: 240, h: 70, label: 'RELEASE FERTILIZER', fill: C.darkgreen, cmd: 'RELEASE' },
  releaseNow: { x: 20, y: 120, w: 130, h: 70, label: 'RELEASE NOW', fill: C.darkgreen, cmd: 'RELEASE_NOW' },
  discard: { x: 170, y: 120, w: 130, h: 70, label: 'DISCARD & RESET', fill: C.maroon, cmd: 'DISCARD' },
  faultOk: { x: 100, y: 160, w: 120, h: 50, label: 'OK', fill: C.maroon, cmd: 'OK' },
  yes: { x: 40, y: 130, w: 100, h: 60, label: 'YES', fill: C.red, cmd: 'YES' },
  no: { x: 180, y: 130, w: 100, h: 60, label: 'NO', fill: C.darkgreen, cmd: 'NO' },
};
const touchable = {
  RECIPE_SELECT: [...recipeRows, buttons.emergency],
  RECIPE_DETAIL: [buttons.startMix, buttons.back],
  MIX_DONE: [buttons.release],
  POWER_RECOVERY: [buttons.releaseNow, buttons.discard],
  EMERGENCY_CONFIRM: [buttons.yes, buttons.no],
  FAULT: [buttons.faultOk],
};

// Command for a tap at (x, y) in 320 x 240 coordinates, or null. The display
// ignores touches while the main board is busy (mixing, releasing) and on the
// boot and stop screens.
export function hitTest(sim, x, y) {
  if (sim.busy) return null;
  const hit = (touchable[sim.screen] ?? []).find(b => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h);
  return hit ? hit.cmd : null;
}

const font = (px, weight = 500) => `${weight} ${px}px Manrope, "IBM Plex Sans Thai", sans-serif`;
function text(ctx, value, x, y, { color = C.white, size = 13, align = 'left', weight = 500 } = {}) {
  ctx.font = font(size, weight);
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(value, x, y);
}
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h);
}
function drawButton(ctx, b) {
  roundRect(ctx, b.x, b.y, b.w, b.h, 8);
  ctx.fillStyle = b.fill; ctx.fill();
  ctx.strokeStyle = C.white; ctx.lineWidth = 1; ctx.stroke();
  text(ctx, b.label, b.x + b.w / 2, b.y + b.h / 2, { align: 'center', size: 13 });
}
const title = (ctx, value) => text(ctx, value, 18, 28, { size: 22, weight: 600 });
function footer(ctx, sim) {
  const grams = sim.screen === 'MIXING' ? sim.dispensedG.reduce((a, b) => a + gramsForDisplay(b), 0) : sim.loadG;
  text(ctx, `Load cell: ${(grams / 1000).toFixed(3)} kg`, 160, 233, { color: C.lightgrey, size: 8, align: 'center' });
}
const gramsForDisplay = grams => (grams < 0 ? 0 : Math.floor(grams + 0.5));
const chartY = grams => {
  const g = Math.min(CHART.maxG, Math.max(0, grams));
  return CHART.y + CHART.h - 1 - Math.floor((g / CHART.maxG) * chartInner);
};

function drawMixing(ctx, sim) {
  title(ctx, `Recipe ${sim.selectedRecipe}`);
  ctx.strokeStyle = C.white; ctx.lineWidth = 1;
  ctx.strokeRect(CHART.x + .5, CHART.y + .5, CHART.w - 1, CHART.h - 1);
  text(ctx, '1.25', CHART.x + CHART.w + 4, chartY(CHART.maxG), { color: C.lightgrey, size: 8 });
  text(ctx, '1.00', CHART.x + CHART.w + 4, chartY(CHART.limitG), { color: C.red, size: 8 });
  text(ctx, '0', CHART.x + CHART.w + 4, chartY(0), { color: C.lightgrey, size: 8 });

  let cumulative = 0;
  let cumulativeTarget = 0;
  for (let i = 0; i < 3; i++) {
    const yLow = chartY(cumulative);
    cumulative += Math.max(0, gramsForDisplay(sim.dispensedG[i]));
    const yHigh = chartY(cumulative);
    if (yLow > yHigh) { ctx.fillStyle = INGREDIENT_COLORS[i]; ctx.fillRect(CHART.x + 1, yHigh, CHART.w - 2, yLow - yHigh); }
    cumulativeTarget += sim.shownTargetG[i];
    if (sim.shownTargetG[i] > 0) { ctx.fillStyle = C.white; ctx.fillRect(CHART.x - 5, chartY(cumulativeTarget), 5, 1); }
  }
  ctx.fillStyle = C.red; ctx.fillRect(CHART.x + 1, chartY(CHART.limitG), CHART.w - 2, 1);

  for (let i = 0; i < 3; i++) {
    const y = 58 + i * 30;
    ctx.fillStyle = INGREDIENT_COLORS[i]; ctx.fillRect(18, y - 7, 14, 14);
    if (sim.shownTargetG[i] > 0) {
      const dispensed = gramsForDisplay(sim.dispensedG[i]);
      text(ctx, `${LETTERS[i]}  ${(dispensed / 1000).toFixed(2)} / ${(sim.shownTargetG[i] / 1000).toFixed(2)} kg`, 40, y,
        { color: sim.mixPhase === i ? C.white : C.lightgrey, size: 13 });
    } else {
      text(ctx, `${LETTERS[i]}  not used`, 40, y, { color: C.darkgrey, size: 13 });
    }
  }
  const total = sim.dispensedG.reduce((a, b) => a + gramsForDisplay(b), 0);
  text(ctx, `Total  ${(total / 1000).toFixed(2)} kg`, 18, 150, { size: 13 });
  text(ctx, phaseText[sim.mixPhase] ?? phaseText[5], 18, 190, { color: C.yellow, size: 22, weight: 600 });
}

const faultText = [
  ['Load cell is not responding.', 'Check the HX711 wiring.'],
  ['Fertilizer is not flowing.', 'Check the hopper and the gate.'],
  ['Weight passed the 1.25 kg limit.', 'The gate was closed.'],
];

export function drawHmi(ctx, sim, scale = 1) {
  ctx.save();
  ctx.scale(scale, scale);
  ctx.fillStyle = C.black; ctx.fillRect(0, 0, HMI_W, HMI_H);

  const dispensing = sim.releasing && ['MIX_DONE', 'POWER_RECOVERY', 'EMERGENCY_CONFIRM'].includes(sim.screen);
  if (dispensing) {
    text(ctx, 'Dispensing...', 160, 110, { color: C.cyan, size: 22, weight: 600, align: 'center' });
  } else switch (sim.screen) {
    case 'BOOT': {
      text(ctx, 'Loading...', 160, 90, { size: 22, weight: 600, align: 'center' });
      roundRect(ctx, 40, 130, 240, 24, 6);
      ctx.strokeStyle = C.lightgrey; ctx.stroke();
      ctx.fillStyle = C.green; ctx.fillRect(42, 132, Math.floor(236 * sim.bootT / 1.5), 20);
      break;
    }
    case 'RECIPE_SELECT': {
      title(ctx, 'Select Recipe');
      LETTERS.forEach((letter, col) => text(ctx, letter, NPK_COLUMN_X[col], 50, { color: C.cyan, align: 'center' }));
      recipeRows.forEach((row, i) => {
        roundRect(ctx, row.x, row.y, row.w, row.h, 8);
        ctx.fillStyle = row.fill; ctx.fill(); ctx.strokeStyle = C.white; ctx.stroke();
        text(ctx, row.label, row.x + 14, row.y + row.h / 2);
        sim.params.npk[i].forEach((value, col) => text(ctx, String(value), NPK_COLUMN_X[col], row.y + row.h / 2, { align: 'center' }));
      });
      drawButton(ctx, buttons.emergency);
      footer(ctx, sim);
      break;
    }
    case 'RECIPE_DETAIL': {
      title(ctx, `Recipe ${sim.selectedRecipe}`);
      const t = sim.shownTargetG.map(g => (g / 1000).toFixed(2));
      text(ctx, `N ${t[0]}  P ${t[1]}  K ${t[2]} kg`, 160, 50, { color: C.lightgrey, align: 'center' });
      drawButton(ctx, buttons.startMix); drawButton(ctx, buttons.back);
      footer(ctx, sim);
      break;
    }
    case 'MIXING': drawMixing(ctx, sim); footer(ctx, sim); break;
    case 'MIX_DONE': {
      title(ctx, `Recipe ${sim.selectedRecipe}`);
      text(ctx, 'Mixing complete!', 160, 52, { color: C.green, size: 22, weight: 600, align: 'center' });
      if (sim.hasResult) {
        const g = sim.dispensedG.map(gramsForDisplay);
        text(ctx, `N ${(g[0] / 1000).toFixed(2)}  P ${(g[1] / 1000).toFixed(2)}  K ${(g[2] / 1000).toFixed(2)}`, 160, 78, { align: 'center' });
        text(ctx, `Total ${((g[0] + g[1] + g[2]) / 1000).toFixed(2)} kg`, 160, 96, { align: 'center' });
      }
      drawButton(ctx, buttons.release);
      footer(ctx, sim);
      break;
    }
    case 'POWER_RECOVERY': {
      title(ctx, 'Power Recovery');
      text(ctx, `Power was lost while mixing recipe ${sim.selectedRecipe}.`, 18, 62, { color: C.yellow });
      text(ctx, 'Choose how to continue:', 18, 85, { color: C.yellow });
      drawButton(ctx, buttons.releaseNow); drawButton(ctx, buttons.discard);
      footer(ctx, sim);
      break;
    }
    case 'EMERGENCY_CONFIRM': {
      title(ctx, 'Confirm');
      ['Force-release fertilizer now?', 'Use only if the system is stuck.', 'Press the green confirm button again,', 'or wait 10s to cancel.']
        .forEach((line, i) => text(ctx, line, 18, 58 + i * 20));
      drawButton(ctx, buttons.yes); drawButton(ctx, buttons.no);
      footer(ctx, sim);
      break;
    }
    case 'ESTOP': {
      text(ctx, 'EMERGENCY STOP', 160, 50, { color: C.red, size: 22, weight: 600, align: 'center' });
      ['Motor power is cut.', 'Twist the red switch to release it.', 'This screen closes by itself.']
        .forEach((line, i) => text(ctx, line, 18, 103 + i * 25));
      footer(ctx, sim);
      break;
    }
    case 'FAULT': {
      text(ctx, 'FAULT', 160, 40, { color: C.red, size: 22, weight: 600, align: 'center' });
      const [line1, line2] = faultText[sim.faultKind] ?? faultText[0];
      text(ctx, line1, 18, 86); text(ctx, line2, 18, 108); text(ctx, 'Empty the container, then OK.', 18, 130);
      drawButton(ctx, buttons.faultOk);
      footer(ctx, sim);
      break;
    }
  }
  ctx.restore();
}
