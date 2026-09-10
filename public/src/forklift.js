import {T,C,scene,world,box,cyl,mat,bodyBox,sync,clamp} from './core.js';
import {Vehicle} from './vehicle.js';
import {containers} from './yard.js';
import {ArmColliders,driveKinematic} from './actuators.js';
export class Forklift extends Vehicle{
 constructor(options={}){
  super({model:'forklift',spawn:options.spawn||[-14,1.2,40]});this.model='forklift';this.forkHeight=.22;this.forkYaw=0;this.slew=0;
  this.turret.visible=false;for(const p of this.armColliders.parts)world.removeBody(p.body);this.armColliders=null;
  this.mast=new T.Group();this.mast.position.set(0,0,-2.8);this.mesh.add(this.mast);
  const poles=[];for(const x of [-1.1,1.1]){poles.push(box(this.mast,.19,4.8,.3,'#34413a',x,1.7,0,.7));cyl(this.mast,.065,4.4,'#bbcab6',x,1.7,-.2,12)}
  box(this.mast,2.45,.2,.4,'#dcb657',0,4.15,0,.5);box(this.mast,2.5,.22,.5,'#e0b34e',0,-.5,0,.5);
  this.mesh.traverse(m=>{if(m.isMesh&&m.material.color&&['567b42','658b47','c0d77b','4c673a'].includes(m.material.color.getHexString()))m.material=mat('#e2ac45',.3,.6)});
  this.mastColliders=new ArmColliders(poles);this.mesh.updateMatrixWorld(true);
 }
 reset(){super.reset();this.forkHeight=.22;this.forkYaw=0;this.mastColliders?.sync(0)}
 update(dt,keys,loaded){const drive=new Set([...keys].filter(k=>!k.startsWith('Arrow')&&!['KeyQ','KeyE','KeyJ','KeyL'].includes(k)));super.update(dt,drive,loaded);const agility=this.armMultiplier||1;
  this.forkHeight=clamp(this.forkHeight+((keys.has('ArrowUp')||keys.has('KeyE')?1:0)-(keys.has('ArrowDown')||keys.has('KeyQ')?1:0))*dt*2.1*agility,.08,3.2);
  this.forkYaw=clamp(this.forkYaw+((keys.has('KeyJ')?1:0)-(keys.has('KeyL')?1:0))*dt*.25,-.3,.3);this.mastColliders?.sync(dt);
 }
 tipPosition(){this.mesh.updateWorldMatrix(true,false);return this.mesh.localToWorld(new T.Vector3(0,(this.forkHeight||.22)/this.size-1.2,-4.9))}
}
export class Forks{
 constructor(vehicle,event){this.vehicle=vehicle;this.onEvent=event;this.attached=null;this.joint=null;this.length=.22;this.spacing=.39;this.mesh=new T.Group();scene.add(this.mesh);this.prongs=[];
  for(const side of [-1,1]){const fork=new T.Group();this.mesh.add(fork);box(fork,.12,.08,1.35,'#a7b8a5',0,0,0,.75);box(fork,.14,.85,.15,'#607561',0,.38, .63,.7);this.prongs.push({fork,side})}
  box(this.mesh,1.35,.25,.22,'#d0a247',0,.44, .63,.65);
  this.body=new C.Body({mass:0,type:C.Body.KINEMATIC,allowSleep:false,collisionFilterGroup:32,collisionFilterMask:1});
  this.prongs.forEach(({side})=>this.body.addShape(new C.Box(new C.Vec3(.06,.04,.675)),new C.Vec3(side*this.spacing,0,0)));world.addBody(this.body);this.reset();
 }
 reset(){this.release(false);this.length=this.vehicle.forkHeight||.22;this.updatePose(0);this.draw()}
 updatePose(dt){const q=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),this.vehicle.heading+this.vehicle.forkYaw);driveKinematic(this.body,this.vehicle.tipPosition(),q,dt)}
 update(dt,keys){this.length=this.vehicle.forkHeight;this.updatePose(dt);if(this.attached)this.attached.body.wakeUp();this.spacing=.39;for(let i=0;i<2;i++)this.body.shapeOffsets[i].x=(i?1:-1)*this.spacing;this.body.aabbNeedsUpdate=true}
 candidate(){let best=null,dist=Infinity;const axis=this.body.quaternion.vmult(new C.Vec3(1,0,0));for(const o of containers){if(!o.body.mass||o.removed)continue;const direction=o.body.quaternion.vmult(new C.Vec3(1,0,0)),up=o.body.quaternion.vmult(new C.Vec3(0,1,0));if(Math.abs(axis.dot(direction))<.93||up.y<.96)continue;const base=o.body.position.y-o.h/2,dy=base-(this.body.position.y+.06),d=Math.hypot(o.body.position.x-this.body.position.x,o.body.position.z-this.body.position.z);const local=o.body.pointToLocalFrame(this.body.position);const aligned=o.kind==='pallet'?Math.abs(local.x)<.14&&Math.abs(local.z)<.38&&local.y>-.565&&local.y<-.335:d<.85&&dy>-.24&&dy<.4;if(aligned&&d<dist){best=o;dist=d}}return best}
 toggle(){if(this.attached){this.release();return}const o=this.candidate();if(!o){this.onEvent('Alinhe os garfos sob a carga e pressione Espaço.');return}this.attached=o;this.loadAllowedSleep=o.body.allowSleep;o.body.allowSleep=false;o.body.wakeUp();this.joint=new C.LockConstraint(this.body,o.body,{maxForce:2e6});this.joint.collideConnected=false;world.addConstraint(this.joint);this.onEvent('CARGA APOIADA · Eleve os garfos.','attach')}
 release(notify=true){if(!this.joint)return;world.removeConstraint(this.joint);this.joint=null;this.attached.body.allowSleep=this.loadAllowedSleep;this.attached.body.wakeUp();this.attached=null;if(notify)this.onEvent('Carga liberada dos garfos.','release')}
 draw(){sync(this.mesh,this.body);for(const {fork,side} of this.prongs)fork.position.x=side*this.spacing}
}
