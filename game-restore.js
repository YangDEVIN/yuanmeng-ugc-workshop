(function(root){
  async function run({api,game,name,confirmTarget,onStatus,storage,wait}){
    const key='workshop-game-restore-'+game;let id=storage.getItem(key);
    if(!id){
      onStatus('正在检测元梦目标…');const target=await api('/api/mcp/status');
      if(target.state!=='connected'||!target.mapId||!target.layerId)throw Error(target.message||'请打开专用空白 2D 草稿并连接元梦。');
      if(/playing|试玩/i.test(target.mode||''))throw Error('请先退出试玩，返回编辑态。');
      if(!await confirmTarget('将「'+name+'」还原到元梦「'+target.mapName+'」当前场景并保存？\n请确认这是专用空白 2D 草稿。')){onStatus('已取消，未写入元梦。');return;}
      onStatus('正在创建还原任务…');
      // A lost POST response may still mean the editor was changed. Do not blindly resubmit.
      storage.setItem(key,'uncertain');
      const job=await api('/api/games/'+game,{mapId:target.mapId,layerId:target.layerId});
      if(!job.id)throw Error('未收到任务编号，请核对编辑器状态，不要重复还原。');id=job.id;storage.setItem(key,id);
    }
    if(id==='uncertain')throw Error('上次提交结果不确定，请先核对编辑器和本地服务记录，不要重复还原。');
    for(;;){const r=await api('/api/games/'+game+'/'+encodeURIComponent(id));onStatus(r.message||'正在还原…');
      if(r.state==='saved'){storage.removeItem(key);onStatus('还原已保存。请进入元梦试玩核对。'+(r.message?' '+r.message:''));return;}
      if(r.state==='blocked')throw Error('还原已停止：'+r.message+'。请先核对已写入内容，不会自动重新创建。');
      if(r.state!=='running')throw Error('还原状态未知，请核对任务记录。');await wait();
    }
  }
  function bind({button,status,game,name}){
    if(!root.WorkshopBridge.local){button.remove();status.remove();return;}
    button.hidden=false;button.textContent='还原到元梦';status.setAttribute('aria-live','polite');
    button.onclick=async()=>{button.disabled=true;try{await run({api:root.WorkshopBridge.api,game,name,confirmTarget:message=>root.confirm(message),onStatus:message=>status.textContent=message,storage:root.sessionStorage,wait:()=>new Promise(resolve=>setTimeout(resolve,1500))});}catch(e){status.textContent=e.message;}finally{button.disabled=false;button.textContent=root.sessionStorage.getItem('workshop-game-restore-'+game)?'查看还原进度':'还原到元梦';}};
    if(root.sessionStorage.getItem('workshop-game-restore-'+game))button.textContent='查看还原进度';
  }
  const api={run,bind};if(typeof module==='object')module.exports=api;else root.GameRestore=api;
})(typeof window==='object'?window:globalThis);
