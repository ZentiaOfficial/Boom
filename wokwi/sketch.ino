// Wiring smoke-test firmware for the Wokwi simulation in diagram.json.
// Exercises every net from src/wiring-data.js (servo group, weight group,
// buttons group) — it is not the production dispensing control logic,
// which lives in the web 3D simulator instead.
#include <Wire.h>
#include <Adafruit_PWMServoDriver.h>
#include <HX711.h>

// Pin map mirrors src/wiring-data.js exactly (ESP32 MAIN, J2/J3 headers).
#define PIN_PCA_OE 27
#define PIN_HX_DAT 32
#define PIN_HX_CLK 33
#define PIN_BTN_N 13
#define PIN_BTN_P 14
#define PIN_BTN_K 5
#define PIN_BTN_START 18
#define PIN_BTN_OUT 23
#define PIN_ESTOP_SENSE 34

#define SERVO_MIN_PULSE 150
#define SERVO_MAX_PULSE 600

Adafruit_PWMServoDriver pca = Adafruit_PWMServoDriver(0x40);
HX711 scale;

const uint8_t buttonPins[] = {PIN_BTN_N, PIN_BTN_P, PIN_BTN_K, PIN_BTN_START, PIN_BTN_OUT};
const char *buttonNames[] = {"N", "P", "K", "START", "OUT"};

void setup() {
  Serial.begin(115200);

  pinMode(PIN_PCA_OE, OUTPUT);
  digitalWrite(PIN_PCA_OE, LOW); // enable PCA9685 outputs

  for (uint8_t i = 0; i < 5; i++) {
    pinMode(buttonPins[i], INPUT_PULLUP);
  }
  pinMode(PIN_ESTOP_SENSE, INPUT); // GPIO34 is input-only, no internal pull-up

  Wire.begin(); // SDA=21 / SCL=22 default on ESP32
  pca.begin();
  pca.setPWMFreq(50); // MG996R runs at ~50Hz

  scale.begin(PIN_HX_DAT, PIN_HX_CLK);

  Serial.println("Wiring smoke test ready.");
}

uint16_t angleToPulse(uint8_t angle) {
  return map(angle, 0, 180, SERVO_MIN_PULSE, SERVO_MAX_PULSE);
}

void loop() {
  for (uint8_t i = 0; i < 5; i++) {
    if (digitalRead(buttonPins[i]) == LOW) {
      Serial.printf("Button %s pressed\n", buttonNames[i]);
      if (i < 4) {
        pca.setPWM(i, 0, angleToPulse(90)); // channels 0-3 = N/P/K/OUT servos
      }
    }
  }

  if (scale.is_ready()) {
    Serial.printf("HX711 raw: %ld\n", scale.read());
  }

  Serial.printf("E-Stop AUX sense (GPIO34): %s\n",
                digitalRead(PIN_ESTOP_SENSE) == HIGH ? "TRIPPED" : "normal");

  delay(500);
}
