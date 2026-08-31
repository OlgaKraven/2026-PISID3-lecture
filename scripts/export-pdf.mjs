import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { launchBrowser, startServer, stopServer } from './runtime.mjs';

const port = 4400 + Math.floor(Math.random() * 300);
const requestedIndex = process.argv.indexOf('--topic');
const requestedTopic = requestedIndex >= 0 ? process.argv[requestedIndex + 1] : null;
const liveUrl = process.env.PDF_BASE_URL?.replace(/\/$/, '');
const { child, url } = liveUrl ? { child: null, url: liveUrl } : await startServer(port);
let browser;

try {
  browser = await launchBrowser();
  const catalog = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await catalog.goto(url, { waitUntil: 'networkidle' });
  const topics = await catalog.locator('[data-topic-id]').evaluateAll((cards) => cards.map((card) => ({
    id: card.getAttribute('data-topic-id'),
    title: card.querySelector('h2')?.textContent?.trim() ?? 'topic',
  })));
  await catalog.close();

  const selected = requestedTopic ? topics.filter((topic) => topic.id === requestedTopic) : topics;
  if (selected.length === 0) throw new Error(`Topic not found: ${requestedTopic}`);
  await mkdir(path.join(process.cwd(), 'outputs', 'pdf', 'student'), { recursive: true });
  await mkdir(path.join(process.cwd(), 'outputs', 'pdf', 'teacher'), { recursive: true });

  for (const [topicIndex, topic] of selected.entries()) {
    for (const mode of ['student', 'teacher']) {
      const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
      await page.goto(`${url}/print?topic=${encodeURIComponent(topic.id)}&mode=${mode}`, { waitUntil: 'networkidle', timeout: 120_000 });
      await page.waitForFunction(() => window.__DECK_READY__ === true, null, { timeout: 120_000 });
      const fileName = `${String(topicIndex + 1).padStart(2, '0')}-${topic.id}.pdf`;
      const outputPath = path.join(process.cwd(), 'outputs', 'pdf', mode, fileName);
      await page.pdf({ path: outputPath, printBackground: true, preferCSSPageSize: true, tagged: true, outline: true });
      await page.close();
      console.log(`[${topicIndex + 1}/${selected.length}] ${mode}: ${outputPath}`);
    }
  }
} finally {
  if (browser) await browser.close();
  if (child) stopServer(child);
}
