export const currency=n=>'R$ '+Math.round(n).toLocaleString('pt-BR');
export const level=s=>1+Math.floor(s.xp/600);
export class Profile{
 constructor(onChange,onError){this.state=null;this.phases=[];this.onChange=onChange;this.onError=onError;this.queue=Promise.resolve()}
 async load(){const r=await fetch('/api/profile');const data=await r.json();if(!r.ok)throw Error(data.error);this.state=data.state;this.phases=data.phases;this.onChange?.(this.state);return this.state}
 action(input){const work=async()=>{const r=await fetch('/api/action',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});const data=await r.json();if(!r.ok)throw Error(data.error);this.state=data.state;this.onChange?.(this.state);return data};const result=this.queue.then(work);this.queue=result.catch(e=>this.onError?.(e.message));return result}
 owns(model){return model==='magnet'||this.state?.testFleet||this.state?.owned.includes(model)}
}
