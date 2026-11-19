import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MAILBOT AI',
  description: 'Sua caixa de entrada, sob controle da inteligência artificial.',
  icons: { icon: '/icon.svg' },
  appleWebApp: { capable: true, title: 'MAILBOT AI', statusBarStyle: 'black-translucent' },
};

export const viewport: Viewport = {
  themeColor: '#050505',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
