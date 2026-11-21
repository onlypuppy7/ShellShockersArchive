const $=id=>document.getElementById(id);
function node(tag,className,text){const n=document.createElement(tag);if(className)n.className=className;if(text!==undefined)n.textContent=text;return n;}
const siteOf=e=>e.channel==='development'?'development':'production';

// Bound the LCS work for large/minified replacements. Common edges remain exact.
export function lineDiff(before,after){
  const a=before.split('\n'),b=after.split('\n');let start=0,end=0;
  while(start<a.length&&start<b.length&&a[start]===b[start])start++;
  while(end<a.length-start&&end<b.length-start&&a[a.length-1-end]===b[b.length-1-end])end++;
  const left=a.slice(start,a.length-end),right=b.slice(start,b.length-end),out=a.slice(0,start).map(text=>[' ',text]);
  const coarse=left.length*right.length>1000000;
  if(coarse){out.push(...left.map(text=>['-',text]),...right.map(text=>['+',text]));}
  else{
    const rows=Array.from({length:left.length+1},()=>new Uint32Array(right.length+1));
    for(let i=left.length-1;i>=0;i--)for(let j=right.length-1;j>=0;j--)rows[i][j]=left[i]===right[j]?1+rows[i+1][j+1]:Math.max(rows[i+1][j],rows[i][j+1]);
    let i=0,j=0;while(i<left.length||j<right.length){if(i<left.length&&j<right.length&&left[i]===right[j])out.push([' ',left[i++]]),j++;else if(i<left.length&&(j===right.length||rows[i+1][j]>=rows[i][j+1]))out.push(['-',left[i++]]);else out.push(['+',right[j++]]);}
  }
  out.push(...a.slice(a.length-end).map(text=>[' ',text]));return {lines:out,coarse};
}

