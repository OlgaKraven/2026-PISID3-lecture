import { cp, rm } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const basePath = process.env.NEXT_PUBLIC_BASE_PATH?.replace(/^\/+|\/+$/g, '');
if (!basePath) throw new Error('NEXT_PUBLIC_BASE_PATH is required for the Pages build');

const clientDir = path.join(process.cwd(), 'dist', 'client');
const source = path.join(clientDir, basePath, '_next');
const target = path.join(clientDir, '_next');
const publicFonts = path.join(clientDir, 'fonts');
const staticFonts = path.join(target, 'static', 'fonts');

await rm(target, { recursive: true, force: true });
await cp(source, target, { recursive: true });
await cp(publicFonts, staticFonts, { recursive: true });
console.log(`GitHub Pages assets prepared: ${target}`);
