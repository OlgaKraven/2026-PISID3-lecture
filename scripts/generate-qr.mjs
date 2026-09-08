import { mkdir, writeFile } from 'node:fs/promises';
import QRCode from 'qrcode';

const isFourthCourse = process.cwd().includes('PISID4');
const id = isFourthCourse ? 'pisid4' : 'pisid3';
const url = isFourthCourse
  ? 'https://disk.yandex.ru/d/_FjzURiCSzxkLw'
  : 'https://disk.yandex.ru/d/DZrrswBj5gcUuw';

const sources = [
  [`${id}-materials`, url],
  ['main-literature-1', 'https://www.iprbookshop.ru/144813.html'],
  ['main-literature-2', 'https://www.iprbookshop.ru/144814.html'],
  ['additional-literature-1', 'https://www.iprbookshop.ru/152882.html'],
  ['additional-literature-2', 'https://www.iprbookshop.ru/123442.html'],
  ['additional-literature-3', 'https://www.iprbookshop.ru/152769.html'],
];

await mkdir('public/qr', { recursive: true });
for (const [name, sourceUrl] of sources) {
  const svg = await QRCode.toString(sourceUrl, {
    type: 'svg', errorCorrectionLevel: 'H', width: 1024, margin: 4,
    color: { dark: '#1C1C1C', light: '#FFFFFF' },
  });
  await writeFile(`public/qr/${name}.svg`, svg, 'utf8');
  console.log(`QR generated: public/qr/${name}.svg -> ${sourceUrl}`);
}
