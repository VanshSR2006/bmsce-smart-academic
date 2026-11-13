const http = require('http');
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'ok', msg: 'WSL_HELLO' }));
});
server.listen(3001, '0.0.0.0', () => {
  console.log('Test server listening on 3001');
});

