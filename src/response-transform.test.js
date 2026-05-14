const { ResponseTransformer, createResponseTransformer } = require('./response-transform');

describe('ResponseTransformer', () => {
  it('adds and removes headers', () => {
    const t = createResponseTransformer({
      addHeaders: { 'x-powered-by': 'barrel' },
      removeHeaders: ['server'],
    });
    const result = t.transformHeaders({ server: 'nginx', 'content-type': 'text/html' });
    expect(result['x-powered-by']).toBe('barrel');
    expect(result['server']).toBeUndefined();
    expect(result['content-type']).toBe('text/html');
  });

  it('emits headers-transformed event', () => {
    const t = createResponseTransformer({ addHeaders: { 'x-foo': 'bar' }, removeHeaders: ['x-old'] });
    const events = [];
    t.on('headers-transformed', e => events.push(e));
    t.transformHeaders({ 'x-old': 'yes' });
    expect(events).toHaveLength(1);
    expect(events[0].added).toContain('x-foo');
    expect(events[0].removed).toContain('x-old');
  });

  it('rewrites body text', () => {
    const t = createResponseTransformer({ rewriteBody: { search: 'localhost:3000', replace: 'example.com' } });
    const input = Buffer.from('go to http://localhost:3000/api');
    const result = t.transformBody(input, 'text/html');
    expect(result.toString()).toBe('go to http://example.com/api');
  });

  it('skips body transform for non-text content types', () => {
    const t = createResponseTransformer({ rewriteBody: { search: 'foo', replace: 'bar' } });
    const input = Buffer.from('foo');
    const result = t.transformBody(input, 'image/png');
    expect(result.toString()).toBe('foo');
  });

  it('emits body-transformed event', () => {
    const t = createResponseTransformer({ rewriteBody: { search: 'a', replace: 'b' } });
    const events = [];
    t.on('body-transformed', e => events.push(e));
    t.transformBody(Buffer.from('abc'), 'text/plain');
    expect(events).toHaveLength(1);
  });

  it('returns status object', () => {
    const t = createResponseTransformer({ addHeaders: { 'x-a': '1' }, removeHeaders: ['x-b'] });
    const s = t.getStatus();
    expect(s.enabled).toBe(true);
    expect(s.addHeaders['x-a']).toBe('1');
    expect(s.removeHeaders).toContain('x-b');
  });

  it('does nothing when disabled', () => {
    const t = createResponseTransformer({ enabled: false, addHeaders: { 'x-foo': 'bar' } });
    const result = t.transformHeaders({ 'content-type': 'text/html' });
    expect(result['x-foo']).toBeUndefined();
  });
});
