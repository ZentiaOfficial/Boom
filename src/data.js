export const components = [
 {id:'hoppers', icon:'container', name:'ถังเก็บ N · P · K', en:'Material hoppers', qty:'3 ถัง', color:'#759778', detail:'กรวยแยกวัตถุดิบ 3 ชนิด จ่ายลงถังผสมทีละช่อง ปิดวาล์วตามน้ำหนักที่ Load Cell อ่านได้', note:'ขนาดทางออก มุมกรวย และแรงบิดเปิดประตูต้องทดลองกับปุ๋ยจริงเพื่อป้องกันการอุดตัน'},
 {id:'servo', icon:'settings-2', name:'Servo MG996R', en:'Dosing & discharge gates', qty:'4 ตัว', color:'#5786a4', detail:'Servo 1–3 (PCA9685 ช่อง 0, 4, 8) เปิดประตูใต้กรวย N/P/K และ Servo 4 (ช่อง 12) เปิดทางออกถังผสม', note:'รับไฟจากราง V+ ของ PCA9685 ซึ่งมาจาก XL4016 (5V) เท่านั้น ห้ามจ่ายจากขา 5V/3V3 ของ ESP32'},
 {id:'mixer', icon:'rotate-3d', name:'ถังผสม + มอเตอร์ JGB37-520', en:'Mixing chamber', qty:'1 ชุด', color:'#7a9282', detail:'มอเตอร์เกียร์ 12V RPM 100 หมุนใบกวนหลังจ่ายวัตถุดิบครบและ Load Cell นิ่ง ขับผ่าน L298N (IN1 = GPIO18, IN2 = GPIO19)', note:'เวลากวน 5 วินาทีในโค้ดยังเป็นค่า placeholder ต้องปรับหลังดูการผสมจริง'},
 {id:'loadcell', icon:'weight', name:'Load Cell + HX711', en:'Cumulative weighing', qty:'1 ชุด', color:'#ad9762', detail:'HX711 (DT = GPIO16, SCK = GPIO17) ส่งน้ำหนักให้ ESP32 หลัก ปิดวาล์วเมื่อน้ำหนักที่เพิ่ม ≥ เป้าหมาย − ค่า Calibrate แล้วรอให้ค่านิ่งก่อนเปิดตัวถัดไป', note:'calibration factor = 200000 (ตีความเป็น kg ×1000 = กรัม) ต้องไม่มีของบนภาชนะตอนเปิดเครื่องเพราะ tare ที่ 0'},
 {id:'panel', icon:'panel-top', name:'ESP32-2432S028 จอสัมผัส', en:'Touch display (thin client)', qty:'1 บอร์ด', color:'#456457', detail:'จอ 2.8" ILI9341 + XPT2046 แสดงสูตร กราฟน้ำหนัก และสถานะ รับการแตะแล้วส่งไปบอร์ดหลักผ่าน Bluetooth (VerdantDisplay ↔ VerdantMain) ไม่มีตรรกะของตัวเอง', note:'ไฟเลี้ยงจากขา 5V และ GND ของ ESP32 38pin เท่านั้น ไม่มีสายสัญญาณ  กดปุ่ม “ดู/แก้ไขโค้ด” เพื่อเปิดไฟล์ esp32_touch_hmi_ui.ino'},
 {id:'controller', icon:'cpu', name:'ESP32 DevKit 38-pin', en:'Main machine controller', qty:'1 บอร์ด', color:'#446b59', detail:'หลังบ้านที่ตัดสินใจทุกอย่าง: คุม PCA9685 (I²C GPIO22/23), L298N, อ่านปุ่ม 4 ปุ่ม, E-Stop (GPIO27) และ HX711 เก็บ state ใน NVS เพื่อกู้คืนหลังไฟดับ', note:'ก่อนอัปโหลดโค้ดต้องถอดสายอื่นออกให้เหลือ USB เส้นเดียว  กดปุ่ม “ดู/แก้ไขโค้ด” เพื่อเปิดไฟล์ esp32_main_dispenser.ino'},
 {id:'driver', icon:'circuit-board', name:'PCA9685 + L298N', en:'Ready-made driver modules', qty:'อย่างละ 1', color:'#52716f', detail:'PCA9685 สร้างสัญญาณ Servo 4 ช่องผ่าน I²C ส่วน L298N รับ IN1/IN2 จาก ESP32 และขับมอเตอร์ 12V (ENA ใช้จัมเปอร์เปิดเต็มความเร็ว)', note:'ขา 5V ของ L298N ปล่อยว่าง ไม่ต่อรวมกับราง 5V ของ ESP32 กันไฟย้อน'},
 {id:'power', icon:'zap', name:'Adapter 12V + XL4016', en:'Power', qty:'1 ระบบ', color:'#b38d52', detail:'Adapter 12V เข้า XL4016 ที่ปรับเป็น 5V เพื่อเลี้ยง ESP32 38pin (และจอ) กับ PCA9685 V+ ส่วนมอเตอร์ใช้ 12V จาก Adapter ตรง ๆ ผ่านปุ่ม E-Stop ไปที่ L298N', note:'วัดแรงดันขา OUT ของ XL4016 ให้ได้ 5V ตอนไม่มีโหลดก่อนต่อสายถัดไป'},
 {id:'safety', icon:'octagon-pause', name:'ปุ่ม E-Stop แบบล็อก', en:'Latching emergency stop', qty:'1 ปุ่ม', color:'#a24c44', detail:'ขา NC อนุกรมกับ 12V ของ L298N ตัดไฟมอเตอร์ทางฮาร์ดแวร์เสมอ ไม่ต้องมี relay ส่วนขา NO ต่อ GPIO27 + GND ให้ซอฟต์แวร์หยุด Servo และขึ้นหน้า EMERGENCY STOP', note:'ต้องเป็นปุ่มที่ NC กับ NO แยก contact block กัน วัด continuity ก่อนต่อ ไม่งั้น 12V จะเข้า GPIO27'},
 {id:'buttons', icon:'circle-dot', name:'ปุ่มกดเขียว 22mm × 4', en:'Physical operator buttons', qty:'4 ปุ่ม', color:'#6d9560', detail:'ปุ่ม 1/2/3 เลือกสูตร (GPIO32/33/25) ปุ่ม 4 (GPIO26) ยืนยัน/ปล่อย ทำงานตามหน้าจอ ต่อขา NO เข้า GPIO อีกด้านลง GND ใช้ INPUT_PULLUP', note:'ใช้ขา NO เท่านั้น ขา NC จะอ่านเป็น LOW ตลอดเวลา'},
];

