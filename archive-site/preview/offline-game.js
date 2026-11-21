// Shared local gameplay adapter. No network socket is opened.
// Baseline: 0.9-era binary protocol. Extend with version/capability-specific
// overrides as later clients are investigated; all previews may attempt Play.
window.__archiveGameRuntimeVersion=document.currentScript.dataset.version||'';
window.__archiveGameAdapterSource='('+function(){
  'use strict';
  const runtimeVersion=window.__archiveGameRuntimeVersion;
  const codes=typeof CommCode!=='undefined'?CommCode:Comm;
  const Wire=typeof Comm!=='undefined'&&Comm.output?Comm:{output:CommOut.getBuffer().constructor,input:function(data){Object.assign(this,CommIn);this.init(data);}};
  const teamed=codes.joinPublicGame!==undefined;
  const mapLibrary=typeof minMaps!=='undefined'?minMaps:typeof maps!=='undefined'?maps:[];
  const socketSource=window.__archiveGameSources?.socket||(typeof setUpSocket==='function'?setUpSocket:onMapComplete).toString();
  const playerCase=socketSource.match(/case\s+\w+\.addPlayer:([\s\S]*?\};)/)?.[1]||'';
  const playerSchema=[...playerCase.matchAll(/\w+\.unPack(\w+)\(\)/g)].map(m=>{
    const key=playerCase.slice(0,m.index).match(/(\w+)\s*[:=]\s*[^:;={}]*$/)?.[1];
    if(!key)throw new Error('Unknown local player field near '+playerCase.slice(m.index-80,m.index));
    return [key,m[1]];
  });
  if(window.__archiveGameSources)for(let i=0;i<4;i++)playerSchema[i][0]=['id','uniqueId','name','charClass'][i];
  const joinSource=(window.__archiveGameSources?.join||(typeof joinGame==='function'?joinGame.toString():typeof login==='function'?login.toString():'')).replace(/\s+/g,'');
  const weaponVariants=playerSchema.some(([key])=>key==='primaryWeaponIdx'||key==='primaryWeaponItem');
  const fullItemIds=playerSchema.some(([key,kind])=>key==='primaryWeaponItem'&&kind==='Int16U');
  const grenadeItem=playerSchema.some(([key])=>key==='grenadeItem');
  const mapRequest=/packInt8\([^)]*(?:mapId|mapIdx)\)/.test(joinSource);
  // Count the bytes before game ID, rather than relying on the UUID variable's
  // name: later bundles rename it while retaining the same wire field.
  const joinHeader=joinSource.match(/\.packInt8\(\w+\.(?:joinGame|login)\)([\s\S]*?)\.packInt(?:16|32)\(/)?.[1]||'';
  const uuidRequest=joinSource.includes('packInt8(uuid)')||(teamed&&(joinHeader.match(/\.packInt8\(/g)||[]).length>2+Number(mapRequest));
  const joinPrefixBytes=joinHeader?Math.max(0,(joinHeader.match(/\.packInt8\(/g)||[]).length-2-Number(mapRequest)):Number(uuidRequest);
  const wideGameKey=/\.packInt16\([^()]+\)[,;]\w+\.packInt32\(/.test(joinSource);
  const cosmetic=playerSchema.some(([key])=>key==='hatIdx');
  const readyCase=socketSource.match(/case\s+\w+\.clientReady:([\s\S]*?)break;/)?.[1]||'';
  const roundReady=/roundLength\s*=/.test(readyCase);
  const respawnCase=socketSource.match(/case\s+\w+\.respawn:([\s\S]*?)break;/)?.[1]||'';
  const seededRespawn=/unPackInt16U[\s\S]*unPackFloat/.test(respawnCase);
  const currentScene=()=>typeof gameScene!=='undefined'&&gameScene?gameScene:scene;
  let active=null,selectedMap=0,adapted=false,nextPrivateId=1296;
  const privateGames=new Map();
  const stats={stage:'homescreen',received:0,sent:0};
  // The recovered combined models animate bones, rather than separate meshes.
  // Keep their actual exported ranges and adapt the older weapon actor API.
  function skeletonFor(actor){
    const player=actor.playerActor;
    if(!player.previewSkeleton){
      const source=player.gripHand.skeleton||Meshes.hands?.skeleton;
      if(!source)return null;
      player.previewSkeleton=source.clone('local-player-'+actor.gun.player.id);
    }
    for(const mesh of [player.gripHand,player.foreHand,...(actor.gun.player.weapons||[]).map(w=>w.actor?.gunMesh),actor.gunMesh]){
      if(!mesh?.isVerticesDataPresent?.(BABYLON.VertexBuffer.MatricesWeightsKind)||mesh.skeleton===player.previewSkeleton)continue;
      mesh.makeGeometryUnique();mesh.skeleton=player.previewSkeleton;
      // This engine's CPU skinner stops at the first zero weight. Newer exports
      // contain [0,1,0,0] for magazine/barrel vertices, which otherwise collapse
      // to the origin. Pack nonzero influences first, retaining their bone IDs.
      const weights=Array.from(mesh.getVerticesData(BABYLON.VertexBuffer.MatricesWeightsKind));
      const indices=Array.from(mesh.getVerticesData(BABYLON.VertexBuffer.MatricesIndicesKind));
      for(let i=0;i<weights.length;i+=4){
        const influences=[];for(let n=0;n<4;n++)if(weights[i+n]>0)influences.push([indices[i+n],weights[i+n]]);
        const total=influences.reduce((sum,pair)=>sum+pair[1],0)||1;
        for(let n=0;n<4;n++){indices[i+n]=influences[n]?.[0]||0;weights[i+n]=(influences[n]?.[1]||0)/total;}
      }
      mesh.setVerticesData(BABYLON.VertexBuffer.MatricesIndicesKind,indices,false);
      mesh.setVerticesData(BABYLON.VertexBuffer.MatricesWeightsKind,weights,false);
      // The 2017 custom shader has no bone attributes. CPU skinning retains it.
      mesh.computeBonesUsingShaders=false;
    }
    return player.previewSkeleton;
  }
  function animateRange(actor,name){
    const skeleton=skeletonFor(actor),range=skeleton?.getAnimationRange(name);
    if(!range)return;
    const pending=actor.previewSoundTimers||[];pending.forEach(clearTimeout);actor.previewSoundTimers=[];
    const reloading=name.endsWith('Reload')||name.endsWith('.reload');
    const fps=skeleton.bones[0].animations[0].framePerSecond;
    const duration=reloading?(name.endsWith('.longReload')?actor.gun.longReloadTime:actor.gun.shortReloadTime)/60:(range.to-range.from)/fps;
    const speed=(range.to-range.from)/fps/duration;
    currentScene().beginAnimation(skeleton,range.from,range.to,false,speed,()=>{if(reloading)actor.gun.reloadCountdown=0;});
    stats.animation=name;
    if(reloading){
      const sounds=actor.previewSounds||[];
      sounds.forEach((sound,index)=>actor.previewSoundTimers.push(setTimeout(()=>{if(inGame&&actor.gun.player.weapon===actor.gun)sound.play();},duration*1000*(index+1)/(sounds.length+1))));
    }
  }
  function adaptAnimations(){
    if(adapted)return;adapted=true;
    if(typeof Meshes==='undefined'||!Meshes.hands?.skeleton)return;
    if(typeof Eggk47Actor==='undefined'||typeof DozenGaugeActor==='undefined'||typeof CSG1Actor==='undefined'||typeof Cluck9mmActor==='undefined')return;
    const types=[[Eggk47Actor,'eggk47',0,154,168],[DozenGaugeActor,'dozenGauge',300,416,433],[CSG1Actor,'csg1',800,1166,1181],[Cluck9mmActor,'cluck9mm',600,721,735]];
    if(Meshes.hands?.skeleton)for(const [Type,name,fireFrame,stowFrame,equipFrame] of types){
      Type.prototype.addSoundEvent=function(frame,sound){(this.previewSounds||=[]).push(sound);this.gunMesh.attachSound(sound);};
      Type.prototype.animate=function(from,to,done){
        if(from===fireFrame){animateRange(this,name+'.fire');return;}
        if(from===stowFrame||from===equipFrame){
          skeletonFor(this);
          const container=this.playerActor.gunContainer;
          const base=container.previewRestPosition||=container.position.clone(),stowing=from===stowFrame;
          const animation=new BABYLON.Animation('local-weapon-transition','position',60,BABYLON.Animation.ANIMATIONTYPE_VECTOR3,BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
          const lowered=base.add(new BABYLON.Vector3(0,-.45,-.15));
          animation.setKeys([{frame:0,value:stowing?base:lowered},{frame:to-from,value:stowing?lowered:base}]);
          currentScene().beginDirectAnimation(container,[animation],0,to-from,false,1,done);
          // returnToRest() in this engine rewrites inverse bind matrices from
          // the exporter's editor rest pose, which differs from its mesh bind pose.
          // Select the weapon clip without changing the original bind matrices.
          if(!stowing){const skeleton=skeletonFor(this),range=skeleton?.getAnimationRange(name+'.fire');if(range){currentScene().beginAnimation(skeleton,range.from,range.to,false);}}
        }
      };
      Type.prototype.reload=function(){animateRange(this,name+(name==='dozenGauge'?'.reload':this.gun.ammo.rounds>0?'.shortReload':'.longReload'));};
    }
    if(teamed){
      PlayerActor.prototype.reachForGrenade=function(){animateRange(this.player.weapon.actor,'grenade.grab');};
      PlayerActor.prototype.throwGrenade=function(){const hud=document.getElementById('grenadeThrowContainer');if(hud&&this.player.id===meId)hud.style.visibility='hidden';animateRange(this.player.weapon.actor,'grenade.throw');};
    }
    // Resume Web Audio synchronously from a user gesture, including after reload.
    const resume=()=>{const audio=BABYLON.Engine.audioEngine;audio?.audioContext?.resume?.().catch(()=>{});};
    document.addEventListener('pointerdown',resume,true);document.addEventListener('keydown',resume,true);
    if(typeof settings!=='undefined')BABYLON.Engine.audioEngine.setGlobalVolume(settings.volume);
  }
  function prepareMapMeshes(library){
    if(!library)return;
    const adjusted=[],missing=[];
    // Early renderers apply the Z-up rotation per particle and place its base
    // at cell Y. Later renderers expect already-centered Y-up vertex data.
    const nativeZUp=typeof createMapCells==='function'&&/\.rotation\.x=(?:\.5\*-Math\.PI|-Math\.PI\*\.5|-Math\.PI\/2)/.test(createMapCells.toString().replace(/\s+/g,''));
    for(const [cat,meshes] of Object.entries(library))for(const mesh of meshes||[]){
      if(!mesh||mesh.previewMapBaked)continue;
      if(nativeZUp){
        if(Math.abs(mesh.rotation.x)>.001||mesh.rotationQuaternion)continue;
        // A newer centered Y-up export must be converted back to the legacy
        // source convention. The native particle applies the inverse rotation.
        mesh.makeGeometryUnique();
        mesh.bakeTransformIntoVertices(BABYLON.Matrix.Translation(0,.5,0));
        mesh.bakeTransformIntoVertices(BABYLON.Matrix.RotationX(Math.PI/2));
        mesh.previewMapBaked=true;adjusted.push(mesh.name);continue;
      }
      if(Math.abs(mesh.rotation.x+Math.PI/2)>.001)continue;
      // Borrowed Blender exports are Z-up with a base pivot. SPS consumes raw
      // vertex data, ignoring the node rotation; its cells expect centered Y-up.
      mesh.makeGeometryUnique();mesh.bakeCurrentTransformIntoVertices();
      mesh.bakeTransformIntoVertices(BABYLON.Matrix.Translation(0,-.5,0));
      mesh.previewMapBaked=true;adjusted.push(mesh.name);
    }
    for(const m of mapLibrary)for(const [cat,styles] of Object.entries(m.data||{})){
      const meshes=library[cat];if(!meshes?.length)continue;
      const retained=meshes.map((mesh,i)=>mesh?i:null).filter(i=>i!==null);
      for(const style of Object.keys(styles))if(!meshes[style]){
        const previous=retained.filter(i=>i<Number(style));const donor=previous.length?previous.at(-1):retained[0];
        meshes[style]=meshes[donor];missing.push(cat+':'+style);
      }
    }
    if(adjusted.length||missing.length)window.__archivePreview.notice('Map compatibility: converted '+adjusted.length+' meshes to the native '+(nativeZUp?'Z-up/base-pivot':'centered Y-up')+' convention.'+(missing.length?' Unavailable category/style variants '+[...new Set(missing)].join(', ')+' use the closest retained style; original appearance is unverified.':''));
  }
  function spawn(){
    // Use a full ground/block cell with headroom, nearest the middle of the map.
    const choices=[];
    for(let x=1;x<map.width-1;x++)for(let z=1;z<map.depth-1;z++)for(let y=1;y<=map.height;y++){
      const floor=map.data[x][y-1][z],cell=map.data[x][y]?.[z]||{};
      const full=floor.cat!==undefined&&typeof MAP!=='undefined'?(floor.cat==MAP.ground||floor.cat==MAP.block):floor.idx&&typeof mapMeshes!=='undefined'&&mapMeshes[floor.idx]?.colliderType==='full';
      const ahead=map.data[x][y]?.[z+1]||{};
      if(full&&!cell.cat&&!cell.idx&&!ahead.cat&&!ahead.idx)choices.push({x:x+.5,y:y+.02,z:z+.5});
    }
    choices.sort((a,b)=>(a.x-map.width/2)**2+(a.z-map.depth/2)**2-((b.x-map.width/2)**2+(b.z-map.depth/2)**2));
    if(!choices.length){const sample={};for(const column of map.data)for(const row of column)for(const cell of row){const kind=cell.cat??(cell.idx?String(typeof mapMeshes!=='undefined'&&mapMeshes[cell.idx]?.colliderType):'empty');sample[kind]=(sample[kind]||0)+1;}throw new Error('No safe spawn cell in the embedded map: '+JSON.stringify(sample));}
    return choices[0];
  }
  class LocalSocket extends EventTarget {
    static CONNECTING=0;static OPEN=1;static CLOSING=2;static CLOSED=3;
    constructor(url){
      super();this.url=String(url);this.readyState=0;this.bufferedAmount=0;this.extensions='';this.protocol='';this.binaryType='arraybuffer';this.started=false;
      setTimeout(()=>{if(this.readyState!==0)return;this.readyState=1;this.emit('open',new Event('open'));},0);
    }
    emit(type,event){this.dispatchEvent(event);this['on'+type]?.call(this,event);}
    packet(size,write){
      const out=new Wire.output(size);write(out);
      const data=out.buffer.slice(0,out.idx).buffer;
      setTimeout(()=>{if(this.readyState===1){stats.sent++;this.emit('message',new MessageEvent('message',{data}));if(this.started&&(typeof me!=='undefined'&&me)&&inGame){const go=document.querySelector('#goButton');if(go&&!document.querySelector('#respawnButton')&&document.getElementById('respawnButton')===go)go.style.display='';stats.stage='playing';}}},0);
    }
    send(data){
      if(this.readyState!==1)throw new DOMException('Local socket is not open.','InvalidStateError');
      // Services sockets use JSON, while game sockets use binary packets.
      // Keep live service requests inert; never answer them with game bytes.
      if(typeof data==='string'||!data?.byteLength)return;
      const input=new Wire.input(data),type=input.unPackInt8U();stats.received++;
      switch(type){
        case (codes.joinGame??codes.login):
          active=this;stats.stage='loading map';
          let joinType,joinId,joinKey;
          if(teamed){for(let n=0;n<joinPrefixBytes;n++)input.unPackInt8U();joinType=input.unPackInt8U();this.gameType=input.unPackInt8U();this.requestMap=mapRequest?input.unPackInt8U():0;joinId=input.unPackInt16U();joinKey=input[wideGameKey?'unPackInt32U':'unPackInt16U']();}
          this.private=teamed?joinType===codes.createPrivateGame:this.url.endsWith('/p');
          const joining=teamed?joinType===codes.joinPrivateGame:this.url.includes('/j');
          const code=teamed?'0'+joinId.toString(36)+joinKey.toString(36):'0'+this.url.split('/j')[1];
          const saved=joining?privateGames.get(code):null;
          if(joining&&!saved){this.close(typeof CloseCode!=='undefined'?CloseCode.gameNotFound:4000,'Local private game not found');break;}
          selectedMap=saved?.map??(this.private&&mapRequest?this.requestMap:Math.floor(Math.random()*mapLibrary.length));
          this.gameType=saved?.gameType??this.gameType??0;
          this.id=saved?.id??(this.private?nextPrivateId++:1);this.key=saved?.key??(wideGameKey?36**5:this.private?36:1);
          if(this.private)privateGames.set('0'+this.id.toString(36)+this.key.toString(36),{map:selectedMap,gameType:this.gameType,id:this.id,key:this.key});
          if(saved)this.private=true;
          const itemReader=fullItemIds?'unPackInt16U':'unPackInt8U';
          this.charClass=input.unPackInt8U();if(weaponVariants){this.primary=input[itemReader]();this.secondary=input[itemReader]();}this.color=teamed?input.unPackInt8U():0;
          if(cosmetic||weaponVariants){this.hat=input[itemReader]();this.stamp=input[itemReader]();}
          if(grenadeItem)this.grenade=input[itemReader]();
          this.name=input.unPackString();
          this.packet(32,out=>{out.packInt8(codes.gameJoined??codes.loggedIn);out.packInt8(0);if(teamed){out.packInt8(this.gameType===GameType.teams?1:0);out.packInt8(this.gameType);}out.packInt16(this.id);out[wideGameKey?'packInt32':'packInt16'](this.key);out.packInt8(selectedMap);if(/playerLimit=\w+\.unPack/.test(joinSource))out.packInt8(18);if(/isGameOwner=|=1==\w+\.unPackInt8U/.test(joinSource))out.packInt8(this.private?1:0);if(/teamScore\[1\]=/.test(joinSource)){out.packInt16(0);out.packInt16(0);}});
          break;
        case codes.clientReady: {
          if(this.started)break;this.started=true;
          const p=spawn();
          this.packet(100+this.name.length*2,out=>{
            out.packInt8(codes.addPlayer);
            const values={id:0,uniqueId:42,randomSeed:1,primaryWeaponIdx:this.primary||0,secondaryWeaponIdx:this.secondary||0,primaryWeaponItem:this.primary||0,secondaryWeaponItem:this.secondary||0,hatItem:this.hat??(fullItemIds?0:255),stampItem:this.stamp??(fullItemIds?0:255),grenadeItem:this.grenade||0,social:'[]',name:this.name,charClass:this.charClass,team:teamed&&this.gameType===GameType.teams?1:0,shellColor:this.color||0,hatIdx:this.hat||0,stampIdx:this.stamp||0,...p,hp:100,playing:1,weaponIdx:typeof Weapons!=='undefined'?0:1};
            // Unsigned integer readers share an integer writer. RadU has its
            // own writer and, in later protocols, a different byte width.
            for(const [key,kind] of playerSchema)out['pack'+kind.replace(/^(Int\d+)U$/,'$1')](values[key]??0);
            if(!teamed){out.packInt8(codes.equipWeapon);out.packInt8(0);out.packInt8(1);}
            if(teamed){out.packInt8(codes.clientReady);if(roundReady){out.packInt16(0);out.packInt32(0);out.packInt32(0);}if(/case\s+\w+\.ping:/.test(socketSource))out.packInt8(codes.ping);}

          });
          window.__archivePreview.notice('Local game: embedded map '+(selectedMap+1)+'.');
          break;
        }
        case codes.ping:this.packet(1,out=>out.packInt8(teamed?codes.ping:codes.pong));break;
        case codes.fire:case codes.firePrecise: {
          if(codes.fireBullet===undefined)break;
          if(!(typeof me!=='undefined'&&me))break;
          let direction;
          if(teamed){direction=new BABYLON.Vector3(...[0,0,0].map(()=>type===codes.firePrecise?input.unPackDouble():input.unPackFloat())).normalize();}
          else input.unPackInt8U();
          const pitch=teamed?me.pitch:input.unPackRad(),yaw=teamed?me.viewYaw:input.unPackRadU();
          const matrix=BABYLON.Matrix.RotationYawPitchRoll(yaw,pitch,0);
          direction=direction||BABYLON.Vector3.TransformNormal(new BABYLON.Vector3(0,0,1),matrix);
          const origin=BABYLON.Vector3.TransformCoordinates(new BABYLON.Vector3(.1,.1,.4),matrix);
          const shot=/DozenGauge|dozenGauge/.test(me.weapon.constructor.name)||me.weapon.name==='Dozen Gauge';
          this.packet(shot?15:14,out=>{
            out.packInt8(shot?codes.fireShot:codes.fireBullet);out.packInt8(0);
            for(const v of [me.x+origin.x,me.y+.3+origin.y,me.z+origin.z,direction.x,direction.y,direction.z])out.packFloat(v);
            if(shot)out.packInt8(Math.floor(Math.random()*255));
          });break;
        }
        case codes.stowWeapon: {
          if(!(typeof me!=='undefined'&&me))break;
          const index=input.unPackInt8U();
          if(index>1)break;
          setTimeout(()=>{if(this.readyState===1)this.packet(3,out=>{out.packInt8(codes.equipWeapon);out.packInt8(0);out.packInt8(index);});},me.weapon.stowWeaponTime/60*1000);
          break;
        }
        case codes.startReload: {
          if(teamed)break;
          if(!(typeof me!=='undefined'&&me))break;
          const gun=me.weapon,delay=(gun.ammo.rounds?gun.shortReloadTime:gun.longReloadTime)/60*1000;
          setTimeout(()=>{if(this.readyState===1&&me?.weapon===gun)this.packet(1,out=>out.packInt8(codes.reload));},delay);
          break;
        }
        case codes.throwGrenade: {
          if(typeof me==='undefined'||!me)break;
          const power=input.unPackFloat(),matrix=BABYLON.Matrix.RotationYawPitchRoll(me.yaw??me.viewYaw,me.pitch,0);
          const velocity=BABYLON.Vector3.TransformNormal(new BABYLON.Vector3(0,.1,1),matrix).scale(.1+.1*power);
          this.packet(14,out=>{out.packInt8(codes.throwGrenade);out.packInt8(0);for(const v of [me.x,me.y+.4,me.z,velocity.x,velocity.y,velocity.z])out.packFloat(v);});
          break;
        }
        case codes.requestRespawn: {
          const p=spawn();
          this.packet(24,out=>{out.packInt8(codes.respawn);out.packInt8(0);if(seededRespawn)out.packInt16(1);out.packFloat(p.x);out.packFloat(p.y);out.packFloat(p.z);if((respawnCase.match(/unPackInt8U/g)||[]).length>=6){for(const weapon of me.weapons){out.packInt8(weapon.ammo.rounds);out.packInt8(weapon.ammo.store);}out.packInt8(1);}});
          break;
        }
        case codes.chat:this.packet(4+this.name.length*2+data.byteLength,out=>{out.packInt8(codes.chat);out.packString(this.name+': '+input.unPackString());});break;
        // Movement and jumping already run in the client.
        // Do not echo these back to the local player or introduce reconciliation jitter.
      }
    }
    close(code=1000,reason=''){
      if(this.readyState===3)return;this.readyState=3;
      if(active===this){active=null;stats.stage='homescreen';}
      this.emit('close',new CloseEvent('close',{code,reason,wasClean:true}));
    }
  }
  Object.assign(LocalSocket.prototype,{CONNECTING:0,OPEN:1,CLOSING:2,CLOSED:3});window.WebSocket=LocalSocket;
  document.addEventListener('pointerdown',event=>{
    if(typeof inGame==='undefined'||!inGame||typeof me==='undefined'||!me?.playing||document.pointerLockElement||event.target.closest('button,a,input,select,textarea,[onclick]'))return;
    const gameCanvas=event.target instanceof HTMLCanvasElement?event.target:currentScene()?.getEngine().getRenderingCanvas();
    gameCanvas?.requestPointerLock()?.catch?.(()=>{});
  },true);
  window.__archiveGameEvaluate=code=>eval(code);
  window.__archiveLocalGame=Object.freeze({prepareMapMeshes,
    ready(){
      adaptAnimations();
      // Discovery is live-only; supply a local public entry for the login URL.
      const vueClient=typeof vueApp!=='undefined';
      if(typeof servers!=='undefined')servers=[{id:0,name:'Offline',locKey:'Offline',address:'local.invalid'}];
      if(typeof selectedServer!=='undefined')selectedServer=vueClient?servers[0]:0;
      const select=document.getElementById('serverSelect');
      if(select){select.replaceChildren(new Option('Offline','0'));select.disabled=true;}
    },
    snapshot:()=>({...stats,runtimeVersion,connected:active?.readyState===1,private:!!active?.private,joinCode:active?.private?'0'+active.id.toString(36)+active.key.toString(36):null,mapIndex:selectedMap,mapCount:mapLibrary.length,player:(typeof inGame!=='undefined'&&inGame)&&(typeof me!=='undefined'&&me)?{x:me.x,y:me.y,z:me.z,hp:me.hp,rounds:me.weapon?.ammo.rounds,weaponIndex:me.weaponIdx,grenades:me.grenadeCount}:null})
  });
}.toString()+')()';
