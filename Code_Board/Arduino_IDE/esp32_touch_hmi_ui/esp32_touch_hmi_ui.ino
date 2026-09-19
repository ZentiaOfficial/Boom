#include <Arduino.h>
#include <LovyanGFX.hpp>
#include <BluetoothSerial.h>

class LGFX : public lgfx::LGFX_Device {
  lgfx::Panel_ILI9341 _panel;
  lgfx::Bus_SPI _bus;
  lgfx::Light_PWM _light;
  lgfx::Touch_XPT2046 _touch;

public:
  LGFX() {
    {
      auto cfg = _bus.config();
      cfg.spi_host = HSPI_HOST;
      cfg.spi_mode = 0;
      cfg.freq_write = 40000000;
      cfg.freq_read = 16000000;
      cfg.spi_3wire = false;
      cfg.use_lock = true;
      cfg.dma_channel = 1;
      cfg.pin_sclk = 14;
      cfg.pin_mosi = 13;
      cfg.pin_miso = 12;
      cfg.pin_dc = 2;
      _bus.config(cfg);
      _panel.setBus(&_bus);
    }

    {
      auto cfg = _panel.config();
      cfg.pin_cs = 15;
      cfg.pin_rst = -1;
      cfg.pin_busy = -1;
      cfg.panel_width = 240;
      cfg.panel_height = 320;
      cfg.offset_x = 0;
      cfg.offset_y = 0;
      cfg.offset_rotation = 0;
      cfg.dummy_read_pixel = 8;
      cfg.dummy_read_bits = 1;
      cfg.readable = true;
      cfg.invert = false;
      cfg.rgb_order = false;
      cfg.dlen_16bit = false;
      cfg.bus_shared = true;
      _panel.config(cfg);
    }

    {
      auto cfg = _light.config();
      cfg.pin_bl = 21;
      cfg.invert = false;
      cfg.freq = 44100;
      cfg.pwm_channel = 7;
      _light.config(cfg);
      _panel.setLight(&_light);
    }

    {
      auto cfg = _touch.config();
      cfg.x_min = 200;
      cfg.x_max = 3900;
      cfg.y_min = 200;
      cfg.y_max = 3900;
      cfg.pin_int = 36;
      cfg.bus_shared = false;
      cfg.offset_rotation = 0;
      cfg.spi_host = VSPI_HOST;
      cfg.freq = 2500000;
      cfg.pin_sclk = 25;
      cfg.pin_mosi = 32;
      cfg.pin_miso = 39;
      cfg.pin_cs = 33;
      _touch.config(cfg);
      _panel.setTouch(&_touch);
    }

    setPanel(&_panel);
  }
};

LGFX tft;
BluetoothSerial MainBoardSerial;

#define BLUETOOTH_LOCAL_NAME "VerdantDisplay"
#define BLUETOOTH_SERVER_NAME "VerdantMain"

constexpr uint32_t BOOT_LOADING_MS = 5000;
constexpr uint32_t BT_CONNECT_RETRY_MS = 2000;
uint32_t lastBtConnectAttemptAt = 0;

enum class Screen : uint8_t {
  BOOT_LOADING,
  WAITING_FOR_MAIN,
  RECIPE_SELECT,
  RECIPE_DETAIL,
  MIXING,
  MIX_DONE,
  POWER_RECOVERY,
  EMERGENCY_CONFIRM,
  ESTOP,
  FAULT
};

struct Button {
  int x;
  int y;
  int w;
  int h;
  const char *label;
  uint16_t fill;
};

Screen currentScreen = Screen::BOOT_LOADING;
uint8_t selectedRecipe = 1;

uint32_t bootStartAt = 0;
int lastBootBarWidth = -1;

// Live data pushed by the main board (all grams, net of the tared container).
// The chart's 1.25 kg top and 1.00 kg line mirror WEIGHT_HARD_LIMIT_G /
// WEIGHT_LIMIT_G on the main board.
int targetG[3] = {0, 0, 0};       // recipe targets for N, P, K
int dispensedG[3] = {0, 0, 0};    // dispensed so far for N, P, K
uint8_t mixPhase = 3;             // 0..2 dispensing N/P/K, 3 settling, 4 stirring, 5 done
bool hasResult = false;           // dispensedG holds the finished batch
bool loadValid = false;
int loadGrams = 0;                // latest load cell reading
uint8_t faultKind = 0;            // 0 scale, 1 no flow, 2 overweight

