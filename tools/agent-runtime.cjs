const fs=require('node:fs'),fsp=fs.promises,path=require('node:path'),os=require('node:os');
const {spawn,execFile}=require('node:child_process');
const ids=['workbuddy','codebuddy','codex','claude','devin','deepseek'];
function installed(id){
  if(id==='workbuddy'){
    const file=path.join(os.homedir(),'AppData/Local/Programs/WorkBuddy/resources/app.asar.unpacked/cli/bin/codebuddy');
    if(fs.existsSync(file)&&fs.existsSync(path.resolve(file,'../../dist/codebuddy-headless.js')))return {executable:process.execPath,prefix:[file],kind:'print'};
  }
  if(!['codebuddy','codex','claude'].includes(id))return null;
  for(const ext of process.platform==='win32'?['.exe','.ps1']:['']){
    for(const dir of [...(process.env.PATH||'').split(path.delimiter),path.join(os.homedir(),'AppData/Roaming/npm'),path.join(os.homedir(),'.local/bin')]){
      const file=path.join(dir,id+ext);if(fs.existsSync(file))return {executable:file,prefix:[],kind:id==='codex'?'codex':'print'};
    }
  }return null;
}
async function running(){
  if(process.platform!=='win32')return {known:false,names:[]};
  return new Promise(resolve=>execFile('powershell.exe',['-NoProfile','-Command','Get-Process | Select-Object -ExpandProperty ProcessName | Sort-Object -Unique'],{windowsHide:true,timeout:6000},(e,out)=>resolve({known:!e,names:e?[]:out.toLowerCase().split(/\r?\n/)})));
}
async function list(){const processes=await running();return ids.map(id=>{
  const adapter=installed(id),patterns={codex:/^(codex|chatgpt)$/,workbuddy:/workbuddy/,codebuddy:/codebuddy/,claude:/claude/,devin:/devin/,deepseek:/deepseek/};
  return {id,running:processes.known?processes.names.some(n=>patterns[id].test(n)):null,automatic:!!adapter,available:!!adapter,reason:adapter?null:'未检测到可自动执行的本机接口'};
});}
async function choose(id){const all=await list();if(id!=='auto'){if(!all.find(a=>a.id===id)?.automatic)throw Error('此 Agent 没有可自动提交的本机接口。请安装其 CLI 或选择其他 Agent。');return id;}
  const active=all.filter(a=>a.running&&a.automatic);
  if(active.length>1)throw Error('检测到多个正在运行的可用 Agent（'+active.map(a=>a.id).join('、')+'），请选择本次使用的 Agent。');
  if(active.length===1)return active[0].id;
  throw Error('未检测到正在运行且支持自动提交的 Agent。请打开一个 Agent，或从列表明确选择已安装的 CLI。');
}
function extract(text){const clean=text.trim().replace(/^```(?:json)?\s*/,'').replace(/\s*```$/,'');return JSON.parse(clean);}
function execute(id,dir,{spawnProcess=spawn}={}){
  const a=installed(id);if(!a)throw Error('Agent 接口不可用');
  const result=path.join(dir,'result.json'),statusFile=path.join(dir,'runner.json');
  const prompt='读取当前目录 task.md、project.json、native-assets.js。完成地图修改。最终回复只能是完整工程 JSON，不能包含解释、Markdown 或省略内容。无需写文件，由调用方保存最终回复；不得调用元梦写入或修改网站。';
  let executable=a.executable,args=[...a.prefix,...(a.kind==='codex'?['exec','--skip-git-repo-check','--sandbox','read-only','--output-last-message',result,'-']:['-p',prompt])];
  if(executable.endsWith('.ps1')){
    const data=Buffer.from(JSON.stringify({executable,args})).toString('base64');
    const script=`$d=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${data}'))|ConvertFrom-Json; $a=@($d.args); & $d.executable @a; exit $LASTEXITCODE`;
    executable='powershell.exe';args=['-NoProfile','-EncodedCommand',Buffer.from(script,'utf16le').toString('base64')];
  }
  const startedAt=Date.now();let output='',diagnostic='',finished=false;
  const write=value=>fs.writeFileSync(statusFile,JSON.stringify({startedAt,updatedAt:Date.now(),...value}));
  write({state:'starting'});
  const child=spawnProcess(executable,args,{cwd:dir,stdio:[a.kind==='codex'?'pipe':'ignore','pipe','pipe'],windowsHide:true,shell:false});
  if(a.kind==='codex'){
    const project=fs.readFileSync(path.join(dir,'project.json'),'utf8'),task=fs.readFileSync(path.join(dir,'task.md'),'utf8');
    const assets=[...require('../map-draft').assets.values()];
    const relevant=assets.filter(x=>project.includes(String(x.typeId))||task.includes(x.name)||['立方体 · 方格','斜坡 · 方格','圆柱体 · 方格'].includes(x.name)).slice(0,80);
    child.stdin.on('error',()=>{});
    child.stdin.end('这是隔离的地图编辑任务。以下内容已由调用方读取，无需使用任何工具或读取文件。仅修改 JSON，不执行地图写入。返回完整工程 JSON，不要返回 error 对象。\n'+task+'\n当前工程：\n'+project+'\n可用目录摘要（没有匹配项时保留已有元件，不能编造类型）：\n'+JSON.stringify(relevant));
  }
  const finish=(state,message)=>{if(finished)return;finished=true;clearTimeout(timer);write({state,message});};
  const timer=setTimeout(()=>{child.kill();finish('blocked','Agent 运行超过 10 分钟，已停止接收本次结果。请检查客户端是否仍有任务，并处理登录、授权或模型连接。');},600000);
  child.once('spawn',()=>write({state:'running'}));
  child.stdout.on('data',b=>{output+=b.toString();if(output.length>32*1024*1024){child.kill();finish('blocked','Agent 输出超过 32 MB');}});
  child.stderr.on('data',b=>{diagnostic=(diagnostic+b.toString()).slice(-8000);});
  child.once('error',e=>finish('blocked','无法启动 Agent：'+e.code));
  child.once('close',code=>{
    if(finished)return;
    if(code!==0){const reason=/login|auth|credential|401|403|登录/i.test(diagnostic)?'登录或授权失效':/permission|denied|approval|权限/i.test(diagnostic)?'工具调用权限不足':'进程退出（'+code+'）';finish('blocked','Agent '+reason+'。请在对应客户端处理后重试。');return;}
    try{if(a.kind!=='codex')fs.writeFileSync(result,JSON.stringify(extract(output)));else extract(fs.readFileSync(result,'utf8'));finish('finished','Agent 已返回工程，正在校验。');}
    catch{const reason=/login|auth|credential|401|403|登录/i.test(diagnostic)?'Agent 登录或授权失效。':/permission|denied|approval|ExecutionPolicy|权限|scripts is disabled/i.test(diagnostic)?'Agent 启动或工具权限被阻止。':'Agent 没有返回完整 JSON。';finish('blocked',reason+'请检查客户端登录、权限和模型输出限制。');}
  });
  return {pid:child.pid};
}
module.exports={list,choose,execute,extract};
