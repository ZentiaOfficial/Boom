// Single source of truth: every 3D cable, table row and CSV export uses this netlist.
export const wiringSources = {
  hmi:['ESP3D · ESP32-2432S028R board reference','https://esp3d.io/esp3d-tft/version_1x/hardware/esp32/sunton-28-2432/'],
  esp:['Espressif · DevKitC V4 headers','https://documentation.espressif.com/esp-dev-kits/en/latest/esp32/esp32-devkitc/user_guide.html'],
  pca:['Adafruit · PCA9685 module pinouts','https://learn.adafruit.com/16-channel-pwm-servo-driver?view=all'],
  hx:['SparkFun · HX711','https://learn.sparkfun.com/tutorials/load-cell-amplifier-hx711-breakout-hookup-guide/all'],
  motor:['Cytron · MD10C Rev3 manual','https://docs.google.com/document/d/1rgQzn-nWn-qcWNnHjDZvIYqUrdCeBQQxXA-TU3BF0AQ/view'],
  servo:['TowerPro · MG996R','https://towerpro.com.tw/product/mg996R/'],
  safety:['Pilz · safety relay circuit example','https://www.pilz.com/download/open/PNOZ_X2_8P_Operat_Manual_1004082-EN-17.pdf'],
};
export const groups=[
 {id:'uart',name:'จอ HMI · UART',color:'#339ea6',desc:'จอ ESP32-2432S028R เป็น HMI แยกจาก ESP32 หลัก ใช้ UART 3.3V แบบไขว้ TX → RX'},
 {id:'servo',name:'Servo · PCA9685',color:'#c69238',desc:'ESP32 หลักคุยกับ PCA9685 ผ่าน I²C แล้วส่ง CH0–3 ไป Servo โดยตรง ไฟ Servo มาจากราง 5V-ACTUATOR'},
 {id:'weight',name:'Load Cell',color:'#9776b9',desc:'HX711 อ่านสะพาน Load Cell และส่ง DAT/CLK ให้ ESP32 หลัก แยกสายวัดออกจากสาย Motor'},
 {id:'motor',name:'Motor DC',color:'#d27655',desc:'MD10C รับ PWM + DIR ระดับ 3.3V และขับ Motor 12V ผ่าน OUTA/OUTB'},
 {id:'buttons',name:'ปุ่มกด',color:'#6d9560',desc:'ปุ่มสูตร/เริ่ม/ปล่อยเป็น NO ต่อ GPIO ลง GND ใช้ INPUT_PULLUP และ debounce'},
 {id:'power',name:'ระบบไฟ DC',color:'#bc5952',desc:'5V-CONTROL ไม่ถูกตัดเมื่อกด E-Stop ส่วน 12V Motor และ 5V-ACTUATOR ถูกตัดด้วย K1'},
 {id:'safety',name:'E‑Stop + K1',color:'#bc526d',desc:'E-Stop สองช่องเข้า Safety relay; K1 ตัดกำลัง Motor/Servo และ AUX แยกส่ง feedback เข้า GPIO34'},
];
const j2=['3V3','EN','VP','VN','IO34','IO35','IO32','IO33','IO25','IO26','IO27','IO14','IO12','GND','IO13','D2','D3','CMD','5V'];
const j3=['GND','IO23','IO22','TX','RX','IO21','GND','IO19','IO18','IO5','IO17','IO16','IO4','IO0','IO2','IO15','D1','D0','CLK'];
const pins=(names)=>names.map(name=>({id:name,label:name}));
const board=(id,name,model,x,y,w,h,left,right,notes,source,kind='pcb')=>({id,name,model,x,y,w,h,left:pins(left),right:pins(right),notes,source,kind});
export const boards=[
 board('esp','ESP32 MAIN','DevKitC V4 · WROOM-32E · 38 pins',0,1.4,3.2,6.9,[],[],'ตัวควบคุมเครื่องหลัก มองด้านชิ้นส่วนโดย USB อยู่ล่าง ใช้ Terminal Base แบบ 38 ขาที่ตรงรุ่น จ่าย 5V-CONTROL ทางขา 5V และ GND','esp','esp'),
 board('hmi','ESP32 TOUCH HMI','ESP32-2432S028R · 2.8 inch',-8.9,6.6,3.4,2.2,['VIN-5V','GND'],['IO22-TX','IO27-RX'],'จอมี ESP32 ในตัว ใช้ GPIO22/27 เป็น UART ที่กำหนดในโปรแกรม ขาจริงอยู่คนละ header ตามรุ่น ยืนยันรหัสบอร์ดด้านหลังก่อนต่อ','hmi','hmi'),
 board('pca','PCA9685 MODULE','16-channel PWM · address 0x40',5.0,6.2,3.0,2.8,['VCC','GND','SDA','SCL','OE'],['CH0-SIG','CH1-SIG','CH2-SIG','CH3-SIG'],'ใช้โมดูลสำเร็จรูป VCC=3.3V เพื่อให้ I²C pull-up ไม่เกิน GPIO; สัญญาณ CH0–3 ไป Servo โดยตรง รางกำลัง Servo แยกที่ terminal','pca'),
 ...['N','P','K','OUT'].map((name,i)=>board('servo'+i,'MG996R · '+name,'Servo '+(i+1),12.3,7.0-i*2.15,2.5,1.45,['SIG','V+','GND'],[],'SIG มักเป็นสีส้มหรือเหลือง, V+ แดง, GND น้ำตาลหรือดำ แต่ต้องตรวจสายจริง ใช้ 5V-ACTUATOR และคาลิเบรตมุมแยกแต่ละตัว','servo','servo')),
 board('hx','HX711','SparkFun SEN-13879',-5.1,1.7,2.7,2.9,['VCC','VDD','GND','DAT','CLK'],['E+','E-','A+','A-'],'ตารางนี้อ้างรุ่นที่มี VCC 5V และ VDD logic 3.3V แยก หากใช้โมดูลจีนขาไม่เหมือนกันต้องอ่านวงจรก่อน','hx'),
 board('cell','LOAD CELL','4-wire bridge',-9.1,1.5,2.8,2.2,[],['EXC+','EXC-','SIG+','SIG-'],'ต่อจากหน้าที่ EXC+/EXC-/SIG+/SIG- ตาม datasheet ของ Load Cell จริง ห้ามเดาจากสีสาย','hx','cell'),
 board('driver','CYTRON MD10C R3','PWM + DIR · Motor 12V',4.9,.4,3.1,3.1,['1:GND','2:PWM','3:DIR'],['1:VM+','2:VM-','3:OUTA','4:OUTB'],'รับ logic 3.3V ได้ ใช้ sign-magnitude PWM ต้องเทียบพิกัดกับกระแส stall มอเตอร์และติดฟิวส์ที่เหมาะสม','motor'),
 board('motor','DC GEAR MOTOR','12V brushed · 2-wire',9.3,.2,2.7,2.1,['A','B'],[],'ต่อสองสายจาก OUTA/OUTB ของ MD10C ทิศหมุนขึ้นกับ DIR และการสลับสาย รุ่นจริงยังต้องเลือกจากแรงบิด','motor','motor'),
 board('buttons','5 × NO BUTTONS','สูตร 1/2/3 · START · RELEASE',-5.1,-2.4,3.2,2.8,['N-NO','P-NO','K-NO','START-NO','OUT-NO'],['N-COM','P-COM','K-COM','START-COM','OUT-COM'],'หน้าสัมผัส NO แยกจากไฟ LED ของปุ่ม ตั้ง INPUT_PULLUP: ปล่อย=HIGH กด=LOW',null,'buttons'),
 board('estop','E‑STOP','2NC safety + isolated AUX-NC',-9.2,-3.8,3.2,3.0,['CH1-A','CH1-B','CH2-A','CH2-B'],['AUX-A','AUX-B'],'เลือกหัวเห็ดล็อกค้างที่มี 2NC สำหรับ Safety relay และหน้าสัมผัส AUX-NC แยกสำหรับ GPIO ห้ามนำแรงดัน safety เข้าบอร์ด','safety','stop'),
 board('rstop','R1 · 10 kΩ','GPIO34 external pull-up',-5.1,-5.2,2.4,1.2,['3V3'],['SENSE'],'GPIO34 ไม่มี pull-up ภายใน: R1 ดึงขึ้น 3.3V แล้ว AUX-NC ดึงลง GND ตอนปกติ',null,'resistor'),
 board('rseries','R2 · 1 kΩ','GPIO34 series protection',-8.0,-5.7,2.4,1.2,['IN'],['OUT'],'ต่ออนุกรมระหว่าง GPIO34 กับ AUX-NC เพื่อจำกัดกระแสจากความผิดพลาดเล็กน้อย ไม่ใช่อุปกรณ์ safety',null,'resistor'),
 board('psu','POWER SUPPLY','12V DC output',-9.2,-8.0,3.4,2.0,[],['+12V','0V'],'แสดงเฉพาะฝั่ง DC งาน AC/PE/ฟิวส์เมน/ฝาครอบขั้วไฟต้องให้ผู้มีความชำนาญออกแบบและตรวจ',null,'power'),
 board('safe','SAFETY RELAY','dual-channel · exact model pending',-4.6,-8.0,3.4,2.8,['SUPPLY+','SUPPLY-','CH1-OUT','CH1-RETURN','CH2-OUT','CH2-RETURN','RESET-IN'],['K1-COIL+','EDM-OUT','EDM-RETURN'],'ชื่อขาเป็นหน้าที่ของวงจร ไม่ใช่หมายเลข terminal ของสินค้าจริง ต้องเลือกแรงดันและรุ่นก่อนแปลงเป็นเลขขาต่อ','safety','boundary'),
 board('reset','MANUAL RESET','NO pushbutton',-.9,-8.1,2.3,1.5,['NO'],['COM'],'ปุ่ม Reset แยก ต่อกับ Safety relay ตามคู่มือรุ่นจริง การปล่อย E-Stop ต้องไม่ทำให้เครื่องเริ่มเอง',null,'buttons'),
 board('k1','K1 CONTACTOR','DC-rated main contact + AUX-NC',2.7,-8.0,3.2,2.8,['COIL+','COIL-','MAIN-IN+','EDM-NC-A'],['MAIN-OUT+','EDM-NC-B'],'คอนแทคเตอร์ตัดไฟบวก 12V ของ Motor/Servo เลือกพิกัด DC, coil, contact และ auxiliary feedback ให้ตรง Safety relay กับโหลดจริง','safety','boundary'),
 board('buckC','DC–DC · CONTROL','12V → 5V regulated',.3,-5.1,3.0,1.8,['IN+','IN-'],['OUT+','OUT-'],'เลี้ยง ESP32 MAIN, ESP32 HMI และ HX711 ตลอดเวลาที่ PSU เปิด ต้องคงไฟเมื่อกด E-Stop',null,'buck'),
 board('buckA','DC–DC · ACTUATOR','12V switched → 5V high-current',6.1,-5.2,3.4,1.8,['IN+','IN-'],['OUT+','OUT-'],'รับ 12V หลัง K1 แล้วจ่าย Servo 4 ตัว เลือกกระแสจาก stall รวมและการระบายความร้อน',null,'buck'),
 board('busC','TB-C · 5V CONTROL','terminal distribution',.3,-9.2,2.8,1.3,['IN'],['OUT'],'ราง 5V-CONTROL ใช้ terminal jumper ที่รองรับกระแส แยกจากราง Servo',null,'bus'),
 board('busA','TB-A · 5V ACTUATOR','terminal + branch fuses',6.2,-8.8,3.2,1.3,['IN'],['OUT'],'แบ่งไฟแต่ละ Servo ผ่านฟิวส์สาขา ขนาดสายและฟิวส์ต้องคำนวณจากของจริง',null,'bus'),
 board('ground','TB-G · DC 0V','star return / common reference',10.1,-5.6,3.1,1.4,['IN'],['OUT'],'รวม 0V ที่ terminal โดยแยกทางกลับ Motor/Servo จาก sensor แล้วมารวมที่จุดนี้ ไม่ใช้ GND ESP32 เป็นทางกระแสกำลัง',null,'bus'),
 board('rpwm','R3 · 10 kΩ','MD10C PWM pull-down',4.8,-2.7,2.4,1.1,['PWM'],['GND'],'ดึง PWM ลง GND ตอนบูต ไม่ใช่วงจรหยุดฉุกเฉิน',null,'resistor'),
];
boards[0].left=j2.map((name,i)=>({id:`J2.${i+1}`,label:`${i+1} ${name}`,name}));
boards[0].right=j3.map((name,i)=>({id:`J3.${i+1}`,label:`${i+1} ${name}`,name}));

