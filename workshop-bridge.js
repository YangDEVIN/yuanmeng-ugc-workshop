window.WorkshopBridge=(()=>{
  const local=!window.__WORKSHOP_ONLINE__&&['127.0.0.1','localhost','[::1]'].includes(location.hostname),base=local?location.origin:'http://127.0.0.1:18766';
  let token=sessionStorage.getItem('workshop-pair-token')||'',popup;
  async function api(url,data){
    if(!local)throw Error("在线版不提供本机操作，请在本地工坊使用。");
    let response;try{response=await fetch(base+url,{method:data?'POST':'GET',headers:{'X-Workshop-Client':'1',...(!local&&token?{'X-Workshop-Token':token}:{}),...(data?{'Content-Type':'application/json'}:{})},...(data?{body:JSON.stringify(data)}:{}),credentials:'omit',redirect:'error',targetAddressSpace:'loopback',signal:AbortSignal.timeout(35000)});}
    catch{throw Error('无法连接本机连接器。请启动连接器，并在浏览器允许此网站访问本机网络。无需下载网页。');}
    if(!response.headers.get('content-type')?.includes('application/json'))throw Error('连接器版本过旧或尚未启动，请更新连接器。');
    const result=await response.json();if(!response.ok)throw Error(result.error||'连接失败');return result;
  }
  function connect(){
    if(!local)return;
    if(local){window.dispatchEvent(new Event('workshop-connected'));return;}
    popup=window.open(base+'/pair?origin='+encodeURIComponent(location.origin),'workshop-pair','width=680,height=580');
    if(!popup)alert('连接窗口被浏览器拦截，请允许弹出窗口后重试。');
  }
  window.addEventListener('message',e=>{if(e.origin!==base||e.source!==popup||e.data?.type!=='workshop-paired')return;token=e.data.token;sessionStorage.setItem('workshop-pair-token',token);window.dispatchEvent(new Event('workshop-connected'));});
  function buildButton(parent,getProject){
    if(!local)return null;
    const button=document.createElement('button');button.type='button';button.textContent='还原到元梦';button.className='map-primary';
    const status=document.createElement('p');status.setAttribute('role','status');status.style.cssText='max-width:660px;line-height:1.6;overflow-wrap:anywhere';parent.append(button,status);
    if(!local){const pair=document.createElement('button');pair.type='button';pair.textContent='连接本机';pair.onclick=connect;parent.append(pair);}
    let timer;
    async function poll(id){try{const r=await api('/api/builds/'+id);status.textContent=r.message+'（'+r.completed+'/'+r.total+'）'+(r.warnings?.length?' · '+r.warnings.length+' 项需复核':'');if(r.state==='running'){timer=setTimeout(()=>poll(id),2000);return;}sessionStorage.removeItem('workshop-active-build');button.disabled=false;if(r.state==='blocked')alert(r.message+' 已停止，不会自动重复创建。');}catch(e){status.textContent=e.message+' 当前批次可能已写入，请恢复连接后继续查看。';timer=setTimeout(()=>poll(id),10000);}}
    button.onclick=async()=>{button.disabled=true;try{const project=await getProject();const info=await api('/api/builds/prepare',{project});if(!confirm('向元梦「'+info.mapName+'」当前场景添加 '+info.count+' 个元件？\n保留已有元件，不自动保存。')){button.disabled=false;return;}const r=await api('/api/builds',{ticket:info.ticket});sessionStorage.setItem('workshop-active-build',r.id);status.textContent='正在生成…';poll(r.id);}catch(e){status.textContent=e.message;button.disabled=false;alert(e.message);}};
    const active=sessionStorage.getItem('workshop-active-build');if(active){button.disabled=true;poll(active);}
    return {button,status};
  }
  return {api,connect,buildButton,local};
})();
