/* Spawn coordinates use the original Source X/Y/Z axes. */
function createSpawnEditor({scene, camera, renderer, surfaces=[], landmarks=[], initialSpawns, originalSpawns, mount=document.body,
  mapId='de_dust2', units='Source units', neutralOnly=false, onChange=()=>{},
  toScene=([x,y,z])=>new THREE.Vector3(x,z,-y), fromScene=p=>[p.x,-p.z,p.y], markerScale=1}) {
  const storageKey = mapId==='de_dust2'?'dust2-custom-spawns-v1':mapId+'-custom-spawns-v1';
  const panel = document.createElement('section');
  panel.className = 'spawn-panel';
  panel.innerHTML = `<h2>自定义出生点</h2><p id="spawn-count"></p>
    <label>出生点 <select id="spawn-list"></select></label>
    <label>阵营 <select id="spawn-team"><option value="N">${neutralOnly?'剧情玩家':'未分配'}</option>${neutralOnly?'':'<option value="T">T 进攻方</option><option value="CT">CT 防守方</option>'}</select></label>
    <div class="spawn-fields">${['X','Y','Z','朝向'].map((name,i)=>`<label>${name} (${i === 3 ? '°' : units === 'cm' ? 'cm' : 'SU'})<input id="spawn-value-${i}" type="number" step="any" value="0"></label>`).join('')}</div>
    <button id="spawn-apply" data-icon="check">应用修改</button><button id="spawn-add">按坐标新增</button><button id="spawn-delete">删除选中</button>
    <button id="spawn-place" data-icon="spawn">点击地图放置</button><button id="spawn-export" data-icon="export">导出出生点 JSON</button>
    <button id="spawn-reset" data-icon="reset">恢复原地图出生点</button>
    <label>导入配置 <input id="spawn-import" type="file" accept=".json,application/json"></label>
    <p id="spawn-feedback" role="status"></p>`;
  mount.appendChild(panel);
  MapWorkspace.addIcons(panel);
  const el = id => panel.querySelector('#spawn-'+id);
  const originalPoints = originalSpawns ?? MapGuidance.sourceSpawns({landmarks});
  let points = validate(originalPoints);
  function restoreYaw(saved) {
    return saved.map(point => {
      const original = originalPoints.find(p => p.id === point.id && p.team === point.team &&
        p.position.every((value, axis) => value === point.position[axis]));
      return original && point.yaw === 0 ? { ...point, yaw: original.yaw } : point;
    });
  }
  let selected = points[0]?.id || '', placing = false, markers = [];
  const markerGroup = new THREE.Group(); scene?.add(markerGroup);
  function validate(value) {
    if (!Array.isArray(value)) throw Error('出生点列表格式错误');
    const ids = new Set();
    for (const p of value) {
      if (!p || typeof p.id!=='string' || !p.id || ids.has(p.id) || !(neutralOnly?['N']:['T','CT','N']).includes(p.team) || !Array.isArray(p.position) || p.position.length!==3 || !p.position.every(Number.isFinite) || !Number.isFinite(p.yaw)) throw Error('出生点 ID、阵营或坐标无效');
      ids.add(p.id);
    }
    return value.map(p=>({id:p.id,team:p.team,position:[...p.position],yaw:p.yaw}));
  }
  function save() {
    try { localStorage.setItem(storageKey,JSON.stringify(points)); el('feedback').textContent='已自动保存在当前浏览器'; }
    catch { el('feedback').textContent='浏览器无法保存，请导出 JSON 保留配置'; }
  }
  function fields() {
    const p=points.find(p=>p.id===selected);
    el('apply').disabled=el('delete').disabled=!p;
    if (!p) return;
    el('team').value=p.team;
    [...p.position,p.yaw].forEach((n,i)=>el('value-'+i).value=n);
  }
  function render() {
    markerGroup.traverse(o=>{if(o.isMesh&&o.userData.spawnId){o.geometry.dispose();o.material.dispose()}else if(o.type==='ArrowHelper'){o.line.material.dispose();o.cone.material.dispose()}});
    markerGroup.clear();markers=[];
    el('list').replaceChildren();
    points.forEach((p,i)=>{
      const option=new Option(`${neutralOnly?'玩家':p.team} · ${i+1}`,p.id);el('list').add(option);
      const marker=new THREE.Mesh(new THREE.SphereGeometry((p.id===selected?22:14)*markerScale,12,8),new THREE.MeshBasicMaterial({color:p.team==='T'?0xff9944:0x4488ff,depthTest:false}));
      marker.position.copy(toScene(p.position));marker.position.y+=36*markerScale;marker.renderOrder=10;marker.userData.spawnId=p.id;
      markerGroup.add(marker);markers.push(marker);
      const angle=p.yaw*Math.PI/180;
      const direction=toScene([Math.cos(angle),Math.sin(angle),0]).normalize();
      markerGroup.add(new THREE.ArrowHelper(direction,marker.position,85*markerScale,p.team==='T'?0xff9944:0x4488ff));
    });
    el('list').value=selected;
    el('count').textContent=neutralOnly?`共 ${points.length} 个`:`T ${points.filter(p=>p.team==='T').length} 个 · CT ${points.filter(p=>p.team==='CT').length} 个 · 未分配 ${points.filter(p=>p.team==='N').length} 个 · 共 ${points.length} 个`;
    fields();
    onChange();
  }
  function readFields() {
    const values=[0,1,2,3].map(i=>el('value-'+i).value.trim());
    if(values.some(v=>v===''||!Number.isFinite(Number(v))))throw Error('请填写有效的坐标和朝向');
    return {team:el('team').value,position:values.slice(0,3).map(Number),yaw:Number(values[3])};
  }
  function change(action) {
    try {action();render();save()} catch(error){el('feedback').textContent=error.message}
  }
  function add(value){const p={id:'spawn-'+Date.now()+'-'+Math.random().toString(36).slice(2),...value};points.push(p);selected=p.id}
  el('list').onchange=()=>{selected=el('list').value;render()};
  el('apply').onclick=()=>change(()=>Object.assign(points.find(p=>p.id===selected),readFields()));
  el('add').onclick=()=>change(()=>add(readFields()));
  el('delete').onclick=()=>change(()=>{points=points.filter(p=>p.id!==selected);selected=points[0]?.id||''});
  el('place').onclick=()=>{placing=!placing;MapWorkspace.decorate(el('place'),'spawn',placing?'取消地图放置':'点击地图放置');el('feedback').textContent=placing?'单击地图表面添加出生点，可连续放置。拖动仍可旋转视角。':''};
  const raycaster=new THREE.Raycaster();let down=null;
  el('place').disabled=!renderer;
  renderer?.domElement.addEventListener('pointerdown',event=>{if(event.button===0)down=[event.clientX,event.clientY]});
  renderer?.domElement.addEventListener('pointerup',event=>{
    if(event.button!==0||!down)return;
    const distance=Math.hypot(event.clientX-down[0],event.clientY-down[1]);down=null;if(distance>5)return;
    const rect=renderer.domElement.getBoundingClientRect();
    raycaster.setFromCamera(new THREE.Vector2((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1),camera);
    if(placing){
      const hit=raycaster.intersectObjects(surfaces.filter(mesh=>mesh.visible),false)[0];
      if(!hit){el('feedback').textContent='未点中地图表面';return}
      change(()=>{const value=readFields();value.position=fromScene(hit.point).map(v=>Math.round(v*1000)/1000);add(value)});
    }else{
      const hit=raycaster.intersectObjects(markers,false)[0];if(hit){selected=hit.object.userData.spawnId;render()}
    }
  });
  el('export').onclick=()=>{
    const data={schema:'dust2-spawns-v1',map:mapId,units,axes:'X,Y horizontal; Z up',spawns:points};
    const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
    const link=document.createElement('a');link.href=url;link.download=mapId+'-spawns.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  el('import').onchange=async event=>{
    const file=event.target.files[0];if(!file)return;
    try{const data=JSON.parse(await file.text());if(data.schema!=='dust2-spawns-v1'||data.map!==mapId||data.units!==units)throw Error('请选择此编辑器导出的出生点配置');const next=validate(data.spawns);points=next;selected=points[0]?.id||'';render();save()}
    catch(error){el('feedback').textContent='导入失败：'+error.message}finally{event.target.value=''}
  };
  el('reset').onclick = () => {
    points = validate(originalPoints);
    selected = points[0]?.id || '';
    render();
    save();
    el('feedback').textContent = '已恢复原地图出生点及朝向';
  };
  try{const saved=localStorage.getItem(storageKey);if(initialSpawns){points=restoreYaw(validate(initialSpawns));selected=points[0]?.id||''}else if(saved){points=restoreYaw(validate(JSON.parse(saved)));selected=points[0]?.id||''}}
  catch{el('feedback').textContent='本地配置读取失败，已显示原图出生点'}
  render();
  return {getSpawns:()=>validate(points), getSelected:()=>points.find(p=>p.id===selected), validate,
    setSpawns(value){points=validate(value);selected=points[0]?.id||'';render();save()}};
}
