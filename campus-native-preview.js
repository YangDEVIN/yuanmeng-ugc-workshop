/* 元梦内置元件在网页里的预览拆解。
   正式版 campus-scene.js 与临时编辑页 map-edit.js 必须共用这一份：
   否则编辑页会把内置元件画成一整块默认淡紫色包围盒，与正式版画面不一致。 */
(function(root){
  const rgb=color=>({r:(color>>16)&255,g:(color>>8)&255,b:color&255});

  function expand(draft,entry){
    const {id,item}=entry;
    const box=draft.boxFor(item);
    if(!box)return [];
    const {size,offset,position,rotation,color,asset}=box;
    const yaw=rotation.yaw??0,angle=yaw*Math.PI/180;
    const z=position[2]+offset[2]-size[2]/2;
    const origin={x:position[0]+offset[0]*Math.cos(angle)-offset[1]*Math.sin(angle),
      y:position[1]+offset[0]*Math.sin(angle)+offset[1]*Math.cos(angle),z};
    const preview={id,group:'native',sizeCm:{x:size[0],y:size[1],z:size[2]},yaw,color,
      positionCm:origin,
      collider:asset.category!=='玩法'&&size[2]>40&&z<310&&z+size[2]>40};
    const branch=(dx,dy,dz,w,d,h,shade,turn=0,collider=false)=>({...preview,
      positionCm:{x:origin.x+dx*Math.cos(angle)-dy*Math.sin(angle),
        y:origin.y+dx*Math.sin(angle)+dy*Math.cos(angle),z:z+dz},
      sizeCm:{x:w,y:d,z:h},yaw:yaw+turn,color:rgb(shade),collider});
    if(item.typeId==='1101004002001008')return [{...preview,color:rgb(0x77746d)}];
    if(item.typeId==='1102015001004712'){
      const bark=0x4f4744;
      return [branch(0,0,0,107,117,980,bark,0,true),branch(-178,-54,468,466,62,82,bark,18),
        branch(178,48,610,493,65,80,bark,-11),branch(-405,-120,505,58,63,205,bark),
        branch(398,5,643,53,57,171,bark),branch(-109,4,763,318,54,71,0x696052,-23),
        branch(-244,63,811,41,45,150,bark)];
    }
    if(item.typeId==='1102015001004756')return [-135,-53,32,105].map((x,i)=>branch(x,26-i*23,0,41,265-i*24,52+i*15,0x79745e,18*i));
    if(item.typeId==='1102015001002742')return [branch(0,0,0,52,54,299,0x615041),branch(0,0,160,136,72,155,0x6d5555),
      branch(0,0,254,209,58,42,0x726b64),branch(3,0,315,89,78,90,0x9c806b),branch(0,45,351,65,14,25,0x473e43)];
    return [preview];
  }

  // 把拆解后的预览块转换成 map-edit.js 的 setInstance 可用的包围盒结构。
  function toBox(preview){
    const s=preview.sizeCm,p=preview.positionCm;
    return {asset:{name:'元梦内置元件'},
      size:[s.x,s.y,s.z],offset:[0,0,s.z/2],
      position:[p.x,p.y,p.z],rotation:{yaw:preview.yaw},color:preview.color};
  }

  const api={expand,toBox};
  if(typeof module==='object')module.exports=api;
  else root.CampusNativePreview=api;
})(globalThis);
