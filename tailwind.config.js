/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Plus Jakarta Sans', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        logo: ['Unbounded', 'Syne', 'Outfit', 'sans-serif'],
      },
      colors: {
        slate: {
          700: '#4a443c',
          750: '#3e3933',
          800: '#342f29', // warm graphite borders & chips (like 2nd image)
          850: '#282520',
          900: '#1f1d1a', // luxurious warm graphite surface for cards, sidebar & navbar
          950: '#151413', // deep warm charcoal graphite background from 2nd image
        },
        brand: {
          50: '#f0f5ff',
          100: '#e5edff',
          500: '#1e40af',
          600: '#1d4ed8',
          700: '#1e3a8a',
          800: '#172554',
          900: '#0f172a'
        }
      }
    },
  },
  plugins: [],
}
