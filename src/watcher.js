const chokidar = require('chokidar');
const path = require('path');
const { EventEmitter } = require('events');

const DEFAULT_IGNORED = [
  /(^|[\/\\])\../,
  /node_modules/,
  /\.git/
];

const DEFAULT_OPTIONS = {
  persistent: true,
  ignoreInitial: true,
  awaitWriteFinish: {
    stabilityThreshold: 100,
    pollInterval: 50
  }
};

class FileWatcher extends EventEmitter {
  constructor(paths, options = {}) {
    super();
    this.paths = Array.isArray(paths) ? paths : [paths];
    this.options = options;
    this.watcher = null;
  }

  start() {
    if (this.watcher) {
      return this;
    }

    const ignored = [...DEFAULT_IGNORED, ...(this.options.ignored || [])];
    this.watcher = chokidar.watch(this.paths, {
      ...DEFAULT_OPTIONS,
      ...this.options,
      ignored
    });

    this.watcher
      .on('change', (filePath) => {
        this.emit('change', { type: 'change', path: path.resolve(filePath) });
      })
      .on('add', (filePath) => {
        this.emit('change', { type: 'add', path: path.resolve(filePath) });
      })
      .on('unlink', (filePath) => {
        this.emit('change', { type: 'unlink', path: path.resolve(filePath) });
      })
      .on('error', (err) => {
        this.emit('error', err);
      });

    return this;
  }

  stop() {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
  }

  isRunning() {
    return this.watcher !== null;
  }
}

function createWatcher(paths, options = {}) {
  const watcher = new FileWatcher(paths, options);
  return watcher.start();
}

module.exports = { FileWatcher, createWatcher };
