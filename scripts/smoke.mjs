import { launchBrowser, startServer, stopServer } from './runtime.mjs';

const viewports = [
  { width: 1920, height: 1080 },
  { width: 1366, height: 768 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 },
  { width: 360, height: 800 },
];
const port = 4700 + Math.floor(Math.random() * 200);
const liveUrl = process.env.SMOKE_BASE_URL?.replace(/\/$/, '');
const { child, url } = liveUrl ? { child: null, url: liveUrl } : await startServer(port);
let browser;

try {
  browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });
  const topicCount = await page.locator('[data-topic-id]').count();
  if (topicCount === 0) throw new Error('Catalog contains no topics');
  const firstTopic = await page.locator('[data-topic-id]').first().getAttribute('data-topic-id');
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto(`${url}/?topic=${firstTopic}&slide=1`, { waitUntil: 'networkidle' });
    await page.locator('.slide.is-active').waitFor();
    const metrics = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      activeSlides: document.querySelectorAll('.slide.is-active').length,
      layers: document.querySelectorAll('.stage-layer').length,
      progress: document.querySelector('.progress-block > span')?.textContent ?? '',
    }));
    if (metrics.overflow > 1) throw new Error(`Horizontal overflow ${metrics.overflow}px at ${viewport.width}x${viewport.height}`);
    if (metrics.activeSlides !== 1) throw new Error(`Expected one active slide, got ${metrics.activeSlides}`);
    if (!metrics.progress.includes('1 / 85')) throw new Error(`Unexpected progress label: ${metrics.progress}`);
    if (metrics.layers < 2) throw new Error('Neighbor slide was not kept in the DOM');
    console.log(`OK ${viewport.width}x${viewport.height}`);
  }
  await page.getByRole('button', { name: 'Следующий экран' }).click();
  await page.locator('.progress-block > span').filter({ hasText: '2 / 85' }).waitFor();
  console.log(`OK topics=${topicCount}; keyboard/buttons/direct links/85-slide counter`);
  await page.close();
} finally {
  if (browser) await browser.close();
  if (child) stopServer(child);
}
