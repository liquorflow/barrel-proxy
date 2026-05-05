const http = require('http');
const EventEmitter = require('events');

const DEFAULT_PORT = 35729;
const SSE_HEADERS = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  'Connection': 'keep-alive',
  'Access-Control-Allow-Origin': '*',
};

class LiveReloadServer extends EventEmitter {
  constructor(port = DEFAULT_PORT) {
    super();
    this.port = port;
    this.clients = new Set();
    this.server = null;
  }

  start() {
    this.server = http.createServer((req, res) => {
      if (req.url === '/livereload') {
        this._handleSSE(req, res);
      } else if (req.url === '/livereload.js') {
        this._serveScript(res);
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    return new Promise((resolve, reject) => {
      this.server.listen(this.port, () => {
        this.emit('started', this.port);
        resolve(this.port);
      });
      this.server.on('error', reject);
    });
  }

  _handleSSE(req, res) {
    res.writeHead(200, SSE_HEADERS);
    res.write('data: connected\n\n');
    this.clients.add(res);
    req.on('close', () => {
      this.clients.delete(res);
    });
  }

  _serveScript(res) {
    const script = `(function(){
  var src = 'http://localhost:${this.port}/livereload';
  var es = new EventSource(src);
  es.onmessage = function(e) { if (e.data === 'reload') window.location.reload(); };
})();`;
    res.writeHead(200, { 'Content-Type': 'application/javascript' });
    res.end(script);
  }

  reload() {
    this.clients.forEach((client) => {
      client.write('data: reload\n\n');
    });
    this.emit('reload', this.clients.size);
  }

  stop() {
    return new Promise((resolve) => {
      this.clients.forEach((client) => client.end());
      this.clients.clear();
      if (this.server) {
        this.server.close(resolve);
      } else {
        resolve();
      }
    });
  }
}

function createLiveReloadServer(port) {
  return new LiveReloadServer(port);
}

module.exports = { createLiveReloadServer, LiveReloadServer, DEFAULT_PORT };
