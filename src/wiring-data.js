// Single source of truth: every 3D cable, table row and CSV export uses this netlist.
export const wiringSources = {
  hmi:['ESP3D · ESP32-2432S028 board reference','https://esp3d.io/esp3d-tft/version_1x/hardware/esp32/sunton-28-2432/'],
  esp:['Espressif · DevKitC headers','https://documentation.espressif.com/esp-dev-kits/en/latest/esp32/esp32-devkitc/user_guide.html'],
  pca:['Adafruit · PCA9685 module pinouts','https://learn.adafruit.com/16-channel-pwm-servo-driver?view=all'],
  hx:['SparkFun · HX711','https://learn.sparkfun.com/tutorials/load-cell-amplifier-hx711-breakout-hookup-guide/all'],
  driver:['STMicroelectronics · L298 datasheet','https://www.st.com/resource/en/datasheet/l298.pdf'],
  servo:['TowerPro · MG996R','https://towerpro.com.tw/product/mg996R/'],
};
export const groups=[
 {id:'power',name:'ไฟ 12V → XL4016 → 5V',color:'#bc5952',desc:'Adapter 12V เข้า XL4016 ที่ปรับเป็น 5V เลี้ยง ESP32 38pin และจอ (จอรับไฟจากขา 5V/GND ของ ESP32 38pin) ส่วน PCA9685 V+ ดูวงจร Servo'},
 {id:'servo',name:'Servo · PCA9685',color:'#c69238',desc:'ESP32 38pin คุย PCA9685 ผ่าน I²C (GPIO22 SDA / GPIO23 SCL) Servo 4 ตัวอยู่ที่ช่อง 0, 4, 8, 12 ไฟ Servo มาจากราง V+ ของ PCA9685 ซึ่งต่อกับ XL4016 ห้ามใช้ขา 5V/3V3 ของ ESP32'},
 {id:'motor',name:'มอเตอร์กวน · L298N',color:'#d27655',desc:'L298N รับ IN1/IN2 จาก GPIO18/19 และขับมอเตอร์ JGB37-520 ด้วย 12V จาก Adapter (ENA ใช้จัมเปอร์ ขา 5V ของ L298N ปล่อยว่าง)'},
 {id:'estop',name:'E‑Stop',color:'#bc526d',desc:'ขา NC อนุกรมกับ 12V ของ L298N ตัดไฟมอเตอร์ทางฮาร์ดแวร์ ส่วนขา NO ต่อ GPIO27 + GND ให้ซอฟต์แวร์หยุด Servo และขึ้นหน้า EMERGENCY STOP'},
 {id:'buttons',name:'ปุ่มเขียว 4 ปุ่ม',color:'#6d9560',desc:'ขา NO ของปุ่มต่อ GPIO ด้านหนึ่งและ GND อีกด้าน ใช้ INPUT_PULLUP กด = LOW ปุ่ม 4 เปลี่ยนหน้าที่ตามหน้าจอ'},
 {id:'weight',name:'Load Cell · HX711',color:'#9776b9',desc:'HX711 ใช้ไฟ 3V3 ส่ง DT/SCK เข้า GPIO16/17 ค่า calibration factor 200000'},
];
const j2=['3V3','EN','VP','VN','IO34','IO35','IO32','IO33','IO25','IO26','IO27','IO14','IO12','GND','IO13','D2','D3','CMD','5V'];
const j3=['GND','IO23','IO22','TX','RX','IO21','GND','IO19','IO18','IO5','IO17','IO16','IO4','IO0','IO2','IO15','D1','D0','CLK'];
const pins=(names)=>names.map(name=>({id:name,label:name}));
const board=(id,name,model,x,y,w,h,left,right,notes,source,kind='pcb')=>({id,name,model,x,y,w,h,left:pins(left),right:pins(right),notes,source,kind});
export const boards=[
 board('esp','ESP32 38pin','DevKit · 38 pins · บอร์ดหลัก',0,1.4,3.2,6.9,[],[],'บอร์ดหลัก ตัดสินใจทุกอย่างและเก็บ state ลง NVS รับไฟ 5V จาก XL4016 ที่ขา 5V คุยกับจอผ่าน Bluetooth (VerdantMain) เลขขาในฉากอ้างตามผัง DevKitC ตรวจตำแหน่งขาบนบอร์ดจริงจากชื่อ GPIO ก่อนต่อ','esp','esp'),
 board('hmi','ESP32 DISPLAY','ESP32-2432S028 · 2.8 inch',-5.6,-0.9,3.4,2.0,[],['VIN-5V','GND'],'จอสัมผัสมี ESP32 ในตัว คุยกับบอร์ดหลักผ่าน Bluetooth (VerdantDisplay) จึงมีแค่สายไฟเลี้ยงจากขา 5V/GND ของ ESP32 38pin ไม่มีสายสัญญาณ กดที่บอร์ดนี้เพื่อดู/แก้โค้ด','hmi','hmi'),
 board('pca','PCA9685 MODULE','16-channel PWM · address 0x40',5.6,6.3,3.0,3.0,['VCC','GND','SDA','SCL','V+','V-'],['CH0','CH4','CH8','CH12','CH-V+','CH-GND'],'VCC = 3V3 (ลอจิก) ส่วน V+/GND ที่ header ข้าง VCC รับ 5V จาก XL4016 เป็นไฟ Servo ช่อง CH-V+/CH-GND คือขา V+/GND ที่ header ของทุกช่องซึ่งใช้ร่วมกัน OE ไม่ต้องต่อ','pca'),
 ...['N','P','K','OUT'].map((name,i)=>board('servo'+i,'MG996R · '+name,['Servo 1 · ส่วนผสม N · CH0','Servo 2 · ส่วนผสม P · CH4','Servo 3 · ส่วนผสม K · CH8','Servo 4 · ประตูปล่อย · CH12'][i],13.0,7.0-i*2.15,2.5,1.45,['SIG','V+','GND'],[],'SIG มักเป็นสีส้มหรือเหลือง, V+ แดง, GND น้ำตาลหรือดำ แต่ต้องตรวจสายจริง รับไฟจากราง V+ ของ PCA9685 เท่านั้น','servo','servo')),
 board('hx','HX711','Load cell amplifier · 3V3',5.6,0.8,2.7,2.6,['VCC','GND','DT','SCK'],['E+','E-','A+','A-'],'จ่ายไฟ 3V3 เพื่อให้ DT เป็นสัญญาณ 3.3V ปลอดภัยกับ GPIO calibration factor = 200000 (โค้ดตีความเป็นกิโลกรัมแล้วคูณ 1000)','hx'),
 board('cell','LOAD CELL','4-wire bridge',9.7,0.8,2.6,2.2,['RED','BLK','WHT','GRN'],[],'สีที่พบบ่อย: แดง E+, ดำ E−, ขาว A−, เขียว A+ สีต่างกันตามรุ่น ดูจากที่พิมพ์ข้างสาย ถ้าน้ำหนักติดลบให้สลับ A+ กับ A−','hx','cell'),
 board('driver','L298N','Dual H-Bridge · Motor A',5.6,-5.4,3.0,2.6,['12V','GND','IN1','IN2'],['OUT1','OUT2'],'12V ตรงจาก Adapter ผ่านขา NC ของ E-Stop ENA ใช้จัมเปอร์ (เปิดเต็มความเร็ว) ขา 5V ของ L298N ปล่อยว่าง ไม่ต่อรวมกับ 5V ของ ESP32','driver'),
 board('motor','DC GEAR MOTOR','JGB37-520 · 12V · RPM 100',10.6,-5.4,2.7,1.8,['A','B'],[],'ใบกวนผสม สลับ OUT1/OUT2 ได้ถ้าหมุนผิดทิศ','driver','motor'),
 board('buttons','GREEN BUTTONS × 4','สูตร 1/2/3 · ยืนยัน/ปล่อย',-5.6,3.0,3.2,3.0,[],['1-NO','1-GND','2-NO','2-GND','3-NO','3-GND','4-NO','4-GND'],'ใช้ขา NO เท่านั้น ด้านหนึ่งไป GPIO อีกด้านลง GND ตั้ง INPUT_PULLUP: ปล่อย = HIGH กด = LOW ปุ่ม 4 ทำหน้าที่ยืนยัน/ปล่อยตามหน้าจอ',null,'buttons'),
 board('estop','E‑STOP','ปุ่มล็อก · NC + NO แยก contact',-5.6,-5.4,3.2,2.6,['NC-1'],['NC-2','NO-1','NO-2'],'NC อนุกรมกับ 12V ของ L298N ตัดไฟมอเตอร์ในฮาร์ดแวร์เสมอ ไม่ต้องมี relay NO ต่อ GPIO27 + GND ให้ซอฟต์แวร์รู้ วัด continuity ก่อนต่อว่า NC กับ NO เป็นคนละ contact block แยกกัน',null,'stop'),
 board('psu','ADAPTER 12V','แหล่งจ่ายไฟหลัก',-10.2,-5.4,3.4,2.0,[],['+12V','0V'],'แหล่งจ่ายไฟหลัก 12V (adapter หรือแบตเตอรี่) แสดงเฉพาะฝั่ง DC',null,'power'),
 board('xl','XL4016','Step-down · ปรับ output 5V',0,-5.4,3.0,1.8,['IN+','IN-'],['OUT+','OUT-'],'ปรับ trimpot ให้ OUT = 5V (วัดตอนไม่มีโหลด) เลี้ยง ESP32 38pin, จอ และ PCA9685 V+',null,'buck'),
];
for(const b of boards)b.hasCode=b.id==='esp'||b.id==='hmi'; // click opens the device firmware
boards[0].left=j2.map((name,i)=>({id:`J2.${i+1}`,label:`${i+1} ${name}`,name}));
boards[0].right=j3.map((name,i)=>({id:`J3.${i+1}`,label:`${i+1} ${name}`,name}));

