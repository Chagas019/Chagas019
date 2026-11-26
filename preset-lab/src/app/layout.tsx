import type { Metadata, Viewport } from "next";
import { Anton, Instrument_Serif, Inter_Tight, JetBrains_Mono } from "next/font/google";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { DemoBanner } from "@/components/site/demo-banner";
import "./globals.css";

const anton = Anton({ subsets: ["latin"], weight: "400", variable: "--font-anton", display: "swap" });
const instrument = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-instrument", display: "swap" });
const inter = Inter_Tight({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-jetbrains", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: { default: "PRESET LAB — Your creative space for photo editing", template: "%s · PRESET LAB" },
  description: "Marketplace de presets para Lightroom: gratuitos, premium e Premium Club. Feito para fotógrafos mobile, profissionais e criadores de conteúdo.",
  openGraph: { type: "website", locale: "pt_BR", siteName: "PRESET LAB" },
};

export const viewport: Viewport = { themeColor: "#0a0a0a", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${anton.variable} ${instrument.variable} ${inter.variable} ${mono.variable}`}>
      <body className="min-h-dvh">
        <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-signal focus:px-4 focus:py-2 focus:text-signal-ink">
          Pular para o conteúdo
        </a>
        <DemoBanner />
        <SiteHeader />
        <main id="conteudo">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
