import {ZipWriter, safePath} from './zip.mjs';
import {createFileHistory} from './file-history.mjs';
import {createDiscovery} from './discovery.mjs';
import {publicMetadata,snapshotProvenance} from './provenance.mjs';

const $=id=>document.getElementById(id);
const nf=new Intl.NumberFormat('en');
const bytes=n=>{if(!Number.isFinite(n))return '—';if(n<1024)return `${n} B`;const i=Math.min(3,Math.floor(Math.log(n)/Math.log(1024)));return `${(n/1024**i).toFixed(i===1?0:2)} ${['B','KiB','MiB','GiB'][i]}`;};
const state={catalog:null,config:null,base:null,entry:null,data:null,year:'',exporting:false,load:null,preview:null,previewURL:null,fileLimit:80,hashOrigin:false};
const shortSource={archive_org:'Wayback',onlypuppy7_statefarm_bot:'js_archive',antiyolk_1ust:'antiyolk',loft_1ust:'loft',statefarm_bot_workingstatus_onlypuppy7:'WorkingStatus'};
const typeLabels={code:'JS',html:'HTML',images:'IMG',models:'3D',audio:'SND',json:'JSON',css:'CSS',wasm:'WASM',other:'FILE'};
const filePageSize=()=>matchMedia('(max-width:760px)').matches?20:80;
state.fileView='folders';state.openFolders=new Set();
state.fileSort={key:'path',direction:1};
const gameSite=entry=>entry.channel==='development'?'development':'production';
let discovery,fileHistory;
function setDiscoveryMode(mode){
  state.discoveryMode=mode;document.querySelector('.files-panel').classList.toggle('discovering',!!mode);$('changelog-panel').hidden=mode!=='changelog';$('files-count').hidden=!!mode;
  for(const key of ['folder','changes','changelog'])$(`${key}-view`).setAttribute('aria-pressed',String(mode?key===mode:key===(state.fileView==='folders'?'folder':'changes')));
  if(mode==='changelog'&&state.entry)discovery?.showChangelog(state.entry);
}
function node(tag,className,text){const n=document.createElement(tag);if(className)n.className=className;if(text!==undefined)n.textContent=text;return n;}
function stampText(stamp,seconds=true){return `${stamp.slice(0,4)}-${stamp.slice(4,6)}-${stamp.slice(6,8)} ${stamp.slice(8,10)}:${stamp.slice(10,12)}${seconds?':'+stamp.slice(12,14):''}`;}
function dateLabel(entry){return `${stampText(entry.timestamp)} ${entry.timezone==='UTC'?'UTC':'· timezone unknown'}`;}
function utcNumber(stamp){return Date.UTC(+stamp.slice(0,4),+stamp.slice(4,6)-1,+stamp.slice(6,8),+stamp.slice(8,10),+stamp.slice(10,12),+stamp.slice(12,14));}
function kind(path){const ext=path.split('.').pop().toLowerCase();return /^(js|mjs|cjs)$/.test(ext)?'code':/^(html|htm)$/.test(ext)?'html':/^(png|jpg|jpeg|gif|svg|webp|ico|avif|ktx|dds)$/.test(ext)?'images':/^(babylon|glb|gltf|obj)$/.test(ext)?'models':/^(mp3|ogg|wav|m4a|flac)$/.test(ext)?'audio':ext==='json'?'json':ext==='css'?'css':ext==='wasm'?'wasm':'other';}
function sourceURL(path){safePath(path);return new URL(path.split('/').map(encodeURIComponent).join('/'),state.base).href;}
function credit(id){return state.catalog.sources[id]?.credit||id;}
function sourceLabel(id){return shortSource[id]||state.catalog.sources[id]?.name||id;}
function entrySource(entry){return sourceLabel(entry.origin)+(entry.resourceHost&&!['shellshock.io','www.shellshock.io','dev.shellshock.io'].includes(entry.resourceHost)?' · '+entry.resourceHost:entry.channel==='development'?' · dev':' · PROD');}
function errorText(error){return error?.message||'Something went wrong. Please try again.';}
function isAbort(error){return error?.name==='AbortError';}
function abortError(){return new DOMException('Cancelled','AbortError');}
async function response(url,signal,cache='default'){
  for(let attempt=0;attempt<3;attempt++){
    signal?.throwIfAborted();const result=await fetch(url,{signal,cache});
    if(result.ok)return result;
    if([429,502,503,504].includes(result.status)&&attempt<2){await new Promise((resolve,reject)=>{const timer=setTimeout(done,800*(attempt+1));function done(){signal?.removeEventListener('abort',stop);resolve();}function stop(){clearTimeout(timer);reject(abortError());}signal?.addEventListener('abort',stop,{once:true});});continue;}
    throw new Error(`Could not retrieve ${decodeURIComponent(new URL(url).pathname.split('/').pop())} (HTTP ${result.status}). Make sure the archive files have been published.`);
  }
}
async function json(url,signal){return (await response(url,signal,'no-store')).json();}
async function verifiedFile(file,signal){
  if(!/^[a-f0-9]{64}$/i.test(file.sha256))throw new Error(`Missing integrity hash for ${file.path}.`);
  const body=await (await response(sourceURL(file.source),signal)).arrayBuffer();signal?.throwIfAborted();
  if(!crypto.subtle)throw new Error('Verified downloads need HTTPS or a local web server.');
  const h=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',body)),v=>v.toString(16).padStart(2,'0')).join('');
  if(h!==file.sha256.toLowerCase())throw new Error(`Integrity check failed for ${file.path}. No export was saved.`);
  return new Uint8Array(body);
}
function downloadBlob(blob,filename){const url=URL.createObjectURL(blob);const a=node('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
function jsonBytes(value){return new TextEncoder().encode(JSON.stringify(value,null,2)+'\n');}
function updateHash(path){if(!state.entry)return;const params=new URLSearchParams({snapshot:state.entry.folder});if(path)params.set('path',path);history.replaceState(null,'','#'+params);}
async function entryFromLink(params){
  const folder=params.get('snapshot'),entry=state.catalog.entries.find(e=>e.folder===folder);if(entry||!folder)return entry;
  state.captureAliases??=json(new URL('capture_aliases.json',state.base)).catch(()=>({captures:{}}));
  const alias=(await state.captureAliases).captures[folder],target=typeof alias==='string'?alias:alias?.[params.get('path')]||Object.values(alias||{})[0];
  return state.catalog.entries.find(e=>e.folder===target);
}
function showError(id,message){$(id).textContent=message;$(id).hidden=!message;}

function renderOverview(){
  const {stats,sources}=state.catalog;
  $('coverage').replaceChildren(document.createTextNode(stats.first.slice(0,4)+' '),node('i','','—'),document.createTextNode(' '+stats.last.slice(0,4)));
  $('stat-snapshots').textContent=nf.format(stats.snapshots);$('stat-versions').textContent=nf.format(stats.versions);$('stat-files').textContent=nf.format(stats.storedFiles);$('stat-size').textContent=bytes(stats.storedBytes);
  $('footer-date').textContent=`Through ${stampText(stats.last).slice(0,10)}.`;
  const labels=[...new Set(state.catalog.entries.map(e=>e.version))].sort((a,b)=>a.localeCompare(b,'en',{numeric:true}));
  for(const version of labels){const o=node('option','',version);o.value=version;$('version-filter').append(o);}
  for(const [id,source] of Object.entries(sources)){const o=node('option','',sourceLabel(id));o.value=id;$('source-filter').append(o);}
  for(const [year,count] of Object.entries(stats.years)){
    const option=node('option','',year);option.value=year;$('year-filter').append(option);
    const button=node('button','year-button');button.type='button';button.dataset.year=year;button.setAttribute('aria-label',`${year}: ${count} snapshots. Filter by year.`);button.setAttribute('aria-pressed','false');
    const label=node('span','year-label',year);label.append(node('small','',nf.format(count)));button.append(label);button.addEventListener('click',()=>{if(state.exporting)return;state.year=state.year===year?'':year;$('year-filter').value=state.year;renderSnapshots();$('capture-results').open=true;$('browser').scrollIntoView({block:'start'});});$('timeline').append(button);
  }
  $('credits-list').replaceChildren();
  for(const [id,s] of Object.entries(sources)){const tr=node('tr'),collection=node('td');collection.append(node('div','',s.display_name||(id==='archive_org'?'Wayback Machine':shortSource[id]||s.name)));if(s.description)collection.append(node('div','helper',s.description));const creditCell=node('td');if(id==='random_repo'||id==='doescolder_map_archive'){const link=node('a','',s.credit);link.href=s.url;creditCell.append(link);}else creditCell.textContent=s.credit;const month=t=>t?`${t.slice(0,4)}-${t.slice(4,6)}`:'';const first=month(s.first_recorded),last=month(s.last_recorded);const dates=node('td','collection-dates',first?(first===last?first:`${first} – ${last}`):'—');tr.append(collection,creditCell,node('td','collection-count',nf.format(s.entries)),node('td','collection-count',Number.isFinite(s.filesSaved)?nf.format(s.filesSaved):'—'),dates);$('credits-list').append(tr);}
  for(const [name,count] of Object.entries(stats.categories)){const div=node('div','category-stat');div.append(node('strong','',nf.format(count)),node('span','',name));$('category-stats').append(div);}
  $('repository-link').href=state.config.repositoryURL;
}

function visibleEntries(){const v=$('version-filter').value,o=$('source-filter').value,site=$('site-filter').value,q=$('snapshot-search').value.trim().toLowerCase();return state.catalog.entries.filter(e=>(!v||e.version===v)&&(!o||e.origin===o||e.supplementalOrigins?.includes(o))&&(!site||gameSite(e)===site)&&(!state.year||e.timestamp.startsWith(state.year))&&(!q||`${e.version} ${e.folder} ${dateLabel(e)} ${entrySource(e)} ${gameSite(e)==='development'?'dev.shellshock.io dev':'shellshock.io production'} ${credit(e.origin)}`.toLowerCase().includes(q))).reverse();}
function selectedIsVisible(){return !!state.entry&&visibleEntries().some(e=>e.folder===state.entry.folder);}
function refreshActions(){
  const visible=selectedIsVisible(),ready=!!state.data&&!state.exporting&&visible;
  $('export-button').disabled=!ready||!crypto.subtle;$('manifest-button').disabled=!ready;$('share-button').disabled=!state.data||state.exporting;
  const home=state.entry?.channel==='development'?'_dev/index.html':'index.html';
  const hasHome=state.data?.delta.files.some(f=>f.path===home);
  const missingGame=!!state.data?.capture.game_script_pairing?.missing?.length;
  $('game-preview-button').disabled=!ready||!hasHome;
  $('game-preview-button').title=missingGame?'Open a reconstructed preview; the game script is from a different capture.':hasHome?'Open an experimental homescreen preview in a new window.':'This capture has no archived homescreen HTML.';
  $('selection-notice').hidden=!state.entry||visible;
  $('selection-message').textContent=visibleEntries().length?'The selected capture is outside these filters. Choose a result, or show the selected capture.':'No captures match. Clear filters to return to the selected capture.';
}
function renderSnapshots(scroll=false){
  if(!state.catalog)return;const hadFocus=!!document.activeElement?.closest('#snapshot-list');const entries=visibleEntries(),fragment=document.createDocumentFragment();
  const selectedVisible=entries.some(e=>e.folder===state.entry?.folder);
  for(const entry of entries){
    const b=node('button','snapshot-item'+(entry.folder===state.entry?.folder?' active':''));b.type='button';b.dataset.folder=entry.folder;b.setAttribute('aria-current',String(entry.folder===state.entry?.folder));b.tabIndex=entry.folder===state.entry?.folder||(!selectedVisible&&entry===entries[0])?0:-1;
    const top=node('span','snapshot-item-top');top.append(node('strong','',entry.version),node('span','origin-short',entrySource(entry)));b.append(top);const time=node('time','',dateLabel(entry));if(entry.timezone==='UTC')time.dateTime=stampText(entry.timestamp).replace(' ','T')+'Z';b.append(time);b.addEventListener('click',()=>selectEntry(entry));
    const item=node('div');item.setAttribute('role','listitem');item.append(b);fragment.append(item);
  }
  if(!entries.length)fragment.append(node('p','empty','No snapshots match these filters.'));
  $('snapshot-list').replaceChildren(fragment);$('snapshot-list').setAttribute('aria-busy','false');
  if(!state.entry&&entries.length){const first=$('snapshot-list').querySelector('button');if(first)first.tabIndex=0;}
  $('result-count').textContent=`${nf.format(entries.length)} ${entries.length===1?'entry':'entries'}`;
  document.querySelector('.picker').classList.toggle('filtering',!!(state.year||$('version-filter').value||$('source-filter').value||$('site-filter').value||$('snapshot-search').value.trim()));
  $('clear-year').hidden=!state.year;$('timeline-help').hidden=!!state.year;
  document.querySelectorAll('.year-button').forEach(b=>{const active=b.dataset.year===state.year;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
  refreshActions();
  if(scroll){const list=$('snapshot-list'),active=list.querySelector('.active');if(active){list.scrollTop+=active.getBoundingClientRect().top-list.getBoundingClientRect().top-60;if(hadFocus)active.focus({preventScroll:true});}}
}
function setTab(which){for(const key of ['version','date']){const active=key===which;$(`${key}-tab`).classList.toggle('active',active);$(`${key}-tab`).setAttribute('aria-selected',String(active));$(`${key}-tab`).tabIndex=active?0:-1;$(`${key}-panel`).hidden=!active;}}
function resetFilters(){state.year='';$('year-filter').value='';$('version-filter').value='';$('source-filter').value='';$('site-filter').value='';$('snapshot-search').value='';renderSnapshots();}
function findByDate(){
  const input=$('date-input');if(!input.value||!input.checkValidity()){input.reportValidity();$('date-note').textContent='Choose a date and time first.';return;}
  const stamp=input.value.replace(/\D/g,'').padEnd(14,'0');const target=utcNumber(stamp);const include=$('include-unknown').checked,mode=$('date-mode').value;
  const candidates=state.catalog.entries.filter(e=>(include||e.timezone==='UTC')&&(!$('source-filter').value||e.origin===$('source-filter').value)&&(!$('site-filter').value||gameSite(e)===$('site-filter').value));
  const valid=candidates.filter(e=>mode==='nearest'||(mode==='before'?utcNumber(e.timestamp)<=target:utcNumber(e.timestamp)>=target));
  valid.sort((a,b)=>Math.abs(utcNumber(a.timestamp)-target)-Math.abs(utcNumber(b.timestamp)-target)||Number(a.timezone!=='UTC')-Number(b.timezone!=='UTC')||a.timestamp.localeCompare(b.timestamp)||a.folder.localeCompare(b.folder));
  if(!valid.length){$('date-note').textContent='No matching capture exists in that direction. Try “Nearest capture” or another collection.';return;}
  const found=valid[0],site=$('site-filter').value;$('date-note').textContent=`Selected ${dateLabel(found)}.${include?' Unknown-timezone dates are compared as written.':''}`;resetFilters();$('site-filter').value=site;selectEntry(found);
}

async function selectEntry(entry,initialPath){
  if(state.exporting)return;closePreview({restoreFocus:false,updateRoute:false});state.load?.abort();const controller=new AbortController();state.load=controller;state.entry=entry;state.data=null;state.fileLimit=filePageSize();state.openFolders.clear();
  if(matchMedia('(max-width:760px)').matches)$('capture-results').open=false;
  $('selected-version').textContent=entry.version;$('selected-date').textContent=dateLabel(entry);$('selected-source').textContent=entrySource(entry);$('selected-source').title=credit(entry.origin)+' · '+(gameSite(entry)==='development'?'dev.shellshock.io (dev)':'shellshock.io (production)');
  $('selected-file-count').textContent=nf.format(entry.files);$('selected-bytes').textContent=bytes(entry.bytes);$('selected-changes').textContent=`${nf.format(entry.added)} new · ${nf.format(entry.changed)} changed · ${nf.format(Math.max(0,entry.files-entry.added-entry.changed))} inherited`;
  $('package-scope').textContent='Exports include inherited supporting files. Historical pairing and offline playability are unverified.';
  $('snapshot-note').hidden=false;$('snapshot-note').textContent=entry.captureKind==='supplemental_asset_collection'?'Asset collection · HTML and JavaScript are excluded. Source observation dates are not verified deployment dates.':entry.channel==='development'?'dev capture from dev.shellshock.io · DEV files are under _dev/. Supporting production files are retained from an earlier entry. Recorded dates are observations, not verified deployment times.':entry.channel==='production'?'Production capture from shellshock.io · Recorded dates are observations, not verified deployment times. Supporting files may come from earlier entries.':entry.reconstructed?'Community import · Supporting files are carried forward from an earlier entry. Their historical pairing is unverified.':'Wayback collection · Files may come from different capture dates; their historical pairing is unverified.';
  if(state.discoveryMode==='changelog')discovery?.showChangelog(entry);
  $('export-button').disabled=true;$('manifest-button').disabled=true;$('share-button').disabled=true;$('game-preview-button').disabled=true;$('file-list').replaceChildren();const row=node('tr');const td=node('td','empty','Reading file inventory…');td.colSpan=3;row.append(td);$('file-list').append(row);$('more-files').hidden=true;$('action-status').textContent='';showError('snapshot-error','');renderSnapshots(true);updateHash();
  try{
    const [delta,capture,assets]=await Promise.all(['delta.json','capture.json','assets.json'].map(async n=>publicMetadata(await json(sourceURL(`${entry.folder}/${n}`),controller.signal))));
    if(state.load!==controller)return;
    if(delta.folder!==entry.folder||!Array.isArray(delta.files))throw new Error('This snapshot has an invalid inventory.');
    const paths=new Set();for(const file of delta.files){safePath(file.path);safePath(file.source);if(paths.has(file.path.toLowerCase()))throw new Error('Duplicate file path in this snapshot.');paths.add(file.path.toLowerCase());}
    const metadata=new Map();for(const item of [...capture.files,...assets.files])metadata.set(item.path,item);
    state.data={delta,capture,assets,metadata,added:new Set(delta.added),changed:new Set(delta.changed)};
    const developmentFiles=delta.files.filter(f=>f.path.startsWith('_dev/')).length;
    if(developmentFiles)$('package-scope').textContent=`Includes ${nf.format(developmentFiles)} dev files from dev.shellshock.io under _dev/ and inherited supporting files. Historical pairing and offline playability are unverified.`;
    if(capture.capture_kind==='resource_capture')$('package-scope').textContent='Standalone resource observation with matching archived digest. No game release version or simultaneous game inventory is assigned.';
    else if(capture.capture_kind==='script_capture')$('package-scope').textContent='Standalone script capture at its recorded response time. No HTML or authenticated release version is assigned.';
    else if(capture.game_script_pairing?.missing?.length)$('package-scope').textContent='Game JavaScript is missing: no verified response was found within 24 hours of this capture. The export is incomplete; later scripts are archived separately.';
    refreshActions();renderFiles();
    if(!crypto.subtle)$('action-status').textContent='Verified exports require HTTPS or a local web server.';
    if(initialPath){const file=delta.files.find(f=>f.path===initialPath);if(file)openPreview(file);}
  }catch(error){if(isAbort(error))return;showError('snapshot-error',errorText(error));$('file-list').replaceChildren();const tr=node('tr'),td=node('td','empty','File inventory unavailable. Select this snapshot again to retry.');td.colSpan=3;tr.append(td);$('file-list').append(tr);}
}

function renderFiles(){
  if(!state.data)return;const {delta,added,changed}=state.data;const q=$('file-search').value.trim().toLowerCase(),type=$('file-type').value,status=$('file-state').value;
  const sizeOf=file=>state.catalog.payloadSizes[file.sha256]||0,changeOf=file=>added.has(file.path)?0:changed.has(file.path)?1:2;
  const pathCompare=(a,b)=>a.localeCompare(b,'en',{numeric:true,sensitivity:'base'});
  const compare=(a,b)=>{const primary=state.fileSort.key==='size'?a.bytes-b.bytes:state.fileSort.key==='change'?a.change-b.change:pathCompare(a.path,b.path);return primary*state.fileSort.direction||pathCompare(a.path,b.path);};
  const files=delta.files.filter(f=>(!q||f.path.toLowerCase().includes(q))&&(!type||kind(f.path)===type)&&(!status||(status==='changed'?(added.has(f.path)||changed.has(f.path)):(!added.has(f.path)&&!changed.has(f.path))))).sort((a,b)=>compare({path:a.path,bytes:sizeOf(a),change:changeOf(a)},{path:b.path,bytes:sizeOf(b),change:changeOf(b)}));
  $('clear-file-filters').hidden=!q&&!type&&!status;
  const fragment=document.createDocumentFragment(),items=[];
  const folders=state.fileView==='folders',automatic=!!(q||type||status);
  for(const heading of document.querySelectorAll('[data-sort-column]')){const key=heading.dataset.sortColumn,active=key===state.fileSort.key;heading.setAttribute('aria-sort',active?(state.fileSort.direction===1?'ascending':'descending'):'none');const button=heading.querySelector('button');button.title=key==='change'?'Sort by New, Changed, Inherited; click again to reverse.':`Sort by ${key==='path'?'file path':'file size'}; click again to reverse.`;button.querySelector('path').setAttribute('d',!active?'m8 9 4-4 4 4m-8 6 4 4 4-4':state.fileSort.direction===1?'m8 14 4-4 4 4':'m8 10 4 4 4-4');}
  $('folder-view').setAttribute('aria-pressed',String(!state.discoveryMode&&folders));$('changes-view').setAttribute('aria-pressed',String(!state.discoveryMode&&!folders));
  if(folders){
    const root={children:new Map(),files:[],path:'',count:0,bytes:0,change:2};
    for(const file of files){let branch=root;const parts=file.path.split('/');branch.count++;
      for(const name of parts.slice(0,-1)){if(!branch.children.has(name))branch.children.set(name,{children:new Map(),files:[],path:branch.path?branch.path+'/'+name:name,name,count:0,bytes:0,change:2});branch=branch.children.get(name);branch.count++;branch.bytes+=sizeOf(file);branch.change=Math.min(branch.change,changeOf(file));}branch.files.push(file);
    }
    function visit(branch,depth){
      for(const child of [...branch.children.values()].sort(compare)){
        const open=automatic||state.openFolders.has(child.path);items.push({folder:child,depth,open});if(open)visit(child,depth+1);
      }
      for(const file of branch.files)items.push({file,depth});
    }
    visit(root,0);
  }else for(const file of files)items.push({file,depth:0});
  let shown=0;const expandedFiles=items.filter(item=>item.file).length;
  for(const item of items){
    if(item.folder){
      const tr=node('tr','folder-row'),td=node('td'),button=node('button','folder-link');button.type='button';button.dataset.folderPath=item.folder.path;button.style.setProperty('--depth',item.depth);button.setAttribute('aria-expanded',String(item.open));button.setAttribute('aria-label',`${item.folder.path}, ${item.folder.count} files`);
      button.append(treeIcon(item.open?'M5 9l7 7 7-7':'M9 5l7 7-7 7','folder-chevron'),treeIcon('M3 7h6l2 2h10v11H3zM3 7V4h6l2 3','folder-icon'),node('span','folder-name',item.folder.name),node('span','folder-count',nf.format(item.folder.count)));
      button.disabled=automatic;button.title=automatic?'Matching folders are expanded while file filters are active.':item.folder.path;
      function toggle(open){const scroller=document.querySelector('.table-scroll'),listTop=scroller.scrollTop,pageX=window.scrollX,pageY=window.scrollY;if(open)state.openFolders.add(item.folder.path);else state.openFolders.delete(item.folder.path);renderFiles();scroller.scrollTop=listTop;window.scrollTo(pageX,pageY);[...document.querySelectorAll('.folder-link')].find(b=>b.dataset.folderPath===item.folder.path)?.focus({preventScroll:true});}
      button.addEventListener('click',()=>toggle(!item.open));button.addEventListener('keydown',event=>{if(['ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();toggle(event.key==='ArrowRight');}});td.append(button);const total=node('td','folder-total',bytes(item.folder.bytes)),activity=node('td','folder-change');total.title='Total size of matching files in this folder';const label=['New files','Changed files','Inherited'][item.folder.change],badge=node('span','change-badge '+['added','changed','inherited'][item.folder.change],label);badge.title='Change status of files inside this folder';activity.append(badge);tr.append(td,total,activity);fragment.append(tr);continue;
    }
    if(shown>=state.fileLimit)continue;shown++;
    const file=item.file,tr=node('tr'),path=node('td'),size=node('td','',bytes(state.catalog.payloadSizes[file.sha256])),change=node('td');tr.dataset.filePath=file.path;tr.classList.toggle('previewing',state.preview?.file.path===file.path);const k=kind(file.path);const button=node('button','file-link');button.type='button';button.title=file.path;button.setAttribute('aria-label',file.path);button.style.setProperty('--depth',item.depth);button.append(node('span',`file-icon ${k}`,typeLabels[k]),node('span','file-path',folders?file.path.split('/').pop():file.path));button.addEventListener('click',()=>openPreview(file));path.append(button);let badge=added.has(file.path)?['added','New']:changed.has(file.path)?['changed','Changed']:['inherited','Inherited'];change.append(node('span',`change-badge ${badge[0]}`,badge[1]));tr.append(path,size,change);fragment.append(tr);
  }
  if(!files.length){const tr=node('tr'),td=node('td','empty','No files match. Try another path or file type.');td.colSpan=3;tr.append(td);fragment.append(tr);}
  $('file-list').replaceChildren(fragment);$('files-count').textContent=`${nf.format(files.length)} / ${nf.format(delta.files.length)}`;$('more-files').hidden=expandedFiles<=shown;$('more-files').textContent=`Show ${Math.min(filePageSize(),expandedFiles-shown)} more files`;
}
function treeIcon(path,className){const svg=document.createElementNS('http://www.w3.org/2000/svg','svg'),p=document.createElementNS(svg.namespaceURI,'path');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');svg.setAttribute('class',className);p.setAttribute('d',path);svg.append(p);return svg;}

function addDetail(label,value,code=false){if(value===undefined||value===null||value==='')return;const div=node('div'),dt=node('dt','',label),dd=node('dd');if(value instanceof Node)dd.append(value);else if(code)dd.append(node('code','',String(value)));else dd.textContent=String(value);div.append(dt,dd);$('preview-details').append(div);}
function cleanupPreview(){state.preview?.controller.abort();if(state.previewURL){URL.revokeObjectURL(state.previewURL);state.previewURL=null;}state.preview=null;}
function closePreview({restoreFocus=true,updateRoute=true}={}){
  const trigger=state.preview?.trigger;cleanupPreview();$('file-dialog').hidden=true;document.querySelector('.detail-column').classList.remove('inspecting');
  document.querySelectorAll('#file-list .previewing').forEach(row=>row.classList.remove('previewing'));
  if(updateRoute)updateHash();if(restoreFocus&&trigger?.isConnected)trigger.focus({preventScroll:true});
}
async function openPreview(file){
  const trigger=[...document.querySelectorAll('#file-list tr')].find(row=>row.dataset.filePath===file.path)?.querySelector('button');cleanupPreview();const controller=new AbortController(),current={file,controller,entry:state.entry,data:null,trigger};state.preview=current;const meta=state.data.metadata.get(file.path)||{};const src=meta.source_import||meta.source||{};const oid=meta.origin_id||'archive_org';const all=new Set([oid,...(meta.additional_origin_ids||[])]);
  $('preview-title').textContent=file.path;$('preview-details').replaceChildren();$('preview-content').replaceChildren(node('p','preview-message','Loading verified preview…'));$('preview-status').textContent='';$('download-file').disabled=!crypto.subtle;$('copy-file-link').disabled=false;
  addDetail('File type',kind(file.path)==='code'?'JavaScript':typeLabels[kind(file.path)]);
  addDetail('Collection',Array.from(all,credit).join(' · '));addDetail('Size',bytes(state.catalog.payloadSizes[file.sha256]));addDetail('Stored file',file.source,true);addDetail('SHA-256',file.sha256,true);
  if(meta.derived)addDetail('Copy type',meta.derivation?.method||'Derived decoded companion');
  addDetail('Channel',src.channel);addDetail('Date basis',src.timestamp_basis);
  const replay=meta.actual_replay_source||src;const requested=meta.selected_capture||meta.requested_capture;
  const observed=meta.capture_association?.observation;
  if(observed?.timestamp)addDetail('File observation',`${stampText(observed.timestamp)} UTC · release membership unverified`);
  if(observed?.original&&/^https?:\/\//i.test(observed.original)){const a=node('a','',observed.original);a.href=observed.original;a.target='_blank';a.rel='noopener noreferrer';addDetail('Observation URL',a);}
  if(replay.timestamp&&/^\d{14}$/.test(replay.timestamp))addDetail('Recorded date',`${stampText(replay.timestamp)} ${replay.timezone==='unspecified'?'· timezone unknown':'UTC'}`);
  if(requested?.timestamp&&requested.timestamp!==replay.timestamp)addDetail('Requested capture',stampText(requested.timestamp)+' UTC');
  const original=replay.original||requested?.original;if(original&&/^https?:\/\//i.test(original)){const a=node('a','',original);a.href=original;a.target='_blank';a.rel='noopener noreferrer';addDetail('Original URL',a);}
  if(src.path_basis)addDetail('Path note',src.path_basis);
  $('file-dialog').hidden=false;document.querySelector('.detail-column').classList.add('inspecting');
  document.querySelectorAll('#file-list tr').forEach(row=>row.classList.toggle('previewing',row.dataset.filePath===file.path));
  $('close-preview').focus({preventScroll:true});if(matchMedia('(max-width:760px)').matches)$('file-dialog').scrollIntoView({block:'start'});updateHash(file.path);
  try{
    const size=state.catalog.payloadSizes[file.sha256]||0,k=kind(file.path);
    if(size>64*1024**2||((k!=='images'&&k!=='audio')&&size>8*1024**2)){ $('preview-content').replaceChildren(node('p','preview-message','This file is too large for a preview. Download it to inspect the complete contents.'));return; }
    const body=await verifiedFile(file,controller.signal);if(state.preview!==current)return;current.data=body;
    const ext=file.path.split('.').pop().toLowerCase();
    if(k==='images'&&!['ktx','dds'].includes(ext)){const blob=new Blob([body],{type:ext==='svg'?'image/svg+xml':`image/${ext==='jpg'?'jpeg':ext==='ico'?'x-icon':ext}`});state.previewURL=URL.createObjectURL(blob);const img=node('img');img.alt=file.path;img.src=state.previewURL;$('preview-content').replaceChildren(img);}
    else if(k==='audio'){const types={ogg:'audio/ogg',mp3:'audio/mpeg',wav:'audio/wav',m4a:'audio/mp4',flac:'audio/flac'};state.previewURL=URL.createObjectURL(new Blob([body],{type:types[ext]||'application/octet-stream'}));const audio=node('audio');audio.controls=true;audio.src=state.previewURL;audio.preload='metadata';$('preview-content').replaceChildren(audio);}
    else if(['code','html','json','css'].includes(k)||['txt','xml','md','manifest','babylon','gltf'].includes(ext)){
      const sample=body.slice(0,4096),control=Array.from(sample).filter(n=>n<32&&![9,10,13].includes(n)).length;
      if(control>sample.length*.03){$('preview-content').replaceChildren(node('p','preview-message',k==='code'?'This JavaScript is encoded. Look for a .decoded.js or .processed.js companion, or download the original file.':'This file contains binary data. Download it for inspection.'));}
      else {const text=new TextDecoder().decode(body);const pre=node('pre','',text.slice(0,250000));$('preview-content').replaceChildren(pre);if(text.length>250000)$('preview-content').prepend(node('p','helper','Preview limited to the first 250,000 characters. Download for the complete file.'));}
    }else $('preview-content').replaceChildren(node('p','preview-message','Preview is not available for this format. The original file is available to download.'));
  }catch(error){if(!isAbort(error)&&state.preview===current)$('preview-content').replaceChildren(node('p','preview-message',errorText(error)));}
}
async function downloadSingle(){const current=state.preview;if(!current)return;$('download-file').disabled=true;$('preview-status').textContent='Verifying file…';try{const body=current.data||await verifiedFile(current.file,current.controller.signal);if(state.preview!==current)return;downloadBlob(new Blob([body],{type:'application/octet-stream'}),current.file.path.split('/').pop());$('preview-status').textContent='File verified. Download started.';}catch(e){if(!isAbort(e))$('preview-status').textContent=errorText(e);}finally{if(state.preview===current)$('download-file').disabled=false;}}
async function copyLink(file=false){const url=new URL(location.href);const params=new URLSearchParams({snapshot:state.entry.folder});if(file&&state.preview)params.set('path',state.preview.file.path);url.hash=params.toString();const status=file?$('preview-status'):$('action-status');try{await navigator.clipboard.writeText(url.href);status.textContent='Link copied.';}catch{status.textContent='Copy this link from your address bar.';updateHash(file?state.preview?.file.path:undefined);}}

let originMetadata;
async function loadOriginMetadata(signal){if(originMetadata)return originMetadata;originMetadata=await json(sourceURL('origins.json'),signal);return originMetadata;}
function setExporting(value){state.exporting=value;$('selection-controls').disabled=value;document.querySelectorAll('.year-button').forEach(b=>b.disabled=value);$('show-selected').disabled=value;refreshActions();$('cancel-export').disabled=!value;}
async function exportSnapshot(){
  if(state.exporting||!state.data||!selectedIsVisible())return;const entry=state.entry,data=state.data,controller=new AbortController();state.exportController=controller;let writable=null,parts=[];
  setExporting(true);$('export-progress').hidden=false;$('progress-label').textContent='Preparing verified export…';$('progress-detail').textContent='Files are fetched only for this snapshot.';$('progress-meter').max=data.delta.files.length;$('progress-meter').value=0;$('action-status').textContent='';
  try{
    if(entry.bytes>0xffffffff-16*1024**2)throw new Error('This snapshot is too large for the browser ZIP exporter. Download its manifest and files individually.');
    if('showSaveFilePicker' in window){const handle=await window.showSaveFilePicker({suggestedName:`${entry.folder}.zip`,types:[{description:'ZIP archive',accept:{'application/zip':['.zip']}}]});controller.signal.throwIfAborted();writable=await handle.createWritable();}
    else if(entry.bytes>1024**3)throw new Error('This browser would need to keep more than 1 GiB in memory. Use a browser with direct-to-disk downloads, such as desktop Chrome or Edge.');
    const writer=new ZipWriter(async part=>{controller.signal.throwIfAborted();if(writable)await writable.write(part);else parts.push(part);},entry.timestamp);
    const {origins,ledger}=snapshotProvenance(data,await loadOriginMetadata(controller.signal));const prefix=entry.folder+'/';let done=0,downloaded=0;
    for(let start=0;start<data.delta.files.length;start+=4){
      const batch=data.delta.files.slice(start,start+4);
      const bodies=await Promise.all(batch.map(file=>verifiedFile(file,controller.signal)));
      for(let i=0;i<batch.length;i++){await writer.add(prefix+batch[i].path,bodies[i]);downloaded+=bodies[i].byteLength;done++;$('progress-meter').value=done;$('progress-label').textContent=`${done} / ${data.delta.files.length} files verified`;$('progress-detail').textContent=`${bytes(downloaded)} of ${bytes(entry.bytes)} · ${batch[i].path}`;}
    }
    const meta={'capture.json':data.capture,'assets.json':data.assets,'delta.json':data.delta,'origins.json':origins,'source_imports.json':ledger,'export.json':{snapshot:entry.folder,files:done,verified:'SHA-256 of every recovered file',exportedAt:new Date().toISOString(),payloadBase:state.base.href,note:'Reconstructed recovered files. Capture pairings are unverified; missing files remain missing.'}};
    for(const [name,value] of Object.entries(meta))await writer.add(prefix+'_archive_metadata/'+name,jsonBytes(value));
    await writer.finish();controller.signal.throwIfAborted();if(writable)await writable.close();else downloadBlob(new Blob(parts,{type:'application/zip'}),`${entry.folder}.zip`);
    $('progress-label').textContent='Export complete';$('progress-detail').textContent=`${nf.format(done)} files verified · Source credits and manifests included.`;$('action-status').textContent=`${entry.version} is ready. The ZIP contains the full recovered snapshot, including inherited files.`;
  }catch(error){controller.abort();if(writable){try{await writable.abort();}catch{}}$('progress-label').textContent=isAbort(error)?'Export cancelled':'Export stopped';$('progress-detail').textContent=isAbort(error)?'No incomplete ZIP was saved.':errorText(error);}
  finally{parts=[];setExporting(false);state.exportController=null;}
}
async function exportManifest(){if(!state.data||state.exporting||!selectedIsVisible())return;const entry=state.entry,data=state.data;$('manifest-button').disabled=true;try{const {origins,ledger}=snapshotProvenance(data,await loadOriginMetadata());downloadBlob(new Blob([jsonBytes({snapshot:publicMetadata(entry),delta:data.delta,capture:data.capture,assets:data.assets,origins,source_imports:ledger})],{type:'application/json'}),entry.folder+'.manifest.json');$('action-status').textContent='Manifest downloaded. This contains file paths, hashes and sources; no game payloads.';}catch(e){$('action-status').textContent=errorText(e);}finally{refreshActions();}}

function bind(){
  const mobile=matchMedia('(max-width:760px)');const adaptResults=()=>{$('capture-results').open=!mobile.matches;state.fileLimit=filePageSize();renderFiles();};adaptResults();mobile.addEventListener('change',adaptResults);
  $('capture-results').querySelector('summary').addEventListener('click',event=>{if(!mobile.matches)event.preventDefault();});
  $('snapshot-list').addEventListener('keydown',event=>{
    const target=event.target.closest('.snapshot-item');if(!target)return;
    if(!['ArrowDown','ArrowUp','Home','End'].includes(event.key))return;
    event.preventDefault();const targets=[...$('snapshot-list').querySelectorAll('.snapshot-item')],i=targets.indexOf(target),next=event.key==='Home'?0:event.key==='End'?targets.length-1:Math.max(0,Math.min(targets.length-1,i+(event.key==='ArrowDown'?1:-1))),chosen=targets[next];
    if(chosen?.dataset.folder){const entry=state.catalog.entries.find(e=>e.folder===chosen.dataset.folder);if(entry)selectEntry(entry);}else chosen?.focus();
  });
  const filterChanged=()=>{renderSnapshots();if(mobile.matches)$('capture-results').open=true;};
  for(const id of ['version-filter','source-filter','site-filter'])$(id).addEventListener('change',filterChanged);
  $('year-filter').addEventListener('change',()=>{state.year=$('year-filter').value;filterChanged();});
  $('snapshot-search').addEventListener('input',filterChanged);$('reset-filters').addEventListener('click',resetFilters);$('show-selected').addEventListener('click',()=>{resetFilters();renderSnapshots(true);});
  $('latest-capture').addEventListener('click',()=>{const latest=visibleEntries()[0];if(latest)selectEntry(latest);});
  $('clear-year').addEventListener('click',()=>{state.year='';$('year-filter').value='';renderSnapshots();});
  for(const key of ['version','date']){$(`${key}-tab`).addEventListener('click',()=>setTab(key));$(`${key}-tab`).addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();const next=key==='version'?'date':'version';setTab(next);$(`${next}-tab`).focus();}});}
  $('date-input').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();findByDate();}});$('find-date').addEventListener('click',findByDate);$('include-unknown').addEventListener('change',()=>{$('date-note').textContent=$('include-unknown').checked?'Unknown-timezone dates will be compared as written, without a UTC conversion.':'Only UTC captures are compared.';});
  for(const id of ['file-search','file-type','file-state'])$(id).addEventListener(id==='file-search'?'input':'change',()=>{state.fileLimit=filePageSize();renderFiles();});
  for(const button of document.querySelectorAll('.column-sort'))button.addEventListener('click',()=>{const key=button.dataset.sort;state.fileSort={key,direction:state.fileSort.key===key?-state.fileSort.direction:key==='size'?-1:1};state.fileLimit=filePageSize();renderFiles();document.querySelector('.table-scroll').scrollTop=0;});
  $('clear-file-filters').addEventListener('click',()=>{for(const id of ['file-search','file-type','file-state'])$(id).value='';state.fileLimit=filePageSize();renderFiles();});
  for(const view of ['folder','changes'])$(`${view}-view`).addEventListener('click',()=>{state.fileView=view==='folder'?'folders':'changes';setDiscoveryMode(null);$('file-state').value=view==='changes'?'changed':'';state.fileLimit=filePageSize();renderFiles();});
  $('changelog-view').addEventListener('click',()=>{closePreview({restoreFocus:false});setDiscoveryMode('changelog');});
  $('provenance-link').addEventListener('click',()=>{$('provenance-notes').open=true;});
  $('more-files').addEventListener('click',()=>{state.fileLimit+=filePageSize();renderFiles();});$('export-button').addEventListener('click',exportSnapshot);$('cancel-export').addEventListener('click',()=>state.exportController?.abort());$('manifest-button').addEventListener('click',exportManifest);$('share-button').addEventListener('click',()=>copyLink());
  $('game-preview-button').addEventListener('click',()=>{
    if($('game-preview-button').disabled)return;
    const url=new URL('./preview/index.html',import.meta.url);url.searchParams.set('snapshot',state.entry.folder);
    window.open(url.href,'_blank','noopener,noreferrer,popup,width=1280,height=850');
  });
  $('file-history-button').addEventListener('click',()=>{if(state.preview)fileHistory.open(state.preview.file.path,{entry:state.preview.entry,site:gameSite(state.preview.entry),trigger:$('file-history-button')});});
  $('close-preview').addEventListener('click',()=>closePreview());document.addEventListener('keydown',event=>{if(event.key==='Escape'&&state.preview){event.preventDefault();closePreview();}});$('download-file').addEventListener('click',downloadSingle);$('copy-file-link').addEventListener('click',()=>copyLink(true));
  window.addEventListener('hashchange',async()=>{if(!state.catalog||state.exporting)return;const params=new URLSearchParams(location.hash.slice(1));const entry=await entryFromLink(params);if(entry){resetFilters();selectEntry(entry,params.get('path'));}});
}
async function init(){
  bind();try{
    [state.catalog,state.config]=await Promise.all([json(new URL('./catalog.json',import.meta.url)),json(new URL('./config.json',import.meta.url))]);
    state.base=new URL(state.config.archiveBase,new URL('./',import.meta.url));if(!state.base.pathname.endsWith('/'))state.base.pathname+='/';if(!['http:','https:'].includes(state.base.protocol))throw new Error('Open the archive through a static web host or local web server.');
    fileHistory=createFileHistory({catalog:state.catalog,fetchJSON:json,sourceURL,verifiedFile,bytes,dateLabel,entrySource,onOpen:async(entry,path)=>{if(state.exporting)return;setDiscoveryMode(null);resetFilters();await selectEntry(entry,path);$('browser').scrollIntoView({block:'start'});}});
    discovery=createDiscovery({onHistory:(path,options)=>fileHistory.open(path,options),catalog:state.catalog,fetchJSON:json,dateLabel,entrySource,onOpen:async(entry,path)=>{if(state.exporting){$('file-finder-status').textContent='Wait for the current export to finish before opening another capture.';return;}setDiscoveryMode(null);resetFilters();await selectEntry(entry,path);$('browser').scrollIntoView({block:'start'});}});
    renderOverview();const params=new URLSearchParams(location.hash.slice(1));const entry=await entryFromLink(params)||state.catalog.entries.at(-1);$('date-input').value=stampText(entry.timestamp).replace(' ','T');renderSnapshots();await selectEntry(entry,params.get('path'));
    if(location.hash==='#provenance')$('provenance-notes').open=true;
  }catch(e){showError('initial-error',`${errorText(e)} Open this homepage through a static host or local web server.`);$('result-count').textContent='Collection unavailable';$('selected-version').textContent='Archive unavailable';$('selected-date').textContent='The index could not be loaded.';}
}
init();
