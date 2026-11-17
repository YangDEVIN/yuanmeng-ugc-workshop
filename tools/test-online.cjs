const test=require('node:test'),assert=require('node:assert/strict');
const access=require('./bridge-access.cjs'),runtime=require('./agent-runtime.cjs'),build=require('./map-build.cjs'),fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
test('public origin needs an expiring paired capability; foreign origins cannot pair',()=>{
  const headers={host:'127.0.0.1:18766',origin:'https://yangdevin.github.io','x-workshop-client':'1'};
  assert.equal(access.authorize({headers}),false);
  let body='';const res={writeHead(){},end(t){body=t;}};
  access.pairing({headers:{host:headers.host}},res,new URL('http://127.0.0.1:18766/pair?origin=https://yangdevin.github.io'));
  const nonce=body.match(/nonce:'([a-f0-9]+)'/)[1];const {token}=access.approve(nonce);
  assert.equal(access.authorize({headers:{...headers,'x-workshop-token':token}}),true);
  assert.equal(access.authorize({headers:{...headers,origin:'https://evil.example','x-workshop-token':token}}),false);
  assert.throws(()=>access.approve(nonce));
});
test('Agent accepts fenced JSON but not partial text',()=>{assert.deepEqual(runtime.extract('```json\n{"map":"a"}\n```'),{map:'a'});assert.throws(()=>runtime.extract('done!'));});
test('map generation rejects play mode and absent map',async()=>{await assert.rejects(build.target(async name=>name==='ugc_get_status'?{connected:true,running:{runningMode:'Playing'}}:{mapId:'a'}),/编辑态/);});
test('uncertain writes stop without retry; successful placement requires readback',async()=>{
  const dir=path.resolve(__dirname,'../.workshop-local/builds');await fs.mkdir(dir,{recursive:true});
  for(const fail of [false,true]){
    const job={id:crypto.randomBytes(32).toString('hex'),mapId:'test',layerId:'1',state:'running',total:1,completed:0,receipts:[],warnings:[]};let writes=0,reads=0;
    const entries=[{id:'a',item:{typeId:'x',transform:{location:{x:0,y:0,z:0}}}}];
    const call=async name=>{if(name==='ugc_get_status')return {connected:true,running:{runningMode:'Editing'}};if(name==='ugc_get_context')return {mapId:'test',currentLayerId:'1'};if(name==='ugc_create_entity'){writes++;if(fail)throw Error('timeout');return {sceneId:'42'};}if(name==='ugc_get_entity'){reads++;return {transform:{location:{x:0,y:0,z:0}}};}};
    await build.run(job,entries,run=>run(call));assert.equal(writes,1);assert.equal(job.state,fail?'blocked':'layout_created');assert.equal(reads,fail?0:1);assert.equal(Boolean(job.uncertain),fail);
    await fs.unlink(path.join(dir,job.id+'.json'));
  }
});
