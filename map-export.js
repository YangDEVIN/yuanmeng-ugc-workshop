(function(root){
  const catalog=typeof module==='object'?require('./native-assets.js'):root.YuanmengNativeAssets;
  function prepare(input,kind='project'){
    if(!['project','placement'].includes(kind))throw Error('未知导出类型');
    const project=JSON.parse(JSON.stringify(input)),p=project?.placement;
    if(!project?.schema||!p||!Array.isArray(p.commands))throw Error('当前页面还没有可导出的地图工程');
    const types=new Set((catalog||[]).map(x=>String(x.typeId))),ids=new Set();let count=0;
    if(p.coordinates?.units!=='cm')throw Error('导出坐标必须使用厘米');
    if(p.batchItemIds&&p.batchItemIds.length!==p.commands.length)throw Error('元件标识批次数量不一致');
    const batches=[],keys=[];
    p.commands.forEach((command,b)=>{
      if(command.tool!=='ugc_create_entity'||!Array.isArray(command.arguments?.items))throw Error('放置批次格式错误');
      const items=command.arguments.items,old=p.batchItemIds?.[b];
      if(old&&old.length!==items.length)throw Error('元件标识数量不一致');
      const batchKeys=items.map((item,i)=>{
        if(!types.has(String(item.typeId)))throw Error('未识别的元件类型：'+item.typeId);
        for(const [field,axes]of [['location',['x','y','z']],['rotation',['pitch','yaw','roll']],['scale',['x','y','z']]])
          for(const a of axes){const n=item.transform?.[field]?.[a];if(typeof n!=='number'||!Number.isFinite(n)||(field==='scale'&&n<=0))throw Error('元件变换无效：'+field+'.'+a);}
        const id=old?.[i]??'placement-'+count;count++;
        if(typeof id!=='string'||!id||ids.has(id))throw Error('元件标识为空或重复');ids.add(id);return id;
      });
      for(let i=0;i<items.length;i+=20){batches.push({...command,arguments:{...command.arguments,items:items.slice(i,i+20)}});keys.push(batchKeys.slice(i,i+20));}
    });
    if(count!==p.count)throw Error('元件数量与清单不一致');
    if(!count)throw Error('当前地图没有可导出的元件');
    if(count>30000)throw Error('元件数量超过 30000，请拆分工程');
    p.commands=batches;p.batchItemIds=keys;
    const value=kind==='project'?project:{...p};
    if(kind==='placement')for(const field of ['settings','atmosphere','gameplay','verification'])if(project[field]!==undefined)value[field]=project[field];
    const text=JSON.stringify(value,null,2);if(new TextEncoder().encode(text).length>32*1024*1024)throw Error('导出文件超过 32 MB，请拆分工程');
    const name=String(project.map||project.name||'map').replace(/[^\w\u4e00-\u9fff-]/g,'_');
    return {value,text,count,name:project.name||project.map,filename:name+(kind==='project'?'-map-project.json':'-placement.json')};
  }
  function open(getProject){
    const d=document.createElement('dialog');d.setAttribute('aria-label','导出地图');
    d.style.cssText='max-width:min(480px,90vw);padding:24px;border:1px solid #bda8ce;border-radius:16px;background:#fffaf2;color:#302f38;font:15px system-ui;box-shadow:0 18px 70px #0005';
    d.innerHTML='<h2 style="margin-top:0">导出地图</h2><p data-summary></p><label>导出内容 <select style="padding:8px" aria-label="导出内容"><option value="project">完整工程 JSON</option><option value="placement">元梦放置清单 JSON</option></select></label><p data-description></p><p style="font-size:13px">仅下载当前地图数据，不会写入元梦。机关绑定与实机验证需单独完成。</p><p role="status" aria-live="polite"></p><div style="display:flex;gap:12px;justify-content:flex-end"><button data-cancel>取消</button><button data-save>下载 JSON</button></div>';
    const status=d.querySelector('[role=status]'),save=d.querySelector('[data-save]'),select=d.querySelector('select');let snapshot;
    try{snapshot=JSON.parse(JSON.stringify(getProject()));const r=prepare(snapshot);d.querySelector('[data-summary]').textContent=r.name+' · '+r.count.toLocaleString()+' 个元件 · 坐标单位：厘米';}catch(e){status.textContent='无法导出：'+e.message;save.disabled=true;}
    const describe=()=>d.querySelector('[data-description]').textContent=select.value==='project'?'保留完整工程，供继续编辑、备份和迁移。':'导出元件批次及环境、玩法配置，供编辑器接入流程使用。';select.onchange=describe;describe();
    save.onclick=()=>{try{const r=prepare(snapshot,select.value),url=URL.createObjectURL(new Blob([r.text],{type:'application/json;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download=r.filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);status.textContent='已发起下载：'+r.filename; }catch(e){status.textContent='导出失败：'+e.message;}};
    d.querySelector('[data-cancel]').onclick=()=>d.close();d.onclose=()=>d.remove();document.body.append(d);d.showModal();
  }
  const api={prepare,open};if(typeof module==='object')module.exports=api;else root.MapExport=api;
})(typeof window==='object'?window:globalThis);
