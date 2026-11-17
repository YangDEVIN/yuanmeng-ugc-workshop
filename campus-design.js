(function(root) {
  // Author the campus in meters. The project exporter converts this scene to centimeters.
  const version='campus-night-v4';
  const profile={fogNear:110,fogFar:760};
  function author(plan,block,native,addModule) {
    const iron=0x283743,concrete=0x56616a,warm=0xe4a55f,cold=0x7abdc6,red=0xbb5a4f;
    const lights=[];
    const hash=(a,b,k=0)=>{let n=(a*374761393)^(b*668265263)^(k*2246822519);n=(n^(n>>>13))*1274126177;return Math.abs(n^(n>>>16))};
    function glow(id,x,y,z,color,distance,phase=0) {
      lights.push({id,x,y,z,color,distance,phase});
      native(id,'1102015001001000',x,y,z);
    }
    function lamp(id,x,y,color,distance,phase=0) {
      block('lamp-base',x,y,1.1,1.1,.55,concrete,{material:'concrete'});
      block('lamp-post',x,y,.42,.42,7.3,iron,{material:'metal'});
      block('lamp-hood',x,y,1.25,1.25,.32,iron,{z:7.2,material:'metal'});
      block('light',x,y,.78,.78,.42,color,{z:6.85,material:'light'});
      block('lamp-puddle',x,y,4.2,3.1,.06,0x3f5b63,{z:.08,material:'wet'});
      glow(id,x,y,7.0,color,distance,phase);
    }
    function panel(group,x,y,w,d,z,color,turn=0,material) {
      block(group,x,y,w,d,.1,color,{z,yaw:turn,material});
    }
    function band(group,x1,x2,y,width,z,color,material) {
      for(let x=x1;x<x2;x+=20){
        const length=Math.min(20,x2-x);
        panel(group,x+length/2,y,length,width,z,color,0,material);
      }
    }
    function studs(group,first,last,spacing,fixed,vertical,fn){
      for(let v=first;v<=last;v+=spacing)fn(vertical?fixed:v,vertical?v:fixed,group);
    }
    const brick=0x707677, stone=0x474f5b;
    // 校门抬高到 9 m 以上，星宝（281 cm）站在门下明显渺小。
    for(const x of [-74,-58]){
      block('gate-post',x,78,2.3,2.3,9.2,brick,{collider:true,material:'brick'});
      block('gate-cap',x,78,3,3,.42,stone,{z:9.2,material:'stone'});
      block('light',x,77,1.1,.42,.65,warm,{z:7.0,material:'light'});
      block('gate-moss',x+.9,78,.35,2.2,3.4,0x4b5c50,{z:1.2,material:'foliage'});
    }
    block('gate-lintel',-66,78,18.3,2.3,1.25,stone,{z:7.6,material:'stone'});
    block('gate-sign',-66,79.24,9,.26,1.8,0x273334,{z:8.6,material:'wood',
      interactive:{label:'校门牌匾',verb:'看清校名',message:'牌匾被重新漆过，底下压着旧校名的笔画。',effect:'read'}});
    const digits=['010111010010010','111001111100111','000010000010000','111101101101111','111101101101111'];
    for(const [digit,bits] of digits.entries()){
      for(let i=0;i<bits.length;i++) if(bits[i]==='1'){
        const x=-68.15+digit*1.05+(i%3)*.31;
        block('light',x,79.43,.25,.16,.2,warm,{z:9.7-Math.floor(i/3)*.235,material:'light'});
      }
    }
    for(const [a,b] of [[-96,-77],[-55,-42]]){
      studs('gate-bars',a,b,1.35,78,false,(x,y)=>block('gate-bars',x,y,.18,.26,4.4,iron,{material:'metal'}));
      for(const z of [.9,3.4])block('gate-rail',(a+b)/2,78,b-a,.28,.18,iron,{z,material:'metal'});
    }
    for(const [x,y] of [[-96,78],[-42,78],[-74,78],[-58,78]]){
      block('gate-chain',x,y,.14,.14,2.1,0x555b58,{z:5.4,material:'metal'});
      block('gate-talisman',x,y+.15,.62,.06,.9,0xa8493f,{z:5.0,material:'paper'});
    }
    glow('gate-amber',-66,80,7.5,warm,34);
    lamp('walk-lamp-west',-61.7,58,warm,25);
    lamp('junction-light',-41,-25,cold,22);
    lamp('north-crossing',16,-48,cold,26);
    lamp('east-night-light',66,-13,red,20,4);
    lamp('yard-light',46,77,warm,29,5);
    lamp('infirmary-path',-70,-31,cold,18,3);
    lamp('archive-corner',-2,-60,warm,19,2);

    // Windows, parapets and the stopped clock all follow each building's real ceiling height.
    const buildings=plan.buildings;
    for(const [index,b] of buildings.entries()){
      const z=b.height;
      const [span,depth]=[b.x2-b.x1,b.y2-b.y1];
      const centerX=(b.x1+b.x2)/2, centerY=(b.y1+b.y2)/2;
      const windowBase=2.75, windowHeight=2.2;
      for(const y of [b.y1-.36,b.y2+.36]){
        for(let x=b.x1+4;x<b.x2-2;x+=5.5){
          const threshold=y<centerY?b.openings.n:b.openings.s;
          if(threshold!==undefined&&Math.abs(x-threshold)<6.2)continue;
          const lit=(Math.round(x)+index)%4===0;
          const frameY=y>.0?y+.08:y-.08;
          block(lit?'light':'window',x,y,3.3,.19,windowHeight,lit?(index===0?warm:cold):0x2c414d,{z:windowBase,material:lit?'light':'glass'});
          block('window-sill',x,y,3.65,.41,.22,concrete,{z:windowBase-.2,material:'concrete'});
          for(const dx of [-1.6,0,1.6])block('window-frame',x+dx,frameY,.15,.24,windowHeight,iron,{z:windowBase,material:'metal'});
          block('window-mullion',x,frameY,3.3,.12,.14,iron,{z:windowBase+windowHeight*.55,material:'metal'});
          if((Math.round(x)+index)%3===0)
            block('window-streak',x,frameY,.5,.08,windowHeight*.7,0x4b6267,{z:windowBase+.2,material:'wet'});
          // 墙上贴纸、旧海报与撕痕：环境叙事代替纯色墙面。
          if((Math.round(x)+index)%5===0){
            block('wall-poster',x+1.4,y+(y<centerY?-.12:.12),1.15,.08,1.55,0xb7ad94,{z:1.55,material:'paper'});
            block('poster-mark',x+1.4,y+(y<centerY?-.2:.2),.72,.06,.3,0x8c5a4f,{z:2.35,material:'rust'});
          }
        }
      }
      for(const [side,y] of [[0,b.y1-.35],[1,b.y2+.35]]){
        for(let x=b.x1;x<b.x2;x+=20){
          const length=Math.min(20,b.x2-x);
          block('roof',x+length/2,y,length,.45,.85,index===0?brick:concrete,{z:z+.2,id:'parapet-'+index+'-'+side+'-'+x,material:'concrete'});
        }
      }
      for(const x of [b.x1-.35,b.x2+.35]){
        for(let y=b.y1;y<b.y2;y+=20){
          const length=Math.min(20,b.y2-y);
          block('roof',x,y+length/2,.45,length,.85,concrete,{z:z+.2,material:'concrete'});
        }
      }
      if(index===0){
        block('roof',centerX,b.y1+8,12,10,5.1,stone,{z:z+.4,id:'clock-tower',material:'brick'});
        block('roof',centerX,b.y1+8,12.6,10.6,.35,brick,{z:z+5.5,material:'brick'});
        const cy=b.y1+13.12, cz=z+3.25;
        for(let i=0;i<12;i++){
          const t=i*Math.PI/6;
          block('roof',centerX+2*Math.sin(t),cy,.25,.22,.25,warm,{z:cz+2*Math.cos(t)-.13,material:'light'});
        }
        block('roof',centerX,cy,.21,.22,1.72,0xf7dcb2,{z:cz,material:'metal'});
        block('roof',centerX+.63,cy,1.45,.23,.19,0xf7dcb2,{z:cz,material:'metal'});
      } else {
        const accent=index===1?0x64827d:index===2?0x79725f:0x6e6786;
        block('roof',centerX,centerY,Math.min(span-6,15),Math.min(depth-6,10),.55,accent,{z:z+.2,material:'metal'});
        for(const dx of [-4,0,4])
          block('roof-vent',centerX+dx,centerY+2,1.8,1.4,1.1,iron,{z:z+.75,material:'metal'});
      }
    }
    glow('class-warm',-72,23,6.4,warm,29);
    glow('archive-desk',-17,-42,5.8,cold,29);
    glow('power-cabinet-light',47,-53,6.0,red,24,4);
    glow('broadcast-glow',62,33,6.3,0x9c89d8,27,4);
    // 教室吊灯挂在高天花下，灯管与黑板之间留出明显空间。
    for(const [x,y] of [[-76,12],[-66,12],[-56,12],[-28,-57],[-18,-57],[-8,-57]]){
      const h=buildings.find(b=>x>b.x1&&x<b.x2&&y>b.y1&&y<b.y2)?.height??8;
      const ceiling=h-.45;
      for(const dx of [-1.1,1.1])block('light-cord',x+dx,y,.08,.08,.85,iron,{z:ceiling,material:'metal'});
      block('room-light',x,y,3.3,.46,.23,0x394759,{z:ceiling-.85,material:'metal',
        id:'room-light-'+x+'-'+y,
        interactive:{label:'教室灯管',verb:'拨一下灯管',message:'灯管闪了两下，照出一排空座位。',effect:'light'}});
      block('light',x,y,2.81,.32,.15,0xaad0cd,{z:ceiling-.95,material:'light'});
    }
    // 散落的纸箱、旧档案盒与地面纸张。
    for(const [x,y] of [[-28,-33],[-20,-32],[-12,-34],[-24,-48],[-8,-52]]){
      block('archive-box',x,y,1.18,1.1,.84,0x6f695a,{material:'wood',
        id:'archive-box-'+x+'-'+y,
        interactive:{label:'纸箱',verb:'翻纸箱',message:'箱底压着一叠没寄出去的通知单。',effect:'lift'}});
      block('archive-box',x+.15,y,1.12,1.05,.63,0x8a7760,{z:.84,material:'paper'});
      block('box-tape',x,y,.3,1.1,.06,0xa79b82,{z:1.47,material:'paper'});
    }
    for(const [x,y,turn] of [[-36.5,-44,22],[-5,-38,-16],[36,-20,33],[70,-18,-28],[-38,26,12],[18,72,41]]){
      block('floor-paper',x,y,.9,.68,.04,0xb8ae96,{z:.14,yaw:turn,material:'paper'});
      block('paper-line',x,y,.55,.08,.04,0x8b8475,{z:.18,yaw:turn,material:'paper'});
    }
    for(const x of [40,47,54,61,68]){
      block('light',x+.83,-55.73,.34,.16,.23,x===47?warm:red,{z:3.0,material:'light'});
      block('cabinet-stripe',x,-55.73,2.5,.15,.25,0x867040,{z:1.1,material:'metal'});
      block('cabinet-rivet',x-1.4,-55.73,.18,.18,.18,0x303a3e,{z:4.2,material:'metal'});
    }
    for(const y of [30,33,36]){
      block('broadcast-console',46,y,1.7,1.1,1.1,iron,{z:2.2,material:'metal',
        id:'broadcast-console-'+y,
        interactive:{label:'调音台',verb:'拧动旋钮',message:'旋钮转到底，录音带开始倒转。',effect:'flip'}});
      block('light',46.86,y,.12,.74,.48,0x678ba8,{z:3.0,material:'light'});
      block('console-dial',46,y+.32,.3,.3,.12,0xa58b6a,{z:3.3,material:'metal'});
    }
    // 带顶连廊：层高 740 cm，灯带在惊吓点前断开。
    for(const x of [54,66])for(let y=-23;y<=9;y+=8){
      block('corridor-pier',x,y,1.25,1.25,7.4,stone,{collider:true,material:'concrete'});
      block('pier-rust',x,y+.5,.16,.16,2.6,0x75504c,{z:1.4,material:'rust'});
      if(y<8)block('corridor-rail',x,y+4,.24,7.35,.9,iron,{z:.73,collider:true,material:'metal'});
    }
    for(let y=-20;y<=4;y+=8){
      block('roof',60,y,13.3,8,.43,0x46515b,{z:7.4,material:'concrete'});
      block('beam',60,y,13.2,.65,.6,iron,{z:6.8,material:'metal'});
      block('ceiling-wire',60.6,y,.1,7.8,.1,0x343c42,{z:6.95,material:'metal'});
      if(y!==-4)block('light',60,y,2,.4,.19,y===4?cold:red,{z:6.6,material:'light'});
    }
    for(const [x,y,z] of [[47,-1,.4],[72,-3,.4],[28,-20,.4],[-2,-13,.4],[18,73,.4],[-36,58,.4],[8,-62,.4]])
      native('mist-'+x+'-'+y,'1101008001001082',x,y,z,15+(x%3)*25);

    // 中庭球场与田径区远离主通行带。
    for(const [x,y] of [[-21,42],[-6,42],[9,42],[-21,57],[-6,57],[9,57]]){
      block('court-surface',x,y,15,15,.13,0x4d6867,{material:'concrete'});
    }
    const court=0xc5bea0;
    for(const y of [34.7,49.5,64.3])band('court-mark',-28.35,16.35,y,.2,.13,court,'paper');
    for(const x of [-28.36,16.36])for(const y of [42,57])
      panel('court-mark',x,y,.2,15,.13,court,0,'paper');
    for(const [x,y] of [[-7,38],[-7,61]]){
      native('basket-'+y,'1108005004001010',x,y,.13,y===38?90:270);
      panel('court-key',x,y,6.6,.21,.13,court,0,'paper');
    }
    for(let i=0;i<14;i++){
      const t=i*Math.PI/7;
      panel('court-circle',-6+3.45*Math.cos(t),49.5+3.45*Math.sin(t),1.49,.16,.13,court,i*360/14+90,'paper');
    }
    lamp('court-corner',19,58,warm,30);
    for(const [x,y] of [[-17,-9],[-17,9],[14,-9],[14,9]]){
      block('planter',x,y,8.5,5.5,.55,stone,{collider:true,material:'stone'});
      block('planter-soil',x,y,7.9,4.95,.2,0x364a49,{z:.55,material:'wet'});
      for(let j=-2;j<=2;j++)block('planter-shrub',x+j*1.35,y,.95,1.65,.8+(j+2)*.09,0x41615a,{z:.75,material:'foliage'});
      block('planter-leaf',x+2.1,y-.8,1.1,.8,.06,0x5c6547,{z:.58,yaw:35,material:'foliage'});
    }
    block('courtyard-water',-1.5,0,18,10,.14,0x334d5f,{material:'wet'});
    for(const y of [-5,5])block('courtyard-curb',-1.5,y,19,.55,.35,stone,{material:'stone'});
    for(const x of [-10.5,7.5])block('courtyard-curb',x,0,.55,10,.35,stone,{material:'stone'});
    for(const x of [-8,-4,1.3,4])panel('reflection',x,x%3,2.7,.15,.16,0x547582,12,'wet');
    // 水面落叶与漂浮试卷。
    for(const [x,y,turn] of [[-7,-2,18],[0,2,-24],[4,-3,41]]){
      block('water-leaf',x,y,.9,.6,.04,0x5c6b4d,{z:.18,yaw:turn,material:'foliage'});
      block('water-ring',x+.6,y+.4,1.6,.1,.03,0x6b8b92,{z:.19,yaw:turn+22,material:'wet'});
    }
    for(const [x,y] of [[-34,69],[-24,71],[77,69],[84,73],[-57,-56],[-76,-47],[-88,-12],[30,-78]]){
      block('rubble',x,y,2.6,1.45,.32,0x646764,{yaw:15+(x%4)*20,material:'stone'});
      block('rubble',x+.4,y+.8,1.2,1,.26,0x858078,{yaw:35,material:'concrete'});
      block('rubble-paper',x-1.1,y+.4,.6,.45,.03,0xa49c89,{z:.32,yaw:hash(x,y)%50,material:'paper'});
    }
    for(const y of [76,86]){
      block('exit-frame',41,y,1.18,1.18,7.6,stone,{collider:true,material:'stone'});
      block('light',41,y,.9,.9,.25,0x81d2b0,{z:7.6,material:'light'});
    }
    block('exit-frame',41,81,.65,11.3,.68,iron,{z:7.0,material:'metal'});
    // 门口封条与手写警示牌。
    for(const [x,y,label] of [[-66,48,'停课通知'],[60,12,'配电重地'],[41,81,'禁止离校']]){
      block('warning-board',x,y,3.4,.22,.62,0x79634b,{z:3.4,material:'wood',
        id:'warning-'+x+'-'+y,
        interactive:{label,verb:'揭开封条',message:'封条背面写着一个被划掉的名字。',effect:'read'}});
      for(let dx=-1.4;dx<1.4;dx+=.6)
        block('warning-stripe',x+dx,y+.13,.24,.08,.5,0x984248,{z:3.42,material:'paper'});
    }
    const modules=root.CampusHorrorModules??require('./campus-horror-modules');
    modules.author({block,native,glow,panel,module:addModule});
    return {version,profile,lights};
  }
  const api={author,profile,version};
  if(typeof module==='object')module.exports=api;
  else root.CampusDesign=api;
})(globalThis);
