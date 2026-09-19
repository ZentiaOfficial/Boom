#include <Arduino.h>
#include <Wire.h>

#include "board_config.h"

void setup() {
  Serial.begin(115200);
  delay(500);

  Serial.println();
  Serial.println("ESP32 I2C scanner");
  Serial.print("SDA: GPIO");
  Serial.println(I2C_SDA_PIN);
  Serial.print("SCL: GPIO");
  Serial.println(I2C_SCL_PIN);

  Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN);
  Wire.setClock(100000);
}

void loop() {
  uint8_t foundCount = 0;

  Serial.println("Scanning I2C bus...");
  for (uint8_t address = 1; address < 127; address++) {
    Wire.beginTransmission(address);
    const uint8_t error = Wire.endTransmission();

    if (error == 0) {
      Serial.print("Found device at 0x");
      if (address < 16) {
        Serial.print("0");
      }
      Serial.println(address, HEX);
      foundCount++;
    } else if (error == 4) {
      Serial.print("Unknown error at 0x");
      if (address < 16) {
        Serial.print("0");
      }
      Serial.println(address, HEX);
    }
  }

  if (foundCount == 0) {
    Serial.println("No I2C devices found. Check SDA/SCL, 3.3V VCC, and shared GND.");
  } else {
    Serial.print("Done. Device count: ");
    Serial.println(foundCount);
  }

  Serial.println();
  delay(3000);
}
