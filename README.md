# Verdant · Compact Fertilizer Studio V2

เว็บ 3D Interactive ภาษาไทยสำหรับสำรวจกล่องผสมปุ๋ยอัตโนมัติ โดยรวมโมเดลเครื่อง การจำลองรอบผสม รายการอุปกรณ์ ผังระบบไฟ และตารางเดินสายแบบเลือกดูทีละวงจร

## เปิดใช้งานในเครื่อง

```sh
npm ci
npm run dev
```

เปิด http://127.0.0.1:4173 หรือใช้ production preview ที่ http://127.0.0.1:4174 เมื่อมี preview server ทำงาน

```sh
npm test
npm run build
npm run preview
```

เว็บใช้ WebGL2 และไฟล์ทั้งหมดจากเครื่อง ไม่มี backend, login, analytics หรือการเชื่อมต่อฮาร์ดแวร์จริง

## โครงสร้างระบบ V2

ระบบใช้ ESP32 สองบอร์ดเพื่อให้ขาเพียงพอและแบ่งหน้าที่ชัดเจน

1. **ESP32-2432S028R Touch HMI 2.8 นิ้ว** แสดงสูตร N-P-K น้ำหนัก ขั้นตอนและ Alarm รับส่งข้อมูลกับบอร์ดหลักผ่าน UART
2. **ESP32-DevKitC V4 / WROOM-32E แบบ 38 ขา** เป็นตัวควบคุมเครื่องหลัก อ่าน Load Cell และปุ่ม ควบคุม PCA9685 กับ MD10C และอ่าน E-Stop feedback
3. **PCA9685 module** สร้าง PWM สำหรับ MG996R 4 ตัวผ่าน I²C
4. **Cytron MD10C R3** รับ PWM/DIR ระดับ 3.3V และขับ Motor DC 12V
5. **Safety relay + คอนแทคเตอร์ K1** รับ E-Stop สองช่องและตัดไฟส่วน Motor/Servo ด้วยฮาร์ดแวร์

แบบใหม่ไม่ใช้ LCD2004, BSS138, SN74AHCT125N, L298N หรือ Breadboard

## ขาหลักที่กำหนด

| งาน | ขา |
|---|---|
| HMI TX → MAIN RX2 | HMI GPIO22 → MAIN GPIO16 |
| MAIN TX2 → HMI RX | MAIN GPIO17 → HMI GPIO27 |
| PCA9685 | MAIN GPIO21 SDA / GPIO22 SCL / GPIO27 OE |
| HX711 | MAIN GPIO32 DAT / GPIO33 CLK |
| MD10C | MAIN GPIO25 PWM / GPIO26 DIR |
| ปุ่มสูตร 1/2/3 | MAIN GPIO13 / 14 / 18 |
| ปุ่ม Start / Release | MAIN GPIO19 / 23 |
| E-Stop feedback | MAIN GPIO34 + external pull-up 10kΩ |

## ระบบไฟและ E-Stop

Power Supply 12V แบ่งเป็นสองทางหลัก

- ทางที่ไม่ผ่าน K1 ไป DC-DC 5V-CONTROL เลี้ยง ESP32 MAIN, ESP32 HMI และ HX711 จึงยังทำงานเมื่อกด E-Stop
- ทางที่ผ่านหน้าสัมผัสหลัก K1 ไป MD10C และ DC-DC 5V-ACTUATOR สำหรับ Servo 4 ตัว กด E-Stop แล้วสองส่วนนี้ถูกตัดไฟ

E-Stop ใช้หน้าสัมผัส NC สองชุดเข้า Safety relay และใช้ AUX-NC แยกสำหรับ GPIO34 ปกติ GPIO34 อ่าน LOW; เมื่อกด E-Stop หรือสาย feedback ขาดจะอ่าน HIGH การหยุดจริงต้องเกิดจาก Safety relay/K1 โดยไม่พึ่งโปรแกรม หลังปลด E-Stop ต้อง Manual Reset และกด Start ใหม่

หมายเลขขา Safety relay และ K1 ในเว็บเป็นชื่อหน้าที่ เพราะต้องเลือกรุ่น แรงดัน coil พิกัดหน้าสัมผัส และรูปแบบ reset/EDM จากการประเมินความเสี่ยงกับโหลดจริงก่อน

## รายการอุปกรณ์หลัก

