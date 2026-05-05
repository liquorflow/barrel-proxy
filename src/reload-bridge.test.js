const { EventEmitter } = require('events');
const { createReloadBridge } = require('./reload-bridge');

function makeMockLiveReload() {
  const mock = new EventEmitter();
  mock.reloads = [];
  mock.triggerReload = (payload) => mock.reloads.push(payload);
  return mock;
}

function makeMockWatcher() {
  const w = new EventEmitter();
  w.stopped = false;
  w.stop = () => { w.stopped = true; };
  return w;
}

jest.mock('./watcher', () => {
  const { EventEmitter } = require('events');
  const watchers = [];
  const createWatcher = jest.fn(() => {
    const w = new EventEmitter();
    w.stopped = false;
    w.stop = () => { w.stopped = true; };
    watchers.push(w);
    return w;
  });
  createWatcher._watchers = watchers;
  return { createWatcher };
});

const { createWatcher } = require('./watcher');

beforeEach(() => {
  createWatcher.mockClear();
  createWatcher._watchers.length = 0;
});

test('creates a watcher for each service with a watch path', () => {
  const services = [
    { name: 'api', watch: './api/src' },
    { name: 'web', watch: ['./web/src', './web/public'] },
    { name: 'db', port: 5432 }
  ];
  const lr = makeMockLiveReload();
  createReloadBridge(services, lr);
  expect(createWatcher).toHaveBeenCalledTimes(2);
});

test('triggers reload on file change event', () => {
  const services = [{ name: 'api', watch: './api/src' }];
  const lr = makeMockLiveReload();
  createReloadBridge(services, lr);

  const w = createWatcher._watchers[0];
  w.emit('change', { type: 'change', path: '/api/src/index.js' });

  expect(lr.reloads).toHaveLength(1);
  expect(lr.reloads[0]).toMatchObject({ service: 'api', type: 'change' });
});

test('stop() closes all watchers', () => {
  const services = [
    { name: 'api', watch: './api' },
    { name: 'web', watch: './web' }
  ];
  const lr = makeMockLiveReload();
  const bridge = createReloadBridge(services, lr);
  bridge.stop();

  for (const w of createWatcher._watchers) {
    expect(w.stopped).toBe(true);
  }
});

test('calls onFileChange callback when provided', () => {
  const services = [{ name: 'api', watch: './api' }];
  const lr = makeMockLiveReload();
  const onFileChange = jest.fn();
  createReloadBridge(services, lr, { onFileChange });

  createWatcher._watchers[0].emit('change', { type: 'add', path: '/api/new.js' });
  expect(onFileChange).toHaveBeenCalledWith(expect.objectContaining({ service: 'api', type: 'add' }));
});
