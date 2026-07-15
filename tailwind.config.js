/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./views/**/*.ejs", "./public/js/**/*.js"],
  theme: {
    extend: {
      colors: {
        brand: {
          gold: '#C29B5C',
          'gold-dark': '#A98246',
          'gold-light': '#D5B98A',
        }
      }
    },
  },
  plugins: [],
}
