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
  EMERGENCY_CONFIRM
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

uint32_t mixStartAt = 0;
uint32_t lastMixingRedrawAt = 0;

uint32_t lastTouchAt = 0;
uint32_t lastReadyRetryAt = 0;
constexpr uint32_t READY_RETRY_MS = 1500;

Button recipeButtons[3] = {
  {15, 70, 92, 100, "RECIPE 1", TFT_DARKGREEN},
  {114, 70, 92, 100, "RECIPE 2", TFT_NAVY},
  {213, 70, 92, 100, "RECIPE 3", TFT_MAROON},
};
Button emergencyButton = {80, 190, 160, 36, "EMERGENCY RELEASE", TFT_RED};

Button startMixButton = {40, 65, 240, 75, "START MIXING", TFT_DARKGREEN};
Button backButton = {40, 155, 240, 45, "BACK", TFT_MAROON};

Button releaseButton = {40, 100, 240, 75, "RELEASE FERTILIZER", TFT_DARKGREEN};

Button releaseNowButton = {20, 120, 130, 70, "RELEASE NOW", TFT_DARKGREEN};
Button discardButton = {170, 120, 130, 70, "DISCARD & RESET", TFT_MAROON};

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
  tft.drawString("UART: TX GPIO22 -> Main RX GPIO16 | RX GPIO27 <- Main TX GPIO17", 160, 233);
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
  drawFooter();
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

void drawRecipeSelect() {
  tft.fillScreen(TFT_BLACK);
  drawTitle("Select Recipe");
  for (auto &button : recipeButtons) {
    drawButton(button);
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
  drawButton(startMixButton);
  drawButton(backButton);
  drawFooter();
}

void handleRecipeDetailTouch(int x, int y) {
  if (isInside(startMixButton, x, y)) sendToMainBoard("BTN TOP");
  else if (isInside(backButton, x, y)) sendToMainBoard("BTN BOTTOM");
}

// ---------- MIXING ----------

void drawMixing() {
  tft.fillScreen(TFT_BLACK);
  char title[16];
  snprintf(title, sizeof(title), "Recipe %d", selectedRecipe);
  drawTitle(title);

  tft.setTextDatum(middle_center);
  tft.setFont(&fonts::Font4);
  tft.setTextColor(TFT_YELLOW, TFT_BLACK);
  tft.drawString("Mixing in progress...", 160, 100);

  tft.setFont(&fonts::Font2);
  tft.setTextColor(TFT_LIGHTGREY, TFT_BLACK);
  tft.drawString("Elapsed: 0s", 160, 140);

  drawFooter();
  mixStartAt = millis();
  lastMixingRedrawAt = 0;
}

void updateMixingClock() {
  // Cosmetic only: the main board decides when mixing is actually done and
  // will push the next SCREEN line itself. This just keeps the UI alive
  // while its blocking recipe runs.
  uint32_t elapsed = millis() - mixStartAt;
  if (elapsed - lastMixingRedrawAt >= 1000 || lastMixingRedrawAt == 0) {
    lastMixingRedrawAt = elapsed;
    tft.fillRect(60, 128, 200, 24, TFT_BLACK);
    tft.setTextDatum(middle_center);
    tft.setFont(&fonts::Font2);
    tft.setTextColor(TFT_LIGHTGREY, TFT_BLACK);
    char label[24];
    snprintf(label, sizeof(label), "Elapsed: %lus", (unsigned long)(elapsed / 1000));
    tft.drawString(label, 160, 140);
  }
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
  tft.drawString("Mixing complete!", 160, 55);

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
  tft.drawString("Force-release fertilizer now?", 18, 60);
  tft.drawString("Use only if the system is stuck.", 18, 82);

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
    default: break; // BOOT_LOADING, WAITING_FOR_MAIN and MIXING ignore touch
  }
}

// ---------- Incoming "SCREEN <name> <recipe>" from the main board ----------

void handleMainBoardLine(const String &line) {
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
    if (currentScreen == Screen::MIXING) {
      updateMixingClock();
    }
    handleTouch();
  }

  handleMainBoardSerial();

  delay(20);
}
