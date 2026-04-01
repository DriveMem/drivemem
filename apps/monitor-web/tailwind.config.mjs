/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        primary: '#1a1a1a',
        secondary: '#6b7280',
        tertiary: '#9ca3af',
        page: '#fafafa',
        card: '#ffffff',
        hover: '#f5f5f5',
        'status-online': '#4ade80',
        'status-busy': '#facc15',
        'status-offline': '#f87171',
      },
      borderRadius: {
        lg: '8px',
        xl: '12px',
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
};
