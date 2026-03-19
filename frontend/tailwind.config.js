/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'display': ['Orbitron', 'sans-serif'],
        'sans': ['Space Grotesk', 'sans-serif'],
        'mono': ['JetBrains Mono', 'monospace'],
      },
      colors: {
        'cyan': {
          400: '#00ddff',
          500: '#00ccff',
        },
        'orange': {
          400: '#ff9933',
          500: '#ff8c00',
        },
      },
    },
  },
  plugins: [],
}
