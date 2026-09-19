#include <Arduino.h>
#include <LovyanGFX.hpp>

// Cute animated heart screen for ESP32-2432S028R / common 2.8 inch ESP32 display.
// Uses the same ILI9341 pin map as the touch HMI prototype in Arduino_IDE.

class LGFX : public lgfx::LGFX_Device {
  lgfx::Panel_ILI9341 _panel;
  lgfx::Bus_SPI _bus;
  lgfx::Light_PWM _light;

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

    setPanel(&_panel);
  }
};

LGFX tft;

uint16_t bgTop;
uint16_t bgBottom;
uint16_t heartMain;
uint16_t heartShadow;
uint16_t cheekPink;
uint16_t ink;
uint16_t cream;
uint16_t mint;
uint16_t sun;

uint32_t lastFrameAt = 0;

uint16_t blend(uint16_t colorA, uint16_t colorB, uint8_t amount) {
  const uint8_t rA = ((colorA >> 11) & 0x1F) << 3;
  const uint8_t gA = ((colorA >> 5) & 0x3F) << 2;
  const uint8_t bA = (colorA & 0x1F) << 3;
  const uint8_t rB = ((colorB >> 11) & 0x1F) << 3;
  const uint8_t gB = ((colorB >> 5) & 0x3F) << 2;
  const uint8_t bB = (colorB & 0x1F) << 3;

  const uint8_t r = (rA * (255 - amount) + rB * amount) / 255;
  const uint8_t g = (gA * (255 - amount) + gB * amount) / 255;
  const uint8_t b = (bA * (255 - amount) + bB * amount) / 255;
  return tft.color565(r, g, b);
}

void drawSparkle(int x, int y, int size, uint16_t color) {
  tft.drawFastVLine(x, y - size, size * 2 + 1, color);
  tft.drawFastHLine(x - size, y, size * 2 + 1, color);
  tft.drawLine(x - size + 1, y - size + 1, x + size - 1, y + size - 1, color);
  tft.drawLine(x - size + 1, y + size - 1, x + size - 1, y - size + 1, color);
}

void drawBackground() {
  for (int y = 0; y < 240; y++) {
    const uint8_t mix = map(y, 0, 239, 0, 255);
    tft.drawFastHLine(0, y, 320, blend(bgTop, bgBottom, mix));
  }

  tft.fillCircle(24, 34, 3, cream);
  tft.fillCircle(292, 38, 4, mint);
  tft.fillCircle(44, 196, 5, sun);
  tft.fillCircle(276, 204, 3, cream);

  drawSparkle(70, 52, 8, sun);
  drawSparkle(252, 70, 7, mint);
  drawSparkle(50, 162, 5, cream);
  drawSparkle(278, 166, 5, sun);

  tft.setTextDatum(middle_center);
  tft.setFont(&fonts::Font4);
  tft.setTextColor(ink, bgTop);
  tft.drawString("Sweet Heart", 160, 28);

  tft.setFont(&fonts::Font2);
  tft.setTextColor(tft.color565(120, 95, 125), bgTop);
  tft.drawString("ESP32 cute display", 160, 50);
}

void drawHeartShape(int cx, int cy, int size, uint16_t color) {
  const int lobeRadius = size / 3;
  const int lobeOffsetX = size / 4;
  const int lobeOffsetY = size / 5;

  tft.fillCircle(cx - lobeOffsetX, cy - lobeOffsetY, lobeRadius, color);
  tft.fillCircle(cx + lobeOffsetX, cy - lobeOffsetY, lobeRadius, color);
  tft.fillTriangle(cx - size / 2, cy - size / 8, cx + size / 2, cy - size / 8, cx, cy + size / 2, color);
  tft.fillCircle(cx, cy, size / 4, color);
}

void drawCuteFace(int cx, int cy, int size) {
  const int eyeY = cy - size / 11;
  const int eyeOffset = size / 4;
  const int eyeRadius = max(4, size / 12);

  tft.fillCircle(cx - eyeOffset, eyeY, eyeRadius, ink);
  tft.fillCircle(cx + eyeOffset, eyeY, eyeRadius, ink);
  tft.fillCircle(cx - eyeOffset - 2, eyeY - 2, 2, TFT_WHITE);
  tft.fillCircle(cx + eyeOffset - 2, eyeY - 2, 2, TFT_WHITE);

  const int cheekY = cy + size / 8;
  tft.fillCircle(cx - size / 3, cheekY, max(5, size / 10), cheekPink);
  tft.fillCircle(cx + size / 3, cheekY, max(5, size / 10), cheekPink);

  const int smileY = cy + size / 8;
  tft.drawLine(cx - 12, smileY, cx - 5, smileY + 6, ink);
  tft.drawLine(cx - 5, smileY + 6, cx, smileY + 8, ink);
  tft.drawLine(cx, smileY + 8, cx + 5, smileY + 6, ink);
  tft.drawLine(cx + 5, smileY + 6, cx + 12, smileY, ink);
}

void drawCaption(uint8_t pulse) {
  tft.fillRoundRect(94, 198, 132, 28, 14, cream);
  tft.drawRoundRect(94, 198, 132, 28, 14, sun);

  tft.setTextDatum(middle_center);
  tft.setFont(&fonts::Font4);
  tft.setTextColor(heartMain, cream);
  tft.drawString(pulse > 16 ? "Cute!" : "Love!", 160, 211);
}

void drawHeartFrame() {
  const uint32_t now = millis();
  const uint8_t phase = (now / 32) % 40;
  const uint8_t pulse = phase < 20 ? phase : 40 - phase;
  const int heartSize = 92 + pulse;
  const int cx = 160;
  const int cy = 122;

  tft.fillRoundRect(52, 62, 216, 132, 16, blend(bgTop, bgBottom, 120));

  drawHeartShape(cx + 4, cy + 6, heartSize, heartShadow);
  drawHeartShape(cx, cy, heartSize, heartMain);

  tft.fillCircle(cx - heartSize / 5, cy - heartSize / 3, 9, tft.color565(255, 182, 203));
  tft.fillCircle(cx - heartSize / 5 - 2, cy - heartSize / 3 - 2, 4, TFT_WHITE);

  drawCuteFace(cx, cy, heartSize);
  drawSparkle(92, 96 + pulse / 4, 5, sun);
  drawSparkle(226, 108 - pulse / 5, 6, mint);
  drawCaption(pulse);
}

void setup() {
  Serial.begin(115200);
  delay(300);

  tft.init();
  tft.setRotation(1);
  tft.setBrightness(230);

  bgTop = tft.color565(255, 239, 246);
  bgBottom = tft.color565(224, 255, 246);
  heartMain = tft.color565(255, 78, 128);
  heartShadow = tft.color565(213, 52, 96);
  cheekPink = tft.color565(255, 177, 196);
  ink = tft.color565(78, 45, 72);
  cream = tft.color565(255, 250, 221);
  mint = tft.color565(90, 210, 185);
  sun = tft.color565(255, 205, 84);

  drawBackground();
  drawHeartFrame();

  Serial.println("Cute heart display ready.");
}

void loop() {
  if (millis() - lastFrameAt < 45) {
    delay(2);
    return;
  }

  lastFrameAt = millis();
  drawHeartFrame();
}
