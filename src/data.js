export const components = [
 {id:'hoppers', icon:'container', name:'ถังเก็บ N · P · K', en:'Material hoppers', qty:'3 ถัง', color:'#759778', detail:'กรวยแยกวัตถุดิบ 3 ชนิด จ่ายลงถังผสมทีละช่องตามน้ำหนักที่ Load Cell อ่านได้', note:'ขนาดทางออก มุมกรวย และแรงบิดเปิดประตูต้องทดลองกับปุ๋ยจริงเพื่อป้องกันการอุดตัน'},
 {id:'servo', icon:'settings-2', name:'Servo MG996R', en:'Dosing & discharge gates', qty:'4 ตัว', color:'#5786a4', detail:'Servo 1–3 เปิดประตูใต้กรวย N/P/K และ Servo 4 เปิดทางออกถังผสม รับสัญญาณจากโมดูล PCA9685', note:'จ่ายไฟจากราง 5V-ACTUATOR ที่แยกจากบอร์ดควบคุม และคำนวณจากกระแส stall รวม ห้ามป้อน 12V'},
 {id:'mixer', icon:'rotate-3d', name:'ถังผสม + Motor DC', en:'Mixing chamber', qty:'1 ชุด', color:'#7a9282', detail:'มอเตอร์เกียร์ 12V หมุนใบกวนหลังจ่ายวัตถุดิบครบและค่าน้ำหนักนิ่ง แล้วหยุดก่อนเปิดประตูปล่อย', note:'ต้องเลือกรุ่นมอเตอร์จากแรงบิดและกระแส stall จริง เวลา 6 วินาทีในเว็บเป็นค่าจำลอง'},
 {id:'loadcell', icon:'weight', name:'Load Cell + HX711', en:'Cumulative weighing', qty:'1 ชุด', color:'#ad9762', detail:'Load Cell รองรับชุดถังผสมและส่งสัญญาณผ่าน HX711 ไปยัง ESP32 หลัก เพื่อควบคุมการจ่ายตามน้ำหนักสะสม', note:'ฐานชั่งต้องไม่มีโครงหรือสายแข็งลัดแรง และต้อง tare กับคาลิเบรตด้วยตุ้มน้ำหนักจริง'},
 {id:'panel', icon:'panel-top', name:'ESP32 Touch HMI 2.8 นิ้ว', en:'ESP32-2432S028R interface', qty:'1 บอร์ด', color:'#456457', detail:'จอ TFT 240 × 320 พร้อม ESP32 ในตัว แสดงสูตร N-P-K น้ำหนัก ขั้นตอน และ Alarm รับข้อมูลจาก ESP32 หลักผ่าน UART', note:'ยืนยันรหัสรุ่น ESP32-2432S028R ที่ด้านหลังบอร์ดก่อนซื้อ จ่ายไฟ 5V-CONTROL และคง E-Stop เป็นปุ่มหัวเห็ดจริง'},
 {id:'controller', icon:'cpu', name:'ESP32 DevKitC + Terminal Base', en:'Main machine controller', qty:'1 + 1 บอร์ด', color:'#446b59', detail:'ESP32 หลักอ่าน Load Cell และปุ่ม ควบคุม PCA9685 กับ MD10C และส่งสถานะไปจอ HMI จึงแยกงานควบคุมเครื่องออกจากงานวาดหน้าจอ', note:'Terminal Base ช่วยขันสายให้แน่นแต่ไม่ได้เพิ่ม GPIO; ต้องเลือกรุ่นฐานที่ตรงกับ DevKitC แบบ 38 ขา'},
 {id:'driver', icon:'circuit-board', name:'PCA9685 + Cytron MD10C R3', en:'Ready-made driver modules', qty:'อย่างละ 1', color:'#52716f', detail:'PCA9685 สร้างสัญญาณ Servo 4 ช่องผ่าน I²C ส่วน MD10C รับ PWM/DIR จาก ESP32 และขับ Motor DC 12V', note:'ไม่ใช้ L298N, SN74AHCT125N หรือ BSS138 ในแบบใหม่ การเลือก MD10C ขั้นสุดท้ายต้องเทียบกระแส stall ของมอเตอร์'},
 {id:'power', icon:'zap', name:'Power Supply + DC–DC + Terminal', en:'Separated DC power rails', qty:'1 ระบบ', color:'#b38d52', detail:'12V แบ่งเป็น 5V-CONTROL สำหรับ ESP32 ทั้งสอง/HX711 และ 5V-ACTUATOR สำหรับ Servo ส่วน 12V หลัง K1 จ่ายให้ MD10C', note:'แยก terminal และฟิวส์แต่ละสาขา ไม่ให้กระแส Servo/Motor ไหลผ่านขา ESP32'},
 {id:'safety', icon:'octagon-pause', name:'E‑Stop + Safety Relay + K1', en:'Independent hardware stop', qty:'1 ชุด', color:'#a24c44', detail:'E‑Stop สองช่องสั่ง Safety relay ให้ปลดคอนแทคเตอร์ K1 ซึ่งตัดไฟ Motor และ Servo โดยตรง ส่วน ESP32 และจอยังมีไฟเพื่อแสดง Alarm', note:'ต้องเลือก Safety relay และคอนแทคเตอร์ DC จากการประเมินความเสี่ยงและกระแสจริง ปลด E‑Stop แล้วต้องกด Reset/Start ใหม่'},
 {id:'buttons', icon:'circle-dot', name:'ปุ่มจริง + Manual Reset', en:'Physical operator controls', qty:'6 ปุ่ม + E‑Stop', color:'#6d9560', detail:'ปุ่มสูตร 1/2/3 เริ่ม และปล่อย ต่อเป็นอินพุตของ ESP32 หลัก ส่วน Manual Reset ต่อกับวงจร Safety relay ตามคู่มือรุ่นจริง', note:'จอสัมผัสใช้เลือกเมนูได้ แต่ E‑Stop และการ Reset ความปลอดภัยต้องเป็นอุปกรณ์จริงแยกจากจอ'},
];

