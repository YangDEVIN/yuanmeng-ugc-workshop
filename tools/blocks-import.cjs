const project = require('../games/blocks/project.json');
const {target} = require('./map-build.cjs');
let importing = false;
async function readWidgets(call) {
  const widgets = [];
  let cursor;
  do {
    const page = await call('ugc_read_ui',{canvas:'current',view:'flat',limit:100,cursor});
    const rows = page.items || page.widgets || page.nodes;
    if (!Array.isArray(rows)) throw Error('画布回读缺少控件列表');
    widgets.push(...rows);
    if(page.nextCursor && page.nextCursor===cursor) throw Error('控件分页未前进');
    cursor=page.nextCursor;
  } while(cursor);
  return widgets;
}
async function install(input,withMcp) {
  if(importing) throw Error('已有小游戏正在导入');
  importing=true;
  try { return await withMcp(async call=>{
    const check = async()=>{
      const t=await target(call);
      if(!t.layerId||t.mapId!==input.mapId||t.layerId!==input.layerId) throw Error('当前地图或场景已切换，请重新确认。');
    };
    await check();
    for(const guide_name of ['2d-game','ui-editing']) await call('read_guide',{guide_name});
    await call('ugc_editor_focus',{target:'ui'});
    const existing=await readWidgets(call);
    const active=await call('ugc_list_scripts',{sourceKind:'map',layerId:input.layerId,limit:1});
    if((active.items||active.scripts||[]).length) throw Error('当前场景已有脚本，请使用空白 2D 草稿。');
    if(existing.some(w=>w.name?.startsWith('积木俄罗斯方块_')))throw Error('当前场景已包含此游戏的控件，请核对已有导入。');
    const ui={canvas:'current',ops:project.ui};
    await call('ugc_write_ui',{...ui,dryRun:true});
    await check();
    await call('ugc_write_ui',ui);
    const widgets=await readWidgets(call),bindings=[];
    for(const op of project.ui){
      const found=widgets.filter(w=>w.name===op.name);
      if(found.length!==1||!/^\d+$/.test(String(found[0].uid)))throw Error('控件已写入，无法确认绑定：'+op.name);
      bindings.push(op.name.slice('积木俄罗斯方块_'.length)+'='+found[0].uid);
    }
    await check();
    const files={...project.files,[project.widgetBindings]:'return {'+bindings.join(',')+'}'};
    const args={action:'write',name:project.name,files,layerId:input.layerId};
    await call('ugc_write_script',{...args,dryRun:true});
    let result=await call('ugc_write_script',args);
    for(let i=0;result.operationId && result.stage!=='saved' && i<12;i++){
      await new Promise(resolve=>setTimeout(resolve,750));
      result=await call('ugc_write_script',{action:'status',operationId:result.operationId});
    }
    if(result.stage!=='saved'||!result.readback)throw Error('UI 已写入，脚本保存回读尚未确认。操作 ID：'+(result.operationId||'未知'));
    return {message:'UI 已回读，Lua 已保存。请在元梦中试玩。'};
  }); } finally {importing=false;}
}
module.exports={install};

