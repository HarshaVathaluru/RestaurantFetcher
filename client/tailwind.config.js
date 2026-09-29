/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fdf8f6',
          100: '#f2e8e5',
          200: '#eaddd7',
          300: '#e0cec7',
          400: '#d2bab0',
          500: '#bfa094',
          600: '#a18072',
          700: '#977667',
          800: '#846358',
          900: '#43302b',
        },
        amber: {
          500: '#f59e0b',
          600: '#d97706',
        },
        surface: {
          dark: '#0c0f14',
          card: '#141820',
          border: '#222938',
          hover: '#1c222e'
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'glow': '0 0 35px -5px rgba(245, 158, 11, 0.25)',
        'card': '0 8px 30px rgba(0,0,0,0.3)',
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