export const wires=[];
function add(group,from,to,label,voltage,note='',type='signal',status='reference'){
 const number=wires.length+1;
 wires.push({id:`W${String(number).padStart(3,'0')}`,group,from,to,label,voltage,note,type,status});
}
const G='ground.OUT',C='busC.OUT',A='busA.OUT',V='esp.J2.1';

// HMI UART: cross TX to RX. HMI ground is supplied in the power group.
add('uart','hmi.IO22-TX','esp.J3.12','HMI TX → MAIN RX2','3.3V UART','กำหนด GPIO22 ของ HMI เป็น TX และ GPIO16 / J3 pin 12 ของบอร์ดหลักเป็น RX2');
add('uart','esp.J3.11','hmi.IO27-RX','MAIN TX2 → HMI RX','3.3V UART','GPIO17 / J3 pin 11 ของบอร์ดหลักส่งไป GPIO27 ของ HMI');

// PCA9685 and four ready-wired Servo channels.
add('servo','esp.J3.6','pca.SDA','GPIO21 → PCA9685 SDA','3.3V I²C','J3 pin 6');
add('servo','esp.J3.3','pca.SCL','GPIO22 → PCA9685 SCL','3.3V I²C','J3 pin 3');
add('servo',V,'pca.VCC','3.3V → PCA9685 VCC','3.3V','VCC เป็นไฟ logic ไม่ใช่ไฟ Servo','power');
add('servo',G,'pca.GND','PCA9685 GND','0V','','ground');
add('servo','esp.J2.11','pca.OE','GPIO27 → PCA9685 OE','3.3V','HIGH ปิด output ด้วยโปรแกรม แต่ไม่ใช้แทน Safety relay');
for(let i=0;i<4;i++){
 add('servo',`pca.CH${i}-SIG`,`servo${i}.SIG`,`CH${i} → Servo ${i+1} signal`,'3.3V PWM','สัญญาณจากโมดูล PCA9685 โดยตรง เริ่มที่ประมาณ 50Hz และคาลิเบรต pulse');
 add('servo',A,`servo${i}.V+`,`5V-A → Servo ${i+1}`,'5V-ACTUATOR','สาขา terminal/fuse แยก ไม่ผ่านขา V+ ของ ESP32','power','conditional');
 add('servo',G,`servo${i}.GND`,`Servo ${i+1} return`,'0V','เดินกลับ terminal กำลัง','ground');
}

