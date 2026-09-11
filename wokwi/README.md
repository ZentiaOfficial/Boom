# Wokwi Simulation — Verdant Fertilizer Mixer

จำลองการต่อสายจริงตาม [`src/wiring-data.js`](../src/wiring-data.js) เท่าที่ Wokwi มีอุปกรณ์รองรับ ใช้ ESP32 DevKitC V4 เป็นบอร์ดหลัก และ ESP32-2432S028R เป็นจอ HMI — ครบทั้ง 2 บอร์ด ESP32 เหมือนในเว็บ 3 มิติ

## เปิดใช้งาน

### ทาง wokwi.com (ง่ายสุด — ไม่ต้องติดตั้งอะไร)

1. ไปที่ [wokwi.com/projects/new/esp32](https://wokwi.com/projects/new/esp32) สร้างโปรเจกต์เปล่า
2. ก็อปไฟล์ทั้งหมดในโฟลเดอร์นี้ (`diagram.json`, `sketch.ino`, `libraries.txt`, `pca9685.chip.c`, `pca9685.chip.json`, `wokwi-api.h`) เข้าไปแทนที่ไฟล์เดิมของโปรเจกต์ — วาง chip files ไว้ที่ root ของโปรเจกต์ (ห้ามใส่ในโฟลเดอร์ย่อย) เพราะ Wokwi หา custom chip จากชื่อไฟล์ `*.chip.c` / `*.chip.json` ที่ root เท่านั้น
3. กด ▶️ Start Simulation — Wokwi จะคอมไพล์ custom chip (PCA9685) และ sketch.ino ให้อัตโนมัติในคลาวด์ ไม่ต้องติดตั้ง toolchain เอง

### ทาง VS Code + Wokwi extension (ต้อง build chip เอง — สำคัญ)

VS Code extension **ไม่คอมไพล์ `pca9685.chip.c` ให้อัตโนมัติแบบ wokwi.com** ถ้าไม่ build ก่อน ตัว PCA9685 ในไดอะแกรมจะขึ้น **"Missing chip"** และกดปุ่มแล้ว servo จะไม่ขยับเลย (เพราะไม่มีชิปฟังสัญญาณ I²C อยู่จริง)

ต้อง build `pca9685.chip.c` เป็น `dist/chip.wasm` เองครั้งเดียวก่อน โดยใช้ **wokwi-cli** (อย่าคอมไพล์ด้วย WASI SDK ที่ดาวน์โหลดเองตรงๆ — SDK รุ่นใหม่ๆ เช่น 34 ลิงก์ `clock_time_get` เข้ามาโดยไม่ตั้งใจ ทำให้ขึ้น error `"clock_time_get": function import requires a callable` เพราะ runtime ของ Wokwi ไม่รองรับ WASI syscall ตัวนี้ — `wokwi-cli` ดึง WASI SDK รุ่นที่ทดสอบแล้วว่าใช้ได้ (v25) มาให้อัตโนมัติ):

1. ติดตั้ง wokwi-cli:
   ```sh
   curl -L https://wokwi.com/ci/install.sh | sh
   ```
2. คอมไพล์จาก root ของโปรเจกต์:
   ```sh
   mkdir -p dist
   wokwi-cli chip compile pca9685.chip.c -o dist/chip.wasm
   cp pca9685.chip.json dist/chip.json
   ```
3. เพิ่มบล็อกนี้ใน `wokwi.toml`:
   ```toml
   [[chip]]
   name = 'pca9685'
   binary = 'dist/chip.wasm'
   ```
4. กด Start Simulation ใหม่ — "Missing chip" ควรหายและกดปุ่มแล้ว servo ขยับได้จริง

`dist/` เป็นไฟล์ build ที่ generate ได้ใหม่เสมอจาก `pca9685.chip.c` จึงไม่ต้อง commit เข้า git (อยู่ใน `.gitignore` อยู่แล้วผ่านกฎ `dist/`) ทุกครั้งที่แก้ `pca9685.chip.c` ต้องรันคำสั่งข้อ 2 ใหม่แล้วกด Start Simulation อีกครั้ง

### จอ HMI ไม่ติด — ไม่ใช่บั๊ก เป็นข้อจำกัดของ Wokwi

จอ ESP32-2432S028R (HMI) จะขึ้นดำตลอดเพราะ**ไม่มีเฟิร์มแวร์รันอยู่บนบอร์ดนั้น** — ดูหัวข้อ "ข้อจำกัดสำคัญเรื่อง ESP32 สองบอร์ด" ด้านล่าง Wokwi รันได้แค่ไมโครคอนโทรลเลอร์เดียวต่อโปรเจกต์ (ESP32 MAIN) จอ HMI ถูกต่อสายถูกต้องแต่ไม่มีโค้ดให้รัน จึงไม่มีทางทำให้จอติดในโปรเจกต์นี้ได้

## สิ่งที่จำลองตรงกับของจริง (1:1 ตาม wiring-data.js)

- ESP32 MAIN ↔ PCA9685 ผ่าน I²C: SDA=GPIO21, SCL=GPIO22, OE=GPIO27, ที่อยู่ default 0x40 (A0–A5 ต่อ GND)
- PCA9685 CH0–CH3 → Servo 4 ตัว (N/P/K/ปล่อย) สัญญาณ PWM ตรงช่องเหมือนของจริง
- HX711 DAT=GPIO32, CLK=GPIO33 (มี load cell จำลองในตัวพาร์ท ปรับน้ำหนักได้จาก Automation ของ Wokwi)
- ปุ่มกด 5 ปุ่ม (สูตร N/P/K, เริ่ม, ปล่อย) ต่อ GPIO13/14/5/18/23 แบบ INPUT_PULLUP เหมือนของจริง
- แนวคิด GPIO34 sense: R1 10 kΩ pull-up จาก 3V3, R2 1 kΩ อนุกรมก่อนเข้าสวิตช์แทนหน้าสัมผัส AUX-NC ของ E-Stop — สลับสวิตช์เพื่อจำลองสถานะปกติ/สะดุด
- **ESP32 HMI (`board-esp32-2432s028r`)** ต่อ UART ไขว้กับ ESP32 MAIN ตรงตาม wiring-data.js: HMI GPIO22 (TX) → MAIN GPIO16 (RX2), MAIN GPIO17 (TX2) → HMI GPIO27 (RX), จ่ายไฟจากราง 5V/GND เดียวกับบอร์ดหลัก

### ข้อจำกัดสำคัญเรื่อง ESP32 สองบอร์ด

Wokwi **ยังไม่รองรับการรันเฟิร์มแวร์แยกกันของ 2 ไมโครคอนโทรลเลอร์ในโปรเจกต์เดียว** (เป็น feature request ที่ยังไม่ทำ — [wokwi-features#186](https://github.com/wokwi/wokwi-features/issues/186)) `sketch.ino` ในนี้คอมไพล์ขึ้น ESP32 MAIN เท่านั้น บอร์ด HMI จะถูกวางและต่อสายถูกต้องตามจริงในไดอะแกรม แต่ **ไม่มีโค้ดรันบนจอ HMI** ในโปรเจกต์นี้ — ถ้าต้องการทดสอบโค้ดจอสัมผัสจริง ต้องแยกไปสร้างอีกโปรเจกต์ Wokwi ต่างหากสำหรับบอร์ด `board-esp32-2432s028r` โดยเฉพาะ

## สิ่งที่ **ไม่ได้** จำลอง (ไม่มีพาร์ทใน Wokwi ให้ตรงกับของจริง)

- Cytron MD10C + DC Gear Motor (ไม่มี motor driver แบบนี้ในไลบรารีทางการของ Wokwi)
- Safety relay สองช่อง + K1 Contactor + วงจร E-Stop แบบ NC คู่ตามจริง (จำลองได้แค่แนวคิดสาย AUX-NC เส้นเดียวด้วยสวิตช์ ไม่ใช่ safety circuit จริง)
- DC–DC buck converter 2 ราง (CONTROL/ACTUATOR) และ terminal block ต่างๆ — ในไฟล์นี้รวบให้ทุกอุปกรณ์ใช้ราง 5V/GND เส้นเดียวจากบอร์ด ESP32 เพื่อความง่ายในการจำลอง

**ห้ามใช้ผลจากการจำลองนี้แทนการตรวจสอบวงจรไฟฟ้าจริงหรือระบบความปลอดภัยของเครื่องจริง** ตรงตามคำเตือนใน [`../VALIDATION.md`](../VALIDATION.md)

## เครดิต

`pca9685.chip.c` / `pca9685.chip.json` / `wokwi-api.h` มาจาก [bonnyr/wokwi-pca9685-custom-chip](https://github.com/bonnyr/wokwi-pca9685-custom-chip) (MIT License, © 2022 Bonny Rais) — ดู [`LICENSE-pca9685-chip`](LICENSE-pca9685-chip)

## sketch.ino

เป็น firmware ทดสอบสายเท่านั้น (อ่านปุ่ม, ขยับ servo, อ่าน HX711, อ่านสถานะ E-Stop sense) ไม่ใช่ลอจิกควบคุมการจ่าย N/P/K ตามสูตรแบบเต็มรูปแบบ — ลอจิกนั้นอยู่ใน [`../src/simulation.js`](../src/simulation.js) ของเว็บ 3 มิติ
