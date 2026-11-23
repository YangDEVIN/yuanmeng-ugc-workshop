(async()=>{
 const frame=document.getElementById('scene'),status=document.getElementById('status');let project,key;
 const views={castle:[[8,130,-225],[0,8,-4]],all:[[0,285,-145],[0,0,0]],square:[[12,42,-107],[0,4,-33]],snow:[[-120,90,-100],[-50,25,30]]};
 try{const r=await fetch('maps/scenic/castle/workshop-project.json',{cache:'no-store'});if(!r.ok)throw Error('场景读取失败');project=await r.json();MapExport.prepare(project);key='scenic-'+crypto.randomUUID();await DraftStore.save(key,{project,target:'project',back:'maps/scenic/index.html'});frame.src='map-edit.html?custom=1&view=scenic#'+key;document.getElementById('count').textContent=project.placement.count.toLocaleString()+' 个场景元件';}
 catch(e){status.textContent=e.message;return;}
 window.addEventListener('message',e=>{if(e.origin!==location.origin||e.source!==frame.contentWindow||e.data?.type!=='workshop-draft-ready'||e.data.draftId!==key)return;status.textContent='场景已载入';document.querySelectorAll('button').forEach(b=>b.disabled=false);});
 document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>frame.contentWindow.draftView.setCamera(...views[b.dataset.view]));
 document.getElementById('export').onclick=()=>MapExport.open(()=>project);
})();
