// Receives PNG data URLs from the game page and writes them to this folder (dev-only screenshot helper).
const http = require('http');
const fs = require('fs');
const path = require('path');
http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
  if (req.method === 'OPTIONS') return res.end();
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    try {
      const { name, data } = JSON.parse(body);
      const file = path.join(process.argv[2] || __dirname, path.basename(name) + '.png');
      fs.writeFileSync(file, Buffer.from(data.split(',')[1], 'base64'));
      res.end('ok ' + file);
    } catch (e) { res.statusCode = 400; res.end(String(e)); }
  });
}).listen(5199, '127.0.0.1', () => console.log('shot server on 5199'));
