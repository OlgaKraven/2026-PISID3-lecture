import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import process from 'node:process';
import { chromium } from 'playwright';

const npmPath = process.platform === 'win32' ? 'C:\\PROGRA~1\\nodejs\\npm.cmd' : 'npm';

export async function startServer(port) {
  const isWindows = process.platform === 'win32';
  const host = 'localhost';
  const command = isWindows ? (process.env.ComSpec ?? 'cmd.exe') : npmPath;
  const args = isWindows
    ? ['/d', '/s', '/c', `${npmPath} run dev -- --host ${host} --port ${port}`]
    : ['run', 'dev', '--', '--host', host, '--port', String(port)];
  const child = spawn(command, args, {
    cwd: process.cwd(),
    env: { ...process.env, BROWSER: 'none' },
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: false,
    detached: !isWindows,
  });
  child.stdout.on('data', (chunk) => process.stdout.write(chunk));
  child.stderr.on('data', (chunk) => process.stderr.write(chunk));
  let spawnError;
  child.once('error', (error) => { spawnError = error; });
  const url = `http://${host}:${port}`;
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (spawnError) throw spawnError;
    if (child.exitCode !== null || child.signalCode !== null) {
      throw new Error(`Dev server exited before it became ready at ${url}`);
    }
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
  if (!child) return;
  if (process.platform === 'win32' && child.pid) {
    spawnSync('taskkill', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore' });
  } else if (child.pid) {
    try {
      process.kill(-child.pid, 'SIGTERM');
    } catch {
      if (child.exitCode === null) child.kill('SIGTERM');
    }
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
