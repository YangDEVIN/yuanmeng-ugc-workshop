const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const {publicHtml}=require('./site-html.cjs');
const root=path.resolve(__dirname,'..');
test('published HTML resources exist in tracked deployment files',()=>{
  const tracked=new Set(cp.execFileSync('git',['ls-files','-z'],{cwd:root}).toString().split('\0').filter(Boolean)),missing=[];
  for(const f of tracked){
    if(!f.endsWith('.html'))continue;
    const html=publicHtml(f,fs.readFileSync(path.join(root,f),'utf8')),base=html.match(/<base\s+href="([^"]+)"/i)?.[1],dir=path.resolve(root,path.dirname(f),base||'.');
    for(const m of html.replace(/<base\b[^>]*>/gi,'').matchAll(/(?:src|href)="([^"]+)"/g)){
      const url=m[1].split(/[?#]/)[0];
      if(!url||/^(?:\w+:|\/\/|#)/.test(url)||url.includes('${')||url.includes('+')||url==='connector.zip')continue;
      const relative=path.relative(root,path.resolve(dir,url)).split(path.sep).join('/');
      if(relative && !tracked.has(relative) && !Array.from(tracked).some(x=>x.startsWith(relative+'/')))missing.push(f+' -> '+relative);
    }
  }
  assert.deepEqual(missing,[]);
});
test('local-only pages and their links are removed from online output',()=>{
  for(const file of ['custom.html','coconut-story.html']){const html=publicHtml(file,fs.readFileSync(path.join(root,file),'utf8'));assert.match(html,/url=index.html#scenes/);assert.doesNotMatch(html,/coconut\/project.json|custom-map.js/);}
  const story=publicHtml('maps/story/index.html',fs.readFileSync(path.join(root,'maps/story/index.html'),'utf8'));assert.doesNotMatch(story,/href="coconut-story.html"/);
});
test('legacy page routes preserve query and hash',()=>{const routes=require('./page-routes.json');for(const [old,to]of Object.entries(routes)){assert.ok(fs.existsSync(path.join(root,to)));const html=fs.readFileSync(path.join(root,old),'utf8');assert.match(html,/location\.search\+location\.hash/);}});
test('model export lives above main content',()=>{const html=fs.readFileSync(path.join(root,'models/minifigure/index.html'),'utf8');assert.ok(html.indexOf('id="model-export"')<html.indexOf('<main>'));assert.match(html,/position:sticky/);});
