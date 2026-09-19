import { firmware, firmwareChangedEvent } from './firmware.js';

const storageKey = id => `verdant:code:${id}`;
function readSaved(id) { try { return localStorage.getItem(storageKey(id)); } catch { return null; } }
function writeSaved(id, text) { try { localStorage.setItem(storageKey(id), text); return true; } catch { return false; } }
function clearSaved(id) { try { localStorage.removeItem(storageKey(id)); } catch { /* storage unavailable */ } }

// Editable code viewer. There is no backend: edits live in this browser
// (localStorage) and can be copied or downloaded to upload from the Arduino IDE.
export function setupCodeViewer({ icon, refreshIcons, notify }) {
  const dialog = document.createElement('dialog');
  dialog.id = 'code-dialog';
  dialog.className = 'code-dialog';
  dialog.innerHTML = `
    <div class="code-head">
      <div><span class="eyebrow">DEVICE FIRMWARE</span><h2 id="code-title"></h2><p id="code-role"></p></div>
      <button class="dialog-close icon-button" aria-label="ปิดโค้ด">${icon('x')}</button>
    </div>
    <div class="code-tabs" role="tablist" aria-label="เลือกบอร์ด">${Object.values(firmware).map(f => `<button role="tab" data-code-tab="${f.id}">${f.name}<small>${f.file}</small></button>`).join('')}</div>
    <div class="code-toolbar">
      <button id="code-calibrate">${icon('crosshair')} ไปที่ค่า Calibrate</button>
      <button id="code-copy">${icon('copy')} คัดลอก</button>
      <button id="code-download">${icon('download')} ดาวน์โหลด .ino</button>
      <button id="code-reset">${icon('rotate-ccw')} คืนค่าต้นฉบับ</button>
      <span id="code-badge" class="code-badge" hidden>แก้ไขแล้ว</span>
    </div>
    <textarea id="code-editor" spellcheck="false" autocapitalize="off" autocomplete="off" wrap="off" aria-label="โค้ดของอุปกรณ์ แก้ไขได้"></textarea>
    <div class="code-status"><span id="code-pos"></span><span>แก้ไขได้ในเบราว์เซอร์นี้เท่านั้น ไม่ได้อัปโหลดเข้าบอร์ดเอง — คัดลอกหรือดาวน์โหลดไปอัปโหลดผ่าน Arduino IDE</span></div>`;
  document.body.append(dialog);

  const $ = s => dialog.querySelector(s);
  const editor = $('#code-editor');
  let current = null;

  function isModified() { return editor.value !== firmware[current].source; }
  function updateStatus() {
    const before = editor.value.slice(0, editor.selectionStart);
    const line = before.split('\n').length;
    const col = before.length - before.lastIndexOf('\n');
    $('#code-pos').textContent = `บรรทัด ${line} · คอลัมน์ ${col} · ${editor.value.split('\n').length} บรรทัด`;
    $('#code-badge').hidden = !isModified();
  }
  function load(id) {
    current = id;
    const f = firmware[id];
    editor.value = readSaved(id) ?? f.source;
    $('#code-title').textContent = f.name;
    $('#code-role').textContent = f.role;
    $('#code-calibrate').hidden = !f.calibrationMarker;
    dialog.querySelectorAll('[data-code-tab]').forEach(b => {
      const on = b.dataset.codeTab === id;
      b.classList.toggle('active', on);
      b.setAttribute('aria-selected', String(on));
    });
    editor.scrollTop = 0;
    editor.setSelectionRange(0, 0);
    updateStatus();
  }
  function save() {
    if (isModified()) writeSaved(current, editor.value); else clearSaved(current);
    window.dispatchEvent(new CustomEvent(firmwareChangedEvent));
  }
  function jumpToCalibration() {
    const marker = firmware[current].calibrationMarker;
    const index = marker ? editor.value.indexOf(marker) : -1;
    if (index < 0) { notify('ไม่พบค่า Calibrate ในโค้ดที่แก้ไข'); return; }
    const line = editor.value.slice(0, index).split('\n').length;
    const lineHeight = parseFloat(getComputedStyle(editor).lineHeight);
    editor.focus();
    editor.setSelectionRange(index, editor.value.indexOf('};', index) + 2);
    editor.scrollTop = Math.max(0, (line - 4) * lineHeight);
    updateStatus();
  }

  editor.addEventListener('input', () => { save(); updateStatus(); });
  editor.addEventListener('keyup', updateStatus);
  editor.addEventListener('click', updateStatus);
  editor.addEventListener('keydown', e => {
    if (e.key === 'Tab') { // keep focus in the editor and indent like an IDE
      e.preventDefault();
      editor.setRangeText('  ', editor.selectionStart, editor.selectionEnd, 'end');
      editor.dispatchEvent(new Event('input'));
    }
  });
  dialog.querySelectorAll('[data-code-tab]').forEach(b => b.onclick = () => load(b.dataset.codeTab));
  $('#code-calibrate').onclick = jumpToCalibration;
  $('#code-copy').onclick = async () => {
    try { await navigator.clipboard.writeText(editor.value); notify('คัดลอกโค้ดแล้ว'); }
    catch { editor.select(); notify('เบราว์เซอร์ไม่อนุญาตให้คัดลอกอัตโนมัติ กด Ctrl/⌘+C ได้เลย'); }
  };
  $('#code-download').onclick = () => {
    const url = URL.createObjectURL(new Blob([editor.value], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url; link.download = firmware[current].file; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  $('#code-reset').onclick = () => {
    if (!isModified()) { notify('โค้ดตรงกับต้นฉบับอยู่แล้ว'); return; }
    if (!confirm('ทิ้งการแก้ไขทั้งหมดของไฟล์นี้และกลับไปใช้โค้ดต้นฉบับ?')) return;
    clearSaved(current);
    window.dispatchEvent(new CustomEvent(firmwareChangedEvent));
    load(current);
    notify('คืนค่าโค้ดต้นฉบับแล้ว');
  };
  dialog.querySelector('.dialog-close').onclick = () => dialog.close();
  dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });
  refreshIcons();

  return {
    has: id => Boolean(firmware[id]),
    open(id) {
      if (!firmware[id]) return;
      load(id);
      if (!dialog.open) dialog.showModal();
    },
  };
}
