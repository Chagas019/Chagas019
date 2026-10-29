import { Analytics } from "@vercel/analytics/next";
import { ConnectionStatus } from "@/components/shell/connection-status";
import type { Metadata, Viewport } from "next";
import { Anton, Poppins } from "next/font/google";
import { cookies } from "next/headers";
import { Header } from "@/components/shell/header";
import { Footer } from "@/components/shell/footer";
import { ToastProvider } from "@/components/ui/toast";
import "./globals.css";

const display = Anton({ subsets: ["latin"], weight: "400", variable: "--font-anton", display: "swap" });
const sans = Poppins({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-poppins", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: { default: "FRAME — Ideias em movimento", template: "%s · FRAME" },
  description: "A rede social para fotógrafos, videomakers, editores e criadores visuais. Mostre o processo, aprenda, colabore e participe de desafios criativos.",
  applicationName: "FRAME",
  openGraph: { siteName: "FRAME", locale: "pt_BR", type: "website" },
};

export const viewport: Viewport = {
  themeColor: "#080908",
  colorScheme: "dark",
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const nav = (await cookies()).get("frame_nav")?.value === "collapsed" ? "collapsed" : "expanded";
  return (
    <html lang="pt-BR" data-nav={nav} className={`${sans.variable} ${display.variable}`}>
      <body className="film-grain font-sans">
        <a href="#conteudo" className="sr-only z-[200] rounded-full bg-paper px-4 py-2 text-ink-950 focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
          Pular para o conteúdo
        </a>
        <ToastProvider>
          <Header />
          <ConnectionStatus />
          <main id="conteudo" className="shell-main pb-28 lg:pb-0">{children}</main>
          <div className="shell-main">
            <Footer />
          </div>
          <Analytics />
        </ToastProvider>
      </body>
    </html>
  );
}
