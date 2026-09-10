import fs from 'node:fs';
import os from 'node:os';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';
const source=fileURLToPath(new URL('../public/',import.meta.url)),test=fs.mkdtempSync(os.tmpdir()+'/terminal-check-');
process.on('exit',()=>fs.rmSync(test,{recursive:true,force:true}));
fs.symlinkSync(source+'/vendor',test+'/vendor');
fs.writeFileSync(test+'/package.json','{"type":"module"}');
fs.cpSync(source+'/src',test+'/src',{recursive:true});if(!fs.existsSync(test+'/vendor'))fs.symlinkSync(source+'/vendor',test+'/vendor');
let core=fs.readFileSync(test+'/src/core.js','utf8');core=core.replace(/export const renderer=new T.WebGLRenderer[^\n]+/,"export const renderer={domElement:{addEventListener(){}},setSize(){}};");fs.writeFileSync(test+'/src/core.js',core);fs.writeFileSync(test+'/package.json','{"type":"module"}');
const els=new Map();globalThis.document={createElement(){return {width:512,height:128,getContext(){return new Proxy({},{get:(o,k)=>o[k]||(()=>{}),set:(o,k,v)=>(o[k]=v,true)})}}},querySelector(id){if(!els.has(id))els.set(id,{textContent:'',style:{}});return els.get(id)}};globalThis.document.addEventListener=()=>{};globalThis.document.exitPointerLock=()=>{};globalThis.innerWidth=1440;globalThis.innerHeight=900;
const {T,C,world,scene}=await import(pathToFileURL(test+'/src/core.js').href);const {buildYard,containers}=await import(pathToFileURL(test+'/src/yard.js').href);const {Vehicle}=await import(pathToFileURL(test+'/src/vehicle.js').href);const {Cable}=await import(pathToFileURL(test+'/src/cable.js').href);const {Missions,validPlacement}=await import(pathToFileURL(test+'/src/missions.js').href);const {batchMeshes}=await import(pathToFileURL(test+'/src/optimize.js').href);

const {Contracts}=await import(pathToFileURL(test+'/src/contracts.js').href);
const {Forklift,Forks}=await import(pathToFileURL(test+'/src/forklift.js').href);
const {Walking}=await import(pathToFileURL(test+'/src/walking.js').href);
const {fresh,act,PHASES}=await import('../worker/economy.js');
function assert(condition,message){if(!condition)throw Error(message)}
const profile={state:{...fresh(),xp:5000},phases:PHASES,async action(input){const result=act(this.state,input,()=> 'contract-'+input.phase);this.state=result.state;return result}};
const paid=[];const contract=new Contracts(profile,()=>{},result=>paid.push(result));buildYard(true);
await contract.accept('export');assert(contract.jobs.length===10,'Initial list has 10 jobs');assert(contract.trucks.length===5,'Five double-deck trucks');assert(contract.jobs.every(j=>j.origin.y===2.6&&j.t.y===1.7),'Stack to flatbed only');
contract.clock=3;const j=contract.jobs[0];contract.impact(j,{contact:{getImpactVelocityAlongNormal:()=>6}});await Promise.resolve();assert(j.o.damage===28,'Impact damage recorded');assert(profile.state.xp===4944,'Impact deducts XP');contract.impact(j,{contact:{getImpactVelocityAlongNormal:()=>6}});assert(j.o.damage===28,'Contact cooldown prevents duplicate damage');
for(const j of contract.jobs){j.o.body.position.set(j.t.x,j.t.y+j.o.h/2+.01,j.t.z);j.o.body.velocity.setZero();j.o.body.angularVelocity.setZero()}
for(let i=0;i<300;i++){contract.update(1/60,[],[]);world.step(1/60);await Promise.resolve()}
assert(contract.jobs.every(j=>j.done),'Actual deck support validates all placements');assert(paid.length===1,'One payout');assert(contract.trucks.every(t=>t.state==='departing'),'Complete trucks depart');const oldX=contract.trucks[0].x;for(let i=0;i<180;i++){contract.update(1/60,[],[]);world.step(1/60)}assert(contract.trucks[0].x>oldX+4,'Truck moves with secured cargo');
console.log('PASS: 10 stack jobs, two deck slots, impact penalties, stable deliveries, one payout and loaded departures');
await contract.accept('pallet');assert(contract.jobs.every(j=>j.o.kind==='pallet'),'Dedicated pallet contract');
const forklift=new Forklift({spawn:[-12,1.2,-26+4.9*.48+1.4]}),forks=new Forks(forklift,()=>{});for(let i=0;i<180;i++){forklift.update(1/60,new Set(),false);forks.update(1/60,new Set());world.step(1/60)}
const insertionStart=contract.jobs[0].o.body.position.clone();for(let i=0;i<175;i++){forklift.body.position.z-=.008;forklift.update(1/60,new Set(),false);forks.update(1/60,new Set());world.step(1/60)}assert(contract.jobs[0].o.body.position.distanceTo(insertionStart)<.05,'Fork tunnels admit both prongs without pushing the pallet');
assert(forks.candidate()===contract.jobs[0].o,'Forks align below warehouse pallet');const cargo=forks.candidate(),before=cargo.body.position.clone();forks.toggle();assert(cargo.body.position.distanceTo(before)<1e-8,'No teleport on capture');for(let i=0;i<180;i++){const keys=new Set(['ArrowUp']);forklift.update(1/60,keys,true);forks.update(1/60,keys);world.step(1/60)}assert(cargo.body.position.y>3,'Forklift lifts pallet');for(let i=0;i<200;i++){const keys=new Set(['ArrowDown']);forklift.update(1/60,keys,true);forks.update(1/60,keys);world.step(1/60)}forks.release(false);for(let i=0;i<180;i++){const keys=new Set(['KeyS']);forklift.update(1/60,keys,false);forks.update(1/60,keys);world.step(1/60)}assert(cargo.body.position.y<1,'Released pallet settles');
console.log('PASS: pallet contracts, fork capture, physical elevation and release');
const walker=new Walking();forklift.body.position.set(-14,1.2,40);forklift.draw();forklift.mesh.updateMatrixWorld(true);forklift.mastColliders.sync(0);assert(walker.exit(forklift),'Exit into free space');const p=walker.body.position.clone();for(let i=0;i<60;i++){walker.update(1/60,new Set(['KeyW']));world.step(1/60)}assert(walker.body.position.distanceTo(p)>2,'First-person walking moves');walker.enter();assert(!world.bodies.includes(walker.body),'Entering removes pedestrian collider');console.log('PASS: exit, physical first-person movement and re-entry');
