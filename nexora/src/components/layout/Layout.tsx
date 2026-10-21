import { Suspense } from 'react';
import { Outlet, ScrollRestoration, useLocation } from 'react-router';
import { Header } from './Header';
import { Footer } from './Footer';
import { CompareBar } from './CompareBar';
import { CookieConsent } from './CookieConsent';
import { Toaster } from '@/components/ui/Toaster';
import { PageFallback } from './PageFallback';

export function Layout() {
  const { pathname } = useLocation();
  const overlay = pathname === '/' || pathname.startsWith('/imovel/') || pathname === '/experiencia-3d';
  return (
    <>
      <a href="#conteudo" className="sr-only z-[100] rounded bg-signal px-4 py-2 text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Pular para o conteúdo</a>
      <Header overlay={overlay} />
      <main id="conteudo" tabIndex={-1} className="outline-none">
        <Suspense fallback={<PageFallback />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
      <CompareBar />
      <Toaster />
      <CookieConsent />
      <ScrollRestoration />
    </>
  );
}
