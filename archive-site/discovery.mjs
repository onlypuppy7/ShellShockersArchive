const $=id=>document.getElementById(id);
function element(tag,className,text){const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node;}

export function createDiscovery({catalog,fetchJSON,dateLabel,entrySource,onOpen,onHistory}){
  let indexPromise,logPromise,searchRun=0,matches=[],pathLimit=30;
  const loadIndex=()=>indexPromise||(indexPromise=fetchJSON(new URL('./file-index.json',import.meta.url)).then(index=>{
    if(index.formatVersion!==1||index.catalogGenerated!==catalog.generated||index.folders.length!==catalog.entries.length||index.folders.some((folder,i)=>folder!==catalog.entries[i].folder))throw new Error('The file index does not match this catalog. Rebuild and publish both indexes together.');
    return index;
  }).catch(error=>{indexPromise=null;throw error;}));
  const loadLogs=()=>logPromise||(logPromise=fetchJSON(new URL('./changelogs.json',import.meta.url)).then(logs=>{
    if(logs.formatVersion!==1||logs.catalogGenerated!==catalog.generated)throw new Error('The changelog index does not match this catalog. Rebuild and publish it with the catalog.');return logs;
  }).catch(error=>{logPromise=null;throw error;}));
  function matchingCaptures(ranges){const site=$('file-finder-site').value,entries=[];for(let i=0;i<ranges.length;i+=2)for(let n=ranges[i];n<=ranges[i+1];n++){const entry=catalog.entries[n];if(!site||(entry.channel==='development'?'development':'production')===site)entries.push(entry);}return entries.reverse();}
  function renderPaths(){
    const fragment=document.createDocumentFragment();
    for(const match of matches.slice(0,pathLimit)){
      const details=element('details','file-occurrences'),summary=element('summary'),path=element('code','',match.path),count=element('span','helper',`${match.entries.length.toLocaleString('en')} captures`);summary.append(path,count);details.append(summary);
      const list=element('div','occurrence-list');let limit=30;
      function renderCaptures(){list.replaceChildren();for(const entry of match.entries.slice(0,limit)){const button=element('button','occurrence-link');button.type='button';button.append(element('strong','',entry.version),element('time','',dateLabel(entry)),element('span','helper',entrySource(entry)));button.addEventListener('click',()=>onOpen(entry,match.path));list.append(button);}if(match.entries.length>limit){const more=element('button','text-button',`Show ${Math.min(30,match.entries.length-limit)} more captures`);more.type='button';more.addEventListener('click',()=>{limit+=30;renderCaptures();});list.append(more);}}
      let rendered=false;details.addEventListener('toggle',()=>{if(details.open&&!rendered){renderCaptures();rendered=true;}});if(matches.length<=3)details.open=true;const history=element('button','button secondary','File history');history.type='button';history.setAttribute('aria-label',`File history for ${match.path}`);history.addEventListener('click',()=>onHistory(match.path,{site:$('file-finder-site').value,trigger:history}));details.append(history,list);fragment.append(details);
    }
    $('file-finder-results').replaceChildren(fragment);$('file-finder-more').hidden=matches.length<=pathLimit;
  }
  async function search(){
    const query=$('file-finder-query').value.trim().replace(/\\/g,'/').replace(/^(?:\.\/|\/)+/,'').toLowerCase(),exact=$('file-finder-exact').checked,run=++searchRun;
    $('file-finder-results').replaceChildren();$('file-finder-more').hidden=true;
    if(!query){$('file-finder-status').textContent='Enter a filename or part of its path.';return;}
    $('file-finder-status').textContent='Searching recovered inventories…';
    try{const index=await loadIndex();if(run!==searchRun)return;matches=[];const captures=new Set();
      for(const [path,ranges] of Object.entries(index.paths)){if(exact?path.toLowerCase()!==query:!path.toLowerCase().includes(query))continue;const entries=matchingCaptures(ranges);if(!entries.length)continue;matches.push({path,entries});for(const entry of entries)captures.add(entry.folder);}
      pathLimit=30;$('file-finder-status').textContent=matches.length?`${matches.length.toLocaleString('en')} matching paths in ${captures.size.toLocaleString('en')} captures. Open a capture to inspect the file.`:'No recovered file paths match this search.';renderPaths();
    }catch(error){if(run===searchRun)$('file-finder-status').textContent=error.message;}
  }
  $('file-finder-form').addEventListener('submit',event=>{event.preventDefault();search();});
  $('file-finder-query').addEventListener('input',()=>{searchRun++;$('file-finder-results').replaceChildren();$('file-finder-more').hidden=true;$('file-finder-status').textContent='Press Enter or Find to search all versions.';});
  for(const id of ['file-finder-site','file-finder-exact'])$(id).addEventListener('change',()=>{if($('file-finder-query').value.trim())search();});
  $('file-finder-more').addEventListener('click',()=>{pathLimit+=30;renderPaths();});
  let logRun=0;
  async function showChangelog(entry){
    const run=++logRun;$('changelog-content').replaceChildren();$('changelog-status').textContent=`Loading recovered notes for ${entry.version}…`;
    try{const logs=await loadLogs();if(run!==logRun)return;const refs=logs.snapshots[entry.folder]||[],fragment=document.createDocumentFragment();
      if(!refs.length){$('changelog-status').textContent=`No changelog could be recovered for this capture (${entry.version}).`;return;}
      $('changelog-status').textContent=refs.some(ref=>ref.unverified)?'Release notes were found in this inventory, but their association with this capture is unverified.':'Recovered release notes. Dates and wording are preserved from the source.';
      for(const ref of refs){const record=logs.records[ref.id];if(!record)continue;const article=element('article','release-notes');article.append(element('h4','',record.version||'Unlabelled release notes'));if(record.date)article.append(element('p','helper',record.date));if(ref.fallback)article.append(element('p','notice','Recovered from another archived capture of this version. Its pairing with the selected capture is unverified.'));
        for(const block of record.blocks){const tag=block.kind==='heading'?'h5':block.kind==='item'?'li':'p';if(tag==='li'){let list=article.lastElementChild;if(list?.tagName!=='UL'){list=element('ul');article.append(list);}list.append(element('li','',block.text));}else article.append(element(tag,'',block.text));}
        if(ref.unverified)article.insertBefore(element('p','notice',ref.inherited?'These notes come from an inherited file. They are not confirmed release notes for the selected capture.':`The source labels these notes ${record.version||'without a version'}, while this capture is labelled ${entry.version}.`),article.children[1]||null);
        const source=element('button','text-button',`Source: ${ref.path} · ${ref.method}`);source.type='button';source.title=ref.source;const sourceEntry=catalog.entries.find(candidate=>candidate.folder===ref.folder);if(sourceEntry)source.addEventListener('click',()=>onOpen(sourceEntry,ref.path));else source.disabled=true;article.append(source);fragment.append(article);
      }
      $('changelog-content').replaceChildren(fragment);
    }catch(error){if(run!==logRun)return;$('changelog-status').textContent=error.message;const retry=element('button','text-button','Try loading the changelog again');retry.type='button';retry.addEventListener('click',()=>showChangelog(entry));$('changelog-content').append(retry);}
  }
  return {search,showChangelog};
}
