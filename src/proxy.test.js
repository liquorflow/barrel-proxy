const { matchService } = require('./proxy');

const services = [
  { name: 'api', host: 'api.local', target: 'localhost:4001' },
  { name: 'app', path: '/app', target: 'localhost:4002' },
  { name: 'static', path: '/static', target: 'localhost:4003' },
];

describe('matchService', () => {
  it('matches by host header', () => {
    const req = { headers: { host: 'api.local' }, url: '/' };
    const result = matchService(services, req);
    expect(result.name).toBe('api');
  });

  it('matches host with port in header', () => {
    const req = { headers: { host: 'api.local:3000' }, url: '/' };
    const result = matchService(services, req);
    expect(result.name).toBe('api');
  });

  it('matches by path prefix', () => {
    const req = { headers: { host: 'localhost' }, url: '/app/dashboard' };
    const result = matchService(services, req);
    expect(result.name).toBe('app');
  });

  it('matches static path', () => {
    const req = { headers: { host: 'localhost' }, url: '/static/main.css' };
    const result = matchService(services, req);
    expect(result.name).toBe('static');
  });

  it('returns null when no service matches', () => {
    const req = { headers: { host: 'unknown.local' }, url: '/nowhere' };
    const result = matchService(services, req);
    expect(result).toBeNull();
  });

  it('prefers host match over path match', () => {
    const mixed = [
      { name: 'bypath', path: '/app', target: 'localhost:4002' },
      { name: 'byhost', host: 'api.local', target: 'localhost:4001' },
    ];
    const req = { headers: { host: 'api.local' }, url: '/app/test' };
    const result = matchService(mixed, req);
    expect(result.name).toBe('byhost');
  });
});
