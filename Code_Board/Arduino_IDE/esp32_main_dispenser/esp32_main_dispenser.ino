#include <Wire.h>
#include <Adafruit_PWMServoDriver.h>
#include <Preferences.h>
#include <BluetoothSerial.h>
#include <HX711.h>

// =====================================================================
// RECIPE TARGETS & CALIBRATION  (the numbers you will actually tune)
// =====================================================================
// Ingredient order everywhere is N, P, K = servo channel A, B, C.
// A 0 target skips that ingredient.
//
// RECIPE_TARGET_G[recipe][ingredient]: grams the recipe should end up with
// (N46 of a 1 kg batch = 460 g). Fixed by the recipe — don't touch these when
// tuning a real machine. Keep each recipe's total <= WEIGHT_LIMIT_G.
const float RECIPE_TARGET_G[3][3] = {
  //  N      P      K
  {460.0f,   0.0f,   0.0f},   // recipe 1  N46 P0  K0
  {150.0f, 150.0f, 150.0f},   // recipe 2  15-15-15
  {120.0f, 240.0f, 120.0f},   // recipe 3  12-24-12
};

// CALIBRATION_OFFSET_G[recipe][ingredient]: how many grams BEFORE the target
// the gate is told to close, to make up for fertilizer still in the air after
// the gate starts closing. The gate closes once
//     dispensed >= target - offset
// e.g. target 460, offset 160 -> gate closes when the load cell has risen by
// 300 g, and it then settles somewhere near 440 g. After every ingredient the
// Serial Monitor prints "closed at X g, settled at Y g (error Z g)": raise the
// offset if Y overshoots the target, lower it if Y falls short. Whatever error
// remains is accepted — the next ingredient just starts from the settled
// weight, and the motor starts once the last one has settled.
// All 0 for now: the gate closes exactly at the target. Fill these in per
// recipe / ingredient once you have measured how much really falls after the
// gate closes (the Serial Monitor line above shows it).
const float CALIBRATION_OFFSET_G[3][3] = {
  //  N      P      K
  {  0.0f,   0.0f,   0.0f},   // recipe 1
  {  0.0f,   0.0f,   0.0f},   // recipe 2
  {  0.0f,   0.0f,   0.0f},   // recipe 3
};

// Load cell limits. The container is tared to 0 g at the start of each recipe,
// so these are net grams. Above WEIGHT_HARD_LIMIT_G the gate is closed and the
// recipe is stopped with a fault.
#define WEIGHT_LIMIT_G 1000.0f
#define WEIGHT_HARD_LIMIT_G 1250.0f

// "Settled" = the last STABLE_WINDOW_READINGS readings (~0.1 s each at the
// HX711's default 10 Hz) all lie within STABLE_TOLERANCE_G of each other. If
// that never happens (vibration), carry on after STABLE_TIMEOUT_MS.
#define STABLE_WINDOW_READINGS 5
#define STABLE_TOLERANCE_G 2.0f
#define STABLE_TIMEOUT_MS 8000

// Fault if one gate stays open this long without reaching its close weight
// (empty hopper, blocked gate).
#define DISPENSE_TIMEOUT_MS 60000
// The close threshold must be seen this many readings in a row (noise guard).
#define CLOSE_CONFIRM_READINGS 2
// Consecutive failed HX711 reads before giving up with a scale fault.
#define MAX_READ_FAILURES 5

#define I2C_SDA_PIN 22
#define I2C_SCL_PIN 23
#define PCA9685_I2C_ADDRESS 0x40
#define SERVO_PWM_FREQUENCY_HZ 50
#define SERVO_MIN_PULSE_US 1000
#define SERVO_MAX_PULSE_US 2000

// GPIO12/13 are wired to the display's TX/RX (leftover from before the
// Bluetooth switch) but are not read/written anywhere in this sketch.
#define BLUETOOTH_LOCAL_NAME "VerdantMain"

// Physical wiring: Servo1=CH0, Servo2=CH4, Servo3=CH8, Servo4=CH12
#define CHANNEL_INGREDIENT_A 0
#define CHANNEL_INGREDIENT_B 4
#define CHANNEL_INGREDIENT_C 8
#define CHANNEL_RELEASE_GATE 12

#define GATE_CLOSED_ANGLE 30
#define GATE_OPEN_ANGLE 150
#define GATE_SETTLE_MS 300

// L298N drives the JGB37-520 stirring motor (Motor A channel). ENA is left
// on the L298N's onboard jumper (always enabled, full speed) — only
// direction/on-off is controlled here. Swap IN1/IN2 wiring if the stir
// direction comes out reversed.
#define MOTOR_IN1_PIN 18
#define MOTOR_IN2_PIN 19

