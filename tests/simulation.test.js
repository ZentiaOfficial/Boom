import test from 'node:test';
import assert from 'node:assert/strict';
import { Simulation, recipes } from '../src/simulation.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
test('all recipes and batch sizes conserve mass through sequential dosing and discharge',()=>{
  for(const recipe of recipes) for(const batch of [.5,1,2]){
    const s=new Simulation();assert.equal(s.configure(recipe.id,batch),true);s.start();
    s.tick(2.5);assert.equal(s.phase,'doseP');near(s.dosed[0],s.targets[0]);near(s.dosed[1],0);
    s.tick(2.5);assert.equal(s.phase,'doseK');near(s.dosed[1],s.targets[1]);
    s.tick(2.5);assert.equal(s.phase,'settle');near(s.weight,batch);assert.equal(s.motor,false);
    s.tick(1);assert.equal(s.motor,true);s.tick(6);assert.equal(s.phase,'ready');assert.equal(s.motor,false);
    s.tick(100);assert.equal(s.phase,'ready');assert.equal(s.output,0);
    s.discharge();s.tick(1.5);near(s.weight+s.output,batch);near(s.output,batch/2);
    s.tick(1.5);assert.equal(s.phase,'complete');near(s.weight,0);near(s.output,batch);
  }
});
test('E-stop latches at each active phase and cannot restart or discharge until reset',()=>{
  for(const t of [0,1,3,6,7.8,10,14.5,15.5]){
    const s=new Simulation();s.start();s.tick(Math.min(t,14.5));if(t>14.5){s.discharge();s.tick(t-14.5);}
    s.emergency();const snapshot=JSON.stringify({dosed:s.dosed,weight:s.weight,output:s.output});
    s.tick(1000);assert.equal(s.phase,'emergency');assert.equal(s.valve,-1);assert.equal(s.motor,false);
    assert.equal(s.start(),false);assert.equal(s.discharge(),false);assert.equal(s.configure('potassium',2),false);
    assert.equal(JSON.stringify({dosed:s.dosed,weight:s.weight,output:s.output}),snapshot);
    s.reset();assert.equal(s.phase,'idle');near(s.weight,0);near(s.output,0);assert.equal(s.start(),true);
  }
});
test('phase transitions preserve excess elapsed time and stop at manual release gate',()=>{
  const a=new Simulation(),b=new Simulation();a.start();b.start();a.tick(12);
  for(let i=0;i<120;i++)b.tick(.1);
  assert.equal(a.phase,b.phase);near(a.elapsed,b.elapsed);near(a.weight,b.weight);
  a.tick(100);assert.equal(a.phase,'ready');near(a.totalTime,14.5);
});
test('invalid configuration, duplicate start and premature discharge cannot mutate a running batch',()=>{
  const s=new Simulation();assert.equal(s.configure('bad',1),false);assert.equal(s.configure('balanced',-1),false);
  assert.equal(s.discharge(),false);s.start();assert.equal(s.start(),false);assert.equal(s.configure('potassium',2),false);
  s.tick(NaN);s.tick(-1);near(s.weight,0);assert.equal(s.recipe.id,'balanced');assert.equal(s.batch,1);
});
test('accelerated time follows the same sequence',()=>{
 const s=new Simulation();s.speed=4;s.start();s.tick(14.5/4);assert.equal(s.phase,'ready');near(s.weight,1);
 assert.deepEqual(s.history.map(e=>e.phase),['doseN','doseP','doseK','settle','mix','ready']);
});
