// Runtime-only transformations. Original archived files are never modified.
export const isGameHost=host=>/^(?:(?:www|dev)\.)?shellshock\.io$/i.test(host);
export const hasClassicAdapter=version=>/^\d+\.\d+(?:\.|$)/.test(version);
const regexLiteral=value=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
export function rewriteCSS(text,resolve){
  return text.replace(/url\(\s*(['"]?)(.*?)\1\s*\)/gi,(_,q,url)=>`url("${resolve(url).replaceAll('"','%22')}")`)
    .replace(/(@import\s+)(['"])(.*?)\2/gi,(_,pre,q,url)=>`${pre}${q}${resolve(url)}${q}`);
}
// Later minifiers rename closure variables. Bind stable adapter names to live
// accessors, so scene/player assignments still belong to the native client.
function renamedGameBindings(text){
  if(/function\s+joinGame\s*\(/.test(text))return '';
  const pick=pattern=>text.match(pattern)?.[1];
  const commandNumbers={gameJoined:0,addPlayer:1,removePlayer:2,chat:3,syncThem:6,die:8,hitThem:9,hitMe:10,collectItem:11,spawnItem:12,respawn:13,joinGame:14,swapWeapon:15,ping:16,clientReady:18,requestRespawn:19,joinPublicGame:21,joinPrivateGame:22,createPrivateGame:23,switchTeam:25,notification:26,changeCharacter:27,playerCount:28,pause:30,updateBalance:32,reload:33,switchTeamFail:35,expireUpgrade:36,loginRequired:38,gameLocked:40,bootPlayer:42,banned:43,spatula:44,syncMe:45,explode:46,keepAlive:47,musicInfo:48,throwGrenade:49,fire:51,videoReward:58,eventModifier:63,beginShellStreak:64,endShellStreak:65,hitMeHardBoiled:66};
  const flattened=text.match(/([\w$]+)=0,([\w$]+)=1,([\w$]+)=2,([\w$]+)=3,([\w$]+)=6,/);
  const symbols=new Map();
  if(flattened){
    const declarations=text.slice(flattened.index,flattened.index+1300).split(';')[0];
    for(const match of declarations.matchAll(/([\w$]+)=(\d+)(?=,|$)/g))if(!symbols.has(+match[2]))symbols.set(+match[2],match[1]);
  }
  const command=key=>symbols.get(commandNumbers[key]);
  const flatCode=flattened?'{'+Object.entries(commandNumbers).map(([key,value])=>key+':'+value).join(',')+'}':null;
  const commandRef=key=>command(key)||'[\\w$]+\\.'+key;
  const flatPlayer=flattened?text.match(new RegExp('case '+command('addPlayer')+':([\\s\\S]*?)break;'))?.[1]:null;
  const flatJoin=flattened?text.match(new RegExp('case '+command('gameJoined')+':([\\s\\S]*?)break;'))?.[1]:null;
  const aliases={
    CommCode:pick(/([\w$]+)=\{gameJoined:0,addPlayer:\d+/)||flatCode,
    CommIn:pick(/([\w$]+)\.init\([\w$]+\.data\)/),
    CommOut:pick(/([\w$]+)\.getBuffer\(\);[\w$]+\.packInt8\([\w$]+\.joinGame\)/)|| (flattened?pick(new RegExp('([\\w$]+)\\.getBuffer\\(\\);[\\w$]+\\.packInt8\\('+command('joinGame')+'\\)')):null),
    GameType:pick(/([\w$]+)=\{ffa:0,teams:1/)||(flattened?'{ffa:0,teams:1,ctf:2}':null),
    inGame:pick(/get inGame\(\)\{return ([\w$]+)/),
    me:pick(/vueApp\.game\.respawnTime=0,(?:[\w$]+=(?:0|!0|!1),)*([\w$]+)=null/)||pick(/([\w$]+)=null,[\w$]+=null,[\w$]+=!0/),
    meId:pick(/case [\w$]+\.gameJoined:[\s\S]{0,100}?([\w$]+)=[\w$]+\.unPackInt8U/)||flatJoin?.match(/([\w$]+)=[\w$]+\.unPackInt8U/)?.[1],
    selectedServer:pick(/var [\w$]+=getGameServerUrl\(([\w$]+)\)/),
    minMaps:pick(/mapIdx=Math.randomInt\(0,([\w$]+)\.length\)/)||pick(/([\w$]+)=\[\{filename:/),
    map:pick(/([\w$]+)\.data\[[\w$]+\]\[[\w$]+\]\[[\w$]+\];if\(/),
    mapMeshes:pick(/var [\w$]+=([\w$]+)\[[\w$]+\.idx\];if\(/),
    gameScene:[...text.matchAll(/([\w$]+)\.ambientColor=new [\w$]+\.Color3/g)].at(-1)?.[1],
    inviteFriends:pick(/inviteFriends:([\w$]+)/),
  };
  if(Object.values(aliases).some(value=>!value))return '';
  const start=text.indexOf('joinGame(), params:');
  if(start<0)return '';
  let socket=text.slice(flattened?text.indexOf('case '+command('clientReady')+':')-30:text.indexOf('case '+aliases.CommCode+'.clientReady:')-30);
  if(flattened){
    const replacements=new Map(Object.keys(commandNumbers).filter(key=>command(key)).map(key=>[command(key),'CommCode.'+key]));
    socket=socket.replace(/(?<![\w$])[\w$]+(?![\w$])/g,word=>replacements.get(word)||word);
  }
  let join=text.slice(start,start+14000);
  if(flattened){
    const replacements=new Map(Object.keys(commandNumbers).filter(key=>command(key)).map(key=>[command(key),'CommCode.'+key]));
    join=join.replace(/(?<![\w$])[\w$]+(?![\w$])/g,word=>replacements.get(word)||word);
  }
  const accessors=Object.entries(aliases).map(([name,symbol])=>`get ${name}(){return ${symbol}}`+(symbol.startsWith('{')?'':`,set ${name}(value){${symbol}=value}`)).join(',');
  return `if(window.__archiveGameAdapterSource&&!window.__archiveGameEvaluate){window.__archiveGameSources=${JSON.stringify({socket,join})};eval("with({"+${JSON.stringify(accessors)}+"}){eval(window.__archiveGameAdapterSource)}");}`;
}
function nativeOfflineBindings(text){
  const literal=value=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  // Development captures retain readable names and whitespace. Bind that
  // native map-test path directly instead of interpreting its renamed packets.
  if(/function startGame\(\)\s*\{/.test(text)&&/function onLoadingComplete\(\)\s*\{/.test(text)&&/mapTest\.x\s*\+/.test(text)&&text.includes('G.playerAccount')&&text.includes('MetaGames[')&&/maps\[[\w$]+\]\.filename/.test(text)&&/this\.hp_?\s*=/.test(text)){
    const names=['startGame','resumeGame','G','me','maps','mapTest','playOffline','inGame','mapIdx','gameType','GameType','MetaGames','metaGame','metaGameUI','ws','meId','playerLimit','inviteFriends','gameCode','isGameOwner','isPrivateGame','myTeam'];
    const aliases=Object.fromEntries(names.map(name=>[name,name]));
    aliases.initializeGameUi='resetGameUI';
    aliases.ensureGameLoop='(()=>{clearInterval(logicInterval);startRunning()})';
    aliases.initializeGameSession=text.includes('SessionStats = new sessionStats')?'(()=>{SessionStats=new sessionStats();sessionStatsSent=false})':'(()=>{})';
    aliases.loadAllObjectMeshes=/function loadAllObjectMeshes\(/.test(text)?'loadAllObjectMeshes':'(async()=>true)';
    const fields={hp:/this\.hp_\s*=/.test(text)?'hp_':'hp',x:/this\.x_\s*=/.test(text)?'x_':'x',y:/this\.y_\s*=/.test(text)?'y_':'y',z:/this\.z_\s*=/.test(text)?'z_':'z',weapon:'weapon',ammo:'rounds'};
    const accessors=Object.entries(aliases).map(([name,symbol])=>`get ${name}(){return ${symbol}}`+(symbol.startsWith('(')?'':`,set ${name}(value){${symbol}=value}`)).join(',');
    const source=`if(!window.__archiveLocalGame&&window.__archiveNativeGameAdapterSource){window.__archiveNativeFields=${JSON.stringify(fields)};eval("with({"+${JSON.stringify(accessors)}+"}){eval(window.__archiveNativeGameAdapterSource)}");}`;
    return {source,loadingAt:text.indexOf('function onLoadingComplete('),loadingName:'onLoadingComplete',players:'players',meId:'meId',aliases,readable:true};
  }
  const declarationFor=message=>text.match(new RegExp('(?:async )?function\\s+([\\w$]+)\\([^)]*\\)\\{[^{}]{0,180}console\\.log\\(["\']'+message+'["\']\\)'))?.[1];
  const startName=declarationFor('startGame\\(\\)'),loadingName=declarationFor('onLoadingComplete');
  if(!startName||!loadingName)return null;
  const startAt=text.indexOf('function '+startName+'('),loadingAt=text.indexOf('function '+loadingName+'(');
  const start=text.slice(startAt,startAt+22000),body=text.slice(loadingAt,loadingAt+6500);
  const state=body.match(/([\w$]+)\[([\w$]+)\]\.([\w$]+)=100/),test=body.match(/([\w$]+):([\w$]+)\.x\+\.5/);
  if(!state||!test)return null;
  const pick=pattern=>text.match(pattern)?.[1];
  const accountRoot=body.match(/([\w$]+)\.playerAccount\.getPrimaryWeapon/)?.[1];
  const mapAt=text.indexOf('mapBackup'),mapSource=text.slice(Math.max(0,mapAt-250),mapAt+400);
  const meta=text.match(/(?:let |var |const |,)[\w$]+=([\w$]+)\[([\w$]+)\];([\w$]+)=new [\w$]+\.logic,([\w$]+)=new [\w$]+\.ui/);
  const sessionStats=text.match(/([\w$]+)=new ([\w$]+),([\w$]+)=!1,ga\("send","event",vueData\.googleAnalytics\.cat\.play/);
  const running=text.match(/function ([\w$]+)\(\)\{[^{}]{0,160}?([\w$]+)=setInterval\([\w$]+,1e3\/30\)\}/);
  const aliases={
    startGame:startName,
    resumeGame:declarationFor('resumeGame called'),
    initializeGameUi:pick(/function ([\w$]+)\(\)\{[\w$]+=document\.getElementById\("chatIn"\)/)||'(()=>{})',
    initializeGameSession:sessionStats?`(()=>{${sessionStats[1]}=new ${sessionStats[2]};${sessionStats[3]}=false})`:'(()=>{})',
    ensureGameLoop:running?`(()=>{clearInterval(${running[2]});${running[1]}()})`:'(()=>{})',
    G:accountRoot||'({playerAccount:extern.account,catalog:extern.catalog})',
    me:start.match(/vueApp\.game\.respawnTime=0,(?:[\w$]+=(?:0|!0|!1),)*([\w$]+)=null/)?.[1],
    maps:mapSource.match(/([\w$]+)\[[\w$]+\]\.filename/)?.[1],
    mapTest:test[2],
    playOffline:body.match(/\.fogEnabled=!0,([\w$]+)\)\{/)?.[1],
    inGame:pick(/get inGame\(\)\{return ([\w$]+)/),
    mapIdx:pick(new RegExp('\\}\\(([\\w$]+),'+literal(loadingName)+'\\)'))||start.match(new RegExp('[\\w$]+\\(([\\w$]+),'+literal(loadingName)+'\\)'))?.[1],
    gameType:meta?.[2]||pick(/get gameType\(\)\{return ([\w$]+)/),
    GameType:start.match(/==([\w$]+)\.teams/)?.[1]||'({ffa:0,teams:1,ctf:2,king:3})',
    MetaGames:meta?.[1],metaGame:meta?.[3],metaGameUI:meta?.[4],
    ws:pick(/\(([\w$]+)=new WebSocket\([^)]*\)\)\.binaryType="arraybuffer"/)||pick(/([\w$]+)=new WebSocket\([^)]*\),[\w$]+\.binaryType="arraybuffer"/),
    meId:state[2],
    playerLimit:'playerLimit',
    inviteFriends:pick(/inviteFriends:([\w$]+)/)||'inviteFriends',
    gameCode:pick(/\+"#"\+([\w$]+)/),
    loadAllObjectMeshes:pick(/async function ([\w$]+)\(\)\{return [^{}]{0,250}console\.log\("Loading all object meshes/)||'(async()=>true)',
  };
  // Some releases inline the original UI initializer in gameJoined.
  const inlineUi=text.match(/function\(\)\{[\w$]+=document\.getElementById\("chatIn"\)[\s\S]*?\}\(\)/)?.[0];
  if(inlineUi)aliases.initializeGameUi='('+inlineUi.slice(0,-2)+')';
  const joined=text.match(/console\.log\("[^"\n]*gameJoined[^"\n]*"\),([\s\S]{0,800})/)?.[1]||'';
  const joinFields=[...joined.matchAll(/([\w$]+)=(?:1==)?[\w$]+\.unPackInt8U\(\)/g)].map(match=>match[1]);
  aliases.playerLimit=joinFields[4]||'playerLimit';
  aliases.isGameOwner=joinFields[5]||'isGameOwner';aliases.isPrivateGame=joinFields[6]||'isPrivateGame';aliases.myTeam=joinFields[1]||'myTeam';
  if(Object.values(aliases).some(value=>!value))return null;
  const pos=axis=>body.match(new RegExp('([\\w$]+):'+literal(test[2])+'\\.'+axis))?.[1];
  const logicAt=text.indexOf('function updateLogic()'),logic=logicAt>=0?text.slice(logicAt,logicAt+2800):text;
  const currentAmmo=text.match(new RegExp(literal(aliases.me)+'\\.([\\w$]+)&&0=='+literal(aliases.me)+'\\.\\1\\.ammo\\.([\\w$]+)'));
  const weapon=currentAmmo?.[1]||logic.match(new RegExp(literal(aliases.me)+'\\.([\\w$]+)\\.ammo'))?.[1]||'weapon';
  const ammo=currentAmmo?.[2]||'rounds';
  const fields={hp:state[3],x:pos('x'),y:pos('y'),z:pos('z'),weapon,ammo};
  const accessors=Object.entries(aliases).map(([name,symbol])=>`get ${name}(){return ${symbol}}`+(symbol.startsWith('(')?'':`,set ${name}(value){${symbol}=value}`)).join(',');
  const source=`if(!window.__archiveLocalGame&&window.__archiveNativeGameAdapterSource){window.__archiveNativeFields=${JSON.stringify(fields)};eval("with({"+${JSON.stringify(accessors)}+"}){eval(window.__archiveNativeGameAdapterSource)}");}`;
  return {source,loadingAt,loadingName,players:state[1],meId:state[2],aliases};
}
export function prepareHTML(text,{root,files,development,version,runtimeVersion=version,compatibilityHTML=''}){
  const doc=new DOMParser().parseFromString(text,'text/html');
  if(compatibilityHTML&&!doc.getElementById('inviteFriends')){
    const donor=new DOMParser().parseFromString(compatibilityHTML,'text/html');
    const original=donor.getElementById('inviteFriends');
    if(original){
      // Recover the script's archived dialog verbatim, rather than creating
      // a preview-specific popup for mismatched early HTML/script pairings.
      for(const element of original.querySelectorAll('[id]'))doc.getElementById(element.id)?.remove();
      doc.body.append(doc.importNode(original,true));
    }
  }
  const known=new Set(files.map(f=>f.path));
  const has=path=>known.has(development?'_dev/'+path:path)||known.has(path);
  function resolve(value){
    if(!value||/^(?:data:|blob:|javascript:|#)/i.test(value))return value;
    const url=new URL(value,'https://shellshock.io/');
    // Font Awesome is a CDN dependency in the original HTML, rather than a
    // game asset in its inventory. Serve the preview's local copy offline.
    if(/^(?:cdnjs\.cloudflare\.com|use\.fontawesome\.com)$/.test(url.hostname)&&/\/(?:font-awesome\/5\.[^/]+|releases\/v5\.[^/]+)\/css\/(?:all|fontawesome)(?:\.min)?\.css$/.test(url.pathname))return root+'_preview/vendor/fontawesome-5.14.0/css/all.min.css';
    if(!isGameHost(url.hostname)&&!has(decodeURIComponent(url.pathname.slice(1))))return 'about:blank';
    return root+url.pathname.slice(1)+url.search+url.hash;
  }
  doc.querySelectorAll('base,meta[http-equiv],link[rel="manifest"],iframe,object,embed').forEach(n=>n.remove());
  for(const script of doc.querySelectorAll('script[src]')){
    const src=script.getAttribute('src');const url=new URL(src,'https://shellshock.io/');
    if(url.pathname.includes('/asc-ad-video/')){script.remove();continue;}
    if(!isGameHost(url.hostname)&&!has(decodeURIComponent(url.pathname.slice(1)))){script.remove();continue;}
    script.src=resolve(src);script.removeAttribute('integrity');script.removeAttribute('crossorigin');
  }
  for(const el of doc.querySelectorAll('[src],[href],[poster],[data-src]'))for(const attr of ['src','href','poster','data-src']){
    if(!el.hasAttribute(attr)||el.tagName==='SCRIPT')continue;
    if(el.tagName==='A')continue;
    el.setAttribute(attr,resolve(el.getAttribute(attr)));
  }
  for(const el of doc.querySelectorAll('[srcset]'))el.removeAttribute('srcset');
  for(const el of doc.querySelectorAll('link[href*="_preview/vendor/fontawesome-"]')){el.removeAttribute('integrity');el.removeAttribute('crossorigin');}
  for(const el of doc.querySelectorAll('[style]'))el.setAttribute('style',rewriteCSS(el.getAttribute('style'),resolve));
  for(const el of doc.querySelectorAll('style'))el.textContent=rewriteCSS(el.textContent,resolve);
  for(const script of doc.querySelectorAll('script:not([src])')){
    // Retained language JSON can predate a recovered template. An absent
    // optional tooltip must not prevent Vue from rendering the whole HUD.
    script.textContent=script.textContent.replace(/\b((?:this\.)?loc\.[\w$]+)\.format\(/g,'($1||"").format(');
    if(script.textContent.includes('sl78wfhe4.'))script.textContent=script.textContent.replace(/(static loadJS\s*\(\s*path\s*,\s*callback\s*\)\s*\{)/,'$1 return window.__archiveLoadPlainScript(path,callback);');
    script.textContent=script.textContent.replace(/\binit\(\)\.then\(/g,'Promise.all([init(),window.__archivePatchReady]).then(').replace(/new Function\(srcString\)/g,'window.__archiveDecodedFunction(srcString)');
    script.textContent=script.textContent.replace(/window\.onloadingcomplete\(\);/g,'(function waitForClient(){if(typeof window.onloadingcomplete==="function")window.onloadingcomplete();else setTimeout(waitForClient,100);})();');
    script.textContent=script.textContent.replace(/\blet (\w+)\s*=\s*process\(data\);/g,'let $1 = /^\\s*(?:\\(\\s*\\(\\s*\\)\\s*=>|\\(function|!function|var |let |const )/.test(xhr.response)?encoder.encode(xhr.response):process(data);');
    script.textContent=script.textContent.replace(/^\s*process\(data\);/gm,'if (/^\\s*(?:\\(\\s*\\(\\s*\\)\\s*=>|\\(function|!function|var |let |const )/.test(xhr.response)) { const decodedScript=document.createElement("script"); decodedScript.textContent=xhr.response; document.body.appendChild(decodedScript); } else process(data);');
    if(script.textContent.includes('process(data)')&&script.textContent.includes('xhr.response'))script.textContent=script.textContent.replace(/\binit\(\)/g,'window.__archiveInitializeDecoder(init,xhr.response)');
    // Imported collections may already contain the decoded game bundle. Running
    // that JavaScript through the historical decoder again corrupts its bytes.
    script.textContent=script.textContent.replace(/import\(('\.\/js\/wasm_loader\.js(?:\?[^']*)?')\)/g,'window.__archiveImportDecoder(new URL($1,document.baseURI).href)');
    script.textContent=script.textContent.replace(/\.then\(\s*\(\s*\{([^{}]{1,300})\}\s*\)\s*=>\s*\{/g,(declaration,names)=>/\binit\b/.test(names)&&/\bprocess\b/.test(names)?`.then((archiveDecoder)=>{const {${names}}=archiveDecoder;for(const name of ["verify","validate","get_yaw_pitch","reset_yaw_pitch","set_mouse_params","poll_gamepad"])if(typeof archiveDecoder[name]==="function")window[name]=archiveDecoder[name];`:declaration);
    script.textContent=script.textContent.replace(/(const\s+destroyInhouseAdForPaid\s*=\s*\(\)\s*=>\s*\{)/g,'$1 return;');
    script.textContent=script.textContent.replace(/return\s+(['"])img\/promo\/\{0\}\{1\}\1\.format\(\s*this\.useAd\.id\s*,\s*this\.useAd\.imageExt\s*\)/g,'return this.useAd?.id!=null&&this.useAd?.imageExt!=null?"img/promo/{0}{1}".format(this.useAd.id,this.useAd.imageExt):undefined');
    script.textContent=script.textContent.replace(/return\s+(['"])img\/promo\/\1\s*\+\s*item\.id\s*\+\s*item\.imageExt/g,'return item?.id!=null&&item?.imageExt!=null?"img/promo/"+item.id+item.imageExt:undefined');
    script.textContent=script.textContent.replace(/const isShellIframe\s*=\s*\(\)\s*=>\s*window\.self\s*===\s*window\.top\s*;/g,'const isShellIframe = () => true;');
    if(script.textContent.includes('settings.controls.game')&&!script.textContent.includes('settings.controls.keyboard'))script.textContent=script.textContent.replace(/(setSettings:\s*function\s*\(settings\)\s*\{)/g,'$1 if(settings.controls?.keyboard&&!settings.controls.game)settings={...settings,controls:settings.controls.keyboard};');
    if(script.textContent.includes('settings.controls.keyboard.game'))script.textContent=script.textContent.replace(/(setSettings:\s*function\s*\(settings\)\s*\{)/g,'$1 if(settings.controls?.game&&!settings.controls.keyboard){const gamepad=Object.fromEntries(Object.entries(this.settingsUi.controls.gamepad||{}).map(([mode,items])=>[mode,Object.fromEntries(items.map(item=>[item.id,item.value]))]));settings={...settings,controls:{keyboard:settings.controls,gamepad}};}');
  }
  const base=doc.createElement('base');base.href=root;doc.head.prepend(base);
  const laterCustomizer=version==='0.12.4'&&files.some(file=>/shellshock(?:\.min)?\.js$/.test(file.path)&&/^0\.12\.4_2018-06-/.test(file.source));
  if(['0.8.1','0.9.1','0.9.2'].includes(version)||laterCustomizer){
    // Supply only controls needed by the selected runtime. Early global clients
    // create their own canvas; inserting one for them duplicates the preview.
    const holder=doc.createElement('div');holder.hidden=true;holder.dataset.previewCompatibility='recovered customizer DOM';
    const missing=['currentBalanceContainer','currentBalance','leaderboard','menuAdContainer','bannerAdContainer','inGameAdContainer','redeemCodeButton','aipBanner','aipGameContainer','aipMenuContainer','bigAd','bigAdImg','blueTeam','bugDescription','bugEmail','bugReport','chatIn','classSelector','consent','customizeButton','customizerBackButton','customizerClassSelectorContainer','deathBox','doConsent','dontConsent','gameCustomizeButton','grenadeThrow','grenadeThrowContainer','hatSelectorButton','itemPageCount','itemPageLeft','itemPageRight','itemSelectorHeader','killTicker','login','logout','mainMenuClassSelectorContainer','noHatImg','noItemImg','noStampImg','notification','notificationMessage','playButton','playerStatValues','playerStats','preroll','privacyOptions','privacyOptionsLink','profilePic','redTeam','respawnButton','respawnMessage','scopeBorder','serverItem','serverName','shellshock-io_300x250','spawnBox','stampSelectorButton','statsMessage','switchTeamButton','targetedAdsText'];
    for(const id of missing)if(!doc.getElementById(id)){const el=doc.createElement('div');el.id=id;holder.append(el);}
    for(const id of ['autoDetail','enableChat','highRes','holdToAim','ofAgeCheck','shadowsEnabled','enableShadows','targetedAdsCheck'])if(!doc.getElementById(id)){const el=doc.createElement('input');el.type='checkbox';el.id=id;holder.append(el);}
    for(const id of ['gameTypeSelect','mapSelect'])if(!doc.getElementById(id)){const select=doc.createElement('select');select.id=id;holder.append(select);}
    for(const id of ['teamSummary','teamRow'])if(!doc.getElementById(id)){const el=doc.createElement('div');el.id=id;for(let n=0;n<4;n++)el.append(doc.createElement('span'));holder.append(el);}
    for(const id of ['primarySelectorButton','secondarySelectorButton'])if(!doc.getElementById(id)){const el=doc.createElement('canvas');el.width=256;el.height=256;el.id=id;holder.append(el);}
    for(let n=0;n<24;n++)if(!doc.getElementById('item'+n)){const el=doc.createElement('canvas');el.width=256;el.height=256;el.id='item'+n;holder.append(el);}
    for(let n=0;n<32;n++)if(!doc.getElementById('color'+n)){const el=doc.createElement('div');el.id='color'+n;holder.append(el);}
    if(runtimeVersion!=='0.9.0'&&!doc.getElementById('canvas')){const canvas=doc.createElement('canvas');canvas.id='canvas';canvas.style.cssText='width:100%;height:100%;display:block';const character=doc.getElementById('characterCanvasContainer');character.style.height='12em';character.prepend(canvas);}
    doc.body.prepend(holder);
  }
  if(/^0\.7\./.test(version)){
    // Match the frame to the recovered script's canvas ratio (height = 0.66 * width).
    const style=doc.createElement('style');
    style.textContent='#mainMenu[style*="display: flex"]{display:block!important}#characterCanvasContainer{height:auto!important;aspect-ratio:100/66}#characterCanvasContainer>canvas{display:block;width:100%;height:auto;border-radius:inherit}';
    doc.head.append(style);
    // The recovered 0.7 HTML predates the DOM names used by its recovered JS.
    const aliases={game:'GAME',mainMenu:'TITLE',overlay:'OVERLAY',alert:'ALERT',alertHeader:'ALERT_HEADER',alertMessage:'ALERT_MESSAGE',alertFooter:'ALERT_FOOTER',className:'CLASS_NAME',classWeapon:'CLASS_INFO',playButton:'PLAY_BUTTON',healthBar:'HEALTH_BAR',chatOut:'CHAT_BOX'};
    for(const [name,original] of Object.entries(aliases)){const el=doc.getElementById(original);if(el)el.id=name;}
    // Keep original CSS selectors pointing at the corresponding renamed elements.
    for(const style of doc.querySelectorAll('style'))for(const [name,original] of Object.entries(aliases))style.textContent=style.textContent.replaceAll('#'+original,'#'+name);
    const holder=doc.createElement('div');holder.hidden=true;holder.dataset.previewCompatibility='legacy DOM';
    const hidden=['aipBanner','aipGameContainer','aipMenuContainer','bigAd','bigAdImg','blueTeam','bugDescription','bugEmail','bugReport','chatIn','clickBlocker','fbLogin','fbLoginRequest','friendCode','friendsButton','grenadeThrow','grenadeThrowContainer','inviteFriends','joinCode','joinGame','killTicker','notification','notificationMessage','playwireContainer','playwireModal','preroll','redTeam','respawnButton','respawnMessage','scopeBorder','statsPane','statsRetrieval','switchTeamButton','damage','accuracy','fireRate','range'];
    for(const id of hidden)if(!doc.getElementById(id)){const el=doc.createElement(['joinCode','chatIn'].includes(id)?'input':'div');el.id=id;holder.append(el);}
    for(const id of ['autoDetail','enableChat','highRes','holdToAim','shadowsEnabled'])if(!doc.getElementById(id)){const el=doc.createElement('input');el.type='checkbox';el.id=id;holder.append(el);}
    doc.body.prepend(holder);
  }
  if(hasClassicAdapter(version))for(const id of ['aipBanner','aipMenuContainer','aipGameContainer','menuAdContainer','gameAdContainer','scopeBorder','inGameAdContainer','spinner','spinnerHeader','spinnerFooter','cornerButtons','clickBlocker','inGameAd','placeholder_300x250','leaderboard','blueTeam','redTeam','switchTeamButton','friendsButton','inviteFriends'])if(!doc.getElementById(id)){const el=doc.createElement('div');el.id=id;el.hidden=true;doc.body.append(el);}
  // Some retained HTML still uses the older HUD while its recovered script
  // expects the unified game menu. Reuse the original controls and layout.
  if(hasClassicAdapter(version)&&doc.getElementById('spawnBox')&&!doc.getElementById('goButton')){
    const button=doc.querySelector('#spawnBox button');
    if(button){button.id='goButton';const label=button.querySelector('h2')||button.appendChild(doc.createElement('span'));label.id='goButtonLabel';}
    for(const id of ['gameClock','gameSummary','ffaFinal','teamFinal'])if(!doc.getElementById(id)){const el=doc.createElement('div');el.id=id;el.hidden=true;doc.body.append(el);}
  }
  if(version==='0.7.1'){
    const grenades=doc.createElement('div');grenades.style.cssText='position:absolute;right:24px;bottom:120px';
    for(let n=1;n<=3;n++)if(!doc.getElementById('grenade'+n)){const img=doc.createElement('img');img.id='grenade'+n;img.style.cssText='width:24px;height:24px;margin-left:4px';grenades.append(img);}
    doc.getElementById('game').append(grenades);
  }
  if(hasClassicAdapter(version)&&!doc.getElementById('mapSelect')){const select=doc.createElement('select');select.id='mapSelect';select.hidden=true;doc.body.append(select);}
  if(hasClassicAdapter(version)&&doc.getElementById('customGame')&&!doc.getElementById('createGame')){const el=doc.createElement('div');el.id='createGame';el.hidden=true;el.style.display='none';el.dataset.previewLegacyCreate='true';doc.body.append(el);}
  if(hasClassicAdapter(version)&&!doc.getElementById('bannerAdContainer')){const el=doc.createElement('div');el.id='bannerAdContainer';el.hidden=true;el.append(doc.createElement('div'));doc.body.append(el);}
  if(hasClassicAdapter(version)&&doc.getElementById('color0'))for(let n=0;n<32;n++)if(!doc.getElementById('color'+n)){const el=doc.createElement('div');el.id='color'+n;el.hidden=true;doc.body.append(el);}
  if(hasClassicAdapter(version))for(const id of ['teamSummary','teamRow'])if(!doc.getElementById(id)){const el=doc.createElement('div');el.id=id;el.hidden=true;for(let n=0;n<4;n++)el.append(doc.createElement('span'));doc.body.append(el);}
  const boot=doc.createElement('script');boot.src=root+'_preview/bootstrap.js';boot.dataset.root=root;boot.dataset.version=runtimeVersion;boot.dataset.localGame='true';doc.head.insertBefore(boot,base.nextSibling);
  const offline=doc.createElement('script');offline.src=root+'_preview/'+(runtimeVersion==='0.7.1'?'offline-0.7.js':'offline-game.js');offline.dataset.version=runtimeVersion;boot.after(offline);
  const nativeOffline=doc.createElement('script');nativeOffline.src=root+'_preview/offline-native.js';offline.after(nativeOffline);
  return '<!doctype html>\n'+doc.documentElement.outerHTML;
}

export function patchScript(text,{version,path,files=[]}){
  const patches=[];
  if(/(?:^|\/)wasm_loader\.js$/.test(path)){
    text=text.replace(/^<<<<<<<[^\r\n]*\r?\n([\s\S]*?)^=======\r?\n([\s\S]*?)^>>>>>>>[^\r\n]*\r?\n/gm,'$2');
    text=text.replace(/new Function\((getStringFromWasm\d+\([^)]*\))\)/g,'window.__archiveDecodedFunction($1)');
  }
  if(!files.some(file=>file.path==='draco/draco_decoder.js')&&text.includes('draco/draco_decoder.js')){
    text=text.replaceAll('draco/draco_decoder.js','js/draco_decoder.js').replaceAll('draco/draco_decoder.wasm','js/draco_decoder.wasm');
    patches.push('use retained Draco decoder pair for missing decoder wrapper');
  }
  text=text.replace(/https:\/\/cdn\.babylonjs\.com\/draco_wasm_wrapper_gltf\.js/g,'js/draco_decoder.js').replace(/https:\/\/cdn\.babylonjs\.com\/draco_decoder_gltf\.wasm/g,'js/draco_decoder.wasm');
  text=text.replace(/`\$\{[\w$]+\._DefaultCdnUrl\}\/draco_wasm_wrapper_gltf\.js`/g,'"js/draco_decoder.js"').replace(/`\$\{[\w$]+\._DefaultCdnUrl\}\/draco_decoder_gltf\.wasm`/g,'"js/draco_decoder.wasm"');
  if(hasClassicAdapter(version)&&/(?:shellshock[^/]*|ss\.[a-f0-9]+)\.js$/.test(path)){
    // Pointer-lock exit schedules a pause packet. Leaving the game can close
    // its socket before that native timer runs.
    text=text.replace(/(\.prototype\.send\s*=\s*function\s*\(\s*([\w$]+)\s*\)\s*\{)(?=\s*\2\.send\()/g,'$1if(!$2||$2.readyState>1)return;');
    text=text.replace(/(\.prototype\.send\s*=\s*function\s*\(\s*([\w$]+)\s*\)\s*\{)(?=\s*var\s+[\w$]+\s*=\s*new Uint8Array\(this\.arrayBuffer,\s*0,\s*this\.idx\))/g,'$1if(!$2||$2.readyState>1)return;');
    text=text.replace(/(\bsend\(\s*([\w$]+)\s*\)\s*\{)(?=\s*var\s+[\w$]+\s*=\s*new Uint8Array\(this\.arrayBuffer,\s*0,\s*this\.idx\))/g,'$1if(!$2||$2.readyState>1)return;');
    const asyncNamedSignIn=/async function signIn\s*\(/.test(text)||/function signIn\s*\([^)]*\)\s*\{\s*return new Promise/.test(text);
    text=text.replace(/(function initAnimation\([^)]*\)\{let ([\w$]+)=[^;{}]+\.getAnimationByName\([^)]*\);)/g,'$1if(!$2)return;');
    text=text.replace(/(function renderItemToCanvas\(\s*([\w$]+)\s*,\s*([\w$]+)\s*,[^)]*\)\{)\2\|\|([\w$]+)\.clearCanvas\(\3\),/g,'$1if(!$2)return $4.clearCanvas($3);');
    const nativeConfiguration=nativeOfflineBindings(text);
    const renamedAdapterSource=renamedGameBindings(text)||nativeConfiguration?.source||'';
    const nativeOffline=renamedAdapterSource.includes('__archiveNativeGameAdapterSource');
    const renamedAdapter=renamedAdapterSource?'/*__ARCHIVE_GAME_BINDINGS__*/':'';
    text=text.replace(/(function [\w$]+\([^)]*\)\{)(?=const [\w$]+=document\.getElementById\("chw-home"\))/g,'$1if(!document.getElementById("chw-home")||!document.getElementById("chw-game-screen")||!document.getElementById("chw-home-timer"))return;');
    text=text.replace(/\baBNoobInventory\.(tryTest|analytics|tryReward|setTestClosed)\(\)/g,'(typeof aBNoobInventory!=="undefined"&&aBNoobInventory.$1())');
    text=text.replace(/\baBNoobInventory\.getVariant\(\)/g,'(typeof aBNoobInventory!=="undefined"?aBNoobInventory.getVariant():0)');
    text=text.replace(/vueApp\.((?:show|hide)WelcomeBundleCtaInGame)\(/g,'vueApp.$1?.(');
    text=text.replace(/vueApp\.(assetLoaded|assetSetup|progressBarReset|progressBarUpdate)\(/g,'vueApp.$1?.(');
    // A borrowed script can include a newer streak indicator than the retained
    // HTML. Keep the native HUD and skip only indicators absent from it.
    text=text.replace(/(([\w$]+\[[\w$]+\])=document\.getElementById\([\w$]+\)),\2\.style\.display="none"/g,'$1,$2&&($2.style.display="none")');
    text=text.replace(/document\.getElementById\(([\w$]+)\)\.style\.display="none"/g,'(document.getElementById($1)||{style:{}}).style.display="none"');
    text=text.replace(/document\.getElementById\("(chw-game-screen|serverAndMapInfo)"\)\.style/g,'(document.getElementById("$1")||{style:{}}).style');
    text=text.replace(/for\(let ([\w$]+)=0;\1<([\w$]+)\.grenades\.length;\1\+\+\)\{let ([\w$]+)=\2\.grenades\[\1\]\.item_data\.meshName;([\w$]+)\.getMeshByName\(\3\)\.material=/g,(loop,index,catalog,name,scene)=>`window.__archivePreview.prepareGrenadeMeshes(${scene},${catalog}.grenades);${loop}`);
    text=text.replace(/(function\s+[\w$]+\([^)]*\)\{)(?=[\w$]+\.init\(\),\([\w$]+=\{width:([\w$]+)\.width)/g,(declaration,_,definition,offset)=>{
      const body=text.slice(offset,offset+1300),library=body.match(/for\(var [\w$]+=\{\},[\w$]+=1;[\w$]+<([\w$]+)\.length/)?.[1];
      return declaration+(library?`window.__archivePreview.prepareMapDefinition(${definition},${library});`:'');
    });
    if(text.includes('meshIndex[meshName]'))text=text.replace(/(function buildMapData\s*\([^)]*\)\s*\{)/,'$1window.__archivePreview.prepareMapDefinition(minMap,mapMeshes);');
    text=text.replace(/(function onLoadingComplete\s*\(\s*\)\s*\{)/,'$1if(typeof gameScene!=="undefined"&&typeof catalog!=="undefined"&&catalog.grenades)window.__archivePreview.prepareGrenadeMeshes(gameScene,catalog.grenades);');
    text=text.replace(/window\[atob\(['"]dmVyaWZ5['"]\)\]\(\)/g,()=>{patches.push('skip original script checksum after verified runtime rewriting');return 'void 0';});
    text=text.replace(/console\.log\((["'])After Game Ready\1\)/g,()=>`(()=>{${renamedAdapter}console.log("After Game Ready");window.__archivePreview.ready();})()`);
    // Missing baked lighting is optional; a 404 response must never become
    // vertex colors (the response body contains text, not lightmap bytes).
    text=text.replace(/(async function [\w$]+\([^)]*\)\{)for\(var ([\w$]+)=await fetch\(([\w$]+)\),/g,'$1var archiveLightmapResponse=await fetch($3);if(!archiveLightmapResponse.ok&&/\\.lightmap(?:\\?|$)/.test($3))return null;for(var $2=archiveLightmapResponse,');
    text=text.replace(/(async function fetchLightmap\s*\([^)]*\)\s*\{\s*var response\s*=\s*await fetch\([^)]*\);)/,'$1if(!response.ok)return null;');
    text=text.replace(/if\s*\(\s*([\w$]+)\s*\)\s*\{\s*(for\s*\(\s*var\s+[\w$]+\s*=\s*([\w$]+)\.getVerticesData\([\w$]+\.VertexBuffer\.ColorKind\))/g,(_,data,loop,mesh)=>{
      patches.push('skip baked lighting when map geometry differs');
      return `if(window.__archivePreview.validateLightmap(${data},${mesh})){${loop}`;
    });
    text=text.replace(/\|\|["']undefined["']==typeof firebase/g,'');
    text=text.replace(/\|\|\s*typeof firebase\s*===?\s*['"]undefined['"]/g,'');
    text=text.replace(/\bdocument\.referrer\b/g,'(document.referrer||"https://shellshock.io/")');
    text=text.replace(/getStoredString\(\s*["']lastVersionPlayed["']\s*,\s*([\w$]+)\s*\)/g,(_,release)=>{patches.push('avoid cache-reset reload loop for mismatched recovered script versions');return `(localStorage.setItem("lastVersionPlayed",${release}),${release})`;});
    const catalogName=text.match(/([\w$]+)\.forClass\[[^\]]+\]\.primaryWeapons\[0\]/)?.[1]||'catalog';
    const alignmentAt=text.indexOf('calculateItemAlignments');
    if(alignmentAt>=0){const end=alignmentAt+6000,chunk=text.slice(alignmentAt,end);text=text.slice(0,alignmentAt)+chunk.replace(/([\w$]+\.getVerticesData\([\w$]+\.VertexBuffer\.PositionKind\))/g,'($1||[])')+text.slice(end);}
    text=text.replace(/(BABYLON\.Scene\.prototype\.cloneMesh\s*=\s*function\s*\(\s*([\w$]+)\s*,\s*([\w$]+)\s*\)\s*\{)\s*return this\.getMeshByName\(\2\)\.clone\((['"])\4,\3\)/g,(match,declaration,name,parent)=>{
      patches.push('bridge retained weapon mesh names');
      return declaration+`var mesh=this.getMeshByName(${name})||this.getMeshByName("gun_"+${name})||this.getMeshByName("old."+${name});if(!mesh)throw new Error("Missing model mesh: "+${name});return mesh.clone("",${parent})`;
    });
    if(/^0\.(13|14)\./.test(version)&&text.includes('BABYLON.Scene.prototype.cloneMesh')){
      text=text.replace(/BABYLON\.Scene\.prototype\.cloneMesh\s*=/,declaration=>'(function(){var find=BABYLON.Scene.prototype.getMeshByName;BABYLON.Scene.prototype.getMeshByName=function(name){return find.call(this,name)||find.call(this,"gun_"+name)||find.call(this,"hat_"+name)||find.call(this,"old."+name);};})(),'+declaration);
      patches.push('resolve legacy item names against retained model prefixes');
    }
    text=text.replace(/function\s*(?:[\w$]+)?\s*\(\s*\)\s*\{\s*(?=this\.loggedOut\s*=)/,declaration=>declaration+`window.__archivePreview.bindAccount({account:()=>this,catalog:()=>${catalogName},setBalance:value=>{this.currentBalance=value;if(typeof updateCurrentBalance==="function")updateCurrentBalance();}});`);
    const legacyOwnership=text.includes('function updateOwnedItems');
    const legacyBind=`window.__archivePreview.bindAccount({legacyLogin:()=>{if(typeof dbId!=="undefined")dbId="archive-preview";${legacyOwnership?'playerStatsAndItems=playerStatsAndItems||{owned_item_ids:[],current_balance:0};':''}},setBalance:value=>{if(typeof playerStatsAndItems!=="undefined"&&playerStatsAndItems){playerStatsAndItems.current_balance=value;if(typeof updateCurrentBalance==="function")updateCurrentBalance();}},legacyUnlock:items=>{${legacyOwnership?'playerStatsAndItems.owned_item_ids=items.map(item=>item.id);updateOwnedItems();':''}},legacyOwns:items=>${legacyOwnership?'items.every(item=>ownedItems.includes(item))':'true'},legacyItems:()=>[typeof Hats!=="undefined"?Hats:[],typeof Stamps!=="undefined"?Stamps:[],typeof Weapons!=="undefined"?Weapons:[]]});`;

    if(nativeOffline){
      const respawnName=text.match(/[,{}]respawn:([\w$]+)[,}]/)?.[1];
      if(respawnName)text=text.replace(new RegExp('(function '+regexLiteral(respawnName)+'\\(\\)\\{)'),'$1if(window.__archiveLocalGame?.respawn){window.__archiveLocalGame.respawn();return;}');
      const loadingAt=text.indexOf('function '+nativeConfiguration.loadingName+'(');
      if(loadingAt>=0){
        const end=loadingAt+6500;
        const constructorAt=text.search(/function [\w$]+\([\w$]+,[\w$]+\)\{this\.id=[\w$]+\.[\w$]+,this\./),constructor=text.slice(constructorAt,constructorAt+5000);
        const playerFields=Object.fromEntries([...constructor.matchAll(/this\.(grenadeItem|meleeItem|gameData)=\w+\.([\w$]+)/g)].map(match=>[match[1],match[2]]));
        let body=text.slice(loadingAt,end).replace(/catch\(([\w$]+)\)\{console\.log\(\1\)\}/g,'catch($1){window.__archiveLocalGame?.fail?.($1);window.__archivePreview.error($1.stack||$1.message);console.log($1)}');
        if(nativeConfiguration.readable){
          body=body.replace(/metaGameUI\s*=\s*\{[\s\S]*?var playerData\s*=/,'var playerData =');
          body=body.replace(/addPlayer\(playerData\);/,'playerData.grenadeItem_=G.playerAccount.grenadeItem;playerData.meleeItem_=G.playerAccount.meleeItem;playerData.gameData_={mapIdx,private:isPrivateGame,gameType};addPlayer(playerData);');
        }
        body=body.replace(/[\w$]+=0,[\w$]+=\{update:\(\)=>\{\},render:\(\)=>\{\}\},[\w$]+=\{update:\(\)=>\{\}\};/,nativeConfiguration.meId+'=0;');
        body=body.replace(new RegExp('([\\w$]+)\\(([\\w$]+)\\),'+regexLiteral(nativeConfiguration.players)+'\\['+regexLiteral(nativeConfiguration.meId)+'\\]'),(match,add,player)=>Object.entries(playerFields).map(([name,key])=>`${player}.${key}=${name==='gameData'?`{mapIdx:${nativeConfiguration.aliases.mapIdx},private:${nativeConfiguration.aliases.isPrivateGame},gameType:${nativeConfiguration.aliases.gameType}}`:`${nativeConfiguration.aliases.G}.playerAccount.${name}`},`).join('')+match);
        text=text.slice(0,loadingAt)+body+text.slice(end);
      }
      const playName=text.match(/[,{}]play:([\w$]+)[,}]/)?.[1];
      if(playName)text=text.replace(new RegExp('(function '+regexLiteral(playName)+'\\(\\s*([\\w$]+)\\s*\\)\\{)'),'$1if(window.__archiveLocalGame?.start){window.__archiveLocalGame.start($2);return;}');
      text=text.replace(/((?:async )?function playAfterVideoAd\(\s*([\w$]+)\s*\)\s*\{)/,'$1if(window.__archiveLocalGame?.start)return window.__archiveLocalGame.start($2);');
      text=text.replace(/(function play\(\s*([\w$]+)\s*\)\s*\{)/,'$1if(window.__archiveLocalGame?.start){window.__archiveLocalGame.start($2);return;}');
    }
    const replace=(from,to,label)=>{if(text.includes(from)){text=text.replace(from,to);patches.push(label);}};
    const prepend=(name,body,label)=>{
      const pattern=new RegExp('function\\s+'+name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\s*\\(([^)]*)\\)\\s*\\{');
      text=text.replace(pattern,(declaration,args)=>{patches.push(label);return declaration+body(args.split(',').map(a=>a.trim()));});
    };
    if(/getElementById\(["']createGame["']\)\.style\.display/.test(text))prepend('play',()=>`var legacyCreateBox=document.getElementById("createGame");if(legacyCreateBox?.dataset.previewLegacyCreate)legacyCreateBox.style.display=arguments[0]?"block":"none";`,'preserve older private Play button with recovered menu state');
    if(/function\s+play\s*\([^)]*\)\s*\{[^{}]{0,250}createPrivateGame\s*=/.test(text)&&!text.includes('function waitForSetupAndAuthComplete'))prepend('play',args=>`createPrivateGame=${args[0]};login();return;`,'continue classic Play without a live preroll callback');
    prepend('updateLogic',()=>`if(!inGame||(!ws&&!playOffline))return;`,'stop game updates after leaving the local socket');
    const reportPingReady=!/function (?:onResourcesLoaded|afterGameReady)\s*\(/.test(text);
    prepend('pingServers',args=>`${renamedAdapter}if(${args[1]}){${args[1]}();${reportPingReady?'window.__archivePreview.ready();':''}}return;`,'skip live server discovery');
    text=text.replace(/(function\s+[\w$]+\s*\([^)]*\)\s*\{)\s*(?=console\.log\(["']Pinging regions["']\))/, (declaration,_,offset)=>{
      const regionBody=text.slice(offset,offset+2500);
      const flag=regionBody.match(/\),([\w$]+)=!0,[\w$]+\.ping</)?.[1]||regionBody.match(/([\w$]+)\s*=\s*true\s*;\s*if\s*\([^)]*\.ping/)?.[1];
      return declaration+`${flag?flag+'=true;':''}vueApp.currentRegionId="eu";return;`;
    });
    prepend('fetchHouseAds',()=>`houseAds={big:[],small:[],houseAdPercentChance:0};houseAdsLoaded=true;return;`,'empty offline promotions');
    for(const name of ['fetchTwitchStreams','loadBannerAd','hideBannerAd','hideMultisizeBannerAd','hideBannerAdInContainer','showBannerAd','preLoadHouseBannerAd','showBigAd','openConsentNotification','initAdInPlay','ascPlayerInit'])prepend(name,()=>`return;`,'skip '+name);
    for(const name of ['swiftShaderCheck','tryShowBigAd'])prepend(name,()=>`return false;`,'skip '+name);
    if(text.includes('SceneOptimizer._CheckCurrentState'))prepend('enableAutoDetail',()=>`if(typeof BABYLON.SceneOptimizer._CheckCurrentState!=="function")return;`,'skip incompatible legacy scene optimizer');
    // Authentication setup is distinct from the game's Play/connection entry.
    if(text.includes('function waitForSetupAndAuthComplete'))prepend('login',()=>`playerAccount=new PlayerAccount();playerAccount.loggedOut();customizer=new Customizer();extern.customizer=customizer;authAttemptComplete=true;loginFail();return;`,'initialize offline authentication');
    else prepend('login',()=>`var previewUsername=document.getElementById("username");if(previewUsername&&!previewUsername.value.trim())previewUsername.value="Archive Player";`,'enable local packet server');
    prepend('onLoadingComplete',()=>`if(typeof Meshes!=="undefined"&&typeof scene!=="undefined")window.__archivePreview.prepareMeshes(Meshes,scene);`,'adapt recovered models for the game scene');
    prepend('buildMapMesh',()=>`window.__archiveLocalGame?.prepareMapMeshes(typeof MapMeshes!=="undefined"?MapMeshes:typeof Meshes!=="undefined"?Meshes.map:null);`,'adapt map mesh coordinates and retained style variants');
    text=text.replace(/new BABYLON\.Engine\(\s*(canvas|this\.canvas)\s*,\s*(?:!0|true)\s*,\s*null\s*,\s*(?:!1|false)\s*\)/g,(_,canvas)=>{patches.push('use compatible WebGL 1 shaders');return `new BABYLON.Engine(${canvas},true,{disableWebGL2Support:true},false)`;});
    if(text.includes('function waitForSetupAndAuthComplete'))text=text.replace(/if\s*\(\s*firebase\s*\)\s*login\(loggedIn,\s*loginFail\);/,'login(loggedIn,loginFail);');
    const prepare=!text.includes('function Customizer')&&(/^0\.(7|11|12)\./.test(version)||version==='0.9.0'||/\bMeshes\.gripHand\b/.test(text))?'window.__archivePreview.prepareMeshes(Meshes,scene);':'';
    text=text.replace(/function onResourcesLoaded\s*\(\s*\)\s*\{/,(declaration)=>{
      patches.push('report completed homescreen startup');
      return `function onResourcesLoaded(){try{${nativeOffline?renamedAdapter:'if(window.__archiveGameAdapterSource&&!window.__archiveGameEvaluate&&(typeof Comm!=="undefined"||typeof CommIn!=="undefined"))eval(window.__archiveGameAdapterSource);'}${prepare}${text.includes("this.loggedOut")?"":legacyBind}var result=archiveOriginalResourcesLoaded.apply(this,arguments);window.__archivePreview.ready();return result;}catch(error){window.__archivePreview.error(error.stack||error.message);throw error;}}function archiveOriginalResourcesLoaded(){`;
    });
    if(!asyncNamedSignIn&&(/^0\.(23|24|25)\./.test(version)||/function signIn\s*\(/.test(text))){
      text=text.replace(/\bascPlayerInit\s*=\s*function\s*\([^)]*\)\s*\{/g,declaration=>{patches.push('skip optional video-ad player');return declaration+'return;';});
      const signInAt=text.search(/function signIn\s*\(/),accountName=text.slice(signInAt,signInAt+600).match(/([\w$]+\.playerAccount)\s*=\s*new\s+PlayerAccount/)?.[1]||'playerAccount';
      prepend('signIn',()=>`${accountName}=new PlayerAccount();${accountName}.loggedOut();if(${accountName}.firebaseId==null)${accountName}.firebaseId="";ready_auth=true;vueApp.authCompleted();return;`,'use default signed-out client state without live authentication');
      text=text.replace(/function afterGameReady\s*\(\s*\)\s*\{/,`function afterGameReady(){${nativeOffline?renamedAdapter:'if(window.__archiveGameAdapterSource&&!window.__archiveGameEvaluate&&(typeof Comm!=="undefined"||typeof CommIn!=="undefined"))eval(window.__archiveGameAdapterSource);'}var result=archiveAfterGameReady.apply(this,arguments);window.__archivePreview.ready();return result;}function archiveAfterGameReady(){`);
    }
    text=text.replace(/vueApp\.(?:showTitleScreenAd|hideTitleScreenAd|showLoadingScreenAd|hideLoadingScreenAd|showGameOverAd|hideGameOverAd|musicVolumeControl|showGdprNotification)\s*\([^)]*\)/g,'void 0');
    // These clients accidentally return before requesting respawn when the
    // account hides ads. A local spoof account must still reach native respawn.
    text=text.replace(/if\(([\w$]+)\)return ([\w$]+)\(\);if\(!0===([\w$]+)\.hideAds\)return!1/g,(_,flag,respawn,account)=>`if(${flag})return ${respawn}();if(!0===${account}.hideAds)return ${respawn}()`);
    text=text.replace(/vueApp\.shellShockUrlParamaterEvents\s*\(/g,'vueApp.shellShockUrlParamaterEvents?.(');
    text=text.replace(/\b([\w$]+)\.doTests\(([\w$]+)\)/g,(_,runner,variants)=>{
      patches.push('use native default experiment branch when the live test runner is unavailable');
      return `(typeof ${runner}?.doTests==="function"?${runner}.doTests(${variants}):${variants}.current?.[0]?.())`;
    });
    text=text.replace(/\b(vueApp|vueData)\.googleAnalytics\./g,'($1.googleAnalytics||={cat:{},action:{}}).');
    const videoMarker=text.indexOf('videojs(');
    if(videoMarker>=0){
      const assignments=[...text.slice(0,videoMarker).matchAll(/\b([\w$]+)\s*=\s*function\s*\([^)]*\)\s*\{/g)];
      const assignment=assignments.at(-1);
      if(assignment){const at=assignment.index+assignment[0].length;text=text.slice(0,at)+'return;'+text.slice(at);patches.push('skip renamed optional video-ad initializer');}
    }
    const readyName=text.match(/get isGameReady\s*\(\)\s*\{\s*return ([\w$]+)\(/)?.[1];
    if(readyName){
      const predicate=text.match(new RegExp('function\\s+'+readyName+'\\s*\\(\\s*\\)\\s*\\{\\s*return\\s+([^;}]+)'))?.[1];
      if(predicate){const flags=[...new Set(predicate.match(/\b[A-Za-z_$][\w$]*\b/g))].filter(name=>!['hasValue','vueApp','ready','true','false'].includes(name));
        prepend(readyName,()=>`window.__archivePreview.inspectStartup({vueReady:vueApp&&vueApp.ready,${flags.map(name=>`${name}:typeof ${name}!=="undefined"?!!${name}:null`).join(',')}});`,'inspect real startup prerequisites');
      }
    }
    // Later bundles rename local functions, but retain stable startup operations.
    if(!text.includes('function signIn')||asyncNamedSignIn){
      const offline=asyncNamedSignIn?null:text.match(/([\w$]+(?:\.playerAccount)?)\s*=\s*new\s+([\w$]+)(?:\(\))?\s*,\s*([\w$]+)\s*=\s*!0\)/);
      const asyncAccount=text.match(/firebase\.initializeApp\([\w$]+\),\s*(?:new Date,)?([\w$]+\.playerAccount)\s*=\s*new\s+[\w$]+/);
      const accountCreation=asyncAccount?asyncAccount.index+asyncAccount[0].indexOf(asyncAccount[1]):text.search(/new Date,[\w$]+(?:\.playerAccount)?=new [\w$]+/);
      const marker=accountCreation>=0?accountCreation:text.indexOf('firebase.initializeApp(');
      if(offline&&marker>=0){
        const declarations=[...text.slice(0,marker).matchAll(/function\s+([\w$]+)\s*\([^)]*\)\s*\{/g)];
        const auth=declarations.at(-1)?.[1];
        if(auth)prepend(auth,()=>`${offline[1]}=new ${offline[2]}();${offline[1]}.loggedOut();if(${offline[1]}.firebaseId==null)${offline[1]}.firebaseId="";${offline[3]}=true;vueApp.authCompleted();return;`,'initialize offline account without live authentication');
      }
      if(asyncNamedSignIn){
        const start=text.search(/(?:async )?function signIn\s*\(/),assignment=text.slice(start,start+2500).match(/([\w$]+(?:\.playerAccount)?)\s*=\s*new\s+(PlayerAccount)\b/);
        if(assignment)prepend('signIn',()=>`${assignment[1]}=new ${assignment[2]}();ready_auth=true;return Promise.resolve(true);`,'initialize named async offline account without live authentication');
      }else if(!offline&&accountCreation>=0){
        const assignment=text.slice(accountCreation).match(/^(?:new Date,)?([\w$]+\.playerAccount)\s*=\s*new\s+([\w$]+)/);
        const declaration=[...text.slice(0,accountCreation).matchAll(/(?:async )?function\s+([\w$]+)\s*\(\s*\)\s*\{/g)].at(-1);
        const signedOutAt=text.indexOf('No account created yet',accountCreation);
        const flag=(signedOutAt>=0?text.slice(signedOutAt,signedOutAt+300).match(/([\w$]+)=!0/)?.[1]:null)||text.slice(accountCreation,accountCreation+5500).match(/([\w$]+)=!0,[\w$]+=!1,[\w$]+\(\)/)?.[1];
        if(assignment&&declaration&&flag)prepend(declaration[1],()=>`${assignment[1]}=new ${assignment[2]}();${flag}=true;return Promise.resolve(true);`,'initialize async offline account without live authentication');
      }
    }
    text=text.replace(/function\s+([\w$]+)\s*\(([^)]*)\)\s*\{\s*(?=console\.log\(["']Pinging servers["']\))/,(declaration,name,args)=>{
      const callback=args.split(',')[1]?.trim();
      if(!callback)return declaration;
      patches.push('skip renamed live server discovery and report real startup');
      return declaration+`${renamedAdapter}if(${callback}){${callback}();window.__archivePreview.ready();}return;`;
    });
    text=text.replace(/function\s+([\w$]+)\s*\([^)]*\)\s*\{\s*(?=getRequest\(["']twitchStreams\.json)/,declaration=>{patches.push('skip renamed Twitch widget');return declaration+'return;';});
    if(version==='0.9.0')replace('["egg","eggExplode","bullet","muzzleFlash","ammo","reticle","mountains","sky"]','["egg","eggExplode","munitions","muzzleFlash","items","reticle","mountains","sky"]','load bullet/ammo from recovered aggregate models');
    // This actor API uses the guns embedded in egg.babylon. Separately named
    // gun_* payloads in recovered captures can belong to much newer clients.
    if(/^0\.12\./.test(version)&&text.includes('BABYLON.TransformNode.prototype')){
      text='if(!BABYLON.TransformNode){BABYLON.TransformNode=BABYLON.AbstractMesh;BABYLON.AbstractMesh.prototype.getChildTransformNodes=function(){return this.getChildMeshes();};}\n'+text;
      patches.push('bridge transform-node API for retained Babylon build');
    }
    // Insert captured protocol source after all rewrites: rewriting inside its
    // JSON string would corrupt quoting and the game bundle's syntax.
    text=text.replaceAll('/*__ARCHIVE_GAME_BINDINGS__*/',()=>renamedAdapterSource);
  }
  return {text,patches};
}
