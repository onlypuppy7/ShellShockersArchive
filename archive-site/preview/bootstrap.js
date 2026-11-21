(() => {
  'use strict';
  const root=document.currentScript.dataset.root;
  const runtimeVersion=document.currentScript.dataset.version;
  const localGame=document.currentScript.dataset.localGame==='true';
  let lastMissingElement=null;
  const findById=Document.prototype.getElementById;
  Document.prototype.getElementById=function(id){const camel=String(id).toLowerCase().replace(/_([a-z])/g,(_,letter)=>letter.toUpperCase());const aliases={gameMenu:'spawnBox',weaponBox:'WEAPON',teamButton:'switchTeamButton',teamButtonContainer:'switchTeamButton',helpControls:'help'};const element=findById.call(this,id)||findById.call(this,camel)||findById.call(this,String(id).replace(/([a-z0-9])([A-Z])/g,'$1_$2').toUpperCase())||(aliases[id]?findById.call(this,aliases[id]):null)||(id==='health'?findById.call(this,'healthBar')?.parentElement:id==='readouts'?findById.call(this,'FPS')?.parentElement:null)||(id==='gameCustomizeButton'?this.querySelector('button[onclick*="openCustomizerInGame"]'):id==='spawnBox'?findById.call(this,'gameMenu'):id==='respawnButton'?findById.call(this,'goButton')||findById.call(this,'RESPAWN'):id==='health'?findById.call(this,'healthContainer'):id==='healthContainer'?findById.call(this,'health'):id==='homeButton'?this.querySelector('button[onclick*="showMainMenuConfirm"]'):null);if(!element)lastMissingElement=String(id);return element;};
  const send=(type,message)=>parent.postMessage({source:'archive-preview',type,message},location.origin);
  const appendChild=Node.prototype.appendChild;
  Node.prototype.appendChild=function(node){
    if(node?.tagName==='SCRIPT'&&window.__archivePatchDecoded&&node.textContent.includes('onloadingcomplete')&&!node.textContent.includes('window.__archivePreview'))node.textContent=window.__archivePatchDecoded(node.textContent);
    return appendChild.call(this,node);
  };
  window.__archivePatchReady=import(root+'_preview/rewrite.mjs').then(({patchScript})=>{
    window.__archivePatchDecoded=source=>{
      if(!source.includes('lastVersionPlayed')||!source.includes('onloadingcomplete'))return source;
      const patched=patchScript(source,{version:runtimeVersion,path:'js/shellshock.js'});
      send('adapter','Decoded startup patches: '+patched.patches.join(', '));return patched.text;
    };
    window.__archiveDecodedFunction=source=>{
      if(!source.includes('lastVersionPlayed')||!source.includes('onloadingcomplete'))return new Function(source);
      return ()=>{const script=document.createElement('script');script.textContent=window.__archivePatchDecoded(source);document.body.appendChild(script);};
    };
  });
  let accountAdapter=null,spoofLoggedIn=false,allUnlocked=false,startupState=null,spoofBalance=0;
  const unlockedEggs=99999999900;
  function inventoryItems(){
    const items=new Map(),seen=new Set();
    function walk(value){
      if(!value||typeof value!=='object'||seen.has(value)||seen.size>50000)return;
      seen.add(value);
      if((value.id!=null&&('item_type_id' in value||'meshName' in value||'itemType' in value||'item_data' in value))||('price' in value&&('meshName' in value||'class' in value||('x' in value&&'y' in value))))items.set(value.id??value,value);
      for(const key of Object.keys(value))if(typeof value[key]!=='function')walk(value[key]);
    }
    walk(accountAdapter?.catalog?.());walk(accountAdapter?.legacyItems?.());
    return [...items.values()];
  }
  const accountState=()=>send('account-state',{available:!!accountAdapter,loggedIn:spoofLoggedIn,unlocked:allUnlocked,items:allUnlocked?inventoryItems().length:0});
  function settleAccountUI(){
    // Complete the native authentication lifecycle as well as the data stub.
    // Modern inventory screens wait on this callback before rendering items.
    const app=window.vueApp;
    if(typeof app?.authCompleted==='function')app.authCompleted();
    else if(app&&'accountSettled' in app)app.accountSettled=true;
  }
  function prepareOfflineUI(){
    const seen=new Set();
    const visit=component=>{
      if(!component||typeof component!=='object'||seen.has(component)||seen.size>1000)return;
      seen.add(component);
      for(const name of ['hideRespawnDisplayAd','showRespawnDisplayAd','toggleRespawnDisplayAd','hideTitleScreenAd','showTitleScreenAd','hideLoadingScreenAd','showLoadingScreenAd'])if(typeof component[name]==='function')component[name]=()=>{};
      for(const child of component.$children||[])visit(child);
      for(const child of Object.values(component.$refs||{}))if(Array.isArray(child))child.forEach(visit);else visit(child);
    };
    visit(window.vueApp);
  }
  window.addEventListener('message',event=>{
    if(event.source!==parent||event.origin!==location.origin||event.data?.source!=='archive-preview-command'||event.data.action!=='account'||!accountAdapter)return;
    try{
      const account=accountAdapter.account?.();
      if(!spoofLoggedIn){
        if(account){account.firebaseId='archive-preview';account.id='archive-preview';account.session='offline-preview';account.isAnonymous=false;account.isLoggedIn=true;account.isEmailVerified=true;account.playerName='Archive Player';}
        if(account)for(const field of ['colorIdx','stampPositionX','stampPositionY','kills','deaths','streak','currentBalance'])if(account[field]==null)account[field]=0;
        if(typeof account?.syncToServer==='function')account.syncToServer=function(callback){
          // Native menu transitions wait for the loadout-save acknowledgement.
          // Keep equipment in this preview and acknowledge without a live API.
          const loadout=this.generateLoadoutObject?.();
          if(loadout)this.applyLocalLoadout?.(loadout);
          if(typeof callback==='function')queueMicrotask(()=>callback());
          return Promise.resolve();
        };
        accountAdapter.legacyLogin?.();
        settleAccountUI();
        for(const el of document.querySelectorAll('#login,#fbLoginRequest'))el.style.display='none';
        const input=document.getElementById('username');if(input)input.value='Archive Player';
        spoofLoggedIn=true;send('adapter','Local spoof account signed in: Archive Player.');
      }else if(!allUnlocked){
        const items=inventoryItems();
        if(account){account.inventory=items;if(Object.getOwnPropertyDescriptor(account,'isUpgraded')?.writable!==false)account.isUpgraded=()=>true;account.upgradeIsExpired=false;account.isSubscriber=true;account.hideAds=true;window.vueApp?.setAccountUpgraded?.(true);if(Object.getOwnPropertyDescriptor(account,'isItemOwned')?.writable!==false)account.isItemOwned=item=>items.some(owned=>owned.id===item?.id);}
        accountAdapter.legacyUnlock?.(items);
        spoofBalance=unlockedEggs;
        if(account)account.currentBalance=spoofBalance;
        accountAdapter.setBalance?.(spoofBalance);
        if(window.vueApp)window.vueApp.eggs=spoofBalance;
        const balance=document.getElementById('currentBalance');if(balance)balance.textContent=String(spoofBalance);
        const balanceContainer=document.getElementById('currentBalanceContainer');if(balanceContainer)balanceContainer.style.display='inline-block';
        for(const item of items){item.is_available=true;item.showInUI=true;}
        settleAccountUI();
        allUnlocked=true;send('adapter',`Unlocked all ${items.length} archived catalog items and granted ${spoofBalance} eggs locally.`);
      }
      window.vueApp?.$forceUpdate?.();accountState();
    }catch(error){send('error','Spoof account: '+error.message);}
  });
  window.__archivePreview=Object.freeze({prepareOfflineUI,prepareGrenadeMeshes(scene,items){
    const retained=scene.getMeshByName('grenade');if(!retained)return;
    const missing=[];
    for(const item of items){const name=item.item_data?.meshName;if(!name||scene.getMeshByName(name))continue;const mesh=retained.clone(name);mesh.setEnabled(false);missing.push(name);}
    if(missing.length)send('notice','Model compatibility: unavailable grenade meshes '+missing.join(', ')+' use the retained grenade model. Appearance is approximate.');
  },prepareMapDefinition(definition,meshes){
    window.__archiveMapGeometryAdapted=false;
    if(!definition?.data||!Array.isArray(meshes))return;
    const names=new Set(meshes.filter(Boolean).map(mesh=>mesh.name)),changes=[];
    for(const name of Object.keys(definition.data)){
      if(names.has(name))continue;
      const parts=name.split('.'),collision=parts[2];
      // Missing decorations and newer gameplay markers have no collision shape
      // to preserve. Substituting an arbitrary "none" mesh turns whole capture
      // zones into banners, foliage, etc. Keep only decorations actually saved.
      if(collision==='none'){delete definition.data[name];window.__archiveMapGeometryAdapted=true;continue;}
      const candidates=[...names].filter(key=>key.split('.')[2]===collision);
      const score=key=>{const p=key.split('.');return Number(p[0]===parts[0])*100+Number(p[1]===parts[1])*200+Number(p[1].split('_')[0]===parts[1].split('_')[0])*20;};
      candidates.sort((a,b)=>score(b)-score(a)||a.localeCompare(b));
      const donor=candidates[0];if(!donor)continue;
      const cells=Object.values(definition.data[name]);
      definition.data[donor]=Object.values(definition.data[donor]||[]).concat(cells);delete definition.data[name];changes.push(name+' → '+donor);
    }
    if(changes.length){window.__archiveMapGeometryAdapted=true;send('notice','Map compatibility: '+changes.length+' unavailable mesh categories use retained meshes with the same collision type. Appearance is approximate. '+changes.join('; '));}
  },validateLightmap(data,mesh){
    if(!data)return false;
    if(window.__archiveMapGeometryAdapted||data.length!==mesh.getTotalVertices()*3){
      send('notice','Skipped incompatible baked lighting: the rendered map geometry differs from the saved lightmap.');return false;
    }
    return true;
  },inspectStartup:value=>{startupState=value;},startupSnapshot:()=>startupState,bindAccount:adapter=>{accountAdapter=adapter;},accountSnapshot:()=>{const account=accountAdapter?.account?.();return {loggedIn:spoofLoggedIn,unlocked:allUnlocked,eggs:account?.currentBalance??spoofBalance,catalogItems:inventoryItems().length,ownedItems:account?.inventory?.length||0,allOwned:account?inventoryItems().every(item=>account.isItemOwned?.(item)):allUnlocked&&!!accountAdapter?.legacyOwns?.(inventoryItems()),anonymous:account?.isAnonymous};},ready:()=>{
    if(!accountAdapter&&window.extern?.account)accountAdapter={account:()=>window.extern.account,catalog:()=>window.extern.catalog,setBalance:value=>{window.extern.account.currentBalance=value;}};
    settleAccountUI();
    for(const button of document.querySelectorAll('[onclick]')){
      if(/(?:extern\.)?openLoginDialog\(/.test(button.getAttribute('onclick'))||(!localGame&&/(?:extern\.)?(?:play|login|openCreateBox|openJoinBox)\(/.test(button.getAttribute('onclick')))){
        button.disabled=true;button.setAttribute('aria-disabled','true');button.title='Online play and accounts are unavailable in this archive preview.';
        if(button.tagName!=='BUTTON'&&button.tagName!=='INPUT')button.onclick=event=>event.preventDefault();
      }
    }
    for(const button of document.querySelectorAll('#signInButton,#signOutButton')){
      button.disabled=true;button.setAttribute('aria-disabled','true');button.title='Accounts are unavailable in this archive preview.';
    }
    // Some recovered startup paths omit the HTML loader's dismissal after
    // finishing the homescreen. Its overlay would otherwise swallow Play.
    const loader=typeof Loader!=='undefined'?Loader:window.Loader;
    if(loader?.container?.isConnected)loader.hide?.();
    window.__archiveLocalGame?.ready();send('ready');accountState();
  },notice:message=>send('notice',message),error:message=>send('error',message),prepareMeshes:(meshes,scene)=>{
    for(const name of ['eggk47','dozenGauge','csg1','cluck9mm'])if(!meshes[name]&&meshes['gun_'+name])meshes[name]=meshes['gun_'+name];
    if(meshes.hands&&!meshes.gripHand){
      // Recovered combined models already include both hands and magazines.
      // Supply the old API slots without drawing that geometry a second time.
      meshes.gripHand=meshes.hands;
      meshes.foreHand=new BABYLON.Mesh('previewForeHand',scene);meshes.foreHand.setEnabled(false);
      for(const name of ['eggk47Mag','csg1Mag'])if(!meshes[name]){meshes[name]=new BABYLON.Mesh(name,scene);meshes[name].setEnabled(false);}
      if(!meshes.doubleShotgun&&meshes.dozenGauge)meshes.doubleShotgun=meshes.dozenGauge;
      for(const [parent,name] of [[meshes.gripHand,'doubleShotgunGrip'],[meshes.doubleShotgun,'doubleShotgun.barrel'],[meshes.cluck9mm,'cluck9mmMag']])if(parent){const target=new BABYLON.Mesh(name,scene);target.parent=parent;target.setEnabled(false);}
      for(const mesh of new Set([...Object.values(meshes),...scene.meshes]))if(mesh instanceof BABYLON.AbstractMesh&&!mesh.animations?.length){
        const animation=new BABYLON.Animation('previewIdle','position',30,BABYLON.Animation.ANIMATIONTYPE_VECTOR3,BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
        animation.setKeys([{frame:0,value:mesh.position.clone()},{frame:2000,value:mesh.position.clone()}]);mesh.animations=[animation];
      }
      send('adapter','Legacy model schema: combined hands and magazine geometry reused; weapon animations are approximate.');
    }
  }});
  const noop=()=>{};
  window.startAlertBar=noop;window.isFromEU=false;window.blockingAds=true;
  window.HouseAds={};
  if(['0.8.1','0.9.1','0.9.2'].includes(document.currentScript.dataset.version)){
    window.isFromEU=false;window.startAlertBar=noop;
    window.selectClass=direction=>window.extern?.customizer?.selectClass(direction);
    for(const name of ['openSettingsMenu','closeSettingsMenu','toggleFullscreen','showChangelog','setMouseInvert'])window[name]=(...args)=>window.extern?.[name]?.(...args);
  }
  // Each window gets its own settings/account state without touching archive UI storage.
  function storage(){
    const values=new Map([['volume',localGame?'1':'0'],['showBigAd',String(Date.now()+31536000000)],['lastPreRoll',String(Date.now())],['lastVersionPlayed',document.currentScript.dataset.version]]);
    const api={getItem:key=>values.get(String(key))??null,setItem:(key,value)=>{values.set(String(key),String(value));},removeItem:key=>{values.delete(String(key));},clear:()=>values.clear(),key:index=>[...values.keys()][index]??null,get length(){return values.size;}};
    return new Proxy(api,{get:(target,key)=>key in target?Reflect.get(target,key):values.get(String(key)),set:(_,key,value)=>{values.set(String(key),String(value));return true;},deleteProperty:(_,key)=>values.delete(String(key))});
  }
  for(const name of ['localStorage','sessionStorage'])Object.defineProperty(window,name,{value:storage(),configurable:false});
  window.ga=window.gtag=window.fbq=window.aipRefreshBannerForTag=window.aipDisplayTag=noop;
  window.BAWK={play:noop,stop:noop,setVolume:noop};
  window.CrazyGames=function(){this.init=async()=>{};this.initialized=false;this.initializeReplied=false;this.inviteLink=()=>location.href;};
  window.CrazyGames.CrazySDK={getInstance:()=>({init:noop,addEventListener:noop,removeEventListener:noop,gameplayStart:noop,gameplayStop:noop,happytime:noop,inviteLink:()=>location.href,showInviteButton:noop})};
  window.dataLayer=[];window.adsbygoogle=[];window.noAdBlock=true;
  window.OneSignal=[];window.OneSignal.push=noop;
  window.IronRV={getInstance:()=>({show:noop,showVideo:noop})};
  // Firebase is intentionally absent: older clients already have an anonymous path.
  window.firebase=/^(?:0\.(?:4[2-9]|[5-9]\d)|[1-9]\.)/.test(document.currentScript.dataset.version)?{initializeApp:noop,apps:[],app:noop}:undefined;
  window.aiptag={cmd:{display:[],player:[]}};
  window.aipPlayer=function(){this.startPreRoll=noop;};
  function mapURL(input){
    const url=new URL(String(input),document.baseURI);
    if(url.protocol==='data:'||url.protocol==='blob:')return url.href;
    if(url.origin===location.origin&&url.href.startsWith(root))return url.href;
    if(url.origin===location.origin||/^(?:(?:www|dev)\.)?shellshock\.io$/i.test(url.hostname))return root+url.pathname.slice(1)+url.search+url.hash;
    send('blocked',`Blocked live service: ${url.hostname}${url.pathname}`);return null;
  }
  const originalFetch=window.fetch.bind(window);
  let mouseDecoder;
  function offlineMouseDecoder(){
    if(mouseDecoder)return mouseDecoder;
    let yaw=0,pitch=0,speed=100,invert=1,scopeFov=1,scoped=false,active=false;
    document.addEventListener('pointermove',event=>{
      if(!active||!document.pointerLockElement)return;
      const scale=Math.pow(.001*speed,2)*(scoped?scopeFov:1);
      yaw=((yaw-event.movementX*scale)%(Math.PI*2)+Math.PI*2)%(Math.PI*2);
      pitch=Math.max(-1.5,Math.min(1.5,pitch-event.movementY*invert*scale));
    });
    mouseDecoder={
      reset_yaw_pitch(){yaw=0;pitch=0;},
      get_yaw_pitch(){
        if(!active)send('notice','Control compatibility: the archived decoder is unavailable; this offline preview uses local JavaScript mouse controls.');
        active=true;return {yaw,pitch,coords:'AAAAAAAA'};
      },
      set_mouse_params(nextSpeed,nextInvert,nextFov,nextScoped){speed=nextSpeed;invert=nextInvert;scopeFov=nextFov;scoped=nextScoped;},
      poll_gamepad(){}
    };
    return mouseDecoder;
  }
  window.__archiveImportDecoder=async url=>{
    try{
      const decoder=await import(url),fallback=offlineMouseDecoder();let initialized=false;
      const controls=Object.fromEntries(Object.entries(fallback).map(([name,local])=>[name,(...args)=>initialized&&typeof decoder[name]==='function'?decoder[name](...args):local(...args)]));
      return {...decoder,...controls,init:async(...args)=>{await decoder.init(...args);initialized=true;}};
    }
    catch(error){send('adapter','Archived decoder module unavailable; already decoded scripts can still load. '+error.message);return {...offlineMouseDecoder(),init:async()=>{},process:()=>{throw new Error('No usable archived decoder is available for this encoded script.');}};}
  };
  window.__archiveInitializeDecoder=async(init,source)=>{
    try{await init();}
    catch(error){
      if(!/^\s*(?:\(\s*\(\s*\)\s*=>|\(function|!function|var |let |const )/.test(source))throw error;
      send('notice','Decoder compatibility: the archived script is already decoded, so startup can continue without its unavailable WebAssembly decoder. '+error.message);
    }
  };
  window.__archiveLoadPlainScript=async(path,callback)=>{
    const id=window.Loader?.addTask();
    try{const response=await window.fetch(path);if(!response.ok)throw new Error(`Script load failed: ${path}`);const source=await response.text();const script=document.createElement('script');script.textContent=source;document.body.appendChild(script);if(id!=null)window.Loader.finish(id);callback?.();}
    catch(error){send('error',error.message);}
  };
  window.fetch=(input,options)=>{
    const url=mapURL(input instanceof Request?input.url:input);
    if(!url)return Promise.reject(new TypeError('Live services are disabled in archive preview.'));
    return originalFetch(input instanceof Request?new Request(url,input):url,options);
  };
  const open=XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open=function(method,url,...args){return open.call(this,method,mapURL(url)||root+'_preview/blocked',...args);};
  navigator.sendBeacon=()=>false;
  class OfflineSocket extends EventTarget {
    static CONNECTING=0;static OPEN=1;static CLOSING=2;static CLOSED=3;
    constructor(url){super();this.url=String(url);this.readyState=0;this.bufferedAmount=0;this.extensions='';this.protocol='';
      this.previewService=/\/(?:matchmaker|services)\//.test(new URL(this.url,location.href).pathname);
      if(this.previewService){setTimeout(()=>{this.readyState=1;const event=new Event('open');this.dispatchEvent(event);this.onopen?.(event);},0);return;}
      send('blocked','Blocked game connection: '+this.url);
      setTimeout(()=>{this.readyState=3;const error=new Event('error');this.dispatchEvent(error);this.onerror?.(error);const close=new CloseEvent('close',{code:1000,reason:'Offline archive preview',wasClean:true});this.dispatchEvent(close);this.onclose?.(close);},0);
    }
    send(payload){
      if(!this.previewService)return;
      let request;try{request=JSON.parse(payload);}catch{return;}
      const reply=request.command==='regionList'?{command:'regionList',regionList:[{id:'eu',name:'Europe',ping:0}]}:request.cmd==='chicknWinnerReady'?{data:[]}:request.cmd==='getScheduledEventData'?[]:request.cmd==='player_notifications'?{}:{error:'Service unavailable in offline preview'};
      setTimeout(()=>{const event=new MessageEvent('message',{data:JSON.stringify(reply)});this.dispatchEvent(event);this.onmessage?.(event);},0);
    }close(){this.readyState=3;}
  }
  Object.assign(OfflineSocket.prototype,{CONNECTING:0,OPEN:1,CLOSING:2,CLOSED:3});window.WebSocket=OfflineSocket;
  document.addEventListener('webglcontextlost',()=>send('error','The character renderer lost its WebGL context. Reload preview to restore it.'),true);
  document.addEventListener('webglcontextrestored',()=>send('adapter','The WebGL context was restored.'),true);
  window.addEventListener('error',event=>{
    if(event.message&&lastMissingElement&&/null/.test(event.message))send('adapter','Last absent DOM element requested by the client: #'+lastMissingElement);
    if(event.message)send('error',`${event.message}${event.filename?' · '+event.filename.split('/').pop()+':'+event.lineno:''}`);
    else if(event.target?.src||event.target?.href){const url=event.target.src||event.target.href;if(url.startsWith(root))send('resource-error','Resource failed: '+url);}
  },true);
  window.addEventListener('unhandledrejection',event=>send('error',String(event.reason?.message||event.reason)));
  document.addEventListener('securitypolicyviolation',event=>{
    if(event.blockedURI&&!['inline','eval'].includes(event.blockedURI))send('blocked','Blocked external resource: '+event.blockedURI);
  });
  document.addEventListener('DOMContentLoaded',()=>{
    if(!('customizer' in window))Object.defineProperty(window,'customizer',{configurable:true,get:()=>window.extern?.customizer});
    if(!('selectClass' in window)&&typeof window.Customizer?.prototype.selectClass==='function')window.selectClass=(...args)=>window.customizer?.selectClass(...args);
    for(const el of document.querySelectorAll('[onclick]'))for(const match of el.getAttribute('onclick').matchAll(/(?:^|[;{}\s])([A-Za-z_$][\w$]*)\s*\(/g)){const name=match[1];if(!(name in window)&&typeof window.extern?.[name]==='function')window[name]=(...args)=>window.extern[name](...args);}
    if(window.parsedUrl)window.parsedUrl.root=root;
    if(document.querySelector('[data-preview-compatibility="recovered customizer DOM"]')){
      const servers=document.getElementById('serverSelect');servers.replaceChildren(new Option('Offline'));servers.disabled=true;
      send('adapter','Compatibility DOM: recovered HTML and script require different controls. Historical pairing is unverified.');
    }
    document.addEventListener('click',event=>{
      const link=event.target.closest?.('a[href]');if(link&&!/^(#|javascript:)/i.test(link.getAttribute('href'))){event.preventDefault();send('blocked','External navigation is disabled in the preview.');}
    },true);
    send('document');
  });
})();
