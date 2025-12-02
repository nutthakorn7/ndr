/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
  safelist: [
    {
      pattern: /(text|bg|border)-(blue|red|amber|emerald)-(400|500)(\/(10|20|50))?/,
    }
  ]
}
