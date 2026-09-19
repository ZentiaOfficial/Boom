// Reads the tunable numbers straight out of the two sketches, so the cabinet
// simulation follows the firmware (including edits made in the code editor)
// instead of carrying its own copy of the constants.

// Fallback if a number cannot be found in an edited sketch. Equal to the
// shipped firmware; a failed lookup is reported in `warnings`.
export const DEFAULT_PARAMS = {
  targetG: [[460, 0, 0], [150, 150, 150], [120, 240, 120]],
  offsetG: [[0, 0, 0], [0, 0, 0], [0, 0, 0]],
  npk: [[46, 0, 0], [15, 15, 15], [12, 24, 12]],
  stirMs: 5000,
  weightLimitG: 1000,
  weightHardLimitG: 1250,
  dispenseTimeoutMs: 60000,
  emergencyConfirmTimeoutMs: 10000,
};

function table(src, declaration) {
  const match = src.match(new RegExp(`${declaration}\\s*=\\s*\\{([\\s\\S]*?)\\n\\};`));
  if (!match) return null;
  const values = (match[1].replace(/\/\/.*$/gm, '').match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
  return values.length === 9 ? [values.slice(0, 3), values.slice(3, 6), values.slice(6, 9)] : null;
}

function define(src, name) {
  const match = src.match(new RegExp(`^[ \\t]*#define[ \\t]+${name}[ \\t]+(-?\\d+(?:\\.\\d+)?)`, 'm'));
  return match ? Number(match[1]) : null;
}

export function parseParams(mainSource, displaySource) {
  const warnings = [];
  const pick = (value, fallback, label) => {
    if (value === null || (typeof value === 'number' && !Number.isFinite(value))) { warnings.push(label); return fallback; }
    return value;
  };
  const params = {
    targetG: pick(table(mainSource, 'const float RECIPE_TARGET_G\\[3\\]\\[3\\]'), DEFAULT_PARAMS.targetG, 'RECIPE_TARGET_G'),
    offsetG: pick(table(mainSource, 'const float CALIBRATION_OFFSET_G\\[3\\]\\[3\\]'), DEFAULT_PARAMS.offsetG, 'CALIBRATION_OFFSET_G'),
    npk: pick(table(displaySource, 'const int RECIPE_NPK\\[3\\]\\[3\\]'), DEFAULT_PARAMS.npk, 'RECIPE_NPK'),
    stirMs: pick(define(mainSource, 'STIR_DURATION_MS'), DEFAULT_PARAMS.stirMs, 'STIR_DURATION_MS'),
    weightLimitG: pick(define(mainSource, 'WEIGHT_LIMIT_G'), DEFAULT_PARAMS.weightLimitG, 'WEIGHT_LIMIT_G'),
    weightHardLimitG: pick(define(mainSource, 'WEIGHT_HARD_LIMIT_G'), DEFAULT_PARAMS.weightHardLimitG, 'WEIGHT_HARD_LIMIT_G'),
    dispenseTimeoutMs: pick(define(mainSource, 'DISPENSE_TIMEOUT_MS'), DEFAULT_PARAMS.dispenseTimeoutMs, 'DISPENSE_TIMEOUT_MS'),
    emergencyConfirmTimeoutMs: pick(define(mainSource, 'EMERGENCY_CONFIRM_TIMEOUT_MS'), DEFAULT_PARAMS.emergencyConfirmTimeoutMs, 'EMERGENCY_CONFIRM_TIMEOUT_MS'),
  };
  params.warnings = warnings;
  return params;
}
