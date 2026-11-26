import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ivory: { 50: "#FDFBF6", 100: "#FAF6EC", 200: "#F3ECDB", 300: "#E8DDC4" },
        ink: { DEFAULT: "#1B2333", soft: "#465066", mute: "#6E7686" },
        royal: { 50: "#EEF2FA", 100: "#D9E1F2", 300: "#8EA2CF", 500: "#2D4A8A", 700: "#1A2F63", 800: "#14244D", 900: "#0E1A38" },
        gold: { 100: "#F6EBCF", 300: "#E2C78A", 500: "#B8924A", 700: "#8A6A2C" },
        wine: { 500: "#8C2F39" },
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(20,36,77,.05), 0 8px 24px -12px rgba(20,36,77,.18)",
        lift: "0 2px 4px rgba(20,36,77,.06), 0 18px 40px -16px rgba(20,36,77,.28)",
      },
      keyframes: {
        "fade-up": { "0%": { opacity: "0", transform: "translateY(8px)" }, "100%": { opacity: "1", transform: "none" } },
      },
      animation: { "fade-up": "fade-up .5s ease-out both" },
    },
  },
  plugins: [typography],
} satisfies Config;
