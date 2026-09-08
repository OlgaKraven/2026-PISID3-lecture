import type { Metadata } from 'next';
import { SITE_BASE } from './assets';
import './globals.css';

export const metadata: Metadata = {
  title: 'ПиДИС · 3 курс · интерактивные лекции',
  description: 'Интерактивные лекции: требования, данные, проектные решения, UX и разграничение доступа.',
  icons: { icon: `${SITE_BASE}/favicon.png` },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
