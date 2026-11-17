(function(root) {
  const blockId='1101002001034000';
  const grid=50, bucket=450, step=40, radius=150, height=320;
  const quantize=v=>Math.round(v/grid);
  const hash=(x,y)=>x+','+y;
  function build(placement, maxRise=step) {
    const bins=new Map(), floors=new Map();
    for(const command of placement.commands) for(const item of command.arguments.items){
      if(item.typeId!==blockId) continue;
      const {location:p,scale:s,rotation}=item.transform;
      if(rotation.pitch||rotation.roll||rotation.yaw%90) throw Error('动线检查需要与网格对齐的积木');
      const transpose=Math.abs(rotation.yaw%180)===90;
      const sx=(transpose?s.y:s.x)*50, sy=(transpose?s.x:s.y)*50;
      const b={x0:p.x-sx,x1:p.x+sx,y0:p.y-sy,y1:p.y+sy,z0:p.z,z1:Math.round((p.z+s.z*100)*10)/10};
      for(let i=Math.floor(b.x0/bucket);i<=Math.floor(b.x1/bucket);i++)for(let j=Math.floor(b.y0/bucket);j<=Math.floor(b.y1/bucket);j++){
        const key=hash(i,j);
        if(!bins.has(key))bins.set(key,[]);
        bins.get(key).push(b);
      }
    }
    function near(x,y,padding) {
      const found=new Set();
      for(let i=Math.floor((x-padding)/bucket);i<=Math.floor((x+padding)/bucket);i++)
        for(let j=Math.floor((y-padding)/bucket);j<=Math.floor((y+padding)/bucket);j++)
          for(const b of bins.get(hash(i,j))??[]) found.add(b);
      return [...found];
    }
    const isSupport=(b,x,y)=>x>=b.x0&&x<=b.x1&&y>=b.y0&&y<=b.y1;
    function clearance(boxes,x,y,z) {
      return !boxes.some(b=>b.z1>z+maxRise && b.z0<z+height &&
        Math.hypot(Math.max(b.x0-x,0,x-b.x1),Math.max(b.y0-y,0,y-b.y1))<radius);
    }
    function levels(i,j) {
      const key=hash(i,j);
      if(floors.has(key))return floors.get(key);
      const x=i*grid,y=j*grid,boxes=near(x,y,radius);
      const supports=[...new Set(boxes.filter(b=>isSupport(b,x,y)).map(b=>b.z1))];
      const result=supports.filter(z=>clearance(boxes,x,y,z)).map(z=>({i,j,x,y,z,key:key+','+z}));
      floors.set(key,result);
      return result;
    }
    function transition(a,b) {
      if(Math.abs(a.z-b.z)>maxRise)return false;
      // Check support and headroom between the two sampled centers as well.
      for(const t of [.25,.5,.75]){
        const x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t;
        const nearBoxes=near(x,y,radius);
        if(!nearBoxes.some(o=>Math.abs(o.z1-a.z)<=maxRise&&Math.abs(o.z1-b.z)<=maxRise&&isSupport(o,x,y)&&clearance(nearBoxes,x,y,o.z1)))return false;
      }
      return true;
    }
    function anchors(point,horizontal,vertical) {
      const [x,y,z]=point,result=[], reach=Math.ceil(horizontal/grid)+1;
      for(let i=quantize(x)-reach;i<=quantize(x)+reach;i++) for(let j=quantize(y)-reach;j<=quantize(y)+reach;j++){
        if(Math.hypot(i*grid-x,j*grid-y)>horizontal)continue;
        for(const n of levels(i,j))if(Math.abs(n.z-z)<=vertical) result.push(n);
      }
      return result.sort((a,b)=>Math.hypot(a.x-x,a.y-y,a.z-z)-Math.hypot(b.x-x,b.y-y,b.z-z));
    }
    function search(start,finish) {
      const starts=anchors(start,150,200), targets=anchors(finish,300,200);
      if(!starts.length)return {status:'spawn',path:[]};
      const startNode=starts[0], target=new Set(targets.map(n=>n.key));
      const distance=n=>Math.max(0,Math.hypot(n.x-finish[0],n.y-finish[1])-300);
      const queue=[];
      const weight=new Map([[startNode.key,0]]);
      const previous=new Map();
      function push(value) {
        let i=queue.length;
        queue.push(value);
        while(i>0){
          const p=(i-1)>>1;
          if(queue[p].score<=value.score)break;
          queue[i]=queue[p];i=p;
        }
        queue[i]=value;
      }
      function pop(){
        const first=queue[0],last=queue.pop();
        if(!queue.length)return first;
        let i=0;
        while(2*i+1<queue.length){
          let child=i*2+1;
          if(child+1<queue.length&&queue[child+1].score<queue[child].score)child++;
          if(last.score<=queue[child].score)break;
          queue[i]=queue[child];i=child;
        }
        queue[i]=last;return first;
      }
      let closest=startNode;
      function result(status,n){
        const path=[];
        for(let current=n;current;current=previous.get(current.key))path.push([current.x,current.y,current.z]);
        path.reverse();
        return {status,path,anchor:[startNode.x,startNode.y,startNode.z],remainingCm:Math.round(Math.hypot(n.x-finish[0],n.y-finish[1]))};
      }
      push({node:startNode,score:distance(startNode),cost:0});
      const offsets=[[1,0],[0,1],[-1,0],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]];
      const maxVisited=35000;
      let visited=0;
      while(queue.length&&visited<maxVisited){
        const {node:n,cost}=pop();
        if(cost!==weight.get(n.key))continue;
        visited++;
        if(target.has(n.key))return result('connected',n);
        if(distance(n)<distance(closest))closest=n;
        for(const [dx,dy] of offsets){
          for(const next of levels(n.i+dx,n.j+dy)){
            const total=cost+grid*Math.hypot(dx,dy)+Math.abs(n.z-next.z);
            if((weight.get(next.key)??Infinity)<=total||!transition(n,next))continue;
            weight.set(next.key,total);previous.set(next.key,n);
            push({node:next,cost:total,score:total+distance(next)});
          }
        }
      }
      return result(queue.length?'limit':targets.length?'blocked':'site',closest);
    }
    function move([x,y,z],dx,dy){
      const start=levels(quantize(x),quantize(y)).find(n=>n.z===z);
      if(!start)return null;
      const next=levels(start.i+dx,start.j+dy).filter(n=>transition(start,n)).sort((a,b)=>Math.abs(a.z-z)-Math.abs(b.z-z))[0];
      return next?[next.x,next.y,next.z]:null;
    }
    return {search,move};
  }
  const api={build,grid,step,radius,height};
  if(typeof module==='object')module.exports=api;
  else root.FpsRoute=api;
})(globalThis);
