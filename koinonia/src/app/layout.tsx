import type { Metadata, Viewport } from "next";
import { Outfit, Permanent_Marker } from "next/font/google";
import { getI18n } from "@/i18n/server";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { publicEnv } from "@/lib/env";
import "@/styles/globals.css";

const marker = Permanent_Marker({ subsets: ["latin"], weight: "400", variable: "--font-marker", display: "swap" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit", display: "swap" });

export async function generateMetadata(): Promise<Metadata> {
  const { m } = await getI18n();
  return {
    metadataBase: new URL(publicEnv.siteUrl),
    title: { default: m.meta.title, template: `%s · ${m.brand.name}` },
    description: m.meta.description,
    openGraph: { title: m.meta.title, description: m.meta.description, siteName: m.brand.name, type: "website" },
  };
}

export const viewport: Viewport = { themeColor: "#0E0E16", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { m, locale } = await getI18n();
  return (
    <html lang={locale} className={`${marker.variable} ${outfit.variable}`}>
      <body className="flex min-h-dvh flex-col">
        <a href="#conteudo" className="sr-only z-50 rounded-full bg-lime-400 px-4 py-2 font-semibold text-night-950 focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
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