export function createFileHistory({catalog,fetchJSON,sourceURL,verifiedFile,bytes,dateLabel,entrySource,onOpen}){
  let indexPromise,current,openRun=0,controller;
  const load=()=>indexPromise||(indexPromise=fetchJSON(new URL('./file-history.json',import.meta.url)).then(index=>{
    if(index.formatVersion!==1||index.catalogGenerated!==catalog.generated||index.folders.length!==catalog.entries.length||index.folders.some((f,i)=>f!==catalog.entries[i].folder))throw new Error('The history index does not match this catalog. Rebuild and publish both together.');return index;
  }).catch(error=>{indexPromise=null;throw error;}));
  function stop(){controller?.abort();controller=null;}
  function close(){openRun++;stop();$('file-history').hidden=true;current?.trigger?.isConnected&&current.trigger.focus({preventScroll:true});}
  function renderTimeline(){
    const changedOnly=$('history-changed-only').checked,groups=current.groups.filter(group=>!changedOnly||group.changed),fragment=document.createDocumentFragment();
    $('history-status').textContent=current.present.length?`${current.present.length.toLocaleString('en')} captures · ${new Set(current.present.map(item=>item.hash)).size} distinct contents · ${groups.length} ${changedOnly?'content changes':'recorded periods'}. Newest first. Dates describe containing snapshots; file observations are shown in the comparison.${changedOnly?' First recordings, inventory gaps and unchanged reappearances are hidden.':''}`:'This path is not present in the selected game site.';
    if(changedOnly&&current.present.length&&!groups.length)fragment.append(node('p','helper','No content changes recorded for this path in the selected game site. Turn off “Show only changed revisions” to see its full history.'));
    for(const group of groups.slice().reverse().slice(0,current.limit)){
      const row=node('div','history-row'),first=group.items[0],last=group.items.at(-1);
      row.append(node('strong','',group.hash?(group.returned?'Reappeared':group.initial?'First recorded':'Content changed'):'Not in inventory'),node('span','helper',`Snapshot dates: ${dateLabel(first.entry)}${first!==last?' → '+dateLabel(last.entry):''}`),node('span','helper',`${group.items.length} captures · ${first.entry.version}${first.entry.version!==last.entry.version?' → '+last.entry.version:''}`));
      if(group.hash){row.append(node('code','',`${group.hash.slice(0,12)} · ${bytes(catalog.payloadSizes[group.hash])}`));const button=node('button','text-button','Compare this revision');button.type='button';button.addEventListener('click',()=>{const n=current.present.indexOf(first),previous=current.present.slice(0,n).reverse().find(item=>item.hash!==first.hash);$('history-from').value=String(previous?.number??first.number);$('history-to').value=String(first.number);compare();});row.append(button);}fragment.append(row);
    }
    $('history-timeline').replaceChildren(fragment);$('history-more').hidden=groups.length<=current.limit;
  }
  function render(){
    stop();const site=$('history-site').value,runs=current.index.paths[current.path]||[],hashes=new Map();
    for(const [start,end,hash] of runs)for(let i=start;i<=end;i++)hashes.set(i,hash);
    const scoped=catalog.entries.map((entry,number)=>({entry,number,hash:hashes.get(number)||null})).filter(item=>!site||siteOf(item.entry)===site),present=scoped.filter(item=>item.hash);
    current.present=present;current.groups=[];current.limit=30;
    const first=scoped.findIndex(item=>item.hash);
    for(const item of first<0?[]:scoped.slice(first)){let group=current.groups.at(-1);if(!group||group.hash!==item.hash){group={hash:item.hash,items:[],initial:!current.groups.length,returned:!!current.groups.length&&!current.groups.at(-1).hash};current.groups.push(group);}group.items.push(item);}
    let previousHash=null;for(const group of current.groups){group.changed=!!group.hash&&previousHash!==null&&group.hash!==previousHash;if(group.hash)previousHash=group.hash;}
    renderTimeline();$('history-comparison').hidden=!present.length;$('history-diff').replaceChildren();$('history-metadata').replaceChildren();$('history-diff-status').textContent='';
    for(const id of ['history-from','history-to']){$(id).replaceChildren();for(const item of present){const o=node('option','',`${item.entry.version} · ${dateLabel(item.entry)} · ${entrySource(item.entry)} · ${item.hash.slice(0,8)}`);o.value=item.number;$(id).append(o);}}
    if(!present.length)return;
    const selected=present.find(item=>item.entry.folder===current.entry?.folder)||present.at(-1),previous=present.slice(0,present.indexOf(selected)).reverse().find(item=>item.hash!==selected.hash);
    $('history-from').value=String(previous?.number??selected.number);$('history-to').value=String(selected.number);compare();
  }
  async function compare(){
    stop();const task=new AbortController();controller=task;const context=current,from=current.present.find(i=>i.number===+$('history-from').value),to=current.present.find(i=>i.number===+$('history-to').value);
    $('history-diff').replaceChildren();$('history-metadata').replaceChildren();
    const observationLabels=[];
    for(const [label,item] of [['From',from],['To',to]]){const block=node('div'),observation=node('span','helper','Loading file observation…');block.append(node('strong','',`${label} snapshot: ${item.entry.version} · ${dateLabel(item.entry)}`),node('code','',item.hash),node('span','helper',`${bytes(catalog.payloadSizes[item.hash])} · ${entrySource(item.entry)}`),observation);observationLabels.push(observation);const button=node('button','text-button','Open file in capture');button.type='button';button.addEventListener('click',()=>onOpen(item.entry,context.path));block.append(button);$('history-metadata').append(block);}
    await Promise.all([from,to].map(async(item,i)=>{
      try{
        const [capture,assets]=await Promise.all(['capture.json','assets.json'].map(name=>fetchJSON(sourceURL(`${item.entry.folder}/${name}`),task.signal)));
        if(task.signal.aborted||current!==context)return;
        const meta=[...(capture.files||[]),...(assets.files||[])].find(f=>f.path===context.path&&(f.sha256||f.source?.sha256)===item.hash);
        const evidence=meta?.capture_association?.observation||meta?.actual_replay_source||meta?.source||meta?.source_import;
        if(evidence?.timestamp&&/^\d{14}$/.test(evidence.timestamp)){
          const date=dateLabel({timestamp:evidence.timestamp,timezone:evidence.timezone==='unspecified'?'unknown':'UTC'});
          observationLabels[i].textContent=`${meta?.derived?'Original source observed':'File observed'}: ${date}. Release membership is unverified.`;
        }else observationLabels[i].textContent='No independent file capture date recorded. The snapshot date does not establish its release membership.';
      }catch(error){if(!task.signal.aborted)observationLabels[i].textContent='File observation unavailable. The snapshot date does not establish its release membership.';}
    }));
    if(task.signal.aborted||current!==context)return;
    if(from.hash===to.hash){$('history-diff-status').textContent='Identical SHA-256: these captures contain exactly the same bytes, including any inherited copy.';return;}
    const delta=(catalog.payloadSizes[to.hash]||0)-(catalog.payloadSizes[from.hash]||0);
    $('history-diff-status').textContent=`Different SHA-256 · size change ${delta>=0?'+':''}${delta.toLocaleString('en')} B. Loading verified comparison…`;
    try{
      if([from,to].some(i=>catalog.payloadSizes[i.hash]>2*1024**2))throw new Error('Text comparison is limited to 2 MiB per file. Open each capture to download the complete files.');
      const bodies=await Promise.all([from,to].map(async item=>{const inventory=await fetchJSON(sourceURL(`${item.entry.folder}/delta.json`),task.signal),file=inventory.files.find(f=>f.path===context.path);if(!file||file.sha256!==item.hash)throw new Error('The capture inventory does not match the history index.');return verifiedFile(file,task.signal);}));
      if(task.signal.aborted||current!==context)return;
      const texts=bodies.map(body=>{const text=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(body);if(/[\x00-\x08\x0e-\x1f]/.test(text))throw new Error('Binary content: compare the hashes and sizes above, or open each capture to inspect the file.');return text;});
      if(texts.some(t=>t.length>400000||t.split('\n').length>20000))throw new Error('This text is too large for an inline diff. Open each capture to inspect or download it.');
      const result=lineDiff(...texts),added=result.lines.filter(l=>l[0]==='+').length,removed=result.lines.filter(l=>l[0]==='-').length;
      $('history-diff-status').textContent=`Verified comparison · ${added} added lines · ${removed} removed lines${result.coarse?' · large changed block shown as a replacement':''}. Size change ${delta>=0?'+':''}${delta.toLocaleString('en')} B. − From / + To. Line endings are preserved.`;
      const fragment=document.createDocumentFragment();let old=0,next=0;
      // Collapse unchanged stretches to keep large archived bundles usable.
      const visible=new Set();result.lines.forEach((line,i)=>{if(line[0]!==' ')for(let n=Math.max(0,i-3);n<=Math.min(result.lines.length-1,i+3);n++)visible.add(n);});
      let skipped=0;for(let i=0;i<result.lines.length;i++){const [sign,text]=result.lines[i];if(sign!=='+')old++;if(sign!=='-')next++;if(!visible.has(i)){skipped++;continue;}if(skipped){fragment.append(node('div','diff-skip',`… ${skipped} unchanged lines …`));skipped=0;}const row=node('div',sign==='+'?'diff-add':sign==='-'?'diff-remove':'diff-context');row.append(node('span','diff-number',`${sign==='+'?'':old} / ${sign==='-'?'':next}`),node('span','diff-text',`${sign} ${text}`));fragment.append(row);}if(skipped)fragment.append(node('div','diff-skip',`… ${skipped} unchanged lines …`));$('history-diff').replaceChildren(fragment);
    }catch(error){if(!task.signal.aborted&&current===context)$('history-diff-status').textContent=error instanceof TypeError?'This file is not UTF-8 text. Compare hashes and sizes, or open each capture to inspect it.':error.message;}
  }
  async function open(path,{entry,site='',trigger}={}){
    const run=++openRun;stop();current={path,entry,trigger};$('file-history').hidden=false;$('history-path').textContent=path;$('history-site').value=site;$('history-status').textContent='Loading file history…';$('history-timeline').replaceChildren();$('history-more').hidden=true;$('history-comparison').hidden=true;$('file-history').focus({preventScroll:true});$('file-history').scrollIntoView({block:'start'});
    try{const index=await load();if(run!==openRun)return;current.index=index;render();}catch(error){if(run===openRun){$('history-status').textContent=error.message;const retry=node('button','text-button','Retry loading history');retry.type='button';retry.addEventListener('click',()=>open(path,{entry,site,trigger}));$('history-timeline').append(retry);}}
  }
  $('history-close').addEventListener('click',close);$('file-history').addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();}});$('history-site').addEventListener('change',()=>{if(current?.index)render();});$('history-changed-only').addEventListener('change',()=>{if(current?.index){current.limit=30;renderTimeline();}});$('history-more').addEventListener('click',()=>{current.limit+=30;renderTimeline();});$('history-compare').addEventListener('click',compare);
  return {open};
}
