import {T,C,scene,world,box,cyl,beam,mat,bodyBox,label,sync,clamp} from './core.js';
import {ArmColliders} from './actuators.js';
export class Vehicle{
 constructor({model='magnet',spawn=[0,1.2,4]}={}){this.model=model;this.size=model==='forklift'?.48:.8;this.spawn=[spawn[0],1.2*this.size,spawn[2]];this.mesh=new T.Group();scene.add(this.mesh);this.mesh.scale.setScalar(this.size);this.body=bodyBox(3.5*this.size,2.1*this.size,5.5*this.size,0,1.2*this.size,4,model==='forklift'?3200:14000);this.body.collisionFilterGroup=2;this.body.collisionFilterMask=1|2|4|32|64;this.body.fixedRotation=true;this.body.updateMassProperties();this.body.linearFactor.set(1,0,1);this.body.allowSleep=false;this.heading=0;this.speed=0;this.steer=0;this.lift=.78;this.slew=0;this.extend=0;this.wheels=[];const g=this.mesh;box(g,3.6,.85,5.8,'#567b42',0,.1,0,.45);box(g,3.4,1.35,1.75,'#658b47',0,.7,1.65,.35);box(g,3.85,.55,1.1,'#c0d77b',0,-.22,2.6);box(g,3.8,.2,5.9,'#25352d',0,-.43,0,.7);for(let i=-1.65;i<1.7;i+=.28){const stripe=box(g,.17,.5,.022,'#25372a',i,-.2,3.16);stripe.rotation.z=-.4}label(g,model==='grapple'?'NORD  /  RS–60':'NORD  /  RS–40',2.5,.31,0,.8,2.54);for(const s of [-1,1]){box(g,.9,.3,5.6,'#4c673a',s*1.65,.7,0);for(const z of [-1.95,1.95]){const steering=new T.Group();steering.position.set(s*1.77,-.2,z);g.add(steering);
 const rolling=new T.Group();steering.add(rolling);
 const tire=cyl(rolling,.98,.7,'#202923',0,0,0,20);tire.rotation.z=Math.PI/2;
 const hub=cyl(rolling,.53,.72,'#75867a',0,0,0,12);hub.rotation.z=Math.PI/2;
 const cap=cyl(rolling,.22,.76,'#c1c9b8',0,0,0,10);cap.rotation.z=Math.PI/2;
 for(let j=0;j<14;j++){const ang=j/14*Math.PI*2;const tread=box(rolling,.74,.12,.25,'#2c332b',0,Math.cos(ang)*.96,Math.sin(ang)*.96);tread.rotation.x=ang}
 for(let j=0;j<6;j++){const a=j*Math.PI/3;box(rolling,.04,.075,.075,'#d5ddc7',s*.38,Math.cos(a)*.37,Math.sin(a)*.37)}
 this.wheels.push({steering,rolling,front:z<0});}box(g,.48,.21,.06,'#fff1b3',s*1.29,.4,-2.95);box(g,.32,.18,.04,'#e77040',s*1.34,.1,3.16)}
 // Offset glazed cab leaves the central telescopic arm visible.
 box(g,1.6,.2,1.95,'#b0c197',-1.05,1,-.45);box(g,1.45,1.85,1.7,'#294c50',-1.05,2,-.48,.55);for(const xx of [-1.8,-.3])for(const zz of [-1.35,.38])box(g,.1,2,.1,'#b3c79b',xx,2,zz,.5);box(g,1.7,.18,2,'#b8cb9d',-1.05,3,-.5);box(g,1.58,.09,1.9,'#bdcaaa',-1.05,1.9,-.5);box(g,1.5,.1,.1,'#a0b291',-1.05,2.65,-1.38);box(g,.16,.04,.44,'#283b30',-1.85,1.83,-.48);for(let y=.25;y<1.2;y+=.28)box(g,.5,.07,.9,'#869579',-2,y,.45,.7);cyl(g,.08,2.7,'#344639',1.15,1.8,1.7);cyl(g,.16,.35,'#efa144',-.8,3.23,-.5);box(g,.58,.55,.6,'#20342b',-1.03,1.9,-.35);const head=cyl(g,.16,.3,'#c0a082',-1.03,2.3,-.5,8);box(g,.5,.55,.27,'#d2b455',-1.03,1.96,-.35);
 this.turret=new T.Group();this.turret.position.set(.15,1.1,.35);g.add(this.turret);cyl(this.turret,.62,.42,'#c3c9af',0,0,0);this.pivot=new T.Group();this.turret.add(this.pivot);this.mainBeam=box(this.pivot,.85,.9,6.2,'#343f36',0,0,-2.55,.6);this.middleBeam=box(this.pivot,.62,.64,4.4,'#687661',0,.04,-6.0,.6);this.telescopic=box(this.pivot,.4,.42,4.0,'#a8b49a',0,.05,-7.5,.7);this.tip=new T.Object3D();this.pivot.add(this.tip);const stripe=box(this.pivot,.82,.18,.7,'#d8b748',0,.42,-4.4);label(this.pivot,'N O R D',2.5,.34,.391,.02,-2.3).rotation.y=Math.PI/2;
 this.pulley=cyl(this.pivot,.24,.5,'#dfbd50',0,.05,-9.5,16);this.pulley.rotation.z=Math.PI/2;
 this.hydraulic=box(this.turret,.19,1,.19,'#aebdaf',.6,0,-1);this.reset();
 this.pulley.visible=model!=='grapple';
 if(model==='grapple'){
  const colors=new Map([['567b42','#b77635'],['658b47','#d4913c'],['c0d77b','#e8b657'],['4c673a','#9c6b35']]);
  this.mesh.traverse(m=>{if(m.isMesh&&m.material.color&&colors.has(m.material.color.getHexString()))m.material=mat(colors.get(m.material.color.getHexString()),.4,.5)});
  box(g,3.5,.45,1.15,'#dfad4d',0,1.43,2.1,.5);
 }
 // Flexible hydraulic hoses stay local to the lifting boom.
 for(const x of [-.5,.5]){const curve=new T.CatmullRomCurve3([new T.Vector3(x,.22,.1),new T.Vector3(x,.62,-1.5),new T.Vector3(x,.55,-3.7),new T.Vector3(x,.23,-5.3)]);const hose=new T.Mesh(new T.TubeGeometry(curve,18,.045,6,false),mat('#23372d',.1,.9));this.pivot.add(hose)}
 this.armColliders=new ArmColliders([this.mainBeam,this.middleBeam,this.telescopic]);
 }
 reset(){this.body.position.set(...this.spawn);this.body.velocity.setZero();this.body.angularVelocity.setZero();this.heading=0;this.speed=0;this.steer=0;this.lift=.65;this.slew=0;this.extend=0;this.body.quaternion.setFromEuler(0,0,0);this.wheelPosition=this.body.position.clone();for(const w of this.wheels){w.steering.rotation.y=0;w.rolling.rotation.x=0}this.updateArm();sync(this.mesh,this.body);this.mesh.updateMatrixWorld(true);this.armColliders?.sync(0)}
 updateArm(){this.turret.rotation.y=this.slew;this.pivot.rotation.x=this.lift;this.telescopic.position.z=-7.5-this.extend;this.tip.position.set(0,.05,-9.5-this.extend);this.pulley.position.z=this.tip.position.z;const a=new T.Vector3(.6,-.3,-.2),b=new T.Vector3(.6,Math.sin(this.lift)*3,-Math.cos(this.lift)*3);this.hydraulic.position.copy(a).add(b).multiplyScalar(.5);this.hydraulic.scale.y=a.distanceTo(b);this.hydraulic.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),b.sub(a).normalize());}
 update(dt,k,loaded){const gas=(k.has('KeyW')?1:0)-(k.has('KeyS')?1:0);const target=gas*(gas>0?(loaded?8.5:12.5):6.5)*(this.speedMultiplier||1);const actual=-Math.sin(this.heading)*this.body.velocity.x-Math.cos(this.heading)*this.body.velocity.z;this.speed=T.MathUtils.damp(actual,target,gas?1.8:3,dt);this.steer=T.MathUtils.damp(this.steer,(k.has('KeyA')?1:0)-(k.has('KeyD')?1:0),7,dt);this.heading+=this.steer*this.speed*(this.model==='forklift'?.19:.13)*dt;this.body.quaternion.setFromEuler(0,this.heading,0);this.body.velocity.x=-Math.sin(this.heading)*this.speed;this.body.velocity.z=-Math.cos(this.heading)*this.speed;this.lift=clamp(this.lift+((k.has('ArrowUp')?1:0)-(k.has('ArrowDown')?1:0))*dt*.4*(this.armMultiplier||1),.12,1.18);this.slew=clamp(this.slew+((k.has('ArrowLeft')?1:0)-(k.has('ArrowRight')?1:0))*dt*.52*(this.armMultiplier||1),-1.5,1.5);this.extend=clamp(this.extend+((k.has('KeyX')?1:0)-(k.has('KeyZ')?1:0))*dt*1.65*(this.armMultiplier||1),0,3.5);this.updateArm();sync(this.mesh,this.body);this.mesh.updateMatrixWorld(true);this.armColliders?.sync(dt)}
 tipPosition(){return this.tip.getWorldPosition(new T.Vector3())}
 draw(){
 const dx=this.body.position.x-this.wheelPosition.x,dz=this.body.position.z-this.wheelPosition.z;
 const traveled=-Math.sin(this.heading)*dx-Math.cos(this.heading)*dz;
 for(const w of this.wheels){w.rolling.rotation.x-=traveled/(.98*this.size);w.steering.rotation.y=w.front?this.steer*.4:0}
 this.wheelPosition.copy(this.body.position);sync(this.mesh,this.body)
}
}
