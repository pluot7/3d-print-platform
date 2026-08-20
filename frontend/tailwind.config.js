/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: 'var(--bg-body)',
          panel: 'var(--bg-panel)',
          card: 'var(--bg-card)',
          overlay: 'var(--bg-overlay)',
          border: 'var(--border)',
          orange: 'var(--accent)',
          'orange-light': 'var(--accent-light)',
          blue: 'var(--accent-2)',
          'blue-light': 'var(--accent-2-light)',
          'blue-deep': 'var(--accent-2-deep)',
          text: 'var(--text)',
          'text-muted': 'var(--text-muted)',
          'text-dim': 'var(--text-dim)',
        },
      },
      backgroundImage: {
        'gradient-brand': 'var(--gradient-brand)',
        'gradient-hero': 'var(--gradient-hero)',
        'gradient-card': 'linear-gradient(145deg, var(--bg-card) 0%, var(--bg-panel) 100%)',
        'glow-orange': 'var(--glow-accent)',
        'glow-blue': 'var(--glow-accent-2)',
      },
      boxShadow: {
        'brand-orange': 'var(--shadow-accent)',
        'brand-blue': 'var(--shadow-accent-2)',
        'card': 'var(--shadow-card)',
        'card-hover': 'var(--shadow-card-hover)',
        'sm': 'var(--shadow-sm)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
}
