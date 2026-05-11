/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      fontSize: {
        base: ["0.9375rem", { lineHeight: "1.5rem" }],
      },
      colors: {
        brand: {
          DEFAULT: "rgb(15 118 110)",
          dark: "rgb(45 212 191)",
        },
      },
    },
  },
  plugins: [],
};
