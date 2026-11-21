// Legacy helper snapshot for old workers. New workers route this URL to offline-game.js; extend that shared adapter for future fixes.
// Local binary protocol peer for 0.9.0 clients. No network socket is opened.
(() => {
  'use strict';
  let active=null,selectedMap=0,adapted=false;
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
    scene.beginAnimation(skeleton,range.from,range.to,false,speed,()=>{if(reloading)actor.gun.reloadCountdown=0;});
    stats.animation=name;
    if(reloading){
      const sounds=actor.previewSounds||[];
      sounds.forEach((sound,index)=>actor.previewSoundTimers.push(setTimeout(()=>{if(inGame&&actor.gun.player.weapon===actor.gun)sound.play();},duration*1000*(index+1)/(sounds.length+1))));
    }
  }
  function adaptAnimations(){
    if(adapted)return;adapted=true;
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
          scene.beginDirectAnimation(container,[animation],0,to-from,false,1,done);
          // returnToRest() in this engine rewrites inverse bind matrices from
          // the exporter's editor rest pose, which differs from its mesh bind pose.
          // Select the weapon clip without changing the original bind matrices.
          if(!stowing){const skeleton=skeletonFor(this),range=skeleton?.getAnimationRange(name+'.fire');if(range){scene.beginAnimation(skeleton,range.from,range.to,false);}}
        }
      };
      Type.prototype.reload=function(){animateRange(this,name+(name==='dozenGauge'?'.reload':this.gun.ammo.rounds>0?'.shortReload':'.longReload'));};
    }
    // Resume Web Audio synchronously from a user gesture, including after reload.
    const resume=()=>{const audio=BABYLON.Engine.audioEngine;audio?.audioContext?.resume?.().catch(()=>{});};
    document.addEventListener('pointerdown',resume,true);document.addEventListener('keydown',resume,true);
    BABYLON.Engine.audioEngine.setGlobalVolume(settings.volume);
  }
  function spawn(){
    // Use a full ground/block cell with headroom, nearest the middle of the map.
    const choices=[];
    for(let x=1;x<map.width-1;x++)for(let z=1;z<map.depth-1;z++)for(let y=1;y<map.height;y++){
      const floor=map.data[x][y-1][z],cell=map.data[x][y][z];
      if((floor.cat==MAP.ground||floor.cat==MAP.block)&&!cell.cat)choices.push({x:x+.5,y:y+.02,z:z+.5});
    }
    choices.sort((a,b)=>(a.x-map.width/2)**2+(a.z-map.depth/2)**2-((b.x-map.width/2)**2+(b.z-map.depth/2)**2));
    if(!choices.length)throw new Error('No safe spawn cell in the embedded map.');
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
      const out=new Comm.output(size);write(out);
      const data=out.buffer.slice(0,out.idx).buffer;
      setTimeout(()=>{if(this.readyState===1){stats.sent++;this.emit('message',new MessageEvent('message',{data}));if(this.started&&window.me&&document.getElementById('game').style.display==='block')stats.stage='playing';}},0);
    }
    send(data){
      if(this.readyState!==1)throw new DOMException('Local socket is not open.','InvalidStateError');
      const input=new Comm.input(data),type=input.unPackInt8U();stats.received++;
      switch(type){
        case Comm.login:
          active=this;stats.stage='loading map';
          selectedMap=Math.floor(Math.random()*minMaps.length);
          this.charClass=input.unPackInt8U();this.name=input.unPackString();
          this.packet(7,out=>{out.packInt8(Comm.loggedIn);out.packInt8(0);out.packInt16(1);out.packInt16(1);out.packInt8(selectedMap);});
          break;
        case Comm.clientReady: {
          if(this.started)break;this.started=true;
          const p=spawn();
          this.packet(100+this.name.length*2,out=>{
            out.packInt8(Comm.addPlayer);out.packInt8(0);out.packString(this.name);out.packInt8(this.charClass);
            for(const v of [p.x,p.y,p.z,0,0,0])out.packFloat(v);
            out.packRadU(0);out.packRadU(0);out.packRad(0);
            for(let i=0;i<3;i++)out.packInt16(0);
            out.packInt8(100);out.packInt8(1);out.packInt8(0);out.packInt8(Comm.equipWeapon);out.packInt8(0);out.packInt8(1);
          });
          window.__archivePreview.notice('Local game: embedded map '+(selectedMap+1)+'.');
          break;
        }
        case Comm.ping:this.packet(1,out=>out.packInt8(Comm.pong));break;
        case Comm.fire: {
          if(!window.me)break;
          input.unPackInt8U();
          const pitch=input.unPackRad(),yaw=input.unPackRadU();
          const matrix=BABYLON.Matrix.RotationYawPitchRoll(yaw,pitch,0);
          const direction=BABYLON.Vector3.TransformNormal(new BABYLON.Vector3(0,0,1),matrix);
          const origin=BABYLON.Vector3.TransformCoordinates(new BABYLON.Vector3(.1,.1,.4),matrix);
          const shot=me.weapon instanceof DozenGauge;
          this.packet(shot?15:14,out=>{
            out.packInt8(shot?Comm.fireShot:Comm.fireBullet);out.packInt8(0);
            for(const v of [me.x+origin.x,me.y+.3+origin.y,me.z+origin.z,direction.x,direction.y,direction.z])out.packFloat(v);
            if(shot)out.packInt8(Math.floor(Math.random()*255));
          });break;
        }
        case Comm.stowWeapon: {
          if(!window.me)break;
          const index=input.unPackInt8U();
          if(index>1)break;
          setTimeout(()=>{if(this.readyState===1)this.packet(3,out=>{out.packInt8(Comm.equipWeapon);out.packInt8(0);out.packInt8(index);});},me.weapon.stowWeaponTime/60*1000);
          break;
        }
        case Comm.startReload: {
          if(!window.me)break;
          const gun=me.weapon,delay=(gun.ammo.rounds?gun.shortReloadTime:gun.longReloadTime)/60*1000;
          setTimeout(()=>{if(this.readyState===1&&me?.weapon===gun)this.packet(1,out=>out.packInt8(Comm.reload));},delay);
          break;
        }
        case Comm.chat:this.packet(4+this.name.length*2+data.byteLength,out=>{out.packInt8(Comm.chat);out.packString(this.name+': '+input.unPackString());});break;
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
  window.__archiveLocalGame=Object.freeze({
    ready(){
      adaptAnimations();
      // Discovery is live-only; supply a local public entry for the login URL.
      servers=[{name:'Offline',address:'local.invalid'}];selectedServer=0;
      for(const button of document.querySelectorAll('button[onclick="login(true)"]')){button.disabled=true;button.title='Private games are not implemented in this local preview.';}
      const friends=document.getElementById('friendsButton');if(friends){friends.onclick=()=>{};friends.title='This local game has no multiplayer invites.';}
      const select=document.getElementById('serverSelect');
      if(select){select.replaceChildren(new Option('Offline','0'));select.disabled=true;}
    },
    snapshot:()=>({...stats,connected:active?.readyState===1,mapIndex:selectedMap,mapCount:window.minMaps?.length,player:window.inGame&&window.me?{x:me.x,y:me.y,z:me.z,hp:me.hp,rounds:me.weapon?.ammo.rounds}:null})
  });
})();
