#!/usr/bin/env node
'use strict';

const path = require('path');
const { loadConfig } = require('./config');
const { createServer } = require('./proxy');
const { createLiveReloadServer } = require('./livereload');
const { createWatcher } = require('./watcher');
const { createReloadBridge } = require('./reload-bridge');
const { createLogger, setLevel } = require('./logger');

const log = createLogger('barrel');

async function main() {
  const args = process.argv.slice(2);
  const configPath = args.includes('--config')
    ? args[args.indexOf('--config') + 1]
    : path.resolve(process.cwd(), 'barrel.config.json');

  if (args.includes('--debug')) setLevel('debug');

  let config;
  try {
    config = await loadConfig(configPath);
  } catch (err) {
    log.error(`Failed to load config: ${err.message}`);
    process.exit(1);
  }

  const proxyServer = createServer(config);
  const port = config.port || 3000;
  proxyServer.listen(port, () => log.info(`Proxy listening on port ${port}`));

  if (config.livereload !== false) {
    const lrPort = (config.livereload && config.livereload.port) || 35729;
    const lr = createLiveReloadServer({ port: lrPort });
    const watcher = createWatcher(config.watch || []);
    createReloadBridge(lr, watcher);
    log.info(`Live-reload active on port ${lrPort}`);
  }

  process.on('SIGINT', () => {
    log.info('Shutting down...');
    proxyServer.close();
    process.exit(0);
  });
}

main();
