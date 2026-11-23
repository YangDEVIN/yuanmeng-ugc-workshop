const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),site=path.join(root,'_site'),connector=path.join(root,'.connector');
fs.mkdirSync(site,{recursive:true});fs.mkdirSync(path.join(connector,'tools'),{recursive:true});
const files=execFileSync('git',['-c','safe.directory='+root,'ls-files','-z'],{cwd:root}).toString().split('\0').filter(Boolean);
for(const file of files){if(file.startsWith('.')||file.startsWith('tools/')||file==='AGENTS.md')continue;const out=path.join(site,file);fs.mkdirSync(path.dirname(out),{recursive:true});if(file.endsWith('.html')){let html=fs.readFileSync(path.join(root,file),'utf8');
html=require('./site-html.cjs').publicHtml(file,html);fs.writeFileSync(out,html);}else fs.copyFileSync(path.join(root,file),out);}
for(const file of ['custom-map.js','map-draft.js','native-assets.js','提示词.md','AGENTS.md','agent.md','knowledge/README.md','knowledge/issues.json','games/princess/kit/mcp.cjs','tools/connector.cjs','tools/workshop-bridge.cjs','tools/agent-runtime.cjs','tools/bridge-access.cjs','tools/map-build.cjs']){const dest=path.join(connector,file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(path.join(root,file),dest);}
fs.writeFileSync(path.join(connector,'启动连接器.cmd'),'@echo off\r\nchcp 65001 >nul\r\ncd /d "%~dp0"\r\nnode tools\\connector.cjs\r\npause\r\n');
fs.writeFileSync(path.join(connector,'使用说明.txt'),'需要 Node.js 22 或以上。本机连接工具仅供本地工坊使用。在线版不提供本机写入入口。端口 18766；保持 VS Code 元梦 MCP 服务运行。不要公开 .workshop-local 中的任务数据。');
fs.writeFileSync(path.join(site,'.nojekyll'),'');
console.log('Prepared _site and .connector');
