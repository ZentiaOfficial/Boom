import '@fontsource/ibm-plex-sans-thai/400.css';
import '@fontsource/ibm-plex-sans-thai/500.css';
import '@fontsource/ibm-plex-sans-thai/600.css';
import '@fontsource/manrope/latin-400.css';
import '@fontsource/manrope/latin-500.css';
import '@fontsource/manrope/latin-600.css';
import '@fontsource/manrope/latin-700.css';
import { createIcons, Sprout, Box, Layers2, Workflow, BookOpen, ArrowUpRight, Info, Download, Scan, Rotate3d, Tags, Maximize, Plus, MousePointer2, DoorOpen, SlidersHorizontal, ChevronDown, Monitor, Play, OctagonPause, RotateCcw, Container, Weight, PackageCheck, ChevronRight, FlaskConical, ArrowRight, Cpu, Zap, ArrowDown, Cable, X, Settings2, CircuitBoard, PanelTop, Search, ZoomIn, ZoomOut, Focus, ListFilter, CircleDot, Code, Crosshair, Copy } from 'lucide';
const icons={Sprout, Box, Layers2, Workflow, BookOpen, ArrowUpRight, Info, Download, Scan, Rotate3d, Tags, Maximize, Plus, MousePointer2, DoorOpen, SlidersHorizontal, ChevronDown, Monitor, Play, OctagonPause, RotateCcw, Container, Weight, PackageCheck, ChevronRight, FlaskConical, ArrowRight, Cpu, Zap, ArrowDown, Cable, X, Settings2, CircuitBoard, PanelTop, Search, ZoomIn, ZoomOut, Focus, ListFilter, CircleDot, Code, Crosshair, Copy};
import { createScene } from './scene.js';
import { setupWiringPage } from './wiring-ui.js';
import { setupCodeViewer } from './code-viewer.js';
import { componentFirmware } from './firmware.js';
import { Simulation, phaseLabels, screenLabels, faultNames, FLOW_G_PER_S, AIR_CARRY_G } from './simulation.js';
import { parseParams } from './firmware-params.js';
import { effectiveSource, firmwareChangedEvent } from './firmware.js';
import { drawHmi, hitTest, HMI_W, HMI_H } from './hmi-screen.js';
import { components, sources, pins, shoppingList } from './data.js';
import './style.css';
import './cabinet.css';
import './wiring.css';

