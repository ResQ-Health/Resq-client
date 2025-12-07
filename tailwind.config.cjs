/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'sans-serif'],
      },
      colors: {
        primary: '#06202E',
        'primary-foreground': '#FFFFFF',
        background: '#F6F8FA',
      },
    },
  },
  plugins: [],
};
