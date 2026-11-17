const crypto=require('node:crypto');
const allowed=new Set(['https://yangdevin.github.io']);
const tokens=new Map(),nonces=new Map();
function local(req){return /^127\.0\.0\.1:\d+$/.test(req.headers.host||'')&&(!req.headers.origin||req.headers.origin==='http://'+req.headers.host);}
function cors(req,res){const origin=req.headers.origin;if(allowed.has(origin)){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');res.setHeader('Access-Control-Allow-Headers','Content-Type, X-Workshop-Client, X-Workshop-Token');res.setHeader('Access-Control-Allow-Methods','GET, POST, OPTIONS');}return allowed.has(origin);}
function authorize(req){if(!/^127\.0\.0\.1:\d+$/.test(req.headers.host||''))return false;
  if(req.headers['x-workshop-client']!=='1')return false;
  if(local(req))return true;
  const record=tokens.get(req.headers['x-workshop-token']);return !!record&&record.origin===req.headers.origin&&record.expires>Date.now();
}
function pairing(req,res,url){
  if(url.pathname!=='/pair')return false;
  const origin=url.searchParams.get('origin');
  if(!/^127\.0\.0\.1:\d+$/.test(req.headers.host||'')||!allowed.has(origin)){res.writeHead(403);res.end('Origin not allowed');return true;}
  const nonce=crypto.randomBytes(24).toString('hex');nonces.set(nonce,{origin,expires:Date.now()+120000});
  res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Content-Security-Policy':"default-src 'none'; script-src 'nonce-"+nonce+"'; style-src 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'"});
  res.end(`<!doctype html><meta charset="utf-8"><title>连接元梦工坊</title><style>body{font:18px system-ui;max-width:600px;margin:80px auto;padding:24px;background:#f6f3ec}button{padding:14px;border-radius:10px}p{line-height:1.8}</style><h1>连接元梦工坊</h1><p>允许 ${origin} 检测本机 Agent、提交你在网页输入的任务，并在你点击生成后向当前元梦地图添加元件。授权有效期 8 小时，关闭连接器即失效。</p><button id="approve">允许本次连接</button><p id="status"></p><script nonce="${nonce}">document.getElementById('approve').onclick=async()=>{const r=await fetch('/api/pair',{method:'POST',headers:{'Content-Type':'application/json','X-Workshop-Client':'1'},body:JSON.stringify({nonce:'${nonce}'})});const d=await r.json();if(!r.ok){document.getElementById('status').textContent=d.error;return;}if(window.opener){window.opener.postMessage({type:'workshop-paired',token:d.token},${JSON.stringify(origin)});document.getElementById('status').textContent='已连接，请返回网页。';window.close();}else document.getElementById('status').textContent='请从工坊网页的连接按钮重新打开本窗口。';};</script>`);return true;
}
function approve(nonce){const n=nonces.get(nonce);nonces.delete(nonce);if(!n||n.expires<Date.now())throw Error('连接请求已过期，请重新打开连接窗口');const token=crypto.randomBytes(32).toString('hex');tokens.set(token,{origin:n.origin,expires:Date.now()+8*3600000});return {token};}
module.exports={local,cors,authorize,pairing,approve};