// Load cell and HX711.
add('weight','hx.DAT','esp.J2.7','HX711 DAT → GPIO32','3.3V','GPIO32 / J2 pin 7');
add('weight','esp.J2.8','hx.CLK','GPIO33 → HX711 CLK','3.3V','GPIO33 / J2 pin 8');
add('weight',C,'hx.VCC','5V-C → HX711 VCC','5V-CONTROL','อ้างรุ่น SparkFun ที่มี VDD แยก','power');
add('weight',V,'hx.VDD','3.3V → HX711 VDD','3.3V','','power');
add('weight',G,'hx.GND','HX711 GND','0V','','ground');
for(const [p,q,name] of [['E+','EXC+','Excitation +'],['E-','EXC-','Excitation −'],['A+','SIG+','Signal +'],['A-','SIG-','Signal −']])
 add('weight',`hx.${p}`,`cell.${q}`,name,'bridge','ตรวจหน้าที่สายจาก datasheet ของ Load Cell จริง ไม่เดาจากสี','analog','conditional');

// Motor driver.
add('motor','esp.J2.9','driver.2:PWM','GPIO25 → MD10C PWM','3.3V PWM','J2 pin 9; ตั้ง PWM=0 ก่อน enable');
add('motor','esp.J2.10','driver.3:DIR','GPIO26 → MD10C DIR','3.3V','J2 pin 10; หยุดก่อนกลับทิศ');
add('motor',G,'driver.1:GND','MD10C signal GND','0V','','ground');
add('motor','driver.3:OUTA','motor.A','OUTA → Motor A','0–12V switched','power terminal pin 3','power','conditional');
add('motor','driver.4:OUTB','motor.B','OUTB → Motor B','0–12V switched','power terminal pin 4','power','conditional');
add('motor','driver.2:PWM','rpwm.PWM','PWM → R3 pull-down','3.3V');
add('motor',G,'rpwm.GND','R3 → GND','0V','','ground');

