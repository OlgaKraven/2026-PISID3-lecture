import { readFile } from 'node:fs/promises';
import path from 'node:path';
import jsQR from 'jsqr';
import { PNG } from 'pngjs';
import { launchBrowser } from './runtime.mjs';

const sources = new Map([
  ['pisid3-materials.svg', 'https://disk.yandex.ru/d/DZrrswBj5gcUuw'],
  ['main-literature-1.svg', 'https://www.iprbookshop.ru/144813.html'],
  ['main-literature-2.svg', 'https://www.iprbookshop.ru/144814.html'],
  ['additional-literature-1.svg', 'https://www.iprbookshop.ru/152882.html'],
  ['additional-literature-2.svg', 'https://www.iprbookshop.ru/123442.html'],
]);

const browser = await launchBrowser();
try {
  const page = await browser.newPage({ viewport: { width: 1100, height: 1100 } });
  for (const [fileName, expected] of sources) {
    const svg = await readFile(path.join(process.cwd(), 'public', 'qr', fileName), 'utf8');
    const source = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
    await page.setContent(`<img id="qr" width="1024" height="1024" src="${source}" alt="">`);
    await page.locator('#qr').evaluate((image) => image.decode());
    const screenshot = await page.locator('#qr').screenshot();
    const png = PNG.sync.read(screenshot);
    const decoded = jsQR(new Uint8ClampedArray(png.data), png.width, png.height)?.data ?? '';
    if (decoded !== expected) throw new Error(`${fileName}: ожидался ${expected}, декодирован ${decoded || 'пустой результат'}`);
    console.log(`QR verified: ${fileName} -> ${decoded}`);
  }
  await page.close();
} finally {
  await browser.close();
}
