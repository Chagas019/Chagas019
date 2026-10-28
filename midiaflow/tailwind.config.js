/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#07090D',
        card: 'rgba(18, 24, 34, 0.62)',
        surface: '#151C26',
        line: '#252F3C',
        neon: { DEFAULT: '#5BFF9A', soft: 'rgba(91,255,154,0.12)' },
        electric: { DEFAULT: '#55B8FF', soft: 'rgba(85,184,255,0.12)' },
        ink: { DEFAULT: '#F5F7FA', muted: '#96A3B5' },
        warn: '#FFC857',
        danger: '#FF6B7A',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: { xl2: '1.25rem', '3xl': '1.75rem' },
      boxShadow: {
        glow: '0 0 0 1px rgba(91,255,154,.35), 0 8px 30px -8px rgba(91,255,154,.35)',
        'glow-blue': '0 0 0 1px rgba(85,184,255,.35), 0 8px 30px -8px rgba(85,184,255,.35)',
        card: '0 1px 0 rgba(255,255,255,.03) inset, 0 20px 40px -24px rgba(0,0,0,.8)',
      },
      backgroundImage: {
        flow: 'linear-gradient(135deg, #5BFF9A 0%, #55B8FF 100%)',
      },
    },
  },
  plugins: [],
};
