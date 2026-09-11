import '@fontsource/ibm-plex-sans-thai/400.css';
import '@fontsource/ibm-plex-sans-thai/500.css';
import '@fontsource/ibm-plex-sans-thai/600.css';
import '@fontsource/manrope/latin-400.css';
import '@fontsource/manrope/latin-500.css';
import '@fontsource/manrope/latin-600.css';
import '@fontsource/manrope/latin-700.css';
import { createIcons, Sprout, Box, Layers2, Workflow, BookOpen, ArrowUpRight, Info, Download, Scan, Rotate3d, Tags, Maximize, Plus, MousePointer2, DoorOpen, SlidersHorizontal, ChevronDown, Monitor, Play, OctagonPause, RotateCcw, Container, Weight, PackageCheck, ChevronRight, FlaskConical, ArrowRight, Cpu, Zap, ArrowDown, Cable, X, Settings2, CircuitBoard, PanelTop, Search, ZoomIn, ZoomOut, Focus, ListFilter, CircleDot } from 'lucide';
const icons={Sprout, Box, Layers2, Workflow, BookOpen, ArrowUpRight, Info, Download, Scan, Rotate3d, Tags, Maximize, Plus, MousePointer2, DoorOpen, SlidersHorizontal, ChevronDown, Monitor, Play, OctagonPause, RotateCcw, Container, Weight, PackageCheck, ChevronRight, FlaskConical, ArrowRight, Cpu, Zap, ArrowDown, Cable, X, Settings2, CircuitBoard, PanelTop, Search, ZoomIn, ZoomOut, Focus, ListFilter, CircleDot};
import { createScene } from './scene.js';
import { setupWiringPage } from './wiring-ui.js';
import { Simulation, recipes, phaseLabels } from './simulation.js';
import { components, sources, pins, shoppingList } from './data.js';
import './style.css';
import './wiring.css';

