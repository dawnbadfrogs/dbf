/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'pond-dark': '#1A1D1E',
        'pond-green': '#70C431',
        'pond-red': '#FF5C7A',
      },
    },
  },
  plugins: [],
};