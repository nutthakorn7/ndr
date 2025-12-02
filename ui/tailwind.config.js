/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Google Antigravity / Cloud Console Palette
        surface: {
          base: '#121212', // Main background
          1: '#1E1E1E',    // Nav, App Bar
          2: '#2D2D2D',    // Cards
          3: '#3C3C3C',    // Hover states
        },
        primary: {
          DEFAULT: '#8AB4F8', // Google Blue (Dark mode)
          foreground: '#202124',
        },
        success: '#81C995',
        warning: '#FDD663',
        error: '#F28B82',
        border: {
          subtle: 'rgba(255, 255, 255, 0.12)',
          focus: 'rgba(138, 180, 248, 0.5)',
        }
      },
      fontFamily: {
        sans: ['Roboto', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'elevation-1': '0 1px 2px 0 rgba(0, 0, 0, 0.3), 0 1px 3px 1px rgba(0, 0, 0, 0.15)',
        'elevation-2': '0 1px 2px 0 rgba(0, 0, 0, 0.3), 0 2px 6px 2px rgba(0, 0, 0, 0.15)',
      }
    },
  },
  plugins: [],
  safelist: [
    {
      pattern: /(text|bg|border)-(blue|red|amber|emerald)-(400|500)(\/(10|20|50))?/,
    },
    // Safelist new tokens for dynamic usage
    {
      pattern: /(text|bg|border)-(primary|success|warning|error)/,
    }
  ]
}
