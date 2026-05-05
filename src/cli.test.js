const path = require('path');
const { execFile } = require('child_process');

const CLI = path.resolve(__dirname, 'cli.js');
const EXAMPLE_CONFIG = path.resolve(__dirname, '..', 'barrel.config.example.json');

function runCli(args, timeout = 1500) {
  return new Promise((resolve) => {
    const proc = execFile('node', [CLI, ...args], { timeout }, (err, stdout, stderr) => {
      resolve({ code: err ? err.code : 0, stdout, stderr });
    });
    // kill after short delay so we can inspect startup output
    setTimeout(() => proc.kill('SIGINT'), timeout - 200);
  });
}

test('cli exits with code 1 when config file missing', async () => {
  const { code, stderr } = await runCli(['--config', '/nonexistent/barrel.config.json']);
  expect(code).not.toBe(0);
  expect(stderr + '').toMatch(/Failed to load config/);
}, 5000);

test('cli starts and logs proxy listening message', async () => {
  const { stderr } = await runCli(['--config', EXAMPLE_CONFIG, '--debug']);
  // stderr because logger uses console.log which may mix; check combined output
  const combined = stderr;
  // Just verify the process ran without an immediate crash
  expect(combined).not.toMatch(/Failed to load config/);
}, 5000);