export const sources = [
 ['ESP32-2432S028R · board reference','https://esp3d.io/esp3d-tft/version_1x/hardware/esp32/sunton-28-2432/'],
 ['Espressif · ESP32-DevKitC V4','https://documentation.espressif.com/esp-dev-kits/en/latest/esp32/esp32-devkitc/user_guide.html'],
 ['Adafruit · PCA9685 module','https://learn.adafruit.com/16-channel-pwm-servo-driver?view=all'],
 ['TowerPro · MG996R','https://towerpro.com.tw/product/mg996R/'],
 ['SparkFun · HX711 & calibration','https://learn.sparkfun.com/tutorials/load-cell-amplifier-hx711-breakout-hookup-guide/all'],
 ['Cytron · MD10C R3','https://docs.google.com/document/d/1rgQzn-nWn-qcWNnHjDZvIYqUrdCeBQQxXA-TU3BF0AQ/view'],
 ['Pilz · E‑Stop safety relay example','https://www.pilz.com/download/open/PNOZ_X2_8P_Operat_Manual_1004082-EN-17.pdf'],
];

export const pins = [
 ['จอ HMI → ESP32 หลัก','HMI 22 → Main 16','UART TX → RX2'],
 ['ESP32 หลัก → จอ HMI','Main 17 → HMI 27','UART TX2 → RX'],
 ['PCA9685','21 / 22 / 27','SDA / SCL / OE'],
 ['HX711','32 / 33','DAT / CLK'],
 ['Cytron MD10C R3','25 / 26','PWM / DIR'],
 ['ปุ่มสูตร 1 / 2 / 3','13 / 14 / 18','INPUT_PULLUP · กดลง GND'],
 ['ปุ่มเริ่ม / ปล่อย','19 / 23','INPUT_PULLUP · กดลง GND'],
 ['E‑Stop feedback','34','10k pull-up · ปกติ LOW / กดหรือสายขาด HIGH'],
];

export const shoppingList = [
 ['ESP32-2432S028R จอสัมผัส 2.8 นิ้ว','1','HMI แสดงผลและรับคำสั่ง','ยืนยันรหัสด้านหลัง'],
 ['ESP32-DevKitC V4 / WROOM-32E แบบ 38 ขา','1','ควบคุมเครื่องหลัก','ใช้'],
 ['ESP32 Screw Terminal Base แบบ 38 ขา','1','ขันสายของบอร์ดหลัก','ตรวจระยะขาตรงรุ่น'],
 ['PCA9685 Servo Driver module','1','สัญญาณ Servo 4 ช่อง','ใช้'],
 ['MG996R','4','ประตู N/P/K และประตูปล่อย','ตรวจแรงบิด'],
 ['Load Cell + HX711 module','1 ชุด','ชั่งน้ำหนักถังผสม','ตรวจพิกัด/คาลิเบรต'],
 ['Cytron MD10C R3','1','ขับ Motor DC ด้วย PWM/DIR','ตรวจ stall current'],
 ['Motor DC gear 12V','1','หมุนใบกวน','ยังต้องเลือกรุ่น'],
 ['Power Supply 12V','1','แหล่งจ่ายหลัก','คำนวณกำลังหลังเลือก Motor'],
 ['DC–DC 12V → 5V CONTROL','1','ESP32 สองบอร์ด + HX711','อย่างน้อย 2A โดยตรวจโหลดจริง'],
 ['DC–DC 12V → 5V ACTUATOR','1','Servo 4 ตัว','เลือกรุ่นกระแสสูงจาก stall รวม'],
 ['E‑Stop แบบล็อกค้าง 2NC + AUX NC','1','หยุดฮาร์ดแวร์และส่ง feedback','เลือกอุปกรณ์อุตสาหกรรม'],
 ['Safety relay + DC contactor K1','อย่างละ 1','ตัดราง Motor/Servo','เลือกรุ่นหลังประเมินความเสี่ยง'],
 ['ปุ่ม NO สูตร 1/2/3, Start, Discharge','5','คำสั่งเข้า ESP32','ใช้'],
 ['ปุ่ม Manual Reset','1','Reset วงจร Safety','ต่อจากคู่มือ Safety relay'],
 ['Terminal Block + jumper + branch fuse','1 ชุด','กระจาย 12V, 5V-C, 5V-A และ 0V','คำนวณพิกัดสาย/ฟิวส์'],
 ['ตัวต้านทาน 10kΩ + 1kΩ','อย่างละ 1','Pull-up และป้องกัน GPIO34','ใช้'],
 ['ตู้เหล็ก 40 × 57 × 20 ซม.','1','โครงอ้างอิง','ต้องวัดพื้นที่ภายในจริง'],
];
