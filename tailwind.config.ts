import type { Config } from "tailwindcss";

/**
 * WorkForge palette.
 *
 * `brand` is a steel blue — the colour of industrial trust, and neutral enough
 * that the four contract-category accents can sit beside it without clashing.
 * `forge` is the amber spark used sparingly for emphasis and calls to action.
 */
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eff5fb",
          100: "#dbe8f6",
          200: "#bcd3ed",
          300: "#8fb5e0",
          400: "#5b90cd",
          500: "#3872b5",
          600: "#265a99",
          700: "#20487b",
          800: "#1d3d66",
          900: "#1b3556",
        },
        forge: {
          50: "#fff8ed",
          100: "#ffefd4",
          200: "#fedaa8",
          300: "#fdc071",
          400: "#fb9c38",
          500: "#f97f12",
          600: "#ea6408",
          700: "#c24b09",
          800: "#9a3c10",
          900: "#7c3310",
        },
      },
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "system-ui",
          "Segoe UI",
          "Inter",
          "Roboto",
          "Arial",
          "sans-serif",
        ],
      },
      boxShadow: {
        card: "0 1px 2px rgb(16 24 40 / 0.05), 0 1px 3px rgb(16 24 40 / 0.06)",
        lift: "0 4px 6px -1px rgb(16 24 40 / 0.08), 0 2px 4px -2px rgb(16 24 40 / 0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
