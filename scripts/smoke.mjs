import { launchBrowser, startServer, stopServer } from './runtime.mjs';

const viewports = [
  { width: 1920, height: 1080 },
  { width: 1366, height: 768 },
  { width: 1280, height: 720 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 },
  { width: 360, height: 800 },
];
const port = 4700 + Math.floor(Math.random() * 200);
async function findExistingPreview() {
  const candidate = 'http://localhost:3000';
  try {
    const response = await fetch(candidate);
    const html = await response.text();
    if (response.ok && html.includes('<title>ПиДИС · 3 курс · интерактивные лекции</title>')) return candidate;
  } catch { /* no matching preview is running */ }
  return '';
}
const liveUrl = process.env.SMOKE_BASE_URL?.replace(/\/$/, '') || await findExistingPreview();
const { child, url } = liveUrl ? { child: null, url: liveUrl } : await startServer(port);
let browser;

try {
  browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });
  const topicCount = await page.locator('[data-topic-id]').count();
  if (topicCount === 0) throw new Error('Catalog contains no topics');
  const firstTopic = await page.locator('[data-topic-id]').first().getAttribute('data-topic-id');
  await page.setViewportSize({ width: 844, height: 390 });
  await page.locator('[aria-label="Данные преподавателя"]').click();
  const teacherDialog = page.locator('.teacher-dialog');
  const finalPdfLink = teacherDialog.locator('.profile-downloads a').last();
  await finalPdfLink.scrollIntoViewIfNeeded();
  const teacherDialogMetrics = await teacherDialog.evaluate((dialog) => {
    const target = dialog.querySelector('.profile-downloads a:last-of-type');
    const dialogBox = dialog.getBoundingClientRect();
    const targetBox = target?.getBoundingClientRect();
    return {
      overflowY: getComputedStyle(dialog).overflowY,
      targetVisible: Boolean(targetBox && targetBox.top >= dialogBox.top - 1 && targetBox.bottom <= dialogBox.bottom + 1),
    };
  });
  if (!['auto', 'scroll'].includes(teacherDialogMetrics.overflowY) || !teacherDialogMetrics.targetVisible) throw new Error('Teacher dialog content is unreachable at 844x390');
  await page.keyboard.press('Escape');
  console.log('OK teacher dialog 844x390');
  await page.goto(`${url}/?topic=${firstTopic}&slide=1`, { waitUntil: 'networkidle' });
  const slideTotal = Number(await page.getByRole('progressbar').getAttribute('aria-valuemax'));
  if (!Number.isInteger(slideTotal) || slideTotal < 1) throw new Error(`Invalid slide total: ${slideTotal}`);
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto(`${url}/?topic=${firstTopic}&slide=1`, { waitUntil: 'networkidle' });
    await page.locator('.slide.is-active').waitFor();
    const metrics = await page.evaluate(() => {
      const content = document.querySelector('.slide.is-active .slide-content');
      const copy = document.querySelector('.slide.is-active .slide-copy');
      return {
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        activeSlides: document.querySelectorAll('.slide.is-active').length,
        layers: document.querySelectorAll('.stage-layer').length,
        progress: document.querySelector('.progress-block > span')?.textContent ?? '',
        contentOverflowX: Math.max(0, (content?.scrollWidth ?? 0) - (content?.clientWidth ?? 0)),
        contentOverflowY: Math.max(0, (content?.scrollHeight ?? 0) - (content?.clientHeight ?? 0)),
        copyOverflowX: Math.max(0, (copy?.scrollWidth ?? 0) - (copy?.clientWidth ?? 0)),
        copyOverflowY: Math.max(0, (copy?.scrollHeight ?? 0) - (copy?.clientHeight ?? 0)),
      };
    });
    if (metrics.overflow > 1) throw new Error(`Horizontal overflow ${metrics.overflow}px at ${viewport.width}x${viewport.height}`);
    if (metrics.activeSlides !== 1) throw new Error(`Expected one active slide, got ${metrics.activeSlides}`);
    if (metrics.progress.trim() !== `1 / ${slideTotal}`) throw new Error(`Unexpected progress label: ${metrics.progress}`);
    if (metrics.layers < 2) throw new Error('Neighbor slide was not kept in the DOM');
    if (metrics.contentOverflowX > 1 || metrics.copyOverflowX > 1) throw new Error(`Slide horizontal overflow content=${metrics.contentOverflowX}px copy=${metrics.copyOverflowX}px at ${viewport.width}x${viewport.height}`);
    if (metrics.contentOverflowY > 1 || metrics.copyOverflowY > 1) throw new Error(`Slide vertical overflow content=${metrics.contentOverflowY}px copy=${metrics.copyOverflowY}px at ${viewport.width}x${viewport.height}`);
    console.log(`OK ${viewport.width}x${viewport.height}`);
  }
  await page.getByRole('button', { name: 'Открыть содержание', exact: true }).click();
  const artifactEntry = page.locator('.toc-list [data-slide-id="practice-artifact"]');
  const artifactSlide = Number((await artifactEntry.locator('span').textContent())?.trim());
  const materialsEntry = page.locator('.toc-list [data-slide-id="materials"]');
  const materialsSlide = Number((await materialsEntry.locator('span').textContent())?.trim());
  if (!Number.isInteger(artifactSlide)) throw new Error('Practice artifact slide was not found in the contents');
  if (!Number.isInteger(materialsSlide)) throw new Error('Materials slide was not found in the contents');
  await artifactEntry.click();
  for (const viewport of viewports.filter(({ width }) => width <= 390)) {
    await page.setViewportSize(viewport);
    await page.goto(`${url}/?topic=${firstTopic}&slide=${artifactSlide}`, { waitUntil: 'networkidle' });
    const codeOverflow = await page.evaluate(() => {
      const code = document.querySelector('.slide.is-active .code-block pre');
      return {
        x: Math.max(0, (code?.scrollWidth ?? 0) - (code?.clientWidth ?? 0)),
        y: Math.max(0, (code?.scrollHeight ?? 0) - (code?.clientHeight ?? 0)),
      };
    });
    if (codeOverflow.x > 1 || codeOverflow.y > 1) throw new Error(`Artifact code overflow x=${codeOverflow.x}px y=${codeOverflow.y}px at ${viewport.width}x${viewport.height}`);
    console.log(`OK artifact code ${viewport.width}x${viewport.height}`);
  }
  for (const viewport of [{ width: 1366, height: 600 }, { width: 900, height: 600 }, ...viewports.filter(({ width }) => width <= 390)]) {
    await page.setViewportSize(viewport);
    await page.goto(`${url}/?topic=${firstTopic}&slide=${materialsSlide}`, { waitUntil: 'networkidle' });
    const materialsMetrics = await page.evaluate(() => {
      const content = document.querySelector('.slide.is-active .slide-content');
      const copy = document.querySelector('.slide.is-active .slide-copy');
      const qr = document.querySelector('.slide.is-active .materials-qr-card');
      const contentBox = content?.getBoundingClientRect();
      const copyBox = copy?.getBoundingClientRect();
      const qrBox = qr?.getBoundingClientRect();
      return {
        present: Boolean(contentBox && copyBox && qrBox),
        contentOverflowX: Math.max(0, (content?.scrollWidth ?? 0) - (content?.clientWidth ?? 0)),
        contentOverflowY: Math.max(0, (content?.scrollHeight ?? 0) - (content?.clientHeight ?? 0)),
        copyOverflowX: Math.max(0, (copy?.scrollWidth ?? 0) - (copy?.clientWidth ?? 0)),
        copyOverflowY: Math.max(0, (copy?.scrollHeight ?? 0) - (copy?.clientHeight ?? 0)),
        qrInsideContent: Boolean(contentBox && qrBox && qrBox.left >= contentBox.left - 1 && qrBox.right <= contentBox.right + 1 && qrBox.top >= contentBox.top - 1 && qrBox.bottom <= contentBox.bottom + 1),
        qrInsideCopy: Boolean(copyBox && qrBox && qrBox.left >= copyBox.left - 1 && qrBox.right <= copyBox.right + 1 && qrBox.top >= copyBox.top - 1 && qrBox.bottom <= copyBox.bottom + 1),
      };
    });
    if (!materialsMetrics.present || !materialsMetrics.qrInsideContent || !materialsMetrics.qrInsideCopy) throw new Error(`Materials QR leaves its page at ${viewport.width}x${viewport.height}`);
    if (materialsMetrics.contentOverflowX > 1 || materialsMetrics.contentOverflowY > 1 || materialsMetrics.copyOverflowX > 1 || materialsMetrics.copyOverflowY > 1) throw new Error(`Materials overflow at ${viewport.width}x${viewport.height}: ${JSON.stringify(materialsMetrics)}`);
    console.log(`OK materials QR ${viewport.width}x${viewport.height}`);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${url}/?topic=${firstTopic}&slide=1`, { waitUntil: 'networkidle' });
  await page.locator('[aria-label="Открыть результаты"]').click();
  const resultDialog = page.locator('.result-dialog');
  const resetButton = resultDialog.getByRole('button', { name: 'Сбросить результаты' });
  await resetButton.scrollIntoViewIfNeeded();
  const resultDialogMetrics = await resultDialog.evaluate((dialog) => {
    const target = Array.from(dialog.querySelectorAll('button')).find((button) => button.textContent?.includes('Сбросить результаты'));
    const dialogBox = dialog.getBoundingClientRect();
    const targetBox = target?.getBoundingClientRect();
    return {
      overflowY: getComputedStyle(dialog).overflowY,
      targetVisible: Boolean(targetBox && targetBox.top >= dialogBox.top - 1 && targetBox.bottom <= dialogBox.bottom + 1),
    };
  });
  if (!['auto', 'scroll'].includes(resultDialogMetrics.overflowY) || !resultDialogMetrics.targetVisible) throw new Error('Result dialog content is unreachable at 390x844');
  await page.keyboard.press('Escape');
  console.log('OK result dialog 390x844');
  await page.goto(`${url}/?topic=${firstTopic}&slide=1`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Следующий экран' }).click();
  await page.locator('.progress-block > span').filter({ hasText: `2 / ${slideTotal}` }).waitFor();
  console.log(`OK topics=${topicCount}; buttons/direct links/${slideTotal}-slide counter`);
  await page.close();
} finally {
  if (browser) await browser.close();
  if (child) stopServer(child);
}
