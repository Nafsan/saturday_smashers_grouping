const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve('dist');
http.createServer((req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  if (pathname === '/api/auth/google/login') {
    res.writeHead(200, { 'content-type': 'text/html' });
    return res.end('<title>OAuth endpoint reached</title>');
  }
  const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); return res.end(); }
  const ext = path.extname(file);
  res.setHeader('content-type', ({ '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json' })[ext] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
}).listen(4177, '127.0.0.1');