// PLACEHOLDER: how long the stirring motor runs per recipe. Not tuned to
// any real mixing result yet — adjust after watching an actual batch mix.
#define STIR_DURATION_MS 5000

// Physical buttons (momentary, wired NO contact -> GPIO, other side -> GND;
// INPUT_PULLUP so idle reads HIGH and a press reads LOW). Recipe 1/2/3
// buttons only do anything while on the recipe-select screen; the confirm
// button is reused for "start mixing" and "release" depending on the
// current screen.
#define BTN_RECIPE_1_PIN 32
#define BTN_RECIPE_2_PIN 33
#define BTN_RECIPE_3_PIN 25
#define BTN_CONFIRM_PIN 26
#define BUTTON_DEBOUNCE_MS 250

// Latching red Emergency Stop (push-lock, twist-release). Its NC contact
// cuts the L298N's 12V supply directly in hardware — that cutoff does not
// depend on this pin or any code here. Its separate NO contact is wired
// NO -> GPIO27 / other side -> GND (INPUT_PULLUP), so a latched-down
// button reads LOW. Software uses it only to react too: abort the step in
// progress, release the servo gates, and show a stop screen. Since the
// button itself latches, this is a plain level read — no software latch.
#define ESTOP_PIN 27
#define ESTOP_POLL_INTERVAL_MS 20

// On the recipe-select screen the confirm button (btn 4) opens the manual
// "force release" prompt; pressing it again within this window confirms,
// otherwise the prompt cancels itself and returns to recipe select.
#define EMERGENCY_CONFIRM_TIMEOUT_MS 10000

// HX711 load cell amplifier. Powered from 3V3 so DT stays 3.3V logic.
// LOADCELL_CALIBRATION_FACTOR is the value from calibration. With a factor
// this large the library's get_units() is most likely in kilograms, so
// LOADCELL_UNITS_TO_GRAMS converts to grams — if the printed weight is 1000x
// off, change that one number to 1.0.
#define HX711_DT_PIN 16
#define HX711_SCK_PIN 17
#define LOADCELL_CALIBRATION_FACTOR 200000.0f
#define LOADCELL_UNITS_TO_GRAMS 1000.0f

HX711 scale;
bool scaleReady = false;

BluetoothSerial DisplaySerial;
Adafruit_PWMServoDriver pwm = Adafruit_PWMServoDriver(PCA9685_I2C_ADDRESS);
Preferences prefs;

const uint8_t INGREDIENT_CHANNEL[3] = {CHANNEL_INGREDIENT_A, CHANNEL_INGREDIENT_B, CHANNEL_INGREDIENT_C};
const char INGREDIENT_NAME[3] = {'N', 'P', 'K'};
const uint8_t RECIPE_COUNT = 3;

enum class RunResult : uint8_t {
  OK,
  ESTOP,
  FAULT_SCALE,
  FAULT_TIMEOUT,
  FAULT_OVERWEIGHT
};

// Progress phase sent to the display: 0..2 = dispensing N/P/K.
constexpr uint8_t PHASE_SETTLING = 3;
constexpr uint8_t PHASE_STIRRING = 4;
constexpr uint8_t PHASE_DONE = 5;

#define PROGRESS_SEND_INTERVAL_MS 200
#define LOAD_REPORT_INTERVAL_MS 500

// Net grams dispensed so far per ingredient in the current recipe (live while
// a gate is open, the settled value afterwards).
float dispensedG[3] = {0, 0, 0};

enum class Screen : uint8_t {
  RECIPE_SELECT,
  RECIPE_DETAIL,
  MIXING,
  MIX_DONE,
  POWER_RECOVERY,
  EMERGENCY_CONFIRM,
  ESTOP,
  FAULT
};

enum class SavedStage : uint8_t {
  IDLE = 0,
  MIXING_IN_PROGRESS = 1,
  MIX_DONE_WAITING_RELEASE = 2
};

Screen currentScreen = Screen::RECIPE_SELECT;
Screen screenBeforeEmergency = Screen::RECIPE_SELECT;
const char *faultScreenName = "FAULT_SCALE";
uint32_t emergencyConfirmStartedAt = 0;
uint8_t selectedRecipe = 1;

struct PhysicalButton {
  uint8_t pin;
  bool stableState;   // debounced state; HIGH = released, LOW = pressed
  bool lastRawState;
  uint32_t lastChangeAt;
};

