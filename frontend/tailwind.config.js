/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f2f6ff',
          100: '#d9e4ff',
          200: '#b0c5ff',
          300: '#7fa1ff',
          400: '#4d7dff',
          500: '#1b59ff',
          600: '#1446cc',
          700: '#0d3399',
          800: '#062066',
          900: '#010d33',
        },
      },
    },
  },
  plugins: [],
};
