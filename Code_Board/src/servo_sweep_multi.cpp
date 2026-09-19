#include <Arduino.h>
#include <Wire.h>
#include <Adafruit_PWMServoDriver.h>

#include "board_config.h"

Adafruit_PWMServoDriver pwm(PCA9685_I2C_ADDRESS);

constexpr uint8_t SERVO_CHANNELS[] = {0, 4, 8, 12};
constexpr uint8_t SERVO_COUNT = sizeof(SERVO_CHANNELS) / sizeof(SERVO_CHANNELS[0]);

bool sweepEnabled = false;
int currentAngle = SERVO_START_ANGLE;
int direction = 1;

uint16_t angleToPulseUs(uint8_t angle) {
  angle = constrain(angle, 0, 180);
  return map(angle, 0, 180, SERVO_MIN_PULSE_US, SERVO_MAX_PULSE_US);
}

uint16_t pulseUsToPcaTicks(uint16_t pulseUs) {
  const uint32_t periodUs = 1000000UL / SERVO_PWM_FREQUENCY_HZ;
  return (pulseUs * 4096UL) / periodUs;
}

void writeAllServoAngle(uint8_t angle) {
  const uint16_t pulseUs = angleToPulseUs(angle);
  const uint16_t ticks = pulseUsToPcaTicks(pulseUs);

  for (uint8_t i = 0; i < SERVO_COUNT; i++) {
    pwm.setPWM(SERVO_CHANNELS[i], 0, ticks);
  }

  Serial.print("Servo angle: ");
  Serial.print(angle);
  Serial.print(" deg, pulse: ");
  Serial.print(pulseUs);
  Serial.println(" us");
}

void stopAllServoSignal() {
  for (uint8_t i = 0; i < SERVO_COUNT; i++) {
    pwm.setPWM(SERVO_CHANNELS[i], 0, 0);
  }
  sweepEnabled = false;
  Serial.println("All servo signals stopped. Type START to sweep again.");
}

void handleSerialCommand() {
  if (!Serial.available()) {
    return;
  }

  const String command = Serial.readStringUntil('\n');
  String normalized = command;
  normalized.trim();
  normalized.toUpperCase();

  if (normalized == "START") {
    currentAngle = SERVO_START_ANGLE;
    direction = 1;
    sweepEnabled = true;
    writeAllServoAngle(currentAngle);
    Serial.println("Sweep started on 4 servos. Type STOP to disable servo signals.");
  } else if (normalized == "STOP") {
    stopAllServoSignal();
  } else {
    Serial.println("Commands: START, STOP");
  }
}

void setup() {
  Serial.begin(115200);
  delay(500);

  Serial.println();
  Serial.println("ESP32 + PCA9685 + 4x MG996R Servo Test (channels 0, 4, 8, 12)");
  Serial.println("Power servo from a separate 5-6V supply into PCA9685 V+. Do not power servo from ESP32.");
  Serial.print("SDA: GPIO");
  Serial.println(I2C_SDA_PIN);
  Serial.print("SCL: GPIO");
  Serial.println(I2C_SCL_PIN);

  Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN);
  Wire.setClock(100000);

  pwm.begin();
  pwm.setOscillatorFrequency(27000000);
  pwm.setPWMFreq(SERVO_PWM_FREQUENCY_HZ);
  delay(10);
  stopAllServoSignal();

  Serial.println("Type START in Serial Monitor to begin a limited 30-150 degree sweep on all 4 servos.");
}

void loop() {
  handleSerialCommand();

  if (!sweepEnabled) {
    delay(20);
    return;
  }

  writeAllServoAngle(currentAngle);
  currentAngle += direction * SERVO_SWEEP_STEP_DEGREES;

  if (currentAngle >= SERVO_SWEEP_MAX_ANGLE) {
    currentAngle = SERVO_SWEEP_MAX_ANGLE;
    direction = -1;
  } else if (currentAngle <= SERVO_SWEEP_MIN_ANGLE) {
    currentAngle = SERVO_SWEEP_MIN_ANGLE;
    direction = 1;
  }

  delay(SERVO_STEP_DELAY_MS);
}
