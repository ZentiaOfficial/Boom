import test from 'node:test';
import assert from 'node:assert/strict';
import { boards, wires, groups, endpoint, connectionCSV } from '../src/wiring-data.js';

const findWire=(from,to)=>wires.find(w=>w.from===from&&w.to===to);

test('netlist matches the real equipment: stable counts, unique IDs and valid endpoints',()=>{
  assert.equal(boards.length,15);
  assert.equal(wires.length,49);
  assert.equal(new Set(boards.map(b=>b.id)).size,boards.length);
  assert.equal(new Set(wires.map(w=>w.id)).size,wires.length);
  for(const wire of wires){
    assert.ok(endpoint(wire.from),`${wire.id} has invalid source ${wire.from}`);
    assert.ok(endpoint(wire.to),`${wire.id} has invalid destination ${wire.to}`);
    assert.notEqual(wire.from,wire.to,`${wire.id} connects a pin to itself`);
  }
  assert.deepEqual(groups.map(g=>[g.id,wires.filter(w=>w.group===g.id).length]),[
    ['power',6],['servo',18],['motor',5],['estop',4],['buttons',8],['weight',8],
  ]);
});

test('only the devices in the README equipment table are present',()=>{
  assert.deepEqual(boards.map(b=>b.id).sort(),
    ['buttons','cell','driver','esp','estop','hmi','hx','motor','pca','psu','servo0','servo1','servo2','servo3','xl'].sort());
  for(const removed of ['safe','k1','buckC','buckA','busC','busA','ground','rstop','rseries','rpwm','reset'])
    assert.equal(boards.some(b=>b.id===removed),false,`${removed} should be gone`);
  assert.equal(groups.some(g=>g.id==='uart'||g.id==='safety'),false);
});

test('display has power only (Bluetooth link), and the two ESP32 boards expose their code',()=>{
  const hmiWires=wires.filter(w=>w.from.startsWith('hmi.')||w.to.startsWith('hmi.'));
  assert.deepEqual(hmiWires.map(w=>w.to).sort(),['hmi.GND','hmi.VIN-5V']);
  assert.ok(findWire('esp.J2.19','hmi.VIN-5V'));
  assert.deepEqual(boards.filter(b=>b.hasCode).map(b=>b.id).sort(),['esp','hmi']);
});

test('power: XL4016 feeds ESP32 5V and PCA9685 V+, motor 12V bypasses it through the E-Stop NC contact',()=>{
  assert.ok(findWire('psu.+12V','xl.IN+'));
  assert.ok(findWire('xl.OUT+','esp.J2.19'));
  assert.ok(findWire('xl.OUT+','pca.V+'));
  assert.ok(findWire('psu.+12V','estop.NC-1'));
  assert.ok(findWire('estop.NC-2','driver.12V'));
  assert.equal(wires.some(w=>w.from==='psu.+12V'&&w.to==='driver.12V'),false,'12V must not reach L298N except via E-Stop NC');
  assert.equal(wires.some(w=>w.to==='esp.J2.19'&&w.from.startsWith('psu.')),false);
});

test('GPIO map matches the firmware',()=>{
  const pin=(ref)=>endpoint(ref).pin.name;
  const io=(a,b)=>{const w=findWire(a,b)||findWire(b,a);return w&&pin(w.from.startsWith('esp.')?w.from:w.to);};
  assert.equal(io('esp.J3.3','pca.SDA'),'IO22');
  assert.equal(io('esp.J3.2','pca.SCL'),'IO23');
  assert.equal(io('esp.J3.9','driver.IN1'),'IO18');
  assert.equal(io('esp.J3.8','driver.IN2'),'IO19');
  assert.equal(io('esp.J3.12','hx.DT'),'IO16');
  assert.equal(io('esp.J3.11','hx.SCK'),'IO17');
  assert.equal(io('esp.J2.11','estop.NO-1'),'IO27');
  for(const [n,gpio] of [[1,'IO32'],[2,'IO33'],[3,'IO25'],[4,'IO26']]){
    const w=wires.find(w=>w.to===`buttons.${n}-NO`);assert.equal(pin(w.from),gpio);
  }
  for(let i=0;i<4;i++) assert.ok(findWire(`pca.CH${[0,4,8,12][i]}`,`servo${i}.SIG`));
});

test('CSV export contains a BOM, one header and all connections',()=>{
  const csv=connectionCSV();
  assert.equal(csv.charCodeAt(0),0xFEFF);
  const rows=csv.slice(1).split('\r\n');
  assert.equal(rows.length,wires.length+1);
  assert.match(rows[0],/^"Wire","Group","From","To"/);
  assert.match(rows.at(-1),new RegExp(`^"W${String(wires.length).padStart(3,'0')}"`));
});
