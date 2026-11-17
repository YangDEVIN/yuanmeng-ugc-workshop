function createFpsRoutePanel({scene,placement,sites,spawnEditor,container,showPlacement,camera,controls,action,walk,movement,getView}) {
  let strictNav,previewNav,activeNav,route=[],points=[],cursor=null,segment=1,current=null,playing=false,last=0,manualTime=0,detached=false;
  let attempted=false;
  const held=new Set();
  MapWorkspace.movement(movement,held);
  const rate=placement.coordinates.sourceUnitCm;
  const group=new THREE.Group(), flags=new THREE.Group();
  const palette={A:0xa53627,B:0x225b9b};
  const line=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:palette.A,depthTest:false}));
  const marker=new THREE.Mesh(new THREE.CylinderGeometry(42/rate,52/rate,180/rate,10),new THREE.MeshBasicMaterial({color:palette.A}));
  const flagGeometry=new THREE.SphereGeometry(26/rate,8,6);
  const flagMaterial=new THREE.MeshBasicMaterial({color:0xc05b28,depthTest:false});
  line.renderOrder=11;
  group.add(line,marker,flags);
  scene.add(group); group.visible=false;

  const panel=document.createElement('section');
  panel.className='fps-route-panel';
  panel.innerHTML='<div class="map-route-actions"><label>目标 <select><option value="A">A 区</option><option value="B">B 区</option></select></label><button type="button" data-check data-icon="check">检查选中出生点</button></div><p role="status"></p>';
  container.append(panel);
  MapWorkspace.addIcons(panel);
  const site=panel.querySelector('select'), check=panel.querySelector('[data-check]'), status=panel.querySelector('[role=status]');
  const guideText=document.createElement('p');
  guideText.role='status';
  panel.append(guideText);
  const toCm=p=>p.map(v=>v*rate);
  const toPoint=([x,y,z])=>new THREE.Vector3(x/rate,(z+16)/rate,-y/rate);

  function pause(){
    playing=false;
    MapWorkspace.decorate(walk,'walk','沿路线移动');
  }
  function invalidate(keepMovement=false){
    pause();
    if(!keepMovement)held.clear();
    points=[];route=[];cursor=null;current=null;segment=1;attempted=false;
    flags.clear();group.visible=false;walk.disabled=false;status.textContent='';guideText.textContent='';
  }
  function follow(point){
    camera.position.add(point.clone().sub(controls.target));
    controls.target.copy(point);controls.update();
  }
  function setPosition(p){
    marker.position.copy(p); marker.position.y+=90/rate;
    if(getView()==='follow')follow(p);
  }
  function frameRoute(){
    const box=new THREE.Box3().setFromPoints(points);
    box.getCenter(controls.target);
    const halfFov=THREE.MathUtils.degToRad(camera.fov/2);
    const halfAngle=Math.min(halfFov,Math.atan(Math.tan(halfFov)*camera.aspect));
    const distance=Math.max(1200/rate,box.getSize(new THREE.Vector3()).length()*.57/Math.sin(halfAngle));
    const offset=(getView()==='top'?new THREE.Vector3(0,1,.00001):new THREE.Vector3(.55,.9,1)).normalize().multiplyScalar(distance);
    camera.position.copy(controls.target).add(offset);
    controls.update();
  }
  function begin(){
    segment=1;current=points[0].clone();cursor=route[0];detached=false;
    guideText.textContent='';setPosition(current);
  }
  site.onchange=()=>invalidate();
  function checkRoute(keepMovement=false){
    invalidate(keepMovement);
    attempted=true;
    walk.disabled=true;
    const spawn=spawnEditor.getSelected(), target=sites.find(p=>p.id===site.value);
    if(!spawn||!target){status.textContent='请选择出生点和目标区。';return;}
    showPlacement();
    try {
      strictNav??=FpsRoute.build(placement);
      activeNav=strictNav;
      const startCm=toCm(spawn.position),targetCm=toCm(target.position);
      const strict=strictNav.search(startCm,targetCm);
      let result=strict;
      if(strict.status==='blocked'){
        previewNav??=FpsRoute.build(placement,60);
        const preview=previewNav.search(startCm,targetCm);
        if(preview.status==='connected'){result=preview;activeNav=previewNav;}
      }
      const previewOnly=result!==strict;
      route=result.path;
      const rises=route.flatMap((point,i)=>i&&Math.abs(point[2]-route[i-1][2])>FpsRoute.step?[{point,cm:Math.abs(point[2]-route[i-1][2])}]:[]);
      const targetName=target.id+' 区';
      const remaining=result.remainingCm===undefined?'':('，距目标约 '+(result.remainingCm/100).toFixed(1)+' 米');
      const maxRise=Math.max(...rises.map(r=>r.cm),0);
      status.textContent=previewOnly
        ?'可预览至 '+targetName+'附近。橙色点有 '+Math.round(maxRise)+' 厘米以内的高差，超出 40 厘米步行校验。'
        :({
          connected:'网页步行采样连通至 '+targetName+'附近。',
          spawn:'出生点附近缺少可用的地面或净空。',
          site:targetName+'附近缺少可用的地面或净空'+remaining+'。',
          blocked:'路线中断，已标出可达路段'+remaining+'。',
          limit:'到达网页查找上限，已标出当前可达路段'+remaining+'。'
        })[result.status];
      if(!route.length)return;
      points=route.map(toPoint);
      const offset=points[0].distanceTo(toPoint(startCm))*rate;
      if(offset>=10)status.textContent+=' 起点距出生标记 '+(offset/100).toFixed(2)+' 米。';
      const color=previewOnly?0xa95427:palette[target.id];
      line.material.color.setHex(color);
      marker.material.color.setHex(palette[target.id]);
      line.geometry.dispose();
      line.geometry=new THREE.BufferGeometry().setFromPoints(points);
      for(const rise of rises){
        const flag=new THREE.Mesh(flagGeometry,flagMaterial);
        flag.position.copy(toPoint(rise.point));flag.position.y+=40/rate;
        flag.renderOrder=12; flags.add(flag);
      }
      group.visible=true;walk.disabled=points.length<2;
      frameRoute();begin();
    }catch(error){status.textContent='动线检查失败：'+error.message;}
  }
  action.title='检查选中出生点';
  action.disabled=false;
  walk.disabled=false;
  action.onclick=check.onclick=()=>checkRoute();
  walk.onclick=()=>{
    if(playing){pause();return;}
    if(!attempted)checkRoute();
    if(points.length<2)return;
    if(segment>=points.length||detached)begin();
    playing=true;guideText.textContent='';
    MapWorkspace.decorate(walk,'pause','停止移动');
  };
  function update(time){
    const delta=Math.min(.05,(time-last)/1000);
    last=time;
    if(held.size&&!attempted)checkRoute(true);
    if(cursor&&held.size){
      if(playing)pause();
      manualTime+=delta;
      if(manualTime>=.09){
        manualTime=0;
        const dx=Number(held.has('right'))-Number(held.has('left'));
        const dy=Number(held.has('up'))-Number(held.has('down'));
        const next=(dx||dy)?activeNav.move(cursor,dx,dy):null;
        if(next){cursor=next;current=toPoint(cursor);setPosition(current);detached=true;guideText.textContent='';}
      }
    } else if(playing){
      let distance=delta*850/rate;
      while(segment<points.length && distance>0){
        const point=points[segment], remaining=current.distanceTo(point);
        if(remaining<=distance){current.copy(point);distance-=remaining;cursor=route[segment];segment++;}
        else {current.lerp(point,distance/remaining);distance=0;}
      }
      setPosition(current);
      if(segment>=points.length){pause();guideText.textContent='已走查至所标路线终点。';}
    }
    requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
  return {invalidate,follow(){
    if(!current)return;
    controls.target.copy(current);
    camera.position.copy(current).add(new THREE.Vector3(650/rate,950/rate,950/rate));
    controls.update();
  }};
}