PhysicalButton btnRecipe1 = {BTN_RECIPE_1_PIN, HIGH, HIGH, 0};
PhysicalButton btnRecipe2 = {BTN_RECIPE_2_PIN, HIGH, HIGH, 0};
PhysicalButton btnRecipe3 = {BTN_RECIPE_3_PIN, HIGH, HIGH, 0};
PhysicalButton btnConfirm = {BTN_CONFIRM_PIN, HIGH, HIGH, 0};

uint16_t angleToPulseUs(uint8_t angle) {
  angle = constrain(angle, 0, 180);
  return map(angle, 0, 180, SERVO_MIN_PULSE_US, SERVO_MAX_PULSE_US);
}

uint16_t pulseUsToPcaTicks(uint16_t pulseUs) {
  uint32_t periodUs = 1000000UL / SERVO_PWM_FREQUENCY_HZ;
  return (pulseUs * 4096UL) / periodUs;
}

void setGateAngle(uint8_t channel, uint8_t angle) {
  uint16_t pulseUs = angleToPulseUs(angle);
  uint16_t ticks = pulseUsToPcaTicks(pulseUs);
  pwm.setPWM(channel, 0, ticks);
}

void releaseChannel(uint8_t channel) {
  pwm.setPWM(channel, 0, 0);
}

void closeAndRelease(uint8_t channel) {
  setGateAngle(channel, GATE_CLOSED_ANGLE);
  delay(GATE_SETTLE_MS);
  releaseChannel(channel);
}

void stirMotorForward() {
  digitalWrite(MOTOR_IN1_PIN, HIGH);
  digitalWrite(MOTOR_IN2_PIN, LOW);
}

void stirMotorStop() {
  digitalWrite(MOTOR_IN1_PIN, LOW);
  digitalWrite(MOTOR_IN2_PIN, LOW);
}

bool isEmergencyStopActive() {
  return digitalRead(ESTOP_PIN) == LOW;
}

// Sleeps up to durationMs in small slices, checking the E-Stop between
// each. Returns true (and stops early) as soon as it is engaged, instead
// of always sleeping the full duration like delay() would.
bool waitInterruptible(uint32_t durationMs) {
  uint32_t elapsed = 0;
  while (elapsed < durationMs) {
    if (isEmergencyStopActive()) {
      return true;
    }
    uint32_t step = (durationMs - elapsed < ESTOP_POLL_INTERVAL_MS)
                       ? (durationMs - elapsed)
                       : ESTOP_POLL_INTERVAL_MS;
    delay(step);
    elapsed += step;
  }
  return false;
}

// Brings everything this board controls to a safe idle state: motor pins
// low, all servo gates released. The motor's 12V is already cut in
// hardware by the E-Stop's NC contact regardless of this.
void emergencyStopAllOutputs() {
  stirMotorStop();
  releaseChannel(CHANNEL_INGREDIENT_A);
  releaseChannel(CHANNEL_INGREDIENT_B);
  releaseChannel(CHANNEL_INGREDIENT_C);
  releaseChannel(CHANNEL_RELEASE_GATE);
}

void initButton(PhysicalButton &btn, uint8_t pin) {
  btn.pin = pin;
  pinMode(pin, INPUT_PULLUP);
  btn.stableState = HIGH;
  btn.lastRawState = HIGH;
  btn.lastChangeAt = 0;
}

// Returns true exactly once, on the debounced transition to pressed (LOW).
bool checkButtonPressed(PhysicalButton &btn) {
  bool raw = digitalRead(btn.pin);
  if (raw != btn.lastRawState) {
    btn.lastChangeAt = millis();
    btn.lastRawState = raw;
  }
  if ((millis() - btn.lastChangeAt) > BUTTON_DEBOUNCE_MS && raw != btn.stableState) {
    btn.stableState = raw;
    return btn.stableState == LOW;
  }
  return false;
}

// Brings the HX711 up (scale factor + tare). Safe to call repeatedly; does
// nothing once it has succeeded. Returns false if the HX711 doesn't answer.
bool ensureScaleReady() {
  if (scaleReady) {
    return true;
  }
  if (!scale.wait_ready_timeout(1000)) {
    return false;
  }
  scale.set_scale(LOADCELL_CALIBRATION_FACTOR);
  scale.tare(10);  // container must be empty at power-up
  scaleReady = true;
  return true;
}

// Current load cell weight in grams (averaged), or NAN if the HX711 isn't
// responding. Slow — for logging, not for the dispensing loop.
float readWeightGrams(uint8_t samples = 3) {
  if (!scaleReady || !scale.wait_ready_timeout(500)) {
    return NAN;
  }
  return scale.get_units(samples) * LOADCELL_UNITS_TO_GRAMS;
}

