import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import { AppProvider } from "@/lib/store";
import { CelebrationOverlay, Toaster } from "@/components/feedback/Feedback";
import "./globals.css";

const bricolage = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-bricolage", display: "swap" });
const instrument = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-instrument", display: "swap" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", display: "swap", weight: ["400", "500"] });

export const metadata: Metadata = {
  title: { default: "CRIATIVA LAB — Sua criatividade não tem limites", template: "%s · CRIATIVA LAB" },
  description:
    "A academia da criatividade: desafios diários, referências visuais, aulas e um gerador de ideias com IA para fotografia, design, vídeo e direção de arte.",
  applicationName: "CRIATIVA LAB",
  icons: { icon: "/icon.svg" },
  openGraph: {
    title: "CRIATIVA LAB",
    description: "Ideias não nascem prontas. Elas são desenvolvidas.",
    type: "website",
    locale: "pt_BR",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${bricolage.variable} ${instrument.variable} ${jetbrains.variable}`}>
      <body className="min-h-dvh">
        <a
          href="#conteudo"
          className="sr-only z-[100] rounded-full bg-lime px-4 py-2 text-ink focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        >
          Pular para o conteúdo
        </a>
        <AppProvider>
          {children}
          <Toaster />
          <CelebrationOverlay />
        </AppProvider>
      </body>
    </html>
  );
}
