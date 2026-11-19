(() => {
  const button=document.querySelector('#restore-game'),status=document.querySelector('#restore-status');
  const wait=()=>new Promise(resolve=>setTimeout(resolve,1000));
  button.onclick=async()=>{
    button.disabled=true;
    try{
      if(!WorkshopBridge.local){status.textContent='下载资源包并解压，双击「一键还原.cmd」即可导入当前元梦草稿。';return;}
      const c=await WorkshopBridge.api('/api/mcp/status');
      if(c.state!=='connected')throw Error(c.message||'请在元梦中打开目标草稿。');
      if(!confirm('还原到「'+c.mapName+'」当前场景并保存？'))return;
      const job=await WorkshopBridge.api('/api/games/princess',{mapId:c.mapId,layerId:c.layerId});
      for(;;){const result=await WorkshopBridge.api('/api/games/princess/'+job.id);
        status.textContent=result.message;if(result.state!=='running')break;await wait();}
    }catch(e){status.textContent=e.message;}finally{button.disabled=false;}
  };
})();