constexpr float CHART_MAX_G = 1250.0f;
constexpr float CHART_LIMIT_G = 1000.0f;
constexpr int CHART_X = 236;
constexpr int CHART_Y = 40;
constexpr int CHART_W = 40;
constexpr int CHART_H = 178;
constexpr int CHART_INNER_H = CHART_H - 2;
const uint16_t INGREDIENT_COLORS[3] = {TFT_GREEN, TFT_ORANGE, TFT_CYAN};
const char INGREDIENT_LETTERS[3] = {'N', 'P', 'K'};

uint32_t lastTouchAt = 0;
uint32_t lastReadyRetryAt = 0;
constexpr uint32_t READY_RETRY_MS = 1500;

// Recipe-select screen is a list of full-width rows (whole row is tappable).
Button recipeButtons[3] = {
  {15, 62, 290, 34, "RECIPE 1", TFT_DARKGREEN},
  {15, 102, 290, 34, "RECIPE 2", TFT_NAVY},
  {15, 142, 290, 34, "RECIPE 3", TFT_MAROON},
};
Button emergencyButton = {15, 182, 290, 34, "EMERGENCY RELEASE", TFT_RED};

// Display-only nutrient ratios (N, P, K) shown in the recipe table. The
// actual dispensing recipes live on the main board.
const int RECIPE_NPK[3][3] = {
  {46, 0, 0},
  {15, 15, 15},
  {12, 24, 12},
};
const char *const NPK_LABELS[3] = {"N", "P", "K"};
const int NPK_COLUMN_X[3] = {190, 235, 280};

Button startMixButton = {40, 65, 240, 75, "START MIXING", TFT_DARKGREEN};
Button backButton = {40, 155, 240, 45, "BACK", TFT_MAROON};

Button releaseButton = {40, 112, 240, 70, "RELEASE FERTILIZER", TFT_DARKGREEN};

Button releaseNowButton = {20, 120, 130, 70, "RELEASE NOW", TFT_DARKGREEN};
Button discardButton = {170, 120, 130, 70, "DISCARD & RESET", TFT_MAROON};

Button faultOkButton = {100, 160, 120, 50, "OK", TFT_MAROON};

Button confirmYesButton = {40, 130, 100, 60, "YES", TFT_RED};
Button confirmNoButton = {180, 130, 100, 60, "NO", TFT_DARKGREEN};

void goToScreen(Screen s);

bool isInside(const Button &button, int x, int y) {
  return x >= button.x && x <= button.x + button.w && y >= button.y && y <= button.y + button.h;
}

void drawButton(const Button &button) {
  tft.fillRoundRect(button.x, button.y, button.w, button.h, 8, button.fill);
  tft.drawRoundRect(button.x, button.y, button.w, button.h, 8, TFT_WHITE);
  tft.setTextColor(TFT_WHITE, button.fill);
  tft.setTextDatum(middle_center);
  tft.setFont(&fonts::Font2);
  tft.drawString(button.label, button.x + button.w / 2, button.y + button.h / 2);
}

void drawTitle(const char *title) {
  tft.setTextDatum(top_left);
  tft.setFont(&fonts::Font4);
  tft.setTextColor(TFT_WHITE, TFT_BLACK);
  tft.drawString(title, 18, 14);
}

void drawFooter() {
  tft.fillRect(0, 226, 320, 14, TFT_BLACK);
  tft.setTextDatum(middle_center);
  tft.setFont(&fonts::Font0);
  tft.setTextColor(TFT_LIGHTGREY, TFT_BLACK);
  char text[32];
  if (loadValid) {
    float kg = loadGrams / 1000.0f;
    snprintf(text, sizeof(text), "Load cell: %.3f kg", kg);
  } else {
    snprintf(text, sizeof(text), "Load cell: --");
  }
  tft.drawString(text, 160, 233);
}

void sendToMainBoard(const String &line) {
  MainBoardSerial.println(line);
  Serial.print("-> ");
  Serial.println(line);
}

// ---------- BOOT_LOADING / WAITING_FOR_MAIN ----------

void drawBootLoading() {
  tft.fillScreen(TFT_BLACK);
  tft.setTextDatum(middle_center);
  tft.setFont(&fonts::Font4);
  tft.setTextColor(TFT_WHITE, TFT_BLACK);
  tft.drawString("Loading...", 160, 90);

  tft.drawRoundRect(40, 130, 240, 24, 6, TFT_LIGHTGREY);
  lastBootBarWidth = -1;
}

