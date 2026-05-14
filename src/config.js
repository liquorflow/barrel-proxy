import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const DEFAULT_CONFIG = {
  port: 3000,
  host: 'localhost',
  services: [],
};

const CONFIG_FILES = [
  'barrel.config.json',
  'barrel.config.js',
  '.barrelrc',
];

export function loadConfig(configPath = null) {
  if (configPath) {
    const fullPath = resolve(process.cwd(), configPath);
    if (!existsSync(fullPath)) {
      throw new Error(`Config file not found: ${fullPath}`);
    }
    return parseConfig(fullPath);
  }

  for (const file of CONFIG_FILES) {
    const fullPath = resolve(process.cwd(), file);
    if (existsSync(fullPath)) {
      return parseConfig(fullPath);
    }
  }

  return { ...DEFAULT_CONFIG };
}

function parseConfig(filePath) {
  try {
    const raw = readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw);
    return mergeWithDefaults(parsed);
  } catch (err) {
    throw new Error(`Failed to parse config at ${filePath}: ${err.message}`);
  }
}

function mergeWithDefaults(userConfig) {
  return {
    ...DEFAULT_CONFIG,
    ...userConfig,
    services: validateServices(userConfig.services || []),
  };
}

function validateServices(services) {
  return services.map((svc, i) => {
    if (!svc.prefix && !svc.host) {
      throw new Error(`Service at index ${i} must have a 'prefix' or 'host'`);
    }
    if (!svc.target) {
      throw new Error(`Service at index ${i} is missing required 'target'`);
    }
    return {
      prefix: svc.prefix || '/',
      target: svc.target,
      label: svc.label || svc.prefix || svc.target,
      ws: svc.ws !== false,
    };
  });
}
