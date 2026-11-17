(function(root){
  const draft=typeof module==='object'?require('./map-draft.js'):root.MapDraft;
  const LIMIT=30000;
  function normalize(input){
    if(!input||typeof input!=='object'||Array.isArray(input))throw Error('请选择地图工程或元梦放置清单 JSON。');
    const project=structuredClone(input.placement?input:{schema:'yuanmeng-custom-project/v1',map:input.map||'custom',name:input.name||'自定义地图',placement:input});
    const p=project.placement;
    if(p.coordinates?.units!=='cm')throw Error('坐标单位必须为 cm，不能自动猜测或缩放。');
    const rows=draft.records(p);
    if(rows.length>LIMIT)throw Error('单张地图最多 30,000 个元件，请拆分地图。');
    if(p.count!==undefined&&p.count!==rows.length)throw Error('元件 count 与放置清单数量不一致。');
    if(p.batchItemIds&&(p.batchItemIds.length!==p.commands.length||p.commands.some((c,i)=>p.batchItemIds[i]?.length!==c.arguments.items.length)))throw Error('元件 ID 批次与清单不一致。');
    const ids=new Set();
    for(const row of rows){
      if(typeof row.id!=='string'||!row.id||ids.has(row.id))throw Error('元件 ID 为空或重复：'+row.id);
      ids.add(row.id);
      if(!draft.assets.has(row.item?.typeId))throw Error('目录中不存在元件 typeId：'+row.item?.typeId);
      const box=draft.boxFor(row.item);
      if(!box||box.position.some(n=>Math.abs(n)>1e7)||box.size.some(n=>n>1e7))throw Error('元件坐标、尺寸或旋转无效：'+row.id);
      if(row.item.color&&!['r','g','b'].every(k=>Number.isFinite(row.item.color[k])&&row.item.color[k]>=0&&row.item.color[k]<=255))throw Error('元件颜色必须是 0–255 的 RGB：'+row.id);
    }
    if((p.roofItemIndexes??[]).some(i=>!Number.isInteger(i)||i<0||i>=rows.length))throw Error('屋顶索引越界。');
    project.map=typeof project.map==='string'?project.map:'custom';
    project.name=typeof project.name==='string'?project.name:project.map;
    p.map=project.map;p.count=rows.length;
    if(!p.batchItemIds){let i=0;p.batchItemIds=p.commands.map(c=>c.arguments.items.map(()=>rows[i++].id));}
    return project;
  }
  function empty(){return normalize({schema:'yuanmeng-custom-project/v1',map:'custom',name:'未命名地图',placement:{coordinates:{units:'cm',sourceUnitCm:1},commands:[],count:0}});}
  const api={normalize,empty,LIMIT};
  if(typeof module==='object')module.exports=api;else root.CustomMap=api;
})(globalThis);