void drawWaitingForMain() {
  tft.fillScreen(TFT_BLACK);
  tft.setTextDatum(middle_center);
  tft.setFont(&fonts::Font4);
  tft.setTextColor(TFT_YELLOW, TFT_BLACK);
  tft.drawString("Waiting for main board...", 160, 100);
  tft.setFont(&fonts::Font2);
  tft.setTextColor(TFT_LIGHTGREY, TFT_BLACK);
  tft.drawString("Connecting over Bluetooth...", 160, 130);
}

void ensureBluetoothConnected() {
  if (MainBoardSerial.connected()) {
    return;
  }
  if (millis() - lastBtConnectAttemptAt < BT_CONNECT_RETRY_MS) {
    return;
  }
  lastBtConnectAttemptAt = millis();
  Serial.println("Attempting Bluetooth connect to main board...");
  MainBoardSerial.connect(BLUETOOTH_SERVER_NAME);
}

void updateBootLoading() {
  uint32_t elapsed = millis() - bootStartAt;
  if (elapsed > BOOT_LOADING_MS) {
    elapsed = BOOT_LOADING_MS;
  }

  int barWidth = (int)((uint32_t)236 * elapsed / BOOT_LOADING_MS);
  if (barWidth != lastBootBarWidth) {
    tft.fillRect(42, 132, 236, 20, TFT_BLACK);
    tft.fillRoundRect(42, 132, barWidth, 20, 4, TFT_CYAN);
    lastBootBarWidth = barWidth;
  }

  if (elapsed >= BOOT_LOADING_MS) {
    lastReadyRetryAt = 0;
    lastBtConnectAttemptAt = 0;
    goToScreen(Screen::WAITING_FOR_MAIN);
  }
}

void updateWaitingForMain() {
  ensureBluetoothConnected();
  if (!MainBoardSerial.connected()) {
    return;
  }

  // The main board might not have finished booting when the first READY
  // was sent, so keep retrying instead of waiting forever for a reply that
  // already got missed.
  if (millis() - lastReadyRetryAt >= READY_RETRY_MS) {
    sendToMainBoard("READY");
    lastReadyRetryAt = millis();
  }
}

// ---------- RECIPE_SELECT ----------

void drawRecipeRow(uint8_t index) {
  const Button &row = recipeButtons[index];
  int midY = row.y + row.h / 2;

  tft.fillRoundRect(row.x, row.y, row.w, row.h, 8, row.fill);
  tft.drawRoundRect(row.x, row.y, row.w, row.h, 8, TFT_WHITE);
  tft.setTextColor(TFT_WHITE, row.fill);
  tft.setFont(&fonts::Font2);

  tft.setTextDatum(middle_left);
  tft.drawString(row.label, row.x + 14, midY);

  tft.setTextDatum(middle_center);
  for (uint8_t col = 0; col < 3; col++) {
    char value[8];
    snprintf(value, sizeof(value), "%d", RECIPE_NPK[index][col]);
    tft.drawString(value, NPK_COLUMN_X[col], midY);
  }
}

void drawRecipeSelect() {
  tft.fillScreen(TFT_BLACK);
  drawTitle("Select Recipe");

  tft.setTextDatum(middle_center);
  tft.setFont(&fonts::Font2);
  tft.setTextColor(TFT_CYAN, TFT_BLACK);
  for (uint8_t col = 0; col < 3; col++) {
    tft.drawString(NPK_LABELS[col], NPK_COLUMN_X[col], 50);
  }

  for (uint8_t i = 0; i < 3; i++) {
    drawRecipeRow(i);
  }
  drawButton(emergencyButton);
  drawFooter();
}

void handleRecipeSelectTouch(int x, int y) {
  if (isInside(recipeButtons[0], x, y)) sendToMainBoard("BTN 1");
  else if (isInside(recipeButtons[1], x, y)) sendToMainBoard("BTN 2");
  else if (isInside(recipeButtons[2], x, y)) sendToMainBoard("BTN 3");
  else if (isInside(emergencyButton, x, y)) sendToMainBoard("BTN EMERGENCY");
}

// ---------- RECIPE_DETAIL ----------

