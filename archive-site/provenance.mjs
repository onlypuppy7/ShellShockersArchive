// Public provenance deliberately excludes donor repository and workstation details.
const privateKeys=new Set(['repository','imported_head','commit','git_blob','git_repo_local_path','author_date','committer_date','original_path','original_filename','source_documents','readme_content_as_data','history_scope','relevant_commits','git_unique_blobs','scope','formatted_files','derived_wat_files','git_text_normalization_possible']);
export function publicMetadata(value){
  if(Array.isArray(value))return value.map(publicMetadata);
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).filter(([key])=>!privateKeys.has(key)).map(([key,item])=>[key,publicMetadata(item)]));
  if(typeof value==='string'){
    if(/^[a-z]:[\\/]|^\\\\|^\/home\/|^\/Users\//i.test(value))return value.replace(/\\/g,'/').split('/').pop();
    if(/ShellShockersWorkingStatus|statefarm_bot\/store\/|update checker|blob.storage/i.test(value))return 'Community collection';
    if(/committer|Git commit|Git blob|repository filenames/i.test(value))return 'Collection observation; not a verified deployment time.';
  }
  return value;
}
export function publicSources(sources){
  return Object.fromEntries(Object.entries(sources||{}).map(([id,source])=>[id,{
    name:source.name||source.display_name||id,credit:source.credit||id,
    kind:id==='archive_org'?'web_archive':'community_collection',
    ...(source.display_name?{display_name:source.display_name}:{}),
    ...(id==='archive_org'?{url:'https://archive.org/'}:id==='onlypuppy7_legacy_js_archive'?{url:'https://github.com/onlypuppy7/ShellShockJSArchives'}:id==='random_repo'?{url:'https://github.com/TheGreatMaximus98/shell-shockers'}:id==='doescolder_map_archive'?{url:'https://github.com/deathlyhate/shell-map-archive'}:{})
  }]));
}
export function snapshotProvenance(data,origins){
  const metadata=new Map([...data.capture.files,...data.assets.files].map(file=>[file.path,file]));
  const ids=new Set(),hashes=new Set(),records=[];
  for(const file of data.delta.files){
    const meta=metadata.get(file.path)||{},providers=new Set([meta.origin_id||'archive_org',...(meta.additional_origin_ids||[]),...(origins.additional_content_origins?.[file.sha256]||[])]);
    hashes.add(file.sha256);for(const id of providers)ids.add(id);
    records.push({path:file.path,sha256:file.sha256,preserved_source:file.source,origin_ids:[...providers].sort()});
  }
  const sources=publicSources(origins.sources),additional=Object.fromEntries(Object.entries(origins.additional_content_origins||{}).filter(([hash])=>hashes.has(hash)));
  return {
    origins:{format_version:2,sources:Object.fromEntries([...ids].sort().map(id=>[id,sources[id]||{name:id,credit:id,kind:'community_collection'}])),additional_content_origins:additional},
    ledger:{format_version:2,status:'complete',scope:'Selected recovered snapshot only',records}
  };
}
