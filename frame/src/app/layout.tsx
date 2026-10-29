import type { Metadata, Viewport } from "next";
import { Inter_Tight, Instrument_Serif } from "next/font/google";
import { Header } from "@/components/shell/header";
import { ToastProvider } from "@/components/ui/toast";
import "./globals.css";

const sans = Inter_Tight({ subsets: ["latin"], variable: "--font-inter-tight", display: "swap" });
const display = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-instrument-serif", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: { default: "FRAME — Sua criatividade merece um mundo inteiro", template: "%s · FRAME" },
  description: "A rede social para fotógrafos, videomakers, editores e criadores visuais. Mostre o processo, aprenda, colabore e participe de desafios criativos.",
  applicationName: "FRAME",
  openGraph: { siteName: "FRAME", locale: "pt_BR", type: "website" },
};

export const viewport: Viewport = {
  themeColor: "#060608",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${sans.variable} ${display.variable}`}>
      <body className="film-grain font-sans">
        <a href="#conteudo" className="sr-only z-[200] rounded-full bg-paper px-4 py-2 text-ink-950 focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
          Pular para o conteúdo
        </a>
        <ToastProvider>
          <Header />
          <main id="conteudo" className="pb-24 sm:pb-12">
            {children}
          </main>
        </ToastProvider>
      </body>
    </html>
  );
}
