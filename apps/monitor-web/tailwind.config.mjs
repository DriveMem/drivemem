/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        primary: '#111827',
        secondary: '#6B7280',
        tertiary: '#9CA3AF',
        page: '#f8f8f8',
        card: '#ffffff',
        hover: '#f3f3f3',
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
        },
        status: {
          online: '#10b981',
          busy: '#f59e0b',
          offline: '#ef4444',
          unknown: '#d4d4d4',
        },
        success: '#10B981',
        error: '#EF4444',
        warning: '#F59E0B',
        info: '#3B82F6',
      },
      borderRadius: {
        DEFAULT: '6px',
        lg: '10px',
        xl: '14px',
        '2xl': '18px',
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgb(0 0 0 / 0.04), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
        'card-hover': '0 4px 12px 0 rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.04)',
        'elevated': '0 8px 24px 0 rgb(0 0 0 / 0.12)',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      fontSize: {
        'stat': ['2rem', { lineHeight: '1', fontWeight: '600', letterSpacing: '-0.02em' }],
      },
      animation: {
        'pulse-online': 'pulse-online 2s ease-in-out infinite',
      },
      keyframes: {
        'pulse-online': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
      },
    },
  },
  plugins: [],
};
