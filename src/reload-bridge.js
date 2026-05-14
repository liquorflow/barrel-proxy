const { createWatcher } = require('./watcher');

/**
 * Bridges file system changes to the LiveReload server.
 * Watches configured service paths and triggers reloads on change.
 *
 * @param {Array} services - List of service config objects with optional `watch` paths.
 * @param {object} liveReloadServer - Server with a `triggerReload(payload)` method.
 * @param {object} [options] - Optional settings.
 * @param {Array} [options.ignored] - Glob patterns to ignore in the watcher.
 * @param {Function} [options.onFileChange] - Callback invoked with the change payload.
 * @returns {{ watchers: Array, stop: Function }}
 */
function createReloadBridge(services, liveReloadServer, options = {}) {
  const watchers = [];

  for (const service of services) {
    if (!service.watch) continue;

    const paths = Array.isArray(service.watch) ? service.watch : [service.watch];
    const watcher = createWatcher(paths, {
      ignored: options.ignored || []
    });

    watcher.on('change', (event) => {
      const payload = {
        service: service.name,
        ...event
      };

      if (options.onFileChange) {
        options.onFileChange(payload);
      }

      liveReloadServer.triggerReload(payload);
    });

    watcher.on('error', (err) => {
      console.error(`[barrel] watcher error for service "${service.name}":`, err.message);
    });

    watchers.push(watcher);
  }

  function stop() {
    for (const w of watchers) {
      w.stop();
    }
  }

  return { watchers, stop };
}

module.exports = { createReloadBridge };
