(async()=>{
  const $=id=>document.getElementById(id);
  const feedback=$('draft-status'), stage=$('draft-stage');
  const draftId=location.hash.slice(1);
  const customEmbedded=new URLSearchParams(location.search).get('custom')==='1';
  if(customEmbedded)document.body.classList.add('custom-embedded');
  MapWorkspace.tabs(document.querySelector('.map-tabs'));
  MapWorkspace.addIcons();
  let saved;
  try{
    const draft=await DraftStore.load(draftId);
    if(!draft?.project)throw Error('找不到地图草稿，请从地图页打开编辑器。');
    saved=draft;
  }catch(error){feedback.textContent=error.message;return;}
  const {project,target}=saved;
  // 正式版传来的只读画面快照：编辑页据此还原初始镜头、氛围与可见元素。
  const viewState=saved.viewState??null;
  const back=new URL(saved.back,location.href);
  // 编辑页与地图页同属一个分享链接，返回时保留查询参数。
  if(!back.search&&location.search)back.search=location.search;
  if(back.origin===location.origin)$('draft-back').href=back;
  let base;
  try{base=MapDraft.records(project.placement);}
  catch(error){feedback.textContent=error.message;return;}
  const baseIds=new Set(base.map(entry=>entry.id));
  // 正式版不会把出生点 / 灯光 / 雾效实体画成方块，编辑页初始同样隐藏，
  // 避免打开后出现突兀的默认紫色块；仍保留在导出清单里，可通过按钮显示并编辑。
  const fxTypes=new Set(['1102015001001000','1101008001001082']);
  const hiddenIds=new Set([
    ...base.filter(entry=>fxTypes.has(entry.item.typeId)||entry.item.typeId==='1105000000000027')
      .map(entry=>entry.id),
    ...(project.settings?.spawns??[]).map(spawn=>spawn.id),
    ...(viewState?.hiddenIds??[])
  ]);
  const pieceMaterial=new Map((project.geometry?.pieces??[]).map(piece=>
    [piece.id,piece.material??CampusMaterials.materialKey(piece)]));
  const authoredIds=new Set((project.geometry?.pieces??[]).map(piece=>piece.id));
  const nativePreview=window.CampusNativePreview;
  // 正式版会把元梦内置元件（枯树、屏风等）拆成多块带真实颜色的枝干；
  // 编辑页必须复用同一份拆解，否则会显示成一整块默认淡紫色包围盒。
  function rowsFor(entry,key){
    if(nativePreview&&!authoredIds.has(entry.id)&&!hiddenIds.has(entry.id))
      return nativePreview.expand(MapDraft,entry)
        .map(part=>({...entry,box:nativePreview.toBox(part),key:'plain'}));
    const box=MapDraft.boxFor(entry.item);
    return box?[{...entry,box,key}]:[];
  }
  const newId=()=>'edit-'+(globalThis.crypto?.randomUUID?.()??(Date.now()+'-'+Math.random().toString(36).slice(2)));
  const history=[];
  let edits=(await DraftStore.load(draftId+'/edits').catch(()=>null))??{removed:[],added:[]};
  // 没有视图快照的编辑器（例如 Dust II）沿用原先的全图透视编辑视角。
  const initialMode=viewState?.viewMode??'perspective';
  let records=[],display=[],meshes=[],selected=null,placing=false;
  let cutaway=viewState?.cutaway??false;
  let wireframe=viewState?.wireframe??false;
  let viewMode=initialMode==='follow'?'perspective':initialMode;
  let showHidden=!viewState;
  let revision=0,framed=false;
  let pending=null,renderer,down=null;
  $('draft-body').hidden=false;
  try{renderer=new THREE.WebGLRenderer({antialias:true});}
  catch{feedback.textContent='无法载入 3D 预览，可按 ID 选择及按坐标放置。';}
  const status=$('draft-agent-status');
  const scene=new THREE.Scene();
  const sky=renderer?createMapSky(THREE):null;
  if(sky)scene.add(sky.mesh);
  // 与正式版 campus-view.js 完全一致的世界坐标：米，X=x、Y=高度、Z=y。
  const camera=new THREE.PerspectiveCamera(viewState?.camera?.fov??42,1,.1,1000);
  const bounds=new THREE.Box3();
  const origin=new THREE.Vector3(0,0,0), gridPlane=new THREE.Plane(new THREE.Vector3(0,1,0),0);
  const ray=new THREE.Raycaster();
  const geo=new THREE.BoxGeometry(1,1,1);
  const shared=CampusMaterials.create(THREE);
  const materials=shared.materials;
  shared.setWireframe(wireframe);
  const dummy=new THREE.Object3D();
  const sun=new THREE.DirectionalLight(0x9abddd,.82);
  sun.position.set(-105,85,35);
  const ambient=new THREE.HemisphereLight(0xb4cbdc,0x655473,1.05);
  scene.add(sun,ambient);
  if(renderer&&viewState){
    const fog=viewState.camera?.fog;
    scene.fog=new THREE.Fog(fog?.color??YuanmengSkyboxes.find(viewState.skyboxId).fog,
      fog?.near??(project.atmosphere?.profile?.fogNearCm??11000)/100,
      fog?.far??(project.atmosphere?.profile?.fogFarCm??76000)/100);
    for(const light of viewState.lights??[]){
      const halo=new THREE.Sprite(new THREE.SpriteMaterial({map:shared.haloTexture,color:light.color,
        transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,opacity:.47}));
      halo.position.set(light.x,light.z-.18,light.y);
      halo.scale.set(5,5,1);
      scene.add(halo);
      const point=new THREE.PointLight(light.color,1.42,light.distance,2);
      point.position.copy(halo.position);
      scene.add(point);
    }
    const marker=(geometry,color)=>new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color}));
    const player=new THREE.Group();
    const body=marker(new THREE.CylinderGeometry(.52,.6,2.05,14),0xd88c6a);
    body.scale.z=1.85;body.position.y=1.05;
    const head=marker(new THREE.SphereGeometry(.48,12,8),0xffdf9c);
    head.position.y=2.42;
    player.add(body,head);
    player.position.set(viewState.x,viewState.z,viewState.y);
    scene.add(player);
    const next=viewState.stations?.[viewState.stage];
    if(next){
      const ring=marker(new THREE.RingGeometry(2.05,2.48,32),0xe5ba80);
      ring.rotation.x=-Math.PI/2;
      ring.position.set(next.x,.23,next.y);
      scene.add(ring);
    }
  }
  const orbit=renderer?new THREE.OrbitControls(camera,renderer.domElement):null;
  if(orbit){
    orbit.enableDamping=false;
    orbit.minDistance=9;orbit.maxDistance=790;orbit.maxPolarAngle=Math.PI*.48;
  }
  const labelLayer=$('draft-labels');
  const pins=(viewState?.stations??[]).map((point,index)=>{
    const pin=document.createElement('span');
    pin.textContent=point.label;
    pin.classList.toggle('active',index===viewState?.stage);
    labelLayer.append(pin);
    return pin;
  });
  function fit(){
    if(!renderer||!stage.clientHeight)return;
    camera.aspect=stage.clientWidth/stage.clientHeight;camera.updateProjectionMatrix();
    renderer.setSize(stage.clientWidth,stage.clientHeight,false);render();
  }
  function render(){
    if(!renderer)return;
    sky.followCamera(camera);
    renderer.render(scene,camera);
    if(pins.length){
      const w=stage.clientWidth,h=stage.clientHeight;
      viewState.stations.forEach((point,i)=>{
        const v=new THREE.Vector3(point.x,6.5,point.y).project(camera);
        pins[i].hidden=v.z<-1||v.z>1;
        pins[i].style.left=(v.x+1)*w/2+'px';
        pins[i].style.top=(1-v.y)*h/2+'px';
      });
    }
  }
  const skyPicker=YuanmengSkyboxes.bind($('draft-skybox'),{key:'map-draft-skybox-'+draftId,
    initial:viewState?.skyboxId??project.atmosphere?.skybox?.displayId??project.placement?.skybox?.displayId??1,fallback:1,
    onChange(profile){sky?.setProfile(profile);ambient.color.setHex(profile.ambient);sun.color.setHex(profile.light);sun.intensity=profile.intensity;
      if(scene.fog)scene.fog.color.setHex(profile.fog);
      if(!renderer)stage.style.background='#'+profile.ground.toString(16).padStart(6,'0');
      else{renderer.setClearColor(profile.ground);render();}}});
  if(renderer){
    renderer.domElement.className='map-canvas';
    renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
    stage.prepend(renderer.domElement);
    orbit.addEventListener('change',render);
    new ResizeObserver(fit).observe(stage);fit();
    function animateSky(){if(sky.animating)render();requestAnimationFrame(animateSky);}
    requestAnimationFrame(animateSky);
  }
  // 有快照时直接复用正式版的镜头，不再强制拉成全图。
  if(orbit&&viewState?.camera){
    camera.fov=viewState.camera.fov??42;
    camera.position.fromArray(viewState.camera.position);
    orbit.target.fromArray(viewState.camera.target);
    camera.updateProjectionMatrix();
    orbit.update();
    framed=true;
  }
  $('draft-download').disabled=false;
  const note=$('draft-note');
  if(note)note.textContent=viewState
    ?'临时草稿：初始画面已与正式版同步；此后编辑只作用于当前草稿，不会改动正式版，确认导出 JSON 后才形成新工程。'
    :'临时草稿：编辑只作用于当前草稿，确认导出 JSON 后才形成新工程。';
  const color=(box,highlight)=>highlight?0x8556b1:((box.color.r<<16)|(box.color.g<<8)|box.color.b);
  function setInstance(row){
    const {size,offset,position,rotation}=row.box;
    const degrees=THREE.MathUtils.degToRad,m=.01;
    // 与正式版一致：Z 使用正向的地图 y，因此 yaw 取负；厘米统一换算成米。
    dummy.rotation.set(degrees(rotation.roll??0),-degrees(rotation.yaw??0),degrees(rotation.pitch??0),'YXZ');
    const rotatedOffset=new THREE.Vector3(offset[0]*m,offset[2]*m,offset[1]*m).applyEuler(dummy.rotation);
    dummy.position.set(position[0]*m,position[2]*m,position[1]*m).add(rotatedOffset);
    dummy.scale.set(size[0]*m,size[2]*m,size[1]*m);
    dummy.updateMatrix();
    row.mesh.setMatrixAt(row.index,dummy.matrix);
    row.mesh.setColorAt(row.index,new THREE.Color(color(row.box,row.id===selected)));
    const box=new THREE.Box3().setFromPoints([new THREE.Vector3(-.5,-.5,-.5),new THREE.Vector3(.5,.5,.5)]).applyMatrix4(dummy.matrix);
    bounds.union(box);
  }
  function frame(){
    if(!orbit)return;
    const size=Math.max(16,bounds.getSize(new THREE.Vector3()).length());
    if(bounds.isEmpty())orbit.target.copy(origin);else bounds.getCenter(orbit.target);
    const half=THREE.MathUtils.degToRad(camera.fov/2);
    const angle=Math.min(half,Math.atan(Math.tan(half)*camera.aspect));
    const offset=viewMode==='top'?new THREE.Vector3(0,1,.00001):new THREE.Vector3(.64,.8,1);
    camera.position.copy(orbit.target).add(offset.normalize().multiplyScalar(size*.58/Math.sin(angle)));
    orbit.update();
  }
  function show(){
    const removed=new Set(edits.removed);
    records=base.concat(edits.added).filter(entry=>!removed.has(entry.id));
    if(selected&&!records.some(entry=>entry.id===selected))selected=null;
    for(const mesh of meshes){scene.remove(mesh);mesh.dispose();}
    meshes=[];display=[];
    bounds.makeEmpty();
    const batches=new Map();
    for(const entry of records){
      if(cutaway&&entry.roof)continue;
      if(!showHidden&&hiddenIds.has(entry.id))continue;
      const key=pieceMaterial.get(entry.id)??'plain';
      for(const row of rowsFor(entry,key)){
        display.push(row);
        if(!batches.has(row.key))batches.set(row.key,[]);
        batches.get(row.key).push(row);
      }
    }
    if(renderer){
      for(const [key,rows] of batches){
        const mesh=new THREE.InstancedMesh(geo,shared.resolve(key),rows.length);
        mesh.userData.rows=rows;
        rows.forEach((row,i)=>{row.mesh=mesh;row.index=i;setInstance(row);});
        mesh.instanceMatrix.needsUpdate=true;
        if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
        scene.add(mesh);meshes.push(mesh);
      }
    }
    $('draft-map').textContent=project.name+' · '+records.length+' 个元件';
    if(customEmbedded)window.parent.postMessage({type:'workshop-draft-ready',count:records.length,draftId},location.origin);
    $('draft-roofs').hidden=!records.some(entry=>entry.roof);
    $('draft-roofs').setAttribute('aria-pressed',String(cutaway));
    $('draft-undo').disabled=!history.length;
    selection(false);
    if(renderer&&!framed){frame();framed=true;}
    render();
  }
  function selection(updateColors=true,message=''){
    const entry=records.find(entry=>entry.id===selected);
    $('draft-id').value=entry?.id??'';
    $('draft-delete').disabled=!entry;
    const info=entry?MapDraft.boxFor(entry.item):null;
    const position=entry?.item.transform.location;
    $('draft-selection').textContent=message||(entry?
      (info?.asset.name??entry.item.typeId)+' · '+[position.x,position.y,position.z].join(' / ')+' cm':'');
    if(updateColors&&meshes.length){
      for(const row of display)row.mesh.setColorAt(row.index,new THREE.Color(color(row.box,row.id===selected)));
      for(const mesh of meshes)if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
      render();
    }
  }
  function select(id){
    selected=records.some(entry=>entry.id===id)?id:null;
    selection(true,id&&!selected?'找不到此元件。':'');
  }
  function save(){
    DraftStore.save(draftId+'/edits',edits).catch(error=>{feedback.textContent='草稿暂存失败：'+error.message;});
  }
  function commit(next,message){
    history.push(edits);
    edits=next;revision++;save();show();feedback.textContent=message;
  }
  function add(item){
    const entry={id:newId(),item,roof:false};
    selected=entry.id;
    commit({...edits,added:edits.added.concat(entry)},'已放置 '+MapDraft.assets.get(item.typeId).name+'。');
  }
  function remove(){
    if(!selected)return;
    const nextId=selected;selected=null;
    const next=baseIds.has(nextId)?{...edits,removed:edits.removed.concat(nextId)}:{...edits,added:edits.added.filter(e=>e.id!==nextId)};
    commit(next,'已删除选中元件。');
  }
  function value(id){
    const v=$(id).valueAsNumber;
    if(!Number.isFinite(v))throw Error('请填写有效的坐标与朝向。');
    return v;
  }
  function place(location){
    try{
      add(MapDraft.nativeItem($('draft-asset').value,location,value('draft-yaw')));
    }catch(error){feedback.textContent=error.message;}
  }
  function placementMode(on){
    placing=on;
    stage.toggleAttribute('data-placing',on);
    $('draft-place').setAttribute('aria-pressed',String(on));
    $('draft-pick').setAttribute('aria-pressed',String(!on));
  }
  if(renderer){
    const canvas=renderer.domElement;
    canvas.addEventListener('pointerdown',event=>{
      if(event.button===0)down=[event.clientX,event.clientY,event.pointerId];
    });
    canvas.addEventListener('pointercancel',()=>{down=null;});
    canvas.addEventListener('pointerup',event=>{
      if(!down||event.pointerId!==down[2])return;
      const moved=Math.hypot(event.clientX-down[0],event.clientY-down[1]);
      down=null;if(moved>5)return;
      const r=canvas.getBoundingClientRect();
      ray.setFromCamera(new THREE.Vector2((event.clientX-r.left)/r.width*2-1,1-(event.clientY-r.top)/r.height*2),camera);
      const hit=meshes.length?ray.intersectObjects(meshes,false)[0]:null;
      const picked=hit?hit.object.userData.rows[hit.instanceId]:null;
      if(!placing){select(picked?.id??null);return;}
      const point=hit?.point??ray.ray.intersectPlane(gridPlane,new THREE.Vector3());
      if(!point){feedback.textContent='未点中放置平面。';return;}
      const asset=MapDraft.assets.get($('draft-asset').value);
      if(!asset){feedback.textContent='请先选择内置元件。';return;}
      const lift=Number.isFinite(asset.size[2])&&Number.isFinite(asset.offset[2])?asset.size[2]/2-asset.offset[2]:0;
      const location={x:point.x*100,y:point.z*100,z:point.y*100+lift};
      for(const axis of ['x','y','z'])$('draft-'+axis).value=Math.round(location[axis]*10)/10;
      place(location);
    });
  }else $('draft-place').disabled=true;
  $('draft-place').onclick=()=>placementMode(!placing);
  $('draft-pick').onclick=()=>placementMode(false);
  $('draft-delete').onclick=remove;
  $('draft-select-id').onclick=()=>select($('draft-id').value.trim());
  $('draft-place-coord').onclick=()=>{
    try{place({x:value('draft-x'),y:value('draft-y'),z:value('draft-z')});}
    catch(error){feedback.textContent=error.message;}
  };
  $('draft-undo').onclick=()=>{
    edits=history.pop();revision++;save();show();feedback.textContent='已撤销上一步编辑。';
  };
  for(const button of stage.querySelectorAll('[data-view]')){
    button.disabled=!renderer;
    button.setAttribute('aria-pressed',String(viewMode===button.dataset.view));
    button.onclick=()=>{
      viewMode=button.dataset.view;wireframe=viewMode==='wire';
      shared.setWireframe(wireframe);
      for(const b of stage.querySelectorAll('[data-view]'))b.setAttribute('aria-pressed',String(b===button));
      frame();render();
    };
  }
  $('draft-roofs').onclick=()=>{
    cutaway=!cutaway;
    $('draft-roofs').setAttribute('aria-pressed',String(cutaway));show();
  };
  const hiddenButton=$('draft-hidden');
  if(hiddenButton){
    hiddenButton.disabled=!hiddenIds.size;
    hiddenButton.setAttribute('aria-pressed',String(showHidden));
    hiddenButton.onclick=()=>{
      showHidden=!showHidden;
      hiddenButton.setAttribute('aria-pressed',String(showHidden));
      show();
    };
  }
  const assetSelect=$('draft-asset');
  const categorySelect=$('draft-category'), modeSelect=$('draft-mode');
  const modeNames={'2d':'2D','3d':'3D',creative:'创作',home:'家园',openworld:'开放世界',pvp:'对战',td:'塔防'};
  const searchable=MapDraft.catalog.map(asset=>({asset,text:[asset.name,asset.typeId,asset.category,asset.subcategory].filter(Boolean).join(' ').toLowerCase()}));
  for(const category of [...new Set(MapDraft.catalog.map(asset=>asset.category))].filter(Boolean).sort((a,b)=>a.localeCompare(b,'zh-CN')))
    categorySelect.add(new Option(category,category));
  for(const mode of [...new Set(MapDraft.catalog.flatMap(asset=>asset.modes??[]))].sort())
    modeSelect.add(new Option(modeNames[mode]??mode,mode));
  const pageSize=60;
  let assetPage=0;
  function fillAssets(){
    const words=$('draft-search').value.trim().toLowerCase().split(/\s+/).filter(Boolean), previous=assetSelect.value;
    const category=categorySelect.value,mode=modeSelect.value;
    const list=searchable.filter(({asset,text})=>(!category||asset.category===category)&&
      (!mode||asset.modes?.includes(mode))&&words.every(word=>text.includes(word)));
    assetPage=Math.min(assetPage,Math.max(Math.ceil(list.length/pageSize)-1,0));
    const from=assetPage*pageSize, to=Math.min(from+pageSize,list.length);
    const rows=list.slice(from,to);
    assetSelect.replaceChildren(...rows.map(({asset})=>new Option(asset.name+' · '+asset.category,asset.typeId)));
    if(rows.some(({asset})=>asset.typeId===previous))assetSelect.value=previous;
    $('draft-assets-prev').disabled=assetPage===0;
    $('draft-assets-next').disabled=to>=list.length;
    $('draft-assets-count').textContent=list.length?(from+1)+'–'+to+' / '+list.length.toLocaleString('zh-CN'):'0 项';
    assetDetails();
  }
  function assetDetails(){
    const asset=MapDraft.assets.get(assetSelect.value);
    const size=asset?.size.map(n=>Number.isFinite(n)?n:'未知').join(' × ');
    $('draft-asset-size').textContent=asset?[asset.typeId,asset.subcategory,size+' cm'].filter(Boolean).join(' · '):'未找到对应元件';
    $('draft-place-coord').disabled=!asset;
    $('draft-place').disabled=!asset||!renderer;
    if(!asset)placementMode(false);
  }
  const resetAssetPage=()=>{assetPage=0;fillAssets();};
  $('draft-search').oninput=categorySelect.onchange=modeSelect.onchange=resetAssetPage;
  $('draft-assets-prev').onclick=()=>{assetPage--;fillAssets();};
  $('draft-assets-next').onclick=()=>{assetPage++;fillAssets();};
  assetSelect.onchange=assetDetails;fillAssets();
  $('draft-download').onclick=()=>{
    const updated=YuanmengSkyboxes.withPreset(MapDraft.apply(project,records),skyPicker.id);
    DraftStore.download(target==='placement'?updated.placement:updated,project.map+(target==='placement'?'-placement.json':'-map-project.json'));
    feedback.textContent='已导出 '+records.length+' 个元件。';
  };

  function clearAgent(){
    pending=null;
    $('draft-apply-agent').disabled=true;
  }
  $('draft-agent-form').onsubmit=async event=>{
    event.preventDefault();clearAgent();
    const send=$('draft-send');send.disabled=true;
    const snapshotRevision=revision;
    try{
      const endpoint=new URL($('draft-endpoint').value);
      const loopback=['localhost','127.0.0.1','[::1]'].includes(endpoint.hostname);
      if(!(endpoint.protocol==='https:'||endpoint.protocol==='http:'&&loopback)||endpoint.username||endpoint.password)
        throw Error('请输入 HTTPS 地址或本机 HTTP 地址。');
      const task=$('draft-task').value.trim();if(!task)throw Error('请填写任务。');
      const updated=YuanmengSkyboxes.withPreset(MapDraft.apply(project,records),skyPicker.id);
      status.textContent='正在向 '+endpoint.host+' 发送当前地图…';
      const response=await fetch(endpoint,{method:'POST',redirect:'error',credentials:'omit',
        headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(30000),
        body:JSON.stringify({task,project:updated,entityIds:records.map(entry=>entry.id),catalog:MapDraft.catalog})});
      if(!response.ok)throw Error('Agent 返回 HTTP '+response.status);
      const patch=await response.json();
      const removeIds=patch?.removeIds??[], additions=patch?.add??[];
      const currentIds=new Set(records.map(entry=>entry.id));
      if(!Array.isArray(removeIds)||!Array.isArray(additions)||removeIds.some(id=>!currentIds.has(id))||
         (!Object.hasOwn(patch,'removeIds')&&!Object.hasOwn(patch,'add')))throw Error('Agent 返回的编辑格式或元件 ID 不正确。');
      const unique=[...new Set(removeIds)];
      const added=additions.map(item=>({id:newId(),
        item:MapDraft.nativeItem(item?.typeId,item?.location,item?.yaw??0),roof:false}));
      if(snapshotRevision!==revision)throw Error('发送后地图已修改，请重新发送以同步。');
      pending={revision,unique,added};
      $('draft-apply-agent').disabled=!unique.length&&!added.length;
      status.textContent='Agent 返回 '+added.length+' 个新增、'+unique.length+' 个删除。';
    }catch(error){status.textContent='Agent 接口调用失败：'+error.message;}
    finally{send.disabled=false;}
  };
  $('draft-apply-agent').onclick=()=>{
    if(!pending||pending.revision!==revision){clearAgent();status.textContent='地图已修改，请重新发送。';return;}
    const removed=new Set(pending.unique);
    commit({removed:[...edits.removed,...pending.unique.filter(id=>baseIds.has(id))],
      added:edits.added.filter(entry=>!removed.has(entry.id)).concat(pending.added)},'已应用 Agent 返回的编辑。');
    clearAgent();status.textContent='已应用。';
  };
  // 只读调试视图：便于核对编辑页初始镜头、材质批次与临时草稿状态。
  window.draftView={camera,scene,
    exportProject(){return YuanmengSkyboxes.withPreset(MapDraft.apply(project,records),skyPicker.id);},
    setCamera(position,target){camera.position.fromArray(position);orbit?.target.fromArray(target);
      camera.updateProjectionMatrix();orbit?.update();render();},
    get cameraTarget(){return orbit?.target.toArray()??null;},
    get batches(){return meshes.map(mesh=>({key:mesh.material===materials.light?'light':mesh.userData.rows[0]?.key,count:mesh.count}));},
    get records(){return records.length;},
    get displayedIds(){return display.map(row=>row.id);},
    get viewState(){return viewState;},
    get hiddenCount(){return hiddenIds.size;},
    get showHidden(){return showHidden;}};
  if(!customEmbedded&&window.WorkshopBridge)WorkshopBridge.buildButton(document.querySelector('.map-actions'),()=>window.draftView.exportProject());
  if(renderer)feedback.textContent='';
  show();
})();
