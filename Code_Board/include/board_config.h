#pragma once

#include <Arduino.h>

// ESP32 38-pin common defaults. Change these two pins if your board is wired differently.
constexpr uint8_t I2C_SDA_PIN = 22;
constexpr uint8_t I2C_SCL_PIN = 23;

// PCA9685 defaults.
constexpr uint8_t PCA9685_I2C_ADDRESS = 0x40;
constexpr uint8_t SERVO_CHANNEL = 0;
constexpr uint16_t SERVO_PWM_FREQUENCY_HZ = 50;

// MG996R safe starter range. Calibrate wider only after confirming the linkage cannot bind.
constexpr uint16_t SERVO_MIN_PULSE_US = 1000;
constexpr uint16_t SERVO_MAX_PULSE_US = 2000;
constexpr uint8_t SERVO_START_ANGLE = 90;
constexpr uint8_t SERVO_SWEEP_MIN_ANGLE = 30;
constexpr uint8_t SERVO_SWEEP_MAX_ANGLE = 150;
constexpr uint8_t SERVO_SWEEP_STEP_DEGREES = 2;
constexpr uint16_t SERVO_STEP_DELAY_MS = 35;
