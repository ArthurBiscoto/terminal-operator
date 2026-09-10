import * as T from '../vendor/three.module.js';
import * as C from '../vendor/cannon-es.js';
export {T,C};
export const scene=new T.Scene(); scene.background=new T.Color('#a5c5c9'); scene.fog=new T.Fog('#a5c5c9',95,240);
export const world=new C.World({gravity:new C.Vec3(0,-9.81,0)});world.broadphase=new C.SAPBroadphase(world);world.solver.iterations=35;world.solver.tolerance=.0001;world.allowSleep=true;world.defaultContactMaterial.friction=.55;world.defaultContactMaterial.restitution=.025;
export const renderer=new T.WebGLRenderer({canvas:document.querySelector('#game'),antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;renderer.outputColorSpace=T.SRGBColorSpace;
export const camera=new T.PerspectiveCamera(48,innerWidth/innerHeight,.3,420);
scene.add(new T.HemisphereLight('#d9f0f4','#526347',1.35));const sun=new T.DirectionalLight('#fff0d2',3.0);sun.position.set(-40,65,25);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-48,right:48,top:48,bottom:-48,near:1,far:180});sun.shadow.normalBias=.045;sun.shadow.bias=-.00015;scene.add(sun);scene.add(sun.target);
export function followSun(position){sun.position.set(position.x-40,65,position.z+25);sun.target.position.set(position.x,0,position.z)}
export const materials=new Map();
export function mat(color,metalness=.1,roughness=.65){const key=color+':'+metalness+':'+roughness;if(!materials.has(key))materials.set(key,new T.MeshStandardMaterial({color,metalness,roughness}));return materials.get(key)}
export const boxgeo=new T.BoxGeometry(1,1,1);
export function box(parent,w,h,d,color,x=0,y=0,z=0,metal=.1){const m=new T.Mesh(boxgeo,typeof color==='object'?color:mat(color,metal));m.scale.set(w,h,d);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m}
export function cyl(parent,r,h,color,x=0,y=0,z=0,segments=12){const m=new T.Mesh(new T.CylinderGeometry(r,r,h,segments),mat(color,['#202923','#202725','#293b36'].includes(color)?0:.35,['#202923','#202725','#293b36'].includes(color)?.92:.58));m.position.set(x,y,z);m.castShadow=true;parent.add(m);return m}
export function beam(parent,a,b,width,color){const m=box(parent,width,1,width,color);m.position.copy(a).add(b).multiplyScalar(.5);m.scale.y=a.distanceTo(b);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),b.clone().sub(a).normalize());return m}
export function bodyBox(w,h,d,x,y,z,mass=0){const b=new C.Body({mass,shape:new C.Box(new C.Vec3(w/2,h/2,d/2)),position:new C.Vec3(x,y,z),linearDamping:.16,angularDamping:.45});b.sleepSpeedLimit=.12;b.sleepTimeLimit=1;world.addBody(b);return b}
const labelMaterials=new Map();
export function label(parent,text,w,h,x,y,z,color='#edf1df',background=null){const cacheKey=text+'|'+color+'|'+background;let lm=labelMaterials.get(cacheKey);if(!lm){const c=document.createElement('canvas');c.width=512;c.height=128;const ct=c.getContext('2d');if(background){ct.fillStyle=background;ct.fillRect(0,0,512,128)}ct.fillStyle=color;ct.font='bold 68px Arial';ct.textAlign='center';ct.textBaseline='middle';ct.fillText(text,256,67,485);const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;lm=new T.MeshBasicMaterial({map:texture,transparent:true,side:T.DoubleSide,depthWrite:false});labelMaterials.set(cacheKey,lm)}const m=new T.Mesh(new T.PlaneGeometry(w,h),lm);m.position.set(x,y,z);parent.add(m);return m}
export const sync=(mesh,body)=>{mesh.position.copy(body.position);mesh.quaternion.copy(body.quaternion)};
export const clamp=T.MathUtils.clamp;
