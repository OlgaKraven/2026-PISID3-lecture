import type { Metadata } from 'next';
import { SITE_BASE } from './assets';
import './globals.css';

export const metadata: Metadata = {
  title: 'ПиДИС · 3 курс · интерактивные лекции',
  description: 'Интерактивные лекции: требования, данные, проектные решения, UX и разграничение доступа.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <style>{`@font-face{font-family:Raleway;src:url('${SITE_BASE}/fonts/raleway-cyrillic.woff2') format('woff2');font-style:normal;font-weight:400 900;font-display:swap}`}</style>
      </head>
      <body>{children}</body>
    </html>
  );
}