// One fast reading (~0.1 s at 10 Hz), or NAN if the HX711 isn't responding.
float readWeightSample() {
  if (!scaleReady || !scale.wait_ready_timeout(300)) {
    return NAN;
  }
  return scale.get_units(1) * LOADCELL_UNITS_TO_GRAMS;
}

void printWeight(const char *label) {
  float grams = readWeightGrams();
  Serial.print(label);
  if (isnan(grams)) {
    Serial.println(": n/a (HX711 not responding)");
  } else {
    Serial.print(": ");
    Serial.print(grams, 1);
    Serial.println(" g");
  }
}

int gramsForDisplay(float grams) {
  return grams < 0 ? 0 : (int)(grams + 0.5f);
}

// "WEIGHT <N g> <P g> <K g> <phase>" — drives the display's bar chart.
void sendProgress(uint8_t phase) {
  char msg[48];
  snprintf(msg, sizeof(msg), "WEIGHT %d %d %d %u",
           gramsForDisplay(dispensedG[0]), gramsForDisplay(dispensedG[1]),
           gramsForDisplay(dispensedG[2]), (unsigned)phase);
  DisplaySerial.println(msg);
}

void sendProgressThrottled(uint8_t phase) {
  static uint32_t lastSentAt = 0;
  if (millis() - lastSentAt < PROGRESS_SEND_INTERVAL_MS) {
    return;
  }
  lastSentAt = millis();
  sendProgress(phase);
}

// Waits until the load cell has stopped moving and returns that weight in
// stableOut. ingredient (or -1) and baselineG only keep the live bar chart
// updating meanwhile. Not settling within STABLE_TIMEOUT_MS is not an error:
// it carries on with the latest average.
RunResult waitForStableWeight(float &stableOut, int8_t ingredient, float baselineG) {
  float window[STABLE_WINDOW_READINGS];
  uint8_t count = 0;
  uint8_t head = 0;
  uint8_t failures = 0;
  uint32_t startedAt = millis();

  sendProgress(PHASE_SETTLING);

  while (true) {
    if (isEmergencyStopActive()) {
      return RunResult::ESTOP;
    }

    float w = readWeightSample();
    if (isnan(w)) {
      if (++failures >= MAX_READ_FAILURES) {
        return RunResult::FAULT_SCALE;
      }
      continue;
    }
    failures = 0;

    window[head] = w;
    head = (head + 1) % STABLE_WINDOW_READINGS;
    if (count < STABLE_WINDOW_READINGS) {
      count++;
    }
    if (ingredient >= 0) {
      dispensedG[ingredient] = w - baselineG;
    }
    sendProgressThrottled(PHASE_SETTLING);

    float lo = window[0];
    float hi = window[0];
    float sum = 0;
    for (uint8_t i = 0; i < count; i++) {
      lo = min(lo, window[i]);
      hi = max(hi, window[i]);
      sum += window[i];
    }
    stableOut = sum / count;

    if (count == STABLE_WINDOW_READINGS && (hi - lo) <= STABLE_TOLERANCE_G) {
      return RunResult::OK;
    }
    if (millis() - startedAt >= STABLE_TIMEOUT_MS) {
      Serial.println("Weight did not fully settle, continuing with latest average.");
      return RunResult::OK;
    }
  }
}

