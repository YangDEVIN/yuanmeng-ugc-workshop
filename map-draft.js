(function(root){
  const axes=['x','y','z'], angles=['pitch','yaw','roll'];
  const catalog=root.YuanmengNativeAssets??(typeof module==='object'?require('./native-assets'):[]);
  const assets=new Map(catalog.map(asset=>[asset.typeId,asset]));
  const schema='yuanmeng-map-edit/v1';
  const defaultRgb={r:167,g:149,b:183};
  function assetBounds(asset){
    const size=asset.size.map(n=>Number.isFinite(n)&&n>=0?Math.max(1,n):100);
    const offset=asset.offset.map((n,i)=>Number.isFinite(n)?n:i===2?size[2]/2:0);
    return {size,offset};
  }
  function records(placement){
    if(!Array.isArray(placement?.commands))throw Error('工程缺少元梦放置清单');
    const roofs=new Set(placement.roofItemIndexes??[]);
    let index=0;
    return placement.commands.flatMap((command,batch)=>{
      if(command.tool!=='ugc_create_entity'||!Array.isArray(command.arguments?.items))throw Error('放置清单格式错误');
      return command.arguments.items.map((item,i)=>{
        const entry={id:placement.batchItemIds?.[batch]?.[i]??'placement-'+index, item, roof:roofs.has(index)};
        index++;return entry;
      });
    });
  }
  function nativeItem(typeId,location,yaw=0){
    if(!assets.has(typeId))throw Error('请选择元梦内置目录中的元件');
    if(!axes.every(axis=>Number.isFinite(location?.[axis]))||!Number.isFinite(yaw))throw Error('元件坐标或朝向无效');
    if(typeId==='1101002001034000'&&yaw%90!==0)throw Error('基础立方体朝向需为 90° 的倍数');
    return {typeId,transform:{location:Object.fromEntries(axes.map(axis=>[axis,Math.round(location[axis]*10)/10])),
      rotation:{pitch:0,yaw,roll:0},scale:{x:1,y:1,z:1}},snapToGround:false};
  }
  function boxFor(item){
    const asset=assets.get(item.typeId);
    if(!asset)return null;
    const t=item.transform;
    if(!axes.every(axis=>Number.isFinite(t?.location?.[axis])&&Number.isFinite(t?.scale?.[axis])&&t.scale[axis]>0)||
       !angles.every(axis=>t.rotation?.[axis]===undefined||Number.isFinite(t.rotation[axis])))return null;
    const bounds=assetBounds(asset);
    return {asset,
      size:bounds.size.map((n,i)=>n*t.scale[axes[i]]),
      offset:bounds.offset.map((n,i)=>n*t.scale[axes[i]]),
      position:axes.map(axis=>t.location[axis]),
      rotation:t.rotation??{},
      color:item.color??asset.color??defaultRgb};
  }
  function apply(project,entries){
    const old=project.placement;
    const commands=[],batchItemIds=[],roofItemIndexes=[];
    for(let i=0;i<entries.length;i+=20){
      const batch=entries.slice(i,i+20);
      commands.push({tool:'ugc_create_entity',arguments:{items:batch.map(entry=>entry.item)}});
      batchItemIds.push(batch.map(entry=>entry.id));
      batch.forEach((entry,j)=>{if(entry.roof)roofItemIndexes.push(i+j);});
    }
    const placement={...old,count:entries.length,commands,batchItemIds,roofItemIndexes};
    if(placement.terrain)placement.terrain={...placement.terrain,roofBlocks:roofItemIndexes.length};
    const current=new Set(entries.map(entry=>entry.id));
    const previous=records(old), previousIds=new Set(previous.map(entry=>entry.id));
    const removed=previous.filter(e=>!current.has(e.id)).map(e=>e.id);
    const added=entries.filter(e=>!previousIds.has(e.id)).map(e=>e.id);
    if(!added.length&&!removed.length)return project;
    const last=project.editorEdits;
    const editorEdits={schema,removedIds:[...new Set([...(last?.removedIds??[]),...removed])],
      addedIds:[...new Set([...(last?.addedIds??[]),...added])].filter(id=>current.has(id))};
    if(project.schema!=='yuanmeng-story-project/v1')return {...project,editorEdits,placement};
    const pieces=project.geometry.pieces.filter(piece=>current.has(piece.id));
    const spawns=project.settings.spawns.filter(spawn=>current.has(spawn.id));
    const originalBindings=[
      ...project.gameplay.stations.map(s=>'station-'+s.id),
      ...project.gameplay.doors.map(door=>door.entityId),
      ...project.gameplay.scare.mannequinIds,
      ...project.gameplay.puzzle.switches.map(sw=>sw.entityId)
    ];
    const missingEntityIds=originalBindings.filter(id=>!current.has(id));
    const atmosphere=project.atmosphere?{...project.atmosphere,
      lights:project.atmosphere.lights.filter(light=>current.has(light.entityId)),
      mistEntityIds:project.atmosphere.mistEntityIds.filter(id=>current.has(id))}:undefined;
    const modules=project.geometry.modules?.map(module=>({...module,entityIds:module.entityIds.filter(id=>current.has(id))}))
      .filter(module=>module.entityIds.length);
    return {...project,geometry:{...project.geometry,pieces,...(modules?{modules}:{})},settings:{...project.settings,spawns},...(atmosphere?{atmosphere}:{}),
      editorEdits,placement,gameplay:{...project.gameplay,missingEntityIds}};
  }
  function validateEdited(project,unitsPerCm){
    if(project.editorEdits?.schema!==schema)return null;
    const placement=project.placement;
    if(placement?.map!==project.map||placement.coordinates?.units!=='cm'||placement.coordinates.sourceUnitCm!==unitsPerCm)
      throw Error('编辑清单的地图或坐标不匹配');
    const ids=new Set(), entries=records(placement);
    for(const entry of entries){
      if(typeof entry.id!=='string'||!entry.id||ids.has(entry.id)||!boxFor(entry.item))throw Error('编辑清单包含无效元件或坐标');
      ids.add(entry.id);
    }
    return entries;
  }
  const api={records,nativeItem,boxFor,apply,validateEdited,catalog,assets};
  if(typeof module==='object')module.exports=api;
  else root.MapDraft=api;
})(globalThis);
