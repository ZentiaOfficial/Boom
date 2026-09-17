#include <Wire.h>
#include <Adafruit_PWMServoDriver.h>
#include <Preferences.h>
#include <BluetoothSerial.h>

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

BluetoothSerial DisplaySerial;
Adafruit_PWMServoDriver pwm = Adafruit_PWMServoDriver(PCA9685_I2C_ADDRESS);
Preferences prefs;

struct RecipeStep {
  uint8_t channel;
  uint16_t openDurationMs;
};

// PLACEHOLDER values: channels/order match the wiring, but open durations
// are not tuned to any real fertilizer amount yet. Adjust after measuring
// how much each gate dispenses per second of open time.
const RecipeStep RECIPE_1[] = {
  {CHANNEL_INGREDIENT_A, 2000},
  {CHANNEL_INGREDIENT_B, 1000},
};
const RecipeStep RECIPE_2[] = {
  {CHANNEL_INGREDIENT_B, 2000},
  {CHANNEL_INGREDIENT_C, 1000},
};
const RecipeStep RECIPE_3[] = {
  {CHANNEL_INGREDIENT_A, 1000},
  {CHANNEL_INGREDIENT_B, 1000},
  {CHANNEL_INGREDIENT_C, 1000},
};

struct Recipe {
  const RecipeStep *steps;
  uint8_t stepCount;
};

const Recipe RECIPES[] = {
  {RECIPE_1, sizeof(RECIPE_1) / sizeof(RECIPE_1[0])},
  {RECIPE_2, sizeof(RECIPE_2) / sizeof(RECIPE_2[0])},
  {RECIPE_3, sizeof(RECIPE_3) / sizeof(RECIPE_3[0])},
};
const uint8_t RECIPE_COUNT = sizeof(RECIPES) / sizeof(RECIPES[0]);

enum class Screen : uint8_t {
  RECIPE_SELECT,
  RECIPE_DETAIL,
  MIXING,
  MIX_DONE,
  POWER_RECOVERY,
  EMERGENCY_CONFIRM
};

enum class SavedStage : uint8_t {
  IDLE = 0,
  MIXING_IN_PROGRESS = 1,
  MIX_DONE_WAITING_RELEASE = 2
};

Screen currentScreen = Screen::RECIPE_SELECT;
Screen screenBeforeEmergency = Screen::RECIPE_SELECT;
uint8_t selectedRecipe = 1;

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

void runIngredientStep(uint8_t channel, uint16_t openDurationMs) {
  Serial.print("Opening channel ");
  Serial.print(channel);
  Serial.print(" for ");
  Serial.print(openDurationMs);
  Serial.println(" ms");

  setGateAngle(channel, GATE_OPEN_ANGLE);
  delay(openDurationMs);
  closeAndRelease(channel);
}

void runRecipeBlocking(uint8_t recipeNumber) {
  if (recipeNumber < 1 || recipeNumber > RECIPE_COUNT) {
    Serial.println("Unknown recipe number, ignoring.");
    return;
  }

  const Recipe &recipe = RECIPES[recipeNumber - 1];
  Serial.print("Running recipe ");
  Serial.println(recipeNumber);

  for (uint8_t i = 0; i < recipe.stepCount; i++) {
    runIngredientStep(recipe.steps[i].channel, recipe.steps[i].openDurationMs);
  }

  Serial.println("Recipe complete.");
}

void runRelease() {
  Serial.println("Releasing gate (channel 12)");
  setGateAngle(CHANNEL_RELEASE_GATE, GATE_OPEN_ANGLE);
  delay(2000);
  closeAndRelease(CHANNEL_RELEASE_GATE);
  Serial.println("Release complete.");
}

void saveStage(SavedStage stage, uint8_t recipe) {
  prefs.putUChar("stage", static_cast<uint8_t>(stage));
  prefs.putUChar("recipe", recipe);
}

void sendScreen(const char *name) {
  String msg = String("SCREEN ") + name + " " + String(selectedRecipe);
  DisplaySerial.println(msg);
  Serial.print("-> ");
  Serial.println(msg);
}

void goToScreen(Screen s) {
  currentScreen = s;
  switch (s) {
    case Screen::RECIPE_SELECT: sendScreen("RECIPE_SELECT"); break;
    case Screen::RECIPE_DETAIL: sendScreen("RECIPE_DETAIL"); break;
    case Screen::MIXING: sendScreen("MIXING"); break;
    case Screen::MIX_DONE: sendScreen("MIX_DONE"); break;
    case Screen::POWER_RECOVERY: sendScreen("POWER_RECOVERY"); break;
    case Screen::EMERGENCY_CONFIRM: sendScreen("EMERGENCY_CONFIRM"); break;
  }
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
      if (btn == "TOP") {
        saveStage(SavedStage::MIXING_IN_PROGRESS, selectedRecipe);
        goToScreen(Screen::MIXING);
        runRecipeBlocking(selectedRecipe);
        saveStage(SavedStage::MIX_DONE_WAITING_RELEASE, selectedRecipe);
        goToScreen(Screen::MIX_DONE);
      } else if (btn == "BOTTOM") {
        goToScreen(Screen::RECIPE_SELECT);
      }
      break;

    case Screen::MIX_DONE:
      if (btn == "RELEASE") {
        runRelease();
        saveStage(SavedStage::IDLE, 0);
        goToScreen(Screen::RECIPE_SELECT);
      }
      break;

    case Screen::POWER_RECOVERY:
      if (btn == "RELEASE_NOW") {
        runRelease();
        saveStage(SavedStage::IDLE, 0);
        goToScreen(Screen::RECIPE_SELECT);
      } else if (btn == "DISCARD") {
        saveStage(SavedStage::IDLE, 0);
        goToScreen(Screen::RECIPE_SELECT);
      }
      break;

    case Screen::EMERGENCY_CONFIRM:
      if (btn == "YES") {
        runRelease();
        saveStage(SavedStage::IDLE, 0);
        goToScreen(screenBeforeEmergency);
      } else if (btn == "NO") {
        goToScreen(screenBeforeEmergency);
      }
      break;

    default:
      break;
  }
}

void handleDisplayLine(const String &line) {
  if (line == "READY") {
    // Display finished its local boot animation and is asking what to show.
    // Recover from a power cut here instead of always starting fresh.
    SavedStage stage = static_cast<SavedStage>(prefs.getUChar("stage", 0));

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

  prefs.begin("verdant", false);

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

  Serial.println("Ready.");
}

void loop() {
  handleDisplaySerial();
  delay(20);
}