// Opens one ingredient gate and closes it once the load cell has risen by
// (target - calibration offset), then waits for the weight to settle. On
// success baselineG becomes the settled weight, ready for the next ingredient.
RunResult dispenseIngredient(uint8_t recipeIdx, uint8_t ingredient, float &baselineG) {
  float target = RECIPE_TARGET_G[recipeIdx][ingredient];
  float closeAt = max(1.0f, target - CALIBRATION_OFFSET_G[recipeIdx][ingredient]);
  uint8_t channel = INGREDIENT_CHANNEL[ingredient];

  Serial.print("Ingredient ");
  Serial.print(INGREDIENT_NAME[ingredient]);
  Serial.print(" (channel ");
  Serial.print(channel);
  Serial.print("): target ");
  Serial.print(target, 0);
  Serial.print(" g, closing gate at ");
  Serial.print(closeAt, 0);
  Serial.println(" g dispensed");

  dispensedG[ingredient] = 0;
  sendProgress(ingredient);
  setGateAngle(channel, GATE_OPEN_ANGLE);

  RunResult result = RunResult::OK;
  uint32_t startedAt = millis();
  uint8_t readFailures = 0;
  uint8_t overCount = 0;
  float live = 0;

  while (true) {
    if (isEmergencyStopActive()) {
      result = RunResult::ESTOP;
      break;
    }
    if (millis() - startedAt >= DISPENSE_TIMEOUT_MS) {
      result = RunResult::FAULT_TIMEOUT;
      break;
    }

    float w = readWeightSample();
    if (isnan(w)) {
      if (++readFailures >= MAX_READ_FAILURES) {
        result = RunResult::FAULT_SCALE;
        break;
      }
      continue;
    }
    readFailures = 0;

    live = w - baselineG;
    dispensedG[ingredient] = live;
    sendProgressThrottled(ingredient);

    if (w > WEIGHT_HARD_LIMIT_G) {
      result = RunResult::FAULT_OVERWEIGHT;
      break;
    }
    if (live >= closeAt) {
      if (++overCount >= CLOSE_CONFIRM_READINGS) {
        break;
      }
    } else {
      overCount = 0;
    }
  }

  closeAndRelease(channel);

  if (result != RunResult::OK) {
    Serial.print("Ingredient ");
    Serial.print(INGREDIENT_NAME[ingredient]);
    Serial.println(" stopped early (E-Stop or fault).");
    return result;
  }

  float settled = 0;
  result = waitForStableWeight(settled, ingredient, baselineG);
  if (result != RunResult::OK) {
    return result;
  }

  dispensedG[ingredient] = settled - baselineG;
  Serial.print("Ingredient ");
  Serial.print(INGREDIENT_NAME[ingredient]);
  Serial.print(": closed at ");
  Serial.print(live, 1);
  Serial.print(" g, settled at ");
  Serial.print(dispensedG[ingredient], 1);
  Serial.print(" g (target ");
  Serial.print(target, 0);
  Serial.print(", error ");
  Serial.print(dispensedG[ingredient] - target, 1);
  Serial.println(" g)");

  baselineG = settled;
  return RunResult::OK;
}

// Returns true if the stir was cut short by Emergency Stop.
bool runStirStep() {
  Serial.print("Stirring for ");
  Serial.print(STIR_DURATION_MS);
  Serial.println(" ms");

  stirMotorForward();
  bool aborted = waitInterruptible(STIR_DURATION_MS);
  stirMotorStop();

  Serial.println(aborted ? "Stir aborted by Emergency Stop." : "Stir complete.");
  return aborted;
}

// Dispenses N, P, K one after another — each only starts once the previous one
// has settled — then runs the stirring motor.
RunResult runRecipeBlocking(uint8_t recipeNumber) {
  if (recipeNumber < 1 || recipeNumber > RECIPE_COUNT) {
    Serial.println("Unknown recipe number, ignoring.");
    return RunResult::OK;
  }

  uint8_t recipeIdx = recipeNumber - 1;
  Serial.print("Running recipe ");
  Serial.println(recipeNumber);

  for (uint8_t i = 0; i < 3; i++) {
    dispensedG[i] = 0;
  }
  sendProgress(PHASE_SETTLING);

  if (!ensureScaleReady()) {
    Serial.println("HX711 not responding, recipe not started.");
    return RunResult::FAULT_SCALE;
  }

  float targetTotal = RECIPE_TARGET_G[recipeIdx][0] + RECIPE_TARGET_G[recipeIdx][1] +
                      RECIPE_TARGET_G[recipeIdx][2];
  if (targetTotal > WEIGHT_LIMIT_G) {
    Serial.print("WARNING: recipe total ");
    Serial.print(targetTotal, 0);
    Serial.println(" g is over WEIGHT_LIMIT_G.");
  }

  printWeight("Weight before tare (container should be empty)");
  scale.tare(5);

  float baseline = 0;
  RunResult result = waitForStableWeight(baseline, -1, 0);
  if (result != RunResult::OK) {
    emergencyStopAllOutputs();
    return result;
  }

  for (uint8_t ing = 0; ing < 3; ing++) {
    if (RECIPE_TARGET_G[recipeIdx][ing] <= 0) {
      continue;
    }
    result = dispenseIngredient(recipeIdx, ing, baseline);
    if (result != RunResult::OK) {
      emergencyStopAllOutputs();
      return result;
    }
  }

  Serial.print("All ingredients in, total ");
  Serial.print(dispensedG[0] + dispensedG[1] + dispensedG[2], 1);
  Serial.println(" g. Starting stirring motor.");

  sendProgress(PHASE_STIRRING);
  if (runStirStep()) {
    emergencyStopAllOutputs();
    return RunResult::ESTOP;
  }

  sendProgress(PHASE_DONE);
  Serial.println("Recipe complete.");
  return RunResult::OK;
}

