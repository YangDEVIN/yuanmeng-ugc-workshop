(function(root){
  function author({block,native,glow,panel,module}){
    const H=7.2; // 模组房净高 720 cm，远高于 281 cm 的星宝。
    const cement=0x687277,iron=0x313d47,dust=0x82796c,crimson=0x984248,linen=0xa5afb1;
    function divided(start,end,cut){
      const usable=cut===undefined?[[start,end]]:[[start,cut-3],[cut+3,end]];
      return usable.flatMap(([a,b])=>{
        const runs=[];
        for(let p=a;p<b;p+=16)runs.push([p,Math.min(p+16,b)]);
        return runs;
      });
    }
    function room(x1,x2,y1,y2,door,floor,wall){
      const mid=(x1+x2)/2, height=H;
      for(const y of [y1,y2]){
        for(const [a,b] of divided(x1,x2,y===y2?door:undefined)){
          block('module-wall',(a+b)/2,y,b-a,.5,height,wall,{collider:true,material:'concrete'});
          block('module-trim',(a+b)/2,y,b-a,.63,.36,iron,{z:.28,material:'metal'});
          block('module-stain',(a+b)/2,y+.28,(b-a)*.55,.08,height*.42,0x6b615a,{z:height*.3,material:'rust'});
        }
      }
      for(const x of [x1,x2])for(const [a,b] of divided(y1,y2)){
        block('module-wall',x,(a+b)/2,.5,b-a,height,wall,{collider:true,material:'concrete'});
        block('module-trim',x,(a+b)/2,.65,b-a,.36,iron,{z:.28,material:'metal'});
      }
      for(const [a,b] of divided(x1,x2))for(const [c,d] of divided(y1,y2)){
        block('module-floor',(a+b)/2,(c+d)/2,b-a,d-c,.14,floor,{material:'tile'});
        block('roof',(a+b)/2,(c+d)/2,b-a+.1,d-c+.1,.42,wall,{z:height,material:'concrete'});
        block('ceiling-joist',(a+b)/2,(c+d)/2,b-a,.42,.3,iron,{z:height-.5,material:'metal'});
      }
      block('module-beam',door,y2,6.4,.65,.9,cement,{z:height-.9,material:'concrete'});
      for(const offset of [-3.25,3.25])block('module-trim',door+offset,y2,.36,.72,height-.9,iron,{collider:true,material:'metal'});
      panel('module-apron',mid,y2+2,Math.min(x2-x1,15),3,.06,dust,0,'stone');
      // 门缝透出的冷光与顶部吊灯。
      block('light',door,y2+.3,5.4,.12,.16,0x8fc2bd,{z:.1,material:'light'});
      block('ceiling-cord',mid,(y1+y2)/2,.12,.12,.9,iron,{z:height-.5,material:'metal'});
      block('ceiling-lamp',mid,(y1+y2)/2,1.8,.5,.18,0x9fb0ab,{z:height-1.4,material:'light'});
    }
    function tape(x,y,w,z,label){
      block('warning-board',x,y,w,.28,.38,0x79634b,{z,material:'wood',
        id:'module-warning-'+x+'-'+y,
        interactive:{label,verb:'撕开封条',message:'封条下面的漆还是新的。',effect:'read'}});
      for(let dx=-w/2+.4;dx<w/2-.2;dx+=.65)
        block('warning-stripe',x+dx,y+.19,.24,.15,.32,crimson,{z:z+.035,material:'paper'});
      for(const end of [-w/2+.2,w/2-.2])
        block('tape-tail',x+end,y,.18,.36,.7,0x8d7354,{z:z-.5,yaw:end<0?18:-18,material:'paper'});
    }
    function chain(x1,y1,x2,y2,z){
      const length=Math.hypot(x2-x1,y2-y1),yaw=Math.atan2(y2-y1,x2-x1)*180/Math.PI;
      for(let d=.2;d<length;d+=.37){
        const t=d/length;
        block('chain',x1+(x2-x1)*t,y1+(y2-y1)*t,.31,.19,.16,0x636965,
          {z:z-.58*Math.sin(t*Math.PI),yaw,material:'metal'});
      }
    }
    function candle(id,x,y,z){
      block('candle-holder',x,y,.42,.42,.12,iron,{z,material:'metal'});
      block('candle',x,y,.23,.23,.42,linen,{z:z+.12,material:'wax'});
      block('light',x,y,.13,.13,.18,0xeebe78,{z:z+.54,material:'light'});
      if(id)glow(id,x,y,z+.62,0xeaa35f,12);
    }
    function portrait(x,y,z,turn=0){
      block('portrait-frame',x,y,1.05,.18,1.35,0x3c3238,{z,yaw:turn,material:'wood'});
      block('portrait-paper',x,y+.105,.82,.08,1.09,0xb2a69a,{z:z+.13,yaw:turn,material:'paper'});
      block('portrait-shadow',x,y+.157,.44,.07,.56,0x51484e,{z:z+.43,yaw:turn,material:'slate'});
      block('portrait-shadow',x,y+.157,.27,.07,.32,0x51484e,{z:z+.78,yaw:turn,material:'slate'});
    }
    function talisman(x,y,z,turn=0){
      block('talisman',x,y,.48,.06,1.05,0xb2493f,{z,yaw:turn,material:'paper'});
      block('talisman-mark',x,y+.05,.14,.04,.6,0xded0a4,{z:z+.2,yaw:turn,material:'paper'});
    }

    module('infirmary','封存校医室',-70,-47,()=>{
      room(-86,-54,-60,-34,-70,0x6b7772,0x78817e);
      tape(-70,-33.6,5.5,4.6,'校医室封条');
      for(const [i,[x,y]] of [[-79,-54],[-63,-54],[-78,-42]].entries()){
        block('infirmary-bed',x,y,3.1,6.2,.55,iron,{z:.75,collider:true,material:'metal',
          id:'infirmary-bed-'+i,
          interactive:{label:'校医室病床 '+(i+1),verb:'掀开床单',message:'床单下压着一张空白的请假条。',effect:'lift'}});
        block('infirmary-linen',x,y,2.82,5.9,.3,linen,{z:1.3,material:'fabric'});
        block('infirmary-pillow',x,y-1.95,2.08,1.3,.28,0xc7c1b8,{z:1.6,material:'fabric'});
        block('infirmary-stain',x+.55,y+.45,.94,1.3,.1,0x786355,{z:1.62,yaw:18,material:'rust'});
        for(const dx of [-1.26,1.26])for(const dy of [-2.64,2.64])
          block('bed-leg',x+dx,y+dy,.24,.24,.75,iron,{material:'metal'});
        block('iv-stand',x+1.9,y+.5,.16,.16,3.4,0x9ba5a1,{z:.1,material:'metal'});
        block('iv-bag',x+1.9,y+.5,.42,.24,.7,0xb9c6b4,{z:3.0,material:'glass'});
        block('iv-tube',x+1.9,y+.5,.06,.06,1.2,0x8d9a94,{z:2.3,material:'glass'});
      }
      for(let y=-57;y<-39;y+=1.25){
        block('infirmary-curtain',-72,y,.12,.98,5.4,y%2<-.7?0x7b8b81:0x909d90,{z:.8,material:'fabric'});
        block('curtain-rail',-72,y,.22,.12,.1,iron,{z:6.3,material:'metal'});
      }
      for(let x=-84;x<-56;x+=4){
        block('wall-tile',x,-59.72,3.8,.1,2.7,0x8d9a92,{z:1.3,material:'tile'});
        block('wall-tile-line',x,-59.68,3.8,.06,.06,0x5d6a66,{z:2.65,material:'metal'});
      }
      block('light',-64,-44,3.6,.32,.18,0x8ccaca,{z:H-.4,material:'light'});
      glow('infirmary-glow',-64,-43,H-.5,0x90cabe,20);
      native('infirmary-mask','1102015001004250',-58,-54,1.18,180,.45);
      native('infirmary-screen','1101004002001008',-59,-44,.14,90,.25);
      portrait(-74,-59.59,3.4);
      for(const [x,y] of [[-82,-37],[-60,-37],[-84,-49]])
        block('medicine-box',x,y,1.3,.9,.9,0x8c836c,{z:.9,material:'paper'});
      block('medicine-cabinet',-55,-48,1.2,3.2,4.8,0x63716d,{collider:true,material:'metal',
        id:'medicine-cabinet',
        interactive:{label:'药柜',verb:'打开药柜',message:'柜子里只剩一排空药瓶和一张值班表。',effect:'open'}});
      for(const z of [1.4,2.7,4.0])block('cabinet-shelf',-55.6,-48,.1,3.1,.08,0x9aa39a,{z,material:'glass'});
    });

    module('equipment-room','停用器材棚',-15,22,()=>{
      room(-27,-3,16,31,-15,0x716b63,0x666773);
      for(const x of [-23,-10,-6]){
        for(const z of [0,1.1,2.15])block('equipment-crate',x+(z?.24:0),19.4,2.4,1.7,1.03,z>1?0x826953:0x736659,
          {z,yaw:z?6:0,material:'wood'});
        block('equipment-locker',x,26.3,1.3,2.3,5.4,0x555d63,{collider:true,material:'metal',
          id:'equipment-locker-'+x,
          interactive:{label:'器材柜',verb:'拉开柜门',message:'柜门里挂着一件还带着体温的旧校服。',effect:'open'}});
        block('equipment-slot',x,27.48,.92,.1,.26,iron,{z:4.2,material:'metal'});
        for(const z of [1.2,2.6,4.0])block('locker-vent',x,27.47,.7,.06,.09,iron,{z,material:'metal'});
      }
      for(const [x,y,z] of [[-19,22,.15],[-12,27,.15],[-5,24,.15],[-22,29,.15],[-9,17,.15]]){
        block('floor-paper',x,y,.5,.69,.1,0xa39a85,{z,yaw:42+x,material:'paper'});
      }
      for(const [x,y] of [[-24,17],[-4,29],[-16,29]])
        block('equipment-ball',x,y,.8,.8,.8,0x8a7c62,{z:.1,material:'fabric'});
      native('equipment-dummy','1102015001002742',-7,19,.14,154);
      tape(-15,31.33,4.8,4.7,'器材棚封条');
      glow('equipment-bulb',-17,22,H-.5,0xe89a65,18);
      block('light',-17,22,.29,.29,.38,0xd88955,{z:H-.5,material:'light'});
      for(const x of [-25,-15,-5])talisman(x,30.6,4.1,x%7);
    });

    module('memorial','林边纪念角',17,-70,()=>{
      for(const x of [5,17,29])block('memorial-floor',x,-70,12,13,.26,0x646969,{material:'stone'});
      for(const x of [5,17,29]){
        block('memorial-wall',x,-76.5,12,.45,5.2,0x53616b,{collider:true,material:'brick'});
        block('memorial-shelf',x,-75.35,11.85,.76,.18,iron,{z:1.6,material:'metal'});
        block('memorial-moss',x-4,-76.2,2.2,.12,1.6,0x4b5e4d,{z:.6,material:'foliage'});
        block('memorial-plaque',x,-76.2,3.4,.12,.8,0x8a8170,{z:3.6,material:'stone',
          id:'memorial-plaque-'+x,
          interactive:{label:'纪念铭牌',verb:'擦掉青苔',message:'铭牌上没有卒年，只有一行点名序号。',effect:'wipe'}});
      }
      for(let i=0;i<11;i++){
        const x=2.5+i*2.85;
        portrait(x,-76.19,2.65-(i%3===1?.14:0));
        candle(i===5?'memorial-flame':null,x+.4,-75.27,1.95);
        if(i%3===0)block('memorial-flower',x+1.1,-75.4,.5,.5,.7,0x8b5a63,{z:1.75,material:'fabric'});
      }
      for(const [x,y,angle] of [[-1,-70,12],[8,-79,35],[31,-74,30],[28,-65,135]])
        native('memorial-tree-'+x,'1102015001004712',x,y,0,angle);
      for(const [x,y] of [[1,-72],[9,-69],[23,-69],[30,-72]])
        native('memorial-dry-'+x,'1102015001004756',x,y,.24,25);
      for(const [x,y] of [[6,-64],[17,-63],[28,-64]]){
        block('memorial-lantern',x,y,.8,.8,1.1,0x6b6252,{z:.2,material:'metal'});
        block('light',x,y,.5,.5,.4,0xe0b070,{z:1.3,material:'light'});
      }
    });

    module('sealed-gallery','封锁连廊',60,-7,()=>{
      for(const y of [-22,-16,-10,-4,2,8]){
        for(const x of [54.43,65.57]){
          block('gallery-screen',x,y,.22,2.59,2.6,0x46545e,{z:4.4,material:'glass'});
          block('gallery-sill',x,y,.63,2.8,.2,iron,{z:4.2,material:'metal'});
          block('screen-crack',x,y,.06,2.2,.06,0x8fa0a2,{z:5.7,yaw:24,material:'glass'});
        }
        block('ceiling-dangling',63.9,y,.12,.15,1.4,0x50545d,{z:6.1,material:'metal'});
        talisman(63.9,y-.3,5.1,y*3);
      }
      for(const side of [-1,1]){
        const x=60+side*5.2;
        chain(x,-16,x,-8,5.2);
        chain(x,-6,x,2,5.1);
        for(const y of [-17,-8,0,7])
          block('gallery-oxidation',x,y,.33,1.18,.1,0x744c53,{z:.23,yaw:side*25,material:'rust'});
      }
      for(const [x,y] of [[56.1,-3.1],[63.8,2],[56.4,7.6]])
        native('gallery-barrier-'+x,'1102015001002732',x,y,.12,90);
      for(const y of [-18,-2,6]){
        block('gallery-drag',60,y,2.2,3.4,.04,0x6d4247,{z:.12,yaw:12,material:'rust'});
        block('gallery-puddle',60.8,y+.6,3.2,1.8,.04,0x3b5057,{z:.14,material:'wet'});
      }
      block('light',60,-8,2.35,.23,.18,0xd36060,{z:6.6,material:'light'});
      glow('gallery-scare-glow',62.9,-6.4,6.2,0xcd585f,15,4);
      native('gallery-mist','1101008001001082',62,-10,.32,78);
    });
  }
  if(typeof module==='object')module.exports={author};
  else root.CampusHorrorModules={author};
})(globalThis);
