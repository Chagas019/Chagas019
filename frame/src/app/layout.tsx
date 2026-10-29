import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import { Header } from "@/components/shell/header";
import { Footer } from "@/components/shell/footer";
import { ToastProvider } from "@/components/ui/toast";
import "./globals.css";

const sans = Poppins({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-poppins", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: { default: "FRAME — Sua criatividade merece um mundo inteiro", template: "%s · FRAME" },
  description: "A rede social para fotógrafos, videomakers, editores e criadores visuais. Mostre o processo, aprenda, colabore e participe de desafios criativos.",
  applicationName: "FRAME",
  openGraph: { siteName: "FRAME", locale: "pt_BR", type: "website" },
};

export const viewport: Viewport = {
  themeColor: "#0d0d0d",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={sans.variable}>
      <body className="film-grain font-sans">
        <a href="#conteudo" className="sr-only z-[200] rounded-full bg-paper px-4 py-2 text-ink-950 focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
          Pular para o conteúdo
        </a>
        <ToastProvider>
          <Header />
          <main id="conteudo">{children}</main>
          <Footer />
        </ToastProvider>
      </body>
    </html>
  );
}
