(() => {
  const plan=window.campusPlan, view=window.campusView;
  const $=selector=>document.querySelector(selector);
  const route=$('#route'), status=$('#status'), puzzle=$('#puzzle'), scare=$('#scare');
  const propList=$('#prop-list'), propStatus=$('#prop-status');
  const movement=$('.map-controls');
  const {action:interact,walk}=MapWorkspace.controlsBar(movement);
  const actionLabel=$('#interact-label');
  interact.setAttribute('aria-describedby','interact-label');
  const views=[...document.querySelectorAll('[data-view]')];
  const held=new Set();
  MapWorkspace.movement(movement,held);
  const vectors={up:[0,-1],left:[-1,0],down:[0,1],right:[1,0]};
  const state={};
  let lastFrame=0,redraw=true,cameraEpoch=0,lastPropId=null;
  let props=[],propStates=new Map();
  const propRadius=4.2;
  const skyPicker=YuanmengSkyboxes.bind($('#campus-skybox'),{key:'midnight-roll-call-skybox',onChange:sky=>{
    state.skyboxId=sky.id;redraw=true;
  }});
  const data=window.CampusScene;
  const spawnEditor=createSpawnEditor({...view, mount:$('#campus-spawns'), mapId:'midnight-roll-call', units:'cm', neutralOnly:true,
    originalSpawns:data.defaultSpawns, markerScale:.025, toScene:([x,y,z])=>new THREE.Vector3(x/100,z/100,y/100),
    fromScene:p=>[p.x*100,p.z*100,p.y*100], onChange:()=>{redraw=true}});

  const effects={
    pull:{dy:.9,color:0x96795e},lift:{dz:.28,color:0xbba182},slide:{dx:.75,color:0xc7b699},
    flip:{dz:.06,color:0xc79a6f},wipe:{color:0x4d6e63},read:{color:0xd8c9a6},
    light:{color:0xf7e0a2},open:{dx:.55,color:0x8d938b}
  };
  function collectProps(){
    props=data.previewPieces().filter(piece=>piece.interactive).map(piece=>({
      id:piece.id,label:piece.interactive.label,verb:piece.interactive.verb,
      message:piece.interactive.message,effect:piece.interactive.effect,
      x:piece.positionCm.x/100,y:piece.positionCm.y/100
    }));
    propStates=new Map();
    lastPropId=null;
    renderProps();
  }
  function propDistance(prop){return Math.hypot(state.x-prop.x,state.y-prop.y);}
  function nearbyProp(){
    let best=null,distance=propRadius;
    for(const prop of props){
      const d=propDistance(prop);
      if(d<distance){best=prop;distance=d;}
    }
    return best;
  }
  function renderProps(){
    const used=props.filter(prop=>propStates.get(prop.id));
    const near=props.filter(prop=>!propStates.get(prop.id)&&propDistance(prop)<=propRadius)
      .sort((a,b)=>propDistance(a)-propDistance(b));
    propStatus.textContent='已查看 '+used.length+' / '+props.length;
    const rows=[...used,...near].slice(0,8).map(prop=>{
      const li=document.createElement('li');
      const button=document.createElement('button');
      button.type='button';
      button.textContent=prop.verb+' · '+prop.label;
      button.disabled=propDistance(prop)>propRadius||Boolean(state.puzzleOpen)||scare.open;
      button.addEventListener('click',()=>useProp(prop));
      const badge=document.createElement('span');
      badge.className='prop-state';
      badge.textContent=propStates.get(prop.id)?'已查看':'附近';
      li.append(button,badge);
      return li;
    });
    propList.replaceChildren(...rows);
  }
  function useProp(prop){
    if(propDistance(prop)>propRadius||state.puzzleOpen||scare.open)return;
    const on=!propStates.get(prop.id);
    propStates.set(prop.id,on);
    view.setPieceState(prop.id,on?effects[prop.effect]??effects.read:null);
    view.focusPiece(on?prop.id:null);
    status.textContent=on?prop.message:'物件回到了原位。';
    renderProps();
    sync();
  }
  const routeItems=plan.points.map(point=>{
    const li=document.createElement('li');
    const icon=document.createElement('span');
    icon.className='route-icon';
    icon.setAttribute('aria-hidden','true');
    icon.textContent=point.icon;
    const check=document.createElement('span');
    check.className='route-check';
    li.append(icon,point.label,check);
    route.append(li);
    return [li,check];
  });
  for(const sw of plan.puzzle) {
    const button=document.createElement('button');
    button.type='button';
    button.textContent=sw.icon+' '+sw.label;
    button.style.setProperty('--switch',sw.color);
    button.addEventListener('click',()=>pressSwitch(sw.id));
    puzzle.append(button);
  }
  function pointDistance(point) {
    return Math.hypot(state.x-point.x,state.y-point.y);
  }
  function atStation() {
    const next=plan.points[state.stage];
    return Boolean(next && pointDistance(next)<3.5);
  }
  function sync() {
    routeItems.forEach(([li,check],i)=>{
      li.classList.toggle('done',i<state.stage);
      if(i===state.stage) li.setAttribute('aria-current','step');
      else li.removeAttribute('aria-current');
      check.textContent=i<state.stage?'✓':'';
      check.setAttribute('aria-label',i<state.stage?'已完成':'');
    });
    const next=plan.points[state.stage];
    const station=atStation();
    const prop=station?null:nearbyProp();
    const label=state.puzzleOpen?'':station?next.action:prop?prop.verb+' · '+prop.label:'';
    actionLabel.textContent=label;
    actionLabel.hidden=!actionLabel.textContent;
    interact.title=label;
    interact.disabled=!(station||prop) || state.puzzleOpen || scare.open;
    puzzle.hidden=!state.puzzleOpen;
    for(const button of puzzle.children) button.disabled=!atStation();
    walk.disabled=!next || atStation() || scare.open;
    MapWorkspace.decorate(walk,state.waypoints.length?'pause':'walk',state.waypoints.length?'停止移动':'沿路线移动');
    for(const button of views) {
      button.disabled=!view.has3D;
      button.setAttribute('aria-pressed',String(state.viewMode===button.dataset.view));
    }
    $('#campus-cutaway').setAttribute('aria-pressed',String(state.cutaway));
    renderProps();
    redraw=true;
  }
  function reset() {
    if(scare.open) scare.close();
    held.clear();
    for(const prop of props) if(propStates.get(prop.id)) view.setPieceState(prop.id,null);
    propStates=new Map();
    view.focusPiece(null);
    lastPropId=null;
    const spawn=spawnEditor.getSelected();
    const [x,y,z]=spawn?.position??[plan.points[0].x*100,plan.points[0].y*100,22];
    const valid=plan.hasClearance(x/100,y/100,view.obstacles(0));
    Object.assign(state,{x:valid?x/100:plan.points[0].x,y:valid?y/100:plan.points[0].y,z:valid?z/100:.22,
      stage:0,scared:false,matched:0,puzzleOpen:false,waypoints:[],viewMode:view.has3D?'follow':'perspective',cutaway:false,cameraEpoch:++cameraEpoch,focusModule:null});
    state.skyboxId=skyPicker.id;
    status.textContent='校园门前，值班室的灯还亮着。';
    if(!valid) status.textContent='选中出生点净空不足，已从校门开始网页走查。';
    sync();
  }
  function finishPoint() {
    status.textContent=plan.points[state.stage].message;
    state.stage++;
    state.puzzleOpen=false;
    state.waypoints=[];
    sync();
  }
  function activate() {
    if(state.puzzleOpen || scare.open) return;
    if(atStation()) {
      if(plan.points[state.stage].id==='broadcast') {
        state.puzzleOpen=true;
        status.textContent='广播台亮起了三个开关。值班条上写着「蓝、黄、绿」。';
        sync();
        puzzle.firstElementChild.focus();
      } else finishPoint();
      return;
    }
    const prop=nearbyProp();
    if(prop)useProp(prop);
  }
  function pressSwitch(id) {
    if(!state.puzzleOpen || !atStation()) return;
    if(plan.solution[state.matched]!==id) {
      state.matched=0;
      status.textContent='广播台发出一阵杂音。开关已复位。';
      return;
    }
    state.matched++;
    if(state.matched===plan.solution.length) finishPoint();
    else status.textContent='广播台通电进度 '+state.matched+' / '+plan.solution.length;
  }
  function clearLine(from,target,obstacles) {
    const distance=Math.hypot(target[0]-from[0],target[1]-from[1]);
    const samples=Math.ceil(distance/.25);
    for(let i=1;i<=samples;i++) {
      const t=i/samples;
      if(!plan.hasClearance(from[0]+(target[0]-from[0])*t,from[1]+(target[1]-from[1])*t,obstacles)) return false;
    }
    return true;
  }
  function walkAlongRoute() {
    if(state.waypoints.length) {state.waypoints=[];sync();return;}
    const leg=state.stage===0?[[state.x,state.y],[plan.points[0].x,plan.points[0].y]]:plan.legs[state.stage-1];
    if(!leg || atStation()) return;
    const start=[state.x,state.y], obstacles=view.obstacles(state.stage);
    let best=null;
    for(let i=1;i<leg.length;i++){
      const [ax,ay]=leg[i-1], [bx,by]=leg[i], dx=bx-ax, dy=by-ay;
      const t=Math.max(0,Math.min(1,((state.x-ax)*dx+(state.y-ay)*dy)/(dx*dx+dy*dy)));
      const target=[ax+dx*t,ay+dy*t], distance=Math.hypot(state.x-target[0],state.y-target[1]);
      if((!best || distance<best.distance) && clearLine(start,target,obstacles)) best={distance,path:[target,...leg.slice(i)]};
    }
    if(best){
      state.waypoints=best.path;
      if(state.viewMode==='follow')state.cutaway=true;
    }
    else status.textContent='需要先走回灯带旁，才能沿路线移动。';
    sync();
  }
  function move(dx,dy) {
    const obstacles=view.obstacles(state.stage);
    const x=state.x,y=state.y;
    if(plan.hasClearance(x+dx,y,obstacles)) state.x+=dx;
    if(plan.hasClearance(state.x,y+dy,obstacles)) state.y+=dy;
    if(x===state.x && y===state.y) return false;
    state.z=.22;
    const trap=plan.scare;
    if(plan.points[state.stage-1]?.id===trap.after && !state.scared && pointDistance(trap)<trap.radius){
      state.scared=true;
      held.clear();
      scare.showModal();
      status.textContent='一个人偶贴到眼前。几秒后，走廊恢复空荡。';
      sync();
    }
    redraw=true;
    return true;
  }
  function advance(delta) {
    let dx=0,dy=0;
    for(const direction of held){dx+=vectors[direction][0];dy+=vectors[direction][1];}
    const norm=Math.hypot(dx,dy);
    if(norm){
      if(state.waypoints.length){state.waypoints=[];sync();}
      move(dx/norm*12*delta,dy/norm*12*delta);
    } else if(state.waypoints.length){
      const [x,y]=state.waypoints[0], remaining=Math.hypot(x-state.x,y-state.y);
      const distance=Math.min(remaining,42*delta);
      if(remaining<.05) {
        state.waypoints.shift();
        if(!state.waypoints.length) sync();
      } else if(distance>0 && !move((x-state.x)/remaining*distance,(y-state.y)/remaining*distance)){
        state.waypoints=[];
        status.textContent='前方被挡住了。';
        sync();
      }
    }
  }
  function step(time) {
    let remaining=lastFrame?Math.min(.24,(time-lastFrame)/1000):0;
    lastFrame=time;
    const ready=atStation();
    while(remaining>0.0001&&!scare.open&&state.stage<plan.points.length){
      const interval=Math.min(.035,remaining);
      advance(interval);
      remaining-=interval;
    }
    const propId=atStation()?null:nearbyProp()?.id??null;
    if(ready!==atStation()||propId!==lastPropId){lastPropId=propId;sync();}
    if(redraw || view.skyAnimating) { view.render(state); redraw=false; }
    requestAnimationFrame(step);
  }
  new ResizeObserver(()=>{redraw=true;}).observe($('#play-field'));
  scare.addEventListener('close',sync);
  $('#reset').addEventListener('click',reset);
  for(const button of views) button.addEventListener('click',()=>{
    state.viewMode=button.dataset.view;
    state.focusModule=null;state.cameraEpoch=++cameraEpoch;
    if(state.viewMode==='follow')state.cutaway=true;
    sync();
  });
  $('#campus-cutaway').onclick=()=>{state.cutaway=!state.cutaway;sync();};
  function renderModuleList(){
    const list=$('#campus-module-list');list.replaceChildren();
    $('#campus-modules').hidden=!view.has3D||!data.modules.length;
    for(const module of data.modules){
      const button=document.createElement('button');button.type='button';button.textContent=module.name;
      button.onclick=()=>{
        state.viewMode='perspective';state.focusModule=module.positionCm;state.cameraEpoch=++cameraEpoch;
        state.cutaway=true;sync();
        $('#play-field').scrollIntoView({block:'nearest'});
      };
      list.append(button);
    }
  }
  const projectStatus=$('#campus-project-status');
  // 打开临时编辑页时，把正式版「此刻看到的画面」一并打包过去。
  // 编辑页用这份快照初始化，之后的所有改动都只落在临时草稿层，不回写正式版。
  function captureViewState(){
    return {
      x:state.x,y:state.y,z:state.z,stage:state.stage,
      skyboxId:state.skyboxId,viewMode:state.viewMode,cutaway:state.cutaway,
      wireframe:state.viewMode==='wire',
      camera:typeof view.snapshot==='function'?view.snapshot():null,
      stations:plan.points.map(point=>({x:point.x,y:point.y,label:point.icon+' '+point.label})),
      lights:data.activeLights().filter(light=>state.stage>=light.phase)
        .map(light=>({x:light.x,y:light.y,z:light.z,color:light.color,distance:light.distance}))
    };
  }
  async function openDraft(target){
    const buttons=['#campus-edit','#campus-export','#campus-placement'].map($);
    buttons.forEach(button=>button.disabled=true);
    projectStatus.textContent='正在载入地图编辑…';
    try{await DraftStore.open(data.makeProject(spawnEditor.getSpawns(),skyPicker.id),target,'story.html',captureViewState());}
    catch(error){projectStatus.textContent='编辑页载入失败：'+error.message;buttons.forEach(button=>button.disabled=false);}
  }
  $('#campus-edit').onclick=$('#campus-export').onclick=()=>openDraft('project');
  $('#campus-placement').onclick=()=>openDraft('placement');
  if(window.WorkshopBridge)WorkshopBridge.buildButton($('#campus-export').parentElement,()=>data.makeProject(spawnEditor.getSpawns(),skyPicker.id));
  $('#campus-import').onchange=async event=>{
    const file=event.target.files[0];if(!file)return;
    try {
      const project=data.readProject(JSON.parse(await file.text()));
      spawnEditor.validate(project.spawns);
      data.setPieces(project.pieces);
      data.setEditedState(project);
      skyPicker.set(project.skyboxId);
      view.rebuild();
      collectProps();
      spawnEditor.setSpawns(project.spawns);
      renderModuleList();reset();
      projectStatus.textContent=project.missing?.length?'已导入地图工程，部分剧情机关需要重新绑定。':'已导入地图工程';
    } catch(error){projectStatus.textContent='导入失败：'+error.message;}
    finally{event.target.value='';}
  };
  MapWorkspace.tabs($('.map-tabs'));
  MapWorkspace.addIcons();
  renderModuleList();
  collectProps();
  walk.addEventListener('click',walkAlongRoute);
  interact.addEventListener('click',activate);
  reset();
  requestAnimationFrame(step);
})();
