const { AuthGuard, createAuthGuard } = require('./auth');

describe('AuthGuard', () => {
  test('disabled when no tokens provided', () => {
    const guard = createAuthGuard();
    expect(guard.enabled).toBe(false);
  });

  test('enabled when tokens provided', () => {
    const guard = createAuthGuard({ tokens: ['abc123'] });
    expect(guard.enabled).toBe(true);
  });

  test('check returns true when disabled', () => {
    const guard = createAuthGuard();
    expect(guard.check(null)).toBe(true);
    expect(guard.check('anything')).toBe(true);
  });

  test('check validates token when enabled', () => {
    const guard = createAuthGuard({ tokens: ['secret'] });
    expect(guard.check('secret')).toBe(true);
    expect(guard.check('wrong')).toBe(false);
    expect(guard.check(null)).toBe(false);
  });

  test('addToken enables guard', () => {
    const guard = createAuthGuard();
    guard.addToken('newtoken');
    expect(guard.enabled).toBe(true);
    expect(guard.check('newtoken')).toBe(true);
  });

  test('removeToken disables guard when empty', () => {
    const guard = createAuthGuard({ tokens: ['only'] });
    guard.removeToken('only');
    expect(guard.enabled).toBe(false);
  });

  test('extractToken from Authorization header', () => {
    const guard = createAuthGuard();
    const req = { headers: { authorization: 'Bearer mytoken' }, url: '/' };
    expect(guard.extractToken(req)).toBe('mytoken');
  });

  test('extractToken from query string', () => {
    const guard = createAuthGuard();
    const req = { headers: {}, url: '/admin?token=querytoken' };
    expect(guard.extractToken(req)).toBe('querytoken');
  });

  test('extractToken returns null when missing', () => {
    const guard = createAuthGuard();
    const req = { headers: {}, url: '/' };
    expect(guard.extractToken(req)).toBeNull();
  });
});
