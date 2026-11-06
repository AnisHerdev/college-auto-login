import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const PORT = 8090;
const filePath = path.resolve('test/httpclient.html');

const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url.startsWith('/httpclient.html')) {
    const content = fs.readFileSync(filePath, 'utf8');
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(content);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  }
});

server.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(` Test Captive Portal Server Running!`);
  console.log(` Open URL: http://localhost:${PORT}/httpclient.html`);
  console.log(` Press Ctrl+C to stop.`);
  console.log(`========================================\n`);
});
