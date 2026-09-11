# Wokwi Simulation — Verdant Fertilizer Mixer

จำลองการต่อสายจริงตาม [`src/wiring-data.js`](../src/wiring-data.js) เท่าที่ Wokwi มีอุปกรณ์รองรับ ใช้ ESP32 DevKitC V4 เป็นบอร์ดหลัก เหมือนในเว็บ 3 มิติ

## เปิดใช้งาน

1. ไปที่ [wokwi.com/projects/new/esp32](https://wokwi.com/projects/new/esp32) สร้างโปรเจกต์เปล่า
2. ก็อปไฟล์ทั้งหมดในโฟลเดอร์นี้ (`diagram.json`, `sketch.ino`, `libraries.txt`, `pca9685.chip.c`, `pca9685.chip.json`, `wokwi-api.h`) เข้าไปแทนที่ไฟล์เดิมของโปรเจกต์ — วาง chip files ไว้ที่ root ของโปรเจกต์ (ห้ามใส่ในโฟลเดอร์ย่อย) เพราะ Wokwi หา custom chip จากชื่อไฟล์ `*.chip.c` / `*.chip.json` ที่ root เท่านั้น
3. กด ▶️ Start Simulation — Wokwi จะคอมไพล์ custom chip (PCA9685) และ sketch.ino ให้อัตโนมัติในคลาวด์ ไม่ต้องติดตั้ง toolchain เอง

## สิ่งที่จำลองตรงกับของจริง (1:1 ตาม wiring-data.js)

- ESP32 MAIN ↔ PCA9685 ผ่าน I²C: SDA=GPIO21, SCL=GPIO22, OE=GPIO27, ที่อยู่ default 0x40 (A0–A5 ต่อ GND)
- PCA9685 CH0–CH3 → Servo 4 ตัว (N/P/K/ปล่อย) สัญญาณ PWM ตรงช่องเหมือนของจริง
- HX711 DAT=GPIO32, CLK=GPIO33 (มี load cell จำลองในตัวพาร์ท ปรับน้ำหนักได้จาก Automation ของ Wokwi)
- ปุ่มกด 5 ปุ่ม (สูตร N/P/K, เริ่ม, ปล่อย) ต่อ GPIO13/14/5/18/23 แบบ INPUT_PULLUP เหมือนของจริง
- แนวคิด GPIO34 sense: R1 10 kΩ pull-up จาก 3V3, R2 1 kΩ อนุกรมก่อนเข้าสวิตช์แทนหน้าสัมผัส AUX-NC ของ E-Stop — สลับสวิตช์เพื่อจำลองสถานะปกติ/สะดุด

## สิ่งที่ **ไม่ได้** จำลอง (ไม่มีพาร์ทใน Wokwi ให้ตรงกับของจริง)

- จอ HMI สัมผัส ESP32-2432S028R (ไม่มีพาร์ทจอสัมผัส ESP32 ในตัวใน Wokwi)
- Cytron MD10C + DC Gear Motor (ไม่มี motor driver แบบนี้ในไลบรารีทางการของ Wokwi)
- Safety relay สองช่อง + K1 Contactor + วงจร E-Stop แบบ NC คู่ตามจริง (จำลองได้แค่แนวคิดสาย AUX-NC เส้นเดียวด้วยสวิตช์ ไม่ใช่ safety circuit จริง)
- DC–DC buck converter 2 ราง (CONTROL/ACTUATOR) และ terminal block ต่างๆ — ในไฟล์นี้รวบให้ทุกอุปกรณ์ใช้ราง 5V/GND เส้นเดียวจากบอร์ด ESP32 เพื่อความง่ายในการจำลอง

**ห้ามใช้ผลจากการจำลองนี้แทนการตรวจสอบวงจรไฟฟ้าจริงหรือระบบความปลอดภัยของเครื่องจริง** ตรงตามคำเตือนใน [`../VALIDATION.md`](../VALIDATION.md)

## เครดิต

`pca9685.chip.c` / `pca9685.chip.json` / `wokwi-api.h` มาจาก [bonnyr/wokwi-pca9685-custom-chip](https://github.com/bonnyr/wokwi-pca9685-custom-chip) (MIT License, © 2022 Bonny Rais) — ดู [`LICENSE-pca9685-chip`](LICENSE-pca9685-chip)

## sketch.ino

เป็น firmware ทดสอบสายเท่านั้น (อ่านปุ่ม, ขยับ servo, อ่าน HX711, อ่านสถานะ E-Stop sense) ไม่ใช่ลอจิกควบคุมการจ่าย N/P/K ตามสูตรแบบเต็มรูปแบบ — ลอจิกนั้นอยู่ใน [`../src/simulation.js`](../src/simulation.js) ของเว็บ 3 มิติ