// Five physical operator buttons.
for(const [key,pin,name] of [['N','J2.15','สูตร 1'],['P','J2.12','สูตร 2'],['K','J3.9','สูตร 3'],['START','J3.8','เริ่ม'],['OUT','J3.2','ปล่อย']]){
 add('buttons',`esp.${pin}`,`buttons.${key}-NO`,`ปุ่ม${name} → GPIO`,'3.3V input','INPUT_PULLUP: ปล่อย=HIGH กด=LOW');
 add('buttons',G,`buttons.${key}-COM`,`COM ปุ่ม${name}`,'0V','','ground');
}

// DC power: control stays alive, actuator path is downstream of K1.
add('power','psu.+12V','buckC.IN+','12V → CONTROL converter','12V','ผ่านฟิวส์สาขาที่เลือกจากโหลดและสายจริง','power','conditional');
add('power','psu.0V','ground.IN','PSU 0V → ground terminal','0V','','ground');
add('power',G,'buckC.IN-','CONTROL converter input return','0V','','ground');
add('power','buckC.OUT+','busC.IN','5V-CONTROL → TB-C','5V-CONTROL','วัดให้ได้ 5V ก่อนเสียบบอร์ด','power','conditional');
add('power','buckC.OUT-','ground.OUT','CONTROL converter output return','0V','','ground','conditional');
add('power',C,'esp.J2.19','5V-C → ESP32 MAIN','5V-CONTROL','J2 pin 19; ห้ามจ่าย USB และไฟ header พร้อมกันโดยไม่มีวงจรป้องกัน','power');
add('power',G,'esp.J2.14','ESP32 MAIN GND','0V','','ground');
add('power',C,'hmi.VIN-5V','5V-C → ESP32 HMI VIN','5V-CONTROL','ห้ามป้อน 12V เข้าจอ','power');
add('power',G,'hmi.GND','ESP32 HMI GND','0V','ทำให้ UART มีกราวด์อ้างอิงร่วม','ground');
add('power',G,'buckA.IN-','ACTUATOR converter input return','0V','','ground');
add('power','buckA.OUT+','busA.IN','5V-ACTUATOR → TB-A','5V-ACTUATOR','เผื่อกระแส Servo stall รวม','power','conditional');
add('power','buckA.OUT-','ground.OUT','ACTUATOR converter output return','0V','','ground','conditional');
add('power',G,'driver.2:VM-','MD10C VM− → ground terminal','0V','','ground');