void drawRecipeDetail() {
  tft.fillScreen(TFT_BLACK);
  char title[16];
  snprintf(title, sizeof(title), "Recipe %d", selectedRecipe);
  drawTitle(title);

  tft.setTextDatum(middle_center);
  tft.setFont(&fonts::Font2);
  tft.setTextColor(TFT_LIGHTGREY, TFT_BLACK);
  char target[40];
  snprintf(target, sizeof(target), "N %.2f  P %.2f  K %.2f kg", targetG[0] / 1000.0f,
           targetG[1] / 1000.0f, targetG[2] / 1000.0f);
  tft.drawString(target, 160, 50);

  drawButton(startMixButton);
  drawButton(backButton);
  drawFooter();
}

void handleRecipeDetailTouch(int x, int y) {
  if (isInside(startMixButton, x, y)) sendToMainBoard("BTN TOP");
  else if (isInside(backButton, x, y)) sendToMainBoard("BTN BOTTOM");
}

// ---------- MIXING ----------

const char *phaseText(uint8_t phase) {
  switch (phase) {
    case 0: return "Dispensing N";
    case 1: return "Dispensing P";
    case 2: return "Dispensing K";
    case 3: return "Settling...";
    case 4: return "Stirring...";
    default: return "Done";
  }
}

int chartY(float grams) {
  if (grams < 0) grams = 0;
  if (grams > CHART_MAX_G) grams = CHART_MAX_G;
  return CHART_Y + CHART_H - 1 - (int)(grams / CHART_MAX_G * CHART_INNER_H);
}

// Redraws only the parts that change: bar segments, per-ingredient numbers,
// total and phase text.
void drawMixingDynamic() {
  // Bar: one stacked column, N at the bottom, then P, then K on top.
  tft.fillRect(CHART_X + 1, CHART_Y + 1, CHART_W - 2, CHART_INNER_H, TFT_BLACK);
  float cumulative = 0;
  float cumulativeTarget = 0;
  for (uint8_t i = 0; i < 3; i++) {
    int yLow = chartY(cumulative);
    cumulative += dispensedG[i] > 0 ? dispensedG[i] : 0;
    int yHigh = chartY(cumulative);
    if (yLow > yHigh) {
      tft.fillRect(CHART_X + 1, yHigh, CHART_W - 2, yLow - yHigh, INGREDIENT_COLORS[i]);
    }
    cumulativeTarget += targetG[i];
    if (targetG[i] > 0) {
      int yt = chartY(cumulativeTarget);
      tft.drawFastHLine(CHART_X - 5, yt, 5, TFT_WHITE);  // where this ingredient should end
    }
  }
  tft.drawFastHLine(CHART_X + 1, chartY(CHART_LIMIT_G), CHART_W - 2, TFT_RED);

  for (uint8_t i = 0; i < 3; i++) {
    int y = 58 + i * 30;
    tft.fillRect(38, y - 11, 190, 22, TFT_BLACK);
    tft.setTextDatum(middle_left);
    tft.setFont(&fonts::Font2);
    char row[32];
    if (targetG[i] > 0) {
      bool active = (mixPhase == i);
      tft.setTextColor(active ? TFT_WHITE : TFT_LIGHTGREY, TFT_BLACK);
      snprintf(row, sizeof(row), "%c  %.2f / %.2f kg", INGREDIENT_LETTERS[i],
               dispensedG[i] / 1000.0f, targetG[i] / 1000.0f);
    } else {
      tft.setTextColor(TFT_DARKGREY, TFT_BLACK);
      snprintf(row, sizeof(row), "%c  not used", INGREDIENT_LETTERS[i]);
    }
    tft.drawString(row, 40, y);
  }

  int total = dispensedG[0] + dispensedG[1] + dispensedG[2];
  tft.fillRect(18, 139, 212, 22, TFT_BLACK);
  tft.setTextDatum(middle_left);
  tft.setFont(&fonts::Font2);
  tft.setTextColor(TFT_WHITE, TFT_BLACK);
  char totalText[32];
  snprintf(totalText, sizeof(totalText), "Total  %.2f kg", total / 1000.0f);
  tft.drawString(totalText, 18, 150);

  tft.fillRect(0, 172, 232, 36, TFT_BLACK);
  tft.setFont(&fonts::Font4);
  tft.setTextColor(TFT_YELLOW, TFT_BLACK);
  tft.drawString(phaseText(mixPhase), 18, 190);

  loadGrams = total;
  loadValid = true;
  drawFooter();
}