// Returns true if the release was cut short by Emergency Stop.
bool runRelease() {
  Serial.println("Releasing gate (channel 12)");
  setGateAngle(CHANNEL_RELEASE_GATE, GATE_OPEN_ANGLE);
  bool aborted = waitInterruptible(2000);
  setGateAngle(CHANNEL_RELEASE_GATE, GATE_CLOSED_ANGLE);
  delay(GATE_SETTLE_MS);
  releaseChannel(CHANNEL_RELEASE_GATE);

  Serial.println(aborted ? "Release aborted by Emergency Stop." : "Release complete.");
  return aborted;
}

void saveStage(SavedStage stage, uint8_t recipe) {
  size_t stageWritten = prefs.putUChar("stage", static_cast<uint8_t>(stage));
  size_t recipeWritten = prefs.putUChar("recipe", recipe);

  Serial.print("saveStage: stage=");
  Serial.print(static_cast<uint8_t>(stage));
  Serial.print(" recipe=");
  Serial.print(recipe);
  Serial.print(" (bytes written: stage=");
  Serial.print(stageWritten);
  Serial.print(", recipe=");
  Serial.print(recipeWritten);
  Serial.println(")");

  // Read back immediately to confirm the write actually landed in NVS.
  uint8_t verifyStage = prefs.getUChar("stage", 255);
  uint8_t verifyRecipe = prefs.getUChar("recipe", 255);
  Serial.print("saveStage verify: stage=");
  Serial.print(verifyStage);
  Serial.print(" recipe=");
  Serial.println(verifyRecipe);
}

void sendScreen(const char *name) {
  String msg = String("SCREEN ") + name + " " + String(selectedRecipe);
  DisplaySerial.println(msg);
  Serial.print("-> ");
  Serial.println(msg);
}

// "TARGET <N g> <P g> <K g>" for the selected recipe, sent ahead of the
// screens that show it.
void sendTarget() {
  const float *t = RECIPE_TARGET_G[selectedRecipe - 1];
  char msg[40];
  snprintf(msg, sizeof(msg), "TARGET %d %d %d", gramsForDisplay(t[0]),
           gramsForDisplay(t[1]), gramsForDisplay(t[2]));
  DisplaySerial.println(msg);
}

void goToScreen(Screen s) {
  currentScreen = s;
  if (s == Screen::EMERGENCY_CONFIRM) {
    emergencyConfirmStartedAt = millis();
  }
  if (s == Screen::RECIPE_DETAIL || s == Screen::MIXING) {
    sendTarget();
  }
  switch (s) {
    case Screen::RECIPE_SELECT: sendScreen("RECIPE_SELECT"); break;
    case Screen::RECIPE_DETAIL: sendScreen("RECIPE_DETAIL"); break;
    case Screen::MIXING: sendScreen("MIXING"); break;
    case Screen::MIX_DONE: sendScreen("MIX_DONE"); break;
    case Screen::POWER_RECOVERY: sendScreen("POWER_RECOVERY"); break;
    case Screen::EMERGENCY_CONFIRM: sendScreen("EMERGENCY_CONFIRM"); break;
    case Screen::ESTOP: sendScreen("ESTOP"); break;
    case Screen::FAULT: sendScreen(faultScreenName); break;
  }
}

// Shows the fault screen matching a non-OK, non-E-Stop run result.
void goToFault(RunResult result) {
  switch (result) {
    case RunResult::FAULT_TIMEOUT: faultScreenName = "FAULT_TIMEOUT"; break;
    case RunResult::FAULT_OVERWEIGHT: faultScreenName = "FAULT_OVERWEIGHT"; break;
    default: faultScreenName = "FAULT_SCALE"; break;
  }
  goToScreen(Screen::FAULT);
}

