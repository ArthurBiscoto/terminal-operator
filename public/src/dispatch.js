import {T,C,scene,world,box,cyl,mat,bodyBox,label,sync} from './core.js';
import {containers,obstacles} from './yard.js';
import {driveKinematic} from './actuators.js';
import {GLTFLoader} from '../vendor/GLTFLoader.js';
import {batchMeshes} from './optimize.js';
let importedTruck=null;
export async function loadTruckModel(){if(importedTruck)return;const gltf=await new GLTFLoader().loadAsync('./assets/truck-flat.glb');importedTruck=gltf.scene;importedTruck.traverse(m=>{if(m.isMesh){m.castShadow=true;m.receiveShadow=true;m.material.roughness=.55}})}
export function removeCargo(o){if(!o.body.mass){const i=obstacles.findIndex(b=>b.x===o.body.position.x&&b.z===o.body.position.z&&b.h===o.body.position.y+o.h/2);if(i>=0)obstacles.splice(i,1)}world.removeBody(o.body);o.mesh.removeFromParent();const i=containers.indexOf(o);if(i>=0)containers.splice(i,1);o.removed=true}
export function pallet(id,x,y,z){
 const mesh=new T.Group();scene.add(mesh);
 // Three runners support the deck and leave two open fork tunnels along Z.
 const body=bodyBox(1.8,1.2,1.5,x,y,z,160);body.removeShape(body.shapes[0]);
 const solid=(w,h,d,xx,yy,zz,color)=>{box(mesh,w,h,d,color,xx,yy,zz);body.addShape(new C.Box(new C.Vec3(w/2,h/2,d/2)),new C.Vec3(xx,yy,zz))};
 for(const xx of [-.78,0,.78])solid(.16,.3,1.5,xx,-.45,0,'#ad804d');
 solid(1.8,.08,1.5,0,-.26,0,'#cfaa70');
 solid(1.58,.82,1.3,0,.19,0,'#b89869');
 for(const xx of [-.54,.54])box(mesh,.045,.84,1.32,'#344d48',xx,.19,0);
 label(mesh,'NORD / '+id,1.3,.16,0,.18,.656,'#f4ead3');
 body.updateMassProperties();body.updateBoundingRadius();body.aabbNeedsUpdate=true;
 const o={id,kind:'pallet',color:'#c8a470',mesh,body,w:1.8,h:1.2,d:1.5,initial:{x,y,z},damage:0};containers.push(o);sync(mesh,body);batchMeshes(mesh);return o;
}
export class DispatchTruck{
 constructor(x,z,index){
  this.x=x;this.z=z;this.index=index;this.state='parked';this.speed=0;this.cargo=[];this.locks=[];this.mesh=new T.Group();this.mesh.position.set(x,0,z);scene.add(this.mesh);this.parts=[];this.wheels=[];
  const createBody=(w,h,d,lx,y)=>{const b=bodyBox(w,h,d,x+lx,y,z);b.type=C.Body.KINEMATIC;b.allowSleep=false;this.parts.push({body:b,lx,y});return b};
  this.decks=[createBody(7,.36,3.45,0,1.52),createBody(7,.36,3.45,-8.2,1.52)];createBody(3.4,3.1,3.1,5.3,1.65);
  for(const dx of [0,-8.2]){
   box(this.mesh,7,.28,3.45,'#8d9c93',dx,1.56,0,.65);box(this.mesh,7.1,.11,3.54,'#bdc4b2',dx,1.66,0,.6);
   box(this.mesh,6.8,.36,1.1,'#293c35',dx,1.21,0,.7);
   for(const side of [-1,1]){box(this.mesh,5.7,.1,.07,'#e1d5a1',dx,1.4,side*1.75);for(let j=-3;j<3;j+=.8)box(this.mesh,.22,.1,.06,j%1?'#edcc5d':'#e8e8d7',dx+j,1.46,side*1.77)}
   for(const ax of [-1.9,.0,1.9])for(const side of [-1,1]){const wheel=new T.Group();wheel.position.set(dx+ax,.69,side*1.53);this.mesh.add(wheel);const tire=cyl(wheel,.69,.4,'#202923',0,0,0,20);tire.rotation.x=Math.PI/2;const rim=cyl(wheel,.35,.43,'#c6cdbd',0,0,0,12);rim.rotation.x=Math.PI/2;this.wheels.push(wheel)}
  }
  box(this.mesh,2,.15,.6,'#566a5c',-4.1,1.3,0,.7);
  if(importedTruck){const cab=importedTruck.clone(true);cab.scale.setScalar(2.3);cab.rotation.y=Math.PI/2;cab.position.x=4;this.mesh.add(cab)}else{box(this.mesh,3,2.6,3,'#cfdbcc',5.3,2,0,.4);box(this.mesh,.06,.9,2.6,'#254954',6.82,2.6,0)}
  label(this.mesh,'EXPEDIÇÃO / '+String(index+1).padStart(2,'0'),4,.3,-4,1.2,1.81);
  batchMeshes(this.mesh,false);
 }
 slot(slot,kind='container'){return {x:this.x-slot*8.2,z:this.z,y:1.7,w:kind==='pallet'?2:6.8,d:kind==='pallet'?1.8:3.25}}
 depart(loads=[]){if(this.state!=='parked')return;this.state='departing';this.cargo=loads.filter(o=>!o.removed);this.cargo.forEach((o,i)=>{o.body.allowSleep=false;o.body.wakeUp();const deck=this.decks[Math.min(i,1)],c=new C.LockConstraint(deck,o.body,{maxForce:2e6});c.collideConnected=false;world.addConstraint(c);this.locks.push(c)})}
 update(dt,blockers){
  if(this.state!=='departing')return;
  const blocked=blockers.some(b=>Math.abs(b.position.z-this.z)<3.3&&b.position.x>this.x+4&&b.position.x<this.x+15);
  this.speed=T.MathUtils.damp(this.speed,blocked?0:3,blocked?6:1,dt);this.x+=this.speed*dt;
  for(const p of this.parts)driveKinematic(p.body,new T.Vector3(this.x+p.lx,p.y,this.z),new T.Quaternion(),dt);
  for(const o of this.cargo)o.body.wakeUp();
  this.mesh.position.x=this.x;for(const w of this.wheels)w.rotation.z-=this.speed*dt/.69;
  if(this.x>95)this.remove(true);
 }
 remove(withCargo=false){if(this.state==='gone')return;this.state='gone';for(const c of this.locks)world.removeConstraint(c);this.locks=[];for(const p of this.parts)world.removeBody(p.body);this.mesh.removeFromParent();if(withCargo)this.cargo.forEach(removeCargo)}
}
