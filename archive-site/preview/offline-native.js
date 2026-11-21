// Later clients retain a native local map-test path. Use their own player,
// renderer, controls and equipment rather than substituting a different game.
window.__archiveNativeGameAdapterSource='('+function(){
  const fields=window.__archiveNativeFields;
  const sessions=new Map();let current=null,stage='homescreen',busy=false,phase='idle';
  const sessionKey=code=>String(code||'').trim().replace(/^#/,'').replaceAll('-','').toUpperCase();
  function resume(){
    // The normal respawn packet clears Vue's pause state before resumeGame.
    // The native map-test path bypasses that packet, so complete both steps.
    if(typeof vueApp.setPause==='function')vueApp.setPause(false);else vueApp.isPaused=false;
    resumeGame();
  }
  const library=()=>typeof maps!=='undefined'?maps:[];
  function sessionCode(){
    const legacy='0'+(1296+sessions.size).toString(36)+'100000';
    const letterCodes=typeof extern.parseJoinGameCode==='function'?!extern.parseJoinGameCode(legacy):Array.from(document.scripts).some(script=>script.textContent.includes('[A-Z|a-z]{4}'));
    if(!letterCodes)return legacy;
    // Newer clients parse three groups of four letters instead of the older
    // numeric server/game code. Keep their own parser and share dialog.
    const bytes=crypto.getRandomValues(new Uint8Array(12));
    const letters=Array.from(bytes,value=>String.fromCharCode(65+value%26)).join('');
    return letters.match(/.{4}/g).join('-');
  }
  const position=()=>{
    const source=JSON.parse(localStore.getItem('mapBackup'));
    for(const [name,cells] of Object.entries(source.data))if(/SPECIAL\.spawn/.test(name)){
      const cell=Object.values(cells)[0];if(cell)return {x:cell.x+.5,y:cell.y+.4,z:cell.z+.5};
    }
    const occupied=new Set(),floors=[];
    for(const [name,cells] of Object.entries(source.data))for(const cell of Object.values(cells)){
      if(name.split('.')[2]!=='none')occupied.add(`${cell.x},${cell.y},${cell.z}`);
      if(name.split('.')[2]==='full')floors.push(cell);
    }
    const candidates=floors.filter(c=>!occupied.has(`${c.x},${c.y+1},${c.z}`)&&!occupied.has(`${c.x},${c.y+2},${c.z}`));
    candidates.sort((a,b)=>(a.x-source.width/2)**2+(a.z-source.depth/2)**2-((b.x-source.width/2)**2+(b.z-source.depth/2)**2));
    const cell=candidates[0];if(!cell)throw new Error('No safe local spawn was found in this map.');
    return {x:cell.x+.5,y:cell.y+1.05,z:cell.z+.5};
  };
  async function start(options={}){
    if(busy)return;busy=true;stage='loading map';
    try{
      const list=library(),privateType=vueApp.playTypes.createPrivate,joinType=vueApp.playTypes.joinPrivate;
      let session;
      if(options.playType===joinType){session=sessions.get(sessionKey(options.joinCode));if(!session)throw new Error('This private game does not exist in this preview window.');}
      else{
        const publicMaps=list.map((map,index)=>({map,index})).filter(({map})=>(['public','both'].includes(map.availability)||map.availability==null)&&map.modes?.[['FFA','Teams','Spatula','King'][options.gameType??0]]!==false);
        const pool=publicMaps.length?publicMaps:list.map((map,index)=>({map,index}));
        const index=options.playType===privateType&&options.mapIdx>=0?options.mapIdx:pool[Math.floor(Math.random()*pool.length)].index;
        session={map:index,private:options.playType===privateType,code:sessionCode(),gameType:options.gameType??0};
        if(session.private)sessions.set(sessionKey(session.code),session);
      }
      current=session;mapIdx=session.map;gameType=session.gameType;gameCode=session.code;isPrivateGame=session.private;isGameOwner=session.private;playerLimit=18;myTeam=gameType===GameType.teams?1:0;
      const mapFile=list[mapIdx];if(!mapFile)throw new Error('The selected map is unavailable in this client.');
      vueApp.showSpinner('building_map','please_wait');
      phase='loading models';await loadAllObjectMeshes();
      phase='fetching map';
      const response=await fetch('maps/'+mapFile.filename+'.json');if(!response.ok)throw new Error('Missing map JSON: '+mapFile.filename);
      const definition=await response.json();localStore.setItem('mapBackup',JSON.stringify(definition));localStorage.setItem('lightmap','null');
      const spawn=position();mapTest={x:spawn.x-.5,y:spawn.y+.32,z:spawn.z-.5,pitch:0,yaw:0};
      playOffline=true;inGame=true;meId=0;ws={readyState:1,send(){},close(){stage='homescreen';}};
      if(typeof MetaGames!=='undefined'){const mode=MetaGames[gameType];metaGame=new mode.logic;metaGameUI=new mode.ui;}
      phase='building scene';vueApp.gameJoined(gameType,myTeam);vueApp.setInGame?.(true);vueApp.switchToGameUi?.();
      await new Promise(resolve=>vueApp.$nextTick(resolve));window.__archivePreview.prepareOfflineUI();initializeGameSession();initializeGameUi();startGame();
      const pointerChange=document.onpointerlockchange;
      document.onpointerlockchange=function(event){
        // Pointer-lock exit is asynchronous. A completed leave must not pause
        // the old player against HUD nodes already removed by the home screen.
        if(stage==='playing')return pointerChange?.call(this,event);
      };
      const started=Date.now();
      const wait=setInterval(()=>{
        if(me){
          clearInterval(wait);
          try{window.__archivePreview.prepareOfflineUI();me.respawn?.(spawn.x,spawn.y,spawn.z);me[fields.hp]=100;resume();ensureGameLoop();stage='playing';phase='running';busy=false;vueApp.hideSpinner();if(session.private)inviteFriends();window.__archivePreview.notice('Local game: '+mapFile.name+' (native offline client).');}
          catch(error){fail(error);}
        }
        else if(Date.now()-started>60000){clearInterval(wait);busy=false;stage='failed';window.__archivePreview.error('The native local game did not finish loading.');}
      },100);
    }catch(error){busy=false;stage='failed';vueApp.hideSpinner();window.__archivePreview.error(error.stack||error.message);}
  }
  function respawn(){
    if(!me)return;
    me.respawn?.(me[fields.x],me[fields.y],me[fields.z]);
    me[fields.hp]=100;resume();
    document.querySelector('canvas')?.requestPointerLock();
  }
  function fail(error){busy=false;stage='failed';window.__archivePreview.error(error.stack||error.message||String(error));}
  // Some archived menu/game scene pairings attach the pointer observer to
  // the retained menu scene. The actual game canvas still receives DOM input.
  document.addEventListener('pointerdown',event=>{
    if(stage!=='playing'||document.pointerLockElement||event.target.closest?.('button,a,input,select,textarea,[onclick]'))return;
    // The original HUD can cover the canvas, so its empty game area must
    // activate the same pointer lock as a click directly on the canvas.
    canvas.requestPointerLock()?.catch?.(()=>{});
  },true);
  window.__archiveGameEvaluate=code=>eval(code);
  window.__archiveLocalGame=Object.freeze({start,respawn,fail,ready(){},snapshot:()=>({stage,phase,adapter:'native',runtimeVersion:window.__archiveGameRuntimeVersion,connected:stage==='playing',private:!!current?.private,joinCode:current?.private?current.code:null,mapIndex:current?.map??0,mapCount:library().length,player:inGame&&me?{x:me[fields.x],y:me[fields.y],z:me[fields.z],hp:me[fields.hp],rounds:me[fields.weapon]?.ammo?.[fields.ammo],weaponIndex:me.weaponIdx}:null})});
}.toString()+')()';
