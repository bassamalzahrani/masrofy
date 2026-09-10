const http=require('http'),fs=require('fs'),path=require('path');
const root=__dirname;
const port=Number(process.env.MASROFY_PORT)||8765;
http.createServer((req,res)=>{let p=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]));if(!p.startsWith(root+path.sep)&&p!==root){res.writeHead(403);return res.end();}if(p===root)p=path.join(root,'index.html');fs.readFile(p,(e,b)=>{if(e){res.writeHead(404);return res.end('Not found');}res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json','.svg':'image/svg+xml','.png':'image/png'})[path.extname(p)]||'text/plain');res.end(b);});}).listen(port,'127.0.0.1');
