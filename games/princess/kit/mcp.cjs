const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const LIMIT=32*1024*1024;
async function readJson(file){return JSON.parse(await fs.readFile(file,'utf8'));}
function redact(text){return String(text).replace(/Bearer\s+[^\s"\\]+/gi,'Bearer [redacted]').slice(0,1200);}
async function connection(){
  const bases=[process.env.LOCALAPPDATA,path.join(os.homedir(),'AppData','Local')].filter(Boolean);
  for(const base of [...new Set(bases)]){
    try{
      const c=await readJson(path.join(base,'Yuanmeng','DesktopService','ai-connection.json'));
      if(c.url!=='http://127.0.0.1:18000/mcp')throw Error('插件连接地址不是允许的本机 MCP 地址。');
      if(!c.headers?.Authorization)throw Error('插件接入文件缺少 Authorization，请在 VS Code 重新生成接入信息。');
      return c;
    }catch(e){if(e.code!=='ENOENT')throw e;}
  }
  throw Object.assign(Error('未找到元梦插件生成的 ai-connection.json。请在 VS Code 启动元梦 MCP 服务。'),{code:'NO_CONFIG'});
}
function rpcPacket(text,id){
  try{const packet=JSON.parse(text);if(packet.id===id)return packet;}catch{}
  for(const event of text.split(/\r?\n\r?\n/)){
    const value=event.split(/\r?\n/).filter(l=>l.startsWith('data:')).map(l=>l.slice(5).trimStart()).join('\n');
    try{const packet=JSON.parse(value);if(packet.id===id)return packet;}catch{}
  }
  return null;
}
function unwrap(result){
  let value=result?.structuredContent;
  if(!value){const text=result?.content?.find(c=>c.type==='text')?.text;if(text){try{value=JSON.parse(text);}catch{throw Error(redact(text));}}}
  if(result?.isError||value?.ok===false)throw Error(redact(JSON.stringify(value?.error||value||'MCP 调用失败')));
  return value?.data??value;
}
async function withMcp(run){
  const c=await connection();let session,version='2025-03-26',seq=0;
  async function rpc(method,params,notification=false){
    const id=++seq,headers={'Content-Type':'application/json',Accept:'application/json, text/event-stream',...c.headers,'X-Mcp-Agent-Name':'yuanmeng-workshop','MCP-Protocol-Version':version};
    if(session)headers['Mcp-Session-Id']=session;
    let response;
    try{response=await fetch(c.url,{method:'POST',headers,redirect:'error',signal:AbortSignal.timeout(12000),body:JSON.stringify({jsonrpc:'2.0',...(notification?{}:{id}),method,params})});}
    catch(e){throw Object.assign(Error(e.cause?.code||e.message),{code:e.cause?.code||e.name});}
    session=response.headers.get('mcp-session-id')||session;
    if(!response.ok)throw Object.assign(Error('MCP HTTP '+response.status),{code:response.status===404?'SESSION_NOT_FOUND':'HTTP_'+response.status});
    if(notification){await response.body?.cancel();return;}
    let packet;
    if(response.headers.get('content-type')?.includes('text/event-stream')){
      const reader=response.body.getReader(),decoder=new TextDecoder();let text='';
      try{while(true){const part=await reader.read();if(part.done)break;text+=decoder.decode(part.value,{stream:true});packet=rpcPacket(text,id);if(packet)break;if(text.length>LIMIT)throw Error('MCP 响应过大');}}finally{await reader.cancel();}
    }else packet=rpcPacket(await response.text(),id);
    if(!packet)throw Error('MCP 响应格式无效');
    if(packet.error)throw Error(redact(packet.error.message));
    return packet.result;
  }
  try{
    const init=await rpc('initialize',{protocolVersion:version,capabilities:{},clientInfo:{name:'yuanmeng-workshop',version:'1.0.0'}});
    version=init.protocolVersion||version;
    await rpc('notifications/initialized',{},true);
    return await run(async(name,args)=>unwrap(await rpc('tools/call',{name,arguments:args})));
  }finally{
    // Close only the HTTP session created by this probe, never another client's session or service.
    if(session)await fetch(c.url,{method:'DELETE',redirect:'error',headers:{...c.headers,'Mcp-Session-Id':session,'MCP-Protocol-Version':version},signal:AbortSignal.timeout(2000)}).then(r=>r.body?.cancel()).catch(()=>{});
  }
}
module.exports={withMcp,rpcPacket,unwrap,redact};