const icon=(name,cls='')=>`<i data-lucide="${name}" class="${cls}"></i>`;
const sourceLinks=()=>sources.map(([name,url])=>`<a href="${url}" target="_blank" rel="noopener noreferrer">${name}${icon('arrow-up-right')}</a>`).join('');
// The cabinet runs the same numbers as the sketches (RECIPE_TARGET_G, CALIBRATION_OFFSET_G,
// STIR_DURATION_MS ...), including any edits made in the code editor.
function loadParams(){const params=parseParams(effectiveSource('esp'),effectiveSource('hmi'));let edited=false;try{edited=['esp','hmi'].some(id=>localStorage.getItem(`verdant:code:${id}`)!==null);}catch{}params.edited=edited;return params;}
const sim=new Simulation(loadParams());
const app=document.querySelector('#app');
app.innerHTML=`
<aside class="sidebar">
  <a class="brand" href="#" aria-label="Verdant หน้าหลัก"><span class="brand-symbol">${icon('sprout')}</span><span>verdant<span class="brand-period">.</span><small>COMPACT MIXING STUDIO</small></span></a>
  <div class="workspace-label">WORKSPACE <span>01</span></div>
  <nav aria-label="เมนูหลัก">
    <button class="nav-button active" data-tab="studio" aria-label="สตูดิโอ 3D">${icon('box')}<span>สตูดิโอ 3D</span><span class="nav-dot"></span></button>
    <button class="nav-button" data-tab="components" aria-label="อุปกรณ์ในกล่อง">${icon('layers-2')}<span>อุปกรณ์ในกล่อง</span><small>${String(components.length).padStart(2,'0')}</small></button>
    <button class="nav-button" data-tab="wiring" aria-label="เดินสาย 3D">${icon('cable')}<span>เดินสาย 3D</span></button>
    <button class="nav-button" data-tab="system" aria-label="ระบบควบคุมและไฟ">${icon('workflow')}<span>ระบบควบคุมและไฟ</span></button>
  </nav>
  <div class="sidebar-project"><span class="tiny-label">THE CONCEPT</span><div class="project-sketch">${icon('sprout')}<span>N + P + K</span></div><h3>Small box.<br>Growing possibilities.</h3><p>หนึ่งกล่อง ที่รวมการจ่าย<br>ชั่ง และผสมไว้ด้วยกัน</p><span class="concept-tag">CONCEPT MODEL · V1.0</span></div>
  <div class="sidebar-bottom"><button id="guide-btn">${icon('book-open')}คู่มือการทดลอง${icon('arrow-up-right')}</button><div class="local-status"><span class="status-dot"></span> ทำงานในโหมดจำลอง</div></div>
</aside>
<div class="page">
  <header class="topbar"><div class="breadcrumb">Workspace <span>/</span> <strong id="breadcrumb-page">3D Studio</strong></div><div class="topbar-right"><span class="simulation-badge"><span></span> SIMULATION ONLY</span><button id="about-btn" class="icon-button" aria-label="เกี่ยวกับโครงการ">${icon('info')}</button><div class="avatar">V</div></div></header>
  <main>
    <div class="page-heading"><div><div class="eyebrow">PRECISION IN A SMALL SPACE</div><h1 id="page-title">กล่องผสมปุ๋ย<span>อัตโนมัติ</span></h1><p id="page-subtitle">สำรวจทุกชิ้นส่วน ทดลองทุกขั้นตอน ในพื้นที่กะทัดรัดเดียวกัน</p></div><button class="outline-button" id="export-btn">${icon('download')}บันทึกการทดลอง</button></div>
    <section id="studio-page">
      <div class="studio-grid">
        <section class="viewer-card" aria-label="สตูดิโอสามมิติ">
          <div class="viewer-top"><div class="viewer-title"><span class="status-dot"></span> COMPACT MIXER <span class="muted">/ 01</span></div><span class="small-tag">3D INTERACTIVE</span></div>
          <div id="viewer" class="viewer">
            <div class="view-switch" role="group" aria-label="ลักษณะโมเดล"><button id="assembled-btn" class="selected">ประกอบ</button><button id="exploded-btn">แยกชิ้นส่วน</button></div>
            <div class="canvas-tools"><button id="home-btn" aria-label="คืนมุมมองเริ่มต้น" title="คืนมุมมอง">${icon('scan')}</button><button id="rotate-btn" aria-label="หมุนอัตโนมัติ" aria-pressed="false" title="หมุนอัตโนมัติ">${icon('rotate-3d')}</button><button id="labels-btn" class="on" aria-label="แสดงป้ายอุปกรณ์" aria-pressed="true" title="ป้ายอุปกรณ์">${icon('tags')}</button><button id="fullscreen-btn" aria-label="ขยายโมเดลเต็มจอ" title="เต็มจอ">${icon('maximize')}</button></div>
            <button class="model-label" data-component="hoppers"><span class="label-point"></span><span>01 <b>ถังเก็บ N · P · K</b>${icon('plus')}</span></button>
            <button class="model-label" data-component="mixer"><span class="label-point"></span><span>02 <b>ชุดผสมปุ๋ย</b>${icon('plus')}</span></button>
            <button class="model-label" data-component="controller"><span class="label-point"></span><span>03 <b>ชุดควบคุม</b>${icon('plus')}</span></button>
            <div class="model-caption"><span>REFERENCE ENVELOPE</span><strong>40 <i>×</i> 57 <i>×</i> 20 <small>cm</small></strong><p>ขนาดตู้อ้างอิง · ยังไม่ยืนยันการติดตั้งจริง</p></div>
            <div class="axis"><span class="axis-y">Y</span><span class="axis-z">Z</span><span class="axis-x">X</span></div>
          </div>
          <div class="viewer-bottom"><div class="orbit-hint">${icon('mouse-pointer-2')} ลากเพื่อหมุน <span>·</span> เลื่อนเพื่อซูม</div><button id="door-btn" aria-pressed="true">${icon('door-open')}<span>เปิดประตู</span><span class="toggle on"></span></button></div>
        </section>
        <section class="control-card" aria-label="แผงทดลองผสม">
          <div class="control-heading"><div><span class="eyebrow">LET’S MIX</span><h2>ทดลองผสมปุ๋ย</h2></div><span class="control-symbol">${icon('sliders-horizontal')}</span></div>
          <div class="control-body"><label class="field-label">01 <span>เลือกสูตร</span><small>ปุ่มเขียว 1 / 2 / 3</small></label>
            <div class="recipe-buttons">${[1,2,3].map(n=>`<button class="recipe" data-recipe="${n}" aria-pressed="false" aria-label="สูตร ${n}"><strong>–</strong><span>สูตร ${n}</span></button>`).join('')}</div>
            <div class="target-row" title="RECIPE_TARGET_G ของสูตรที่เลือก อ่านจาก esp32_main_dispenser.ino">${['N','P','K'].map((n,i)=>`<div class="target-item"><span class="nutrient n${i}">${n}</span><div><strong id="target-${i}">0</strong><small> กรัม</small></div></div>`).join('')}</div>
            <div class="display-panel" role="group" aria-label="หน้าจอสัมผัส ESP32-2432S028 จำลอง แตะปุ่มบนจอได้"><div class="display-top"><span>${icon('monitor')} ESP32-2432S028 · <b id="screen-name">BOOT</b></span><span id="display-status-dot" class="status-dot"></span></div><canvas id="hmi-canvas" class="hmi-canvas" width="${HMI_W*2}" height="${HMI_H*2}"></canvas><div class="display-bottom"><span id="phase-label">กำลังเปิดเครื่อง</span><span id="code-source">โค้ดต้นฉบับ</span></div></div>
            <div class="action-buttons"><button id="start-btn" class="primary-button">${icon('play')}<span>ปุ่มเขียว 4</span></button><button id="estop-btn" aria-label="ปุ่ม E-Stop แบบล็อก กดล็อก บิดปลด" title="กดล็อก / บิดปลด">${icon('octagon-pause')}<span>E-STOP</span></button></div>
            <div class="under-controls"><button id="reset-btn">${icon('rotate-ccw')}รีเซ็ต · ล้างภาชนะ</button><button id="power-btn">${icon('zap')}จำลองไฟดับ</button><label for="speed">ความเร็ว <select id="speed"><option value="1">1×</option><option value="2">2×</option><option value="4">4×</option></select></label></div>
            <div class="serial-head"><span>SERIAL MONITOR · ESP32 38pin</span></div><pre class="serial-log" id="serial-log" role="log" aria-label="Serial Monitor ของ ESP32 38pin"></pre>
            <div class="material-note">${icon('info')}<p>เป้าหมายเป็นกรัมของแต่ละช่อง ไม่ใช่เกรดธาตุอาหาร · ตู้ทำงานตามโค้ด Code_Board ชุดเดียวกับที่เปิดดู/แก้ได้ · แบบจำลองสมมติอัตราไหล ${FLOW_G_PER_S} g/s และไม่มีปุ๋ยค้างในอากาศ (ค่าจริงต้องวัดจากเครื่อง)</p></div>
          </div>
        </section>
      </div>
      <section class="process-card"><div class="process-heading"><span class="eyebrow">THE PROCESS</span><h2>จากวัตถุดิบ สู่ส่วนผสม</h2><span id="process-state">รอเริ่มรอบ</span></div><div class="process-track">${[['container','จ่าย N · P · K','Servo 1–3'],['weight','ชั่งน้ำหนัก','Load Cell + HX711'],['rotate-3d','กวนผสม','มอเตอร์ JGB37-520 + L298N'],['package-check','ปล่อยปุ๋ย','Servo 4']].map(([ico,title,sub],i)=>`<div class="process-step" data-step="${i}"><div class="step-icon">${icon(ico)}<small>0${i+1}</small></div><div><strong>${title}</strong><span>${sub}</span></div>${i<3?icon('chevron-right','step-arrow'):''}</div>`).join('')}</div></section>
      <div class="bottom-note"><span>${icon('flask-conical')} แบบจำลองเพื่อสื่อสารแนวคิด · ค่าน้ำหนักและการเคลื่อนไหวสร้างจากการจำลอง</span><button data-tab="system">ดูแนวทางระบบจริง ${icon('arrow-right')}</button></div>
    </section>
    <section id="components-page" hidden><div class="section-intro"><span class="small-tag">INSIDE THE BOX</span><p>กดอุปกรณ์เพื่อดูหน้าที่ เงื่อนไขการเลือก และตำแหน่งในโมเดล</p></div><div class="component-grid">${components.map((c,i)=>`<button class="component-card" data-component="${c.id}"><div class="component-top"><span class="component-icon" style="--component-color:${c.color}">${icon(c.icon)}</span><span>0${i+1} /</span></div><small>${c.en}</small><h2>${c.name}</h2><p>${c.detail}</p><div class="component-footer"><span>${c.qty}</span>${icon('arrow-up-right')}</div></button>`).join('')}</div></section>
    <section id="wiring-page" hidden></section>
    <section id="system-page" hidden>
      <div class="system-summary"><span class="summary-icon">${icon('cpu')}</span><div><span class="eyebrow">TWO ESP32 · CLEAR RESPONSIBILITIES</span><h2>จอหนึ่งบอร์ด · ควบคุมเครื่องอีกหนึ่งบอร์ด</h2><p>จอ ESP32-2432S028 แสดงผลและรับการแตะ ส่วน ESP32 DevKit 38-pin ควบคุมอุปกรณ์จริงและเก็บ state ทั้งสองคุยกันผ่าน Bluetooth ไม่มีสายสัญญาณ</p></div><span class="small-tag">ตามอุปกรณ์จริง</span></div>
      <div class="system-grid"><article class="system-card"><h2>${icon('zap')}เส้นทางจ่ายไฟ</h2><p class="muted">Adapter 12V แยกเป็นสองทาง: ลดเป็น 5V สำหรับบอร์ดและ Servo กับ 12V ตรงสำหรับมอเตอร์</p><div class="power-source"><span>ไฟหลัก</span><strong>Adapter 12V</strong><small>adapter หรือแบตเตอรี่</small></div><div class="power-branches"><div><span class="rail">5V</span><strong>XL4016 (ปรับที่ 5V)</strong><p>ESP32 38pin + จอ</p></div><div><span class="rail">V+</span><strong>XL4016 → PCA9685</strong><p>Servo MG996R × 4</p></div><div><span class="rail">12V</span><strong>ผ่าน E‑Stop NC → L298N</strong><p>มอเตอร์ JGB37-520</p></div></div><div class="system-note">กด E‑Stop แล้ว 12V ของมอเตอร์ดับทางฮาร์ดแวร์ ส่วน ESP32 และจอยังมีไฟ จึงแสดง EMERGENCY STOP ได้ ปุ่มล็อกค้างเองไม่ต้องมี relay</div></article>
      <article class="system-card"><h2>${icon('workflow')}เส้นทางควบคุมและหยุด</h2><div class="signal-flow"><div>ESP32 จอสัมผัส<span>สูตร · กราฟน้ำหนัก · สถานะ</span></div>${icon('arrow-down')}<div class="controller-node">Bluetooth → ESP32 38pin <span>ควบคุมลำดับเครื่องและเก็บ state</span></div><div class="signal-grid"><div>I²C<strong>PCA9685</strong><small>→ Servo 4 ตัว</small></div><div>GPIO<strong>L298N</strong><small>→ มอเตอร์กวน</small></div><div>GPIO<strong>HX711</strong><small>← Load Cell</small></div></div></div><div class="system-note danger-note">E‑Stop ขา NC ตัด 12V มอเตอร์ในฮาร์ดแวร์ ส่วนขา NO → GPIO27 ให้ซอฟต์แวร์หยุด Servo ข้อจำกัด: Servo ไม่มีฮาร์ดแวร์ตัดไฟ ถ้า ESP32 แครชอาจค้างตำแหน่งเดิม</div></article></div>
      <article class="system-card pin-card"><h2>${icon('cable')}การจัดสรรขา</h2><p class="muted">เลขขาเป็น GPIO ของ ESP32 38pin ตามโค้ดใน Code_Board · ตรวจตำแหน่ง header บนบอร์ดจริงก่อนต่อ</p><div class="table-scroll"><table><thead><tr><th>อุปกรณ์</th><th>GPIO</th><th>การเชื่อมต่อ</th></tr></thead><tbody>${pins.map(row=>`<tr>${row.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div><p class="system-note">GPIO12/13 บน 38pin มีสาย TX/RX จากจอต่อค้างไว้ทางกายภาพแต่ไม่ได้ใช้ในโค้ด</p></article>
      <article class="system-card shopping-card"><h2>${icon('package-check')}รายการอุปกรณ์ฉบับรวม</h2><p class="muted">อุปกรณ์ทั้งหมดที่ใช้จริงในเครื่องนี้ ตรงกับตารางใน Code_Board/README.md</p><div class="table-scroll"><table><thead><tr><th>อุปกรณ์</th><th>จำนวน</th><th>หน้าที่</th><th>หมายเหตุ</th></tr></thead><tbody>${shoppingList.map(row=>`<tr>${row.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div></article>
      <div class="recommendation-grid"><article class="system-card"><h3>ทำไม E‑Stop ไม่ใช้ relay?</h3><p>ปุ่มล็อกกดค้างและบิดปลดได้ ขา NC จึงตัดไฟ 12V ของ L298N ได้โดยตรง ค้างเองจนกว่าจะบิดปลด ไม่ต้องมีวงจรค้างสถานะเพิ่ม ขา NO อีกชุดแยกไปแจ้ง ESP32 เท่านั้น</p></article><article class="system-card"><h3>ค่าที่ยังเป็น placeholder</h3><p>เวลากวน 5 วินาที และค่า Calibrate ของการปล่อยปุ๋ย (CALIBRATION_OFFSET_G) ตั้งเป็น 0 ทั้งหมดจนกว่าจะวัดจริง ปรับได้ในโค้ดของ ESP32 38pin ผ่านปุ่ม “ดู/แก้ไขโค้ด”</p></article></div>
      <article class="sources-card"><span class="eyebrow">MANUFACTURER REFERENCES</span><div>${sourceLinks()}</div></article>
    </section>
    <footer><span>verdant<span class="brand-period">.</span> <small>MADE FOR GROWING IDEAS</small></span><span>Concept exploration / 2026</span></footer>
  </main>
</div>
<dialog id="component-dialog"><button class="dialog-close icon-button" aria-label="ปิดรายละเอียด">${icon('x')}</button><div id="component-content"></div></dialog>
<dialog id="guide-dialog"><button class="dialog-close icon-button" aria-label="ปิดคู่มือ">${icon('x')}</button><span class="eyebrow">A LITTLE GUIDE</span><h2>ทดลองกล่องผสมปุ๋ย</h2><ol><li>ลากโมเดลเพื่อหมุน เลื่อนเพื่อซูม หรือใช้ปุ่มคืนมุมมอง</li><li>เปิด–ปิดประตู หรือเลือกแยกชิ้นส่วน กดป้ายเพื่อดูอุปกรณ์</li><li>กดปุ่มเขียว 1 / 2 / 3 เพื่อเลือกสูตร (หรือแตะจอ) แล้วกดปุ่มเขียว 4 เพื่อเริ่มผสม</li><li>ตู้จ่าย N → P → K ตามลำดับ ปิดวาล์วเมื่อน้ำหนักถึง เป้าหมาย − ค่า Calibrate แล้วรอน้ำหนักนิ่งก่อนเปิดตัวถัดไป จากนั้นกวนตามเวลาใน STIR_DURATION_MS</li><li>เมื่อผสมเสร็จ กดปุ่มเขียว 4 เพื่อปล่อยปุ๋ย ดู Serial Monitor เพื่อเทียบน้ำหนักที่ปิดวาล์วกับน้ำหนักที่นิ่ง</li><li>E-Stop เป็นปุ่มล็อก: กดแล้วตัดไฟมอเตอร์และหยุด Servo บิดปลดแล้วจอกลับหน้าเลือกสูตรเอง · ปุ่ม “จำลองไฟดับ” ทดสอบหน้า Power Recovery</li><li>กดที่จอหรือ ESP32 (หรือเข้าหน้าเดินสาย 3D) เพื่อดูและแก้โค้ด — ตู้จะทำงานตามโค้ดที่แก้ทันที</li></ol><div class="system-note">จอบนตู้จำลอง ESP32-2432S028 แบบสัมผัส ส่วนปุ่มเขียว 4 ปุ่มและ E‑Stop เป็นปุ่มจริงแยกจากหน้าจอ ปุ่มบนโมเดลกดได้เมื่อมองเห็นด้านหน้า</div><h3>ขอบเขตของแนวคิด</h3><p>ไม่มีการเชื่อมต่อฮาร์ดแวร์ ค่าชั่ง เวลา ความจุ และขนาดอุปกรณ์เป็นการจำลอง ยังไม่ใช่ CAD สำหรับผลิตหรือระบบความปลอดภัยที่ผ่านการรับรอง</p><p>ช่อง N/P/K หมายถึงวัตถุดิบตั้งต้นแต่ละชนิด ไม่ใช่ธาตุบริสุทธิ์ การคำนวณเกรด N–P₂O₅–K₂O ต้องมีข้อมูลวิเคราะห์ของวัตถุดิบจริง สูตรในเว็บจึงเป็นเพียงสัดส่วนมวลตัวอย่าง</p><div class="sources-inline">${sourceLinks()}</div></dialog>
<div id="toast" role="status" hidden></div>`;
createIcons({icons});
const $=s=>document.querySelector(s);
let scene;
try {scene=createScene($('#viewer'),showComponent,handlePanel,onScreenTouch);}catch(error){const notice=document.createElement('div');notice.className='webgl-error';notice.textContent='ไม่สามารถเปิด 3D ได้ กรุณาใช้เบราว์เซอร์ที่รองรับ WebGL2 และเปิด hardware acceleration คุณยังทดลองแผงควบคุมและดูรายละเอียดอุปกรณ์ได้';$('#viewer').prepend(notice);console.error(error);}
function notify(message){const t=$('#toast');t.textContent=message;t.hidden=false;clearTimeout(notify.timer);notify.timer=setTimeout(()=>t.hidden=true,4000);}
const codeViewer=setupCodeViewer({icon,refreshIcons:()=>createIcons({icons}),notify});
const wiringPage=setupWiringPage($('#wiring-page'),{icon,refreshIcons:()=>createIcons({icons}),notify,openCode:id=>codeViewer.open(id)});
function tab(name){
  const labels={studio:['3D Studio','กล่องผสมปุ๋ย<span>อัตโนมัติ</span>','สำรวจทุกชิ้นส่วน ทดลองทุกขั้นตอน ในพื้นที่กะทัดรัดเดียวกัน'],components:['Components','ทุกชิ้นส่วน<span>ในกล่องเดียว</span>','รู้จักอุปกรณ์ หน้าที่ และสิ่งที่ต้องตรวจสอบก่อนสร้างจริง'],wiring:['3D Wiring','ทุกเส้นสาย<span>เห็นปลายทาง</span>','เลือกวงจรหรือสาย เพื่อดูว่าต่อจากอุปกรณ์ใด ไปบอร์ดไหนและขาใด'],system:['Control & Power','เชื่อมทุกส่วน<span>อย่างเข้าใจ</span>','แนวทางเลือกบอร์ด ขยายขา และจัดการระบบไฟของกล่องผสมปุ๋ย']};
  if(!labels[name])return;
  ['studio','components','wiring','system'].forEach(n=>$(`#${n}-page`).hidden=n!==name);
  document.querySelectorAll('.nav-button').forEach(b=>{b.classList.toggle('active',b.dataset.tab===name);if(b.dataset.tab===name)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
  $('#breadcrumb-page').textContent=labels[name][0];$('#page-title').innerHTML=labels[name][1];$('#page-subtitle').textContent=labels[name][2];
  if(name==='wiring')wiringPage.refresh();
}
function showComponent(id){const c=components.find(c=>c.id===id);if(!c)return;
  $('#component-content').innerHTML=`<span class="detail-icon" style="color:${c.color}">${icon(c.icon)}</span><span class="eyebrow">${c.en}</span><h2>${c.name}</h2><span class="small-tag">${c.qty}</span><p>${c.detail}</p><div class="system-note">${c.note}</div>${componentFirmware[id]?`<button class="primary-button" id="open-component-code">${icon('code')}ดู/แก้ไขโค้ดของอุปกรณ์นี้</button>`:''}<button class="primary-button" id="locate-component">${icon('scan')}ดูตำแหน่งในโมเดล</button>`;
  createIcons({icons});$('#component-dialog').showModal();
  const codeButton=$('#open-component-code');if(codeButton)codeButton.onclick=()=>{$('#component-dialog').close();codeViewer.open(componentFirmware[id]);};
  $('#locate-component').onclick=()=>{tab('studio');scene?.setDoor(true);scene?.select(id);syncDoor();$('#component-dialog').close();};
}
function handlePanel(action){if(action.startsWith('recipe'))sim.press(String(Number(action.at(-1))+1));else if(action==='start')sim.press('CONFIRM');else if(action==='emergency')toggleEstop();updateUI();}
function onScreenTouch(x,y){const command=hitTest(sim,x,y);if(!command)return false;sim.command(command);updateUI();return true;}
function toggleEstop(){sim.setEstop(!sim.estop);notify(sim.estop?'E-Stop กดล็อก · ตัดไฟ 12V ของมอเตอร์ทางฮาร์ดแวร์ · บิดปลดแล้วจอจะกลับหน้าเลือกสูตรเอง':'บิดปลด E-Stop แล้ว');updateUI();}
function syncDoor(){const open=scene?.doorOpen??true;$('#door-btn').setAttribute('aria-pressed',String(open));$('#door-btn .toggle').classList.toggle('on',open);$('#door-btn span').textContent=open?'เปิดประตู':'ปิดประตู';}
app.addEventListener('click',e=>{const tabButton=e.target.closest('[data-tab]');if(tabButton)tab(tabButton.dataset.tab);const component=e.target.closest('[data-component]');if(component)showComponent(component.dataset.component);const recipe=e.target.closest('[data-recipe]');if(recipe){if(!sim.press(recipe.dataset.recipe))notify('เลือกสูตรได้เฉพาะหน้าเลือกสูตร/ยืนยันสูตร');updateUI();}});
$('#speed').onchange=e=>{sim.speed=Number(e.target.value);};
$('#start-btn').onclick=()=>{sim.press('CONFIRM');updateUI();};$('#estop-btn').onclick=toggleEstop;
$('#hmi-canvas').onclick=e=>{const r=e.currentTarget.getBoundingClientRect();onScreenTouch((e.clientX-r.left)/r.width*HMI_W,(e.clientY-r.top)/r.height*HMI_H);};
$('#power-btn').onclick=()=>{sim.powerCycle();updateUI();notify('ตัดไฟแล้วเปิดใหม่ · ปุ่ม/จอทำงานตาม NVS ที่บันทึกไว้ (ถ้าตัดไฟระหว่างผสมจะขึ้น Power Recovery)');};
window.addEventListener(firmwareChangedEvent,()=>{sim.setParams(loadParams());updateUI();});
$('#reset-btn').onclick=()=>{sim.reset();updateUI();notify('เทปุ๋ยในภาชนะทิ้งและเปิดเครื่องใหม่แล้ว');};
$('#door-btn').onclick=()=>{scene?.setDoor(!scene.doorOpen);syncDoor();};
$('#home-btn').onclick=()=>scene?.home();
$('#rotate-btn').onclick=e=>{const b=e.currentTarget;const on=b.getAttribute('aria-pressed')!=='true';b.setAttribute('aria-pressed',String(on));b.classList.toggle('on',on);scene?.setAuto(on);};
$('#labels-btn').onclick=e=>{const b=e.currentTarget;const on=b.getAttribute('aria-pressed')!=='true';b.setAttribute('aria-pressed',String(on));b.classList.toggle('on',on);scene?.setLabels(on);};
function explode(on){scene?.setExploded(on);$('#assembled-btn').classList.toggle('selected',!on);$('#exploded-btn').classList.toggle('selected',on);syncDoor();}
$('#assembled-btn').onclick=()=>explode(false);$('#exploded-btn').onclick=()=>explode(true);
$('#fullscreen-btn').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('.viewer-card').requestFullscreen();}catch{notify('เบราว์เซอร์นี้ไม่รองรับเต็มจอ');}};
$('#guide-btn').onclick=$('#about-btn').onclick=()=>$('#guide-dialog').showModal();
$('.brand').onclick=e=>{e.preventDefault();tab('studio');};
document.querySelectorAll('dialog').forEach(d=>{d.querySelector('.dialog-close').onclick=()=>d.close();d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}});});
$('#export-btn').onclick=()=>{
  const round=v=>Math.round(v*10)/10;
  const report={project:'Verdant Compact Mixer',type:'SIMULATION_ONLY',createdAt:new Date().toISOString(),cabinetReferenceCm:{width:40,height:57,depth:20},firmware:{source:sim.params.edited?'edited in the browser code editor':'Code_Board original',recipeTargetG:sim.params.targetG,calibrationOffsetG:sim.params.offsetG,stirMs:sim.params.stirMs},recipe:sim.selectedRecipe,dispensedG:sim.dispensedG.map(round),loadCellG:round(sim.loadG),releasedG:round(sim.outputG),screen:sim.screen,simulatedSeconds:round(sim.totalTime),serialLog:sim.log.map(l=>l.text),assumptions:{flowGramsPerSecond:FLOW_G_PER_S,airCarryG:AIR_CARRY_G},limitations:['No hardware connected','Flow rate and fertilizer left in the air are assumptions, not measurements','Dimensions and capacity are illustrative, fit unverified','No nutrient analysis or production safety validation']};
  const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download=`verdant-simulation-${Date.now()}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notify('บันทึกผลจำลองเป็นไฟล์ JSON แล้ว');
};
let prevScreen='',lastLogKey='';
const confirmLabels={RECIPE_SELECT:'ปล่อยปุ๋ยฉุกเฉิน',RECIPE_DETAIL:'เริ่มผสม',MIX_DONE:'ปล่อยปุ๋ย',POWER_RECOVERY:'ปล่อยปุ๋ยทันที',EMERGENCY_CONFIRM:'ยืนยันปล่อย',FAULT:'OK'};
function updateUI(){
  drawHmi($('#hmi-canvas').getContext('2d'),sim,2);
  const screenName=sim.screen==='FAULT'?faultNames[sim.faultKind]:sim.screen;
  $('#screen-name').textContent=screenName;
  $('#phase-label').textContent=sim.run?phaseLabels[sim.mixPhase]:sim.releasing?'กำลังปล่อยปุ๋ย':screenLabels[sim.screen];
  $('.display-panel').classList.toggle('emergency',sim.screen==='ESTOP'||sim.screen==='FAULT');
  $('#code-source').textContent=sim.params.warnings.length?`⚠ อ่าน ${sim.params.warnings.join(', ')} ไม่ได้ · ใช้ค่าต้นฉบับ`:sim.params.edited?'ใช้โค้ดที่แก้ไขแล้ว':'โค้ดต้นฉบับ';
  sim.params.targetG[sim.selectedRecipe-1].forEach((v,i)=>$(`#target-${i}`).textContent=Math.round(v).toLocaleString());
  const choosing=!sim.busy&&['RECIPE_SELECT','RECIPE_DETAIL'].includes(sim.screen);
  document.querySelectorAll('[data-recipe]').forEach(b=>{const n=Number(b.dataset.recipe),picked=n===sim.selectedRecipe&&!['RECIPE_SELECT','BOOT'].includes(sim.screen);b.querySelector('strong').textContent=sim.recipes[n-1].npk.join(' : ');b.disabled=!choosing;b.classList.toggle('selected',picked);b.setAttribute('aria-pressed',String(picked));});
  const label=confirmLabels[sim.screen];
  $('#start-btn').disabled=sim.busy||!label;
  $('#start-btn span').textContent=sim.releasing?'กำลังปล่อยปุ๋ย…':sim.run?'กำลังทำงาน…':sim.screen==='ESTOP'?'บิดปลด E-Stop ก่อน':label?`${label} · ปุ่มเขียว 4`:'รอเครื่อง…';
  $('#estop-btn').classList.toggle('latched',sim.estop);
  $('#estop-btn span').textContent=sim.estop?'บิดปลด':'E-STOP';
  const index=sim.run?{dose:0,tare:1,settle:1,stir:2}[sim.run.step]:sim.releasing||sim.screen==='MIX_DONE'?3:sim.screen==='RECIPE_SELECT'&&sim.outputG>0?4:-1;
  document.querySelectorAll('[data-step]').forEach((el,i)=>{el.classList.toggle('current',i===index);el.classList.toggle('done',i<index);});
  $('#process-state').textContent=sim.run?phaseLabels[sim.mixPhase]:sim.releasing?'กำลังปล่อยปุ๋ย':sim.screen==='MIX_DONE'?'ผสมเสร็จ · รอปล่อย':sim.screen==='RECIPE_SELECT'&&sim.outputG>0?`ปล่อยแล้ว ${(sim.outputG/1000).toFixed(3)} กก.`:sim.screen==='ESTOP'?'หยุดฉุกเฉิน':'รอเริ่มรอบ';
  const lines=sim.log.slice(-9),key=lines.length+'|'+(lines.at(-1)?.text??'');
  if(key!==lastLogKey){lastLogKey=key;const box=$('#serial-log');box.textContent=lines.map(l=>l.text).join('\n');box.scrollTop=box.scrollHeight;}
  if(sim.screen!==prevScreen){prevScreen=sim.screen;if(sim.screen==='MIX_DONE')notify('ผสมครบแล้ว · กดปุ่มเขียว 4 หรือแตะ RELEASE FERTILIZER เพื่อปล่อยปุ๋ย');}
}
let lastTime=performance.now(),uiTime=0;
function frame(now){const dt=Math.min((now-lastTime)/1000,.1);lastTime=now;sim.tick(dt);scene?.render(dt,sim);if(now-uiTime>70){updateUI();uiTime=now;}requestAnimationFrame(frame);}
updateUI();requestAnimationFrame(frame);
// Ignore background-tab time: the visible demonstration resumes where it stopped.
document.addEventListener('visibilitychange',()=>{lastTime=performance.now();});
