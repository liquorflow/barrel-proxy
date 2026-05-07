// Simple token-based auth guard for barrel-proxy admin routes
const { EventEmitter } = require('events');

class AuthGuard extends EventEmitter {
  constructor(options = {}) {
    super();
    this.tokens = new Set(options.tokens || []);
    this.realm = options.realm || 'barrel-proxy';
    this.enabled = options.enabled !== false && this.tokens.size > 0;
  }

  addToken(token) {
    this.tokens.add(token);
    this.enabled = true;
  }

  removeToken(token) {
    this.tokens.delete(token);
    if (this.tokens.size === 0) this.enabled = false;
  }

  check(token) {
    if (!this.enabled) return true;
    return typeof token === 'string' && this.tokens.has(token);
  }

  extractToken(req) {
    const auth = req.headers['authorization'] || '';
    if (auth.startsWith('Bearer ')) return auth.slice(7).trim();
    const query = (req.url || '').split('?')[1] || '';
    const params = new URLSearchParams(query);
    return params.get('token') || null;
  }

  /**
   * Express/Node-style middleware that rejects requests without a valid token.
   * Responds with 401 and a WWW-Authenticate header when auth fails.
   */
  middleware() {
    return (req, res, next) => {
      const token = this.extractToken(req);
      if (this.check(token)) return next();
      res.setHeader('WWW-Authenticate', `Bearer realm="${this.realm}"`);
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      this.emit('unauthorized', req);
    };
  }
}

function createAuthGuard(options = {}) {
  return new AuthGuard(options);
}

module.exports = { AuthGuard, createAuthGuard };
