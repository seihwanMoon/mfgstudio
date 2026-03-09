/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: "#0B1929", mid: "#0F2035", card: "#0D1926" },
        cyan: { DEFAULT: "#38BDF8" },
        green: { DEFAULT: "#34D399" },
        amber: { DEFAULT: "#FBBF24" },
        violet: { DEFAULT: "#A78BFA" },
        red: { DEFAULT: "#F87171" },
        muted: "#5A7A9A",
        border: "#1A3352",
      },
      fontFamily: {
        sans: ["DM Sans", "Malgun Gothic", "sans-serif"],
        mono: ["JetBrains Mono", "Consolas", "monospace"],
      },
    },
  },
  plugins: [],
}
