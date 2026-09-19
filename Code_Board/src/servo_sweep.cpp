#include <Arduino.h>
#include <Wire.h>
#include <Adafruit_PWMServoDriver.h>

#include "board_config.h"

Adafruit_PWMServoDriver pwm(PCA9685_I2C_ADDRESS);

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

void writeServoAngle(uint8_t channel, uint8_t angle) {
  const uint16_t pulseUs = angleToPulseUs(angle);
  const uint16_t ticks = pulseUsToPcaTicks(pulseUs);
  pwm.setPWM(channel, 0, ticks);

  Serial.print("Servo angle: ");
  Serial.print(angle);
  Serial.print(" deg, pulse: ");
  Serial.print(pulseUs);
  Serial.println(" us");
}

void stopServoSignal() {
  pwm.setPWM(SERVO_CHANNEL, 0, 0);
  sweepEnabled = false;
  Serial.println("Servo signal stopped. Type START to sweep again.");
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
    writeServoAngle(SERVO_CHANNEL, currentAngle);
    Serial.println("Sweep started. Type STOP to disable the servo signal.");
  } else if (normalized == "STOP") {
    stopServoSignal();
  } else {
    Serial.println("Commands: START, STOP");
  }
}

void setup() {
  Serial.begin(115200);
  delay(500);

  Serial.println();
  Serial.println("ESP32 + PCA9685 + MG996R safe sweep test");
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
  stopServoSignal();

  Serial.println("Type START in Serial Monitor to begin a limited 30-150 degree sweep.");
}

void loop() {
  handleSerialCommand();

  if (!sweepEnabled) {
    delay(20);
    return;
  }

  writeServoAngle(SERVO_CHANNEL, currentAngle);
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