void handleButton(const String &btn) {
  switch (currentScreen) {
    case Screen::RECIPE_SELECT:
      if (btn == "1") {
        selectedRecipe = 1;
        goToScreen(Screen::RECIPE_DETAIL);
      } else if (btn == "2") {
        selectedRecipe = 2;
        goToScreen(Screen::RECIPE_DETAIL);
      } else if (btn == "3") {
        selectedRecipe = 3;
        goToScreen(Screen::RECIPE_DETAIL);
      } else if (btn == "EMERGENCY") {
        screenBeforeEmergency = Screen::RECIPE_SELECT;
        goToScreen(Screen::EMERGENCY_CONFIRM);
      }
      break;

    case Screen::RECIPE_DETAIL:
      if (btn == "1") {
        selectedRecipe = 1;
        goToScreen(Screen::RECIPE_DETAIL);
      } else if (btn == "2") {
        selectedRecipe = 2;
        goToScreen(Screen::RECIPE_DETAIL);
      } else if (btn == "3") {
        selectedRecipe = 3;
        goToScreen(Screen::RECIPE_DETAIL);
      } else if (btn == "TOP") {
        if (isEmergencyStopActive()) {
          goToScreen(Screen::ESTOP);
          break;
        }
        saveStage(SavedStage::MIXING_IN_PROGRESS, selectedRecipe);
        goToScreen(Screen::MIXING);
        RunResult result = runRecipeBlocking(selectedRecipe);
        if (result == RunResult::OK) {
          saveStage(SavedStage::MIX_DONE_WAITING_RELEASE, selectedRecipe);
          goToScreen(Screen::MIX_DONE);
        } else if (result == RunResult::ESTOP) {
          saveStage(SavedStage::IDLE, 0);
          goToScreen(Screen::ESTOP);
        } else {
          saveStage(SavedStage::IDLE, 0);
          goToFault(result);
        }
      } else if (btn == "BOTTOM") {
        goToScreen(Screen::RECIPE_SELECT);
      }
      break;

    case Screen::MIX_DONE:
      if (btn == "RELEASE") {
        bool aborted = runRelease();
        saveStage(SavedStage::IDLE, 0);
        goToScreen(aborted ? Screen::ESTOP : Screen::RECIPE_SELECT);
      }
      break;

    case Screen::POWER_RECOVERY:
      if (btn == "RELEASE_NOW") {
        bool aborted = runRelease();
        saveStage(SavedStage::IDLE, 0);
        goToScreen(aborted ? Screen::ESTOP : Screen::RECIPE_SELECT);
      } else if (btn == "DISCARD") {
        saveStage(SavedStage::IDLE, 0);
        goToScreen(Screen::RECIPE_SELECT);
      }
      break;

    case Screen::EMERGENCY_CONFIRM:
      if (btn == "YES") {
        bool aborted = runRelease();
        saveStage(SavedStage::IDLE, 0);
        goToScreen(aborted ? Screen::ESTOP : screenBeforeEmergency);
      } else if (btn == "NO") {
        goToScreen(screenBeforeEmergency);
      }
      break;

    case Screen::FAULT:
      if (btn == "OK") {
        goToScreen(Screen::RECIPE_SELECT);
      }
      break;

    default:
      break;
  }
}

void handlePhysicalButtons() {
  if (checkButtonPressed(btnRecipe1)) {
    handleButton("1");
  }
  if (checkButtonPressed(btnRecipe2)) {
    handleButton("2");
  }
  if (checkButtonPressed(btnRecipe3)) {
    handleButton("3");
  }
  if (checkButtonPressed(btnConfirm)) {
    // Same physical button, meaning depends on what's on screen right now.
    if (currentScreen == Screen::RECIPE_SELECT) {
      handleButton("EMERGENCY");
    } else if (currentScreen == Screen::RECIPE_DETAIL) {
      handleButton("TOP");
    } else if (currentScreen == Screen::MIX_DONE) {
      handleButton("RELEASE");
    } else if (currentScreen == Screen::POWER_RECOVERY) {
      handleButton("RELEASE_NOW");
    } else if (currentScreen == Screen::EMERGENCY_CONFIRM) {
      handleButton("YES");
    } else if (currentScreen == Screen::FAULT) {
      handleButton("OK");
    }
  }
}

// Cancels the force-release prompt if it sits unanswered too long.
void monitorEmergencyConfirmTimeout() {
  if (currentScreen == Screen::EMERGENCY_CONFIRM &&
      millis() - emergencyConfirmStartedAt >= EMERGENCY_CONFIRM_TIMEOUT_MS) {
    Serial.println("Emergency release prompt timed out, cancelling.");
    goToScreen(screenBeforeEmergency);
  }
}

// Catches the E-Stop being pressed while idle (mid-recipe presses are
// already handled inline by waitInterruptible / runRecipeBlocking).
void monitorEmergencyStop() {
  static bool lastLogged = false;
  bool active = isEmergencyStopActive();
  if (active != lastLogged) {
    lastLogged = active;
    Serial.print("E-Stop pin (GPIO");
    Serial.print(ESTOP_PIN);
    Serial.print(") is now ");
    Serial.println(active ? "LOW = pressed" : "HIGH = released");
  }

  if (active && currentScreen != Screen::ESTOP && currentScreen != Screen::MIXING) {
    saveStage(SavedStage::IDLE, 0);
    goToScreen(Screen::ESTOP);
  } else if (!active && currentScreen == Screen::ESTOP) {
    // Switch twisted back up: return to normal on its own. Nothing starts
    // automatically from the recipe-select screen, so this is safe.
    saveStage(SavedStage::IDLE, 0);
    goToScreen(Screen::RECIPE_SELECT);
  }
}

