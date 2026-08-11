const { spawn } = require('node:child_process');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const services = [
  ['mock-api', 'node', ['server.js'], 'mock-api'],
  ['ai-gateway', 'node', ['ai-server.js'], 'mock-api'],
  ['platform-api', 'node', ['server.js'], 'platform-api'],
  ['docs-mcp', 'node', ['mcp-server.js'], 'local-mcp-server'],
  ['portal-shell', 'npm', ['run', 'start'], 'portal-shell'],
  ['operations-workbench', 'npm', ['run', 'start'], 'operations-workbench'],
  ['error-center', 'npm', ['run', 'start'], 'error-center'],
  ['ai-workspace', 'npm', ['run', 'dev'], 'ai-workspace'],
  ['product-analytics-admin', 'npm', ['run', 'start'], 'product-analytics-admin'],
  ['wujie-shell', 'npm', ['run', 'dev'], 'wujie/wujie-shell'],
  ['todo-app', 'npm', ['run', 'dev'], 'wujie/todo-app'],
  ['counter-app', 'npm', ['run', 'dev'], 'wujie/counter-app'],
  ['user-directory-app', 'npm', ['run', 'dev'], 'wujie/user-directory-app'],
];

const children = services.map(([name, command, args, cwd]) => {
  const child = spawn(command, args, {
    cwd: path.join(root, cwd),
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      FORCE_COLOR: '1',
      NODE_PATH: [
        path.join(root, 'operations-workbench', 'node_modules'),
        path.join(root, 'microfrontend-state', 'node_modules'),
      ].join(path.delimiter),
    },
  });
  child.stdout.on('data', (data) => process.stdout.write(`[${name}] ${data}`));
  child.stderr.on('data', (data) => process.stderr.write(`[${name}] ${data}`));
  child.on('exit', (code, signal) => console.log(`[${name}] stopped (${signal || code})`));
  return child;
});

function stopAll(signal) {
  for (const child of children) if (!child.killed) child.kill(signal);
}

process.on('SIGINT', () => stopAll('SIGINT'));
process.on('SIGTERM', () => stopAll('SIGTERM'));