// Independent stop architecture. Exact safety terminal numbers remain model-dependent.
add('safety','psu.+12V','safe.SUPPLY+','12V → safety supply','12V / model-dependent','เลือก Safety relay ที่แรงดันตรงระบบ หรือออกแบบ safety supply ตามคู่มือ','power','unresolved');
add('safety',G,'safe.SUPPLY-','Safety supply return','0V / model-dependent','หมายเลขและวงจรจริงขึ้นกับรุ่น','ground','unresolved');
add('safety','safe.CH1-OUT','estop.CH1-A','Safety channel 1 → E‑Stop NC1','model-dependent','หน้าที่วงจรเท่านั้น รอเลข terminal จากรุ่นที่เลือก','safety','unresolved');
add('safety','estop.CH1-B','safe.CH1-RETURN','E‑Stop NC1 → channel 1 return','model-dependent','','safety','unresolved');
add('safety','safe.CH2-OUT','estop.CH2-A','Safety channel 2 → E‑Stop NC2','model-dependent','','safety','unresolved');
add('safety','estop.CH2-B','safe.CH2-RETURN','E‑Stop NC2 → channel 2 return','model-dependent','','safety','unresolved');
add('safety','safe.RESET-IN','reset.NO','Safety reset input → NO button','model-dependent','ต้องใช้ manual monitored reset หากคู่มือกำหนด','safety','unresolved');
add('safety','reset.COM','safe.EDM-RETURN','Reset return → safety relay','model-dependent','เส้นนี้เป็นหน้าที่ตัวอย่าง ต้องจัดตามคู่มือรุ่นจริง','safety','unresolved');
add('safety','safe.K1-COIL+','k1.COIL+','Safety output → K1 coil','model-dependent','แรงดัน coil ต้องตรงกับ output/supply ของ Safety relay','safety','unresolved');
add('safety','k1.COIL-','safe.SUPPLY-','K1 coil return','model-dependent','','ground','unresolved');
add('safety','safe.EDM-OUT','k1.EDM-NC-A','EDM → K1 auxiliary NC','model-dependent','ตรวจว่า K1 ปลดจริงก่อนอนุญาต Reset','safety','unresolved');
add('safety','k1.EDM-NC-B','safe.EDM-RETURN','K1 AUX-NC → EDM return','model-dependent','','safety','unresolved');
add('safety','psu.+12V','k1.MAIN-IN+','12V → K1 main contact','12V','ขั้วกำลังต้องเป็น DC-rated และมีฟิวส์ตามแบบจริง','power','conditional');
add('safety','k1.MAIN-OUT+','driver.1:VM+','K1 switched 12V → MD10C','12V switched','กด E-Stop แล้วเส้นนี้ดับ','power','conditional');
add('safety','k1.MAIN-OUT+','buckA.IN+','K1 switched 12V → Servo converter','12V switched','กด E-Stop แล้ว 5V-ACTUATOR ดับ','power','conditional');
add('safety',V,'rstop.3V3','3.3V → R1 10k','3.3V','external pull-up สำหรับ GPIO34');
add('safety','rstop.SENSE','esp.J2.5','R1 sense → GPIO34','3.3V input','J2 pin 5; GPIO34 เป็น input-only และไม่มี internal pull-up');
add('safety','esp.J2.5','rseries.IN','GPIO34 → R2 1k','3.3V input','R2 ต่ออนุกรมก่อน dry contact');
add('safety','rseries.OUT','estop.AUX-A','R2 → E‑Stop AUX-NC','3.3V input','AUX ต้องแยกทางไฟฟ้าจากสอง safety channel');
add('safety',G,'estop.AUX-B','E‑Stop AUX return → GND','0V','ปกติ=LOW; กดหรือสายขาด=HIGH; feedback เท่านั้น','ground');

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