void drawMixing() {
  tft.fillScreen(TFT_BLACK);
  char title[16];
  snprintf(title, sizeof(title), "Recipe %d", selectedRecipe);
  drawTitle(title);

  for (uint8_t i = 0; i < 3; i++) {
    dispensedG[i] = 0;
  }
  mixPhase = 3;
  hasResult = false;

  tft.drawRect(CHART_X, CHART_Y, CHART_W, CHART_H, TFT_WHITE);
  tft.setTextDatum(middle_left);
  tft.setFont(&fonts::Font0);
  tft.setTextColor(TFT_LIGHTGREY, TFT_BLACK);
  tft.drawString("1.25", CHART_X + CHART_W + 4, chartY(CHART_MAX_G));
  tft.setTextColor(TFT_RED, TFT_BLACK);
  tft.drawString("1.00", CHART_X + CHART_W + 4, chartY(CHART_LIMIT_G));
  tft.setTextColor(TFT_LIGHTGREY, TFT_BLACK);
  tft.drawString("0", CHART_X + CHART_W + 4, chartY(0));

  for (uint8_t i = 0; i < 3; i++) {
    tft.fillRect(18, 58 + i * 30 - 7, 14, 14, INGREDIENT_COLORS[i]);
  }

  drawMixingDynamic();
}

// ---------- MIX_DONE ----------

void drawMixDone() {
  tft.fillScreen(TFT_BLACK);
  char title[16];
  snprintf(title, sizeof(title), "Recipe %d", selectedRecipe);
  drawTitle(title);

  tft.setTextDatum(middle_center);
  tft.setFont(&fonts::Font4);
  tft.setTextColor(TFT_GREEN, TFT_BLACK);
  tft.drawString("Mixing complete!", 160, 52);

  if (hasResult) {
    tft.setFont(&fonts::Font2);
    tft.setTextColor(TFT_WHITE, TFT_BLACK);
    char line[40];
    snprintf(line, sizeof(line), "N %.2f  P %.2f  K %.2f", dispensedG[0] / 1000.0f,
             dispensedG[1] / 1000.0f, dispensedG[2] / 1000.0f);
    tft.drawString(line, 160, 78);
    snprintf(line, sizeof(line), "Total %.2f kg",
             (dispensedG[0] + dispensedG[1] + dispensedG[2]) / 1000.0f);
    tft.drawString(line, 160, 96);
  }

  drawButton(releaseButton);
  drawFooter();
}

void handleMixDoneTouch(int x, int y) {
  if (isInside(releaseButton, x, y)) {
    sendToMainBoard("BTN RELEASE");
    // Optimistic feedback: the main board blocks for a couple seconds while
    // it actually actuates the release gate before it can reply.
    tft.fillScreen(TFT_BLACK);
    tft.setTextDatum(middle_center);
    tft.setFont(&fonts::Font4);
    tft.setTextColor(TFT_CYAN, TFT_BLACK);
    tft.drawString("Dispensing...", 160, 110);
  }
}

// ---------- POWER_RECOVERY ----------

void drawPowerRecovery() {
  tft.fillScreen(TFT_BLACK);
  drawTitle("Power Recovery");

  tft.setTextDatum(top_left);
  tft.setFont(&fonts::Font2);
  tft.setTextColor(TFT_YELLOW, TFT_BLACK);
  char msg[48];
  snprintf(msg, sizeof(msg), "Power was lost while mixing recipe %d.", selectedRecipe);
  tft.drawString(msg, 18, 55);
  tft.drawString("Choose how to continue:", 18, 78);

  drawButton(releaseNowButton);
  drawButton(discardButton);
  drawFooter();
}

void handlePowerRecoveryTouch(int x, int y) {
  if (isInside(releaseNowButton, x, y)) {
    sendToMainBoard("BTN RELEASE_NOW");
    tft.fillScreen(TFT_BLACK);
    tft.setTextDatum(middle_center);
    tft.setFont(&fonts::Font4);
    tft.setTextColor(TFT_CYAN, TFT_BLACK);
    tft.drawString("Dispensing...", 160, 110);
  } else if (isInside(discardButton, x, y)) {
    sendToMainBoard("BTN DISCARD");
  }
}

// ---------- EMERGENCY_CONFIRM ----------

