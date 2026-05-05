import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, unlinkSync, existsSync } from 'fs';
import { resolve } from 'path';
import { loadConfig } from './config.js';

const TMP_CONFIG = resolve(process.cwd(), 'barrel.config.json');

function writeConfig(obj) {
  writeFileSync(TMP_CONFIG, JSON.stringify(obj), 'utf-8');
}

function cleanConfig() {
  if (existsSync(TMP_CONFIG)) unlinkSync(TMP_CONFIG);
}

describe('loadConfig', () => {
  afterEach(cleanConfig);

  it('returns defaults when no config file exists', () => {
    cleanConfig();
    const config = loadConfig();
    expect(config.port).toBe(3000);
    expect(config.host).toBe('localhost');
    expect(config.services).toEqual([]);
  });

  it('merges user config with defaults', () => {
    writeConfig({ port: 8080, services: [] });
    const config = loadConfig();
    expect(config.port).toBe(8080);
    expect(config.host).toBe('localhost');
  });

  it('validates and normalizes services', () => {
    writeConfig({
      services: [{ prefix: '/api', target: 'http://localhost:4000' }],
    });
    const config = loadConfig();
    expect(config.services[0].label).toBe('/api');
    expect(config.services[0].ws).toBe(true);
  });

  it('throws when service is missing target', () => {
    writeConfig({ services: [{ prefix: '/api' }] });
    expect(() => loadConfig()).toThrow("missing required 'target'");
  });

  it('throws when service has neither prefix nor host', () => {
    writeConfig({ services: [{ target: 'http://localhost:4000' }] });
    expect(() => loadConfig()).toThrow("must have a 'prefix' or 'host'");
  });
});
