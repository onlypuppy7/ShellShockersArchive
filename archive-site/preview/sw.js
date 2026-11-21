import {isGameHost,rewriteCSS,patchScript,hasClassicAdapter} from './rewrite.mjs';
import {safePath} from '../zip.mjs';
import {donorIndex,mapPair} from './fallback.mjs';

const SESSIONS='shellshock-preview-sessions-v1',PAYLOADS='shellshock-preview-payloads-v1';
const memory=new Map();
const histories=new Map();
const manifests=new Map();
const mapPairIndexes=new Map();
const scope=new URL(self.registration.scope);
const sessionKey=token=>new URL(`_sessions/${token}`,scope).href;
const mime=path=>({js:'text/javascript',mjs:'text/javascript',css:'text/css',html:'text/html',json:'application/json',babylon:'application/json',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',gif:'image/gif',svg:'image/svg+xml',webp:'image/webp',ico:'image/x-icon',woff:'font/woff',woff2:'font/woff2',ttf:'font/ttf',ogg:'audio/ogg',mp3:'audio/mpeg',wav:'audio/wav',webm:'audio/webm',mp4:'video/mp4',wasm:'application/wasm'}[path.split('.').pop().toLowerCase()]||'application/octet-stream');
const csp="default-src 'none'; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; worker-src 'self' blob:; frame-src 'none'; object-src 'none'; base-uri 'self'; form-action 'none'";
function response(body,type='text/plain',status=200,extra={}){return new Response(body,{status,headers:{'Content-Type':type,'Content-Security-Policy':csp,'Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff',...extra}});}
function parseRun(url){
  const u=new URL(url);if(u.origin!==scope.origin||!u.pathname.startsWith(scope.pathname+'run/'))return null;
  const rest=u.pathname.slice((scope.pathname+'run/').length),slash=rest.indexOf('/');
  if(slash<0)return null;const token=rest.slice(0,slash);if(!/^[a-f0-9-]{36}$/.test(token))return null;
  return {token,path:decodeURIComponent(rest.slice(slash+1))||'index.html',url:u};
}
async function getSession(token){
  if(memory.has(token))return memory.get(token);
  const saved=await (await caches.open(SESSIONS)).match(sessionKey(token));if(!saved)return null;
  const session=await saved.json();session.inventory=new Map(session.files.map(f=>[f.path,f]));memory.set(token,session);return session;
}
async function report(token,message,error=false,extra={}){
  const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
  for(const client of windows)if(client.url.startsWith(scope.href)&&!parseRun(client.url))client.postMessage({type:'diagnostic',token,message,error,...extra});
}
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('message',event=>{
  if(event.data?.type!=='configure')return;
  event.waitUntil((async()=>{
    try{
      if(!event.source?.url.startsWith(scope.href)||parseRun(event.source.url))throw new Error('Invalid preview controller.');
      const {token,archiveBase,folder,version,development,files,catalogGenerated,html}=event.data;
      if(!/^[a-f0-9-]{36}$/.test(token)||!Array.isArray(files)||typeof html!=='string')throw new Error('Invalid preview session.');
      const base=new URL(archiveBase);if(!/^https?:$/.test(base.protocol))throw new Error('Invalid archive URL.');
      const paths=new Set();for(const f of files){safePath(f.path);safePath(f.source);if(paths.has(f.path)||!/^[a-f0-9]{64}$/i.test(f.sha256))throw new Error('Invalid file inventory.');paths.add(f.path);}
      const session={token,archiveBase,folder,version,development,files,catalogGenerated,html};
      const saved=await caches.open(SESSIONS),serialized=JSON.stringify(session);
      try{await saved.put(sessionKey(token),new Response(serialized));}
      catch(error){
        if(error.name!=='QuotaExceededError')throw error;
        // Payloads are disposable verified copies. A long version sweep must
        // not prevent a fresh session from starting when the cache fills up.
        const payloads=await caches.open(PAYLOADS),keys=await payloads.keys();
        for(const key of keys.slice(0,Math.max(32,Math.ceil(keys.length/3))))await payloads.delete(key);
        await saved.put(sessionKey(token),new Response(serialized));
      }
      session.inventory=new Map(files.map(f=>[f.path,f]));memory.set(token,session);event.ports[0]?.postMessage({ok:true});
    }catch(error){event.ports[0]?.postMessage({error:error.message});}
  })());
});
async function borrow(path,session){
  const generation=session.catalogGenerated||'';
  const indexURL=new URL('../file-index.json',scope);indexURL.searchParams.set('catalog',generation);
  if(!histories.has(generation))histories.set(generation,fetch(indexURL,{cache:'no-store'}).then(async r=>{
    if(!r.ok)throw new Error('Could not load the cross-version file index.');
    const index=await r.json();if(index.formatVersion!==1)throw new Error('Unsupported file index.');
    return index;
  }).catch(error=>{histories.delete(generation);throw error;}));
  const index=await histories.get(generation),selected=index.folders.indexOf(session.folder);
  if(selected<0)return null;
  if(index.catalogGenerated!==session.catalogGenerated){histories.delete(generation);throw new Error('The archive changed while this preview was open. Refresh the preview page to load the current index.');}
  const key=session.development&&index.paths['_dev/'+path]?'_dev/'+path:path;
  const donor=donorIndex(index.paths[key]||[],selected);if(donor<0)return null;
  const folder=safePath(index.folders[donor]),url=new URL(folder+'/delta.json',session.archiveBase).href;
  const manifestKey=generation+'\n'+url;
  if(!manifests.has(manifestKey))manifests.set(manifestKey,fetch(url,{cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer'}).then(async r=>{
    if(!r.ok)throw new Error(`Could not load donor inventory: ${folder} (HTTP ${r.status}).`);
    const data=await r.json();if(data.folder!==folder||!Array.isArray(data.files))throw new Error('Invalid donor inventory.');return data;
  }).catch(error=>{manifests.delete(manifestKey);throw error;}));
  const data=await manifests.get(manifestKey),file=data.files.find(f=>f.path===key);
  if(!file)throw new Error(`File index mismatch: ${key} is absent from ${folder}.`);
  safePath(file.path);safePath(file.source);if(!/^[a-f0-9]{64}$/i.test(file.sha256))throw new Error('Invalid donor integrity hash.');
  const borrowed={path,donor:folder,source:file.source,direction:donor<selected?'previous':'first later'};
  if(/^maps\/.*\.json$/i.test(path)&&donor>selected){
    const source=String(file.source).split('/')[0],date=source.match(/_(\d{4}-\d{2}-\d{2})_/)?.[1]||folder.match(/_(\d{4}-\d{2}-\d{2})_/)?.[1];
    await report(session.token,`Map disclaimer: ${path} uses a newer map file from ${source}. It may differ from this client's original maps.`,false,{mapProvenance:{path,source,version:source.split('_')[0],date}});
  }
  await report(session.token,`Missing from selected capture: ${path} → ${borrowed.direction} capture ${folder}; stored source ${file.source}. Historical pairing unverified.`,false,{borrowed});
  return file;
}
async function verified(file,session){
  const cache=await caches.open(PAYLOADS),key=new URL(`_payloads/${file.sha256}`,scope).href;
  const cached=await cache.match(key);if(cached)return cached.arrayBuffer();
  const url=new URL(file.source.split('/').map(encodeURIComponent).join('/'),session.archiveBase);
  const fetched=await fetch(url,{credentials:'omit',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(45000)});
  if(!fetched.ok)throw new Error(`Download failed: ${file.path} (HTTP ${fetched.status})`);
  const body=await fetched.arrayBuffer();
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',body)),v=>v.toString(16).padStart(2,'0')).join('');
  if(hash!==file.sha256.toLowerCase())throw new Error(`Integrity check failed: ${file.path}`);
  try{await cache.put(key,new Response(body));}catch{/* A full cache must not prevent a preview. */}
  return body;
}
async function pairedMap(path,session){
  const mapPath=path.replace(/\.lightmap$/i,'.json');
  session.mapPairs ||= new Map();
  if(!session.mapPairs.has(mapPath))session.mapPairs.set(mapPath,(async()=>{
    const generation=session.catalogGenerated||'';
    if(!mapPairIndexes.has(generation)){
      const url=new URL('map-pairs.json',scope);url.searchParams.set('catalog',generation);
      mapPairIndexes.set(generation,fetch(url,{cache:'no-store'}).then(async r=>{
        if(!r.ok)throw new Error('Could not load the map/lightmap pairing index.');
        const data=await r.json();
        if(data.formatVersion!==1||data.catalogGenerated!==session.catalogGenerated)throw new Error('Map pairing index is out of date. Refresh the preview after rebuilding the archive catalog.');
        return data;
      }).catch(error=>{mapPairIndexes.delete(generation);throw error;}));
    }
    const index=await mapPairIndexes.get(generation);
    const key=session.development&&index.maps['_dev/'+mapPath]?'_dev/'+mapPath:mapPath;
    const current=(session.development&&session.inventory.get('_dev/'+mapPath))||session.inventory.get(mapPath);
    const stamp=session.folder.match(/_(\d{4}-\d{2}-\d{2})_(\d{2})-(\d{2})-(\d{2})(?:_|$)/);
    const time=stamp?Date.parse(`${stamp[1]}T${stamp[2]}:${stamp[3]}:${stamp[4]}Z`):Infinity;
    const pair=mapPair(index.maps[key]||[],time,current?.sha256);
    if(!pair){
      await report(session.token,`No closely saved map/lightmap pair for ${mapPath}; unpaired baked lighting will be skipped.`);
      return null;
    }
    for(const file of [pair.map,pair.lightmap]){
      safePath(file.path);safePath(file.source);
      if(!/^[a-f0-9]{64}$/i.test(file.sha256))throw new Error('Invalid paired map integrity hash.');
    }
    if(pair.map.path!==key||pair.lightmap.path!==key.replace(/\.json$/i,'.lightmap'))throw new Error('Invalid map/lightmap pairing paths.');
    await report(session.token,`Map/lightmap pair: ${mapPath} → ${pair.map.source}; lighting → ${pair.lightmap.source} (saved ${Math.round(pair.gap/3600)} hours apart).`);
    if(pair.time>time){
      const source=pair.map.source.split('/')[0],date=source.match(/_(\d{4}-\d{2}-\d{2})_/)?.[1];
      await report(session.token,`Map disclaimer: ${mapPath} uses a newer paired map from ${source}.`,false,{mapProvenance:{path:mapPath,source,version:source.split('_')[0],date}});
    }
    for(const [requested,file] of [[mapPath,pair.map],[mapPath.replace(/\.json$/i,'.lightmap'),pair.lightmap]]){
      const own=(session.development&&session.inventory.get('_dev/'+requested))||session.inventory.get(requested);
      if(own?.sha256!==file.sha256)await report(session.token,`Paired map asset: ${requested} uses ${file.source}.`,false,{borrowed:{path:requested,donor:file.source.split('/')[0],source:file.source,direction:'paired'}});
    }
    return pair;
  })().catch(error=>{session.mapPairs.delete(mapPath);throw error;}));
  return session.mapPairs.get(mapPath);
}
async function serve(event,run,requested){
  const session=await getSession(run.token);if(!session)return response('Preview session expired. Reload the preview window.','text/plain',410);
  const root=new URL(`run/${run.token}/`,scope).href;
  let path=run.path;
  if(requested){
    if(requested.origin!==scope.origin&&!isGameHost(requested.hostname)){
      await report(run.token,`Blocked external request: ${requested.hostname}${requested.pathname}`);return response('Live services are disabled.','text/plain',403);
    }
    path=decodeURIComponent(requested.pathname).replace(/^\//,'');
  }
  if(event.request.method!=='GET'&&event.request.method!=='HEAD')return response('Live services are disabled.','text/plain',405);
  if(path==='index.html')return response(event.request.method==='HEAD'?null:session.html,'text/html');
  if(/^_preview\/vendor\/fontawesome-5\.14\.0\/(?:css\/all\.min\.css|webfonts\/fa-(?:solid-900|regular-400|brands-400)\.woff2)$/.test(path)){
    const asset=await fetch(new URL(path.slice('_preview/'.length),scope));
    return response(event.request.method==='HEAD'?null:await asset.arrayBuffer(),mime(path),asset.status);
  }
  if(path==='_preview/bootstrap.js')return response(await (await fetch(new URL('bootstrap.js',scope),{cache:'no-store'})).text(),'text/javascript');
  if(path==='_preview/offline-native.js')return response(await (await fetch(new URL('offline-native.js',scope),{cache:'no-store'})).text(),'text/javascript');
  if(path==='_preview/rewrite.mjs')return response(await (await fetch(new URL('rewrite.mjs',scope),{cache:'no-store'})).text(),'text/javascript');
  if(path==='_preview/offline-0.7.js')return response(await (await fetch(new URL('offline-0.7.js',scope),{cache:'no-store'})).text(),'text/javascript');
  if(path==='_preview/offline-0.9.js'||path==='_preview/offline-game.js')return response(await (await fetch(new URL('offline-game.js',scope),{cache:'no-store'})).text(),'text/javascript');
  try{safePath(path);}catch{return response('Invalid asset path.','text/plain',400);}
  // DEV inventories share supporting production assets; prefer the DEV copy.
  let file=(session.development&&session.inventory.get('_dev/'+path))||session.inventory.get(path);
  if(/^maps\/.+\.(?:json|lightmap)$/i.test(path)){
    const pair=await pairedMap(path,session);
    if(pair)file=/\.json$/i.test(path)?pair.map:pair.lightmap;
    else if(/\.lightmap$/i.test(path))return response('No matching archived lightmap; using unbaked lighting.','text/plain',404);
  }
  if(!file)file=await borrow(path,session);
  if(!file&&path==='img/ico_grenade.png'){
    file=session.inventory.get('img/grenadeIcon.png')||await borrow('img/grenadeIcon.png',session);
    if(file)await report(run.token,'Preview substitute: img/ico_grenade.png has no archived copy; using the retained img/grenadeIcon.png HUD icon.');
  }
  if(!file&&path==='img/particles.png'){
    await report(run.token,'Preview substitute: img/particles.png has no archived copy; using a generated impact/smoke/yolk/shell texture. Original effects are unavailable.');
    return response(await (await fetch(new URL('particles.svg',scope))).text(),'image/svg+xml');
  }
  if(!file&&['sound/shellStreakStart.mp3','sound/shellStreakEnd.mp3','sound/shieldHit.mp3'].includes(path)){
    await report(run.token,`Missing archived sound: ${path}. Preview substitute: silence, so the unavailable sound does not block startup.`);
    return response(await (await fetch(new URL('silence.wav',scope))).arrayBuffer(),'audio/wav');
  }
  if(!file){await report(run.token,`Missing archived file: ${path}`,true);return response('Missing archived file: '+path,'text/plain',404);}
  const decoded=file.path.replace(/\.js$/,'.decoded.js');
  if(decoded!==file.path&&session.inventory.has(decoded)){
    file=session.inventory.get(decoded);await report(run.token,`Using derived decoded script: ${decoded}`);
  }
  let body=await verified(file,session);const type=mime(path);
  if(type==='text/javascript'){
    const patched=patchScript(new TextDecoder().decode(body),{version:session.version,path,files:session.files});body=patched.text;
    if(hasClassicAdapter(session.version))body=body.replace(/this\.enableOfflineSupport\s*=\s*(?:void 0!==BABYLON\.Database|!0|true|BABYLON\.Database)\b/g,'this.enableOfflineSupport=false');
    if(patched.patches.length)await report(run.token,`Startup patches: ${patched.patches.join(', ')}.`);
  }else if(type==='text/css'){
    const cssBase=new URL(path,root);
    body=rewriteCSS(new TextDecoder().decode(body),value=>{
      if(/^(data:|blob:|#)/i.test(value))return value;
      const url=new URL(value,cssBase);
      if(url.origin===scope.origin&&url.pathname.startsWith(new URL(root).pathname))return url.href;
      if(url.origin===scope.origin||isGameHost(url.hostname))return root+url.pathname.slice(1)+url.search;
      return 'about:blank';
    });
  }
  if(event.request.method==='HEAD')return response(null,type);
  // Cached media still supports the byte-range requests used by browser decoders.
  const range=event.request.headers.get('range');
  if(range&&body instanceof ArrayBuffer){
    const match=/^bytes=(\d*)-(\d*)$/.exec(range),length=body.byteLength;
    if(match){const start=match[1]?+match[1]:Math.max(0,length-Number(match[2])),end=match[1]?(match[2]?Math.min(+match[2],length-1):length-1):length-1;
      if(start<=end&&start<length)return response(body.slice(start,end+1),type,206,{'Content-Range':`bytes ${start}-${end}/${length}`,'Accept-Ranges':'bytes'});
      return response(null,type,416,{'Content-Range':`bytes */${length}`});
    }
  }
  return response(body,type);
}
self.addEventListener('fetch',event=>{
  const direct=parseRun(event.request.url);
  event.respondWith((async()=>{
    let run=direct,requested=null;
    if(!run&&event.clientId){const client=await self.clients.get(event.clientId);run=client&&parseRun(client.url);if(run)requested=new URL(event.request.url);}
    if(!run)return fetch(event.request);
    try{return await serve(event,run,requested);}catch(error){await report(run.token,error.message,true);return response(error.message,'text/plain',502);}
  })());
});
