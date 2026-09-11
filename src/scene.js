import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export function createScene(host, onSelect, onPanelAction) {
  const scene = new THREE.Scene();
  scene.background=new THREE.Color('#e9eae3');
  const camera = new THREE.PerspectiveCamera(34, 1, .1, 100);
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
  renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFShadowMap;
  renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=.9;
  host.prepend(renderer.domElement);
  renderer.domElement.setAttribute('aria-label','โมเดลสามมิติกล่องผสมปุ๋ย ลากเพื่อหมุน เลื่อนเพื่อซูม ใช้ปุ่มมุมมองแทนได้');
  const pmrem=new THREE.PMREMGenerator(renderer); const room=new RoomEnvironment();
  const environment=pmrem.fromScene(room,.04); scene.environment=environment.texture; room.dispose(); pmrem.dispose();
  const controls=new OrbitControls(camera,renderer.domElement);
  controls.enableDamping=true; controls.dampingFactor=.07;
  controls.minDistance=7; controls.maxDistance=25; controls.maxPolarAngle=Math.PI*.52;
  controls.target.set(-.55,2.8,0); controls.enablePan=false;
  const hemi=new THREE.HemisphereLight(0xffffff,0x8a9386,.8);scene.add(hemi);
  const sun=new THREE.DirectionalLight(0xfff7df,2.4);sun.position.set(-5,10,7);sun.castShadow=true;
  sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-10;sun.shadow.camera.right=10;sun.shadow.camera.top=10;sun.shadow.camera.bottom=-10;sun.shadow.normalBias=.03;scene.add(sun);
  const fill=new THREE.DirectionalLight(0xd9e6ff,1.2);fill.position.set(6,5,-3);scene.add(fill);
  const mat=(color,metalness=0,roughness=.5,extra={})=>new THREE.MeshStandardMaterial({color,metalness,roughness,...extra});
  const green=mat('#4e685b',.5,.34), edge=mat('#2d463b',.5,.32), silver=mat('#bac4bf',.8,.26), dark=mat('#202d29',.3,.4), black=mat('#181e1e',.1,.5), cream=mat('#dce0d4',.25,.5), brass=mat('#bdb494',.65,.3), pcb=mat('#234f42',.2,.6), blue=mat('#284f80',.4,.4);
  const clear=mat('#e4f0e5',.05,.15,{transparent:true,opacity:.22,depthWrite:false,side:THREE.DoubleSide});
  const objects=[]; const model=new THREE.Group();scene.add(model);
  function mesh(geo,material,x,y,z,parent=model,id){const m=new THREE.Mesh(geo,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);if(id){m.userData.id=id;objects.push(m);}return m;}
  function box(w,h,d,x,y,z,m=green,p=model,id){return mesh(new THREE.BoxGeometry(w,h,d),m,x,y,z,p,id);}
  function cyl(rt,rb,h,x,y,z,m=silver,p=model,id){return mesh(new THREE.CylinderGeometry(rt,rb,h,48,1,false),m,x,y,z,p,id);}
  function line(points,color,parent=model,r=.018){const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));return mesh(new THREE.TubeGeometry(curve,32,r,6,false),mat(color),0,0,0,parent);}
  function label(text,w,h,bg='#284d3d',fg='#eef4e6'){
    const c=document.createElement('canvas'); c.width=512;c.height=128;const ctx=c.getContext('2d');ctx.fillStyle=bg;ctx.fillRect(0,0,512,128);ctx.font='600 60px Manrope, sans-serif';ctx.fillStyle=fg;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,66);
    const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;
    return new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:t}));
  }
  const ground=mesh(new THREE.PlaneGeometry(200,200),mat('#e8e9e2'),0,-.2,0,scene);ground.rotation.x=-Math.PI/2;ground.castShadow=false;
  const grid=new THREE.GridHelper(24,48,'#c8cec2','#d8dcd1');grid.position.y=-.19;grid.material.transparent=true;grid.material.opacity=.65;scene.add(grid);
  // 40 x 57 x 20 cm envelope. One scene unit = 10 cm.
  const shell=new THREE.Group(); model.add(shell);
  box(4,5.7,.09,0,2.85,-1,green,shell);
  const leftWall=box(.09,5.7,2,-2,2.85,0,green,shell);
  box(.09,5.7,2,2,2.85,0,green,shell);
  box(4,.09,2,0,5.7,0,green,shell);box(4,.12,2,0,.04,0,green,shell);
  box(3.75,5.4,.04,0,2.85,-.91,cream,shell);
  [-1.94,1.94].forEach(x=>box(.09,5.65,.12,x,2.85,1,edge,shell));
  [0,5.67].forEach(y=>box(4,.1,.12,0,y,1,edge,shell));
  for(const x of [-1.6,1.6])for(const z of [-.7,.7]){cyl(.13,.16,.2,x,-.07,z,black,shell);}
  for(let y=.5;y<2;y+=.18)box(.014,.045,.75,2.052,y,0,black,shell);
  for(const x of [-1.7,1.7])for(const y of [.3,5.4]){const s=cyl(.045,.045,.025,x,y,-.865,silver,shell);s.rotation.x=Math.PI/2;}
  const doorPivot=new THREE.Group();doorPivot.position.set(-2,0,1.04);model.add(doorPivot);
  box(4,5.65,.10,2,2.85,0,green,doorPivot,'panel');
  box(3.7,5.35,.04,2,2.85,-.073,cream,doorPivot);
  box(2.05,1.58,.18,2,3.91,-.16,dark,doorPivot,'panel');
  box(.50,.16,.04,2,4.61,-.265,pcb,doorPivot,'panel');
  for(const x of [1.2,2,2.8])cyl(.11,.11,.25,x,2.7,-.22,dark,doorPivot,'panel').rotation.x=Math.PI/2;
  line([[2,3.9,-.28],[2.55,3.7,-.22],[2.55,2.4,-.20],[1.1,2.4,-.19],[.12,1.9,-.17]],'#687365',doorPivot,.035);
  box(.12,.58,.12,3.7,2.5,.11,silver,doorPivot,'panel');
  for(const y of [1,4.8])cyl(.1,.1,.44,0,y,0,silver,doorPivot);
  const brand=label('VERDANT',1.5,.30,'#4e685b');brand.position.set(2,5,.061);doorPivot.add(brand);
  box(2.20,1.73,.16,2,3.91,.1,dark,doorPivot,'panel');
  const lcd=document.createElement('canvas');lcd.width=768;lcd.height=576;const lcdctx=lcd.getContext('2d');const lcdtex=new THREE.CanvasTexture(lcd);lcdtex.colorSpace=THREE.SRGBColorSpace;
  mesh(new THREE.PlaneGeometry(1.94,1.46),new THREE.MeshBasicMaterial({map:lcdtex}),2,3.91,.19,doorPivot,'panel');
  const panelButtons=[];
  function panelButton(x,y,color,action){const m=cyl(.16,.16,.14,x,y,.16,mat(color,.25,.35),doorPivot,'panel');m.rotation.x=Math.PI/2;m.userData.action=action;panelButtons.push(m);const ring=cyl(.20,.20,.04,x,y,.095,silver,doorPivot);ring.rotation.x=Math.PI/2;}
  panelButton(1.2,2.7,'#6d9d74','recipe0');panelButton(2,2.7,'#d9b265','recipe1');panelButton(2.8,2.7,'#6f98b7','recipe2');
  panelButton(1.2,1.85,'#72a76a','start');panelButton(2,1.85,'#79838a','discharge');
  const ering=cyl(.3,.3,.06,2.85,1.85,.1,mat('#e5b834'),doorPivot);ering.rotation.x=Math.PI/2;
  panelButton(2.85,1.85,'#c64233','emergency');panelButtons.at(-1).scale.set(1.35,1.35,1.35);
  const noTouch=label('TOUCH HMI + PHYSICAL E-STOP',2.5,.15,'#4e685b','#cbd9c9');noTouch.position.set(2,1.2,.06);doorPivot.add(noTouch);
  const tankGroup=new THREE.Group();model.add(tankGroup);
  const tankColors=['#8aa77b','#d0a765','#7e9eaf']; const valves=[]; const hopperCenters=[];
  for(let i=0;i<3;i++){
    const x=(i-1)*1.13;const group=new THREE.Group();tankGroup.add(group);
    cyl(.47,.47,1.16,x,4.65,0,clear,group,'hoppers');
    cyl(.48,.48,.10,x,5.27,0,silver,group,'hoppers');
    cyl(.36,.36,.08,x,5.35,0,dark,group,'hoppers');
    cyl(.47,.09,.62,x,3.76,0,silver,group,'hoppers');
    cyl(.465,.465,.65,x,4.43,0,mat(tankColors[i],.05,.85),group,'hoppers');
    // Individual granules make the material legible through the clear hopper.
    const inst=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.046,0),mat(tankColors[i],0,.8),120);
    const dummy=new THREE.Object3D();
    for(let n=0;n<120;n++){const theta=n*2.39996;const rad=.42*Math.sqrt((n+.5)/120);dummy.position.set(x+Math.cos(theta)*rad,4.77+Math.sin(n*3.7)*.025,Math.sin(theta)*rad);dummy.rotation.set(n,n*.7,0);dummy.updateMatrix();inst.setMatrixAt(n,dummy.matrix);}group.add(inst);
    const tag=label(['N','P','K'][i],.43,.28,tankColors[i],'#ffffff');tag.position.set(x,4.8,.475);group.add(tag);
    box(.31,.32,.25,x+.25,3.42,.20,blue,group,'servo');
    const valve=box(.65,.045,.12,x,3.4,.07,brass,group,'servo');valves.push(valve);
    line([[x,3.4,0],[x*.8,3.15,0],[x*.38,2.98,0]],'#aeb8b2',group,.085);
    hopperCenters.push(new THREE.Vector3(x,4.9,.5));
  }
  box(3.7,.08,.22,0,3.55,-.5,silver,tankGroup);
  const mixingGroup=new THREE.Group();model.add(mixingGroup);
  cyl(.84,.84,.95,-.28,2.45,0,clear,mixingGroup,'mixer');
  cyl(.88,.88,.10,-.28,2.96,0,silver,mixingGroup,'mixer');
  cyl(.85,.85,.10,-.28,1.96,0,silver,mixingGroup,'mixer');
  cyl(.84,.14,.5,-.28,1.68,0,silver,mixingGroup,'mixer');
  cyl(.23,.23,.48,-.28,3.20,-.02,silver,mixingGroup,'mixer');
  cyl(.25,.25,.13,-.28,3.42,-.02,dark,mixingGroup,'mixer');
  const paddle=new THREE.Group();paddle.position.set(-.28,2.45,0);mixingGroup.add(paddle);
  cyl(.045,.045,1.25,0,.08,0,silver,paddle,'mixer');
  for(const y of [-.28,.08]){const b=box(1.25,.13,.22,0,y,0,silver,paddle,'mixer');b.rotation.z=.22;}
  const fillMix=cyl(.78,.78,.01,-.28,2.02,0,mat('#b0af7c',.1,.9),mixingGroup,'mixer');
  box(.34,.34,.28,.12,1.40,.18,blue,mixingGroup,'servo');
  const outlet=box(.53,.045,.13,-.28,1.38,.07,brass,mixingGroup,'servo');valves.push(outlet);
  // An isolated weighing platform: the chamber load is transferred through the cell.
  for(const z of [-.61,.61])box(2.0,.09,.12,-.28,1.52,z,silver,mixingGroup,'loadcell');
  for(const x of [-1.23,.67])box(.12,.09,1.1,x,1.52,0,silver,mixingGroup,'loadcell');
  box(.65,.12,.28,-1,1.39,.36,brass,mixingGroup,'loadcell');
  box(.35,.11,.28,-1.21,1.29,.36,dark,mixingGroup,'loadcell');
  box(.12,1.1,.16,-1.65,.8,.2,silver,mixingGroup);box(.12,1.1,.16,.8,.8,.2,silver,mixingGroup);
  const electrics=new THREE.Group();model.add(electrics);
  // Enclosed electrical bay on right, below hoppers, separated from material flow.
  box(.90,2.55,.11,1.43,1.6,-.60,cream,electrics);
  box(.045,2.55,1.15,.96,1.6,-.05,silver,electrics);
  box(.95,.045,1.15,1.44,2.9,-.05,silver,electrics);
  box(.7,.67,.29,1.43,.78,-.26,silver,electrics,'power');
  for(let y=.58;y<1.05;y+=.09)for(let x=1.2;x<1.72;x+=.1)box(.035,.035,.01,x,y,-.105,black,electrics,'power');
  box(.46,.67,.08,1.43,2.35,-.30,pcb,electrics,'controller');
  box(.3,.32,.03,1.43,2.38,-.245,silver,electrics,'controller');
  box(.25,.16,.02,1.43,2.61,-.24,dark,electrics,'controller');
  for(let y=2.08;y<2.65;y+=.08)for(const x of [1.16,1.7])box(.08,.025,.045,x,y,-.24,brass,electrics,'controller');
  box(.68,.25,.05,1.43,1.84,-.3,pcb,electrics,'controller');
  box(.65,.30,.09,1.43,1.4,-.27,mat('#883f35'),electrics,'driver');
  box(.32,.27,.11,1.43,1.41,-.18,black,electrics,'driver');
  for(const [y,c] of [[.85,'#bb6449'],[1.05,'#344d54'],[1.3,'#c59d52']])line([[1.08,y,-.4],[1.02,y+.1,-.35],[1.02,2.75,-.35],[1.3,2.77,-.25]],c,electrics,.015);
  line([[1.4,1.4,-.15],[1.8,1.6,-.25],[1.8,3.05,-.65],[-.28,3.45,-.3]],'#af754c',model,.021);
  const trayGroup=new THREE.Group();model.add(trayGroup);
  box(1.62,.08,1.30,-.28,.21,.1,cream,trayGroup);
  for(const x of [-1.08,.52])box(.07,.62,1.3,x,.5,.1,cream,trayGroup);
  box(1.62,.62,.06,-.28,.5,-.52,cream,trayGroup);
  box(1.62,.4,.06,-.28,.39,.73,cream,trayGroup);
  const trayFill=box(1.48,.01,1.17,-.28,.28,.1,mat('#aeac79'),trayGroup);
  const trayTag=label('MIX / OUTPUT',1.0,.16,'#dce0d4','#456457');trayTag.position.set(-.28,.43,.766);trayGroup.add(trayTag);
  const partsTag=label('COMPACT MIXER / 01',1.65,.14,'#4e685b','#d2ddc9');partsTag.position.set(.4,5.68,1.069);model.add(partsTag);
  // Particle streams only exist while an individual dosing valve is open.
  const particles=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.037,0),mat('#bcb386'),50);scene.add(particles);particles.visible=false;
  const dummy=new THREE.Object3D();
  let doorOpen=true, exploded=false, autoRotate=false, showLabels=true, lastPanel='';
  let selected=null;let outline=null;let lastState={phase:'idle',weight:0,output:0,motor:false,valve:-1,batch:1,recipe:{ratio:[1,1,1]}};
  const labelEls=Array.from(host.querySelectorAll('.model-label'));
  function resize(){const {width,height}=host.getBoundingClientRect();if(!width||!height)return;camera.aspect=width/height;camera.fov=THREE.MathUtils.radToDeg(2*Math.atan(Math.tan(THREE.MathUtils.degToRad(34)/2)/Math.min(1,camera.aspect/1.1)));camera.updateProjectionMatrix();renderer.setSize(width,height);}
  const observer=new ResizeObserver(resize);observer.observe(host);
  function home(view='perspective') {controls.target.set(-.5,2.8,0);camera.position.set(...(view==='front'?[0,3,16]:view==='back'?[7,5,-14]:view==='top'?[.1,16,.1]:[8.8,6.5,13.8]));controls.update();}
  home();
  const raycaster=new THREE.Raycaster(); const pointer=new THREE.Vector2();let down={x:0,y:0};
  renderer.domElement.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY};});
  renderer.domElement.addEventListener('pointerup',e=>{
    if(Math.hypot(e.clientX-down.x,e.clientY-down.y)>5)return;
    const rect=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);
    // Raycast all visible surfaces, so hidden controls cannot be clicked through the cabinet.
    const hits=raycaster.intersectObject(model,true).filter(h=>h.object.visible && h.object.isMesh && !h.object.material.transparent);
    const hit=hits[0]; if(!hit)return;
    if(hit.object.userData.action)onPanelAction(hit.object.userData.action);
    else if(hit.object.userData.id)onSelect(hit.object.userData.id);
  });
  function updatePanel(s){const key=[s.phase,s.weight.toFixed(2),s.batch,s.recipe.ratio.join(':')].join('|');if(key===lastPanel)return;lastPanel=key;
    lcdctx.fillStyle=s.phase==='emergency'?'#492622':'#102e25';lcdctx.fillRect(0,0,768,576);
    lcdctx.fillStyle='#b7d6a7';lcdctx.font='24px Manrope';lcdctx.fillText('ESP32 HMI  /  MIX CONTROL',35,48);
    lcdctx.fillStyle='#f4f5cf';lcdctx.font='bold 62px Manrope';lcdctx.fillText(s.recipe.ratio.join(' : '),35,132);
    lcdctx.font='22px Manrope';lcdctx.fillText(['N','P','K'].map((name,i)=>name+' '+s.targets[i].toFixed(3)+' kg').join('    '),38,174);
    lcdctx.fillStyle='#92ab89';lcdctx.fillRect(35,204,695,2);
    lcdctx.font='72px Manrope';lcdctx.fillStyle='#edf4df';lcdctx.fillText(s.weight.toFixed(3)+' kg',35,302);
    const touchLabels=['สูตร','สถานะ','น้ำหนัก'];
    touchLabels.forEach((text,i)=>{lcdctx.fillStyle=i===1?'#678b72':'#284b40';lcdctx.fillRect(35+i*225,350,200,70);lcdctx.fillStyle='#edf4df';lcdctx.font='25px IBM Plex Sans Thai';lcdctx.fillText(text,72+i*225,394);});
    lcdctx.font='24px Manrope';lcdctx.fillStyle=s.phase==='emergency'?'#ffaf9c':'#b7d6a7';lcdctx.fillText(s.phase.toUpperCase()+'  /  UART ONLINE',35,518);lcdtex.needsUpdate=true;
  }
  function render(dt,s){if(!host.clientWidth)return;lastState=s;controls.autoRotate=autoRotate;controls.autoRotateSpeed=.7;controls.update();
    const ease=1-Math.exp(-dt*7);
    doorPivot.rotation.y+=((doorOpen?-2.05:0)-doorPivot.rotation.y)*ease;
    tankGroup.position.y+=((exploded?1.0:0)-tankGroup.position.y)*ease;
    electrics.position.x+=((exploded?1.8:0)-electrics.position.x)*ease;
    mixingGroup.position.z+=((exploded?1.8:0)-mixingGroup.position.z)*ease;
    trayGroup.position.z+=((exploded?2.4:0)-trayGroup.position.z)*ease;
    shell.children.forEach(m=>{if(m.material===green)m.visible=!exploded;});
    if(s.motor)paddle.rotation.y+=dt*5;
    valves.forEach((v,i)=>{v.rotation.y+=(((s.valve===i||i===3&&s.phase==='discharge')?Math.PI/2:0)-v.rotation.y)*ease;});
    fillMix.scale.y=Math.max(.001,s.weight/s.batch*.58)/.01;fillMix.position.y=2.02+Math.max(.001,s.weight/s.batch*.58)/2;
    trayFill.scale.y=Math.max(.001,s.output/s.batch*.38)/.01;trayFill.position.y=.26+Math.max(.001,s.output/s.batch*.38)/2;
    particles.visible=s.valve>=0||s.phase==='discharge';
    if(particles.visible){const t=performance.now()/1000;for(let i=0;i<50;i++){const f=(t*1.5+i/50)%1;const v=s.valve;
      dummy.position.set(v>=0?(v-1)*1.13*(1-f*.7):-.28, v>=0?3.39-f*.6+(exploded?1:0):1.37-f*.72,exploded?(v>=0?f*1.8:1.8):0);dummy.position.x+=Math.sin(i*3.4)*.065;dummy.position.z+=Math.cos(i*2.5)*.06;dummy.updateMatrix();particles.setMatrixAt(i,dummy.matrix);}particles.instanceMatrix.needsUpdate=true;}
    updatePanel(s);
    if(outline){outline.update();}
    const anchors=[new THREE.Vector3(1.18,4.85+ tankGroup.position.y,.5),new THREE.Vector3(.6,2.55,mixingGroup.position.z+.7),new THREE.Vector3(1.65+electrics.position.x,1.9,0)];
    labelEls.forEach((el,i)=>{const p=anchors[i].project(camera);el.style.left=`${Math.max(8,Math.min(host.clientWidth-el.offsetWidth-8,(p.x+1)*.5*host.clientWidth))}px`;el.style.top=`${(-p.y+1)*.5*host.clientHeight}px`;el.hidden=!showLabels||!doorOpen||p.z>1;});
    renderer.render(scene,camera);
  }
  return { render, home, get doorOpen(){return doorOpen;}, setDoor(v){doorOpen=v;}, setExploded(v){exploded=v; if(v)doorOpen=true;}, setAuto(v){autoRotate=v;}, setLabels(v){showLabels=v;}, select(id){selected=id;if(outline){scene.remove(outline);outline.geometry.dispose();outline.material.dispose();}const target=id==='hoppers'||id==='servo'?tankGroup:id==='mixer'||id==='loadcell'?mixingGroup:id==='panel'?doorPivot:electrics;outline=new THREE.BoxHelper(target,0xa4b771);scene.add(outline);}, dispose(){observer.disconnect();controls.dispose();renderer.dispose();environment.dispose();}, renderer };
}
