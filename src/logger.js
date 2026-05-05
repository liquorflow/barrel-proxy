const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };

let currentLevel = LEVELS.info;
let output = console;

function setLevel(level) {
  if (LEVELS[level] === undefined) throw new Error(`Unknown log level: ${level}`);
  currentLevel = LEVELS[level];
}

function setOutput(out) {
  output = out;
}

function timestamp() {
  return new Date().toISOString();
}

function formatMessage(level, context, message) {
  const ctx = context ? `[${context}] ` : '';
  return `${timestamp()} ${level.toUpperCase().padEnd(5)} ${ctx}${message}`;
}

function log(level, context, message) {
  if (LEVELS[level] < currentLevel) return;
  const formatted = formatMessage(level, context, message);
  if (level === 'error') {
    output.error(formatted);
  } else if (level === 'warn') {
    output.warn(formatted);
  } else {
    output.log(formatted);
  }
}

function createLogger(context) {
  return {
    debug: (msg) => log('debug', context, msg),
    info:  (msg) => log('info',  context, msg),
    warn:  (msg) => log('warn',  context, msg),
    error: (msg) => log('error', context, msg),
  };
}

module.exports = { createLogger, setLevel, setOutput, LEVELS };
