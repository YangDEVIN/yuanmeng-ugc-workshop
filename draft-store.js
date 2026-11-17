const DraftStore=(()=>{
  const dbName='yuanmeng-map-drafts';
  const mirrorPrefix='yuanmeng-draft:';
  function access(mode,key,value){
    return new Promise((resolve,reject)=>{
      const request=indexedDB.open(dbName,1);
      request.onupgradeneeded=()=>request.result.createObjectStore('drafts');
      request.onerror=()=>reject(request.error);
      request.onsuccess=()=>{
        const db=request.result,transaction=db.transaction('drafts',mode),store=transaction.objectStore('drafts');
        const operation=mode==='readonly'?store.get(key):store.put(value,key);
        transaction.oncomplete=()=>{db.close();resolve(operation.result);};
        transaction.onabort=()=>{db.close();reject(transaction.error??Error('草稿保存失败'));};
      };
    });
  }
  // 嵌入预览里第三方存储可能被隔离，镜像一份到同标签页的 sessionStorage。
  function mirrorSave(key,value){
    try{sessionStorage.setItem(mirrorPrefix+key,JSON.stringify(value));return true;}
    catch{return false;}
  }
  function mirrorLoad(key){
    try{const raw=sessionStorage.getItem(mirrorPrefix+key);return raw?JSON.parse(raw):undefined;}
    catch{return undefined;}
  }
  async function save(key,value){
    try{
      await access('readwrite',key,value);
      mirrorSave(key,value);
    }catch(error){
      if(!mirrorSave(key,value))throw error;
    }
  }
  async function load(key){
    try{
      const value=await access('readonly',key);
      if(value!==undefined)return value;
    }catch{/* IndexedDB 不可用，改读镜像 */}
    return mirrorLoad(key);
  }
  function navigate(url){
    // 页面被嵌在跨域 iframe 里时，读取 window.top.location 会抛 SecurityError；
    // 此时留在当前 frame 导航，不尝试改写顶层地址。
    try{
      if(window.top!==window && window.top.location.origin===window.location.origin){
        window.top.location.assign(url);
        return;
      }
    }catch{/* 跨域，落到当前 frame */}
    window.location.assign(url);
  }
  function draftKey(){
    return globalThis.crypto?.randomUUID?.()??('draft-'+Date.now()+'-'+Math.random().toString(36).slice(2));
  }
  async function open(project,target,back,viewState=null){
    const key=draftKey();
    // viewState 是正式版当前画面的只读快照，编辑页据此还原初始镜头与氛围。
    await save(key,{project,target,back,viewState,edits:null});
    const page=new URL('map-edit.html',location.href);
    // 保留分享链接的查询参数，跳转后不丢鉴权信息。
    page.search=location.search;
    page.hash=key;
    navigate(page.href);
  }
  function download(value,name){
    const url=URL.createObjectURL(new Blob([JSON.stringify(value)],{type:'application/json'}));
    const link=document.createElement('a');
    link.href=url;link.download=name;link.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  return {open,save,load,download};
})();
