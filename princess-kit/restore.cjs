const path=require('node:path');
const fs=require('node:fs/promises');
const {withMcp}=require('./mcp.cjs');
const pack=require('./manifest.json');
const prefix='公主大冒险_';
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

async function target(call){
  const status=await call('ugc_get_status',{probe:true});
  const context=await call('ugc_get_context',{});
  if(!status.connected||status.running?.runningMode!=='Editing'||!context.currentLayerId) throw Error('请进入目标草稿并停止试玩');
  return context;
}
async function pages(call,tool,args){
  const rows=[],seen=new Set(); let cursor;
  do{
    const page=await call(tool,{...args,cursor});
    if(!Array.isArray(page.items))throw Error('回读缺少列表：'+tool);
    rows.push(...page.items);cursor=page.nextCursor;
    if(cursor&&seen.has(cursor))throw Error('分页游标重复');
    seen.add(cursor);
  }while(cursor);
  return rows;
}
async function restore(input,progress=()=>{},connect=withMcp){
  return connect(async call=>{
    async function check(){
      const c=await target(call);
      if(c.mapId!==input.mapId||c.currentLayerId!==input.layerId)throw Error('目标场景已切换');
      return c;
    }
    const c=await check(),layerId=c.currentLayerId;
    const dir=path.join(__dirname,'.restore',Buffer.from(JSON.stringify([c.mapId,layerId])).toString('hex'));
    await fs.mkdir(dir,{recursive:true});
    const lock=await fs.open(path.join(dir,'active'),'wx').catch(()=>{throw Error('该场景已有导入任务；程序异常关闭后请先核对导入记录');});
    const journal=path.join(dir,'receipt.json');let state;
    try{
      try{state=JSON.parse(await fs.readFile(journal,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;state={images:{},version:pack.version};}
      async function record(){await fs.writeFile(journal+'.tmp',JSON.stringify(state,null,2));await fs.rename(journal+'.tmp',journal);}
      if(state.uncertain)throw Error('上次写入缺少确定回执，请先核对：'+state.uncertain);
      async function mutate(label,tool,args){
        await check();state.uncertain=label;await record();
        const r=await call(tool,args);delete state.uncertain;return r;
      }
      const scripts=await pages(call,'ugc_list_scripts',{sourceKind:'map',layerId,limit:50});
      if(state.saved&&scripts.some(s=>s.scriptId===state.scriptId))return '此资源包已在当前场景保存。';
      if(scripts.some(s=>s.scriptId!==state.scriptId))throw Error('场景已有其他脚本，请选择空白草稿，以免覆盖现有玩法。');
      await call('read_guide',{guide_name:'2d-game'});await call('read_guide',{guide_name:'ui-editing'});
      await call('ugc_editor_focus',{target:'ui'});
      const listUI=()=>pages(call,'ugc_read_ui',{canvas:'current',view:'flat',limit:100});
      let widgets=await listUI();
      if(!state.ui&&widgets.some(w=>w.name?.startsWith(prefix)))throw Error('已有同名游戏控件，请先核对之前的导入。');
      const assets=[...new Set([...pack.roads,...pack.frames,...pack.widgets.map(w=>w.asset).filter(Boolean)])];
      for(const [index,key] of assets.entries()){
        if(state.images[key]?.id)continue;
        progress('上传素材 '+(index+1)+' / '+assets.length);
        let upload=state.images[key];
        for(let attempt=0;attempt<150;attempt++){
          const args={canvas:'current',ops:[{op:'upload',uploads:[upload?.operationId?{operationId:upload.operationId}:{imagePath:path.join(__dirname,'assets',key+'.png')}]}]};
          const r=upload?.operationId?await call('ugc_write_ui',args):await mutate('上传 '+key,'ugc_write_ui',args);
          const item=r.results?.[0]?.result?.results?.[0];
          if(!item||(!item.pending&&!item.success))throw Error('上传失败：'+key);
          upload=state.images[key]={operationId:item.operationId,id:item.ugcId};await record();
          if(item.success&&item.ugcId)break;
          await sleep(800);
        }
        if(!upload?.id)throw Error('上传仍在处理，再次导入会继续查询回执');
      }
      const images=await pages(call,'ugc_query_ui_images',{source:'custom',limit:50});
      const icons=new Map(images.map(i=>[String(i.ugcId),i.assetName]));
      const ops=pack.widgets.map(w=>{
        const props={...w.props};
        if(w.asset){props.icon=icons.get(String(state.images[w.asset].id));if(!props.icon)throw Error('图库尚未返回 '+w.asset);}
        return {op:'create',type:w.type,name:prefix+w.key,props};
      });
      if(!state.ui){
        progress('创建游戏界面');const args={canvas:'current',ops};
        await call('ugc_write_ui',{...args,dryRun:true});
        await mutate('创建游戏界面','ugc_write_ui',args);state.ui=true;await record();
      }
      widgets=await listUI();const ids={};
      for(const w of pack.widgets){
        const matches=widgets.filter(row=>row.name===prefix+w.key);
        if(matches.length!==1||!/^\d+$/.test(matches[0].uid))throw Error('绑定控件失败：'+w.key);
        ids[w.key]=matches[0].uid;
      }
      await check();
      await call('ugc_write_ui',{canvas:'current',ops:Object.entries(pack.keys).map(([k,key])=>({op:'update',uid:ids[k],props:{keyMapping:{key,modifiers:[]}}}))});
      const native=await call('ugc_read_ui',{view:'native'});
      const childUids=(native.data?.widgets||[]).filter(w=>pack.hideNative.includes(w.name)).map(w=>String(w.uid));
      if(childUids.length)await call('ugc_write_ui',{canvas:'current',ops:[{op:'native_visibility',enabled:false,childUids}]});
      let components=Object.values((await check()).components||{});
      if(!components.length){
        if(!c.programmingTypeId)throw Error('当前编辑器未提供编程元件类型');
        await call('ugc_editor_focus',{target:'scene'});
        await mutate('创建编程元件','ugc_create_entity',{typeId:c.programmingTypeId,layerId,transform:{location:{x:0,y:0,z:0}}});
        components=Object.values((await check()).components||{});await record();
      }
      if(components.length!==1)throw Error('当前场景需要一个明确的编程元件');
      const files={};for(const name of pack.scripts)files[name]=await fs.readFile(path.join(__dirname,name),'utf8');
      const numbers=pack.roads.map(k=>String(state.images[k].id));
      if(!numbers.every(n=>/^\d+$/.test(n)))throw Error('道路素材 ID 无效');
      files['Common/Bindings.lua']='return {'+Object.entries(ids).map(([k,id])=>k+'='+id).join(',')+',frames={'+pack.frames.map((_,i)=>ids['frame'+i]).join(',')+'},roads={'+numbers.join(',')+'}}';
      if(!state.scriptId){
        progress('绑定玩法脚本');
        const args={action:'write',layerId,sceneIds:[String(components[0].id)],name:pack.name,files};
        await call('ugc_write_script',{...args,dryRun:true});
        const result=await mutate('写入玩法脚本','ugc_write_script',args);
        if(!result.readback||!result.scriptId)throw Error('脚本写入未取得回读回执');
        state.scriptId=result.scriptId;await record();
      }
      progress('保存地图');await call('ugc_editor_focus',{target:'scene'});
      const result=await mutate('保存地图','ugc_editor_save',{});
      if(!result.saved)throw Error('地图保存未确认');
      state.saved=true;await record();return '已保存到「'+c.mapName+'」，请在元梦中试玩。';
    }finally{await lock.close();await fs.unlink(path.join(dir,'active'));}
  });
}
module.exports={restore,target};
if(require.main===module)(async()=>{
  const c=await withMcp(target);
  const rl=require('node:readline/promises').createInterface({input:process.stdin,output:process.stdout});
  let answer;try{answer=await rl.question('还原到「'+c.mapName+'」场景 '+c.currentLayerId+'？输入 Y 确认：');}finally{rl.close();}
  if(answer.trim().toUpperCase()==='Y')console.log(await restore({mapId:c.mapId,layerId:c.currentLayerId},console.log));
})().catch(e=>{console.error(e.message);process.exitCode=1;});

