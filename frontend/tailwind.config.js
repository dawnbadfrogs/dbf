/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'pond-dark': '#1A1A1A',
        'pond-green': '#00C749',
        'pond-red': '#FF4F58',
      },
    },
  },
  plugins: [],
};