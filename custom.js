(async()=>{
  const $=id=>document.getElementById(id),frame=$('preview');
  const castleExample=new URLSearchParams(location.search).get('example')==='brick-castle';
  const replicaExample=new URLSearchParams(location.search).get('example')==='minecraft-castle';
  const workingKey=replicaExample?'custom-working-minecraft-castle-crownpark-snowridge-v1':castleExample?'custom-working-brick-castle':'custom-working';
  const INDEX='custom-library/v1';
  let library=await DraftStore.load(INDEX)||[],project=CustomMap.empty(),selected=null,agentList=[],pending=null,job=null,jobTimer,busy=false,frameReady=false,previewKey='';
  const notice=text=>$('notice').textContent=text;
  const connect=document.createElement('button');connect.textContent='连接本机';connect.onclick=WorkshopBridge.connect;$('connection').before(connect);
  const download=document.createElement('a');download.href='connector.zip';download.textContent='获取连接器';download.className='button';download.download='元梦工坊连接器.zip';$('connection-help').after(download);
  WorkshopBridge.buildButton(document.querySelector('.actions'),snapshot);
  const restore=document.createElement('button');restore.textContent='恢复上个版本';document.querySelector('.actions').append(restore);restore.onclick=async()=>{try{const previous=await DraftStore.load('custom-before-agent');if(!previous)throw Error('暂无 Agent 修改前的版本');await show(previous);notice('已恢复 Agent 修改前的版本。');}catch(e){notice(e.message);}};
  const auto=new Option('自动识别正在运行的 Agent','auto',true,true);$('agent').prepend(auto);
  $('agent-settings').hidden=true;
  const importButton=document.createElement('button');importButton.textContent='↑ 导入 JSON';importButton.className='primary';
  $('upload').parentElement.before(importButton);$('upload').parentElement.hidden=true;importButton.onclick=()=>$('upload').click();
  const stop=document.createElement('button');stop.textContent='停止等待';stop.type='button';stop.hidden=true;$('chat-form').append(stop);
  stop.onclick=()=>{clearTimeout(jobTimer);job=null;busy=false;stop.hidden=true;$('send').disabled=false;DraftStore.save('custom-active-job',null).catch(e=>notice(e.message));message('已停止等待和自动应用。后台 Agent 可能仍在运行，请在对应客户端查看；本轮结果不会覆盖当前地图。');};
  const api=WorkshopBridge.api;
  function snapshot(){
    if(!frameReady)throw Error('地图正在加载，请稍后再操作。');
    const current=frame.contentWindow?.draftView?.exportProject?.()||project;
    return CustomMap.normalize({...current,name:$('map-name').value.trim()||'未命名地图'});
  }
  let saving=Promise.resolve();
  function saveWorking(){const value={project:snapshot(),selected};saving=saving.catch(()=>{}).then(()=>DraftStore.save(workingKey,value));saving.catch(e=>notice('草稿保存失败：'+e.message));}
  $('map-name').onchange=saveWorking;
  async function show(value){
    const next=CustomMap.normalize(value),key='custom-preview-'+crypto.randomUUID();
    await DraftStore.save(key,{project:next,target:'project',back:'custom.html'});
    frameReady=false;previewKey=key;
    project=next;$('map-name').value=project.name;$('map-count').textContent=project.placement.count.toLocaleString()+' 个元件';
    frame.src='map-edit.html?custom=1&v=7&draft='+key+'#'+key;
    frame.onload=()=>{};
  }
  function message(text,who='agent'){const p=document.createElement('p');p.className=who;p.textContent=text;$('messages').append(p);p.scrollIntoView({block:'nearest'});}
  async function guide(){const r=await fetch('提示词.md?v7');if(!r.ok)throw Error('提示词文件加载失败');return r.text();}
  async function copy(text){try{await navigator.clipboard.writeText(text);return true;}catch{notice('浏览器未允许复制，请下载提示词文件。');return false;}}
  $('copy-prompt').onclick=async()=>{try{if(await copy(await guide()))notice('已复制生成提示词。');}catch(e){notice(e.message);}};
  $('new-map').onclick=async()=>{if(!confirm('打开空白地图？未保存的当前修改不会进入仓库。'))return;selected=null;try{await show(CustomMap.empty());notice('新地图已就绪。');}catch(e){notice(e.message);}};
  $('upload').onchange=async event=>{
    const file=event.target.files[0];if(!file)return;
    try{if(file.size>32*1024*1024)throw Error('文件超过 32 MB，请拆分地图。');const next=CustomMap.normalize(JSON.parse(await file.text()));await show(next);selected=null;notice('已导入 '+file.name+'。');}
    catch(e){notice('导入失败：'+e.message);}finally{event.target.value='';}
  };
  $('export').onclick=()=>MapExport.open(snapshot);
  $('save-map').onclick=async()=>{
    try{
      const p=snapshot(),id=selected||crypto.randomUUID(),key='custom-project-'+crypto.randomUUID();
      await DraftStore.save(key,p);
      const entry={id,key,name:p.name,count:p.placement.count,updatedAt:new Date().toISOString()};
      const next=[entry,...library.filter(e=>e.id!==id)];await DraftStore.save(INDEX,next);library=next;selected=id;
      notice('已保存到此浏览器的自定义仓库。');
    }catch(e){notice('保存失败：'+e.message);}
  };
  function renderLibrary(){
    const list=$('library-list');list.replaceChildren();if(!library.length){list.textContent='仓库暂无地图';return;}
    for(const entry of library){
      const row=document.createElement('article'),name=document.createElement('span'),open=document.createElement('button'),remove=document.createElement('button');
      name.textContent=entry.name+' · '+entry.count+' 件';open.textContent='打开';remove.textContent='删除';
      open.onclick=async()=>{try{await show(await DraftStore.load(entry.key));selected=entry.id;$('library').close();notice('已打开 '+entry.name);}catch(e){notice(e.message);}};
      remove.onclick=async()=>{if(!confirm('从仓库移除「'+entry.name+'」？'))return;try{const next=library.filter(e=>e.id!==entry.id);await DraftStore.save(INDEX,next);library=next;if(selected===entry.id)selected=null;renderLibrary();}catch(e){notice(e.message);}};
      row.append(name,open,remove);list.append(row);
    }
  }
  $('library-open').onclick=()=>{renderLibrary();$('library').showModal();};
  const help={NO_CONFIG:'打开 VS Code 的「元梦开发助手AI」，启动 MCP 服务。插件会自动生成本机接入文件。',ECONNREFUSED:'VS Code 中的元梦 MCP 服务没有响应。请检查服务是否启动，并保持该窗口打开。此错误不代表游戏关闭，也不是信任失败。',HTTP_401:'接入凭据已失效。请在元梦插件重新生成接入信息，再点击重新检测。',HTTP_403:'元梦服务拒绝访问。请核对插件的本机接入配置。',SESSION_NOT_FOUND:'本次已重新建立一次会话，仍失败。请在元梦插件检查服务后重试。'};
  let lastIssue='',checking=false;
  async function checkConnection(manual=false){
    if(checking)return;checking=true;
    try{
      const result=await api('/api/mcp/status'),ok=result.state==='connected';
      $('connection').dataset.state=ok?'connected':'error';$('connection').textContent=ok?'● '+result.mapName:'○ 元梦未连接';
      $('connection-detail').textContent=ok?'已连接「'+result.mapName+'」 · '+(result.mode||'编辑状态未知')+' · 脚本联动'+(result.scriptConnected===true?'已就绪':result.scriptConnected===false?'未就绪':'未知'):result.message||'未进入具体地图';
      $('connection-help').textContent=ok?'最近检测：'+new Date(result.checkedAt).toLocaleTimeString():help[result.code]||'保持 VS Code 元梦服务与游戏打开，在星世界草稿箱进入具体地图编辑。脚本关联不是地图连接的前置条件。';
      const issue=ok?'':result.code||result.message;
      if((manual||issue&&issue!==lastIssue)&&!$('connect-dialog').open)$('connect-dialog').showModal();lastIssue=issue;
    }catch(e){
      $('connection').dataset.state='error';$('connection').textContent='○ 本地桥接未连接';$('connection-detail').textContent=e.message;
      $('connection-help').textContent='启动本机连接器后点击「连接本机」。首次使用需在连接窗口授权，并允许浏览器访问本机网络。所有地图操作留在当前在线网页，无需下载网页或复制 JSON。';
      if((manual||lastIssue!=='bridge')&&!$('connect-dialog').open)$('connect-dialog').showModal();lastIssue='bridge';
    }finally{checking=false;}
  }
  $('connection').onclick=()=>checkConnection(true);$('retry').onclick=()=>checkConnection(true);
  function agentStatus(){const active=agentList.filter(a=>a.running),c=agentList.find(a=>a.id===$('agent').value);$('agent-status').textContent=$('agent').value==='auto'?(active.length?'正在运行：'+active.map(a=>a.id+(a.automatic?'':'（无自动接口）')).join('、'):'未检测到运行中的 Agent'):c?.automatic?'可自动提交 · '+(c.running?'正在运行':'将启动本轮进程'):'此 Agent 无可用自动接口';$('send').textContent='✦ 生成 / 修改地图';}
  async function refreshAgents(){try{agentList=await api('/api/agents/active');agentStatus();}catch(e){$('agent-status').textContent=e.message;}}
  $('agent').onchange=agentStatus;
  $('agent-settings').onclick=()=>{const c=agentList.find(a=>a.id===$('agent').value);$('settings-agent').textContent=$('agent').selectedOptions[0].textContent;$('executable').value=c?.executable||'';$('arguments').value=JSON.stringify(c?.args||['{prompt}']);$('settings-status').textContent='';$('settings').showModal();};
  $('settings-form').onsubmit=async event=>{event.preventDefault();try{await api('/api/agents',{id:$('agent').value,executable:$('executable').value,args:JSON.parse($('arguments').value)});await refreshAgents();$('settings').close();}catch(e){$('settings-status').textContent=e.message;}};
  async function poll(){
    if(!job)return;
    const currentJob=job;
    try{const r=await api('/api/jobs/'+currentJob.id);if(job!==currentJob)return;
      if(r.state==='ready'){pending={project:CustomMap.normalize(r.project),base:job.base};await DraftStore.save('custom-pending',pending);await DraftStore.save('custom-active-job',null);message('新版本已通过数据校验：'+pending.project.placement.count+' 个元件，正在更新预览。');$('apply').hidden=false;job=null;busy=false;stop.hidden=true;$('send').disabled=false;$('apply').click();return;}
      if(r.state==='blocked'){message('任务已阻断：'+r.message);alert(r.message);job=null;busy=false;stop.hidden=true;$('send').disabled=false;await DraftStore.save('custom-active-job',null);return;}
      if(r.state==='running')$('agent-status').textContent='正在生成 · '+r.elapsedSec+' 秒'+(r.elapsedSec>120?' · 若长时间无结果，请检查 Agent 登录与模型连接':'');
      if(r.state==='invalid'){message('结果未通过检查：'+r.message+'，请调整需求后重试。');job=null;busy=false;stop.hidden=true;$('send').disabled=false;await DraftStore.save('custom-active-job',null);return;}
    }catch(e){if(job!==currentJob)return;if(job.lastError!==e.message){message('等待结果：'+e.message);job.lastError=e.message;}}
    jobTimer=setTimeout(poll,3000);
  }
  $('chat-form').onsubmit=async event=>{
    event.preventDefault();if(busy)return;busy=true;$('send').disabled=true;
    try{
      const task=$('task').value.trim(),p=snapshot();message(task,'user');pending=null;await DraftStore.save('custom-pending',null);$('apply').hidden=true;
      const result=await api('/api/jobs',{agent:$('agent').value,task,project:p,automatic:true});
      job={id:result.id,base:JSON.stringify(p)};await DraftStore.save('custom-active-job',job);stop.hidden=false;message(result.message);$('task').value='';
      // The prompt is visible and copyable even for GUI adapters without a prompt API.
      poll();
    }catch(e){message('未发送：'+e.message);busy=false;$('send').disabled=false;}
  };
  $('apply').onclick=async()=>{
    if(!pending)return;
    if(JSON.stringify(snapshot())!==pending.base){message('当前地图在发送后有修改，请先导出或保存当前地图，再重新发送任务，避免覆盖。');return;}
    try{await DraftStore.save('custom-before-agent',snapshot());await show(pending.project);pending=null;await DraftStore.save('custom-pending',null);$('apply').hidden=true;notice('Agent 修改已更新到网页，可恢复上个版本。');}catch(e){message(e.message);}
  };
  window.addEventListener('message',event=>{
    if(event.origin!==location.origin||event.source!==frame.contentWindow||event.data?.type!=='workshop-draft-ready'||event.data.draftId!==previewKey)return;
    frameReady=true;
    $('map-count').textContent=event.data.count.toLocaleString()+' 个元件';
    saveWorking();
  });
  window.addEventListener('beforeunload',event=>{if(job){event.preventDefault();event.returnValue='';}});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)checkConnection();});
  setInterval(()=>{if(!document.hidden)checkConnection();},30000);
  try{
    const working=replicaExample?(await DraftStore.load(workingKey)??{project:await (await fetch('minecraft-castle/workshop-project.json')).json()}):castleExample?{project:await (await fetch('crown-castle/workshop-project.json')).json()}:await DraftStore.load(workingKey);if(working?.project){project=CustomMap.normalize(working.project);selected=working.selected;}
    await show(project);
    pending=await DraftStore.load('custom-pending');if(pending){$('apply').hidden=false;message('上次 Agent 返回的新版本等待应用。');}
    job=await DraftStore.load('custom-active-job');if(job){busy=true;stop.hidden=false;$('send').disabled=true;message('正在恢复上次任务的结果等待。');poll();}
  }catch(e){notice(e.message);}
  refreshAgents();checkConnection();
  window.addEventListener('workshop-connected',()=>{refreshAgents();checkConnection();});
  setInterval(()=>{if(!document.hidden&&!busy)refreshAgents();},15000);
})();
