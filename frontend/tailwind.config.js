/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1B4332',
          hover: '#2D6A4F',
          light: '#D8F3DC',
        },
        accent: {
          DEFAULT: '#52B788',
          light: '#95D5B2',
        },
        surface: '#FFFFFF',
        background: '#F8FAF7',
        'text-primary': '#1A1A2E',
        'text-secondary': '#6B7280',
        border: '#E5E7EB',
        error: '#DC2626',
        warning: '#F59E0B',
        success: '#10B981',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
