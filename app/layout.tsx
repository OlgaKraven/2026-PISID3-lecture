import type { Metadata } from 'next';
import { SITE_BASE } from './assets';
import './globals.css';

const title = 'ПиДИС · 3 курс · интерактивные лекции';
const description = 'Интерактивные лекции: требования, данные, проектные решения, UX и разграничение доступа.';
const siteUrl = new URL(`${(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://olgakraven.github.io/2026-PISID3-lecture').replace(/\/+$/, '')}/`);
const socialImage = new URL('og.png', siteUrl).toString();

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title,
  description,
  icons: { icon: `${SITE_BASE}/favicon.png` },
  openGraph: {
    type: 'website',
    locale: 'ru_RU',
    title,
    description,
    images: [{ url: socialImage, width: 1200, height: 630, alt: 'Проектирование информационной системы склада' }],
  },
  twitter: { card: 'summary_large_image', title, description, images: [socialImage] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
