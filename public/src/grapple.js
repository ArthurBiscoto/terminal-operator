import {T,C,scene,world,box,cyl,mat,clamp,sync} from './core.js';
import {containers} from './yard.js';
import {driveKinematic} from './actuators.js';

// A levelled hydraulic spreader attaches directly to the boom, with no hanging cable.
export class Grapple{
 constructor(vehicle,onEvent){
  this.vehicle=vehicle;this.onEvent=onEvent;this.attached=null;this.joint=null;this.length=1.6;this.yaw=0;this.closure=0;
  this.mesh=new T.Group();scene.add(this.mesh);this.jaws=[];
  box(this.mesh,5.95,.28,2.75,'#e4b94c',0,0,0,.65);
  box(this.mesh,4.7,.22,1.7,'#39493f',0,.24,0,.65);
  for(const x of [-2.7,2.7])box(this.mesh,.32,.38,2.9,'#eecb67',x,.12,0,.55);
  cyl(this.mesh,.48,.35,'#b7c5b0',0,.47,0,20);
  for(let x=-2.7;x<3;x+=.45){const m=box(this.mesh,.18,.28,.018,'#263831',x,0,1.386);m.rotation.z=-.4}
  for(const x of [-2.88,2.88])for(const z of [-1.33,1.33]){
   const hinge=new T.Group();hinge.position.set(x,-.05,z);this.mesh.add(hinge);
   box(hinge,.18,.64,.18,'#404c43',0,-.24,0,.7);
   box(hinge,.27,.14,.36,'#b7c7b0',0,-.51,-Math.sign(z)*.12,.8);
   this.jaws.push({hinge,side:Math.sign(z)});
  }
  this.indicator=box(this.mesh,.3,.12,.17,'#d9efac',0,.44,.6);
  this.body=new C.Body({mass:0,type:C.Body.KINEMATIC,allowSleep:false,collisionFilterGroup:32,collisionFilterMask:1|2});
  this.body.addShape(new C.Box(new C.Vec3(2.975,.14,1.375)));
  world.addBody(this.body);
  this.connector=new T.Group();scene.add(this.connector);
  this.sleeve=cyl(this.connector,.17,1,'#35493d',0,0,0,16);
  this.rod=cyl(this.connector,.105,1,'#c7d4c2',0,0,0,16);
  this.reset();
 }
 target(){const p=this.vehicle.tipPosition(),angle=this.vehicle.heading+this.vehicle.slew;p.x-=Math.sin(angle)*2;p.z-=Math.cos(angle)*2;p.y-=this.length;return p}
 orientation(){return new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),this.vehicle.heading+this.vehicle.slew+this.yaw)}
 reset(){this.release(false);this.length=1.6;this.yaw=0;this.closure=0;driveKinematic(this.body,this.target(),this.orientation(),0);this.draw()}
 update(dt,keys){
  this.length=clamp(this.length+((keys.has('KeyQ')?1:0)-(keys.has('KeyE')?1:0))*dt*.9*(this.vehicle.armMultiplier||1),.8,2.5);
  this.yaw+=((keys.has('KeyJ')?1:0)-(keys.has('KeyL')?1:0))*dt*.8*(this.vehicle.armMultiplier||1);
  if(this.attached)this.attached.body.wakeUp();
  driveKinematic(this.body,this.target(),this.orientation(),dt);
  this.closure=T.MathUtils.damp(this.closure,this.attached?1:0,6,dt);
 }
 candidate(){
  let best=null,distance=Infinity;
  const axis=this.body.quaternion.vmult(new C.Vec3(1,0,0));
  for(const o of containers){
   if(!o.body.mass||o.kind==='pallet')continue;
   const up=o.body.quaternion.vmult(new C.Vec3(0,1,0));if(up.y<.97)continue;
   const direction=o.body.quaternion.vmult(new C.Vec3(1,0,0));
   if(Math.abs(axis.dot(direction))<.965)continue;
   const roof=o.body.pointToWorldFrame(new C.Vec3(0,o.h/2,0));
   const d=Math.hypot(this.body.position.x-roof.x,this.body.position.z-roof.z),height=this.body.position.y-.14-roof.y;
   if(d<.6&&height>-.1&&height<.42&&d+Math.abs(height)<distance){best=o;distance=d+Math.abs(height)}
  }return best;
 }
 toggle(){
  if(this.attached){this.release();return}
  const o=this.candidate();if(!o){this.onEvent('Alinhe a garra com o teto. J/L gira; Q/E ajusta a altura.');return}
  this.attached=o;this.loadAllowedSleep=o.body.allowSleep;o.body.allowSleep=false;o.body.wakeUp();
  this.joint=new C.LockConstraint(this.body,o.body,{maxForce:2e6});this.joint.collideConnected=false;world.addConstraint(this.joint);
  this.onEvent('GARRA TRAVADA · Container conectado.','attach');
 }
 release(notify=true){if(!this.joint)return;world.removeConstraint(this.joint);this.joint=null;this.attached.body.allowSleep=this.loadAllowedSleep;this.attached.body.wakeUp();this.attached=null;if(notify)this.onEvent('Garra aberta. Container liberado.','release')}
 draw(){
  sync(this.mesh,this.body);for(const {hinge,side} of this.jaws)hinge.rotation.x=side*(1-this.closure)*.65;
  const tip=this.vehicle.tipPosition(),head=new T.Vector3().copy(this.body.position);const d=tip.distanceTo(head);
  this.connector.position.copy(tip).add(head).multiplyScalar(.5);
  this.connector.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),tip.sub(head).normalize());
  this.sleeve.scale.y=d*.55;this.sleeve.position.y=d*.22;
  this.rod.scale.y=d*.6;this.rod.position.y=-d*.18;
  this.indicator.material=mat(this.attached?'#b7f768':'#e9c271',.3);
 }
}
