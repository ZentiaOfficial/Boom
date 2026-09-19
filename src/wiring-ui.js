import { createWiringScene } from './wiring-scene.js';
import { boards, wires, groups, endpoint, connectionCSV, wiringSources } from './wiring-data.js';

const statusText={reference:'ระบุขาแล้ว',conditional:'ต้องตรวจอุปกรณ์จริง',unresolved:'ยังห้ามต่อจริง'};
const statusClass={reference:'ok',conditional:'check',unresolved:'stop'};

export function setupWiringPage(host,{icon,refreshIcons,notify,openCode}){
  const mainBoards=['esp','hmi','pca','hx','driver','xl','estop'];
  host.innerHTML=`
    <div class="wiring-summary">
      <div><span class="eyebrow">REFERENCE NETLIST · ${wires.length} CONNECTIONS</span><h2>ESP32 38pin + ESP32 Display</h2><p>จอคุยกับบอร์ดหลักผ่าน Bluetooth (ไม่มีสายสัญญาณ) · บอร์ดหลักควบคุม Servo, มอเตอร์ L298N, Load Cell, ปุ่ม และรับสถานะ E‑Stop · กดที่ ESP32 ทั้งสองตัวเพื่อดู/แก้โค้ด</p></div>
      <div class="wiring-summary-stats"><span><strong>2</strong> ESP32</span><span><strong>${boards.length}</strong> อุปกรณ์/จุดต่อ</span><span><strong>${wires.length}</strong> สายอ้างอิง</span></div>
    </div>
    <div class="wiring-alert"><span>${icon('info')}</span><div><strong>E‑Stop ตัดไฟ 12V ของมอเตอร์ทางฮาร์ดแวร์ ไม่ต้องมี relay</strong><p>ขา NC อนุกรมกับ 12V ของ L298N ส่วนขา NO ต่อ GPIO27 ให้ซอฟต์แวร์หยุด Servo และขึ้นหน้า EMERGENCY STOP ข้อจำกัด: Servo ไม่มีฮาร์ดแวร์ตัดไฟ ถ้า ESP32 แครช Servo อาจค้างตำแหน่งเดิมจนกว่าจะรีเซ็ต</p></div></div>
    <div class="wiring-filterbar">
      <div class="wire-groups" role="group" aria-label="เลือกชุดสาย">${groups.map((g,i)=>`<label style="--wire-color:${g.color}"><input type="checkbox" data-wire-group="${g.id}" ${i===0?'checked':''}><span></span>${g.name}<small>${wires.filter(w=>w.group===g.id).length}</small></label>`).join('')}</div>
      <div class="wiring-filter-actions"><button id="wire-all">แสดงทั้งหมด</button><button id="wire-none">ซ่อนทั้งหมด</button><button id="wire-export">${icon('download')} CSV</button></div>
    </div>
    <div class="wiring-layout">
      <section class="wiring-viewer-card">
        <div class="wiring-viewer-head"><div><span class="status-dot"></span> WIRING BOARD <small id="wire-count">0 สาย</small></div><div class="wiring-view-tools"><button id="wire-home" aria-label="คืนมุมมอง">${icon('scan')}</button><button id="wire-focus" aria-label="ซูมสายที่เลือก">${icon('focus')}</button><button id="wire-zoom-in" aria-label="ขยาย">${icon('zoom-in')}</button><button id="wire-zoom-out" aria-label="ย่อ">${icon('zoom-out')}</button></div></div>
        <div id="wiring-canvas" class="wiring-canvas"><div class="wiring-help">ลากเพื่อหมุน · คลิกขวาแล้วลากเพื่อเลื่อน · เลื่อนเมาส์เพื่อซูม · กดสายหรือขาเพื่อดูรายละเอียด</div></div>
      </section>
      <aside class="wire-detail" id="wire-detail" aria-live="polite"></aside>
    </div>
    <section class="board-strip"><div class="board-strip-head"><div><span class="eyebrow">CHOSEN BOARDS</span><h2>บอร์ดที่ใช้ในแบบอ้างอิง</h2></div><small>กดเพื่อดูเหตุผลและเงื่อนไขของบอร์ด</small></div><div class="board-choice-grid">${mainBoards.map(id=>{const b=boards.find(x=>x.id===id);return `<button data-board-id="${id}"><span>${b.name}</span><strong>${b.model}</strong>${icon('arrow-up-right')}</button>`}).join('')}</div></section>
    <section class="wire-table-card">
      <div class="wire-table-head"><div><span class="eyebrow">CONNECTION SCHEDULE</span><h2>ตารางสายจากต้นทางถึงปลายทาง</h2></div><label>${icon('search')}<input id="wire-search" type="search" placeholder="ค้นหา W001, GPIO, Servo, 5V..." aria-label="ค้นหาสาย"></label></div>
      <div class="wire-table-scroll"><table><thead><tr><th>สาย</th><th>วงจร</th><th>จากอุปกรณ์ / ขา</th><th>ไปอุปกรณ์ / ขา</th><th>ระดับ</th><th>สถานะ</th></tr></thead><tbody id="wire-rows"></tbody></table></div>
    </section>
    <section class="sources-card wiring-sources"><span class="eyebrow">PINOUT SOURCES</span><div>${Object.values(wiringSources).map(([name,url])=>`<a href="${url}" target="_blank" rel="noopener noreferrer">${name}${icon('arrow-up-right')}</a>`).join('')}</div></section>`;

  refreshIcons();
  const active=new Set(['power']);
  let selected=null;
  const $=s=>host.querySelector(s);
  let scene;
  try{scene=createWiringScene($('#wiring-canvas'),selectWire,id=>{showBoard(id);if(boards.find(b=>b.id===id)?.hasCode)openCode?.(id);});}catch(error){
    const notice=document.createElement('div');notice.className='webgl-error';notice.textContent='ไม่สามารถเปิดฉากเดินสาย 3D ได้ แต่ตารางสายด้านล่างยังใช้งานได้';$('#wiring-canvas').prepend(notice);console.error(error);
  }

  function visibleWires(){return wires.filter(w=>active.has(w.group));}
  function renderRows(){
    const query=$('#wire-search').value.trim().toLocaleLowerCase('th');
    const list=visibleWires().filter(w=>!query||[w.id,w.label,w.voltage,w.note,endpoint(w.from).label,endpoint(w.to).label].join(' ').toLocaleLowerCase('th').includes(query));
    $('#wire-rows').innerHTML=list.map(w=>`<tr data-wire-id="${w.id}" class="${w.id===selected?'selected':''}"><td><button><span style="--wire-color:${groups.find(g=>g.id===w.group).color}"></span>${w.id}</button></td><td>${groups.find(g=>g.id===w.group).name}</td><td>${endpoint(w.from).label}</td><td>${endpoint(w.to).label}</td><td>${w.voltage}</td><td><span class="wire-status ${statusClass[w.status]}">${statusText[w.status]}</span></td></tr>`).join('');
    $('#wire-count').textContent=`${visibleWires().length} สายที่แสดง`;
    $('#wire-rows').querySelectorAll('tr').forEach(row=>row.onclick=()=>selectWire(row.dataset.wireId));
  }
  function renderDetail(){
    if(!selected){
      $('#wire-detail').innerHTML=`<div class="wire-empty">${icon('cable')}<span class="eyebrow">SELECT A CONNECTION</span><h2>เลือกสายเพื่อดูสองปลาย</h2><p>กดเส้นในฉาก 3D หรือกดแถวในตาราง ระบบจะแสดงบอร์ด ขา ระดับแรงดัน และเงื่อนไขของสายนั้น</p><div class="wire-legend">${groups.map(g=>`<span><i style="background:${g.color}"></i>${g.name}</span>`).join('')}</div></div>`;refreshIcons();return;
    }
    const w=wires.find(w=>w.id===selected),from=endpoint(w.from),to=endpoint(w.to),group=groups.find(g=>g.id===w.group);
    $('#wire-detail').innerHTML=`<div class="wire-detail-top"><span class="wire-number" style="--wire-color:${group.color}">${w.id}</span><span class="wire-status ${statusClass[w.status]}">${statusText[w.status]}</span></div><small>${group.name} · ${w.type.toUpperCase()}</small><h2>${w.label}</h2><div class="wire-route"><div><span>FROM</span><strong>${from.board.name}</strong><b>${from.board.id==='esp'?from.pin.id+' · ':''}${from.pin.name||from.pin.label}</b></div>${icon('arrow-down')}<div><span>TO</span><strong>${to.board.name}</strong><b>${to.board.id==='esp'?to.pin.id+' · ':''}${to.pin.name||to.pin.label}</b></div></div><div class="voltage-card"><span>ระดับ / ราง</span><strong>${w.voltage}</strong></div><p>${w.note||'ต่อปลายทั้งสองตามป้ายกำกับและตรวจ continuity ก่อนจ่ายไฟ'}</p><div class="group-description">${group.desc}</div><label class="only-selected"><input id="wire-only" type="checkbox"> แสดงเฉพาะสายนี้ใน 3D</label><button class="outline-button focus-selected">${icon('focus')} ซูมไปยังสายนี้</button>`;
    refreshIcons();
    $('#wire-only').onchange=e=>scene?.only(e.target.checked);
    $('.focus-selected').onclick=()=>scene?.focus();
  }
  function selectWire(id){
    const wire=wires.find(w=>w.id===id);if(!wire)return;
    if(!active.has(wire.group)){active.add(wire.group);const box=host.querySelector(`[data-wire-group="${wire.group}"]`);if(box)box.checked=true;}
    selected=id;scene?.setVisible(visibleWires().map(w=>w.id));scene?.select(id);renderRows();renderDetail();
    if(innerWidth<900)$('#wire-detail').scrollIntoView({behavior:'smooth',block:'nearest'});
  }
  function showBoard(id){
    const b=boards.find(x=>x.id===id);if(!b)return;
    selected=null;scene?.select(null);
    $('#wire-detail').innerHTML=`<div class="wire-detail-top"><span class="wire-number board">BOARD</span><span class="wire-status ok">${b.hasCode?'มีโค้ด':'รุ่นอ้างอิง'}</span></div><small>${b.model}</small><h2>${b.name}</h2><p>${b.notes}</p><div class="pin-mini-list">${[...b.left,...b.right].map(p=>`<button data-port-ref="${b.id}.${p.id}"><span>${p.id}</span>${p.name||p.label}</button>`).join('')}</div>${b.hasCode?`<button class="primary-button open-code" data-code-id="${b.id}">${icon('code')} ดู/แก้ไขโค้ดของบอร์ดนี้</button>`:''}${b.source?`<a class="outline-button board-source" href="${wiringSources[b.source][1]}" target="_blank" rel="noopener noreferrer">${icon('arrow-up-right')} เปิดเอกสาร pinout</a>`:''}`;
    refreshIcons();
    $('#wire-detail').querySelectorAll('[data-code-id]').forEach(button=>button.onclick=()=>openCode?.(button.dataset.codeId));
    $('#wire-detail').querySelectorAll('[data-port-ref]').forEach(button=>button.onclick=()=>{const wire=wires.find(w=>active.has(w.group)&&(w.from===button.dataset.portRef||w.to===button.dataset.portRef));if(wire)selectWire(wire.id);else notify('ขานี้ไม่มีสายอยู่ในชุดวงจรที่กำลังแสดง');});
  }
  function sync(){selected=null;scene?.only(false);scene?.setVisible(visibleWires().map(w=>w.id));renderRows();renderDetail();}
  host.querySelectorAll('[data-wire-group]').forEach(input=>input.onchange=()=>{input.checked?active.add(input.dataset.wireGroup):active.delete(input.dataset.wireGroup);sync();});
  $('#wire-all').onclick=()=>{groups.forEach(g=>active.add(g.id));host.querySelectorAll('[data-wire-group]').forEach(i=>i.checked=true);sync();};
  $('#wire-none').onclick=()=>{active.clear();host.querySelectorAll('[data-wire-group]').forEach(i=>i.checked=false);sync();};
  $('#wire-home').onclick=()=>scene?.home();$('#wire-focus').onclick=()=>scene?.focus();$('#wire-zoom-in').onclick=()=>scene?.zoom(1.3);$('#wire-zoom-out').onclick=()=>scene?.zoom(.77);
  $('#wire-search').oninput=renderRows;
  $('#wire-export').onclick=()=>{const url=URL.createObjectURL(new Blob([connectionCSV()],{type:'text/csv;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download='verdant-wiring-netlist-v2.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notify(`บันทึกตารางสาย ${wires.length} รายการเป็น CSV แล้ว`);};
  host.querySelectorAll('[data-board-id]').forEach(button=>button.onclick=()=>showBoard(button.dataset.boardId));
  let animation=0;function frame(now){if(!host.hidden)scene?.render(now);animation=requestAnimationFrame(frame);}animation=requestAnimationFrame(frame);
  sync();
  return {refresh(){scene?.render(performance.now());},dispose(){cancelAnimationFrame(animation);scene?.dispose();}};
}
