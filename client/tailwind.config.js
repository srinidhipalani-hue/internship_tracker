/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', '"DM Sans"', "system-ui", "sans-serif"],
        display: ['Syne', "Outfit", "system-ui", "sans-serif"],
      },
      keyframes: {
        "float-soft": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
        "chevron-bob": {
          "0%, 100%": { transform: "translateY(0)", opacity: "0.5" },
          "50%": { transform: "translateY(4px)", opacity: "1" },
        },
      },
      animation: {
        "float-soft": "float-soft 5s ease-in-out infinite",
        "chevron-bob": "chevron-bob 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