- ESP32-2432S028R Touch HMI 2.8 นิ้ว × 1
- ESP32-DevKitC V4 / WROOM-32E 38 ขา × 1
- ESP32 Screw Terminal Base 38 ขา × 1
- PCA9685 module × 1
- Servo MG996R × 4
- Load Cell + HX711 × 1 ชุด
- Cytron MD10C R3 × 1
- Motor DC gear 12V × 1
- Power Supply 12V × 1
- DC-DC 12V→5V CONTROL × 1
- DC-DC 12V→5V ACTUATOR กระแสสูง × 1
- E-Stop แบบล็อกค้าง 2NC + AUX-NC × 1
- Safety relay + DC-rated contactor K1 × อย่างละ 1
- ปุ่มสูตร/Start/Release แบบ NO × 5 และ Manual Reset × 1
- Terminal block, jumper, ฟิวส์สาขา และสายที่รองรับกระแส × 1 ชุด
- ตัวต้านทาน 10kΩ และ 1kΩ × อย่างละ 1
- ตู้ขนาดอ้างอิง 40 × 57 × 20 ซม. × 1

พิกัด Power Supply, DC-DC ฝั่ง Servo, ฟิวส์, สาย, MD10C และ K1 ต้องคำนวณหลังทราบกระแส stall ของ Motor/Servo และแรงบิดที่เครื่องจริงต้องใช้

## ความสามารถของเว็บ

- หมุน ซูม เปิดประตู แยกชิ้นส่วน เลือกอุปกรณ์ และกดปุ่มบนโมเดล 3D
- ทดลองสูตร 1:1:1, 2:1:1 และ 1:1:2 ที่น้ำหนัก 0.5, 1 และ 2 กก.
- จำลองจ่าย N → P → K, รอน้ำหนักนิ่ง, ผสม, รอกดปล่อย และปล่อยผลผลิต
- จำลอง E-Stop แบบค้างสถานะจนกด Reset
- หน้ารายการอุปกรณ์อธิบายหน้าที่ เงื่อนไข และจำนวน
- หน้าเดินสาย 3D แสดงอุปกรณ์ 25 จุดและสายอ้างอิง 78 เส้น เลือกกลุ่ม กดสาย ค้นหา GPIO และส่งออก CSV
- หน้าระบบแสดงสถาปัตยกรรม ESP32 สองบอร์ด ระบบไฟ E-Stop ตารางขา และรายการอุปกรณ์ฉบับรวม
- ส่งออกผลการจำลองเป็น JSON

## ขอบเขต

ภาพที่ผู้ใช้ให้เป็นแนวทาง ไม่ใช่แบบผลิต ขนาดตู้ 40 × 57 × 20 ซม. เป็นขนาดภายนอกอ้างอิง รูปร่างและตำแหน่งใน 3D ถูกย่อเพื่ออธิบายระบบ ยังไม่ตรวจระยะติดตั้ง ความจุ จุดศูนย์ถ่วง การระบายความร้อน หรือแรงรับน้ำหนักจริง

N/P/K ในเว็บเป็นชื่อช่องวัตถุดิบ ไม่ใช่สารบริสุทธิ์และไม่ใช่เกรด N-P₂O₅-K₂O อัตราส่วน 1:1:1 จึงไม่เท่ากับปุ๋ย 15-15-15 จนกว่าจะมีผลวิเคราะห์วัตถุดิบจริง

Servo ที่ถูกตัดไฟอาจไม่ทำให้วาล์วปิดเอง กลไกประตูต้องออกแบบให้เข้าสู่สภาวะปลอดภัยด้วยสปริง แรงโน้มถ่วง หรือกลไกที่เหมาะสม งาน AC, PE, E-Stop, Safety relay, K1 และวงจรกำลังต้องให้ผู้มีความชำนาญตรวจ

## เอกสารอ้างอิง

- [ESP32-2432S028R board reference](https://esp3d.io/esp3d-tft/version_1x/hardware/esp32/sunton-28-2432/)
- [Espressif ESP32-DevKitC V4](https://documentation.espressif.com/esp-dev-kits/en/latest/esp32/esp32-devkitc/user_guide.html)
- [Adafruit PCA9685](https://learn.adafruit.com/16-channel-pwm-servo-driver?view=all)
- [TowerPro MG996R](https://towerpro.com.tw/product/mg996R/)
- [SparkFun HX711](https://learn.sparkfun.com/tutorials/load-cell-amplifier-hx711-breakout-hookup-guide/all)
- [Cytron MD10C R3](https://docs.google.com/document/d/1rgQzn-nWn-qcWNnHjDZvIYqUrdCeBQQxXA-TU3BF0AQ/view)
- [Pilz safety relay circuit example](https://www.pilz.com/download/open/PNOZ_X2_8P_Operat_Manual_1004082-EN-17.pdf)

ดูผลตรวจล่าสุดใน [VALIDATION.md](VALIDATION.md)

## จำลองวงจรใน Wokwi

ดู [wokwi/README.md](wokwi/README.md) สำหรับไฟล์จำลองวงจร ESP32 + PCA9685 + Servo + HX711 + ปุ่มกด ตามสายจริงใน `src/wiring-data.js` เท่าที่ Wokwi มีอุปกรณ์รองรับ พร้อมรายการสิ่งที่จำลองไม่ได้ (จอ HMI, motor driver, safety relay ฯลฯ)
