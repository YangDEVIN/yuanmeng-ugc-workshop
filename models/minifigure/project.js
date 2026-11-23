(function(root){
 const catalog=typeof module==='object'?require('../../native-assets.js'):root.YuanmengNativeAssets;
 const ids={box:'1101002001034000',cylinder:'1101002001034002',cone:'1101002001034004'};
 const names=['基础白模','蔷薇公主','潮汐公主','星砂公主'];
 function create(id=0,expression=true){
  const rows=[],scale=281/3.22,col=['#e9e5dc','#df80a5','#62bfc4','#9381bf'][id],skin=id?'#f4cb68':col,gold=id?'#e3b650':col;
  function part(name,shape,c,x,y,z,w,h,d){const a=catalog.find(a=>a.typeId===ids[shape]);const rgb=parseInt(c.slice(1),16);const size=[w*scale,d*scale,h*scale];const item={typeId:a.typeId,snapToGround:false,color:{r:rgb>>16,g:(rgb>>8)&255,b:rgb&255},transform:{location:{x:x*scale,y:-z*scale,z:(y-h/2)*scale},rotation:{pitch:0,yaw:0,roll:0},scale:{x:size[0]/a.size[0],y:size[1]/a.size[1],z:size[2]/a.size[2]}}};rows.push({id:name+'/'+rows.length,shape,item});}
  const box=(n,c,x,y,z,w,h,d)=>part(n,'box',c,x,y,z,w,h,d),cyl=(n,c,x,y,z,r,h)=>part(n,'cylinder',c,x,y,z,r*2,h,r*2);
  for(const side of [-1,1]){const x=side*.28;box('腿',col,x,.57,0,.5,.88,.52);box('脚掌',col,x,.14,.13,.51,.28,.76);box('髋部',col,x,1.06,0,.51,.21,.53);box('腿部饰板',id?'#fff2d8':col,x,.52,.267,.32,.58,.018);}
  box('腰髋',col,0,1.19,0,1.12,.20,.58);
  // The torso is built from the same horizontal bricks in preview and export.
  for(let i=0;i<24;i++){const t=(i+.5)/24;box('躯干分层',col,0,1.28+t*1.02,0,1.28-.32*t,1.02/24,.66);}
  box('腰带',gold,0,1.39,.345,1.12,.10,.035);
  for(const side of [-1,1]){cyl('肩部',col,side*.67,2.04,0,.20,.37);cyl('手臂',col,side*.73,1.70,0,.18,.57);cyl('手腕',skin,side*.77,1.35,0,.10,.18);
   for(let i=0;i<12;i++){const a=-Math.PI*.28+i/11*Math.PI*1.55;box('C形手掌',skin,side*.77+Math.cos(a)*.15,1.14+Math.sin(a)*.15,.03,.10,.10,.13);}}
  cyl('颈部',skin,0,2.38,0,.19,.22);cyl('头部',skin,0,2.79,0,.43,.65);cyl('顶部凸点',skin,0,3.15,0,.22,.14);
  if(expression){for(const side of [-1,1]){box('表情眼睛','#322d30',side*.16,2.85,.404,.052,.10,.025);box('表情高光','#ffffff',side*.16-.01,2.875,.42,.014,.02,.012);}
   for(let i=0;i<11;i++){const a=Math.PI*.12+i/10*Math.PI*.76,x=Math.cos(a)*.13;box('表情微笑','#322d30',x,2.77-Math.sin(a)*.10,Math.sqrt(.43*.43-x*x)+.004,.025,.025,.018);}}
  if(id){for(const side of [-1,1])box('胸衣金线',gold,side*.32,1.91,.354,.045,.62,.025);box('胸前宝石',gold,0,2.03,.37,.15,.19,.04);
   for(let i=0;i<24;i++){const a=i/24*Math.PI*2;box('王冠圈',gold,Math.sin(a)*.43,3.16,Math.cos(a)*.43,.13,.08,.13);}
   for(let i=0;i<5;i++){const a=i/5*Math.PI*2;part('王冠尖','cone',gold,Math.sin(a)*.42,3.31,Math.cos(a)*.42,.18,.30,.18);}}
  const commands=[],batchItemIds=[];for(let i=0;i<rows.length;i+=20){commands.push({tool:'ugc_create_entity',arguments:{items:rows.slice(i,i+20).map(r=>r.item)}});batchItemIds.push(rows.slice(i,i+20).map(r=>r.id));}
  return {schema:'yuanmeng-custom-project/v1',map:'minifigure-'+id,name:names[id],placement:{map:'minifigure-'+id,coordinates:{units:'cm',upAxis:'Z',pivot:'bottom-center'},count:rows.length,commands,batchItemIds},model:{bodyHeightCm:281,headTopIncludesStud:true,reference:'星宝参考身高；不含公主头冠',visualParts:rows.map(r=>({id:r.id,shape:r.shape})),origin:'脚底中心',expression:expression?'native-components':'none'},verification:{layout:'shared-data-checked',editorReadback:'unverified',playtest:'unverified'},gameplay:{runtimeBinding:'required',note:'静态模型清单；星宝挂点、动作、碰撞和自制装备绑定需在元梦另行验收'}};
 }
 const api={create,names};if(typeof module==='object')module.exports=api;else root.MinifigureProject=api;
})(typeof window==='object'?window:globalThis);
