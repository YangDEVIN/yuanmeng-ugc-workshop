(() => {
  const root = typeof window === 'undefined' ? module.exports : window;
  // 星宝实测外包尺寸（厘米）。所有家具、门洞和室内净高按这个尺度同比放大。
  const playerCm = { width:120, depth:223, height:281 };
  // 室内净高远大于玩家身高：主教学楼 860 cm，其余 780–820 cm。
  const interiorHeightM = { classroom:8.6, archive:7.8, power:7.8, broadcast:8.2 };
  const points = [
    { id:'gate', label:'校门', icon:'⌂', x:-66, y:80, action:'阅读值班簿', message:'值班簿上的日期停在二十年前。最后一行是今天的墨迹：你，缺席。教学楼的钟还停在十二点。' },
    { id:'classroom', label:'旧教室', icon:'▤', x:-66, y:26, action:'拾起点名册', message:'讲台上的点名册已经潮湿，值班条却是干的。它写着：广播室复位顺序「蓝、黄、绿」。' },
    { id:'archive', label:'档案室', icon:'◇', x:-20, y:-44, action:'查看档案', message:'停电前最后一张监控截图里，旧校服立在东连廊。广播室依赖配电室供电。' },
    { id:'power', label:'配电室', icon:'ϟ', x:48, y:-44, action:'合上电闸', message:'电闸合上，东连廊的应急灯亮了。有人在广播里吸了一口气。' },
    { id:'broadcast', label:'广播室', icon:'◉', x:60, y:32, action:'操作广播台', message:'广播恢复。操场出口已解锁。' },
    { id:'exit', label:'操场出口', icon:'⇥', x:28, y:81, action:'离开校园', message:'值班广播喊出最后一个名字。校门合上的那一刻，天亮了。' }
  ];
  const legs = [
    [[-66,80],[-66,26]],
    [[-66,26],[-37,26],[-37,-44],[-20,-44]],
    [[-20,-44],[48,-44]],
    [[48,-44],[60,-44],[60,32]],
    [[60,32],[60,81],[28,81]]
  ];
  const scare = { x:60, y:-6, radius:4.5, after:'power', once:true };
  const puzzle = [
    { id:'green', label:'绿', icon:'▲', color:'#80d899', x:65 },
    { id:'blue', label:'蓝', icon:'●', color:'#8bbdff', x:69 },
    { id:'amber', label:'黄', icon:'■', color:'#ffce7b', x:73 }
  ];
  const solution = ['blue','amber','green'];
  const buildings = [
    { name:'旧教室', x1:-90, x2:-42, y1:8, y2:48, height:interiorHeightM.classroom, openings:{s:-66,e:26}, color:0x847976, floor:0x746a64 },
    { name:'档案室', x1:-34, x2:2, y1:-62, y2:-26, height:interiorHeightM.archive, openings:{w:-44,e:-44}, color:0x626e77, floor:0x535f69 },
    { name:'配电室', x1:32, x2:72, y1:-62, y2:-26, height:interiorHeightM.power, openings:{w:-44,s:60}, color:0x6d786f, floor:0x535b56 },
    { name:'广播室', x1:34, x2:85, y1:12, y2:60, height:interiorHeightM.broadcast, openings:{n:60,s:60}, color:0x746b7e, floor:0x60566b }
  ];
  // 唯一的课桌椅布局数据源：桌、桌腿、椅面、椅背、椅腿全部由同一组 x/y 推导。
  // 黑板在 y=8.9，学生面朝 -Y，椅子统一放在桌面 +Y 一侧 205 cm 处。
  const deskColumns = [-85,-78,-55,-49];
  const deskRows = [15,20,34,39];
  const desk = { widthM:1.5, depthM:1.9, topM:1.10, thicknessM:.14, legM:.2, legInsetX:.56, legInsetY:.73 };
  const chair = { widthM:1.15, depthM:.95, seatM:.68, seatThicknessM:.16, backHeightM:.82, offsetM:2.05 };
  const seats = [];
  deskRows.forEach((y,row)=>deskColumns.forEach((x,col)=>{
    const id='seat-'+(row+1)+'-'+(col+1);
    seats.push({ id, row, col, label:'第 '+(row+1)+' 排 '+(col+1)+' 座',
      desk:{x,y}, chair:{x,y:y+chair.offsetM} });
  }));
  const bounds = { minX:-100,maxX:100,minY:-100,maxY:100,widthCm:20000,depthCm:20000,unit:'cm' };
  const hasClearance = (x,y,obstacles,radius=1.5) =>
    x > bounds.minX + radius && x < bounds.maxX - radius && y > bounds.minY + radius && y < bounds.maxY - radius &&
    !obstacles.some(o => Math.abs(x-o.x)<o.w/2+radius && Math.abs(y-o.y)<o.d/2+radius);
  function walls() {
    const parts=[];
    for (const b of buildings) {
      const edge = (axis, fixed, from, to, opening) => {
        const segments=opening===undefined ? [[from,to]] : [[from,opening-4],[opening+4,to]];
        for (const [a,z] of segments) {
          const middle=(a+z)/2;
          parts.push(axis==='x' ? {x:middle,y:fixed,w:z-a,d:.65,height:b.height,color:b.color}
                               : {x:fixed,y:middle,w:.65,d:z-a,height:b.height,color:b.color});
        }
      };
      edge('x',b.y1,b.x1,b.x2,b.openings.n);
      edge('x',b.y2,b.x1,b.x2,b.openings.s);
      edge('y',b.x1,b.y1,b.y2,b.openings.w);
      edge('y',b.x2,b.y1,b.y2,b.openings.e);
    }
    return parts;
  }
  root.campusPlan={points,legs,scare,puzzle,solution,buildings,bounds,hasClearance,walls,
    playerCm,interiorHeightM,desk,chair,seats};
})();
