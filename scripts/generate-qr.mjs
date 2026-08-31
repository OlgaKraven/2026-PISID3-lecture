import { mkdir, writeFile } from 'node:fs/promises';
import QRCode from 'qrcode';

const isFourthCourse = process.cwd().includes('PISID4');
const id = isFourthCourse ? 'pisid4' : 'pisid3';
const url = isFourthCourse
  ? 'https://disk.yandex.ru/d/_FjzURiCSzxkLw'
  : 'https://disk.yandex.ru/d/DZrrswBj5gcUuw';

await mkdir('public/qr', { recursive: true });
const svg = await QRCode.toString(url, {
  type: 'svg',
  errorCorrectionLevel: 'H',
  width: 1024,
  margin: 2,
  color: { dark: '#1C1C1C', light: '#FFFFFF' },
});
await writeFile(`public/qr/${id}-materials.svg`, svg, 'utf8');
console.log(`QR generated: public/qr/${id}-materials.svg -> ${url}`);
