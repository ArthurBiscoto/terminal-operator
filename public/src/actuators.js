import {T,C,world,clamp} from './core.js';

// Advance a kinematic collider to its next rendered pose within this physics step.
// Teleporting it every frame would omit contact velocity and let loads penetrate it.
export function driveKinematic(body,position,quaternion,dt){
 body.wakeUp();
 if(!dt){body.position.copy(position);body.quaternion.copy(quaternion);body.velocity.setZero();body.angularVelocity.setZero();body.aabbNeedsUpdate=true;return}
 body.velocity.set((position.x-body.position.x)/dt,(position.y-body.position.y)/dt,(position.z-body.position.z)/dt);
 const q=new T.Quaternion().copy(quaternion).multiply(new T.Quaternion().copy(body.quaternion).invert()).normalize();
 if(q.w<0){q.x=-q.x;q.y=-q.y;q.z=-q.z;q.w=-q.w}
 const n=Math.hypot(q.x,q.y,q.z),angle=2*Math.atan2(n,q.w),factor=n>1e-8?angle/(n*dt):0;
 body.angularVelocity.set(q.x*factor,q.y*factor,q.z*factor);
}

export class ArmColliders{
 constructor(meshes){
  this.parts=meshes.map(mesh=>{
   const body=new C.Body({mass:0,type:C.Body.KINEMATIC,allowSleep:false,collisionFilterGroup:16,collisionFilterMask:1|4});
   mesh.updateWorldMatrix(true,false);const size=mesh.getWorldScale(new T.Vector3());body.addShape(new C.Box(new C.Vec3(size.x/2,size.y/2,size.z/2)));
   world.addBody(body);return {mesh,body};
  });this.sync(0);
 }
 sync(dt){for(const {mesh,body} of this.parts){mesh.updateWorldMatrix(true,false);driveKinematic(body,mesh.getWorldPosition(new T.Vector3()),mesh.getWorldQuaternion(new T.Quaternion()),dt)}}
}

// Apply motor torque to the physical load, not its visual quaternion. Swing and
// collisions remain under the rigid-body solver; releasing a key brakes yaw gently.
export function rotateLoad(body,keys){
 const input=(keys.has('KeyJ')?1:0)-(keys.has('KeyL')?1:0);
 const gain=body.mass>200?10000:180,limit=body.mass>200?14000:250;
 body.torque.y+=clamp((input*.55-body.angularVelocity.y)*gain,-limit,limit);
 if(input)body.wakeUp();
}
