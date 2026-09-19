import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const main = readFileSync(new URL('../Code_Board/Arduino_IDE/esp32_main_dispenser/esp32_main_dispenser.ino', import.meta.url), 'utf8');
const display = readFileSync(new URL('../Code_Board/Arduino_IDE/esp32_touch_hmi_ui/esp32_touch_hmi_ui.ino', import.meta.url), 'utf8');

function numbers(block) {
  return [...block.matchAll(/-?\d+(?:\.\d+)?f?/g)].map(m => parseFloat(m[0]));
}

test('every CALIBRATION_OFFSET_G value ships as 0', () => {
  const match = main.match(/const float CALIBRATION_OFFSET_G\[3\]\[3\] = \{([\s\S]*?)\n\};/);
  assert.ok(match, 'CALIBRATION_OFFSET_G table not found');
  // Drop `// recipe N` comments so their digits are not counted.
  const values = numbers(match[1].replace(/\/\/.*$/gm, ''));
  assert.equal(values.length, 9);
  assert.ok(values.every(v => v === 0), `non-zero offset found: ${values}`);
});

test('the calibration table sits near the top of the main sketch', () => {
  const line = main.slice(0, main.indexOf('const float CALIBRATION_OFFSET_G')).split('\n').length;
  assert.ok(line < 60, `calibration table starts on line ${line}`);
});

test('both sketches are present and are the right firmware', () => {
  assert.match(main, /HX711 scale;/);
  assert.match(main, /RECIPE_TARGET_G/);
  assert.match(display, /BluetoothSerial MainBoardSerial/);
});
