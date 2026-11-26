import type { Metadata, Viewport } from "next";
import { Fraunces, Source_Sans_3 } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/components/providers";

const serif = Fraunces({ subsets: ["latin"], variable: "--font-serif", display: "swap", axes: ["opsz"] });
const sans = Source_Sans_3({ subsets: ["latin"], variable: "--font-sans", display: "swap" });

export const metadata: Metadata = {
  title: { default: "VERBUM — Prepare a mensagem. Anuncie a Palavra.", template: "%s · VERBUM" },
  description: "Plataforma de apoio aos pregadores católicos: pesquisa bíblica, documentos da Igreja, músicas, pregações e um assistente inteligente de preparação.",
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = { themeColor: "#14244D", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${serif.variable} ${sans.variable}`}>
      <body>
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
