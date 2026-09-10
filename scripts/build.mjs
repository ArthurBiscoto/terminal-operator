import fs from 'node:fs';import path from 'node:path';
fs.rmSync('dist',{recursive:true,force:true});fs.mkdirSync('dist/server',{recursive:true});fs.mkdirSync('dist/.openai',{recursive:true});
fs.copyFileSync('.openai/hosting.json','dist/.openai/hosting.json');
const assets={};const types={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.glb':'model/gltf-binary','.png':'image/png','.txt':'text/plain; charset=utf-8'};
function walk(dir){for(const item of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,item.name);if(item.isDirectory())walk(p);else assets['/'+path.relative('public',p).replaceAll('\\','/')]=[types[path.extname(p)]||'application/octet-stream',fs.readFileSync(p).toString('base64')]}}walk('public');
const serve=`const ASSETS=${JSON.stringify(assets)};function serveAsset(request){let key=new URL(request.url).pathname;if(key==='/')key='/index.html';const entry=ASSETS[key];if(!entry)return new Response('Not found',{status:404});const bytes=Uint8Array.from(atob(entry[1]),c=>c.charCodeAt(0));return new Response(request.method==='HEAD'?null:bytes,{headers:{'Content-Type':entry[0],'Cache-Control':'no-cache'}})}\n`;
const economy=fs.readFileSync('worker/economy.js','utf8').replaceAll('export ','');const worker=fs.readFileSync('worker/index.js','utf8').replace(/import .*?;\n/,'');fs.writeFileSync('dist/server/index.js',serve+economy+'\n'+worker);
console.log(`Built Worker + ${Object.keys(assets).length} assets; D1 campaign persistence.`);
