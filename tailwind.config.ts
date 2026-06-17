import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef7f1",
          100: "#d6ecdd",
          200: "#aedabd",
          300: "#7fc398",
          400: "#4fa873",
          500: "#2f8d57",
          600: "#207044",
          700: "#1b5938",
          800: "#17472e",
          900: "#123a26",
        },
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "Segoe UI", "Roboto", "Arial", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
