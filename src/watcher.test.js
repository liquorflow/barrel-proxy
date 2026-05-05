const fs = require('fs');
const path = require('path');
const os = require('os');
const { FileWatcher, createWatcher } = require('./watcher');

let tmpDir;
let watcher;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'barrel-watcher-'));
});

afterEach((done) => {
  if (watcher) watcher.stop();
  fs.rmSync(tmpDir, { recursive: true, force: true });
  done();
});

test('FileWatcher emits change event when file is modified', (done) => {
  const testFile = path.join(tmpDir, 'test.txt');
  fs.writeFileSync(testFile, 'initial');

  watcher = createWatcher(tmpDir);
  watcher.on('change', (event) => {
    expect(event.type).toBe('change');
    expect(event.path).toBe(testFile);
    done();
  });

  setTimeout(() => {
    fs.writeFileSync(testFile, 'updated');
  }, 200);
}, 5000);

test('FileWatcher emits change event when file is added', (done) => {
  watcher = createWatcher(tmpDir);
  watcher.on('change', (event) => {
    expect(event.type).toBe('add');
    expect(event.path).toContain('newfile.txt');
    done();
  });

  setTimeout(() => {
    fs.writeFileSync(path.join(tmpDir, 'newfile.txt'), 'hello');
  }, 200);
}, 5000);

test('FileWatcher stop closes the watcher', () => {
  watcher = createWatcher(tmpDir);
  expect(watcher.watcher).not.toBeNull();
  watcher.stop();
  expect(watcher.watcher).toBeNull();
});

test('createWatcher returns a started FileWatcher instance', () => {
  watcher = createWatcher(tmpDir);
  expect(watcher).toBeInstanceOf(FileWatcher);
  expect(watcher.watcher).not.toBeNull();
});
