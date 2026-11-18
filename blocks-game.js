const shapes=['1111','11/11','010/111','100/111','001/111','011/110','110/011'];
const colors=['#18383d','#55cfdd','#ffd068','#bc99ed','#629be8','#ff965e','#68c99b','#ec7688'];
const empty=()=>Array(10).fill(0);
class FallingBlocks {
  constructor(){this.board=Array.from({length:20},empty);this.score=0;this.lines=0;this.over=false;this.spawn();}
  spawn(){this.kind=1+Math.floor(Math.random()*7);this.shape=shapes[this.kind-1].split('/').map(s=>Array.from(s,Number));this.x=3;this.y=0;this.over=!this.fits(this.shape,this.x,this.y);}
  fits(shape,x,y){return shape.every((row,j)=>row.every((v,i)=>!v||(x+i>=0&&x+i<10&&y+j<20&&!this.board[y+j][x+i])));}
  move(dx,dy){if(!this.fits(this.shape,this.x+dx,this.y+dy))return false;this.x+=dx;this.y+=dy;return true;}
  action(key){
    if(this.over)return;
    if(key==='rotate'){const next=this.shape[0].map((_,i)=>this.shape.map(row=>row[i]).reverse());for(const shift of [0,-1,1,-2,2])if(this.fits(next,this.x+shift,this.y)){this.shape=next;this.x+=shift;break;}return;}
    if(key==='left'||key==='right'){this.move(key==='left'?-1:1,0);return;}
    if(key==='drop'){while(this.move(0,1)){}}
    else if(this.move(0,1))return;
    this.shape.forEach((r,j)=>r.forEach((v,i)=>{if(v)this.board[this.y+j][this.x+i]=this.kind;}));
    this.board=this.board.filter(r=>r.includes(0));const removed=20-this.board.length;
    this.lines+=removed;this.score+=[0,100,300,500,800][removed];
    while(this.board.length<20)this.board.unshift(empty());this.spawn();
  }
}
if(typeof module!=='undefined')module.exports=FallingBlocks;
if(typeof document!=='undefined'){
const el=id=>document.getElementById(id),ctx=el('board').getContext('2d');let game=new FallingBlocks(),running=false,timer;
function draw(){
  const grid=game.board.map(r=>r.slice());
  if(!game.over)game.shape.forEach((r,j)=>r.forEach((v,i)=>{if(v)grid[game.y+j][game.x+i]=game.kind;}));
  grid.forEach((r,j)=>r.forEach((v,i)=>{const x=i*30,y=j*30;ctx.fillStyle=colors[v];ctx.fillRect(x+1,y+1,28,28);if(v){ctx.fillStyle='#ffffff55';ctx.beginPath();ctx.arc(x+15,y+14,7,0,2*Math.PI);ctx.fill();}}));
  el('score').value=game.score;el('lines').value=game.lines;if(game.over){running=false;clearInterval(timer);el('state').textContent='游戏结束';}
}
function act(k){if(running){game.action(k);draw();}}
el('start').onclick=()=>{clearInterval(timer);game=new FallingBlocks();running=true;el('state').textContent='进行中';el('pause').textContent='暂停';el('start').textContent='重新开始';timer=setInterval(()=>act('down'),650);draw();};
el('pause').onclick=()=>{if(!timer||game.over)return;running=!running;el('pause').textContent=running?'暂停':'继续';el('state').textContent=running?'进行中':'已暂停';};
document.querySelectorAll('[data-key]').forEach(b=>b.onclick=()=>act(b.dataset.key));
document.addEventListener('keydown',e=>{const k={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'rotate',ArrowDown:'down',' ':'drop'}[e.key];if(k&&running&&!(e.key===' '&&e.target.tagName==='BUTTON')){e.preventDefault();act(k);}});
el('download').onclick=()=>{const link=document.createElement('a');link.href='blocks-project.json';link.download='俄罗斯方块.json';link.click();};
el('install').onclick=async()=>{const status=el('message'),btn=el('install');btn.disabled=true;try{
 if(!WorkshopBridge.local)throw Error('请下载完整项目，运行 node tools/serve.cjs 后从本地工坊导入。');
 const t=await WorkshopBridge.api('/api/mcp/status');if(t.state!=='connected')throw Error(t.message||'请打开元梦草稿并连接 MCP。');
 if(!confirm('将俄罗斯方块 UI 和 Lua 导入「'+t.mapName+'」当前场景？请选择专用空白 2D 草稿。'))return;
 status.textContent='正在导入…';const result=await WorkshopBridge.api('/api/games/blocks',{mapId:t.mapId,layerId:t.layerId});status.textContent=result.message;
}catch(e){status.textContent=e.message;}finally{btn.disabled=false;}};
draw();}