export const sources = [
 ['ESP32-2432S028 · board reference','https://esp3d.io/esp3d-tft/version_1x/hardware/esp32/sunton-28-2432/'],
 ['Espressif · ESP32-DevKitC','https://documentation.espressif.com/esp-dev-kits/en/latest/esp32/esp32-devkitc/user_guide.html'],
 ['Adafruit · PCA9685 module','https://learn.adafruit.com/16-channel-pwm-servo-driver?view=all'],
 ['TowerPro · MG996R','https://towerpro.com.tw/product/mg996R/'],
 ['SparkFun · HX711 & calibration','https://learn.sparkfun.com/tutorials/load-cell-amplifier-hx711-breakout-hookup-guide/all'],
 ['STMicroelectronics · L298 datasheet','https://www.st.com/resource/en/datasheet/l298.pdf'],
];

export const pins = [
 ['จอ ↔ ESP32 หลัก','Bluetooth SPP','VerdantDisplay ↔ VerdantMain (ไม่มีสายสัญญาณ)'],
 ['PCA9685','22 / 23','SDA / SCL · 3V3 → VCC'],
 ['L298N','18 / 19','IN1 / IN2 · ENA จัมเปอร์'],
 ['HX711','16 / 17','DT / SCK · VCC ที่ 3V3'],
 ['ปุ่มเขียว 1 / 2 / 3','32 / 33 / 25','INPUT_PULLUP · ขา NO กดลง GND'],
 ['ปุ่มเขียว 4 (ยืนยัน/ปล่อย)','26','INPUT_PULLUP · ขา NO กดลง GND'],
 ['E‑Stop (ขา NO)','27','INPUT_PULLUP · กดล็อก = LOW'],
];

export const shoppingList = [
 ['ESP32 DevKit 38-pin','1','บอร์ดหลัก ควบคุมและเก็บ state','ไฟ 5V จาก XL4016'],
 ['ESP32-2432S028 (จอสัมผัส 2.8")','1','หน้าจอ thin client ผ่าน Bluetooth','ILI9341 + XPT2046'],
 ['PCA9685 16-channel PWM','1','สัญญาณ Servo 4 ช่อง','ช่อง 0, 4, 8, 12'],
 ['Servo MG996R','4','ประตู N / P / K และประตูปล่อย','ไฟจาก V+ ของ PCA9685'],
 ['มอเตอร์เกียร์ JGB37-520 12V RPM 100','1','ใบกวนผสม','ไฟ 12V ตรงจาก Adapter'],
 ['L298N Dual H-Bridge','1','ขับมอเตอร์กวน','ENA จัมเปอร์ · ขา 5V ว่าง'],
 ['ปุ่มกด 22mm สีเขียว','4','เลือกสูตร 1/2/3 + ยืนยัน/ปล่อย','ใช้ขา NO'],
 ['ปุ่ม E‑Stop แบบล็อก (กดล็อก-บิดปลด)','1','ตัดไฟมอเตอร์ + แจ้ง ESP32','ต้องมี NC + NO แยกกัน'],
 ['Load Cell + HX711','1 ชุด','ชั่งน้ำหนักถังผสม','calibration factor 200000'],
 ['XL4016 DC-DC step-down','1','12V → 5V','ปรับ output ไว้ที่ 5V'],
 ['แหล่งจ่ายไฟหลัก 12V','1','Adapter หรือแบตเตอรี่','จ่ายตรงให้ L298N ผ่าน E‑Stop'],
];
