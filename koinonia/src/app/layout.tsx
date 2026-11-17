import type { Metadata, Viewport } from "next";
import { Inter, Montserrat } from "next/font/google";
import { getI18n } from "@/i18n/server";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { publicEnv } from "@/lib/env";
import "@/styles/globals.css";

const montserrat = Montserrat({ subsets: ["latin"], weight: ["700", "800", "900"], variable: "--font-montserrat", display: "swap" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export async function generateMetadata(): Promise<Metadata> {
  const { m, locale } = await getI18n();
  return {
    metadataBase: new URL(publicEnv.siteUrl),
    title: { default: m.meta.title, template: `%s · ${m.brand.name}` },
    description: m.meta.description,
    openGraph: { title: m.meta.title, description: m.meta.description, siteName: m.brand.name, type: "website", locale: locale.replace("-", "_") },
    twitter: { card: "summary_large_image", title: m.meta.title, description: m.meta.description },
    alternates: { canonical: "/" },
    other: { google: "notranslate" },
  };
}

export const viewport: Viewport = { themeColor: "#2B2B2B", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { m, locale } = await getI18n();
  // O site já é traduzido (pt-BR/en/es). A tradução automática do navegador altera o DOM e quebra o React.
  return (
    <html lang={locale} translate="no" className={`${montserrat.variable} ${inter.variable}`}>
      <body className="flex min-h-dvh flex-col">
        <a href="#conteudo" className="sr-only z-50 rounded-full bg-neon-400 px-4 py-2 font-semibold text-night-950 focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
          {m.common.skipToContent}
        </a>
        <SiteHeader />
        <main id="conteudo" tabIndex={-1} className="flex-1 outline-none">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
