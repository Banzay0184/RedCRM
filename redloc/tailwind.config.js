/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: '#E3212B', dark: '#C8161F', soft: '#FDECEC' },
        ink: { DEFAULT: '#15171C', 800: '#1D2027', 700: '#262A33', 600: '#3A3F4B' },
        canvas: '#F4F5F7',
        line: '#E7E8EC',
        muted: '#6B7180',
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
      boxShadow: { card: '0 1px 2px rgba(16,24,40,.04), 0 4px 16px rgba(16,24,40,.06)' },
    },
  },
  plugins: [],
}