// While no recipe is running, keeps the display's load-cell readout fresh.
// Non-blocking: only reads when the HX711 already has a conversion ready.
void reportIdleWeight() {
  static uint32_t lastSentAt = 0;
  static uint32_t lastReadAt = 0;
  static float smoothed = 0;

  if (scaleReady && scale.is_ready()) {
    float w = scale.get_units(1) * LOADCELL_UNITS_TO_GRAMS;
    smoothed = (lastReadAt == 0) ? w : smoothed * 0.6f + w * 0.4f;
    lastReadAt = millis();
  }

  if (millis() - lastSentAt < LOAD_REPORT_INTERVAL_MS || !DisplaySerial.hasClient()) {
    return;
  }
  lastSentAt = millis();

  if (lastReadAt == 0 || millis() - lastReadAt > 1500) {
    DisplaySerial.println("LOAD NA");
  } else {
    DisplaySerial.println(String("LOAD ") + String((int)lroundf(smoothed)));
  }
}

void handleDisplayLine(const String &line) {
  if (line == "READY") {
    // Display finished its local boot animation and is asking what to show.
    // Recover from a power cut here instead of always starting fresh.
    uint8_t rawStage = prefs.getUChar("stage", 0);
    SavedStage stage = static_cast<SavedStage>(rawStage);
    Serial.print("READY received. NVS raw stage=");
    Serial.print(rawStage);
    Serial.print(" recipe=");
    Serial.println(prefs.getUChar("recipe", 0));

    if (stage == SavedStage::MIX_DONE_WAITING_RELEASE) {
      selectedRecipe = prefs.getUChar("recipe", 1);
      goToScreen(Screen::MIX_DONE);
    } else if (stage == SavedStage::MIXING_IN_PROGRESS) {
      selectedRecipe = prefs.getUChar("recipe", 1);
      goToScreen(Screen::POWER_RECOVERY);
    } else {
      selectedRecipe = 1;
      goToScreen(Screen::RECIPE_SELECT);
    }
  } else if (line.startsWith("BTN ")) {
    handleButton(line.substring(4));
  } else {
    Serial.print("Unknown message from display: ");
    Serial.println(line);
  }
}

void handleDisplaySerial() {
  if (!DisplaySerial.available()) {
    return;
  }

  String line = DisplaySerial.readStringUntil('\n');
  line.trim();
  line.toUpperCase();
  if (line.length() == 0) {
    return;
  }

  handleDisplayLine(line);
}

void setup() {
  Serial.begin(115200);
  delay(500);

  Serial.println("ESP32 38pin main board: dispenser controller + screen state owner");
  Serial.println("Starting Bluetooth SPP server, waiting for display to connect...");

  DisplaySerial.begin(BLUETOOTH_LOCAL_NAME);

  bool prefsOk = prefs.begin("verdant", false);
  Serial.print("prefs.begin() = ");
  Serial.println(prefsOk ? "ok" : "FAILED");
  Serial.print("Boot-time NVS stage=");
  Serial.print(prefs.getUChar("stage", 0));
  Serial.print(" recipe=");
  Serial.println(prefs.getUChar("recipe", 0));

  Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN);
  Wire.setClock(100000);

  pwm.begin();
  pwm.setOscillatorFrequency(27000000);
  pwm.setPWMFreq(SERVO_PWM_FREQUENCY_HZ);
  delay(10);

  closeAndRelease(CHANNEL_INGREDIENT_A);
  closeAndRelease(CHANNEL_INGREDIENT_B);
  closeAndRelease(CHANNEL_INGREDIENT_C);
  closeAndRelease(CHANNEL_RELEASE_GATE);

  pinMode(MOTOR_IN1_PIN, OUTPUT);
  pinMode(MOTOR_IN2_PIN, OUTPUT);
  stirMotorStop();

  initButton(btnRecipe1, BTN_RECIPE_1_PIN);
  initButton(btnRecipe2, BTN_RECIPE_2_PIN);
  initButton(btnRecipe3, BTN_RECIPE_3_PIN);
  initButton(btnConfirm, BTN_CONFIRM_PIN);
  pinMode(ESTOP_PIN, INPUT_PULLUP);

  scale.begin(HX711_DT_PIN, HX711_SCK_PIN);
  if (ensureScaleReady()) {
    Serial.println("HX711 ready, tared to 0 g.");
    printWeight("Weight after tare");
  } else {
    Serial.println("HX711 NOT found - check DT/SCK/VCC/GND. Weights will show n/a.");
  }

  Serial.println("Ready.");
}

void loop() {
  handleDisplaySerial();
  handlePhysicalButtons();
  monitorEmergencyStop();
  monitorEmergencyConfirmTimeout();
  reportIdleWeight();
  delay(20);
}