void drawEmergencyConfirm() {
  tft.fillScreen(TFT_BLACK);
  drawTitle("Confirm");

  tft.setTextDatum(top_left);
  tft.setFont(&fonts::Font2);
  tft.setTextColor(TFT_WHITE, TFT_BLACK);
  tft.drawString("Force-release fertilizer now?", 18, 50);
  tft.drawString("Use only if the system is stuck.", 18, 68);
  tft.drawString("Press the green confirm button again,", 18, 88);
  tft.drawString("or wait 10s to cancel.", 18, 106);

  drawButton(confirmYesButton);
  drawButton(confirmNoButton);
  drawFooter();
}

void handleEmergencyConfirmTouch(int x, int y) {
  if (isInside(confirmYesButton, x, y)) {
    sendToMainBoard("BTN YES");
    tft.fillScreen(TFT_BLACK);
    tft.setTextDatum(middle_center);
    tft.setFont(&fonts::Font4);
    tft.setTextColor(TFT_CYAN, TFT_BLACK);
    tft.drawString("Dispensing...", 160, 110);
  } else if (isInside(confirmNoButton, x, y)) {
    sendToMainBoard("BTN NO");
  }
}

// ---------- ESTOP ----------

void drawEstop() {
  tft.fillScreen(TFT_BLACK);

  tft.setTextDatum(middle_center);
  tft.setFont(&fonts::Font4);
  tft.setTextColor(TFT_RED, TFT_BLACK);
  tft.drawString("EMERGENCY STOP", 160, 50);

  tft.setTextDatum(top_left);
  tft.setFont(&fonts::Font2);
  tft.setTextColor(TFT_WHITE, TFT_BLACK);
  tft.drawString("Motor power is cut.", 18, 95);
  tft.drawString("Twist the red switch to release it.", 18, 120);
  tft.drawString("This screen closes by itself.", 18, 145);

  drawFooter();
}

// ---------- FAULT ----------

void drawFault() {
  tft.fillScreen(TFT_BLACK);

  tft.setTextDatum(middle_center);
  tft.setFont(&fonts::Font4);
  tft.setTextColor(TFT_RED, TFT_BLACK);
  tft.drawString("FAULT", 160, 40);

  const char *line1 = "Load cell is not responding.";
  const char *line2 = "Check the HX711 wiring.";
  if (faultKind == 1) {
    line1 = "Fertilizer is not flowing.";
    line2 = "Check the hopper and the gate.";
  } else if (faultKind == 2) {
    line1 = "Weight passed the 1.25 kg limit.";
    line2 = "The gate was closed.";
  }

  tft.setTextDatum(top_left);
  tft.setFont(&fonts::Font2);
  tft.setTextColor(TFT_WHITE, TFT_BLACK);
  tft.drawString(line1, 18, 78);
  tft.drawString(line2, 18, 100);
  tft.drawString("Empty the container, then OK.", 18, 122);

  drawButton(faultOkButton);
  drawFooter();
}

void handleFaultTouch(int x, int y) {
  if (isInside(faultOkButton, x, y)) sendToMainBoard("BTN OK");
}

// ---------- Screen dispatch ----------

void goToScreen(Screen s) {
  currentScreen = s;
  switch (s) {
    case Screen::BOOT_LOADING: drawBootLoading(); break;
    case Screen::WAITING_FOR_MAIN: drawWaitingForMain(); break;
    case Screen::RECIPE_SELECT: drawRecipeSelect(); break;
    case Screen::RECIPE_DETAIL: drawRecipeDetail(); break;
    case Screen::MIXING: drawMixing(); break;
    case Screen::MIX_DONE: drawMixDone(); break;
    case Screen::POWER_RECOVERY: drawPowerRecovery(); break;
    case Screen::EMERGENCY_CONFIRM: drawEmergencyConfirm(); break;
    case Screen::ESTOP: drawEstop(); break;
    case Screen::FAULT: drawFault(); break;
  }
}

void handleTouch() {
  int x = 0;
  int y = 0;

  if (!tft.getTouch(&x, &y)) {
    return;
  }

  // Touch X reads mirrored versus the display in this rotation; measured
  // empirically (pressing the rightmost button reported a left-side x, and
  // vice versa), so flip it here rather than in the touch driver config.
  x = 320 - x;

  if (millis() - lastTouchAt < 300) {
    return;
  }
  lastTouchAt = millis();

  switch (currentScreen) {
    case Screen::RECIPE_SELECT: handleRecipeSelectTouch(x, y); break;
    case Screen::RECIPE_DETAIL: handleRecipeDetailTouch(x, y); break;
    case Screen::MIX_DONE: handleMixDoneTouch(x, y); break;
    case Screen::POWER_RECOVERY: handlePowerRecoveryTouch(x, y); break;
    case Screen::EMERGENCY_CONFIRM: handleEmergencyConfirmTouch(x, y); break;
    case Screen::FAULT: handleFaultTouch(x, y); break;
    default: break; // BOOT_LOADING, WAITING_FOR_MAIN, MIXING and ESTOP ignore touch
  }
}

