
const app=document.querySelector('#app'), names=['蔷薇公主','潮汐公主','星砂公主'],themes=['玫瑰粉 · 金发卷辫','海盐蓝 · 栗色短发','鸢尾紫 · 银白双髻'],base=['#f580ac','#55baca','#aa87e0'],hair=['#efb744','#7c443b','#e6dded'],skin=['#f8c5a0','#c88e69','#ab7659'],places=['皇冠城门','蔷薇花园','星灯露台'],games=['王国问答','企鹅冰原冒险','金币雨'],items=[['礼裙','花瓣礼裙',24,'#e75589'],['礼裙','午夜星裙',42,'#4e58a5'],['头饰','薄荷蝴蝶结',16,'#67d0bb'],['头饰','珊瑚花冠',28,'#ff886c'],['手持','金星魔杖',32,'#f5c445']];
let s={who:null,coins:0,owned:[],wear:[-1,-1,-1],place:0,photos:[]};try{Object.assign(s,JSON.parse(localStorage.crownBrick1||'{}'))}catch{}let angle=.33,mode='',tab='',notice='',round=null,raf=0,keys={},last=0,paused=false;
function save(){try{localStorage.crownBrick1=JSON.stringify(s)}catch{notice='本次进度只保存在当前页面。'}wallet.textContent='◉　'+s.coins+' 金币'}
function btn(t,fn,cl=''){return '<button class="'+cl+'" onclick="'+fn+'">'+t+'</button>'}
function shade(c,k){let n=parseInt(c.slice(1),16);return 'rgb('+[16,8,0].map(i=>Math.min(255,Math.round(((n>>i)&255)*k))).join(',')+')'}
// Orthographic toy diorama. Every surface is projected from model coordinates.
let renderer;
function drawMesh(g,w,h,points,colors,turn,scale,cx,cy){
  if(renderer===false || !window.THREE)return false;
  if(!renderer){
    try{renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true})}
    catch{renderer=false;return false}
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(points,3));
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  const material=new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide});
  const scene=new THREE.Scene();
  scene.add(new THREE.Mesh(geometry,material));
  const camera=new THREE.OrthographicCamera(-cx/scale,(w-cx)/scale,cy/scale,-(h-cy)/scale,.1,100);
  const elevation=Math.asin(.30);
  camera.position.set(30*Math.sin(turn)*Math.cos(elevation),30*Math.sin(elevation),30*Math.cos(turn)*Math.cos(elevation));
  camera.lookAt(0,0,0);
  renderer.setSize(w,h,false);
  renderer.render(scene,camera);
  g.drawImage(renderer.domElement,0,0);
  geometry.dispose();
  material.dispose();
  return true;
}
function art(cv,who,world=false,turn=.33,portrait=false){
let w=cv.width,h=cv.height,g=cv.getContext('2d'),faces=[],points=[],colors=[],place=s.place,sky=portrait?['#ffe1e8','#d9f1ed','#ede2ff'][who]:['#c7e7fa','#c9eddf','#b7b8df'][place],bg=g.createLinearGradient(0,0,0,h);bg.addColorStop(0,sky);bg.addColorStop(1,portrait?'#fff7ec':'#fff0d6');g.fillStyle=bg;g.fillRect(0,0,w,h);
let scale=portrait?Math.min(h/4.5,w/2.9):Math.min(w/15,h/9),cx=w*.5,cy=h*(portrait?.88:.78),co=Math.cos(turn),si=Math.sin(turn);
function proj([x,y,z]){let d=x*si+z*co;return [cx+(x*co-z*si)*scale,cy+(d*.30-y*.954)*scale,d*.954+y*.30]}
function poly(v,c,k=1){const tint=shade(c,k);
  if(window.THREE && renderer!==false){
    const color=new THREE.Color(tint);
    for(let i=1;i<v.length-1;i++){
      points.push(...v[0],...v[i],...v[i+1]);
      for(let j=0;j<3;j++)colors.push(color.r,color.g,color.b);
    }
  }
  let p=v.map(proj);faces.push([p.reduce((a,b)=>a+b[2],0)/p.length,p,shade(c,k)])}
function geom(x,y,z,r,t,H,c,n=12,rot=0,depth=1){let ring=(R,Y)=>Array.from({length:n},(_,i)=>[x+Math.cos(i*2*Math.PI/n+rot)*R,Y,z+Math.sin(i*2*Math.PI/n+rot)*R*depth]);let a=ring(r,y),b=ring(t,y+H);for(let i=0;i<n;i++){let j=(i+1)%n;poly([a[i],a[j],b[j],b[i]],c,.83+.14*Math.cos(i*2*Math.PI/n+1))}poly(b,c,1.07)}
function box(x,y,z,W,H,D,c){geom(x,y,z,W*.7071,W*.7071,H,c,4,Math.PI/4,D/W)}
function stud(x,y,z,c){geom(x,y,z,.135,.135,.09,c)}
function tower(x,z,H,r){geom(x,0,z,r,r,H*.47,'#899bac');geom(x,H*.47,z,r,r,H*.53,'#ef96b7');geom(x,H*.94,z,r*1.12,r*1.12,.22,'#f3c779');geom(x,H+.14,z,r*1.23,.08,1.35,'#238bc3');geom(x,H+1.48,z,.10,.016,.45,'#edb84d')}
if(world){box(0,-.45,0,11,.45,6,'#99a6ac');box(0,-.10,0,10.8,.12,5.8,place===1?'#91c99f':'#ded3c3');
if(place===0){box(0,0,-1.1,6.8,3.1,2,'#efadbf');box(0,2.95,-1.1,6.9,.22,2.15,'#e8bd77');tower(0,-1.65,5.4,.85);for(let x of [-3,3])tower(x,-.9,3.3,.78);for(let x of [-1.55,1.55])tower(x,.22,2.45,.59);box(0,0,.08,1.8,2.05,.4,'#dfb86e');geom(0,.0,.36,.7,.7,1.75,'#965c45',4,Math.PI/4,.25);for(let x of [-1,1])box(x,2,-.04,.45,.73,.1,'#698bad')}
else if(place===1){for(let x of [-3,-1.5,1.5,3]){box(x,0,-1,.55,1,.55,'#997153');geom(x,1,-1,.9,.68,1.2,'#78b79c');for(let j=0;j<5;j++)geom(x+Math.cos(j)*.66,1.5+(j%2)*.33,-1+Math.sin(j)*.7,.23,.19,.2,'#f58faf')}box(0,0,-1,2.6,.35,1.3,'#a2bdc4');geom(0,.35,-1,.64,.40,.4,'#88d9ed')}
else{for(let x of [-4,-2,0,2,4]){box(x,0,-1.5,.32,1.8,.32,'#937caa');geom(x,1.8,-1.5,.33,.18,.48,'#ffdb82')}box(0,.9,-1.5,8,.18,.23,'#ead5a7');geom(-2.8,0,0,.9,.86,1,'#ada0c5')}
for(let x=-5;x<=5;x++)for(let z of [1.9,2.5])stud(x,.02,z,'#d5c9bb')}
if(who!==null){let z=world?2:0,S=world?.78:1,y=0;let G=(x,Y,Z,r,t,H,c,n=12)=>geom(x*S,Y*S,z+Z*S,r*S,t*S,H*S,c,n),B=(x,Y,Z,W,H,D,c)=>box(x*S,Y*S,z+Z*S,W*S,H*S,D*S,c);let dressed=world||!portrait,cloth=dressed&&s.wear[0]>=0?items[s.wear[0]][3]:base[who],head=dressed?s.wear[1]:-1;
G(0,.05,0,.87,.43,1.08,cloth,10);G(0,.12,0,.85,.81,.09,'#f7d086',10);B(0,1.12,0,.85,.72,.62,cloth);B(0,1.12,.02,.86,.13,.64,'#f8cf77');for(let side of [-1,1]){B(side*.54,1.32,0,.28,.42,.37,cloth);G(side*.54,1.06,.04,.16,.17,.29,skin[who])}
B(0,1.88,0,1.06,.86,.85,skin[who]);B(0,2.66,-.04,1.15,.25,.93,hair[who]);B(-.32,2.49,.44,.53,.27,.10,hair[who]);for(let side of [-1,1]){B(side*.50,who===0?1.8:2.16,-.11,.26,who===0?.95:.59,.71,hair[who]);B(side*.225,2.32,.445,.10,.13,.045,'#412f44');B(side*.32,2.22,.448,.14,.045,.035,'#ec9f94');if(who===2)G(side*.6,2.68,-.08,.29,.23,.32,hair[who])}B(0,2.15,.455,.15,.045,.04,'#a95865');
if(head<0){G(0,2.9,0,.34,.39,.18,'#efb845',8);for(let i=0;i<5;i++)G(Math.cos(i*1.257)*.29,3.05,Math.sin(i*1.257)*.29,.12,.02,.26,'#f3c451',5)}else for(let i=0;i<(head===2?2:7);i++)G(head===2?(i-.5)*.37:Math.cos(i)*.38,2.87,head===2?.22:Math.sin(i)*.34,.22,.15,.23,items[head][3],6);
if(dressed&&s.wear[2]>=0){B(.64,.99,.18,.055,.89,.06,'#bc9160');G(.64,1.81,.18,.21,.02,.28,'#ffd051',5)}}
if(drawMesh(g,w,h,points,colors,turn,scale,cx,cy))return;faces.sort((a,b)=>a[0]-b[0]);for(let [,p,c] of faces){g.beginPath();p.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();g.fillStyle=c;g.fill();g.strokeStyle=c;g.lineWidth=.7;g.stroke()}}
function draw(id,who,world,a,portrait){let cv=document.getElementById(id);cv.width=Math.max(1,cv.clientWidth*1.6);cv.height=Math.max(1,cv.clientHeight*1.6);art(cv,who,world,a,portrait)}
function choose(){mode='choose';app.innerHTML='<section class="hero"><canvas id="castle"></canvas><div class="herotxt"><small class="tag">公主换装图鉴</small><h1>皇冠积木城</h1><p>赢取第一枚金币，为你的公主搭配一张城堡明信片。</p></div></section><h2>选择你的公主</h2><div class="grid">'+names.map((n,i)=>'<button class="card" onclick="pick('+i+')"><canvas id="p'+i+'"></canvas><span class="caption">'+n+'<small>'+themes[i]+'</small></span></button>').join('')+'</div>';artCastle();names.forEach((_,i)=>draw('p'+i,i,false,.22,true))}
function artCastle(){let p=s.place;s.place=0;draw('castle',null,true,.36);s.place=p}function pick(i){s.who=i;save();home('衣橱')}
function home(t=tab||'衣橱'){mode='home';tab=t;round=null;cancelAnimationFrame(raf);keys={};app.innerHTML='<div class="row"><h2 style="margin:0 auto 0 0">'+places[s.place]+'</h2>'+btn('更换公主','choose()')+'</div><canvas class="stage" id="stage" aria-label="可拖动旋转的三维公主与积木场景"></canvas><div class="row">'+places.map((p,i)=>btn(p,'scene('+i+')',s.place===i?'primary':'')).join('')+btn('↶ 转动展台','rotate()')+btn('📷 打卡拍照','photo()','primary')+'</div><div class="row">'+['衣橱','游乐厅','相册'].map(p=>btn(p,"home(\''+p+'\')",p===t?'primary':'')).join('')+'</div><section class="panel" id="panel"></section><p role="status" id="msg"></p>';draw('stage',s.who,true,angle);let cv=document.querySelector('#stage'),px=null;cv.onpointerdown=e=>{px=e.clientX;cv.setPointerCapture(e.pointerId)};cv.onpointermove=e=>{if(px!==null){angle+=(e.clientX-px)*.009;px=e.clientX;art(cv,s.who,true,angle)}};cv.onpointerup=cv.onpointercancel=()=>px=null;
panel.innerHTML=t==='衣橱'?'<h3>'+names[s.who]+'的衣橱</h3>'+['礼裙','头饰','手持'].map((cat,j)=>'<div class="row"><b>'+cat+'</b>'+btn(j===2?'空手':'初始款','equip(-1,'+j+')',s.wear[j]===-1?'primary':'')+items.map(([c,n,cost],i)=>c===cat?btn(n+' · '+(s.owned.includes(i)?s.wear[j]===i?'已穿戴':'穿戴':cost+'币'),'equip('+i+','+j+')',s.wear[j]===i?'primary':''):'').join('')+'</div>').join(''):t==='游乐厅'?'<h3>选择小游戏</h3><div class="row">'+games.map((n,i)=>btn(n,'intro('+i+')')).join('')+'</div>':'<h3>打卡相册</h3><div class="gallery">'+(s.photos.map(o=>'<a download="皇冠积木城明信片.png" href="'+o.img+'"><img src="'+o.img+'" alt="'+o.name+'"></a>').join(' ')||'相册还是空的。在展台上转到喜欢的角度，拍下第一张明信片。')+'</div><small>保留最近六张，点击照片可下载。</small>';msg.textContent=notice;notice=''}
function scene(i){s.place=i;angle=.33;save();home()}function rotate(){angle+=.45;art(stage,s.who,true,angle)}
function equip(i,j){if(i>=0&&!s.owned.includes(i)){let cost=items[i][2];if(s.coins<cost){msg.textContent='还差 '+(cost-s.coins)+' 枚金币，去游乐厅玩一局吧。';return}s.coins-=cost;s.owned.push(i)}s.wear[j]=i;notice='已搭配 '+(i<0?'初始款':items[i][1]);save();home()}
function photo(){let cv=document.createElement('canvas');cv.width=720;cv.height=480;art(cv,s.who,true,angle);let g=cv.getContext('2d');g.fillStyle='#fff5e7';g.fillRect(0,428,720,52);g.fillStyle='#563961';g.font='bold 22px Microsoft YaHei';let name=places[s.place]+'　·　'+names[s.who];g.fillText(name,24,462);s.photos.unshift({name,img:cv.toDataURL('image/png')});s.photos.length=Math.min(6,s.photos.length);notice='明信片已收入相册';save();home('相册')}
const rules=['五题任选，答对一题得 6 币。答完即可结算。','三条冰道向远方延伸。左右换道，跳过冰裂或避开海豹，拾鱼得 3 币。三颗心，抵达 600 米的旗门另得 12 币。','20 秒内左右移动接住落下的金币，每枚值 2 币。漏接可继续。'],qs=[['盛装舞会想搭配冷色系，哪一组更合适？','湖蓝与淡紫','朱红与橙黄',0],['用积木搭高塔，哪种底座更稳？','窄而高','宽而平',1],['拍照时想让皇冠轮廓清楚，应选什么背景？','颜色接近的金墙','与金色有对比的蓝墙',1],['想让礼裙成为照片主角，适合怎样构图？','保留完整裙摆','把裙摆藏在围墙后',0],['红色和白色颜料混合会得到什么颜色？','粉色','绿色',0],['三角形尖塔从正面看，轮廓更接近什么？','圆形','三角形',1]];
function intro(i){mode='intro';app.innerHTML='<section class="panel"><small class="tag">皇家游乐厅</small><h1>'+games[i]+'</h1><p>'+rules[i]+'</p>'+btn('开始挑战','start('+i+')','primary')+' '+btn('返回展台',"home(\'游乐厅\')")+'</section>'}
function start(i){mode='play';paused=false;keys={};round={i,t:0,score:0,idx:0,deck:[...qs].sort(()=>Math.random()-.5).slice(0,5),x:0,lane:0,jump:0,life:3,spawn:.7,objects:[],answered:false};if(!i){quiz();return}app.innerHTML='<h2>'+games[i]+'</h2><p>'+rules[i]+'</p><canvas class="stage" id="arena" width="900" height="470"></canvas><div class="row"><button class="pad" data-k="ArrowLeft">◀ 左移</button><button class="pad" data-k="ArrowRight">右移 ▶</button>'+(i===1?'<button class="pad" data-k=" ">跳跃</button>':'')+btn('暂停 / 继续','pauseGame()')+btn('提前结算','finish()')+'</div><p id="hud"></p>';document.querySelectorAll('[data-k]').forEach(b=>{b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);press(b.dataset.k)};b.onpointerup=b.onpointercancel=()=>keys[b.dataset.k]=false});last=performance.now();raf=requestAnimationFrame(tick)}
function quiz(){let r=round,q=r.deck[r.idx];app.innerHTML='<section class="panel"><small class="tag">王国问答　'+(r.idx+1)+' / 5</small><h2>'+q[0]+'</h2><div class="row">'+btn(q[1],'answer(0)')+btn(q[2],'answer(1)')+'</div><div id="feedback" role="status"></div></section>'}
function answer(n){let r=round;if(r.answered)return;r.answered=true;let q=r.deck[r.idx],ok=n===q[3];if(ok)r.score+=6;feedback.innerHTML='<p>'+(ok?'答对了！＋6 金币':'正确答案是「'+q[1+q[3]]+'」')+'</p>'+btn(r.idx===4?'领取金币':'下一题','nextQ()','primary')}
function nextQ(){if(++round.idx===5)finish();else{round.answered=false;quiz()}}
function finish(){let r=round;if(!r)return;round=null;mode='result';cancelAnimationFrame(raf);keys={};s.coins+=r.score;save();app.innerHTML='<section class="panel"><small class="tag">'+games[r.i]+' · 结算</small><h1>＋'+r.score+' 金币</h1><p>'+(r.i===1?(r.life===0?'冰原救援车接回了企鹅。':'本次滑行 '+Math.min(600,Math.floor(r.t*24))+' 米。'):'本局奖励已收入钱包。')+'</p><div class="row">'+btn('去换装',"home(\'衣橱\')",'primary')+btn('再玩一次','start('+r.i+')')+btn('游乐厅',"home(\'游乐厅\')")+'</div></section>'}
function press(k){if(!round||paused||keys[k])return;keys[k]=true;if(round.i===1){if(k==='ArrowLeft'||k==='ArrowRight')round.lane=Math.max(-1,Math.min(1,round.lane+(k==='ArrowLeft'?-1:1)));if(k===' '&&round.jump<=0)round.jump=.86}}
onkeydown=e=>{if(mode==='play'&&round?.i&&['ArrowLeft','ArrowRight',' '].includes(e.key)){e.preventDefault();press(e.key)}};onkeyup=e=>keys[e.key]=false;function pauseGame(){paused=!paused;keys={}}onblur=()=>{if(mode==='play'&&round?.i){paused=true;keys={}}};
function tick(now){let r=round;if(!r)return;let dt=paused?0:Math.min(.05,(now-last)/1000);last=now;r.t+=dt;r.spawn-=dt;r.jump=Math.max(0,r.jump-dt);let ice=r.i===1;
r.x=ice?r.x+(r.lane-r.x)*Math.min(1,dt*13):Math.max(-1,Math.min(1,r.x+((keys.ArrowRight?1:0)-(keys.ArrowLeft?1:0))*dt*1.65));
if(r.spawn<=0){r.spawn=ice?.86:.64;r.objects.push({x:ice?Math.floor(Math.random()*3)-1:Math.random()*1.9-.95,d:0,kind:ice?['鱼','裂','豹'][Math.floor(Math.random()*3)]:'币'})}
let cv=arena,g=cv.getContext('2d'),W=900,H=470;let bg=g.createLinearGradient(0,0,0,H);bg.addColorStop(0,ice?'#8199cb':'#ebc0d5');bg.addColorStop(1,ice?'#e1f8ff':'#ffe7bc');g.fillStyle=bg;g.fillRect(0,0,W,H);
function poly2(p,c){g.fillStyle=c;g.beginPath();p.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();g.fill()}
if(ice){for(let j=0;j<8;j++)poly2([[j*130-90,115],[j*130,30+(j%3)*12],[j*130+100,115]],'#f2f8ff');for(let i=0;i<3;i++)poly2([[405+i*30,108],[435+i*30,108],[225+i*450,H],[-225+i*450,H]],i%2?'#91cade':'#bce2eb')}
let X=(x,d)=>450+x*(ice?32+320*d:400),Y=d=>ice?108+310*d*d:38+380*d;
for(let o of r.objects){o.d+=dt*(ice?.45:.53);let x=X(o.x,o.d),y=Y(o.d),sz=ice?10+34*o.d:32;
g.font=sz+'px Segoe UI Emoji';g.textAlign='center';if(o.kind==='裂'){poly2([[x-sz,y],[x-6,y-7],[x+sz,y-3],[x+4,y+6]],'#376b87')}else{g.fillText(o.kind==='鱼'?'🐟':o.kind==='豹'?'🦭':'🪙',x,y)}
if(!o.hit&&o.d>=.93){o.hit=true;if(Math.abs(r.x-o.x)<(ice?.48:.15)){if(o.kind==='币'||o.kind==='鱼')r.score+=ice?3:2;else if(!(o.kind==='裂'&&r.jump>.12))r.life--}}}r.objects=r.objects.filter(o=>o.d<1.12);
let px=X(r.x,.93),py=Y(.93)-(ice?Math.sin(Math.PI*r.jump/.86)*67:0);g.textAlign='center';g.font='48px Segoe UI Emoji';if(ice){let sprite=['...BBBB...','..BBBBBB..','..BWWBWB..','..BWWOOB..','..BWWWWB..','.BBWWWWBB.','BBBWWWWBBB','..BBBBBB..','..OO..OO..'];let palette={B:'#293b59',W:'#fff8e5',O:'#f0aa4d'};sprite.forEach((row,j)=>[...row].forEach((p,i)=>{if(palette[p]){g.fillStyle=palette[p];g.fillRect(px-25+i*5,py-35+j*5,5,5)}}));if(r.t>21){let d=(r.t-21)/4;g.fillStyle='#eb715e';g.fillRect(450-35-80*d,Y(d)-28,5,32);poly2([[420-80*d,Y(d)-28],[445-80*d,Y(d)-20],[420-80*d,Y(d)-13]],'#ffcd57')}}else g.fillText('🧺',px,py+12);
hud.textContent=(ice?'♥ '+r.life+'　'+Math.floor(r.t*24)+' / 600 米':'剩余 '+Math.ceil(Math.max(0,20-r.t))+' 秒')+'　◉ '+r.score+' 金币';if(paused){g.fillStyle='#352544bb';g.fillRect(0,0,W,H);g.fillStyle='white';g.font='bold 32px Microsoft YaHei';g.fillText('已暂停 · 点击继续',450,235)}
if(r.life<=0||r.t>=(ice?25:20)){if(ice&&r.life>0)r.score+=12;finish();return}raf=requestAnimationFrame(tick)}
save();if(s.who===null)choose();else home('衣橱');