export const wires=[];
function add(group,from,to,label,voltage,note='',type='signal',status='reference'){
 const number=wires.length+1;
 wires.push({id:`W${String(number).padStart(3,'0')}`,group,from,to,label,voltage,note,type,status});
}
// Header positions on the DevKit drawing (J2 left / J3 right) for the GPIOs used.
const V='esp.J2.1',V5='esp.J2.19',G='esp.J2.14'; // 3V3, 5V, GND

// 1) 12V -> XL4016 -> 5V rails.
add('power','psu.+12V','xl.IN+','Adapter 12V (+) → XL4016 IN+','12V','','power');
add('power','psu.0V','xl.IN-','Adapter 12V (−) → XL4016 IN−','0V','ปรับ trimpot ให้ OUT = 5V ก่อนต่อสายถัดไป','ground');
add('power','xl.OUT+',V5,'XL4016 OUT+ → ESP32 38pin 5V','5V','J2 pin 19','power');
add('power','xl.OUT-',G,'XL4016 OUT− → ESP32 38pin GND','0V','J2 pin 14','ground');
add('power',V5,'hmi.VIN-5V','ESP32 38pin 5V → จอ VIN','5V','ห้ามป้อน 12V เข้าจอ','power');
add('power',G,'hmi.GND','ESP32 38pin GND → จอ GND','0V','จอกับ 38pin ไม่มีสายสัญญาณ คุยกันผ่าน Bluetooth','ground');

