import type { Config } from "tailwindcss";
export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { 950: "#0a0b0d", 900: "#0f1114", 850: "#13161a", 800: "#181b20", 700: "#22262d", 600: "#2e333b", 500: "#454b55" },
        electric: { DEFAULT: "#3b82f6", 400: "#60a5fa", 500: "#3b82f6", 600: "#2563eb", glow: "#4f8cff" },
        success: { DEFAULT: "#22c55e", 400: "#4ade80" },
      },
      fontFamily: { sans: ["var(--font-inter)", "ui-sans-serif", "system-ui"], mono: ["var(--font-mono)", "ui-monospace"] },
      boxShadow: { card: "0 0 0 1px rgba(255,255,255,0.06), 0 1px 2px rgba(0,0,0,0.4)", glow: "0 0 24px -6px rgba(79,140,255,0.55)" },
    },
  },
  plugins: [],
} satisfies Config;
