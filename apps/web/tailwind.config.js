/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        soterion: {
          bg: "#080808",
          surface: "#0e0e0e",
          "surface-alt": "#111111",
          border: "#1a1a1a",
          accent: "#f59e0b",
          critical: "#ef4444",
          high: "#f97316",
          ok: "#22c55e",
          info: "#06b6d4",
        },
      },
      fontFamily: {
        mono: ['"IBM Plex Mono"', "monospace"],
        display: ['"Bebas Neue"', "cursive"],
        sans: ['"Barlow"', "sans-serif"],
      },
    },
  },
  plugins: [],
};
