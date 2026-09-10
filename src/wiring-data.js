// Single source of truth: every 3D cable, table row and export uses this netlist.
export const wiringSources = {
 esp:['Espressif · DevKitC V4 headers','https://documentation.espressif.com/esp-dev-kits/en/latest/esp32/esp32-devkitc/user_guide.html'],
 pca:['Adafruit · PCA9685 pinouts','https://learn.adafruit.com/16-channel-pwm-servo-driver?view=all'],
 hx:['SparkFun · HX711','https://learn.sparkfun.com/tutorials/load-cell-amplifier-hx711-breakout-hookup-guide/all'],
 shift:['SparkFun · BOB-12009','https://www.sparkfun.com/sparkfun-logic-level-converter-bi-directional.html'],
 buffer:['TI · SN74AHCT125','https://www.ti.com/lit/ds/symlink/sn74ahct125.pdf'],
 motor:['Cytron · MD10C Rev3 manual','https://docs.google.com/document/d/1rgQzn-nWn-qcWNnHjDZvIYqUrdCeBQQxXA-TU3BF0AQ/view'],
 servo:['TowerPro · MG996R','https://towerpro.com.tw/product/mg996R/'],
};
export const groups=[
 {id:'i2c',name:'จอ + I²C',color:'#339ea6',desc:'SDA / SCL ร่วมบัส 100 kHz · แปลงระดับเฉพาะจอ 5V'},
 {id:'servo',name:'Servo 4 ตัว',color:'#c69238',desc:'PCA9685 CH0–3 → AHCT125 → สัญญาณ Servo · ไฟกำลังแยก'},
 {id:'weight',name:'Load Cell',color:'#9776b9',desc:'HX711: VCC 5V / VDD 3.3V · แยกสายวัดจากสายมอเตอร์'},
 {id:'motor',name:'Motor DC',color:'#d27655',desc:'MD10C: PWM + DIR · จ่ายกำลัง 12V จากแหล่งจ่าย'},
 {id:'buttons',name:'ปุ่มกด',color:'#6d9560',desc:'5 ปุ่ม NO ต่อ GPIO ลง GND · เปิด internal pull-up และ debounce'},
 {id:'power',name:'ระบบไฟ DC',color:'#bc5952',desc:'12V → 5V-CONTROL / 5V-ACTUATOR แยกสาขา · GND ร่วม'},
 {id:'safety',name:'E-Stop',color:'#bc526d',desc:'แยกวงจรตัดกำลังจริงออกจากหน้าสัมผัส feedback ไป GPIO34'},
];
const j2=['3V3','EN','VP','VN','IO34','IO35','IO32','IO33','IO25','IO26','IO27','IO14','IO12','GND','IO13','D2','D3','CMD','5V'];
const j3=['GND','IO23','IO22','TX','RX','IO21','GND','IO19','IO18','IO5','IO17','IO16','IO4','IO0','IO2','IO15','D1','D0','CLK'];
const pins=(names)=>names.map(name=>({id:name,label:name}));
const board=(id,name,model,x,y,w,h,left,right,notes,source,kind='pcb')=>({id,name,model,x,y,w,h,left:pins(left),right:pins(right),notes,source,kind});
export const boards=[
 board('esp','ESP32-DevKitC V4','WROOM-32E · 38 pins',0,1.2,3.2,6.9,[],[], 'บอร์ดหลัก 1 ตัว · มองจากด้านชิ้นส่วน เสาอากาศด้านบน USB ด้านล่าง หัว J2 ซ้าย / J3 ขวา ใช้ไฟ 5V+GND หรือ USB อย่างใดอย่างหนึ่ง ห้ามต่อสองแหล่งพร้อมกัน','esp','esp'),
 board('lcd','LCD 2004 + PCF8574','20 × 4 · non-touch',-9.1,6,3.2,2.0,['VCC','GND','SDA','SCL'],[], 'ซื้อจอพร้อม backpack ที่ประกอบแล้ว ใช้ 5V; I²C ต้องผ่าน BSS138 ที่ตั้งด้าน LV=3.3V / HV=5V สแกน address จริง ไม่สมมติ 0x27 เสมอ',null,'lcd'),
 board('shift','BSS138 level shifter','SparkFun BOB-12009',-5,5.6,2.6,2.5,['LV','GND-L','LV1','LV2'],['HV','GND-H','HV1','HV2'],'LV1↔HV1 ใช้ SDA; LV2↔HV2 ใช้ SCL เส้นภายในชิปไม่ต้องเดินสายเพิ่ม ช่อง 3/4 ไม่ใช้; GND ทั้งสองฝั่งเชื่อมกันบนบอร์ด','shift'),
 board('pca','PCA9685','Adafruit #815 · 0x40',4.5,5.7,2.8,2.8,['VCC','GND','SDA','SCL','OE'],['CH0','CH1','CH2','CH3','V+'],'VCC=3.3V เพื่อให้ I²C pull-up อยู่ที่ 3.3V ใช้เฉพาะขา PWM ของ CH0–3; V+ ปล่อยว่าง เพราะจ่าย Servo ผ่าน terminal โดยตรง OE เป็น software enable ไม่ใช่ safety relay','pca'),
 board('buffer','SN74AHCT125N','DIP-14 · signal buffer',8.6,5.5,2.6,3.1,['1:1OE','2:1A','3:1Y','4:2OE','5:2A','6:2Y','7:GND'],['14:VCC','13:4OE','12:4A','11:4Y','10:3OE','9:3A','8:3Y'],'แปลง PWM 3.3V เป็น 5V ด้วย AHCT (ห้ามแทนด้วย HC โดยไม่ตรวจ threshold) OE ทั้ง 4 ต่อลง GND, ใส่ 100nF ชิดขา 14/7 ใช้ไฟจาก 5V-ACTUATOR ร่วม Servo และบังคับ PWM low ก่อนตัดไฟเพื่อเลี่ยง back-power','buffer','ic'),
 ...['N','P','K','OUT'].map((name,i)=>board('servo'+i,'MG996R · '+name,'Servo '+(i+1),12.6,6.8-i*2.15,2.5,1.45,['SIG','V+','GND'],[],'SIG มักส้ม/เหลือง, V+ มักแดง, GND มักน้ำตาล/ดำ แต่ต้องตรวจรุ่นจริง ใช้ 5V-ACTUATOR ที่รองรับกระแส stall รวม เริ่ม PWM ประมาณ 50Hz และคาลิเบรตมุมเปิด/ปิดแยกแต่ละตัว','servo','servo')),
 board('hx','HX711','SparkFun SEN-13879',-5.0,1.8,2.6,2.9,['VCC','VDD','GND','DAT','CLK'],['E+','E-','A+','A-'],'ระบุรุ่น SparkFun ที่แยก VCC กับ VDD: VCC=5V-CONTROL, VDD=3.3V ถ้าใช้บอร์ดจีนที่มีแค่ VCC ต้องตรวจวงจรใหม่ ห้ามใช้ตารางนี้ข้ามรุ่นโดยตรง','hx'),
 board('cell','Load Cell','4-wire bridge',-9.1,1.5,2.8,2.2,[],['EXC+','EXC-','SIG+','SIG-'],'ต่อจากหน้าที่สาย EXC+/EXC−/SIG+/SIG− ตามใบข้อมูล ไม่เดาจากสี รองรับถังผ่าน Load Cell เท่านั้น ทำ tare และคาลิเบรตด้วยตุ้มน้ำหนักจริง','hx','cell'),
 board('driver','Cytron MD10C R3','PWM + DIR · 12V',4.8,.5,3.1,3.1,['1:GND','2:PWM','3:DIR'],['1:VM+','2:VM-','3:OUTA','4:OUTB'],'เลข 1–3 ฝั่งซ้ายคือหัวสัญญาณ; เลข 1–4 ฝั่งขวาคือ power/motor terminals ในคู่มือ ใช้ sign-magnitude PWM ไม่เกิน 20kHz; ต้องตรวจ stall/ความร้อน/ฟิวส์ ไม่มี reverse-polarity protection','motor'),
 board('motor','DC gear motor','12V brushed · 2-wire',9.3,.2,2.6,2.1,['A','B'],[],'สายมอเตอร์ต่อ OUTA/OUTB เท่านั้น ไม่ต่อขั้วหนึ่งลง GND โดยตรง ทิศหมุนขึ้นกับการต่อสายและ DIR มอเตอร์จริงยังไม่ระบุรุ่น','motor','motor'),
 board('buttons','5 × NO pushbuttons','สูตร 1 / 2 / 3 · เริ่ม · ปล่อย',-5,-2.4,3.1,2.8,['N-NO','P-NO','K-NO','START-NO','OUT-NO'],['N-COM','P-COM','K-COM','START-COM','OUT-COM'],'ปุ่ม momentary หน้าสัมผัส NO แยกจากขาไฟ LED หากเป็นปุ่มมีไฟ ไม่ต้องจ่าย 5V เข้า GPIO; ตั้ง INPUT_PULLUP กดแล้วอ่าน LOW และ debounce ด้วยโปรแกรม',null,'buttons'),
 board('estop','E-STOP','NC safety + isolated NC AUX',-9,-3.6,3,2.5,['NC-A','NC-B'],['AUX-A','AUX-B'],'NC-A/B คือชื่อเชิงหน้าที่ของหน้าสัมผัส safety ไม่ใช่เลขขาของสินค้ารุ่นใด AUX ต้องเป็นหน้าสัมผัสแห้งแยกวงจรสำหรับ feedback; วงจร safety/จำนวนช่องต้องเลือกตามการประเมินเครื่องจริง',null,'stop'),
 board('rstop','R1 · 10 kΩ','external pull-up',-4.7,-5,2.3,1.2,['3V3'],['SENSE'],'ตัวต้านทาน 10kΩ จาก 3.3V ไป GPIO34; ไม่กด E-Stop หน้าสัมผัส AUX-NC ดึง LOW เมื่อกด/สายขาดอ่าน HIGH','esp','resistor'),
 board('psu','Power Supply','12V DC output',-8.7,-7.5,3.4,2.0,[],['+12V','0V'],'แสดงเฉพาะฝั่ง DC หลังแหล่งจ่ายปิดครอบ งาน AC / PE / ขนาด PSU ต้องออกแบบตามโหลดจริงและให้ช่างตรวจ ไม่แสดงการเดินไฟบ้านในฉากนี้',null,'power'),
 board('safe','SAFETY INTERFACE','ต้องระบุอุปกรณ์จริงก่อนต่อ',-3.8,-7.8,3.3,2.4,['IN12','LOOP-A','LOOP-B'],['OUT12'],'กรอบขอบเขตงานออกแบบ: safety relay + contactor ที่เหมาะกับ DC และกระแส/การหยุดของเครื่อง จุดต่อ LOOP/IN/OUT เป็นชื่อหน้าที่ ไม่ใช่ pinout สำหรับซื้อ/ต่อทันที ยังไม่ได้กำหนด coil, reset, feedback, stop category หรือวงจร dual-channel',null,'boundary'),
 board('buckC','DC–DC · CONTROL','12V → 5V regulated',.5,-5.7,3,1.8,['IN+','IN-'],['OUT+','OUT-'],'ราง 5V-CONTROL เลี้ยง ESP32 / LCD / HX711 / level shifter ตรวจแรงดันด้วยมิเตอร์ก่อนเสียบและเลือกกระแสตามโหลด บอร์ด DC–DC รุ่นจริงยังไม่ระบุ',null,'buck'),
 board('buckA','DC–DC · ACTUATOR','12V → 5V high-current',4.8,-5.7,3.2,1.8,['IN+','IN-'],['OUT+','OUT-'],'ราง 5V-ACTUATOR แยกสำหรับ Servo 4 ตัวและ AHCT125 เลือกจากกระแส stall รวม/การระบายความร้อน ไม่สมมติว่าโมดูล LM2596 เล็กตัวเดียวพอ',null,'buck'),
 board('busC','TB-C · 5V CONTROL','terminal distribution',.5,-8.5,2.8,1.35,['IN'],['OUT'],'terminal หลายช่องเชื่อมถึงกันสำหรับ 5V-CONTROL; ช่อง OUT ในฉากแทนกลุ่มขั้วที่ใช้ jumper bridge และรองรับกระแส',null,'bus'),
 board('busA','TB-A · 5V ACTUATOR','terminal + branch fuses',5,-8.5,3.2,1.35,['IN'],['OUT'],'แบ่งขั้วจ่ายแยกแต่ละ Servo พร้อมฟิวส์สาขาที่เลือกจากสายและโหลดจริง เลขพิกัดฟิวส์/ขนาดสายต้องคำนวณภายหลัง ไม่รวมรางนี้กับ 5V-CONTROL',null,'bus'),
 board('ground','TB-G · DC 0V','common reference / star return',9.7,-5.6,3.1,1.4,['IN'],['OUT'],'จุดรวมกราวด์ DC เดินทางกลับมอเตอร์/Servo แยกจากสายเซ็นเซอร์แล้วมารวมที่ terminal; ไม่ใช้ขา GND ของ ESP32 เป็นทางไหลกระแสกำลัง',null,'bus'),
 board('decap','C1 · 100 nF','ceramic · near IC',8.6,2.75,2.1,.95,['1'],['2'],'ต่อคร่อม VCC กับ GND ของ AHCT125 ให้ชิดตัว IC; เป็น capacitor ไม่มีขั้ว','buffer','capacitor'),
 board('rpwm','R2 · 10 kΩ','PWM pull-down',4.6,-2.55,2.3,1.1,['PWM'],['GND'],'ดึง PWM ของ MD10C ลง GND เมื่อ GPIO ลอย; ไม่ใช่วงจรหยุดฉุกเฉิน และไม่รับประกันป้องกันทุก failure mode','motor','resistor'),
];
boards[0].left=j2.map((name,i)=>({id:`J2.${i+1}`,label:`${i+1} ${name}`,name}));
boards[0].right=j3.map((name,i)=>({id:`J3.${i+1}`,label:`${i+1} ${name}`,name}));
export const wires=[];
function add(group,from,to,label,voltage,note='',type='signal',status='reference'){
 const number=wires.length+1;wires.push({id:`W${String(number).padStart(3,'0')}`,group,from,to,label,voltage,note,type,status});
}
const G='ground.OUT',C='busC.OUT',A='busA.OUT',V='esp.J2.1';
add('i2c','esp.J3.6','pca.SDA','SDA → PCA9685','3.3V','GPIO21 / J3 pin 6 ใช้บัส I²C ร่วมกับขา LV1 ของตัวแปลงระดับ');
add('i2c','esp.J3.3','pca.SCL','SCL → PCA9685','3.3V','GPIO22 / J3 pin 3 เริ่มต้น I²C 100 kHz และตรวจ pull-up รวมบนบัส');
add('i2c','esp.J3.6','shift.LV1','SDA → ฝั่ง 3.3V','3.3V');
add('i2c','esp.J3.3','shift.LV2','SCL → ฝั่ง 3.3V','3.3V');
add('i2c','shift.HV1','lcd.SDA','SDA → จอ 5V','5V','แปลงผ่าน channel 1 ภายใน BSS138 ห้ามเชื่อม HV1 ตรง GPIO21');
add('i2c','shift.HV2','lcd.SCL','SCL → จอ 5V','5V','แปลงผ่าน channel 2 ภายใน BSS138');
add('i2c',V,'shift.LV','ไฟอ้างอิง low side','3.3V','','power');
add('i2c',C,'shift.HV','ไฟอ้างอิง high side','5V-CONTROL','','power');
add('i2c',G,'shift.GND-L','กราวด์ level shifter','0V','','ground');
add('i2c',C,'lcd.VCC','ไฟเลี้ยงจอ','5V-CONTROL','','power');
add('i2c',G,'lcd.GND','กราวด์จอ','0V','','ground');
add('servo',V,'pca.VCC','ไฟ logic ของ PCA9685','3.3V','ห้ามเชื่อม VCC เข้ารางไฟ Servo','power');
add('servo',G,'pca.GND','กราวด์ PCA9685','0V','','ground');
add('servo','esp.J2.11','pca.OE','ปิด/เปิด PWM ด้วยโปรแกรม','3.3V','GPIO27: HIGH=disable, LOW=enable; บอร์ดมี default pull-down จึงไม่ใช้ขานี้รับรองความปลอดภัยตอน boot');
for(let i=0;i<4;i++){
 const input=['2:1A','5:2A','9:3A','12:4A'][i], output=['3:1Y','6:2Y','8:3Y','11:4Y'][i];
 add('servo',`pca.CH${i}`,`buffer.${input}`,`CH${i} → buffer ${i+1}`,'3.3V','ต่อเฉพาะแถว PWM ไม่ใช่แถว V+ ของ PCA9685');
 add('servo',`buffer.${output}`,`servo${i}.SIG`,`PWM → Servo ${i+1}`,'5V','ขา output ของ AHCT125 เป็นสัญญาณ ไม่ใช่ไฟกำลัง Servo');
 add('servo',A,`servo${i}.V+`,`ไฟ Servo ${i+1}`,'5V-ACTUATOR','แต่ละเส้นแทนสาขา terminal/fuse แยก; ต้องเลือกขนาดสายและฟิวส์จริง','power','conditional');
 add('servo',G,`servo${i}.GND`,`กราวด์ Servo ${i+1}`,'0V','เดินกลับ terminal กำลัง ไม่ผ่านกราวด์บอร์ด ESP32','ground');
}
add('servo',A,'buffer.14:VCC','ไฟ AHCT125','5V-ACTUATOR','ใช้รางเดียวกับ Servo เพื่อให้ไฟหายพร้อมกัน; ไม่ใช้ไฟ 6V กับ IC นี้','power');
add('servo',G,'buffer.7:GND','กราวด์ AHCT125','0V','','ground');
for(const pin of ['1:1OE','4:2OE','10:3OE','13:4OE'])add('servo',G,`buffer.${pin}`,`Enable buffer · ${pin}`,'0V','OE active-low ต่อ GND; ทั้ง 4 ช่องใช้งาน ไม่ปล่อยอินพุตลอย','ground');
add('servo','buffer.14:VCC','decap.1','C1 → VCC pin 14','5V-ACTUATOR','100nF ชิด IC','power');
add('servo','buffer.7:GND','decap.2','C1 → GND pin 7','0V','','ground');
add('weight','hx.DAT','esp.J2.7','HX711 DAT → GPIO32','3.3V','GPIO32 / J2 pin 7 รับข้อมูลน้ำหนัก');
add('weight','esp.J2.8','hx.CLK','GPIO33 → HX711 CLK','3.3V','GPIO33 / J2 pin 8 ส่ง clock');
add('weight',C,'hx.VCC','ไฟ analog HX711','5V-CONTROL','เฉพาะ SparkFun SEN-13879 ที่มี VDD แยก','power');
add('weight',V,'hx.VDD','ไฟ logic HX711','3.3V','','power');
add('weight',G,'hx.GND','กราวด์ HX711','0V','','ground');
for(const [p,q,name] of [['E+','EXC+','Excitation +'],['E-','EXC-','Excitation −'],['A+','SIG+','Signal +'],['A-','SIG-','Signal −']])add('weight',`hx.${p}`,`cell.${q}`,name,'bridge','อ้างอิงหน้าที่สายตาม datasheet ของ Load Cell จริง สีไม่ใช่มาตรฐานตายตัว','analog','conditional');
add('motor','esp.J2.9','driver.2:PWM','GPIO25 → MD10C PWM','3.3V','หัว signal pin 2; ตั้ง PWM=0 ก่อนเปิดรอบ, sign-magnitude ไม่ใช่ pulse แบบ RC Servo');
add('motor','esp.J2.10','driver.3:DIR','GPIO26 → MD10C DIR','3.3V','หัว signal pin 3; กำหนด DIR ก่อน PWM; หยุดก่อนกลับทิศ');
add('motor',G,'driver.1:GND','MD10C signal ground','0V','หัว signal pin 1','ground');
add('motor','driver.3:OUTA','motor.A','OUT A → Motor A','0–12V switched','terminal มอเตอร์ pin 3 ตามคู่มือ ไม่ใช่ signal pin 3','power','conditional');
add('motor','driver.4:OUTB','motor.B','OUT B → Motor B','0–12V switched','terminal มอเตอร์ pin 4; ขั้วมอเตอร์ทั้งสองออกจาก H-bridge','power','conditional');
add('motor','driver.2:PWM','rpwm.PWM','PWM → pull-down','3.3V');
add('motor',G,'rpwm.GND','R2 → GND','0V','','ground');
for(const [key,pin,name] of [['N','J2.15','สูตร 1'],['P','J2.12','สูตร 2'],['K','J3.9','สูตร 3'],['START','J3.8','เริ่ม'],['OUT','J3.2','ปล่อย']]){
 add('buttons',`esp.${pin}`,`buttons.${key}-NO`,`ปุ่ม${name} → GPIO`,'3.3V input','INPUT_PULLUP: ปล่อย=HIGH กด=LOW; ชื่อ NO/COM เป็นหน้าที่ของ contact');
 add('buttons',G,`buttons.${key}-COM`,`COM ปุ่ม${name}`,'0V','','ground');
}
add('power','psu.+12V','buckC.IN+','12V → converter CONTROL','12V','ผ่านฟิวส์สาขาที่เลือกจากโหลด/สายจริง','power','conditional');
add('power','psu.0V','ground.IN','แหล่งจ่าย → กราวด์รวม','0V','จุดอ้างอิง DC ไม่ใช่รายละเอียด PE/สายดินตู้','ground');
for(const b of ['buckC','buckA'])add('power',G,`${b}.IN-`,`${b} input return`,'0V','','ground');
add('power','buckC.OUT+','busC.IN','ราง 5V-CONTROL','5V-CONTROL','ตรวจค่า 5V ด้วยมิเตอร์ก่อนต่อบอร์ด','power','conditional');
add('power','buckA.OUT+','busA.IN','ราง 5V-ACTUATOR','5V-ACTUATOR','เผื่อกระแส Servo stall รวมและตกคร่อมสาย; ห้ามผูก OUT+ สอง converter เข้าหากัน','power','conditional');
for(const b of ['buckC','buckA'])add('power',`${b}.OUT-`,G,`${b} output return`,'0V','ต้องเป็น converter ที่อนุญาต common ground ตามคู่มือ','ground','conditional');
add('power',C,'esp.J2.19','5V → ESP32 header','5V-CONTROL','J2 pin 19; ห้ามใช้ USB จ่ายไฟพร้อมกัน ถอดไฟภายนอกก่อนใช้ USB หรือใช้อุปกรณ์แยกไฟที่ออกแบบเหมาะสม','power');
add('power',G,'esp.J2.14','ESP32 ground reference','0V','J2 pin 14; ไฟ Servo/Motor ไม่ไหลผ่านขานี้','ground');
add('power',G,'driver.2:VM-','MD10C power return','0V','power terminal pin 2 (คนละหัวกับ PWM pin 2)','ground');
add('safety','psu.+12V','safe.IN12','ไฟเข้าส่วนตัดกำลัง','12V','ชื่อเชิงหน้าที่ ต้องออกแบบ contactor / ฟิวส์ / coil / reset จริงก่อนต่อ','power','unresolved');
add('safety','safe.OUT12','driver.1:VM+','ไฟหลังตัดกำลัง → Motor Driver','12V switched','power terminal pin 1; ห้าม bypass safety interface ในเครื่องจริง','power','unresolved');
add('safety','safe.OUT12','buckA.IN+','ไฟหลังตัดกำลัง → Servo converter','12V switched','ทำให้ราง 5V-ACTUATOR ถูกตัดพร้อมมอเตอร์; การหยุดเชิงกล/พลังงานค้างยังต้องประเมิน','power','unresolved');
add('safety','safe.LOOP-A','estop.NC-A','Safety loop → NC contact','TBD','ยังไม่ระบุรุ่น safety controller จึงไม่มีแรงดันหรือเลขขาที่พร้อมต่อ','safety','unresolved');
add('safety','estop.NC-B','safe.LOOP-B','NC contact → safety loop','TBD','แสดงเพียงหน้าที่หนึ่ง loop ไม่ได้ยืนยันว่าระบบ single-channel เพียงพอ','safety','unresolved');
add('safety',V,'rstop.3V3','3.3V → R1 10kΩ','3.3V');
add('safety','rstop.SENSE','esp.J2.5','Pull-up → GPIO34','3.3V','J2 pin 5 · GPIO34 ไม่มี internal pull-up');
add('safety','esp.J2.5','estop.AUX-A','GPIO34 → NC AUX','3.3V input','ใช้ dry contact แยกจาก safety loop: ปกติ LOW; กด/สายขาด HIGH; เป็น feedback เท่านั้น');
add('safety',G,'estop.AUX-B','AUX return','0V','ห้ามนำแรงดัน safety controller เข้าขา GPIO34','ground');
export function endpoint(ref){const dot=ref.indexOf('.');const b=boards.find(b=>b.id===ref.slice(0,dot));const p=[...(b?.left??[]),...(b?.right??[])].find(p=>p.id===ref.slice(dot+1));return b&&p?{board:b,pin:p,label:`${b.name} · ${b.id==='esp'?p.id+' / ':''}${p.name||p.label}`} : null;}
export function connectionCSV(){const q=s=>'"'+String(s??'').replaceAll('"','""')+'"';return '\uFEFF'+[['Wire','Group','From','To','Voltage','Type','Status','Note'],...wires.map(w=>[w.id,w.group,endpoint(w.from).label,endpoint(w.to).label,w.voltage,w.type,w.status,w.note])].map(row=>row.map(q).join(',')).join('\r\n');}
