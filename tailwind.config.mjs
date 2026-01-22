/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#1C1C1C',
        secondary: '#3A3A3A',
        beige: '#E6D5C6',
        teal: '#0E636E',
        gold: '#C99E5D',
        clay: '#D08A61',
        slate: '#5B7B9C',
      },
      fontFamily: {
        sans: ['Playfair Display', 'Frank Ruhl Libre', 'system-ui', 'sans-serif'],
        hebrew: ['Frank Ruhl Libre', 'serif'],
        display: ['Playfair Display', 'serif']
      },
      backgroundColor: {
        'dark-primary': '#1C1C1C',
        'dark-secondary': '#3A3A3A',
      },
      textColor: {
        'dark-primary': '#E6D5C6',
        'dark-secondary': '#C99E5D',
      }
    },
  },
  plugins: [],
}