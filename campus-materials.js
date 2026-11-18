/* 正式版与临时编辑页共用的渲染基线。
   两处必须使用同一套程序纹理、材质分组与线框开关，否则编辑页会退化为灰盒。 */
(function(root){
  const kinds=['concrete','asphalt','stone','slate','tile','brick','wood','bark','metal','rust',
    'paper','fabric','foliage','wet','glass','wax'];

  // 白色底 + 低对比纹理线，保留每件实例的自身颜色，同时给出材质差异。
  function makeTexture(T,kind){
    const c=document.createElement('canvas');c.width=c.height=128;
    const g=c.getContext('2d');
    g.fillStyle='#ffffff';g.fillRect(0,0,128,128);
    let seed=2166136261;
    const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
    const ink=a=>'rgba(38,44,48,'+a+')';
    if(kind==='concrete'||kind==='asphalt'||kind==='stone'||kind==='slate'){
      const count=kind==='asphalt'?1500:820;
      for(let i=0;i<count;i++){
        const s=kind==='stone'?1+rnd()*3:1+rnd()*1.6;
        g.fillStyle=ink(.04+rnd()*.11);
        g.fillRect(rnd()*128,rnd()*128,s,s);
      }
      for(let i=0;i<4;i++){
        g.strokeStyle=ink(.1);g.lineWidth=.6;g.beginPath();
        let x=rnd()*128,y=rnd()*128;g.moveTo(x,y);
        for(let j=0;j<5;j++){x+=(rnd()-.5)*24;y+=rnd()*16;g.lineTo(x,y);}
        g.stroke();
      }
    }else if(kind==='tile'){
      for(let i=0;i<=128;i+=32){g.strokeStyle=ink(.2);g.lineWidth=1.5;
        g.beginPath();g.moveTo(i,0);g.lineTo(i,128);g.moveTo(0,i);g.lineTo(128,i);g.stroke();}
      for(let i=0;i<260;i++){g.fillStyle=ink(.05);g.fillRect(rnd()*128,rnd()*128,1.2,1.2);}
    }else if(kind==='brick'){
      for(let row=0;row<8;row++){
        const y=row*16;
        g.strokeStyle=ink(.22);g.lineWidth=1.4;g.beginPath();g.moveTo(0,y);g.lineTo(128,y);g.stroke();
        const offset=row%2?16:0;
        for(let x=offset;x<128;x+=32){g.beginPath();g.moveTo(x,y);g.lineTo(x,y+16);g.stroke();}
      }
      for(let i=0;i<300;i++){g.fillStyle=ink(.05);g.fillRect(rnd()*128,rnd()*128,1.5,1.5);}
    }else if(kind==='wood'||kind==='bark'){
      for(let x=0;x<128;x+=kind==='bark'?5:9){
        g.strokeStyle=ink(kind==='bark'?.2:.12);g.lineWidth=kind==='bark'?2:1;
        g.beginPath();g.moveTo(x,0);
        for(let y=0;y<=128;y+=16)g.lineTo(x+Math.sin((y+x)*.08)*1.8,y);
        g.stroke();
      }
      for(let i=0;i<6;i++){
        g.strokeStyle=ink(.13);g.beginPath();
        g.ellipse(rnd()*128,rnd()*128,3+rnd()*4,1.5,0,0,Math.PI*2);g.stroke();
      }
    }else if(kind==='metal'){
      for(let y=0;y<128;y+=6){g.strokeStyle=ink(.06+rnd()*.06);g.lineWidth=1;
        g.beginPath();g.moveTo(0,y);g.lineTo(128,y+rnd()*2);g.stroke();}
      for(let y=8;y<128;y+=24)for(let x=8;x<128;x+=24){
        g.fillStyle=ink(.16);g.beginPath();g.arc(x,y,1.6,0,Math.PI*2);g.fill();}
    }else if(kind==='rust'){
      for(let i=0;i<70;i++){
        g.fillStyle='rgba(92,55,44,'+(.04+rnd()*.16)+')';
        g.beginPath();g.ellipse(rnd()*128,rnd()*128,2+rnd()*9,1+rnd()*5,rnd()*3,0,Math.PI*2);g.fill();}
    }else if(kind==='paper'){
      for(let y=10;y<128;y+=13){g.strokeStyle=ink(.09);g.lineWidth=1;
        g.beginPath();g.moveTo(8,y);g.lineTo(120-rnd()*45,y);g.stroke();}
      for(let i=0;i<200;i++){g.fillStyle=ink(.04);g.fillRect(rnd()*128,rnd()*128,1,1);}
    }else if(kind==='fabric'){
      for(let i=0;i<128;i+=4){g.strokeStyle=ink(.06);g.lineWidth=1;
        g.beginPath();g.moveTo(i,0);g.lineTo(i,128);g.moveTo(0,i);g.lineTo(128,i);g.stroke();}
    }else if(kind==='foliage'){
      for(let i=0;i<150;i++){
        g.fillStyle='rgba(40,60,44,'+(.04+rnd()*.13)+')';
        g.beginPath();g.arc(rnd()*128,rnd()*128,2+rnd()*7,0,Math.PI*2);g.fill();}
    }else if(kind==='wet'){
      for(let i=0;i<18;i++){
        g.strokeStyle='rgba(70,100,110,'+(.05+rnd()*.09)+')';g.lineWidth=1;
        const x=rnd()*128,y=rnd()*128,r=6+rnd()*20;
        g.beginPath();g.ellipse(x,y,r,r*.42,0,0,Math.PI*2);g.stroke();}
      for(let i=0;i<240;i++){g.fillStyle=ink(.04);g.fillRect(rnd()*128,rnd()*128,1,1);}
    }else if(kind==='glass'){
      for(let i=0;i<9;i++){g.strokeStyle='rgba(90,120,130,.1)';g.lineWidth=1;
        const x=rnd()*128;g.beginPath();g.moveTo(x,0);g.lineTo(x-20,128);g.stroke();}
    }else if(kind==='wax'){
      for(let x=12;x<128;x+=22){g.strokeStyle=ink(.05);g.lineWidth=3;
        g.beginPath();g.moveTo(x,0);g.lineTo(x+3,128);g.stroke();}
    }
    const tex=new T.CanvasTexture(c);
    tex.wrapS=tex.wrapT=T.RepeatWrapping;
    tex.repeat.set(2,2);
    tex.anisotropy=4;
    return tex;
  }

  function materialKey(piece){
    if(piece.material)return piece.material;
    const g=piece.group||'';
    if(g==='light'||g==='route-arrow')return 'light';
    if(/window|glass|screen|switch|shelf|iv-|cabinet-shelf/.test(g))return 'glass';
    if(/rust|oxidation/.test(g))return 'rust';
    if(/puddle|water|reflection|wet|footprint|drag|stain/.test(g))return 'wet';
    if(/paper|poster|notice|talisman|stripe|tape|mark|crack|chalk/.test(g))return 'paper';
    if(/linen|curtain|fabric|pillow|ball|mannequin/.test(g))return 'fabric';
    if(/tree|leaf|shrub|moss|canopy|branch|foliage/.test(g))return 'foliage';
    if(/iron|metal|rail|chain|frame|leg|post|beam|locker|cabinet|grate|wire|cord|stand|dial|mullion|rivet|slot|vent|pier|joist/.test(g))return 'metal';
    if(/desk|chair|bench|lectern|board|crate|box|wood|portrait|bark/.test(g))return 'wood';
    if(/roof|wall|trim|floor|path|foundation|perimeter|module|gate/.test(g))return 'concrete';
    return 'plain';
  }

  function makeHaloTexture(T){
    const canvas=document.createElement('canvas');
    canvas.width=canvas.height=96;
    const ctx=canvas.getContext('2d');
    const grad=ctx.createRadialGradient(48,48,0,48,48,48);
    grad.addColorStop(0,'#ffffffb0');grad.addColorStop(.2,'#ffffff66');grad.addColorStop(1,'#ffffff00');
    ctx.fillStyle=grad;ctx.fillRect(0,0,96,96);
    return new T.CanvasTexture(canvas);
  }

  function create(T){
    const tex={};
    for(const kind of kinds)tex[kind]=makeTexture(T,kind);
    const standard=(kind,roughness,metalness,extra={})=>new T.MeshStandardMaterial({color:0xffffff,map:tex[kind],roughness,metalness,...extra});
    const materials={
      concrete:standard('concrete',.96,.02),asphalt:standard('asphalt',1,0),
      stone:standard('stone',.98,.01),tile:standard('tile',.78,.05),
      brick:standard('brick',.95,.02),wood:standard('wood',.78,.04),
      bark:standard('bark',1,0),metal:standard('metal',.44,.55),
      rust:standard('rust',.9,.28),paper:standard('paper',1,0,{side:T.DoubleSide}),
      fabric:standard('fabric',1,0),foliage:standard('foliage',.98,0,{side:T.DoubleSide}),
      wet:standard('wet',.16,.26),glass:standard('glass',.12,.12,{transparent:true,opacity:.46,depthWrite:false}),
      slate:standard('slate',.92,.02),wax:standard('wax',.85,0),
      plain:new T.MeshLambertMaterial({color:0xffffff}),
      light:new T.MeshBasicMaterial({color:0xffffff})
    };
    const haloTexture=makeHaloTexture(T);
    const list=Object.values(materials); for(const mat of list) if(mat!==materials.light) brickMaterial(mat,.6);
    return {
      materials,materialKey,haloTexture,kinds,
      setWireframe(on){for(const material of list)material.wireframe=Boolean(on);},
      resolve(key){return materials[key]||materials.plain;}
    };
  }

  const api={create,materialKey,makeTexture,makeHaloTexture,kinds};
  if(typeof module==='object')module.exports=api;
  else root.CampusMaterials=api;
})(globalThis);
