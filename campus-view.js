(() => {
  const plan=window.campusPlan, data=window.CampusScene, T=window.THREE;
  const field=document.querySelector('#play-field'), viewport=document.querySelector('#campus-viewport');
  const canvas=document.querySelector('#campus-plan'), labels=document.querySelector('#campus-labels');
  const pins=plan.points.map(point=>{
    const pin=document.createElement('span');
    pin.className='campus-pin';
    pin.textContent=point.icon+' '+point.label;
    labels.append(pin);
    return pin;
  });

  let scene,camera,renderer,controls,player,ring,lastState,lastMode,lastAspect,meshes=[],lights=[],mist=[],rebuild=()=>{};
  let setPieceState=()=>{},focusPiece=()=>{},highlight=null;
  let updatingCamera=false;
  let sky,ambient,moon,lastSkyId,lastCameraEpoch,lastFollowAnchor;
  const pointLights=[];
  const surfaces=[];
  const instances=new Map(),pieceById=new Map();
  if(T) {
    try { renderer=new T.WebGLRenderer({antialias:true}); } catch { /* Canvas plan fallback */ }
  }
  field.classList.toggle('flat',!renderer);

  // 材质基线统一由 campus-materials.js 提供，正式版与临时编辑页共用。

  if(renderer) {
    const profile=data.profile;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.5));
    viewport.append(renderer.domElement);
    scene=new T.Scene();
    scene.fog=new T.Fog(0x26384b,profile.fogNear,profile.fogFar);
    camera=new T.PerspectiveCamera(42,1,.1,1000);
    sky=createMapSky(T);
    scene.add(sky.mesh);
    controls=new T.OrbitControls(camera,renderer.domElement);
    controls.enableDamping=false;
    controls.minDistance=9;
    controls.maxDistance=790;
    controls.maxPolarAngle=Math.PI*.48;
    controls.addEventListener('change',()=>{
      if(lastState&&!updatingCamera) draw(lastState);
    });

    ambient=new T.HemisphereLight(0xb4cbdc,0x655473,1.05);
    moon=new T.DirectionalLight(0x9abddd,.82);
    moon.position.set(-105,85,35);
    scene.add(ambient,moon);
    for(let i=0;i<6;i++){
      const point=new T.PointLight(0xffffff,0,1,2);pointLights.push(point);scene.add(point);
    }
    const {materials,materialKey,haloTexture}=CampusMaterials.create(T);
    const geometry=new T.BoxGeometry(1,1,1);
    const mistPlane=new T.PlaneGeometry(1,1);
    const mistMaterial=new T.MeshBasicMaterial({map:haloTexture,color:0xb1cccd,transparent:true,opacity:.29,depthWrite:false,side:T.DoubleSide});
    const block=new T.Object3D();
    highlight=new T.LineSegments(new T.EdgesGeometry(new T.BoxGeometry(1,1,1)),
      new T.LineBasicMaterial({color:0xf4cd83,transparent:true,opacity:.95,depthTest:false}));
    highlight.renderOrder=999;highlight.visible=false;scene.add(highlight);
    rebuild=()=>{
      for(const [,mesh] of meshes) {scene.remove(mesh);mesh.dispose();}
      for(const {halo} of lights){scene.remove(halo);halo.material.dispose();}
      for(const patch of mist)scene.remove(patch);
      surfaces.length=0;instances.clear();pieceById.clear();
      const preview=data.previewPieces();
      for(const piece of preview)pieceById.set(piece.id,piece);
      const batches=new Map();
      for(const piece of preview){
        const luminous=piece.group==='light'||piece.group==='route-arrow';
        const visibility=piece.group==='gate'?piece.id:['roof','mannequin'].includes(piece.group)?piece.group:'';
        const key=visibility+':'+(luminous?'light':materialKey(piece));
        if(!batches.has(key))batches.set(key,{materialKey:luminous?'light':materialKey(piece),pieces:[]});
        batches.get(key).pieces.push(piece);
      }
      meshes=[...batches.values()].map(({materialKey:key,pieces})=>{
        const mesh=new T.InstancedMesh(geometry,materials[key]||materials.plain,pieces.length);
        pieces.forEach((piece,i)=>{
          const {x,y,z}=piece.positionCm,size=piece.sizeCm;
          block.scale.set(size.x/100,size.z/100,size.y/100);
          block.position.set(x/100,(z+size.z/2)/100,y/100);
          block.rotation.y=-piece.yaw*Math.PI/180;
          block.updateMatrix();mesh.setMatrixAt(i,block.matrix);
          const {r,g,b}=piece.color,color=new T.Color((r<<16)+(g<<8)+b);
          mesh.setColorAt(i,color);
          instances.set(piece.id,{mesh,index:i,matrix:block.matrix.clone(),color});
        });
        scene.add(mesh);surfaces.push(mesh);
        return [pieces[0],mesh];
      });
      lights=data.activeLights().map(spec=>{
        const halo=new T.Sprite(new T.SpriteMaterial({map:haloTexture,color:spec.color,transparent:true,
          blending:T.AdditiveBlending,depthWrite:false,opacity:.47}));
        halo.position.set(spec.x,spec.z-.18,spec.y);
        halo.scale.set(5,5,1);
        scene.add(halo);
        return {spec,halo};
      });
      mist=data.activeMist().map(({item})=>{
        const {location,rotation}=item.transform;
        const patch=new T.Mesh(mistPlane,mistMaterial);
        patch.rotation.set(-Math.PI/2,0,rotation.yaw*Math.PI/180);
        patch.position.set(location.x/100,location.z/100+.15,location.y/100);
        patch.scale.set(23,8,1);scene.add(patch);return patch;
      });
      focusPiece(null);
    };
    setPieceState=(id,spec)=>{
      const record=instances.get(id);
      if(!record)return;
      const matrix=record.matrix.clone();
      if(spec){
        matrix.elements[12]+=spec.dx||0;
        matrix.elements[13]+=spec.dz||0;
        matrix.elements[14]+=spec.dy||0;
      }
      record.mesh.setMatrixAt(record.index,matrix);
      record.mesh.setColorAt(record.index,spec?.color!==undefined?new T.Color(spec.color):record.color);
      record.mesh.instanceMatrix.needsUpdate=true;
      if(record.mesh.instanceColor)record.mesh.instanceColor.needsUpdate=true;
    };
    focusPiece=id=>{
      const piece=id?pieceById.get(id):null;
      highlight.visible=Boolean(piece);
      if(!piece)return;
      const {x,y,z}=piece.positionCm,s=piece.sizeCm;
      highlight.position.set(x/100,(z+s.z/2)/100,y/100);
      highlight.scale.set(s.x/100+.16,s.z/100+.16,s.y/100+.16);
    };
    rebuild();
    const marker=(geometry,color)=>new T.Mesh(geometry,new T.MeshBasicMaterial({color}));
    player=new T.Group();
    // 玩家 marker 按星宝外包 120 × 223 × 281 厘米校准，用来直观判断层高。
    const body=marker(new T.CylinderGeometry(.52,.6,2.05,14),0xd88c6a);
    body.scale.z=1.85;
    const head=marker(new T.SphereGeometry(.48,12,8),0xffdf9c);
    body.position.y=1.05;
    head.position.y=2.42;
    player.add(body,head);
    scene.add(player);
    ring=marker(new T.RingGeometry(2.05,2.48,32),0xe5ba80);
    ring.rotation.x=-Math.PI/2;
    scene.add(ring);
  }

  const visible=(piece,state)=>!data.openGate(piece.id,state.stage) && (piece.group!=='mannequin'||!state.scared) && (piece.group!=='roof'||!state.cutaway);
  function paintFlat(state) {
    const width=field.clientWidth,height=field.clientHeight;
    if(canvas.width!==width || canvas.height!==height){canvas.width=width;canvas.height=height;}
    const ctx=canvas.getContext('2d');
    const size=Math.min(width-26,height-34), s=size/200;
    const screen=(x,y)=>[(width-size)/2+(x+100)*s,(height-size)/2+(y+100)*s];
    ctx.clearRect(0,0,width,height);
    const profile=YuanmengSkyboxes.find(state.skyboxId);
    const background=ctx.createLinearGradient(0,0,0,height);
    background.addColorStop(0,'#'+profile.zenith.toString(16).padStart(6,'0'));
    background.addColorStop(1,'#'+profile.ground.toString(16).padStart(6,'0'));
    ctx.fillStyle=background;ctx.fillRect(0,0,width,height);
    for(const p of data.previewPieces()) {
      if(!visible(p,state))continue;
      const {r,g,b}=p.color, [x,y]=screen(p.positionCm.x/100,p.positionCm.y/100);
      const w=p.sizeCm.x*s/100,d=p.sizeCm.y*s/100;
      ctx.save();
      ctx.translate(x,y);
      ctx.rotate(p.yaw*Math.PI/180);
      ctx.fillStyle='rgb('+r+' '+g+' '+b+')';
      ctx.fillRect(-w/2,-d/2,w,d);
      ctx.restore();
    }
    ctx.beginPath();
    ctx.fillStyle='#684aa2';
    ctx.arc(...screen(state.x,state.y),5,0,Math.PI*2);
    ctx.fill();
    return screen;
  }

  function draw(state) {
    const w=field.clientWidth,h=field.clientHeight;
    let screen;
    if(renderer) {
      sky.followCamera(camera);
      const nearby=lights.filter(({spec})=>state.stage>=spec.phase).map(light=>({light,distance:light.halo.position.distanceToSquared(controls.target)}))
        .sort((a,b)=>a.distance-b.distance);
      pointLights.forEach((point,i)=>{
        const source=nearby[i]?.light;
        point.intensity=source?1.42:0;
        if(source){point.position.copy(source.halo.position);point.color.setHex(source.spec.color);point.distance=source.spec.distance;}
      });
      renderer.render(scene,camera);
      screen=(a,b)=>{
        const v=new T.Vector3(a,6.5,b).project(camera);
        return [(v.x+1)*w/2,(1-v.y)*h/2,v.z];
      };
    } else screen=paintFlat(state);
    plan.points.forEach((p,i)=>{
      const [x,y,z]=screen(p.x,p.y);
      pins[i].hidden=Boolean(z!==undefined&&(z<-1||z>1));
      pins[i].style.left=x+'px';
      pins[i].style.top=y+'px';
      pins[i].classList.toggle('active',state.stage===i);
    });
  }

  function render(state) {
    if(!renderer){draw(state);return;}
    lastState=state;
    const w=field.clientWidth,h=field.clientHeight,aspect=w/h;
    const view=state.viewMode;
    const resetView=lastMode!==view || lastCameraEpoch!==state.cameraEpoch || (lastAspect!==aspect && view!=='follow');
    if(lastSkyId!==state.skyboxId){
      const profile=YuanmengSkyboxes.find(state.skyboxId);
      sky.setProfile(profile);
      scene.fog.color.setHex(profile.fog);
      renderer.setClearColor(profile.ground);
      ambient.color.setHex(profile.ambient);
      moon.color.setHex(profile.light);
      moon.intensity=profile.intensity;
      lastSkyId=state.skyboxId;
    }
    if(lastAspect!==aspect) {
      camera.aspect=aspect;
      camera.updateProjectionMatrix();
    }
    if(renderer.domElement.clientWidth!==w || renderer.domElement.clientHeight!==h || lastAspect!==aspect)
      renderer.setSize(w,h,false);
    player.position.set(state.x,state.z,state.y);
    const next=plan.points[state.stage];
    ring.visible=Boolean(next);
    if(next) ring.position.set(next.x,.23,next.y);
    for(const [piece,mesh] of meshes) {
      mesh.visible=visible(piece,state);
      mesh.material.wireframe=view==='wire';
    }
    for(const {spec,halo} of lights) {
      halo.material.opacity=state.stage>=spec.phase?.5:.06;
    }
    if(view==='follow'){
      const anchor=new T.Vector3(state.x,2.6,state.y-2);
      if(resetView||!lastFollowAnchor){
        camera.position.set(state.x+14,20,state.y+27);
        controls.target.copy(anchor);
      } else {
        const delta=anchor.clone().sub(lastFollowAnchor);
        camera.position.add(delta);
        controls.target.add(delta);
      }
      lastFollowAnchor=anchor;
    } else if(resetView&&state.focusModule){
      const {x,y}=state.focusModule;
      controls.target.set(x/100,2.5,y/100);
      camera.position.copy(controls.target).add(new T.Vector3(16,31,43));
    } else if(resetView) {
      const factor=Math.max(1,1/aspect);
      controls.target.set(0,0,0);
      if(view==='top') camera.position.set(0,315*factor,.01);
      else camera.position.set(121*factor,186*factor,176*factor);
    }
    lastMode=view;
    lastAspect=aspect;
    lastCameraEpoch=state.cameraEpoch;
    updatingCamera=true;
    controls.update();
    updatingCamera=false;
    draw(state);
  }
  window.campusView={render,has3D:!!renderer,obstacles:data.obstacles,rebuild,scene,camera,renderer,surfaces,controls,
    setPieceState,focusPiece,
    // 打开临时编辑页时把当前镜头交给编辑页，保证初始画面与正式版一致。
    snapshot(){return renderer?{fov:camera.fov,position:camera.position.toArray(),target:controls.target.toArray(),
      fog:{color:scene.fog.color.getHex(),near:scene.fog.near,far:scene.fog.far}}:null;},
    get skyAnimating(){return Boolean(sky?.animating)}};
})();