const icon=(name,cls='')=>`<i data-lucide="${name}" class="${cls}"></i>`;
const sourceLinks=()=>sources.map(([name,url])=>`<a href="${url}" target="_blank" rel="noopener noreferrer">${name}${icon('arrow-up-right')}</a>`).join('');
const sim=new Simulation();
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
          <div class="control-body"><label class="field-label">01 <span>เลือกสัดส่วนวัตถุดิบ</span><small>N : P : K</small></label>
            <div class="recipe-buttons">${recipes.map((r,i)=>`<button class="recipe ${i===0?'selected':''}" data-recipe="${r.id}" aria-pressed="${i===0}" aria-label="สูตร ${r.name} ${r.ratio.join(':')}"><strong>${r.ratio.join(' : ')}</strong><span>${r.name}</span></button>`).join('')}</div>
            <div class="batch-row"><label class="field-label" for="batch">02 <span>น้ำหนักต่อรอบ</span></label><div class="select-wrap"><select id="batch"><option value="0.5">0.5 กก.</option><option value="1" selected>1.0 กก.</option><option value="2">2.0 กก.</option></select>${icon('chevron-down')}</div></div>
            <div class="target-row" title="ปัดเศษเป็นกรัมเพื่อแสดงผล; การจำลองใช้ค่าละเอียดตามสัดส่วน">${['N','P','K'].map((n,i)=>`<div class="target-item"><span class="nutrient n${i}">${n}</span><div><strong id="target-${i}">333</strong><small> กรัม</small></div></div>`).join('')}</div>
            <div class="display-panel" role="status" aria-label="หน้าจอจำลองของ ESP32 Touch HMI"><div class="display-top"><span>${icon('monitor')} ESP32 TOUCH HMI</span><span id="display-status-dot" class="status-dot"></span></div><div class="weight-readout"><strong id="weight">0.000</strong><span>kg</span></div><div class="weight-meter"><span id="weight-progress"></span></div><div class="display-bottom"><span id="phase-label">พร้อมเริ่มทดลอง</span><span id="target-total">/ 1.000 kg</span></div></div>
            <div class="action-buttons"><button id="start-btn" class="primary-button">${icon('play')}<span>เริ่มผสมปุ๋ย</span></button><button id="estop-btn" aria-label="หยุดฉุกเฉิน" title="หยุดฉุกเฉิน">${icon('octagon-pause')}<span>STOP</span></button></div>
            <div class="under-controls"><button id="reset-btn">${icon('rotate-ccw')}รีเซ็ต</button><label for="speed">ความเร็วจำลอง <select id="speed"><option value="1">1×</option><option value="2">2×</option><option value="4">4×</option></select></label></div>
            <div class="material-note">${icon('info')}<p>อัตราส่วนนี้คือมวลวัตถุดิบจากแต่ละช่อง<br>ไม่ใช่เกรดธาตุอาหาร เช่น 15-15-15</p></div>
          </div>
        </section>
      </div>
      <section class="process-card"><div class="process-heading"><span class="eyebrow">THE PROCESS</span><h2>จากวัตถุดิบ สู่ส่วนผสม</h2><span id="process-state">รอเริ่มรอบ</span></div><div class="process-track">${[['container','จ่าย N · P · K','Servo 1–3'],['weight','ชั่งน้ำหนัก','Load Cell + HX711'],['rotate-3d','ผสมให้เข้ากัน','DC gear motor'],['package-check','ปล่อยปุ๋ย','Servo 4']].map(([ico,title,sub],i)=>`<div class="process-step" data-step="${i}"><div class="step-icon">${icon(ico)}<small>0${i+1}</small></div><div><strong>${title}</strong><span>${sub}</span></div>${i<3?icon('chevron-right','step-arrow'):''}</div>`).join('')}</div></section>
      <div class="bottom-note"><span>${icon('flask-conical')} แบบจำลองเพื่อสื่อสารแนวคิด · ค่าน้ำหนักและการเคลื่อนไหวสร้างจากการจำลอง</span><button data-tab="system">ดูแนวทางระบบจริง ${icon('arrow-right')}</button></div>
    </section>
    <section id="components-page" hidden><div class="section-intro"><span class="small-tag">INSIDE THE BOX</span><p>กดอุปกรณ์เพื่อดูหน้าที่ เงื่อนไขการเลือก และตำแหน่งในโมเดล</p></div><div class="component-grid">${components.map((c,i)=>`<button class="component-card" data-component="${c.id}"><div class="component-top"><span class="component-icon" style="--component-color:${c.color}">${icon(c.icon)}</span><span>0${i+1} /</span></div><small>${c.en}</small><h2>${c.name}</h2><p>${c.detail}</p><div class="component-footer"><span>${c.qty}</span>${icon('arrow-up-right')}</div></button>`).join('')}</div></section>
    <section id="wiring-page" hidden></section>
    <section id="system-page" hidden>
      <div class="system-summary"><span class="summary-icon">${icon('cpu')}</span><div><span class="eyebrow">TWO ESP32 · CLEAR RESPONSIBILITIES</span><h2>จอ HMI หนึ่งบอร์ด · ควบคุมเครื่องอีกหนึ่งบอร์ด</h2><p>ESP32-2432S028R แสดงผลและรับเมนู ส่วน ESP32 DevKitC ควบคุมอุปกรณ์จริง ทั้งสองสื่อสารผ่าน UART</p></div><span class="small-tag">แบบอ้างอิง V2</span></div>
      <div class="system-grid"><article class="system-card"><h2>${icon('zap')}เส้นทางจ่ายไฟ</h2><p class="muted">E‑Stop ตัดกำลังที่ทำให้เครื่องเคลื่อนที่ โดยคงระบบควบคุมไว้แสดง Alarm</p><div class="power-source"><span>AC INPUT · ให้ช่างติดตั้ง</span><strong>Power Supply 12V DC</strong><small>ฟิวส์ · PE · ฝาครอบขั้วไฟ</small></div><div class="power-branches"><div><span class="rail">5V-C</span><strong>CONTROL · ไม่ผ่าน K1</strong><p>ESP32 MAIN + HMI + HX711</p></div><div><span class="rail">12V-S</span><strong>K1 → MD10C</strong><p>Motor DC 12V</p></div><div><span class="rail">5V-A</span><strong>K1 → DC–DC</strong><p>MG996R × 4</p></div></div><div class="system-note">กด E‑Stop แล้ว 12V-S และ 5V-A ดับ ส่วน 5V-C ยังทำงาน จอจึงแสดง EMERGENCY STOP ได้</div></article>
      <article class="system-card"><h2>${icon('workflow')}เส้นทางควบคุมและหยุด</h2><div class="signal-flow"><div>ESP32 Touch HMI<span>สูตร · น้ำหนัก · Alarm</span></div>${icon('arrow-down')}<div class="controller-node">UART → ESP32 MAIN <span>ควบคุมลำดับเครื่อง</span></div><div class="signal-grid"><div>I²C<strong>PCA9685</strong><small>→ Servo 4 ตัว</small></div><div>GPIO<strong>MD10C</strong><small>→ Motor DC</small></div><div>GPIO<strong>HX711</strong><small>← Load Cell</small></div></div></div><div class="system-note danger-note">E‑Stop 2NC → Safety relay → K1 เป็นเส้นหยุดจริง ส่วน AUX-NC → GPIO34 ใช้แจ้งสถานะเท่านั้น หลังปลด E‑Stop ต้อง Manual Reset และกด Start ใหม่</div></article></div>
      <article class="system-card pin-card"><h2>${icon('cable')}การจัดสรรขาของระบบใหม่</h2><p class="muted">ขา HMI และ ESP32 หลักแยกหน้าที่ชัดเจน · ตรวจรหัสบอร์ดและตำแหน่ง header ก่อนต่อ</p><div class="table-scroll"><table><thead><tr><th>อุปกรณ์</th><th>GPIO</th><th>การเชื่อมต่อ</th></tr></thead><tbody>${pins.map(row=>`<tr>${row.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div><p class="system-note">Terminal Base ช่วยเพิ่มความแข็งแรงของจุดต่อแต่ไม่ได้เพิ่ม GPIO แบบใหม่ไม่ใช้ LCD2004, BSS138, SN74AHCT125N, L298N หรือ Breadboard</p></article>
      <article class="system-card shopping-card"><h2>${icon('package-check')}รายการอุปกรณ์ฉบับรวม</h2><p class="muted">จำนวนเป็นแนวทางสำหรับต้นแบบหนึ่งเครื่อง ช่อง “สถานะ” ระบุสิ่งที่ต้องยืนยันก่อนซื้อ</p><div class="table-scroll"><table><thead><tr><th>อุปกรณ์</th><th>จำนวน</th><th>หน้าที่</th><th>สถานะ</th></tr></thead><tbody>${shoppingList.map(row=>`<tr>${row.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div></article>
      <div class="recommendation-grid"><article class="system-card"><h3>ทำไมยังใช้ MD10C?</h3><p>MD10C เป็นโมดูลสำเร็จรูป รับ PWM/DIR 3.3V จาก ESP32 และเหมาะกว่า L298N สำหรับมอเตอร์ 12V แบบนี้ แต่ต้องรู้กระแส stall ก่อนยืนยันว่ารุ่น 10A เพียงพอ</p></article><article class="system-card"><h3>ส่วนใดยังระบุรุ่นไม่ได้?</h3><p>Motor, Power Supply, DC–DC ฝั่ง Servo, ฟิวส์, Safety relay และ K1 ต้องเลือกจากแรงบิด กระแส stall และการประเมินความเสี่ยงของเครื่องจริง จึงยังไม่ใส่หมายเลข terminal ที่อาจทำให้ต่อผิดรุ่น</p></article></div>
      <article class="sources-card"><span class="eyebrow">MANUFACTURER REFERENCES</span><div>${sourceLinks()}</div></article>
    </section>
    <footer><span>verdant<span class="brand-period">.</span> <small>MADE FOR GROWING IDEAS</small></span><span>Concept exploration / 2026</span></footer>
  </main>
</div>
<dialog id="component-dialog"><button class="dialog-close icon-button" aria-label="ปิดรายละเอียด">${icon('x')}</button><div id="component-content"></div></dialog>
<dialog id="guide-dialog"><button class="dialog-close icon-button" aria-label="ปิดคู่มือ">${icon('x')}</button><span class="eyebrow">A LITTLE GUIDE</span><h2>ทดลองกล่องผสมปุ๋ย</h2><ol><li>ลากโมเดลเพื่อหมุน เลื่อนเพื่อซูม หรือใช้ปุ่มคืนมุมมอง</li><li>เปิด–ปิดประตู หรือเลือกแยกชิ้นส่วน กดป้ายเพื่อดูอุปกรณ์</li><li>เลือกสัดส่วนวัตถุดิบ N:P:K และน้ำหนัก 0.5 / 1 / 2 กก.</li><li>กดเริ่ม ระบบจะจ่ายทีละช่อง ชั่งสะสม รอค่านิ่ง และผสม</li><li>เมื่อผสมเสร็จ กด “ปล่อยปุ๋ย” แล้วบันทึกผลเป็นไฟล์ JSON</li><li>ปุ่ม STOP จำลองการปลด K1 ซึ่งตัด Motor/Servo แต่จอและ ESP32 ยังทำงาน กดรีเซ็ตก่อนเริ่มรอบใหม่</li></ol><div class="system-note">จอบนตู้จำลอง ESP32-2432S028R แบบสัมผัส ส่วนปุ่มกดจริงและ E‑Stop ยังอยู่แยกจากหน้าจอ ปุ่มบนโมเดลกดได้เมื่อมองเห็นด้านหน้า</div><h3>ขอบเขตของแนวคิด</h3><p>ไม่มีการเชื่อมต่อฮาร์ดแวร์ ค่าชั่ง เวลา ความจุ และขนาดอุปกรณ์เป็นการจำลอง ยังไม่ใช่ CAD สำหรับผลิตหรือระบบความปลอดภัยที่ผ่านการรับรอง</p><p>ช่อง N/P/K หมายถึงวัตถุดิบตั้งต้นแต่ละชนิด ไม่ใช่ธาตุบริสุทธิ์ การคำนวณเกรด N–P₂O₅–K₂O ต้องมีข้อมูลวิเคราะห์ของวัตถุดิบจริง สูตรในเว็บจึงเป็นเพียงสัดส่วนมวลตัวอย่าง</p><div class="sources-inline">${sourceLinks()}</div></dialog>
<div id="toast" role="status" hidden></div>`;
createIcons({icons});
const $=s=>document.querySelector(s);
let scene;
try {scene=createScene($('#viewer'),showComponent,handlePanel);}catch(error){const notice=document.createElement('div');notice.className='webgl-error';notice.textContent='ไม่สามารถเปิด 3D ได้ กรุณาใช้เบราว์เซอร์ที่รองรับ WebGL2 และเปิด hardware acceleration คุณยังทดลองแผงควบคุมและดูรายละเอียดอุปกรณ์ได้';$('#viewer').prepend(notice);console.error(error);}
function notify(message){const t=$('#toast');t.textContent=message;t.hidden=false;clearTimeout(notify.timer);notify.timer=setTimeout(()=>t.hidden=true,4000);}
const wiringPage=setupWiringPage($('#wiring-page'),{icon,refreshIcons:()=>createIcons({icons}),notify});
function tab(name){
  const labels={studio:['3D Studio','กล่องผสมปุ๋ย<span>อัตโนมัติ</span>','สำรวจทุกชิ้นส่วน ทดลองทุกขั้นตอน ในพื้นที่กะทัดรัดเดียวกัน'],components:['Components','ทุกชิ้นส่วน<span>ในกล่องเดียว</span>','รู้จักอุปกรณ์ หน้าที่ และสิ่งที่ต้องตรวจสอบก่อนสร้างจริง'],wiring:['3D Wiring','ทุกเส้นสาย<span>เห็นปลายทาง</span>','เลือกวงจรหรือสาย เพื่อดูว่าต่อจากอุปกรณ์ใด ไปบอร์ดไหนและขาใด'],system:['Control & Power','เชื่อมทุกส่วน<span>อย่างเข้าใจ</span>','แนวทางเลือกบอร์ด ขยายขา และจัดการระบบไฟของกล่องผสมปุ๋ย']};
  if(!labels[name])return;
  ['studio','components','wiring','system'].forEach(n=>$(`#${n}-page`).hidden=n!==name);
  document.querySelectorAll('.nav-button').forEach(b=>{b.classList.toggle('active',b.dataset.tab===name);if(b.dataset.tab===name)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
  $('#breadcrumb-page').textContent=labels[name][0];$('#page-title').innerHTML=labels[name][1];$('#page-subtitle').textContent=labels[name][2];
  if(name==='wiring')wiringPage.refresh();
}
function showComponent(id){const c=components.find(c=>c.id===id);if(!c)return;
  $('#component-content').innerHTML=`<span class="detail-icon" style="color:${c.color}">${icon(c.icon)}</span><span class="eyebrow">${c.en}</span><h2>${c.name}</h2><span class="small-tag">${c.qty}</span><p>${c.detail}</p><div class="system-note">${c.note}</div><button class="primary-button" id="locate-component">${icon('scan')}ดูตำแหน่งในโมเดล</button>`;
  createIcons({icons});$('#component-dialog').showModal();
  $('#locate-component').onclick=()=>{tab('studio');scene?.setDoor(true);scene?.select(id);syncDoor();$('#component-dialog').close();};
}
function handlePanel(action){if(action.startsWith('recipe')){const r=recipes[Number(action.at(-1))];if(!sim.configure(r.id,sim.batch))notify('รีเซ็ตรอบก่อนเปลี่ยนสูตร');}else if(action==='start')start();else if(action==='discharge'){if(!sim.discharge())notify('ต้องผสมเสร็จก่อนปล่อยปุ๋ย');}else if(action==='emergency')emergency();updateUI();}
function start(){if(sim.phase==='ready'){sim.discharge();return;}if(!sim.start())notify(sim.phase==='emergency'?'กดรีเซ็ตเพื่อปลดสถานะหยุดฉุกเฉิน':'กดรีเซ็ตเพื่อเริ่มรอบใหม่');}
function emergency(){sim.emergency();notify('หยุดแล้ว · ทุกประตูในแบบจำลองปิด มอเตอร์หยุด · ต้องรีเซ็ตก่อนเริ่มใหม่');updateUI();}
function syncDoor(){const open=scene?.doorOpen??true;$('#door-btn').setAttribute('aria-pressed',String(open));$('#door-btn .toggle').classList.toggle('on',open);$('#door-btn span').textContent=open?'เปิดประตู':'ปิดประตู';}
app.addEventListener('click',e=>{const tabButton=e.target.closest('[data-tab]');if(tabButton)tab(tabButton.dataset.tab);const component=e.target.closest('[data-component]');if(component)showComponent(component.dataset.component);const recipe=e.target.closest('[data-recipe]');if(recipe){sim.configure(recipe.dataset.recipe,sim.batch);updateUI();}});
$('#batch').onchange=e=>{sim.configure(sim.recipe.id,e.target.value);updateUI();};
$('#speed').onchange=e=>{sim.speed=Number(e.target.value);};
$('#start-btn').onclick=()=>{start();updateUI();};$('#estop-btn').onclick=emergency;
$('#reset-btn').onclick=()=>{sim.reset();updateUI();notify('ล้างน้ำหนักและผลรอบเดิมแล้ว · พร้อมเริ่มใหม่');};
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
  const report={project:'Verdant Compact Mixer',type:'SIMULATION_ONLY',createdAt:new Date().toISOString(),cabinetReferenceCm:{width:40,height:57,depth:20},recipe:{id:sim.recipe.id,inputMassRatio:sim.recipe.ratio,note:'Input mass proportions, NOT N-P2O5-K2O fertilizer grade'},targetKg:sim.batch,targetsKg:sim.targets,dosedKg:sim.dosed,chamberKg:sim.weight,outputKg:sim.output,phase:sim.phase,simulatedSeconds:sim.totalTime,events:sim.history,limitations:['No hardware connected','Dimensions and capacity are illustrative, fit unverified','No nutrient analysis or production safety validation']};
  const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download=`verdant-simulation-${Date.now()}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notify('บันทึกผลจำลองเป็นไฟล์ JSON แล้ว');
};
let prevPhase='';
function updateUI(){
  $('#weight').textContent=sim.weight.toFixed(3);$('#weight-progress').style.width=`${Math.min(100,sim.weight/sim.batch*100)}%`;
  $('#phase-label').textContent=phaseLabels[sim.phase];$('#target-total').textContent=`/ ${sim.batch.toFixed(3)} kg`;
  $('.display-panel').classList.toggle('emergency',sim.phase==='emergency');
  const grams=sim.targets.map(v=>Math.floor(v*1000));let diff=Math.round(sim.batch*1000)-grams.reduce((a,b)=>a+b,0);for(let i=0;diff>0;i++,diff--)grams[i%3]++;
  grams.forEach((v,i)=>$(`#target-${i}`).textContent=v.toLocaleString());
  document.querySelectorAll('[data-recipe]').forEach(b=>{b.disabled=sim.locked;b.classList.toggle('selected',b.dataset.recipe===sim.recipe.id);b.setAttribute('aria-pressed',String(b.dataset.recipe===sim.recipe.id));});
  $('#batch').disabled=sim.locked;
  $('#start-btn').disabled=!['idle','ready'].includes(sim.phase);
  $('#start-btn span').textContent=sim.phase==='ready'?'ปล่อยปุ๋ย':sim.phase==='complete'?'จบรอบแล้ว':sim.phase==='emergency'?'หยุดฉุกเฉิน':sim.active?'กำลังทำงาน…':'เริ่มผสมปุ๋ย';
  $('#estop-btn').classList.toggle('latched',sim.phase==='emergency');
  $('#reset-btn').textContent=sim.phase==='emergency'?'↺ ปลดหยุดและรีเซ็ต':'↺ รีเซ็ต';
  const index={idle:-1,doseN:0,doseP:0,doseK:0,settle:1,mix:2,ready:2,discharge:3,complete:4,emergency:-1}[sim.phase];
  document.querySelectorAll('[data-step]').forEach((s,i)=>{s.classList.toggle('current',i===index);s.classList.toggle('done',i<index);});
  $('#process-state').textContent=sim.phase==='complete'?`ปล่อยแล้ว ${sim.output.toFixed(3)} กก.`:sim.phase==='idle'?'รอเริ่มรอบ':phaseLabels[sim.phase];
  if(sim.phase!==prevPhase){prevPhase=sim.phase;if(sim.phase==='ready')notify('ผสมครบแล้ว · กดปล่อยปุ๋ยเพื่อจบรอบ');}
}
let lastTime=performance.now(),uiTime=0;
function frame(now){const dt=Math.min((now-lastTime)/1000,.1);lastTime=now;sim.tick(dt);scene?.render(dt,sim);if(now-uiTime>70){updateUI();uiTime=now;}requestAnimationFrame(frame);}
updateUI();requestAnimationFrame(frame);
// Ignore background-tab time: the visible demonstration resumes where it stopped.
document.addEventListener('visibilitychange',()=>{lastTime=performance.now();});
