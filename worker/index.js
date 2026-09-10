import {fresh,act,PHASES} from './economy.js';
const json=(value,status=200,headers={})=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store',...headers}});
export default {async fetch(request,env){
 const url=new URL(request.url);if(!url.pathname.startsWith('/api/'))return serveAsset(request);
 try{
  if(!env.DB)return json({error:'Salvamento indisponível. Tente novamente.'},503);
  if(request.method!=='GET'&&request.headers.get('Origin')!==url.origin)return json({error:'Origem inválida.'},403);
  let token=request.headers.get('Cookie')?.match(/(?:^|;\s*)terminal_save=([a-f0-9-]{36})/)?.[1],setCookie;
  if(!token){token=crypto.randomUUID();setCookie=`terminal_save=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=31536000`}
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token)),id=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
  await env.DB.prepare('INSERT OR IGNORE INTO terminal_saves (id,state,revision,updated) VALUES (?,?,0,?)').bind(id,JSON.stringify(fresh()),Date.now()).run();
  const headers=setCookie?{'Set-Cookie':setCookie}:{};
  if(url.pathname==='/api/profile'&&request.method==='GET'){const row=await env.DB.prepare('SELECT state,revision FROM terminal_saves WHERE id=?').bind(id).first();return json({state:JSON.parse(row.state),revision:row.revision,phases:PHASES},200,headers)}
  if(url.pathname==='/api/action'&&request.method==='POST'){
   const raw=await request.text();if(raw.length>4096)return json({error:'Pedido muito grande.'},413);const input=JSON.parse(raw);
   for(let attempt=0;attempt<3;attempt++){
    const row=await env.DB.prepare('SELECT state,revision FROM terminal_saves WHERE id=?').bind(id).first();
    let next;try{next=act(JSON.parse(row.state),input)}catch(e){return json({error:e.message},400,headers)}
    const result=await env.DB.prepare('UPDATE terminal_saves SET state=?,revision=revision+1,updated=? WHERE id=? AND revision=?').bind(JSON.stringify(next.state),Date.now(),id,row.revision).run();
    if(result.meta.changes)return json({...next,revision:row.revision+1},200,headers);
   }return json({error:'Outra ação está sendo salva. Tente novamente.'},409,headers);
  }return json({error:'Rota não encontrada.'},404);
 }catch(e){console.error('Campaign persistence:',e.message);return json({error:'Não foi possível salvar. Sua ação pode ser tentada novamente.'},503)}
}};
