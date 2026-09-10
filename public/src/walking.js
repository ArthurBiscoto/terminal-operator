import {T,C,world,camera,renderer,clamp} from './core.js';
export class Walking{
 constructor(){this.active=false;this.yaw=0;this.pitch=0;this.body=new C.Body({mass:80,allowSleep:false,fixedRotation:true,linearDamping:.8,collisionFilterGroup:64,collisionFilterMask:1|2|16|32});this.body.addShape(new C.Sphere(.35),new C.Vec3(0,-.5,0));this.body.addShape(new C.Sphere(.35),new C.Vec3(0,.45,0));this.body.linearFactor.set(1,0,1);this.body.updateMassProperties();
  renderer.domElement.addEventListener('click',()=>{if(this.active)renderer.domElement.requestPointerLock?.()});
  document.addEventListener('mousemove',e=>{if(this.active&&document.pointerLockElement===renderer.domElement){this.yaw-=e.movementX*.0023;this.pitch=clamp(this.pitch-e.movementY*.0023,-1.3,1.3)}});
 }
 exit(vehicle){
  const candidates=[[-3,0],[3,0],[0,4.5],[0,-4.5]];
  for(const [x,z] of candidates){const p=new T.Vector3(x,0,z).applyAxisAngle(new T.Vector3(0,1,0),vehicle.heading).add(new T.Vector3().copy(vehicle.body.position));p.y=1;
   let blocked=false;for(const b of world.bodies){if(b===vehicle.body||!b.shapes.length||b.collisionFilterMask===0)continue;b.updateAABB();const a=b.aabb;if(p.x>a.lowerBound.x-.4&&p.x<a.upperBound.x+.4&&p.z>a.lowerBound.z-.4&&p.z<a.upperBound.z+.4&&a.upperBound.y>.25&&a.lowerBound.y<1.8){blocked=true;break}}
   if(!blocked){this.body.position.copy(p);this.body.velocity.setZero();world.addBody(this.body);this.active=true;this.yaw=vehicle.heading;this.pitch=0;return true}
  }return false;
 }
 enter(){world.removeBody(this.body);this.active=false;document.exitPointerLock?.()}
 update(dt,keys){if(!this.active)return;const x=(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0),z=(keys.has('KeyS')?1:0)-(keys.has('KeyW')?1:0),v=new T.Vector3(x,0,z);if(v.lengthSq())v.normalize().multiplyScalar(keys.has('ShiftLeft')?5.5:3.5).applyAxisAngle(new T.Vector3(0,1,0),this.yaw);this.body.velocity.x=v.x;this.body.velocity.z=v.z;this.body.wakeUp()}
 draw(){if(!this.active)return;camera.position.set(this.body.position.x,1.72,this.body.position.z);camera.quaternion.setFromEuler(new T.Euler(this.pitch,this.yaw,0,'YXZ'))}
}
