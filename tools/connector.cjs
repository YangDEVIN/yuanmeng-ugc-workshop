const http=require('node:http'),bridge=require('./workshop-bridge.cjs');
http.createServer(async(req,res)=>{try{if(!await bridge.handle(req,res)){res.writeHead(404);res.end('Workshop connector');}}catch{res.writeHead(500);res.end('Connector error');}}).listen(18766,'127.0.0.1',()=>console.log('元梦工坊连接器已启动，请保持此窗口打开，并在在线网页点击连接本机。'));
