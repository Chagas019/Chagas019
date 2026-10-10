import type { Metadata, Viewport } from "next";
import { Montserrat, JetBrains_Mono } from "next/font/google";
import SmoothScroll from "@/components/SmoothScroll";
import "./globals.css";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400"],
});

export const metadata: Metadata = {
  title: "Theo Valente — Fotografia",
  description: "Retrato, editorial e campanha. Luz primeiro, depois a história.",
};

export const viewport: Viewport = {
  themeColor: "#000000",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={`${montserrat.variable} ${mono.variable} antialiased`}>
        <SmoothScroll>{children}</SmoothScroll>
      </body>
    </html>
  );
}