// 2) PCA9685 + four servos (CH0/4/8/12).
add('servo','esp.J3.3','pca.SDA','GPIO22 → PCA9685 SDA','3.3V I²C','J3 pin 3');
add('servo','esp.J3.2','pca.SCL','GPIO23 → PCA9685 SCL','3.3V I²C','J3 pin 2');
add('servo',V,'pca.VCC','3V3 → PCA9685 VCC','3.3V','VCC เป็นไฟลอจิก ไม่ใช่ไฟ Servo','power');
add('servo',G,'pca.GND','ESP32 GND → PCA9685 GND','0V','header แถวเดียวกับ VCC','ground');
add('servo','xl.OUT+','pca.V+','XL4016 OUT+ → PCA9685 V+','5V','V+ ที่ pin header ข้าง VCC (terminal สีเขียวไม่ต้องต่อ)','power');
add('servo','xl.OUT-','pca.V-','XL4016 OUT− → PCA9685 GND (V+ side)','0V','','ground');
for(const [i,ch] of [[0,0],[1,4],[2,8],[3,12]]){
 add('servo',`pca.CH${ch}`,`servo${i}.SIG`,`CH${ch} → Servo ${i+1} signal`,'3.3V PWM','เริ่มที่ 50Hz พัลส์ 1000–2000µs');
 add('servo','pca.CH-V+',`servo${i}.V+`,`PCA9685 V+ → Servo ${i+1}`,'5V','ต่อจาก header ของช่อง '+ch+' ห้ามใช้ขา 5V/3V3 ของ ESP32','power','conditional');
 add('servo','pca.CH-GND',`servo${i}.GND`,`Servo ${i+1} GND`,'0V','','ground');
}

