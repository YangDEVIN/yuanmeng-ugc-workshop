(function(root) {
  const plan=root.campusPlan ?? require('./campus-plan').campusPlan;
  const assets=root.CampusAssets ?? require('./campus-assets');
  const draft=root.MapDraft ?? (typeof module==='object'?require('./map-draft'):null);
  const nativePreview=root.CampusNativePreview ?? (typeof module==='object'?require('./campus-native-preview'):null);
  const design=root.CampusDesign ?? require('./campus-design');
  const skyboxes=root.YuanmengSkyboxes ?? require('./campus-skyboxes');
  const blockType='1101008001011363';
  const spawnType='1105000000000027';
  const pieces=[];
  let nativeItems=[],editorEdits=null,missingEntityIds=[],designVersion=design.version,modules=[];
  const fxTypes=new Set(['1102015001001000','1101008001001082']);
  const obstacleCache=new Map();
  const defaultSpawns=[{id:'campus-spawn',team:'N',position:[-6600,8000,22],yaw:270}];
  const cm=value=>Math.round(value*100);
  const snapSize=value=>Math.max(10,Math.round(value*10)*10);
  const rgb=color=>({r:color>>16,g:(color>>8)&255,b:color&255});
  const xy=(x,y,z=0)=>({x:cm(x),y:cm(y),z:cm(z)});
  const sidewalks=0x818070;
  const gates=[
    {id:'broadcast-door', x:60,y:12,w:8,d:.6,h:6.6,color:0x875269, until:4, unlockedBy:'power'},
    {id:'exit-gate', x:41,y:81,w:.6,d:8,h:6.4,color:0x875269, until:5, unlockedBy:'broadcast'}
  ];
  // 稳定伪随机：装饰每次导出完全一致，不用 Math.random。
  const hash=(a,b,k=0)=>{let n=(a*73856093)^(b*19349663)^(k*83492791);n=(n^(n>>>13))*1274126177;return Math.abs(n^(n>>>16))};
  const pick=(list,key)=>list[key%list.length];
  const prop=(label,verb,message,effect)=>({label,verb,message,effect});

  function block(group,x,y,w,d,h,color,{z=0,yaw=0,collider=false,detail=false,id,material,interactive}={}) {
    pieces.push({
      id:id??group+'-'+(pieces.length+1), group, shape:'box', positionCm:xy(x,y,z),
      sizeCm:{x:snapSize(w),y:snapSize(d),z:snapSize(h)}, yaw, color:rgb(color), collider, detail,
      ...(material?{material}:{}), ...(interactive?{interactive}:{})
    });
  }
  // 地面按 20 m 分块，每块指定独立材质，而不是整张地图一个纯色。
  const groundMaterials=['asphalt','concrete','tile','stone','wet'];
  const insideBuilding=(x,y)=>plan.buildings.some(b=>x+10>b.x1&&x-10<b.x2&&y+10>b.y1&&y-10<b.y2);
  for(let ix=0;ix<10;ix++) for(let iy=0;iy<10;iy++){
    const x=-90+ix*20,y=-90+iy*20,isEdge=ix===0||ix===9||iy===0||iy===9;
    const key=hash(ix,iy,7);
    const material=isEdge?'stone':pick(groundMaterials,key);
    const shade=[0x4b5b57,0x607064,0x6d7568,0x42565f,0x716855][key%5];
    block('foundation',x,y,20,20,1.5,shade,{z:-1.5,material});
    if(insideBuilding(x,y)||isEdge)continue;
    // 湿痕、苔斑、裂纹、落叶、试卷、排水格栅：只做视觉层，不参与碰撞。
    if(key%3===0){
      const px=x-6+(key%5),py=y+4-(key%4);
      block('puddle',px,py,7.2,4.6,.03,0x3e6b7a,{z:.02,material:'wet'});
      block('puddle-rim',px+1.4,py-.8,2.6,1.1,.02,0x75a2a5,{z:.04,material:'wet'});
    }
    if(key%5===1){
      block('moss-patch',x+3,y-4,9.5,6.2,.03,0x53714e,{z:.02,yaw:key%28,material:'foliage'});
      block('moss-edge',x-1,y+1,4.2,3.1,.02,0x68835a,{z:.04,material:'foliage'});
    }
    if(key%7===2)block('gravel-patch',x-4,y+5,11,7,.03,0x8b8574,{z:.02,yaw:key%45,material:'stone'});
    if(key%4===1){
      for(let j=0;j<3;j++)
        block('ground-crack',x-7+j*2.1,y-6+j*1.4,1.9,.18,.02,0x30383c,{z:.03,yaw:24+j*17,material:'stone'});
    }
    if(key%5===2){
      for(let j=0;j<4;j++)
        block('fallen-leaf',x-8+j*3.3,y+7-(j%2)*2.6,.7,.5,.02,j%2?0x8a7546:0x64794f,{z:.05,yaw:j*37,material:'foliage'});
    }
    if(key%6===3){
      block('exam-paper',x+5,y-5,1.15,.82,.02,0xd6cdb6,{z:.06,yaw:18+key%40,material:'paper'});
      block('paper-line',x+5,y-5,.7,.09,.02,0x8d887c,{z:.08,yaw:18+key%40,material:'paper'});
    }
    if(key%7===4){
      block('drain-grate',x+8,y+8,2.4,1.2,.03,0x3c4549,{z:.02,material:'metal'});
      for(let j=-1;j<=1;j++)block('grate-slot',x+8+j*.6,y+8,.12,1,.02,0x596267,{z:.05,material:'metal'});
    }
    if(key%8===5)block('rust-stain',x-2,y+2,4.4,2.7,.02,0x8a5b4f,{z:.03,yaw:key%50,material:'rust'});
  }
  for(const b of plan.buildings) {
    for(let x=b.x1;x<b.x2;x+=20) for(let y=b.y1;y<b.y2;y+=20){
      const w=Math.min(20,b.x2-x),d=Math.min(20,b.y2-y);
      block('room-floor',x+w/2,y+d/2,w,d,.1,b.floor,{material:hash(x,y,3)%2?'tile':'concrete'});
    }
  }
  for(const [x,y,w,d] of [[0,-99.7,200,.6],[0,99.7,200,.6],[-99.7,0,.6,198.8],[99.7,0,.6,198.8]]) {
    const segments=Math.ceil(Math.max(w,d)/20);
    for(let i=0;i<segments;i++){
      const t=(i+.5)/segments-.5;
      block('perimeter',x+(w>d?t*w:0),y+(d>w?t*d:0),w>d?w/segments:w,d>w?d/segments:d,8.4,0x6f747a,{collider:true,material:'brick'});
    }
  }
  // 每段墙继承所属建筑的层高，天花板显著高于 281 cm 的星宝。
  for(const wall of plan.walls()){
    const alongX=wall.w>wall.d, length=alongX?wall.w:wall.d;
    const segments=Math.ceil(length/20);
    const boundaries=Array.from({length:segments+1},(_,i)=>Math.round(((alongX?wall.x:wall.y)-length/2+i*length/segments)*10)/10);
    const h=wall.height??8.4;
    for(let i=0;i<segments;i++){
      const span=boundaries[i+1]-boundaries[i], mid=(boundaries[i]+boundaries[i+1])/2;
      const x=alongX?mid:wall.x, y=alongX?wall.y:mid;
      const w=alongX?span:.6, d=alongX?.6:span;
      block('wall',x,y,w,d,h,wall.color,{collider:true,material:'brick'});
      block('trim',x,y,w,d,.2,0xa29e91,{z:h,material:'concrete'});
      block('trim',x,y,w+.1,d+.1,.2,0x50505a,{z:.4,material:'stone'});
      // 墙面剥落与渗水痕：不再是一整块纯色墙。
      if(hash(i,Math.round(y),11)%3===0){
        block('wall-stain',x,y+.1,w*.42,.12,h*.36,0x59605f,{z:h*.28,material:'rust'});
        block('wall-peel',x+w*.22,y+.1,w*.2,.1,.9,0x9a9588,{z:h*.62,material:'paper'});
      }
    }
  }
  function strip(group,ax,ay,bx,by,width,color,z,h) {
    const alongX=ax!==bx, length=Math.hypot(bx-ax,by-ay);
    const n=Math.ceil(length/20);
    const ends=Array.from({length:n+1},(_,i)=>Math.round(length*i/n*10)/10);
    for(let i=0;i<n;i++){
      const span=ends[i+1]-ends[i], t=(ends[i]+ends[i+1])/(2*length);
      block(group,ax+(bx-ax)*t,ay+(by-ay)*t,alongX?span:width,alongX?width:span,h,color,{z,material:'concrete'});
    }
  }
  const pathNodes=new Set();
  for(const leg of plan.legs) for(let i=1;i<leg.length;i++){
    const [ax,ay]=leg[i-1], [bx,by]=leg[i], length=Math.hypot(bx-ax,by-ay);
    const dx=(bx-ax)/length, dy=(by-ay)/length;
    strip('path',ax+dx*2.5,ay+dy*2.5,bx-dx*2.5,by-dy*2.5,5,sidewalks,.1,.1);
    pathNodes.add(ax+','+ay); pathNodes.add(bx+','+by);
    for(let step=5;step<length-3;step+=7){
      const x=ax+dx*step,y=ay+dy*step;
      const tangent=Math.atan2(dy,dx)*180/Math.PI;
      for(const sign of [-1,1]){
        block('route-arrow',x-dx*.45-dy*.38*sign,y-dy*.45+dx*.38*sign,1.15,.2,.1,0xd4b47d,{z:.11,yaw:tangent-45*sign,detail:true});
      }
    }
    // 湿脚印只出现在走廊一侧，指向下一个地点。
    const trackAngle=Math.atan2(dy,dx)*180/Math.PI;
    for(let step=9;step<length-6;step+=9){
      const x=ax+dx*step+dy*.9,y=ay+dy*step-dx*.9;
      block('footprint',x,y,.42,.72,.02,0x3b4748,{z:.13,yaw:trackAngle,material:'wet'});
      block('footprint',x+dx*.75-dy*.42,y+dy*.75+dx*.42,.42,.72,.02,0x3b4748,{z:.13,yaw:trackAngle,material:'wet'});
    }
  }

  for(const point of pathNodes) {
    const [x,y]=point.split(',').map(Number);
    block('path',x,y,5,5,.1,sidewalks,{z:.1,material:'concrete'});
  }
  plan.points.forEach(p=>block('station',p.x,p.y,3.5,3.5,.1,0xe0c1a5,{z:.12,id:'station-'+p.id,material:'tile'}));

  // 课桌椅：桌、腿、椅面、椅背、椅腿全部来自 plan.seats 的同一组坐标。
  const deskNotes=[
    '桌角刻着同一天的值日表，最后一行被反复描过。',
    '抽屉里是一叠没发下去的试卷，姓名栏全空着。',
    '桌面有一圈水杯印，旁边压着半张点名条。',
    '木板缝里夹着一枚生锈的回形针。'
  ];
  const chairNotes=[
    '椅子被拉开一截，地面留着两道浅浅的拖痕。',
    '椅背贴着一张褪色的号码纸，字迹被水洇开。',
    '坐垫还是温的，像刚有人站起来。',
    '椅脚缠着一小截封条。'
  ];
  for(const seat of plan.seats){
    const {x,y}=seat.desk, cy=seat.chair.y, d=plan.desk, c=plan.chair;
    for(const [dx,dy] of [[-d.legInsetX,-d.legInsetY],[d.legInsetX,-d.legInsetY],[-d.legInsetX,d.legInsetY],[d.legInsetX,d.legInsetY]])
      block('desk-leg',x+dx,y+dy,d.legM,d.legM,d.topM,0x9aa3a1,{id:seat.id+'-leg-'+dx+'-'+dy,material:'metal'});
    block('desk',x,y,d.widthM,d.depthM,d.thicknessM,0xae7e53,{z:d.topM,collider:true,id:seat.id+'-desk',
      material:'wood',interactive:prop(seat.label+' · 课桌','翻看课桌',pick(deskNotes,seat.row*4+seat.col),'flip')});
    // 桌面书本 / 试卷，与桌面同一坐标系。
    if((seat.row+seat.col)%3===0)
      block('desk-paper',x-.25,y-.18,.72,.52,.03,0xc7bda6,{z:d.topM+.1,material:'paper'});
    for(const [dx,dy] of [[-c.widthM*.38,-c.depthM*.34],[c.widthM*.38,-c.depthM*.34],[-c.widthM*.38,c.depthM*.34],[c.widthM*.38,c.depthM*.34]])
      block('chair-leg',x+dx,cy+dy,.14,.14,c.seatM,0x5d5a52,{id:seat.id+'-chair-leg-'+dx+'-'+dy,material:'metal'});
    block('chair-seat',x,cy,c.widthM,c.depthM,c.seatThicknessM,0x745d46,{z:c.seatM,id:seat.id+'-chair-seat',
      material:'wood',interactive:prop(seat.label+' · 椅子','拉开椅子',pick(chairNotes,seat.row*4+seat.col),'pull')});
    block('chair-back',x,cy+c.depthM*.42,c.widthM,.14,c.backHeightM,0x745d46,{z:c.seatM+c.seatThicknessM,
      id:seat.id+'-chair-back',material:'wood'});
    block('chair-slat',x,cy+c.depthM*.42+.02,c.widthM*.7,.06,.12,0x8c7056,{z:c.seatM+c.seatThicknessM+c.backHeightM*.6,
      id:seat.id+'-chair-slat',material:'wood'});
  }
  block('blackboard',-71,8.9,8,.3,3.1,0x375952,{z:1.5,collider:true,id:'blackboard',material:'slate',
    interactive:prop('黑板','擦掉一行字','粉笔灰落下来，最后一行写着今晚的名字。','wipe')});
  block('blackboard-frame',-71,8.72,8.5,.24,.18,0x8a7252,{z:1.5,id:'blackboard-frame',material:'wood'});
  for(const [i,x] of [-74,-72,-70,-68].entries())
    block('chalk-mark',x,9.12,.9,.06,.08,0xb9b9a5,{z:2.1+i*.32,yaw:i%2?8:-6,id:'chalk-'+i,material:'paper'});
  block('lectern',-71,12.2,1.8,2.2,1.35,0x8d6d52,{collider:true,id:'lectern',material:'wood',
    interactive:prop('讲台','翻看点名册','点名册停在你名字的前一行，墨迹还没干。','slide')});
  block('lectern-paper',-71,12.1,1.15,.8,.04,0xc9c0a8,{z:1.4,id:'lectern-paper',material:'paper'});
  block('noticeboard',-73,79,2.4,1.2,3.6,0xc3a475,{collider:true,id:'noticeboard',material:'wood',
    interactive:prop('公告栏','查看告示','二十年前的停课通知还贴着，落款是今晚。','read')});
  for(const [i,y] of [78.4,79.2].entries())
    block('notice-paper',-73,y,1.7,.5,.05,0xd2cbb5,{z:1.6+i*1.1,yaw:i?6:-4,id:'notice-paper-'+i,material:'paper'});
  for(const x of [-30,-22,-14,-6]) for(const y of [-58,-30]){
    const id='archive-shelf-'+x+'-'+y;
    block('archive-shelf',x,y,5.2,1.8,5.4,0x5d6577,{collider:true,id,material:'metal',
      interactive:prop('档案架','抽出一卷档案','卷宗里夹着一张停电前的监控截图。','slide')});
    for(const dx of [-1.6,0,1.5]) block('archive-file',x+dx,y+.9,1,.25,1.1,0xb88767,{z:2,material:'paper'});
    for(const dz of [1.2,3.1,4.6])block('shelf-rail',x,y,5.2,.12,.11,0x424b57,{z:dz,material:'metal'});
  }
  for(const x of [40,47,54,61,68]) {
    block('power-cabinet',x,-57,3.2,2.4,5.2,0x657970,{collider:true,id:'power-cabinet-'+x,material:'metal',
      interactive:prop('配电柜','拉开门检查','柜门里只有一根被剪断的线，断口很新。','open')});
    block('cabinet-rust',x-1,-55.8,1.1,.12,2.4,0x7a4f48,{z:1.2,material:'rust'});
  }
  block('broadcast-desk',46,33,4,9,2.2,0x625677,{collider:true,id:'broadcast-desk',material:'metal',
    interactive:prop('广播台','按下试音键','喇叭里先是一阵杂音，然后叫了一个名字。','light')});
  for(const sw of plan.puzzle) {
    block('switch-stand',sw.x,32,1.8,1.8,1.1,0x504c60,{collider:true,material:'metal'});
    block('switch',sw.x,32,2.1,2,.3,parseInt(sw.color.slice(1),16),{z:1.1,id:'switch-'+sw.id,material:'glass'});
  }
  for(const x of [-83,-49,-25,0,24]){
    block('bench',x,67,4,1.4,1.1,0x8e725e,{collider:true,id:'bench-'+x,material:'wood',
      interactive:prop('庭院长椅','坐一下','木板凉得像在水里泡过。','lift')});
    for(const dx of [-1.7,1.7])block('bench-leg',x+dx,67,.24,1.2,1.0,0x4a4f4c,{id:'bench-leg-'+x+'-'+dx,material:'metal'});
    block('lamp-post',x,62,.8,.8,8.4,0x625a53,{collider:true,material:'metal'});
    block('lamp',x,62,2.2,1.5,.5,0xfbd88e,{z:8.4,material:'light'});
    block('lamp-halo',x,62,3.4,2.6,.12,0x7a735c,{z:.1,material:'wet'});
  }
  const trees=[];
  for(const x of [-92,-82,-64,-43,-21,1,23,46,69,89]) trees.push([x,-84],[x,93]);
  for(const y of [-67,-46,-25,-4,18,40,61,80]) trees.push([94,y]);
  trees.push([-40,65],[-30,61],[-12,57],[-5,31],[12,20],[21,-7],[-64,-14],[-76,-30]);
  trees.forEach(([x,y],i)=>{
    block('tree-trunk',x,y,1.1,1.1,7.2,0x5a4a3e,{collider:true,material:'bark'});
    for(const [dx,dy,turn] of [[-2.1,.4,22],[2.2,-.5,-18],[.3,2.1,42]])
      block('tree-branch',x+dx,y+dy,3.1,.55,.55,0x504338,{z:6.4,yaw:turn,material:'bark'});
    block('tree-canopy',x,y,6.4,6.4,3.1,i%2?0x4d6a58:0x425f54,{z:6.9,material:'foliage'});
    block('tree-canopy',x,y,4.9,4.9,2.4,i%2?0x5b7a61:0x50705d,{z:9.9,material:'foliage'});
    block('tree-canopy',x+1.1,y-.8,2.8,2.8,1.6,0x67836a,{z:12.2,material:'foliage'});
  });
  gates.forEach(g=>block('gate',g.x,g.y,g.w,g.d,g.h,g.color,{collider:true,id:g.id,material:'metal'}));
  const scareX=plan.scare.x+3, scareY=plan.scare.y;
  block('mannequin',scareX,scareY,1.15,.7,1.7,0x835e56,{id:'mannequin-body',material:'fabric'});
  block('mannequin',scareX,scareY,1,.85,1,0xc3ab8a,{z:1.7,id:'mannequin-head',material:'paper'});
  block('mannequin',scareX-.25,scareY+.43,.2,.1,.2,0x382d38,{z:2.2,id:'mannequin-eye-l',material:'slate'});
  block('mannequin',scareX+.25,scareY+.43,.2,.1,.2,0x382d38,{z:2.2,id:'mannequin-eye-r',material:'slate'});

  for(const [index,b] of plan.buildings.entries()) {
    const left=b.x1-.3,right=b.x2+.3,front=b.y1-.3,back=b.y2+.3;
    let section=0;
    for(let x=left;x<right;x+=20) for(let y=front;y<back;y+=20){
      const w=Math.min(20,right-x),d=Math.min(20,back-y);
      block('roof',x+w/2,y+d/2,w,d,.4,b.color,{z:b.height+.2,id:'roof-'+index+'-'+section++,material:'concrete'});
      const k=hash(Math.round(x),Math.round(y),index);
      if(k%3===0){
        block('roof-patch',x+w*.35,y+d*.4,w*.55,d*.5,.03,[0x394750,0x746855,0x4c6062][k%3],
          {z:b.height+.6,yaw:k%22,material:'asphalt'});
      }
      if(k%4===1){
        for(let j=0;j<3;j++)
          block('roof-gravel',x+w*(.2+j*.24),y+d*.7,1.6,1.1,.06,0x9a9280,{z:b.height+.6,yaw:j*27,material:'stone'});
      }
    }
  }

  const sceneDesign=design.author(plan,block,(id,typeId,x,y,z,yaw=0,scale=1)=>{
    const item=draft.nativeItem(typeId,xy(x,y,z),yaw);
    item.transform.scale={x:scale,y:scale,z:scale};
    nativeItems.push({id,item});
  },(id,name,x,y,build)=>{
    const firstPiece=pieces.length,firstNative=nativeItems.length;
    build();
    modules.push({id,name,positionCm:xy(x,y),entityIds:pieces.slice(firstPiece).map(piece=>piece.id)
      .concat(nativeItems.slice(firstNative).map(entry=>entry.id))});
  });
  function activeLights(){
    const ids=new Set(nativeItems.map(entry=>entry.id));
    return sceneDesign.lights.filter(light=>ids.has(light.id));
  }
  function activeMist(){
    return nativeItems.filter(entry=>entry.item.typeId==='1101008001001082');
  }
  const openGate=(id,stage)=>gates.some(g=>g.id===id && stage>=g.until);
  function obstacles(stage) {
    if(obstacleCache.has(stage))return obstacleCache.get(stage);
    const result=previewPieces().filter(p=>p.collider && !openGate(p.id,stage)).map(p=>{
      const angle=p.yaw*Math.PI/180,sin=Math.abs(Math.sin(angle)),cos=Math.abs(Math.cos(angle));
      return {x:p.positionCm.x/100,y:p.positionCm.y/100,
        w:(p.sizeCm.x*cos+p.sizeCm.y*sin)/100,d:(p.sizeCm.x*sin+p.sizeCm.y*cos)/100};
    });
    obstacleCache.set(stage,result);
    return result;
  }
  function previewPieces(){
    // 与临时编辑页共用同一份内置元件拆解，避免两处画面出现不同的几何体。
    return pieces.concat(nativeItems.filter(entry=>!fxTypes.has(entry.item.typeId))
      .flatMap(entry=>nativePreview.expand(draft,entry)));
  }
  function makeProject(spawns=defaultSpawns,skyboxId=skyboxes.defaults) {
    const entries=pieces.map(p=>({id:p.id,item:{
      typeId:blockType,transform:{location:p.positionCm,rotation:{pitch:0,yaw:p.yaw,roll:0},
        scale:{x:p.sizeCm.x/100,y:p.sizeCm.y/100,z:p.sizeCm.z/100}},
      color:p.color,snapToGround:false
    }}));
    for(const spawn of spawns) {
      const [x,y,z]=spawn.position;
      entries.push({id:spawn.id,item:{typeId:spawnType,transform:{location:{x,y,z},rotation:{pitch:0,yaw:spawn.yaw,roll:0},scale:{x:1,y:1,z:1}},snapToGround:false}});
    }
    entries.push(...nativeItems);
    const commands=[], batchItemIds=[];
    const roofItemIndexes=pieces.flatMap((piece,index)=>piece.group==='roof'?[index]:[]);
    for(let i=0;i<entries.length;i+=20){
      const batch=entries.slice(i,i+20);
      commands.push({tool:'ugc_create_entity',arguments:{items:batch.map(e=>e.item)}});
      batchItemIds.push(batch.map(e=>e.id));
    }
    const coordinates={units:'cm',upAxis:'Z',pivot:'bottom-center',scaleStep:.1,sourceUnitCm:1};
    const sky=skyboxes.find(skyboxId);
    const skybox=skyboxes.exportPreset(sky.id);
    const indexedTypes=new Set(assets.map(asset=>asset.typeId));
    const addedAssetIndex=[...new Set(nativeItems.map(entry=>entry.item.typeId))]
      .filter(typeId=>!indexedTypes.has(typeId)).map(typeId=>draft.assets.get(typeId));
    const interactables=pieces.filter(p=>p.interactive).map(p=>({entityId:p.id,label:p.interactive.label,
      verb:p.interactive.verb,effect:p.interactive.effect,positionCm:p.positionCm}));
    return {
      schema:'yuanmeng-story-project/v1',map:'midnight-roll-call',name:'午夜点名',
      ...(editorEdits?{editorEdits}:{}),
      geometry:{kind:'box-placements',designVersion,boundsCm:{minX:-10000,maxX:10000,minY:-10000,maxY:10000,width:20000,depth:20000},coordinates,pieces,modules,
        playerCm:plan.playerCm,interiorHeightCm:Object.fromEntries(Object.entries(plan.interiorHeightM).map(([k,v])=>[k,cm(v)])),
        materialKeys:[...new Set(pieces.map(p=>p.material).filter(Boolean))],runtimeBinding:'required'},
      atmosphere:{skybox,profile:{sky:rgb(sky.zenith),fog:rgb(sky.fog),moon:rgb(sky.light),
        fogNearCm:cm(sceneDesign.profile.fogNear),fogFarCm:cm(sceneDesign.profile.fogFar)},lights:activeLights().map(({id,x,y,z,color,distance,phase})=>
        ({entityId:id,positionCm:xy(x,y,z),color:rgb(color),rangeCm:cm(distance),enableAtStage:phase})),
        mistEntityIds:activeMist().map(entry=>entry.id),
        lightingMode:'native-fx-with-web-preview',runtimeBinding:'required'},
      settings:{coordinates,originCm:{x:0,y:0,z:0},yaw:0,scale:1,spawns},
      gameplay:{
        synopsis:'校钟停在午夜，广播却还在念你的名字。',
        implementation:'runtime-binding-required',
        ...(missingEntityIds.length?{missingEntityIds}:{}),
        stations:plan.points.map(({x,y,...p},i)=>({...p,positionCm:xy(x,y),interactionRadiusCm:350,requires:plan.points[i-1]?.id??null})),
        route:plan.legs.map(leg=>leg.map(([x,y])=>xy(x,y))),
        doors:gates.map(g=>({entityId:g.id,unlockedBy:g.unlockedBy,openAction:'remove-collision-and-hide'})),
        scare:{positionCm:xy(plan.scare.x,plan.scare.y),radiusCm:cm(plan.scare.radius),after:plan.scare.after,oncePerRun:true,
          mannequinIds:pieces.filter(p=>p.group==='mannequin').map(p=>p.id),presentation:'close-up-dialog',message:'走廊里有人'},
        puzzle:{stationId:'broadcast',switches:plan.puzzle.map(sw=>({id:sw.id,entityId:'switch-'+sw.id,positionCm:xy(sw.x,32),label:sw.label,color:sw.color})),
          order:plan.solution,incorrectAction:'reset',onSuccess:'broadcast'},
        interactables,interactableBinding:'required',
        finale:'exit'
      },
      assetIndex:assets.concat(addedAssetIndex),
      placement:{schema:'yuanmeng-story-placement/v1',map:'midnight-roll-call',count:entries.length,coordinates,skybox,batchItemIds,roofItemIndexes,commands,
        verification:{matchBy:'sceneId',readTool:'ugc_get_entity',fields:['location','rotation','scale','color'],saveTool:'ugc_editor_save'}},
      verification:{yuanmengPlacement:'unverified',yuanmengRuntime:'unverified'}
    };
  }
  const authoredRoofs=pieces.filter(p=>p.group==='roof');
  const authoredWalls=pieces.filter(p=>p.group==='wall');
  const authoredMannequinIds=pieces.filter(p=>p.group==='mannequin').map(p=>p.id);
  function readProject(project) {
    const geometry=project?.geometry, settings=project?.settings, list=geometry?.pieces;
    if(project?.schema!=='yuanmeng-story-project/v1'||project.map!=='midnight-roll-call'||geometry?.kind!=='box-placements'||
       geometry.coordinates?.units!=='cm'||geometry.coordinates.upAxis!=='Z'||settings?.scale!==1||settings.yaw!==0||
       !['x','y','z'].every(axis=>settings.originCm?.[axis]===0)||!Array.isArray(list)||!Array.isArray(settings.spawns))
      throw Error('请选择《午夜点名》地图工程 JSON');
    const ids=new Set();
    for(const piece of list){
      if(!piece||piece.shape!=='box'||typeof piece.id!=='string'||!piece.id||ids.has(piece.id)||typeof piece.group!=='string'||
         !Number.isFinite(piece.yaw)||(piece.collider && piece.yaw%360!==0)||
         !['x','y','z'].every(axis=>Number.isFinite(piece.positionCm?.[axis])&&Number.isFinite(piece.sizeCm?.[axis])&&piece.sizeCm[axis]>0)||
         !['r','g','b'].every(channel=>Number.isInteger(piece.color?.[channel])&&piece.color[channel]>=0&&piece.color[channel]<=255))
        throw Error('工程中有无效的三维元件');
      ids.add(piece.id);
    }
    const bindings=[...gates.map(g=>g.id),...plan.points.map(p=>'station-'+p.id),...plan.puzzle.map(sw=>'switch-'+sw.id)];
    const edited=draft.validateEdited(project,1);
    const missing=(edited?bindings.concat(authoredMannequinIds):bindings).filter(id=>!ids.has(id));
    if(!edited&&(!list.length||missing.length)) throw Error('工程缺少门禁、剧情节点或机关元件');
    const spawns=settings.spawns.map(s=>s?.positionCm&&!s.position?{id:s.id,team:'N',position:[s.positionCm.x,s.positionCm.y,s.positionCm.z],yaw:s.yaw}:s);
    if(spawns.some(s=>ids.has(s?.id))) throw Error('出生点 ID 与三维元件重复');
    const indexed=new Map(list.map(piece=>[piece.id,piece]));
    const sameWall=(piece,original)=>piece?.group==='wall'&&piece.yaw===original.yaw&&['x','y','z'].every(axis=>
      piece.positionCm[axis]===original.positionCm[axis]&&piece.sizeCm[axis]===original.sizeCm[axis]);
    const addRoofs=!edited&&!list.some(piece=>piece.group==='roof')&&authoredRoofs.every(roof=>!ids.has(roof.id)&&!spawns.some(s=>s?.id===roof.id))&&
      authoredWalls.every(wall=>sameWall(indexed.get(wall.id),wall));
    const spawnIds=new Set(spawns.map(spawn=>spawn.id));
    const version=[design.version,'campus-night-v3','campus-night-v2'].includes(geometry.designVersion)?geometry.designVersion:null;
    const placements=edited??(version?draft.records(project.placement):[]);
    const native=placements.filter(entry=>!ids.has(entry.id)&&!spawnIds.has(entry.id));
    if(native.some(entry=>!draft.boxFor(entry.item))) throw Error('工程包含无效的原生元件');
    const importedModules=Array.isArray(geometry.modules)?geometry.modules.filter(m=>m&&typeof m.name==='string'&&
      Number.isFinite(m.positionCm?.x)&&Number.isFinite(m.positionCm?.y)&&Array.isArray(m.entityIds)):[];
    return {pieces:addRoofs?list.concat(authoredRoofs):list,spawns,native,missing,designVersion:version,modules:importedModules,
      skyboxId:skyboxes.find(project.atmosphere?.skybox?.displayId??project.placement?.skybox?.displayId).id,editorEdits:edited?project.editorEdits:null};
  }
  const scene={pieces,obstacles,openGate,makeProject,readProject,defaultSpawns,
    previewPieces,activeLights,activeMist,profile:sceneDesign.profile,get modules(){return modules},
    setEditedState(value){nativeItems=value.native;editorEdits=value.editorEdits;missingEntityIds=value.missing;designVersion=value.designVersion;modules=value.modules;obstacleCache.clear()},
    setPieces(value){pieces.length=0;for(const piece of value)pieces.push(piece);obstacleCache.clear()}};
  if(typeof module==='object') module.exports=scene;
  else root.CampusScene=scene;
})(globalThis);
