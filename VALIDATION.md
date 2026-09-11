# ผลตรวจ Verdant V2 · 11 กันยายน 2026

## สถานะ

เว็บ V2 พร้อมเปิดในเครื่อง เป็นแบบจำลองและเอกสารอ้างอิง ไม่ได้เชื่อมต่อฮาร์ดแวร์จริง

- Production preview: http://127.0.0.1:4174/
- Development server: http://127.0.0.1:4173/
- HTTP response: 200 พร้อม CSP, X-Content-Type-Options, X-Frame-Options, Referrer-Policy และ Permissions-Policy
- Production build: ผ่านด้วย Vite 8.2.2
- Node tests: ผ่าน 11/11
- Dependency audit: ไม่พบช่องโหว่ที่รายงาน
- HawkScan DAST: ไม่ได้รัน เพราะเครื่องไม่มีคำสั่ง `hawk`

## สิ่งที่ตรวจแล้ว

1. สูตรและน้ำหนักทุกแบบรักษามวลตลอดลำดับจ่าย ชั่ง ผสม และปล่อย
2. E-Stop จำลองหยุด Motor ปิดวาล์ว และค้างสถานะจน Reset
3. Netlist V2 มีอุปกรณ์/จุดต่อ 25 จุดและสาย 78 เส้น รหัสไม่ซ้ำและทุกปลายสายอ้างถึงขาที่มีในข้อมูล
4. UART ต่อไขว้ HMI GPIO22 TX → MAIN GPIO16 RX2 และ MAIN GPIO17 TX2 → HMI GPIO27 RX
5. ถอด LCD2004, BSS138, SN74AHCT125N และวงจรประกอบที่ไม่จำเป็นออก
6. PCA9685 ต่อสัญญาณ CH0–3 ไป Servo 4 ตัวโดยตรง และแยกราง 5V-ACTUATOR
7. ราง 5V-CONTROL ของ ESP32 MAIN, HMI และ HX711 อยู่ก่อน K1 จึงไม่ดับเมื่อกด E-Stop
8. 12V ของ MD10C และอินพุต DC-DC ฝั่ง Servo อยู่หลัง K1
9. E-Stop มี safety channel สองชุด และ AUX-NC แยกผ่าน 10k pull-up + 1k series ไป GPIO34
10. สาย safety ที่ขึ้นกับรุ่น Safety relay/K1 ถูกทำเครื่องหมาย “ยังห้ามต่อจริง” จำนวน 12 เส้น
11. CSV มี header และข้อมูลครบ 78 เส้น

## ข้อจำกัด

ยังไม่ได้เลือกรุ่น Motor, Safety relay, K1, DC-DC ฝั่ง Servo, Power Supply, ฟิวส์ และขนาดสาย จึงยังไม่สามารถใส่หมายเลข terminal หรือพิกัดกระแสที่พร้อมประกอบจริงได้ การเลือกต้องใช้กระแส stall, แรงบิด, รูปแบบหยุด และการประเมินความเสี่ยงของเครื่องจริง

GPIO34 ใช้รับ feedback เท่านั้น การหยุดจริงต้องเกิดจาก E-Stop → Safety relay → K1 Servo ที่ดับไฟไม่ได้รับประกันว่าประตูจะปิด จึงต้องมีกลไก fail-safe

การเปลี่ยน V2 ผ่านการ build และตรวจตรรกะอัตโนมัติแล้ว แต่ยังไม่ได้ทำ browser interaction/visual QA รอบใหม่หลังเปลี่ยนโครงสร้าง บันทึกภาพใน `output/playwright` เป็นหลักฐานของเวอร์ชันก่อนหน้า ไม่ควรใช้อ้างว่า V2 ผ่านการตรวจภาพ

HawkScan SKILL.md กำหนดให้ใช้ `hawk` รุ่น 6.0.0 ขึ้นไป แต่ preflight ได้ `command not found: hawk` สำหรับ `hawk version`, `hawk config --help` และ `hawk skills status` จึงหยุดตามข้อกำหนดและไม่สร้าง config ด้วย application ID สมมติ การ build, dependency audit และ unit tests ไม่ทดแทน DAST
