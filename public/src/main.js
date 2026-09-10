import {T,scene,world,renderer,camera,sync,followSun} from './core.js';
import {buildYard,containers} from './yard.js';
import {Vehicle} from './vehicle.js';
import {Cable} from './cable.js';
import {Grapple} from './grapple.js';
import {Forklift,Forks} from './forklift.js';
import {Walking} from './walking.js';
import {Contracts,GATE} from './contracts.js';
import {loadTruckModel,pallet} from './dispatch.js';
import {Profile,currency,level} from './profile.js';
import {Menu} from './menu.js';
import {improveLighting} from './lighting.js';
import {ChaseCamera} from './camera.js';
import {AudioEngine} from './audio.js';
import {batchMeshes} from './optimize.js';
const $=id=>document.querySelector('#'+id),keys=new Set(),idleKeys=new Set(),audio=new AudioEngine();
let started=false,paused=true,assetsReady=false,manifestOpen=false,toastTimer=0,menu;
function event(message,type='hint'){$('toast').textContent=message;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),4300);audio.sound(type)}
buildYard(true);const staticYard=new T.Group();scene.add(staticYard);for(const o of [...scene.children])if(o!==staticYard&&(o.isMesh||o.isGroup))staticYard.add(o);batchMeshes(staticYard);
for(let i=0;i<7;i++)pallet('LIVRE-'+(i+1),-7+i*3.5,.61,38);
const crane=new Vehicle({spawn:[-38,1.2,40]}),stacker=new Vehicle({model:'grapple',spawn:[-26,1.2,40]}),forklift=new Forklift({spawn:[-14,1.2,40]});
const fleet=[{vehicle:crane,equipment:new Cable(crane,event),name:'RS–40 / ÍMÃ'},{vehicle:stacker,equipment:new Grapple(stacker,event),name:'RS–60 / GARRA'},{vehicle:forklift,equipment:new Forks(forklift,event),name:'FL–80 / GARFOS'}];
for(const f of fleet){batchMeshes(f.vehicle.mesh,false);for(const wheel of f.vehicle.wheels)batchMeshes(wheel.rolling)}
let active=0,vehicle=crane,cable=fleet[0].equipment;const walker=new Walking(),chase=new ChaseCamera(vehicle);renderer.domElement.tabIndex=0;improveLighting();
const profile=new Profile(s=>{for(const f of fleet){f.vehicle.speedMultiplier=1+s.upgrades.speed*.18;f.vehicle.armMultiplier=1+s.upgrades.arm*.25}menu?.render()},message=>event(message));
const contracts=new Contracts(profile,event,result=>{event(`CONTRATO PAGO · ${currency(result.paid)} · +${result.xp} XP${result.loss?' · Avarias: -'+currency(result.loss):''}`,'success');if(manifestOpen)renderManifest()});
const atGate=()=>walker.active&&Math.hypot(walker.body.position.x-GATE.x,walker.body.position.z-GATE.z)<4.5;
function setActive(index){active=index;vehicle=fleet[index].vehicle;cable=fleet[index].equipment;chase.vehicle=vehicle}
function play(){if(!assetsReady){menu.open();menu.error='O caminhão ainda está carregando. Aguarde e tente novamente.';menu.render();return}started=true;paused=false;keys.clear();$('pauseOverlay').classList.add('hidden');renderer.domElement.focus({preventScroll:true});if(!contracts.spec)event('F: saia da cabine. Vá à portaria e pressione E para retirar um contrato.')}
function pause(){paused=true;keys.clear();document.exitPointerLock?.();if(audio.ctx)audio.master.gain.setTargetAtTime(0,audio.ctx.currentTime,.1)}
async function load(){await Promise.all([profile.load(),loadTruckModel()]);assetsReady=true;if(profile.state.contract&&!contracts.spec)contracts.prepare(profile.state.contract);menu.render()}
menu=new Menu(profile,{pause,play,load,atGate,accept:phase=>contracts.accept(phase),canChangeFleet:()=>fleet.every(f=>!f.equipment.attached),fleetChanged:()=>{if(!profile.owns(vehicle.model)){if(walker.active)walker.enter();setActive(0);chase.enabled=true}}});
load().catch(e=>{menu.error=e.message||'Não foi possível carregar. Tente novamente.';menu.render()});
function enterExit(){
 if(!started||paused)return;
 if(walker.active){let nearest=-1,dist=5.5;fleet.forEach((f,i)=>{const d=walker.body.position.distanceTo(f.vehicle.body.position);if(d<dist){dist=d;nearest=i}});if(nearest<0){event('Aproxime-se da cabine de um veículo.');return}if(!profile.owns(fleet[nearest].vehicle.model)){event('Veículo bloqueado. Compre na oficina.');return}walker.enter();setActive(nearest);chase.enabled=true;event('CABINE · '+fleet[nearest].name)}
 else{if(Math.abs(vehicle.speed)>.3){event('Pare o veículo antes de sair.');return}if(cable.attached){event('Solte a carga antes de sair da cabine.');return}if(!walker.exit(vehicle)){event('Não há espaço livre junto à cabine. Mude de posição.');return}chase.enabled=false;chase.drag=false;event('A PÉ · Clique para olhar. E atende na portaria; F entra numa cabine.')}
 keys.clear();$('crosshair').classList.toggle('hidden',!walker.active);renderer.domElement.focus({preventScroll:true});
}
function renderManifest(){const list=contracts.jobs;$('manifestBody').innerHTML=list.length?list.map(j=>`<div class="manifestRow ${j.done?'done':''}"><span>${String(j.index+1).padStart(2,'0')}</span><div>${j.o.id} · ${j.o.kind==='pallet'?'Pallet':'Container'}<small>${j.inbound?'Caminhão '+(j.truck.index+1)+' → '+(j.o.kind==='pallet'?'Armazém':'Pilha'):(j.o.kind==='pallet'?'Armazém':'Pilha')+' → Caminhão '+(j.truck.index+1)} · Avaria ${j.o.damage||0}%</small></div><b>${j.done?'ENTREGUE':j.pending?'SALVANDO':'PENDENTE'}</b></div>`).join(''):'<p>Visite a portaria a pé e pressione E para retirar uma lista.</p>'}
function toggleManifest(){if(menu.visible)return;manifestOpen=!manifestOpen;$('manifest').classList.toggle('hidden',!manifestOpen);if(manifestOpen){pause();renderManifest()}else{paused=false;renderer.domElement.focus({preventScroll:true})}}
$('closeManifest').onclick=toggleManifest;
$('vehicleSwitch').onclick=enterExit;$('openShop').onclick=()=>menu.open('shop');$('pause').onclick=()=>menu.open();$('help').onclick=()=>menu.open('help');$('resume').onclick=()=>{menu.visible=false;$('overlay').classList.add('hidden');play()};$('reset').onclick=()=>{if(started&&!paused)contracts.resetCurrent(fleet.map(f=>f.equipment))};$('pauseReset').onclick=()=>contracts.resetCurrent(fleet.map(f=>f.equipment));
$('audio').onclick=()=>{try{$('audio').textContent=audio.toggle()?'SOM ON':'SOM OFF'}catch{event('Áudio indisponível neste navegador.')}};
const controls=new Set(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyQ','KeyE','KeyZ','KeyX','KeyJ','KeyL','KeyF','Space','Escape','KeyR','Tab','ShiftLeft']);
addEventListener('keydown',e=>{if(!controls.has(e.code))return;if(e.code==='Space'&&e.target instanceof HTMLButtonElement)return;e.preventDefault();if(e.repeat)return;
 if(e.code==='Escape'){if(manifestOpen){toggleManifest();return}if(menu.visible&&started){menu.close();return}menu.open();return}
 if(e.code==='Tab'){toggleManifest();return}if(!started||paused)return;if(e.code==='KeyF'){enterExit();return}
 if(walker.active&&e.code==='KeyE'){if(atGate())menu.open('contracts');else event('Visite a portaria marcada no mapa.');return}
 if(e.code==='Space'){if(!walker.active)cable.toggle();return}if(e.code==='KeyR'){contracts.resetCurrent(fleet.map(f=>f.equipment));return}keys.add(e.code);
});addEventListener('keyup',e=>keys.delete(e.code));
addEventListener('blur',()=>{keys.clear();if(started&&!menu.visible&&!manifestOpen)menu.open()});document.addEventListener('visibilitychange',()=>{if(document.hidden&&started)menu.open()});document.addEventListener('pointerlockchange',()=>{if(walker.active&&!document.pointerLockElement&&started&&!menu.visible&&!manifestOpen)menu.open()});
const mini=$('minimap'),ctx=mini.getContext('2d');
function map(){const w=mini.width,h=mini.height,s=1.58,pos=(x,z)=>[w/2+x*s,h/2+z*s*.82];ctx.clearRect(0,0,w,h);ctx.fillStyle='#213b31';ctx.fillRect(7,7,w-14,h-14);ctx.strokeStyle='#50654b';ctx.strokeRect(10,10,w-20,h-20);
 for(const o of containers){if(o.removed)continue;const [x,y]=pos(o.body.position.x,o.body.position.z);ctx.fillStyle=o.kind==='pallet'?'#b29162':o.body.mass?'#9da989':'#536f57';ctx.fillRect(x-o.w*s/2,y-o.d*s*.82/2,o.w*s,o.d*s*.82)}
 for(const t of contracts.trucks){if(t.state==='gone')continue;const [x,y]=pos(t.x-4,t.z);ctx.fillStyle='#a0afaa';ctx.fillRect(x-10,y-2,20,4)}
 const job=contracts.job;if(job){let [x,y]=pos(job.t.x,job.t.z);ctx.strokeStyle='#c2f16f';ctx.lineWidth=1.7;ctx.strokeRect(x-job.t.w*s/2,y-job.t.d*s*.82/2,job.t.w*s,job.t.d*s*.82);[x,y]=pos(job.o.body.position.x,job.o.body.position.z);ctx.fillStyle='#ffa35f';ctx.beginPath();ctx.arc(x,y,3.5,0,Math.PI*2);ctx.fill()}
 let [gx,gy]=pos(GATE.x,GATE.z);ctx.fillStyle='#c2f16f';ctx.fillRect(gx-3,gy-3,6,6);ctx.font='8px Arial';ctx.fillText('PORTARIA',gx-10,gy+12);
 fleet.forEach((f,i)=>{const [x,y]=pos(f.vehicle.body.position.x,f.vehicle.body.position.z);ctx.fillStyle=i===active&&!walker.active?'#f0f4d9':'#e4b65f';ctx.beginPath();ctx.arc(x,y,2.4,0,Math.PI*2);ctx.fill()});
 const p=walker.active?walker.body.position:vehicle.body.position,[x,y]=pos(p.x,p.z);ctx.save();ctx.translate(x,y);ctx.rotate(-(walker.active?walker.yaw:vehicle.heading));ctx.fillStyle='#f0f4d9';ctx.beginPath();ctx.moveTo(0,-6);ctx.lineTo(-4,4);ctx.lineTo(4,4);ctx.closePath();ctx.fill();ctx.restore();
}
function hud(){
 const state=profile.state,job=contracts.job,spec=contracts.spec,done=contracts.jobs.filter(j=>j.done).length;
 if(state){$('wallet').textContent=currency(state.money);$('playerLevel').textContent='NÍVEL '+level(state)+' · '+state.xp+' XP'}
 $('missionNumber').textContent=spec?'CONTRATO · '+spec.id.slice(0,6).toUpperCase():'PORTARIA / CONTRATOS';$('objective').textContent=job?job.o.id+' · '+(job.o.kind==='pallet'?'Pallet':'Container'):spec?'Contrato concluído':'Retire seu contrato';$('description').textContent=job?(job.inbound?'Retire a carga do caminhão e acomode '+(job.o.kind==='pallet'?'no armazém.':'sobre a pilha.'):job.o.kind==='pallet'?'Leve o pallet do armazém para a prancha usando a empilhadeira.':'Retire o container da pilha e carregue a prancha marcada.'):'Saia da cabine com F. Vá à portaria e pressione E para escolher uma lista.';
 $('origin').textContent=job?(job.inbound?'Caminhão '+(job.truck.index+1):job.o.kind==='pallet'?'Armazém':'Pilha'):'Sua cabine';$('destination').textContent=job?(job.inbound?(job.o.kind==='pallet'?'Armazém':'Pilha'):'Prancha '+(job.index%2+1)):'Portaria';$('count').textContent=done+' / '+(spec?.count||10);$('progressBar').style.width=(spec?done/spec.count*100:0)+'%';
 $('stage').textContent=job?(job.pending?'Salvando posicionamento…':cable.attached===job.o?'Transporte com cuidado · evite avarias':'Alinhe e conecte a carga'):'Pagamento no fim da lista';
 $('model').textContent=walker.active?'OPERADOR A PÉ':fleet[active].name;$('vehicleSwitch').textContent=walker.active?'F · ENTRAR NA CABINE':'F · SAIR DA CABINE';$('attachmentLabel').textContent=active===0?'CABO':active===1?'HASTE':'GARFOS';$('speed').textContent=String(Math.round((walker.active?walker.body.velocity.length():Math.abs(vehicle.speed))*3.6)).padStart(2,'0');$('gear').textContent=walker.active?'P':Math.abs(vehicle.speed)<.2?'N':vehicle.speed>0?'D':'R';$('boomValue').textContent=active===2?vehicle.forkHeight.toFixed(1)+' m':Math.round(vehicle.lift*180/Math.PI)+'°';$('ropeValue').textContent=(cable.length||0).toFixed(1)+' m';$('weight').textContent=cable.attached?cable.attached.kind==='pallet'?'160 kg':'0,85 t':'—';
 const load=cable.attached||job?.o,damage=load?.damage||0;$('integrity').textContent=(100-damage)+'%';$('integrityBar').style.width=(100-damage)+'%';$('integrityBar').style.background=damage>40?'#ef9272':'#c2f16f';$('connection').classList.toggle('attached',!!cable.attached);$('connection').innerHTML='<i></i> CARGA: '+(cable.attached?'CONECTADA':'NÃO CONECTADA');
 const candidate=!walker.active?cable.candidate():null;$('prompt').style.display=started&&!paused&&!walker.active&&(cable.attached||candidate)?'flex':'none';$('promptText').textContent=cable.attached?'Soltar carga · J/L alinha':'Conectar carga';
 $('contextPrompt').textContent=started&&!paused?(walker.active?(atGate()?'E · RETIRAR CONTRATO NA PORTARIA':fleet.some(f=>walker.body.position.distanceTo(f.vehicle.body.position)<5.5)?'F · ENTRAR NO VEÍCULO':'WASD · Caminhar / clique para olhar · Portaria no mapa'):!spec?'F · Saia da cabine e visite a portaria':''):'';map();
}
let last=performance.now(),acc=0,elapsed=0,hudAcc=0;const dt=1/60;
function frame(now){requestAnimationFrame(frame);const delta=Math.min((now-last)/1000,.08);last=now;
 if(started&&!paused){acc+=delta;let n=0;while(acc>=dt&&n++<5){
  for(let i=0;i<fleet.length;i++){const f=fleet[i],input=!walker.active&&i===active?keys:idleKeys;f.vehicle.update(dt,input,!!f.equipment.attached);f.equipment.update(dt,input)}
  walker.update(dt,keys);contracts.update(dt,fleet.map(f=>f.equipment),[...fleet.map(f=>f.vehicle.body),...(walker.active?[walker.body]:[])]);world.step(dt);elapsed+=dt;acc-=dt;
 }
 for(const f of fleet){f.vehicle.draw();f.equipment.draw()}for(const o of containers)if(o.body.mass&&!o.removed)sync(o.mesh,o.body);audio.update(walker.active?0:vehicle.speed,['ArrowUp','ArrowDown','KeyQ','KeyE','KeyJ','KeyL'].some(k=>keys.has(k)));if(audio.ctx)audio.master.gain.setTargetAtTime(audio.enabled?.22:0,audio.ctx.currentTime,.1);
 }else acc=0;
 if(walker.active)walker.draw();else chase.update(delta);hudAcc+=delta;if(hudAcc>.1){hud();hudAcc=0}followSun(walker.active?walker.body.position:vehicle.body.position);renderer.render(scene,camera);
}
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
window.addEventListener('error',e=>{event('A operação encontrou um erro: '+e.message)});renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();menu.open();menu.error='Renderização interrompida. Recarregue a página.';menu.render()});hud();requestAnimationFrame(frame);
