export const PHASES=[
 {id:'export',name:'01 · Expedição',kind:'container',level:1,multiplier:1,description:'Retire containers das pilhas e carregue as duas pranchas.'},
 {id:'pallet',name:'02 · Carga fracionada',kind:'pallet',level:1,multiplier:.85,description:'Use a empilhadeira para levar pallets do armazém aos caminhões.'},
 {id:'import',name:'03 · Recebimento',kind:'container',level:2,multiplier:1.25,description:'Descarregue as pranchas e forme pilhas de containers.'},
 {id:'mixed',name:'04 · Fluxo integrado',kind:'container',level:3,multiplier:1.5,description:'Alterne recebimento e expedição entre pilhas altas e caminhões.'},
 {id:'pallet-in',name:'05 · Armazém',kind:'pallet',level:2,multiplier:1.1,description:'Retire pallets dos caminhões e acomode nas posições do armazém.'},
 {id:'port',name:'06 · Operação portuária',kind:'container',level:4,multiplier:1.85,description:'Mais precisão em pilhas de três níveis e operações mistas.'}
];
export const UPGRADE_PRICES={speed:600,arm:650,income:900,contracts:1200};
export const VEHICLE_PRICES={grapple:5000,forklift:2800};
export const level=s=>1+Math.floor(s.xp/600);
export function fresh(){return {money:0,xp:0,owned:['magnet'],testFleet:true,upgrades:{speed:0,arm:0,income:0,contracts:0},contract:null,last:null,totalDelivered:0,contractsDone:0}}
const fail=msg=>{throw new Error(msg)};
export function act(state,input,idFactory=()=>crypto.randomUUID()){
 const s=structuredClone(state),c=s.contract;let note='';
 if(input.action==='accept'){
  if(c)fail('Conclua o contrato atual antes de aceitar outro.');
  const phase=PHASES.find(p=>p.id===input.phase);if(!phase||level(s)<phase.level)fail('Fase ainda bloqueada.');
  if(phase.kind==='pallet'&&!s.testFleet&&!s.owned.includes('forklift'))fail('Compre uma empilhadeira na oficina.');
  const count=10+2*s.upgrades.contracts;
  s.contract={id:idFactory(),phase:phase.id,count,rate:Math.round(120*phase.multiplier*(1+s.upgrades.income*.25)),bonus:Math.round(400*phase.multiplier),done:[],damage:Array(count).fill(0),started:Date.now()};
 }else if(input.action==='damage'){
  if(!c||c.id!==input.contract)fail('Contrato não encontrado.');
  const i=input.index;if(!Number.isInteger(i)||i<0||i>=c.count)fail('Carga inválida.');
  if(!c.done.includes(i)){const damage=Math.max(c.damage[i],Math.min(100,Math.round(Number(input.damage)||0))),delta=damage-c.damage[i];c.damage[i]=damage;s.xp=Math.max(0,s.xp-delta*2);note=`Avaria: -${delta*2} XP`}
 }else if(input.action==='deliver'){
  if(!c){if(s.last?.id===input.contract)return {state:s,note:'Contrato já pago.'};fail('Contrato não encontrado.')}
  if(c.id!==input.contract)fail('Contrato diferente.');const i=input.index;
  if(!Number.isInteger(i)||i<0||i>=c.count)fail('Carga inválida.');
  if(!c.done.includes(i)){c.done.push(i);s.totalDelivered++}
  if(c.done.length===c.count){
   const gross=c.count*c.rate+c.bonus,loss=c.damage.reduce((n,d)=>n+Math.round(c.rate*d*.0075),0),xp=Math.round(c.damage.reduce((n,d)=>n+60*(1-d*.0075),0)+100);
   s.money+=gross-loss;s.xp+=xp;s.contractsDone++;s.last={id:c.id,gross,loss,paid:gross-loss,xp,count:c.count};s.contract=null;note='Contrato concluído e pago.';
  }
 }else if(input.action==='upgrade'){
  const name=input.name;if(!(name in UPGRADE_PRICES))fail('Melhoria inválida.');const n=s.upgrades[name];if(n>=3)fail('Melhoria no máximo.');
  const price=UPGRADE_PRICES[name]*2**n;if(s.money<price)fail('Saldo insuficiente.');s.money-=price;s.upgrades[name]++;
 }else if(input.action==='vehicle'){
  const name=input.name,price=VEHICLE_PRICES[name];if(!price)fail('Veículo inválido.');if(s.owned.includes(name))fail('Veículo já comprado.');if(s.money<price)fail('Saldo insuficiente.');s.money-=price;s.owned.push(name);
 }else if(input.action==='testFleet'){s.testFleet=!!input.enabled;}
 else fail('Ação inválida.');
 return {state:s,note};
}
