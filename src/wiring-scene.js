import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { boards,wires,groups,endpoint } from './wiring-data.js';

export function createWiringScene(host,onSelect,onBoard){
 const scene=new THREE.Scene();scene.background=new THREE.Color('#eaf0e7');
 const camera=new THREE.OrthographicCamera(-14,14,10,-10,.1,120);
 const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor('#eaf0e7');
 renderer.domElement.setAttribute('aria-label','แผงเดินสาย 3D กดสายหรือขาเพื่อดูต้นทางและปลายทาง ใช้ตารางสายแทนการคลิกได้');host.prepend(renderer.domElement);
 const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.1;controls.minZoom=.7;controls.maxZoom=9;controls.enablePan=true;controls.screenSpacePanning=true;
 controls.mouseButtons={LEFT:THREE.MOUSE.ROTATE,MIDDLE:THREE.MOUSE.DOLLY,RIGHT:THREE.MOUSE.PAN};
 scene.add(new THREE.HemisphereLight(0xffffff,0x73836b,2.8));const light=new THREE.DirectionalLight(0xfff9e7,2);light.position.set(-6,8,15);scene.add(light);
 const mat=(color)=>new THREE.MeshStandardMaterial({color,roughness:.55,metalness:.15});
 const dark=mat('#203b31'),gold=mat('#c4b06f'),white=mat('#d2dcd0');
 const pcbGroup=new THREE.Group();scene.add(pcbGroup);const pinMeshes=new Map(),positions=new Map(),boardMeshes=new Map(),wireMeshes=new Map(),pickable=[];
 function cube(w,h,d,x,y,z,material,parent=pcbGroup){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);m.position.set(x,y,z);parent.add(m);return m;}
 function textPlane(text,w,h,color='#dce8d0',bg=null){const c=document.createElement('canvas');c.width=1024;c.height=128;const ctx=c.getContext('2d');if(bg){ctx.fillStyle=bg;ctx.fillRect(0,0,c.width,c.height);}ctx.fillStyle=color;ctx.font='500 57px "IBM Plex Sans Thai", Manrope, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,512,64,990);const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false}));return m;}
 const base=cube(29,20,.16,1,-.5,-.30,mat('#dce5d7'));
 for(let x=-13;x<=15;x++){const geo=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x,-10.5,-.205),new THREE.Vector3(x,9.5,-.205)]);scene.add(new THREE.Line(geo,new THREE.LineBasicMaterial({color:'#cbd8c4',transparent:true,opacity:.5})));}
 for(let y=-10;y<=9;y++){const geo=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-13.5,y,-.205),new THREE.Vector3(15.5,y,-.205)]);scene.add(new THREE.Line(geo,new THREE.LineBasicMaterial({color:'#cbd8c4',transparent:true,opacity:.5})));}
 boards.forEach(b=>{
   const group=new THREE.Group();group.position.set(b.x,b.y,0);pcbGroup.add(group);boardMeshes.set(b.id,group);
   const color=b.kind==='esp'?'#254b3b':b.kind==='hmi'?'#315a66':b.kind==='boundary'?'#a97162':['power','cell','motor'].includes(b.kind)?'#73877d':b.kind==='servo'?'#416e83':b.kind==='stop'?'#a24c44':b.kind==='ic'?'#343f38':'#4c6f57';
   const body=cube(b.w,b.h,.19,0,0,0,mat(color),group);body.userData.board=b.id;pickable.push(body);
   for(const x of [-b.w/2+.12,b.w/2-.12])for(const y of [-b.h/2+.12,b.h/2-.12]){const screw=new THREE.Mesh(new THREE.CylinderGeometry(.055,.055,.04,12),white);screw.rotation.x=Math.PI/2;screw.position.set(x,y,.13);group.add(screw);}
   const title=textPlane(b.name,b.w-.2,.27);title.position.set(0,b.h/2-.27,.15);group.add(title);
   const subtitle=textPlane(b.model,b.w-.25,.16,'#bad0ae');subtitle.position.set(0,b.h/2-.53,.16);group.add(subtitle);
   if(b.kind==='esp'){
     cube(1.18,1.48,.16,0,1.65,.20,mat('#a5b4a7'),group);cube(1.18,.50,.10,0,2.65,.15,dark,group);
     for(let y=2.47;y<2.89;y+=.09)cube(.8,.015,.02,.1,y,.22,gold,group);
     cube(.65,.48,.2,0,-3.4,.16,white,group);cube(.42,.27,.21,0,-3.46,.22,dark,group);
     const module=textPlane('WROOM-32E',1.05,.19,'#32483b');module.position.set(0,1.70,.3);group.add(module);
     const usb=textPlane('USB ↓',.8,.20);usb.position.set(0,-2.96,.18);group.add(usb);
   }else if(b.kind==='hmi'){
     cube(2.05,1.25,.08,.18,-.18,.15,dark,group);const display=textPlane('TOUCH HMI  ·  N P K  ·  kg',1.85,.28,'#cde6d6','#153830');display.position.set(.18,-.18,.21);group.add(display);
   }else if(b.kind==='servo'||b.kind==='motor'){
     const m=new THREE.Mesh(new THREE.CylinderGeometry(.25,.25,.34,24),white);m.rotation.x=Math.PI/2;m.position.set(.35,-.18,.3);group.add(m);cube(.7,.075,.05,.35,-.18,.50,dark,group);
   }else if(b.kind==='buck'){const coil=new THREE.Mesh(new THREE.TorusGeometry(.25,.09,8,24),gold);coil.position.set(0,-.25,.27);group.add(coil);}
   else if(b.kind==='power'){for(let y=-.25;y<.4;y+=.14)cube(1.7,.05,.03,-.3,y,.13,dark,group);}
   else if(b.kind==='stop'){const cap=new THREE.Mesh(new THREE.CylinderGeometry(.38,.38,.3,24),mat('#d33a30'));cap.rotation.x=Math.PI/2;cap.position.set(0,-.25,.28);group.add(cap);}
   else if(b.kind==='boundary'){const t=textPlane('DESIGN REQUIRED',b.w-.4,.28,'#ffe4ce');t.position.set(0,-.30,.2);group.add(t);}
   else if(!['bus','capacitor','resistor'].includes(b.kind))cube(b.id==='buffer'?.58:.60,Math.min(.58,b.h/3),.12,0,-.2,.18,dark,group);
   if(b.hasCode){const tag=textPlane('</>  คลิกเพื่อดู/แก้โค้ด',Math.min(b.w-.3,2.2),.2,'#fff5ba','#1f3a30');tag.position.set(0,-b.h/2+.14,.22);group.add(tag);}
   for(const [side,ports] of [['left',b.left],['right',b.right]])ports.forEach((p,i)=>{
     const x=side==='left'?-b.w/2-.075:b.w/2+.075;
     const top=b.kind==='esp'?b.h/2-.52:b.h/2-.80;
     const bottom=-b.h/2+.22;
     const y=ports.length===1?-.15:top+(bottom-top)*i/(ports.length-1);
     const ref=b.id+'.'+p.id;const pin=cube(.15,.095,.20,x,y,.14,gold.clone(),group);pin.userData.port=ref;pickable.push(pin);pinMeshes.set(ref,pin);
     positions.set(ref,new THREE.Vector3(b.x+x,b.y+y,.28));
     const label=textPlane(p.label,b.kind==='esp'?.98:b.w*.40,b.kind==='esp'?.165:.16);
     label.position.set(side==='left'?-b.w/2+.51:b.w/2-.51,y,.17);group.add(label);
   });
 });
 const cableGroup=new THREE.Group();scene.add(cableGroup);
 const colors={ground:'#626f75',power:'#c65f55',analog:'#9b77b2',safety:'#bf4d79'};
 wires.forEach((w,i)=>{
   const start=positions.get(w.from),end=positions.get(w.to);const level=.65+(i%8)*.075;
   const groupIndex=groups.findIndex(g=>g.id===w.group);
   const lane=(start.x+end.x)/2+(i%5-2)*.15;
   const pts=[start.clone(),new THREE.Vector3(start.x+Math.sign(end.x-start.x)*.40,start.y,level),new THREE.Vector3(lane,start.y,level),new THREE.Vector3(lane,end.y,level),new THREE.Vector3(end.x-Math.sign(end.x-start.x)*.4,end.y,level),end.clone()];
   const curve=new THREE.CatmullRomCurve3(pts,false,'centripetal');
   const baseColor=w.type==='signal'?groups[groupIndex].color:colors[w.type];
   const material=new THREE.MeshStandardMaterial({color:baseColor,roughness:.5,metalness:.1,transparent:true});
   const m=new THREE.Mesh(new THREE.TubeGeometry(curve,54,w.type==='power'?.042:.027,6,false),material);m.userData.wire=w.id;cableGroup.add(m);wireMeshes.set(w.id,{mesh:m,curve,color:baseColor});pickable.push(m);
 });
 const glowMat=new THREE.MeshBasicMaterial({color:'#fff5ba'});const tracer=new THREE.Mesh(new THREE.SphereGeometry(.09,12,8),glowMat);scene.add(tracer);tracer.visible=false;
 const endRings=[0,1].map(()=>{const m=new THREE.Mesh(new THREE.TorusGeometry(.15,.035,8,24),new THREE.MeshBasicMaterial({color:'#ffe49c',depthTest:false}));m.renderOrder=4;scene.add(m);return m;});
 const state={ids:new Set(),selected:null,only:false,labels:true};
 function update(){
   for(const [id,o] of wireMeshes){const visible=state.ids.has(id)&&(!state.only||id===state.selected);o.mesh.visible=visible;o.mesh.material.opacity=!state.selected||id===state.selected?1:.18;o.mesh.material.emissive.set(id===state.selected?o.color:'#000000');o.mesh.material.emissiveIntensity=id===state.selected?.45:0;}
   const w=wires.find(w=>w.id===state.selected);
   for(const [ref,m] of pinMeshes)m.material.color.set(w&&(ref===w.from||ref===w.to)?'#fff2a6':'#c4b06f');
   endRings.forEach((m,i)=>{m.visible=!!w&&state.ids.has(w.id);if(w)m.position.copy(positions.get(i===0?w.from:w.to)).add(new THREE.Vector3(0,0,.05));});
   tracer.visible=!!w&&state.ids.has(w.id);
 }
 const pointer=new THREE.Vector2(),ray=new THREE.Raycaster();let down=null;
 renderer.domElement.addEventListener('pointerdown',e=>down=[e.clientX,e.clientY]);
 renderer.domElement.addEventListener('pointerup',e=>{
   if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>5)return;
   const rect=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);ray.setFromCamera(pointer,camera);
   const hit=ray.intersectObjects(pickable.filter(m=>m.visible),false)[0]?.object;if(!hit)return;
   if(hit.userData.wire)onSelect(hit.userData.wire);
   else if(hit.userData.port){const attached=wires.filter(w=>state.ids.has(w.id)&&(w.from===hit.userData.port||w.to===hit.userData.port));if(attached[0])onSelect(attached[0].id);else onBoard(endpoint(hit.userData.port).board.id);}
   else if(hit.userData.board)onBoard(hit.userData.board);
 });
 function resize(){const r=host.getBoundingClientRect();if(!r.width||!r.height)return;const aspect=r.width/r.height,halfH=Math.max(10.8,15/aspect);camera.left=-halfH*aspect;camera.right=halfH*aspect;camera.top=halfH;camera.bottom=-halfH;camera.updateProjectionMatrix();renderer.setSize(r.width,r.height);}
 const observer=new ResizeObserver(resize);observer.observe(host);
 function home(tilt=false){camera.position.set(tilt?6:1,tilt?6:-.5,32);controls.target.set(1,-.5,0);camera.zoom=1;camera.up.set(0,1,0);camera.updateProjectionMatrix();controls.update();}
 home();
 return {setVisible(ids){state.ids=new Set(ids);if(!state.ids.has(state.selected))state.selected=null;update();},select(id){state.selected=id;update();},only(v){state.only=v;update();},home,zoom(delta){camera.zoom=THREE.MathUtils.clamp(camera.zoom*delta,.7,9);camera.updateProjectionMatrix();},focus(){const w=wires.find(w=>w.id===state.selected);if(!w)return;const start=positions.get(w.from),end=positions.get(w.to),center=start.clone().add(end).multiplyScalar(.5);controls.target.copy(center);camera.position.copy(center).add(new THREE.Vector3(0,0,32));const span=Math.max(Math.abs(start.x-end.x)/(camera.right-camera.left),Math.abs(start.y-end.y)/(camera.top-camera.bottom),.15);camera.zoom=Math.min(5,.65/span);camera.updateProjectionMatrix();controls.update();},render(now){if(!host.clientWidth)return;controls.update();if(tracer.visible){const curve=wireMeshes.get(state.selected)?.curve;if(curve)tracer.position.copy(curve.getPointAt((now/3500)%1));}renderer.render(scene,camera);},dispose(){observer.disconnect();controls.dispose();renderer.dispose();}};
}
