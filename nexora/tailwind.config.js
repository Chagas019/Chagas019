/** Design tokens da NEXORA. As cores semânticas apontam para variáveis CSS em src/styles/index.css. */
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    container: { center: true, padding: { DEFAULT: '1.25rem', md: '2rem', xl: '3rem' }, screens: { '2xl': '1440px' } },
    extend: {
      colors: {
        ink: '#080A0F',
        navy: '#0D1424',
        'navy-2': '#121B30',
        signal: { DEFAULT: '#3478F6', soft: '#5B92F8', deep: '#1F5ED6' },
        paper: '#F5F7FB',
        mist: '#A5ADBD',
        surface: '#E9EDF4',
        line: 'rgb(var(--line) / <alpha-value>)',
        bg: 'rgb(var(--bg) / <alpha-value>)',
        fg: 'rgb(var(--fg) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        card: 'rgb(var(--card) / <alpha-value>)',
        success: '#2F9E6E',
        warning: '#C98A1B',
        danger: '#D9534F',
      },
      fontFamily: {
        sans: ['"Inter Tight Variable"', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        serif: ['"Instrument Serif"', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono Variable"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      fontSize: {
        // escala tipográfica (1.25) com entrelinhas e tracking pensados para títulos editoriais
        'display-xl': ['clamp(2.75rem, 7.2vw, 6.75rem)', { lineHeight: '0.95', letterSpacing: '-0.035em' }],
        'display-lg': ['clamp(2.25rem, 5vw, 4.5rem)', { lineHeight: '1', letterSpacing: '-0.03em' }],
        'display-md': ['clamp(1.75rem, 3.4vw, 3rem)', { lineHeight: '1.05', letterSpacing: '-0.025em' }],
        'display-sm': ['clamp(1.375rem, 2.2vw, 1.875rem)', { lineHeight: '1.15', letterSpacing: '-0.02em' }],
        eyebrow: ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.18em' }],
      },
      borderRadius: { sm: '6px', DEFAULT: '10px', lg: '14px', xl: '20px' },
      boxShadow: {
        card: '0 1px 0 rgb(255 255 255 / 0.04) inset, 0 18px 40px -24px rgb(0 0 0 / 0.55)',
        float: '0 30px 80px -30px rgb(0 0 0 / 0.7)',
        focus: '0 0 0 3px rgb(52 120 246 / 0.55)',
      },
      spacing: { section: 'clamp(5rem, 11vw, 10rem)' },
      transitionTimingFunction: { arch: 'cubic-bezier(0.22, 1, 0.36, 1)' },
      keyframes: {
        shimmer: { '0%': { backgroundPosition: '-400px 0' }, '100%': { backgroundPosition: '400px 0' } },
        scrollcue: { '0%': { transform: 'translateY(-100%)' }, '60%,100%': { transform: 'translateY(220%)' } },
      },
      animation: { shimmer: 'shimmer 1.6s linear infinite', scrollcue: 'scrollcue 2.2s cubic-bezier(0.22,1,0.36,1) infinite' },
    },
  },
  plugins: [],
};
