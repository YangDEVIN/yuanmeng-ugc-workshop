// Distances are measured along the road. The renderer projects these same positions.
class PrincessRun {
  constructor(){this.stage=1;this.score=0;this.begin();this.mode='ready';}
  begin(){
    this.distance=0;this.length=840+this.stage*70;this.time=this.length/24+8;
    this.x=0;this.speed=23;this.jump=0;this.wings=0;this.stun=0;this.mode='run';
    let seed=9127*this.stage;
    const random=()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296;};
    const kinds=['hole','crack','seal','flag','fish','flag','magic'];
    this.objects=[];
    for(let z=32;z<this.length-12;z+=14+random()*17){
      const kind=kinds[Math.floor(random()*kinds.length)];
      this.objects.push({kind,z,x:random()*1.55-.775,variant:Math.floor(random()*3),done:false});
    }
  }
  leap(){if(this.mode==='run'&&!this.stun&&(!this.jump||this.wings>0))this.jump=.82;}
  get height(){return Math.sin(Math.PI*this.jump/.82);}
  tick(dt,keys){
    if(this.mode!=='run')return;
    this.time-=dt;if(this.time<=0){this.time=0;this.mode='lost';return;}
    this.jump=Math.max(0,this.jump-dt);this.wings=Math.max(0,this.wings-dt);this.stun=Math.max(0,this.stun-dt);
    if(!this.stun){
      this.x=Math.max(-.92,Math.min(.92,this.x+((keys.right?1:0)-(keys.left?1:0))*dt*1.7));
      this.speed=Math.max(12,Math.min(38,this.speed+((keys.fast?1:0)-(keys.slow?1:0))*dt*21));
    }
    this.distance+=this.speed*dt;
    for(const o of this.objects){
      if(o.done||o.z>this.distance)continue;
      o.done=true;
      if(Math.abs(this.x-o.x)>(o.kind==='crack'?.60:.23))continue;
      if(o.kind==='flag'){this.score+=[500,600,700][o.variant];continue;}
      if(o.kind==='magic'){this.score+=1000;this.wings=5;continue;}
      if(o.kind==='fish'){if(this.height>.23)this.score+=o.variant===0?500:300;continue;}
      if(this.height>.28){if(o.kind!=='seal')this.score+=30;continue;}
      this.speed=8;this.jump=0;this.stun=.8;
    }
    if(this.distance>=this.length){this.score+=Math.floor(this.time)*100;this.mode=this.stage===10?'won':'station';}
  }
}
if(typeof module!=='undefined')module.exports=PrincessRun;
if(typeof document!=='undefined'){
const $=id=>document.getElementById(id),canvas=document.querySelector('canvas'),g=canvas.getContext('2d');
const runner=document.querySelector('.runner');
let game=new PrincessRun(),keys={},last=0;
function rect(x,y,w,h,c){g.fillStyle=c;g.fillRect(Math.round(x),Math.round(y),Math.ceil(w),Math.ceil(h));}
function castle(x,y,s){
  for(const dx of [-8,0,8]){rect(x+(dx-3)*s,y-8*s,6*s,8*s,'#956b9d');rect(x+(dx-4)*s,y-10*s,8*s,2*s,'#d4adbc');rect(x+(dx-2)*s,y-13*s,4*s,3*s,'#a84777');}
  rect(x-s,y-4*s,2*s,4*s,'#413350');
}
function roadCenter(z){return 128+Math.sin((game.distance+z)/78)*Math.min(32,z*.28);}
function draw(){
  const night=game.stage%3===0;rect(0,0,256,192,night?'#685196':'#819bd2');rect(0,37,256,30,night?'#b18db9':'#f1bac7');rect(193,12,17,17,'#ffe39c');
  for(let x=0;x<256;x++){const y=61-Math.abs((x+game.stage*14)%48-24)*.67;rect(x,y,1,69-y,'#9e8aba');}
  const left=Math.max(0,game.length-game.distance);castle(roadCenter(left),66,Math.max(.8,4/(1+left/28)));
  for(let y=67;y<192;y++){const depth=(y-66)/120,z=12*(1/depth-1),cx=roadCenter(z),half=10+depth*143;
    rect(0,y,256,1,Math.floor((z+game.distance)/7)%2?'#9acccc':'#b4d8d8');rect(cx-half,y,half*2,1,'#f4e8e2');rect(cx-half,y,Math.max(1,depth*4),1,'#bbadd2');rect(cx+half,y,Math.max(1,depth*4),1,'#bbadd2');}
  for(let i=game.objects.length-1;i>=0;i--){const o=game.objects[i],z=o.z-game.distance;if(o.done||z>150)continue;
    const d=12/(12+z),x=roadCenter(z)+o.x*(10+d*143),y=66+d*120,s=Math.max(.4,d*2);
    if(o.kind==='flag'||o.kind==='magic'){rect(x,y-11*s,s,11*s,'#59415b');rect(x+s,y-11*s,6*s,4*s,o.kind==='magic'?['#ffdf61','#fe799b'][Math.floor(performance.now()/160)%2]:['#51aa8b','#ef955e','#669ee2'][o.variant]);}
    else if(o.kind==='fish'){rect(x-3*s,y-10*s,6*s,3*s,'#e9985a');rect(x+3*s,y-11*s,2*s,5*s,'#fdc569');}
    else {const w=(o.kind==='crack'?48:17)*s;rect(x-w/2,y-2*s,w,3*s,'#5f688c');rect(x-w*.35,y+s,w*.7,2*s,'#a7bfd0');if(o.kind==='seal'){rect(x-3*s,y-8*s,6*s,7*s,'#74627b');rect(x+s,y-7*s,s,s,'#fff');}}
  }
  const px=128+game.x*153,py=184-game.height*36;rect(px-9,184,18,2,'#aca3bd');
  const step=Math.floor(game.distance/1.7)%8;
  const pose=game.jump?(game.jump>.55?2:game.jump>.22?3:7):game.stun?1:step;
  runner.style.left=(px/256*100)+'%';
  runner.style.top=(py/192*100)+'%';
  runner.style.backgroundPosition=((pose%4)*100/3)+'% '+(pose<4?0:100)+'%';
  $('stage').textContent='驿站 '+game.stage+'/10';$('time').textContent=Math.ceil(game.time)+' 秒';$('rest').textContent=Math.ceil(left)+' 米';$('score').textContent=game.score+' 分';
  const state={ready:'抵达下一座冰雪城堡。',lost:'时间到',won:'十座驿站全部抵达！',station:'抵达驿站！剩余时间已折算得分。',paused:'已暂停',run:game.wings?'获得飞行旗 · 连按跳跃可滑翔':game.stun?'撞到障碍，正在恢复':'冒险中'}[game.mode];
  if($('state').textContent!==state)$('state').textContent=state;
  $('start').textContent=game.mode==='station'?'前往下一站':['ready','won','lost'].includes(game.mode)?'开始冒险':'重新开始';
}
function start(){if(game.mode==='station')game.stage++;else game=new PrincessRun();game.begin();keys={};document.activeElement.blur();$('pause').textContent='暂停';}
function pause(){if(game.mode==='run')game.mode='paused';else if(game.mode==='paused')game.mode='run';keys={};$('pause').textContent=game.mode==='paused'?'继续':'暂停';}
$('start').onclick=start;$('pause').onclick=pause;
const input={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'fast',ArrowDown:'slow',' ':'jump'};
document.addEventListener('keydown',e=>{if(e.key.toLowerCase()==='p'&&!e.repeat)pause();const key=input[e.key];if(!key||game.mode!=='run'||(e.key===' '&&e.target.tagName==='BUTTON'))return;e.preventDefault();keys[key]=true;if(key==='jump'&&!e.repeat)game.leap();});
document.addEventListener('keyup',e=>{delete keys[input[e.key]];});
document.querySelectorAll('[data-key]').forEach(b=>{const key=b.dataset.key;b.onpointerdown=e=>{b.setPointerCapture(e.pointerId);keys[key]=true;if(key==='jump')game.leap();};b.onlostpointercapture=()=>{delete keys[key];};});
window.addEventListener('blur',()=>{if(game.mode==='run')pause();});
function frame(now){game.tick(Math.min(.05,(now-last)/1000),keys);last=now;draw();requestAnimationFrame(frame);}requestAnimationFrame(frame);
}
