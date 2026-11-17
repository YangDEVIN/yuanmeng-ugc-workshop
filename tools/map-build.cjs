const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const CustomMap=require('../custom-map'),Draft=require('../map-draft');
const dir=path.resolve(__dirname,'../.workshop-local/builds'),prepared=new Map();
let starting=false;
const file=id=>{if(!/^[a-f0-9]{64}$/.test(id))throw Error('生成任务 ID 无效');return path.join(dir,id+'.json');};
async function save(job){const target=file(job.id),temp=target+'.tmp';await fs.writeFile(temp,JSON.stringify(job));await fs.rename(temp,target);}
async function read(id){const job=JSON.parse(await fs.readFile(file(id),'utf8'));return {id:job.id,state:job.state,total:job.total,completed:job.completed,message:job.message,mapName:job.mapName,warnings:job.warnings,uncertain:job.uncertain};}
async function target(call){const s=await call('ugc_get_status',{probe:true}),c=await call('ugc_get_context',{});if(!s.connected||!c.mapId)throw Error('请进入元梦的具体地图编辑');if(s.running?.runningMode!=='Editing')throw Error('地图不是编辑态，请先停止试玩');return {mapId:c.mapId,layerId:c.currentLayerId,mapName:c.mapName};}
async function prepare(input,withMcp){const project=CustomMap.normalize(input.project);if(!project.placement.count)throw Error('地图没有可生成元件');const t=await withMcp(target),ticket=crypto.randomUUID();prepared.set(ticket,{project,...t,expires:Date.now()+120000});return {ticket,...t,count:project.placement.count};}
async function start(input,withMcp){
  if(starting)throw Error('另一张地图正在准备生成，请稍后');starting=true;
  try{
    const p=prepared.get(input.ticket);prepared.delete(input.ticket);if(!p||p.expires<Date.now())throw Error('地图确认已过期，请重新生成');
    await fs.mkdir(dir,{recursive:true});
    for(const name of await fs.readdir(dir)){if(!name.endsWith('.json'))continue;const old=JSON.parse(await fs.readFile(path.join(dir,name),'utf8'));if(['running','blocked'].includes(old.state))throw Error('存在未核对的生成批次（'+old.id.slice(0,8)+'），请先核对其回执，避免重复放置。');}
    const entries=Draft.records(p.project.placement),id=crypto.createHash('sha256').update(JSON.stringify([p.mapId,p.layerId,p.project.placement])).digest('hex');
    try{await fs.access(file(id));throw Error('此清单已提交过，请勿重复生成。');}catch(e){if(e.code!=='ENOENT')throw e;}
    const job={id,mapId:p.mapId,layerId:p.layerId,mapName:p.mapName,state:'running',total:entries.length,completed:0,receipts:[],warnings:[],uncertain:null,message:'正在创建布局'};
    await save(job);
    run(job,entries,withMcp).catch(()=>{});return read(id);
  }finally{starting=false;}
}
async function run(job,entries,withMcp){
  try{await withMcp(async call=>{
    for(let i=0;i<entries.length;i++){
      const t=await target(call);if(t.mapId!==job.mapId||t.layerId!==job.layerId)throw Error('当前地图或场景已切换，生成已停止。');
      const entry=entries[i],item=entry.item;
      // Persist intent before non-idempotent placement. Uncertain writes are never retried automatically.
      job.uncertain={index:i,id:entry.id};await save(job);
      const result=await call('ugc_create_entity',{typeId:item.typeId,transform:item.transform,...(item.color?{color:item.color}:{}),snapToGround:item.snapToGround??false,layerId:job.layerId});
      const sceneId=result?.sceneId??result?.entity?.sceneId;
      if(!sceneId)throw Error('创建返回中缺少 sceneId，需要人工核对当前元件，禁止自动重试。');
      job.receipts.push({id:entry.id,sceneId:String(sceneId),requested:item.transform});await save(job);
      const actual=await call('ugc_get_entity',{sceneId:String(sceneId),detail:'full'});
      job.receipts.at(-1).actual=actual;
      const location=actual?.transform?.location??actual?.entity?.transform?.location;
      if(!location||['x','y','z'].some(k=>Math.abs(location[k]-item.transform.location[k])>1))job.warnings.push({id:entry.id,sceneId,message:'实际坐标待复核'});
      job.completed++;job.uncertain=null;job.message='已创建并回读 '+job.completed+' / '+job.total;await save(job);
    }
  });job.state='layout_created';job.message='布局已创建并回读；机关、脚本、天空与保存/试玩仍需验收。';await save(job);
  }catch(e){job.state='blocked';job.message=String(e.message).replace(/Bearer\s+\S+/gi,'[redacted]');await save(job);}
}
module.exports={prepare,start,read,run,target};
