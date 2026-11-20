const games=['王国问答','公主滑雪冒险','左右接金币'],places=['星月课堂','公主滑雪场','皇家铸币坊'];
let game=Number(new URLSearchParams(location.search).get('game'));if(![0,1,2].includes(game))game=0;
let state={area:game,who:0,coins:0,receipt:null},origin=game,score=0,step=0,answered=false,paused=false,nextId='',screen='',message='',target=null;
try{const s=JSON.parse(localStorage.getItem('castle-arcade-wallet'));if(s){state.coins=s.coins;state.receipt=s.receipt}}catch{}
function persist(){localStorage.setItem('castle-arcade-wallet',JSON.stringify({coins:state.coins,receipt:state.receipt}))}
function hub(){parent.postMessage({type:'castle-arcade-exit'},location.origin)}
function abandon(){hub()}
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
      this.x=Math.max(-.92,Math.min(.92,this.x+Math.max(-1,Math.min(1,(keys.steer||0)+Number(!!keys.right)-Number(!!keys.left)))*dt*1.7));
      this.speed=Math.max(12,Math.min(38,this.speed+Math.max(-1,Math.min(1,(keys.throttle||0)+Number(!!keys.fast)-Number(!!keys.slow)))*dt*21));
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


const prompts=[['蔷薇花园的代表花是哪一种？','玫瑰','向日葵',0],['哪一种装饰属于薄荷潮汐公主？','彗星','贝壳',1],['回到城门最快的方式是？','使用传送盘','进入衣橱',0]];
function b(label,action,cls=''){return '<button class="'+cls+'" onclick="'+action+'">'+label+'</button>'}
function frame(id,title,body){screen=id;wallet.textContent='金币　'+state.coins;app.innerHTML='<h1>'+title+'</h1>'+body+(message?'<p class="note" role="status">'+message+'</p>':'');message=''}
function play(){if(paused){frame('pause','已暂停',b('继续本局','paused=false;play()','primary')+' '+b('放弃本局并返回','abandon()'));return}let prompt=game===0?prompts[step]:game===1?[['前方是织带旗','靠近旗帜','绕行'],['前方是裂缝','直行','跳跃'],['前方是魔法星','拾取','绕行']][step]:[['金币落在左侧','篮筐向左','篮筐向右'],['金币落在右侧','篮筐向左','篮筐向右'],['金币落在左侧','篮筐向左','篮筐向右']][step];frame('play',games[game],'<small>'+['题目','驿站事件','落币'][game]+' '+(step+1)+' / 3　·　当前'+(game===1?'分数 ':'金币 ')+score+'</small><h2>'+prompt[0]+'</h2><div class="bar">'+b(prompt[1],'answer(0)')+b(prompt[2],'answer(1)')+'</div>'+b('暂停','paused=true;play()'))}
function answer(n){if(screen!=='play'||answered)return;answered=true;let ok=n===(game===0?prompts[step][3]:[0,1,0][step]),gain=ok?(game===0?6:game===1?[500,30,1000][step]:2):0;score+=gain;frame('feedback',ok?'成功':'本次未得分','<p>'+[ok?'答对了':'正确答案：'+prompts[step][1+prompts[step][3]],ok?'完成赛道动作':'错过道具或受到减速',ok?'接住了金币':'金币落在篮筐外'][game]+'　＋'+gain+(game===1?' 分':' 币')+'</p>'+b(step===2?'查看结算':'继续','advance()','primary'))}
function advance(){if(screen!=='feedback')return;if(++step<3){answered=false;play();return}let reward=game===1?Math.min(30,Math.floor(score/100)):score;if(state.receipt?.id!==nextId){state.coins+=reward;state.receipt={id:nextId,reward,game};persist()}frame('result',games[game]+' · 结算','<h2>本局 ＋'+reward+' 金币</h2><p>已入账 · 当前余额 '+state.coins+' 币</p><div class="bar">'+''+b('再玩一次','start()')+b('返回'+places[origin],'target=null;hub()')+'</div>')}
let sim,buttons={},clock=0,loop=0;
const gameRules=['回答三道题，每答对一题得 6 枚金币。','方向键左右移动、上下变速，空格跳跃。拾旗得分，避开缺砖。每 100 分兑换 1 币，单局上限 30 币。','20 秒内移动篮筐接金币，每枚得 2 币。按住左右键或下方按钮移动。'];
function rules(i){game=i;frame('rules',games[i],'<p>'+gameRules[i]+'</p>'+b('开始','start()','primary')+' '+b('返回入口','hub()'))}
function start(){origin=state.area;score=0;step=0;answered=false;paused=false;nextId=Date.now().toString(36)+Math.random().toString(36).slice(2);if(!game){play();return}sim=game===1?new PrincessRun():{time:0,x:500,spawn:.5,coins:[],caught:0};if(game===1)sim.begin();arcade()}
function arcade(){paused=false;buttons={};frame('arcade',games[game],'<p id="status"></p><canvas id="arena" width="1000" height="560"></canvas><div class="bar">'+(game===1?[['left','◀'],['right','▶'],['fast','加速'],['slow','减速'],['jump','跳跃']]:[['left','◀ 左移'],['right','右移 ▶']]).map(([k,t])=>'<button class="pad" data-input="'+k+'">'+t+'</button>').join('')+b('暂停','stopArcade()')+'</div>');for(let el of document.querySelectorAll('[data-input]')){el.onpointerdown=e=>{el.setPointerCapture(e.pointerId);keyIn(el.dataset.input,true)};el.onlostpointercapture=()=>keyIn(el.dataset.input,false)}clock=performance.now();cancelAnimationFrame(loop);loop=requestAnimationFrame(update)}
function keyIn(k,down){if(down&&k==='jump'&&!buttons.jump&&game===1)sim.leap();buttons[k]=down}
const bindings={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'fast',ArrowDown:'slow',KeyA:'left',KeyD:'right',KeyW:'fast',KeyS:'slow',Space:'jump'};
for(let name of ['keydown','keyup'])addEventListener(name,e=>{if(screen==='arcade'&&bindings[e.code]){e.preventDefault();keyIn(bindings[e.code],name==='keydown')}});
function stopArcade(){if(screen!=='arcade')return;cancelAnimationFrame(loop);buttons={};frame('arcPause','已暂停',b('继续本局','arcade()','primary')+' '+b('放弃本局并返回','abandon()'))}addEventListener('blur',stopArcade);
function update(now){if(screen!=='arcade')return;let dt=Math.min(.05,(now-clock)/1000);clock=now;let g=arena.getContext('2d');g.fillStyle='#cee3e8';g.fillRect(0,0,1000,560);let txt=document.querySelector('#status');
 if(game===2){let t=sim;t.time+=dt;t.x=Math.max(60,Math.min(940,t.x+((buttons.right?1:0)-(buttons.left?1:0))*dt*540));t.spawn-=dt;if(t.spawn<=0){t.spawn+=.8;t.coins.push({x:80+Math.random()*840,y:40})}g.fillStyle='#e2a7a5';g.fillRect(0,495,1000,65);for(let coin of t.coins){let old=coin.y;coin.y+=220*dt;if(old<480&&coin.y>=480&&Math.abs(coin.x-t.x)<=60){coin.y=600;t.caught++;continue}g.fillStyle='#d98b34';g.beginPath();g.arc(coin.x,coin.y,16,0,7);g.fill();g.fillStyle='#ffd25c';g.beginPath();g.arc(coin.x,coin.y-3,13,0,7);g.fill()}t.coins=t.coins.filter(c=>c.y<560);g.fillStyle='#b26469';g.fillRect(t.x-60,480,120,35);g.fillStyle='#f9b78c';g.fillRect(t.x-65,474,130,12);txt.textContent='剩余 '+Math.ceil(Math.max(0,20-t.time))+' 秒　｜　已接 '+t.caught+' 枚';if(t.time>=20){settleArc(t.caught*2);return}}
 else{let r=sim;r.tick(dt,buttons);g.fillStyle='#a0c6d4';g.fillRect(0,175,1000,385);function project(x,d){const f=1/(1+Math.max(0,d)*.052);return [500+x*420*f,175+340*f,f]}function poly(pts,c){g.beginPath();pts.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();g.fillStyle=c;g.fill()}poly([[478,175],[522,175],[1000,560],[0,560 ]],'#f1f8ff');for(let d=110-(r.distance%10);d>0;d-=10){let a=project(-1,d),b=project(1,d);g.fillStyle='#accbdb';g.fillRect(a[0],a[1],b[0]-a[0],2)}for(let o of r.objects.slice().reverse()){let d=o.z-r.distance;if(d<0||d>180)continue;let [x,y,f]=project(o.x,d);g.font='bold '+Math.max(9,58*f)+'px sans-serif';g.textAlign='center';g.fillStyle=({flag:'#d66082',magic:'#8967bc',fish:'#e19739',hole:'#6a5859',seal:'#685778',crack:'#865e58'})[o.kind];g.fillText(({flag:'⚑',magic:'★',fish:'◆',hole:'●',seal:'▣',crack:'━'})[o.kind],x,y)}
 let [x,y]=project(r.x,0);y-=r.height*85;g.fillStyle='#627eaa';g.fillRect(x-29,y+1,25,5);g.fillRect(x+4,y+1,25,5);const col=['#e8899d','#73bec6','#a58bc8'][state.who],h=['#975b49','#8cc7b3','#9881b5'][state.who];g.fillStyle='#945f61';g.fillRect(x-22,y-12,14,13);g.fillRect(x+8,y-12,14,13);poly([[x-17,y-54],[x+17,y-54],[x+34,y-12],[x-34,y-12]],col);g.fillStyle=h;g.beginPath();g.arc(x,y-70,24,0,7);g.fill();g.fillStyle='#ffd37d';g.font='26px sans-serif';g.fillText(['✿','♢','★'][state.who],x,y-84);txt.textContent='驿站 '+r.stage+' / 10　｜　'+Math.ceil(r.time)+' 秒　｜　'+r.score+' 分';if(r.mode==='station'){frame('station','抵达驿站',b('前往下一站','sim.stage++;sim.begin();arcade()','primary')+' '+b('本次收工','settleRun()'));return}if(['won','lost'].includes(r.mode)){settleRun();return}}
 loop=requestAnimationFrame(update)}
function settleRun(){settleArc(Math.min(30,Math.floor(sim.score/100)))}
function settleArc(reward){if(state.receipt?.id!==nextId){state.coins+=reward;state.receipt={id:nextId,reward,game};persist()}frame('result',games[game]+' · 结算','<h2>本局 ＋'+reward+' 金币</h2>'+''+' '+b('再玩一次','start()')+' '+b('返回'+places[origin],'hub()'))}

rules(game);