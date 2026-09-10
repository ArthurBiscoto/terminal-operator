import {T,C,scene,world,box,bodyBox,label,sync} from './core.js';
import {container,containers} from './yard.js';
import {pallet,DispatchTruck,removeCargo} from './dispatch.js';
import {batchMeshes} from './optimize.js';
import {validPlacement} from './missions.js';
export const GATE={x:-52,z:38};
export class Contracts{
 constructor(profile,event,onPaid){this.profile=profile;this.event=event;this.onPaid=onPaid;this.jobs=[];this.trucks=[];this.supports=[];this.owned=[];this.spec=null;this.clock=0;this.markers=new T.Group();scene.add(this.markers);this.signal=new T.Group();scene.add(this.signal);const m=new T.Mesh(new T.ConeGeometry(.32,.8,4),new T.MeshBasicMaterial({color:'#ffb669',depthTest:false}));m.rotation.z=Math.PI;this.signal.add(m);this.signal.visible=false}
 get job(){return this.jobs.find(j=>!j.done)||null}
 clear(){this.trucks.forEach(t=>t.remove());this.trucks=[];for(const o of this.owned)if(!o.removed)removeCargo(o);this.owned=[];for(const p of this.supports){world.removeBody(p.body);p.mesh.removeFromParent()}this.supports=[];this.jobs=[];this.markers.clear()}
 async accept(phase){const data=await this.profile.action({action:'accept',phase});this.prepare(data.state.contract);this.event('Contrato aceito. Consulte a carga laranja no mapa.','success')}
 prepare(spec){
  this.clear();this.spec=structuredClone(spec);this.clock=0;if(!spec)return;const phase=this.profile.phases.find(p=>p.id===spec.phase),isPallet=phase.kind==='pallet';
  const colors=['#bb5038','#327f9b','#dba23a','#578f78','#996d82','#71919b'];
  for(let row=0;row<spec.count/2;row++){
   const z=-26+row*8,truck=new DispatchTruck(43,z,row);this.trucks.push(truck);
   const inbound=spec.phase==='import'||spec.phase==='pallet-in'||(['mixed','port'].includes(spec.phase)&&row%2===1);
   for(let slot=0;slot<2;slot++){
    const index=row*2+slot,x=(isPallet?-12:-34)+slot*10,id=(isPallet?'PLT':'CNT')+'-'+String(index+1).padStart(3,'0');
    let groundHeight;
    if(isPallet){const mesh=box(scene,3,.02,2.7,'#60766a',x,.01,z),body=bodyBox(3,.02,2.7,x,.01,z);this.supports.push({mesh,body});groundHeight=.02;const l=label(scene,'ARMAZÉM '+(index+1),3,.4,x,.018,z+2,'#e5d19f');l.rotation.x=-Math.PI/2;this.supports.push({mesh:l,body:new C.Body()})}
    else{const tiers=['mixed','port'].includes(spec.phase)?2:1;for(let h=0;h<tiers;h++){const base=container('BASE-'+index+'-'+h,'#657b7b',x,1.3+h*2.6,z,{dynamic:false});this.owned.push(base);batchMeshes(base.mesh)}groundHeight=tiers*2.6}
    const area={x,z,y:groundHeight,w:isPallet?2.3:6.8,d:isPallet?2:3.2},deck=truck.slot(slot,isPallet?'pallet':'container');
    const origin=inbound?deck:area,target=inbound?area:deck,done=spec.done.includes(index),position=done?target:origin;
    const o=isPallet?pallet(id,position.x,position.y+.61,position.z):container(id,colors[index%colors.length],position.x,position.y+1.31,position.z);
    o.kind=isPallet?'pallet':'container';o.damage=spec.damage[index]||0;this.owned.push(o);if(!isPallet)batchMeshes(o.mesh);
    const j={index,o,t:target,origin,truck,inbound,done,hold:0,pending:false,cooldown:0};this.jobs.push(j);
    o.body.addEventListener('collide',e=>this.impact(j,e));
   }
  }
  this.render();this.dispatchReady();
 }
 impact(j,event){
  if(j.done||j.pending||this.clock<2||this.clock<j.cooldown||!this.spec)return;
  const speed=Math.abs(event.contact.getImpactVelocityAlongNormal());if(speed<2)return;
  const previous=j.o.damage||0,damage=Math.min(100,previous+Math.min(30,Math.ceil((speed-2)*7)));if(damage===previous)return;
  j.o.damage=damage;j.cooldown=this.clock+.9;
  this.event(`AVARIA ${damage}% · -${(damage-previous)*2} XP · Pagamento reduzido.`, 'impact');
  this.profile.action({action:'damage',contract:this.spec.id,index:j.index,damage}).catch(()=>{});
 }
 dispatchReady(){for(const t of this.trucks){const jobs=this.jobs.filter(j=>j.truck===t);if(jobs.length&&jobs.every(j=>j.done))t.depart(jobs[0].inbound?[]:jobs.map(j=>j.o))}}
 render(){
  this.markers.clear();for(const j of this.jobs){if(j.done)continue;const t=j.t;const color=j.index===this.job?.index?'#c2f16f':'#729680';for(const z of [-t.d/2,t.d/2])box(this.markers,t.w,.03,.085,color,t.x,t.y+.035,t.z+z);for(const x of [-t.w/2,t.w/2])box(this.markers,.085,.03,t.d,color,t.x+x,t.y+.035,t.z);const l=label(this.markers,String(j.index+1).padStart(2,'0'),1,.45,t.x,t.y+.04,t.z+t.d/2+.5,'#d5efb1');l.rotation.x=-Math.PI/2}
 }
 update(dt,equipment,blockers){
  this.clock+=dt;for(const truck of this.trucks)truck.update(dt,blockers);
  const job=this.job;this.signal.visible=!!job;
  if(job){this.signal.position.copy(job.o.body.position);this.signal.position.y+=job.o.h/2+1.2+Math.sin(this.clock*2)*.1}
  for(const j of this.jobs){if(j.done||j.pending)continue;
   const held=equipment.some(e=>e.attached===j.o),valid=!held&&validPlacement(j.o,j.t);
   j.hold=valid?j.hold+dt:0;
   if(j.hold>1.5&&this.clock>j.retryAt){this.deliver(j)}else if(j.hold>1.5&&!j.retryAt)this.deliver(j);
  }
 }
 async deliver(j){
  j.pending=true;try{
   // Flush the latest damage before crediting this unique placement.
   if(j.o.damage>0)await this.profile.action({action:'damage',contract:this.spec.id,index:j.index,damage:j.o.damage});
   const result=await this.profile.action({action:'deliver',contract:this.spec.id,index:j.index});
   j.done=true;j.pending=false;this.event(`POSICIONAMENTO ${this.jobs.filter(x=>x.done).length}/${this.jobs.length} VALIDADO`,'success');this.render();this.dispatchReady();
   if(!result.state.contract){this.onPaid?.(result.state.last);this.signal.visible=false}
  }catch(e){j.pending=false;j.hold=0;j.retryAt=this.clock+3;this.event('Entrega pendente de salvamento. Mantenha a carga no destino e aguarde.')}
 }
 resetCurrent(equipment){const j=this.job;if(!j)return;for(const e of equipment)if(e.attached===j.o)e.release(false);j.o.body.position.set(j.origin.x,j.origin.y+j.o.h/2+.01,j.origin.z);j.o.body.quaternion.set(0,0,0,1);j.o.body.velocity.setZero();j.o.body.angularVelocity.setZero();j.o.body.wakeUp();j.hold=0;this.event('Carga voltou à origem. Avarias e penalidades foram mantidas.')}
}
