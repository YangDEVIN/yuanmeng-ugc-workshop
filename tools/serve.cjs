const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const bridge = require('./workshop-bridge.cjs');
const root = path.resolve(__dirname, '..');
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.css':'text/css; charset=utf-8'};
http.createServer(async (request, response) => {
  if(await bridge.handle(request,response))return;
  if (!['GET','HEAD'].includes(request.method)) { response.writeHead(405); response.end(); return; }
  let filename;
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    filename = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    const relative = path.relative(root, filename);
    if (relative.startsWith('..') || path.isAbsolute(relative) || relative.split(path.sep).some(p=>p.startsWith('.')) || relative.startsWith('tools' + path.sep)) throw Error('Invalid path');
  } catch { response.writeHead(400); response.end('Invalid path'); return; }
  fs.stat(filename, (error, stat) => {
    if (error || !stat.isFile()) { response.writeHead(404); response.end('Not found'); return; }
    response.writeHead(200, {'Content-Type':types[path.extname(filename)] || 'application/octet-stream','Content-Length':stat.size,'Cache-Control':'no-store'});
    if (request.method === 'HEAD') { response.end(); return; }
    const stream = fs.createReadStream(filename);
    stream.on('error', () => response.destroy());
    stream.pipe(response);
  });
}).listen(Number(process.env.WORKSHOP_PORT||18765), '127.0.0.1', function(){console.log('Workshop available at http://127.0.0.1:'+this.address().port+'/');});
