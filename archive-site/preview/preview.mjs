import {safePath} from '../zip.mjs';
import {prepareHTML,hasClassicAdapter} from './rewrite.mjs';

const $=id=>document.getElementById(id);
let frame,token,timer,issues=0,ready=false;
const seen=new Set();
const borrowed=new Map();
function counts(){const parts=[];if(issues)parts.push(`${issues} issue${issues===1?'':'s'}`);if(borrowed.size)parts.push(`${borrowed.size} borrowed file${borrowed.size===1?'':'s'}`);$('issue-count').textContent=parts.length?'· '+parts.join(' · '):'';$('diagnostics').classList.toggle('has-issues',issues>0);}
// Preserve the complete desktop homescreen in narrow preview windows.
const fit=new ResizeObserver(()=>{
  if(!frame)return;
  const stage=$('game-stage'),width=Math.max(1024,stage.clientWidth),scale=stage.clientWidth/width;
  frame.style.width=`${width}px`;frame.style.height=`${stage.clientHeight/scale}px`;frame.style.transform=`scale(${scale})`;
});
fit.observe($('game-stage'));
function status(message,error=false){$('status').textContent=message;$('status').classList.toggle('error',error);}
function log(message,error=false){
  if(seen.has(message))return;seen.add(message);
  if(error){issues++;counts();}
  if(seen.size>200)return;
  const li=document.createElement('li');li.textContent=message;if(error)li.className='error';$('messages').append(li);
}
async function json(url){const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw new Error(`Could not read ${url.pathname.split('/').pop()} (HTTP ${r.status}).`);return r.json();}
function messageWorker(worker,data){return new Promise((resolve,reject)=>{
  const channel=new MessageChannel(),timeout=setTimeout(()=>reject(new Error('Preview worker did not respond. Reload this window to retry.')),15000);
  channel.port1.onmessage=event=>{clearTimeout(timeout);channel.port1.close();event.data.error?reject(new Error(event.data.error)):resolve(event.data);};
  worker.postMessage(data,[channel.port2]);
});}
async function previewWorker(){
  // A refreshed page can still be controlled by yesterday's worker while the
  // update installs. Wait for the new loader before configuring its session.
  const registration=await navigator.serviceWorker.register('./sw.js?loader=2',{scope:'./',type:'module',updateViaCache:'none'});
  const worker=registration.installing||registration.waiting||registration.active;
  await new Promise((resolve,reject)=>{
    const timeout=setTimeout(()=>finish(new Error('Preview loader update timed out. Refresh this window to retry.')),15000);
    function finish(error){clearTimeout(timeout);worker.removeEventListener('statechange',check);navigator.serviceWorker.removeEventListener('controllerchange',check);error?reject(error):resolve();}
    function check(){
      if(worker.state==='redundant')finish(new Error('Preview loader update failed. Refresh this window to retry.'));
      else if(worker.state==='activated'&&navigator.serviceWorker.controller===worker)finish();
    }
    worker.addEventListener('statechange',check);navigator.serviceWorker.addEventListener('controllerchange',check);check();
  });
  return worker;
}
async function start(){
  try{
    if(!isSecureContext||!navigator.serviceWorker||!crypto.subtle)throw new Error('Game preview needs HTTPS or localhost. Serve this repository with a local web server.');
    const folder=new URL(location.href).searchParams.get('snapshot');
    if(!folder)throw new Error('Choose a capture from the archive, then open Game preview.');
    const [catalog,config]=await Promise.all([json(new URL('../catalog.json',import.meta.url)),json(new URL('../config.json',import.meta.url))]);
    const entry=catalog.entries.find(e=>e.folder===folder);if(!entry)throw new Error('This capture is not in the archive index.');
    $('version').textContent=entry.version;$('capture').textContent=entry.folder;document.title=`${entry.version} · Game preview`;
    const archiveBase=new URL(config.archiveBase,new URL('../config.json',import.meta.url));
    const sourceURL=path=>new URL(safePath(path).split('/').map(encodeURIComponent).join('/'),archiveBase);
    const delta=await json(sourceURL(folder+'/delta.json'));
    if(delta.folder!==folder||!Array.isArray(delta.files))throw new Error('The capture inventory is invalid.');
    // Preview-only supplements never enter the archive inventory or ZIP exports.
    let reconstruction=null;
    if(entry.missingGameScripts){
      const supplements=await json(new URL('./reconstructions.json',import.meta.url));
      reconstruction=supplements.entries[folder]||null;
      $('pairing-disclaimer').textContent='Reconstructed preview: the game script comes from a different capture and may not match this HTML version.';
      $('pairing-disclaimer').hidden=false;
    }else if(/^0\.[0-8]\./.test(entry.version)){
      $('pairing-disclaimer').textContent='Reconstructed preview: the HTML version does not authenticate the game script’s release.';
      $('pairing-disclaimer').hidden=false;
    }
    // A stale inventory may still contain the old misassigned path. Replace it
    // only in this preview session, without changing inventories or exports.
    const replaced=new Set((reconstruction?.files||[]).map(f=>f.path));
    const files=delta.files.filter(f=>!replaced.has(f.path)),paths=new Set(files.map(f=>f.path));
    for(const file of reconstruction?.files||[]){
      if(paths.has(file.path))continue;
      files.push(file);paths.add(file.path);
    }
    for(const f of files){safePath(f.path);safePath(f.source);if(!/^[a-f0-9]{64}$/i.test(f.sha256))throw new Error('The capture contains an invalid integrity hash.');}
    let htmlFile=files.find(f=>f.path===(entry.channel==='development'?'_dev/index.html':'index.html'))||files.find(f=>f.path==='index.html');
    status('Verifying archived homescreen…');
    async function readHTML(file){
      const r=await fetch(sourceURL(file.source));if(!r.ok)throw new Error(`Homescreen download failed (HTTP ${r.status}).`);
      const body=await r.arrayBuffer(),hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',body)),v=>v.toString(16).padStart(2,'0')).join('');
      if(hash!==file.sha256.toLowerCase())throw new Error('Homescreen integrity check failed. Preview was not started.');
      return body;
    }
    let body=htmlFile?await readHTML(htmlFile):null,htmlSubstitute=null;
    const maintenance=bytes=>{if(!bytes)return false;const text=new TextDecoder().decode(bytes);return /NO PEEKING ALLOWED|We're changing shells!/.test(text)||!/(?:shellshock[^\s'"<>]*|ss\.[a-f0-9]+)\.js|onloadingcomplete|startVue|GAME_FRAME/.test(text);};
    if(!body||maintenance(body)){
      const checked=new Set(htmlFile?[htmlFile.source]:[]);
      const time=(t='')=>Date.UTC(+t.slice(0,4),+t.slice(4,6)-1,+t.slice(6,8),+t.slice(8,10),+t.slice(10,12),+t.slice(12,14));
      const selectedTime=time(entry.timestamp);
      const candidates=catalog.entries.filter(e=>/^\d+\.\d+/.test(e.version)&&e.folder!==folder).sort((a,b)=>Number(b.version===entry.version)-Number(a.version===entry.version)||Math.abs(time(a.timestamp)-selectedTime)-Math.abs(time(b.timestamp)-selectedTime)||a.timestamp.localeCompare(b.timestamp));
      for(const candidate of candidates){
        const inventory=await json(sourceURL(candidate.folder+'/delta.json'));
        const file=inventory.files.find(f=>f.path==='index.html'||f.path==='_dev/index.html');
        if(!file||checked.has(file.source))continue;checked.add(file.source);
        const bytes=await readHTML(file);if(maintenance(bytes))continue;
        htmlFile=file;body=bytes;htmlSubstitute=candidate.folder;break;
      }
    }
    if(!body||maintenance(body))throw new Error('No archived homescreen HTML is available for this version.');
    let compatibilityHTML='',compatibilitySource='';
    if(reconstruction&&/^0\.(?:[0-9]|1[0-4])\./.test(entry.version)&&!new DOMParser().parseFromString(new TextDecoder().decode(body),'text/html').getElementById('inviteFriends')){
      const script=reconstruction.files.find(file=>/src\/shellshock[^/]*\.js$/.test(file.path));
      const donor=script?.source.split('/')[0];
      if(donor&&donor!==folder){
        const inventory=await json(sourceURL(donor+'/delta.json'));
        const original=inventory.files.find(file=>file.path==='index.html');
        if(original){compatibilityHTML=new TextDecoder().decode(await readHTML(original));compatibilitySource=original.source;}
      }
    }
    status('Starting preview loader…');
    const worker=await previewWorker();
    token=crypto.randomUUID();const root=new URL(`run/${token}/`,import.meta.url).href;
    const runtimeVersion=reconstruction?.runtimeVersion||entry.version;
    const html=prepareHTML(new TextDecoder().decode(body),{root,files,development:entry.channel==='development',version:entry.version,runtimeVersion,compatibilityHTML});
    await messageWorker(worker,{type:'configure',token,archiveBase:archiveBase.href,folder,version:runtimeVersion,development:entry.channel==='development',files,catalogGenerated:catalog.generated,html});
    const reload=()=>{
      $('account').disabled=true;$('account').textContent='Log into spoof account';
      ready=false;issues=0;seen.clear();borrowed.clear();$('messages').replaceChildren();counts();$('diagnostics').open=false;
      log(`Capture: ${folder}`);log('Live services blocked. Archived payloads are checked with SHA-256 before use.');
      if(compatibilitySource&&compatibilityHTML.includes('id="inviteFriends"'))log(`Compatibility DOM: original archived invite dialog from ${compatibilitySource}. Historical pairing unverified.`);
      if(htmlSubstitute)log(`Preview-only homescreen: ${htmlFile.source}. The selected capture has no game homescreen; using ${htmlSubstitute}. Historical pairing unverified.`);
      for(const asset of reconstruction?.assetSubstitutions||[])log(`Preview model substitute: ${asset.path} from ${asset.source}. ${asset.reason}`);
      for(const script of reconstruction?.scriptCaptures||[]){
        const t=script.timestamp,date=`${t.slice(0,4)}-${t.slice(4,6)}-${t.slice(6,8)} ${t.slice(8,10)}:${t.slice(10,12)}:${t.slice(12,14)} UTC`;
        log(`Preview-only game script: ${script.path}, captured ${date}${script.version?' from '+script.folder:''}. Nearest available dated script; not authenticated to this HTML version; excluded from this snapshot’s export.`);
      }
      log('Missing-file policy: most recent previous capture; first later capture only when no previous copy exists.');
      if(!hasClassicAdapter(entry.version))log('No verified startup adapter for this version. Homescreen loading is experimental.');
      else log('Classic compatibility adapter enabled. Any borrowed assets are identified below; historical pairing is unverified.');
      clearTimeout(timer);frame?.remove();frame=document.createElement('iframe');frame.title=`Shell Shockers ${entry.version} homescreen`;
      frame.setAttribute('sandbox','allow-scripts allow-same-origin allow-pointer-lock');
      frame.allow='autoplay; fullscreen';frame.src=root;
      $('placeholder').hidden=true;$('game-stage').append(frame);fit.unobserve($('game-stage'));fit.observe($('game-stage'));status('Loading archived client…');
      timer=setTimeout(()=>{const message='The client is still starting. Check Loading details for missing files or errors.';status(message);log(message,true);},45000);
    };
    // Rebuild the prepared HTML and check worker/module updates as well as
    // retrying assets. Reloading only the iframe retained old runtime patches.
    $('reload').disabled=false;$('reload').addEventListener('click',()=>location.reload());reload();
  }catch(error){clearTimeout(timer);status(error.message,true);log(error.message,true);}
}
navigator.serviceWorker?.addEventListener('message',event=>{
  if(event.data?.token!==token)return;
  if(event.data.type==='diagnostic'){
    if(event.data.mapProvenance){
      const map=event.data.mapProvenance;
      $('map-disclaimer').textContent=`Map disclaimer: this preview uses map files from a newer capture: ${map.version}${map.date?' ('+map.date+')':''}. They may differ from this client’s original maps. See Loading details for file sources.`;
    }
    if(event.data.borrowed){borrowed.set(event.data.borrowed.path,event.data.borrowed);counts();}
    log(event.data.message,event.data.error);
    if(event.data.error&&ready)status('Homescreen started with loading issues · see Loading details');
  }
});
window.addEventListener('message',event=>{
  if(event.source!==frame?.contentWindow||event.origin!==location.origin||event.data?.source!=='archive-preview')return;
  const {type,message}=event.data;
  if(type==='ready'){ready=true;clearTimeout(timer);status(issues?'Homescreen started with loading issues · see Loading details':'Homescreen loaded · offline preview');log('The client completed homescreen startup.');}
  else if(type==='account-state'){ $('account').disabled=!message.available||message.unlocked;$('account').textContent=message.unlocked?'Everything unlocked':message.loggedIn?'Unlock everything':'Log into spoof account';$('account').dataset.items=String(message.items||0);$('account').dataset.loggedIn=String(!!message.loggedIn); }
  else if(type==='document'){log('Archived HTML loaded; waiting for client startup.');}
  else if(type==='resource-error'){log(message,true);if(ready)status('Homescreen started with loading issues · see Loading details');}
  else if(type==='error'){clearTimeout(timer);log(message,true);status(ready?'The client reported a loading or gameplay issue. See Loading details.':'The client reported a startup error. See Loading details.');}
  else if(type==='notice'){status(message);log(message);}
  else log(message);
});
start();

$('account').addEventListener('click',()=>{if(frame)frame.contentWindow.postMessage({source:'archive-preview-command',action:'account'},location.origin);});
