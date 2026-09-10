export const recipes = [
  { id: 'balanced', name: 'สมดุล', ratio: [1, 1, 1], subtitle: 'วัตถุดิบเท่ากันทั้ง 3 ช่อง' },
  { id: 'nitrogen', name: 'เน้นวัตถุดิบ N', ratio: [2, 1, 1], subtitle: 'เพิ่มสัดส่วนจากช่อง N' },
  { id: 'potassium', name: 'เน้นวัตถุดิบ K', ratio: [1, 1, 2], subtitle: 'เพิ่มสัดส่วนจากช่อง K' },
];
export const phases = ['idle', 'doseN', 'doseP', 'doseK', 'settle', 'mix', 'ready', 'discharge', 'complete', 'emergency'];
export const phaseLabels = { idle: 'พร้อมเริ่มทดลอง', doseN: 'กำลังจ่ายวัตถุดิบ N', doseP: 'กำลังจ่ายวัตถุดิบ P', doseK: 'กำลังจ่ายวัตถุดิบ K', settle: 'รอค่าน้ำหนักนิ่ง', mix: 'กำลังผสมปุ๋ย', ready: 'ผสมเสร็จ · พร้อมปล่อย', discharge: 'กำลังปล่อยปุ๋ย', complete: 'จบรอบการทดลอง', emergency: 'หยุดฉุกเฉินแล้ว' };
export class Simulation {
  constructor() { this.recipe = recipes[0]; this.batch = 1; this.speed = 1; this.reset(); }
  get targets() { const sum = this.recipe.ratio.reduce((a,b) => a+b,0); return this.recipe.ratio.map(v => this.batch * v / sum); }
  get locked() { return this.phase !== 'idle'; }
  get motor() { return this.phase === 'mix'; }
  get valve() { return ['doseN', 'doseP', 'doseK'].indexOf(this.phase); }
  get active() { return ['doseN','doseP','doseK','settle','mix','discharge'].includes(this.phase); }
  configure(recipeId, batch) {
    if(this.locked || !recipes.some(r=>r.id===recipeId) || ![.5,1,2].includes(Number(batch))) return false;
    this.recipe = recipes.find(r=>r.id===recipeId); this.batch=Number(batch); return true;
  }
  reset() { this.phase='idle'; this.elapsed=0; this.weight=0; this.output=0; this.dosed=[0,0,0]; this.totalTime=0; this.history=[]; }
  transition(phase) { this.phase=phase; this.elapsed=0; this.history.push({phase, at:this.totalTime}); }
  start() { if(this.phase!=='idle') return false; this.transition('doseN'); return true; }
  emergency() { if(this.phase === 'emergency') return; this.transition('emergency'); }
  discharge() { if(this.phase!=='ready') return false; this.transition('discharge'); return true; }
  tick(dt) {
    if(!this.active || !Number.isFinite(dt) || dt<=0) return;
    let remaining=dt*this.speed;
    while(remaining>0 && this.active){
      const duration = this.phase==='mix'?6:this.phase==='settle'?1:this.phase==='discharge'?3:2.5;
      const step=Math.min(remaining,duration-this.elapsed);
      this.elapsed+=step; this.totalTime+=step; remaining-=step;
      const fraction=Math.min(1,this.elapsed/duration);
      if(this.valve>=0) { this.dosed[this.valve]=this.targets[this.valve]*fraction; this.weight=this.dosed.reduce((a,b)=>a+b,0); }
      if(this.phase==='discharge'){ this.output=this.batch*fraction; this.weight=this.batch-this.output; }
      if(this.elapsed>=duration){
        const next={doseN:'doseP',doseP:'doseK',doseK:'settle',settle:'mix',mix:'ready',discharge:'complete'}[this.phase];
        this.transition(next);
      }
    }
  }
}
