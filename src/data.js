export const components = [
 {id:'hoppers', icon:'container', name:'ถังเก็บ N · P · K', en:'Material hoppers', qty:'3 ถัง', color:'#759778', detail:'กรวยแยกวัตถุดิบ 3 ชนิด ใช้แรงโน้มถ่วงจ่ายลงถังผสมทีละช่อง และชั่งน้ำหนักสะสมเพื่อควบคุมปริมาณ', note:'ขนาดทางออก มุมกรวย และแรงบิดเปิดประตู ต้องทดลองกับปุ๋ยเม็ดจริงเพื่อป้องกันการอุดตัน'},
 {id:'servo', icon:'settings-2', name:'Servo MG996R', en:'Dosing & discharge gates', qty:'4 ตัว', color:'#5786a4', detail:'Servo 1–3 เปิดประตูใต้กรวย N/P/K ส่วน Servo 4 เปิดทางออกถังผสม ใช้ PCA9685 สร้างสัญญาณ PWM ได้โดยใช้บัส I²C ร่วมกัน', note:'TowerPro ระบุไฟใช้งาน 4.8–6.6V จึงใช้ราง 6V แยกที่รองรับกระแสรวมขณะ stall ห้ามป้อน 12V หรือดึงไฟกำลังจาก ESP32'},
 {id:'mixer', icon:'rotate-3d', name:'ถังผสม + Motor DC', en:'Mixing chamber', qty:'1 ชุด', color:'#7a9282', detail:'มอเตอร์เกียร์ 12V หมุนใบกวนในถังผสม เมื่อจ่ายครบจะปิดทุกกรวย รอค่าน้ำหนักนิ่ง แล้วเริ่มกวนก่อนเปิดปล่อย', note:'เลือกกำลังและแรงบิดจากโหลดจริง โมเดลใบกวนและเวลา 6 วินาทีเป็นตัวอย่าง ไม่ใช่ผลทดสอบความสม่ำเสมอ'},
 {id:'loadcell', icon:'weight', name:'Load Cell + HX711', en:'Cumulative weighing', qty:'1 ชุด', color:'#ad9762', detail:'รองรับชุดถังผสมเพื่ออ่านน้ำหนักรวมผ่าน HX711 หักน้ำหนักถังด้วย tare แล้วจ่าย N → P → K ตามน้ำหนักที่เพิ่มขึ้น', note:'ฐานชั่งต้องรับแรงผ่าน Load Cell ไม่มีโครงหรือสายแข็งลัดแรง ต้องคาลิเบรตด้วยตุ้มน้ำหนัก และหยุดมอเตอร์ขณะอ่านค่านิ่ง'},
 {id:'controller', icon:'cpu', name:'ESP32 + PCA9685', en:'Control & PWM expansion', qty:'1 + 1 บอร์ด', color:'#446b59', detail:'ตัวอย่างนี้ใช้ ESP32 DevKit ที่เป็นโมดูล WROOM-32E หนึ่งตัว ร่วมกับ PCA9685 สำหรับ 4 Servo จอแบบ I²C ใช้บัสเดียวกันหากที่อยู่ไม่ซ้ำ', note:'Breadboard เพิ่มจุดต่อไฟและสาย แต่ไม่ได้เพิ่ม GPIO สำหรับตู้จริงใช้ terminal block หรือแผ่นวงจร และตรวจ pinout ของบอร์ดที่ซื้อ'},
 {id:'power', icon:'zap', name:'Power Supply + DC–DC', en:'Separated power rails', qty:'1 + 2 ชุด', color:'#b38d52', detail:'แหล่งจ่ายหลัก 12V แยกไป Motor Driver และตัวลดแรงดัน DC–DC เป็น 6V สำหรับ Servo กับ 5V สำหรับบอร์ด/จอ ผ่าน regulator ตามชนิดบอร์ด', note:'เลือกพิกัดจากกระแสเริ่มหมุน/stall พร้อม margin ฟิวส์แยกสาขา และกราวด์อ้างอิงร่วมฝั่ง DC; งานไฟบ้านและสายดินตู้ให้ช่างตรวจ'},
 {id:'driver', icon:'circuit-board', name:'Motor Driver', en:'12V motor switching', qty:'1 โมดูล', color:'#52716f', detail:'ESP32 ส่งสัญญาณควบคุม ส่วน driver รับไฟ 12V จาก Power Supply และจ่ายกระแสให้มอเตอร์ ต้องรองรับสัญญาณ 3.3V หรือมีวงจรแปลงระดับ', note:'ยังไม่ยืนยัน L298N: มีแรงดันตกและความร้อน ต้องเทียบกับกระแส stall ของมอเตอร์ หากกวนทิศเดียวอาจใช้ MOSFET driver พร้อมวงจรป้องกันแรงดันย้อน'},
 {id:'panel', icon:'panel-top', name:'จอแสดงผล + ปุ่มกด', en:'Non-touch control panel', qty:'1 ชุด', color:'#456457', detail:'หน้าจอแสดงสูตรตัวอย่าง ปริมาณแต่ละช่อง น้ำหนักรวม และสถานะเท่านั้น เลือกสูตรและเริ่มรอบผ่านปุ่มกดแยก มีปุ่มปล่อยและ E-Stop', note:'E-Stop ของจริงต้องตัดพลังงานขับผ่านวงจรที่เหมาะสมโดยไม่พึ่งโปรแกรม และประตูจ่ายต้องออกแบบกลับสู่สภาวะปลอดภัย; Servo ที่ดับไฟไม่ได้ปิดเองเสมอ'},
];
export const sources = [
 ['TowerPro · MG996R','https://towerpro.com.tw/product/mg996R/'],
 ['Espressif · GPIO reference','https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-reference/peripherals/gpio.html'],
 ['NXP · PCA9685 datasheet','https://www.nxp.com/docs/en/data-sheet/PCA9685.pdf'],
 ['SparkFun · HX711 & calibration','https://learn.sparkfun.com/tutorials/load-cell-amplifier-hx711-breakout-hookup-guide/all'],
 ['ST · L298 datasheet','https://www.st.com/resource/en/datasheet/cd00000240.pdf'],
];
export const pins = [
 ['จอ I²C + PCA9685','21 / 22','SDA / SCL ร่วมบัส · pull-up 3.3V'],
 ['HX711','32 / 33','DOUT / SCK · เลือกโมดูล logic 3.3V'],
 ['Motor Driver','25 / 26 / 27','PWM / IN1 / IN2 ตามชนิด driver'],
 ['ปุ่มสูตร 1 / 2 / 3','13 / 14 / 18','Input pull-up · กดลง GND'],
 ['ปุ่มเริ่ม / ปล่อย','19 / 23','Input pull-up · กดลง GND'],
 ['E-Stop feedback','34','Input-only · ต้องมี external pull-up 3.3V'],
];
