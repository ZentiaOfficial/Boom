import test from 'node:test';
import assert from 'node:assert/strict';
import { boards, wires, groups, endpoint, connectionCSV } from '../src/wiring-data.js';

const findWire=(from,to)=>wires.find(w=>w.from===from&&w.to===to);

test('V2 reference netlist has stable counts, unique IDs and valid endpoints',()=>{
  assert.equal(boards.length,25);
  assert.equal(wires.length,78);
  assert.equal(new Set(boards.map(b=>b.id)).size,boards.length);
  assert.equal(new Set(wires.map(w=>w.id)).size,wires.length);
  for(const wire of wires){
    assert.ok(endpoint(wire.from),`${wire.id} has invalid source ${wire.from}`);
    assert.ok(endpoint(wire.to),`${wire.id} has invalid destination ${wire.to}`);
    assert.notEqual(wire.from,wire.to,`${wire.id} connects a pin to itself`);
  }
  assert.deepEqual(groups.map(g=>[g.id,wires.filter(w=>w.group===g.id).length]),[
    ['uart',2],['servo',17],['weight',9],['motor',7],['buttons',10],['power',13],['safety',20],
  ]);
});

test('HMI and main ESP32 use crossed 3.3V UART on the documented pins',()=>{
  assert.ok(findWire('hmi.IO22-TX','esp.J3.12'));
  assert.ok(findWire('esp.J3.11','hmi.IO27-RX'));
  assert.equal(boards.find(b=>b.id==='esp').right.find(p=>p.id==='J3.12').name,'IO16');
  assert.equal(boards.find(b=>b.id==='esp').right.find(p=>p.id==='J3.11').name,'IO17');
  assert.ok(findWire('busC.OUT','hmi.VIN-5V'));
  assert.ok(findWire('ground.OUT','hmi.GND'));
});

test('ready-made module design removes the former display and level-shifter parts',()=>{
  for(const removed of ['lcd','shift','buffer','decap']) assert.equal(boards.some(b=>b.id===removed),false);
  assert.ok(boards.some(b=>b.id==='hmi'));
  assert.ok(boards.some(b=>b.id==='pca'));
  for(let i=0;i<4;i++) assert.ok(findWire(`pca.CH${i}-SIG`,`servo${i}.SIG`));
});

test('power design keeps control alive while K1 switches motor and servo power',()=>{
  assert.ok(findWire('psu.+12V','buckC.IN+'));
  assert.ok(findWire('buckC.OUT+','busC.IN'));
  assert.ok(findWire('psu.+12V','k1.MAIN-IN+'));
  assert.ok(findWire('k1.MAIN-OUT+','driver.1:VM+'));
  assert.ok(findWire('k1.MAIN-OUT+','buckA.IN+'));
  assert.equal(wires.some(w=>w.from==='k1.MAIN-OUT+'&&w.to==='buckC.IN+'),false);
  assert.equal(wires.some(w=>w.from==='psu.+12V'&&/^(esp|hmi)\./.test(w.to)),false);
});

test('E-stop uses two safety channels and a separate fail-detecting GPIO34 feedback contact',()=>{
  assert.ok(findWire('safe.CH1-OUT','estop.CH1-A'));
  assert.ok(findWire('estop.CH1-B','safe.CH1-RETURN'));
  assert.ok(findWire('safe.CH2-OUT','estop.CH2-A'));
  assert.ok(findWire('estop.CH2-B','safe.CH2-RETURN'));
  assert.equal(wires.filter(w=>w.status==='unresolved').length,12);
  assert.ok(wires.filter(w=>w.status==='unresolved').every(w=>w.group==='safety'));
  assert.ok(findWire('rstop.SENSE','esp.J2.5'));
  assert.ok(findWire('esp.J2.5','rseries.IN'));
  assert.ok(findWire('rseries.OUT','estop.AUX-A'));
  assert.ok(findWire('ground.OUT','estop.AUX-B'));
});

test('CSV export contains a BOM, one header and all V2 connections',()=>{
  const csv=connectionCSV();
  assert.equal(csv.charCodeAt(0),0xFEFF);
  const rows=csv.slice(1).split('\r\n');
  assert.equal(rows.length,wires.length+1);
  assert.match(rows[0],/^"Wire","Group","From","To"/);
  assert.match(rows.at(-1),new RegExp(`^"W${String(wires.length).padStart(3,'0')}"`));
});
