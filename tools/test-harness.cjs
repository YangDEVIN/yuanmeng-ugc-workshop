const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const C=require('../custom-map'),D=require('../map-draft'),bridge=require('./workshop-bridge.cjs');
function sample(){const p=C.empty();p.placement.commands=[{tool:'ugc_create_entity',arguments:{items:[D.nativeItem('1101002001034000',{x:150,y:-200,z:40})]}}];p.placement.count=1;delete p.placement.batchItemIds;return p;}
test('placement round trip preserves transforms and metadata without mutating input',()=>{const input=sample();input.gameplay={runtimeBinding:'required'};const result=C.normalize(input);assert.equal(result.placement.batchItemIds[0][0],'placement-0');assert.deepEqual(result.placement.commands,input.placement.commands);assert.equal(input.placement.batchItemIds,undefined);assert.deepEqual(C.normalize(JSON.parse(JSON.stringify(result))),result);});
test('reject unknown types, invalid numbers, units, duplicates and count mismatch',()=>{
  for(const mutate of [p=>p.placement.commands[0].arguments.items[0].typeId='unknown',p=>p.placement.commands[0].arguments.items[0].transform.scale.x=0,p=>p.placement.commands[0].arguments.items[0].transform.location.z=Infinity,p=>p.placement.coordinates.units='m',p=>p.placement.count=8,p=>p.placement.commands[0].tool='execute_lua']){const p=sample();mutate(p);assert.throws(()=>C.normalize(p));}
  const p=sample();p.placement.commands[0].arguments.items.push(structuredClone(p.placement.commands[0].arguments.items[0]));p.placement.count=2;p.placement.batchItemIds=[['same','same']];assert.throws(()=>C.normalize(p),/重复/);
});
test('existing Dust II and campus placement can be imported',async()=>{for(const file of ['maps/fps/placement.json','maps/story/project.json']){const p=C.normalize(JSON.parse(await fs.readFile(path.join(__dirname,'..',file),'utf8')));assert.ok(p.placement.count>1000);}});
test('MCP parses JSON/SSE and preserves business failure',()=>{assert.equal(bridge.rpcPacket('data: {"id":4,"result":{"ok":true}}\n\n',4).result.ok,true);assert.equal(bridge.rpcPacket('{"id":5,"result":{}}',4),null);assert.throws(()=>bridge.unwrap({content:[{type:'text',text:'{"ok":false,"error":{"code":"NOT_CONNECTED"}}'}]}),/NOT_CONNECTED/);});
test('API rejects cross-origin and missing request marker',async()=>{
  for(const headers of [{host:'127.0.0.1:18766'},{host:'127.0.0.1:18766',origin:'https://evil.example','x-workshop-client':'1'},{host:'evil.example:18766','x-workshop-client':'1'}]){
    let code;const res={writeHead(s){code=s;},end(){}};await bridge.handle({url:'/api/agents',method:'GET',headers},res);assert.equal(code,403);
  }
});
test('Agent job writes task and round-trips validated result; launcher is isolated',async()=>{
  const available=(await bridge.agents()).find(a=>a.available);if(!available)return;
  const p=sample();let dir;
  const job=await bridge.createJob({agent:available.id,task:'测试：保留地图',project:p},{launcher:async(c,d,prompt)=>{dir=d;assert.ok(prompt.includes('task.md'));assert.ok((await fs.readFile(path.join(d,'task.md'),'utf8')).includes('测试：保留地图'));}});
  assert.ok((await fs.readFile(path.join(dir,'task.md'),'utf8')).includes(await fs.readFile(path.join(dir,'AGENTS.md'),'utf8')));
  const knowledge=await fs.readFile(path.join(dir,'knowledge/README.md'),'utf8');
  assert.ok(knowledge.includes('KB-038'));
  assert.ok((await fs.readFile(path.join(dir,'task.md'),'utf8')).includes(knowledge));
  assert.equal((await bridge.jobResult(job.id)).state,'waiting');
  await fs.writeFile(path.join(dir,'result.json'),JSON.stringify(C.normalize(p)));assert.equal((await bridge.jobResult(job.id)).state,'ready');
  await fs.writeFile(path.join(dir,'result.json'),'{}');assert.equal((await bridge.jobResult(job.id)).state,'invalid');
  // Delete only files in this test's unique job directory, not user jobs.
  for(const file of ['AGENTS.md','agent.md','project.json','native-assets.js','task.md','job.json','result.json'])await fs.unlink(path.join(dir,file));await fs.unlink(path.join(dir,'knowledge/README.md'));await fs.rmdir(path.join(dir,'knowledge'));await fs.rmdir(dir);
});