// ---------- Incoming "SCREEN <name> <recipe>" from the main board ----------

void handleMainBoardLine(const String &line) {
  if (line.startsWith("LOAD ")) {
    String value = line.substring(5);
    bool valid = !value.startsWith("NA");
    int grams = value.toInt();
    if (valid != loadValid || grams != loadGrams) {
      loadValid = valid;
      loadGrams = grams;
      if (currentScreen != Screen::BOOT_LOADING && currentScreen != Screen::WAITING_FOR_MAIN &&
          currentScreen != Screen::MIXING) {
        drawFooter();
      }
    }
    return;
  }

  if (line.startsWith("TARGET ")) {
    int n = 0, p = 0, k = 0;
    if (sscanf(line.c_str(), "TARGET %d %d %d", &n, &p, &k) == 3) {
      targetG[0] = n;
      targetG[1] = p;
      targetG[2] = k;
    }
    return;
  }

  if (line.startsWith("WEIGHT ")) {
    int n = 0, p = 0, k = 0, phase = 0;
    if (sscanf(line.c_str(), "WEIGHT %d %d %d %d", &n, &p, &k, &phase) == 4) {
      dispensedG[0] = n;
      dispensedG[1] = p;
      dispensedG[2] = k;
      mixPhase = (uint8_t)phase;
      if (phase == 5) {
        hasResult = true;
      }
      if (currentScreen == Screen::MIXING) {
        drawMixingDynamic();
      }
    }
    return;
  }

  if (!line.startsWith("SCREEN ")) {
    Serial.print("Ignoring unexpected line from main board: ");
    Serial.println(line);
    return;
  }

  String rest = line.substring(7);
  int spaceIdx = rest.indexOf(' ');
  String name = spaceIdx >= 0 ? rest.substring(0, spaceIdx) : rest;
  int recipe = spaceIdx >= 0 ? rest.substring(spaceIdx + 1).toInt() : 0;
  if (recipe >= 1 && recipe <= 3) {
    selectedRecipe = (uint8_t)recipe;
  }

  if (name == "RECIPE_SELECT") goToScreen(Screen::RECIPE_SELECT);
  else if (name == "RECIPE_DETAIL") goToScreen(Screen::RECIPE_DETAIL);
  else if (name == "MIXING") goToScreen(Screen::MIXING);
  else if (name == "MIX_DONE") goToScreen(Screen::MIX_DONE);
  else if (name == "POWER_RECOVERY") goToScreen(Screen::POWER_RECOVERY);
  else if (name == "EMERGENCY_CONFIRM") goToScreen(Screen::EMERGENCY_CONFIRM);
  else if (name == "ESTOP") goToScreen(Screen::ESTOP);
  else if (name.startsWith("FAULT")) {
    faultKind = name == "FAULT_TIMEOUT" ? 1 : (name == "FAULT_OVERWEIGHT" ? 2 : 0);
    goToScreen(Screen::FAULT);
  }
}

void handleMainBoardSerial() {
  if (!MainBoardSerial.available()) {
    return;
  }

  String line = MainBoardSerial.readStringUntil('\n');
  line.trim();
  line.toUpperCase();
  if (line.length() == 0) {
    return;
  }

  handleMainBoardLine(line);
}

void setup() {
  Serial.begin(115200);
  delay(300);

  MainBoardSerial.begin(BLUETOOTH_LOCAL_NAME, true);

  tft.init();
  tft.setRotation(1);
  tft.setBrightness(220);

  bootStartAt = millis();
  goToScreen(Screen::BOOT_LOADING);

  Serial.println("ESP32 touch HMI ready (thin client mode).");
}

void loop() {
  if (currentScreen == Screen::BOOT_LOADING) {
    updateBootLoading();
  } else if (currentScreen == Screen::WAITING_FOR_MAIN) {
    updateWaitingForMain();
  } else {
    handleTouch();
  }

  handleMainBoardSerial();

  delay(20);
}
