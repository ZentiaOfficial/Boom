// The two sketches are imported straight from Code_Board, so the web always shows
// exactly the code that is in the repository (no second copy to drift).
import mainSource from '../Code_Board/Arduino_IDE/esp32_main_dispenser/esp32_main_dispenser.ino?raw';
import displaySource from '../Code_Board/Arduino_IDE/esp32_touch_hmi_ui/esp32_touch_hmi_ui.ino?raw';

// Keyed by the wiring-board id / studio component id of the device that runs it.
export const firmware = {
  esp: {
    id: 'esp',
    name: 'ESP32 38pin (บอร์ดหลัก)',
    file: 'esp32_main_dispenser.ino',
    role: 'คุม Servo ผ่าน PCA9685, มอเตอร์ L298N, ปุ่ม, E-Stop และ Load Cell เป็นเจ้าของ state และสั่งหน้าจอผ่าน Bluetooth',
    source: mainSource,
    calibrationMarker: 'const float CALIBRATION_OFFSET_G',
  },
  hmi: {
    id: 'hmi',
    name: 'ESP32-2432S028 (จอสัมผัส)',
    file: 'esp32_touch_hmi_ui.ino',
    role: 'หน้าจอ thin client แสดงผลและรับการแตะ ไม่มีตรรกะเครื่องเอง ส่งปุ่มไปบอร์ดหลักผ่าน Bluetooth',
    source: displaySource,
    calibrationMarker: null,
  },
};

// Studio-model component ids that map onto a firmware entry.
export const componentFirmware = { panel: 'hmi', controller: 'esp' };

// The code editor keeps edits in localStorage; the cabinet runs whatever is there.
export const firmwareChangedEvent = 'verdant:firmware-changed';
export function effectiveSource(id) {
  try { return localStorage.getItem(`verdant:code:${id}`) ?? firmware[id].source; }
  catch { return firmware[id].source; }
}
