import fs from 'node:fs';
import os from 'node:os';
import {fileURLToPath,pathToFileURL} from 'node:url';
const source=fileURLToPath(new URL('../public/',import.meta.url)),test=fs.mkdtempSync(os.tmpdir()+'/terminal-check-');
process.on('exit',()=>fs.rmSync(test,{recursive:true,force:true}));
fs.symlinkSync(source+'/vendor',test+'/vendor');
fs.writeFileSync(test+'/package.json','{"type":"module"}');
fs.cpSync(source+'/src',test+'/src',{recursive:true});
let core=fs.readFileSync(test+'/src/core.js','utf8');core=core.replace(/export const renderer=new T.WebGLRenderer[^\n]+/,"export const renderer={domElement:{addEventListener(){},focus(){}},setSize(){},render(){}};");fs.writeFileSync(test+'/src/core.js',core);

let dispatch=fs.readFileSync(test+'/src/dispatch.js','utf8');dispatch=dispatch.replace(/import \{GLTFLoader\} from .*?;/,"class GLTFLoader{async loadAsync(){return {scene:new T.Group()}}}");fs.writeFileSync(test+'/src/dispatch.js',dispatch);
const {fresh,act,PHASES}=await import('../worker/economy.js');let saved=fresh();
globalThis.fetch=async(url,options)=>{if(url==='/api/profile')return new Response(JSON.stringify({state:saved,phases:PHASES}));const result=act(saved,JSON.parse(options.body),()=> 'smoke-contract');saved=result.state;return new Response(JSON.stringify(result))};
const noop=()=>{},context=new Proxy({},{get:(o,k)=>o[k]||noop,set:(o,k,v)=>(o[k]=v,true)}),els=new Map(),handlers={};
function element(){return {textContent:'',innerHTML:'',style:{},dataset:{},events:{},getContext:()=>context,addEventListener(k,fn){this.events[k]=fn},setAttribute:noop,focus:noop,querySelectorAll:()=>[],classList:{add:noop,remove:noop,toggle:noop}}}
const tabs=['home','contracts','shop','help'].map(tab=>({...element(),dataset:{tab}}));
globalThis.document={createElement:()=>({...element(),width:512,height:128}),querySelector(id){if(!els.has(id))els.set(id,element());return els.get(id)},querySelectorAll:()=>tabs,addEventListener:noop,exitPointerLock:noop};globalThis.innerWidth=1600;globalThis.innerHeight=1000;globalThis.HTMLButtonElement=class{};globalThis.addEventListener=(event,fn)=>handlers[event]=fn;let nextFrame;globalThis.requestAnimationFrame=fn=>nextFrame=fn;globalThis.window=globalThis;
await import(pathToFileURL(test+'/src/main.js').href);const flush=async()=>{for(let i=0;i<15;i++)await new Promise(r=>setTimeout(r,0))};await flush();let now=performance.now();const frame=(n=1)=>{for(let i=0;i<n;i++){now+=1000/60;nextFrame(now)}};const key=code=>handlers.keydown({code,preventDefault:noop,repeat:false,target:{}}),up=code=>handlers.keyup({code});const assert=(cond,message)=>{if(!cond)throw Error(message)};
const click=(action,value)=>els.get('#menuBody').events.click({target:{closest:()=>({dataset:{action,value}})}});
assert(els.get('#menuBody').innerHTML.includes('ENTRAR NO PÁTIO'),'Initial campaign menu');click('play');frame(15);assert(els.get('#model').textContent.includes('RS–40'),'Starts in magnetic vehicle');key('KeyF');frame(15);assert(els.get('#model').textContent.includes('PÉ'),'Exit vehicle');key('KeyW');frame(30);up('KeyW');key('KeyA');frame(185);up('KeyA');key('KeyE');await flush();assert(els.get('#menuBody').innerHTML.includes('ATENDIMENTO ABERTO'),'Walk to gate to accept contracts');click('accept','export');await flush();frame(20);assert(els.get('#count').textContent==='0 / 10','Accepted 10-position contract');assert(saved.contract.phase==='export','Contract persisted');key('Tab');assert(els.get('#manifestBody').innerHTML.includes('CNT-001'),'Manifest lists individual cargos');key('Tab');console.log('PASS: campaign menu, magnet start, exit, first-person gate visit, contract acceptance and manifest.');
