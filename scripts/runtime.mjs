import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import process from 'node:process';
import { chromium } from 'playwright';

const npmPath = process.platform === 'win32' ? 'C:\\PROGRA~1\\nodejs\\npm.cmd' : 'npm';

export async function startServer(port) {
  const command = `${npmPath} run dev -- --host 127.0.0.1 --port ${port}`;
  const child = spawn(process.env.ComSpec ?? 'cmd.exe', ['/d', '/s', '/c', command], {
    cwd: process.cwd(),
    env: { ...process.env, BROWSER: 'none' },
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: false,
  });
  child.stdout.on('data', (chunk) => process.stdout.write(chunk));
  child.stderr.on('data', (chunk) => process.stderr.write(chunk));
  const url = `http://127.0.0.1:${port}`;
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return { child, url };
    } catch { /* server is still starting */ }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  stopServer(child);
  throw new Error(`Dev server did not become ready at ${url}`);
}

export function stopServer(child) {
  if (!child || child.exitCode !== null) return;
  if (process.platform === 'win32' && child.pid) {
    spawnSync('taskkill', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore' });
  } else {
    child.kill('SIGTERM');
  }
}

export async function launchBrowser() {
  const edgePaths = [
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ];
  const executablePath = edgePaths.find(existsSync);
  if (executablePath) return chromium.launch({ headless: true, executablePath });
  return chromium.launch({ headless: true });
}
