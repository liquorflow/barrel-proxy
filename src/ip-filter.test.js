const { IpFilter, createIpFilter } = require('./ip-filter');

test('allows all ips when no rules defined', () => {
  const f = createIpFilter();
  expect(f.isAllowed('1.2.3.4')).toBe(true);
  expect(f.isAllowed('10.0.0.1')).toBe(true);
});

test('blocks ip on deny list', () => {
  const f = createIpFilter({ deny: ['1.2.3.4'] });
  expect(f.isAllowed('1.2.3.4')).toBe(false);
  expect(f.isAllowed('1.2.3.5')).toBe(true);
});

test('allows only ips on allow list', () => {
  const f = createIpFilter({ allow: ['10.0.0.1', '10.0.0.2'] });
  expect(f.isAllowed('10.0.0.1')).toBe(true);
  expect(f.isAllowed('10.0.0.2')).toBe(true);
  expect(f.isAllowed('10.0.0.3')).toBe(false);
});

test('deny takes precedence over allow', () => {
  const f = createIpFilter({ allow: ['10.0.0.1'], deny: ['10.0.0.1'] });
  expect(f.isAllowed('10.0.0.1')).toBe(false);
});

test('supports cidr ranges in deny', () => {
  const f = createIpFilter({ deny: ['192.168.1.0/24'] });
  expect(f.isAllowed('192.168.1.55')).toBe(false);
  expect(f.isAllowed('192.168.2.1')).toBe(true);
});

test('supports cidr ranges in allow', () => {
  const f = createIpFilter({ allow: ['10.0.0.0/8'] });
  expect(f.isAllowed('10.5.6.7')).toBe(true);
  expect(f.isAllowed('11.0.0.1')).toBe(false);
});

test('tracks hits and blocks', () => {
  const f = createIpFilter({ deny: ['1.1.1.1'] });
  f.isAllowed('2.2.2.2');
  f.isAllowed('2.2.2.2');
  f.isAllowed('1.1.1.1');
  expect(f.stats()).toEqual({ hits: 2, blocks: 1 });
});

test('emits allowed and blocked events', () => {
  const f = createIpFilter({ deny: ['9.9.9.9'] });
  const allowed = [];
  const blocked = [];
  f.on('allowed', ({ ip }) => allowed.push(ip));
  f.on('blocked', ({ ip }) => blocked.push(ip));
  f.isAllowed('1.2.3.4');
  f.isAllowed('9.9.9.9');
  expect(allowed).toEqual(['1.2.3.4']);
  expect(blocked).toEqual(['9.9.9.9']);
});
