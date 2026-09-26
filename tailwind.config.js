/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./index.html", "./js/**/*.js"],
  theme: {
    extend: {
      colors: {
        wow: {
          gold: "#ffd100",
          dark: "#090d16",
          card: "#131b2e",
          accent: "#dc2626",
          border: "#1e293b",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