// 3) L298N stirring motor. 12V comes from the adapter through the E-Stop NC contact.
add('motor','esp.J3.9','driver.IN1','GPIO18 → L298N IN1','3.3V','J3 pin 9');
add('motor','esp.J3.8','driver.IN2','GPIO19 → L298N IN2','3.3V','J3 pin 8');
add('motor','psu.0V','driver.GND','Adapter 0V → L298N GND','0V','ร่วม GND กับทั้งระบบ','ground');
add('motor','driver.OUT1','motor.A','L298N OUT1 → มอเตอร์ สายที่ 1','0–12V','สลับ OUT1/OUT2 ได้ถ้าหมุนผิดทิศ','power','conditional');
add('motor','driver.OUT2','motor.B','L298N OUT2 → มอเตอร์ สายที่ 2','0–12V','','power','conditional');

// 4) Latching E-Stop: NC cuts motor 12V in hardware, NO tells the ESP32.
add('estop','psu.+12V','estop.NC-1','Adapter 12V (+) → E‑Stop NC ขาที่ 1','12V','สลับขา 1/2 ได้','power','conditional');
add('estop','estop.NC-2','driver.12V','E‑Stop NC ขาที่ 2 → L298N 12V','12V','กดปุ่มล็อก NC เปิด ไฟมอเตอร์ดับทางฮาร์ดแวร์ ไม่ผ่านโค้ด','power','conditional');
add('estop','estop.NO-1','esp.J2.11','E‑Stop NO → GPIO27','3.3V input','J2 pin 11 · INPUT_PULLUP · กดล็อก = LOW · วัดก่อนว่า NC/NO แยก contact กัน','signal','conditional');
add('estop','estop.NO-2',G,'E‑Stop NO อีกขา → GND','0V','','ground','conditional');

// 5) Four green buttons, NO contacts.
for(const [n,pin,name] of [[1,'J2.7','สูตร 1 (GPIO32)'],[2,'J2.8','สูตร 2 (GPIO33)'],[3,'J2.9','สูตร 3 (GPIO25)'],[4,'J2.10','ยืนยัน/ปล่อย (GPIO26)']]){
 add('buttons',`esp.${pin}`,`buttons.${n}-NO`,`ปุ่ม ${name} → GPIO`,'3.3V input','ใช้ขา NO · INPUT_PULLUP: ปล่อย = HIGH กด = LOW');
 add('buttons',G,`buttons.${n}-GND`,`ปุ่ม ${n} → GND`,'0V','ขา NO อีกด้าน','ground');
}

// 6) Load cell + HX711.
add('weight',V,'hx.VCC','3V3 → HX711 VCC','3.3V','ไม่ใช้ 5V เพื่อให้ DT เป็น 3.3V','power');
add('weight',G,'hx.GND','ESP32 GND → HX711 GND','0V','','ground');
add('weight','hx.DT','esp.J3.12','HX711 DT → GPIO16','3.3V','J3 pin 12');
add('weight','esp.J3.11','hx.SCK','GPIO17 → HX711 SCK','3.3V','J3 pin 11');
for(const [p,q,name] of [['E+','RED','แดง → E+'],['E-','BLK','ดำ → E−'],['A-','WHT','ขาว → A−'],['A+','GRN','เขียว → A+']])
 add('weight',`hx.${p}`,`cell.${q}`,`Load cell ${name}`,'bridge','สีสายต่างตามรุ่น ตรวจจากที่พิมพ์ข้างสาย ถ้าติดลบให้สลับ A+/A−','analog','conditional');

export function endpoint(ref){
 const dot=ref.indexOf('.');
 const b=boards.find(b=>b.id===ref.slice(0,dot));
 const p=[...(b?.left??[]),...(b?.right??[])].find(p=>p.id===ref.slice(dot+1));
 return b&&p?{board:b,pin:p,label:`${b.name} · ${b.id==='esp'?p.id+' / ':''}${p.name||p.label}`} : null;
}
export function connectionCSV(){
 const q=s=>'"'+String(s??'').replaceAll('"','""')+'"';
 return '\uFEFF'+[['Wire','Group','From','To','Voltage','Type','Status','Note'],...wires.map(w=>[w.id,w.group,endpoint(w.from).label,endpoint(w.to).label,w.voltage,w.type,w.status,w.note])].map(row=>row.map(q).join(',')).join('\r\n');
}
