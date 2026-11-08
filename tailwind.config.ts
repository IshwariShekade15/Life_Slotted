import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "rgb(var(--color-bg) / <alpha-value>)",
        surface: "rgb(var(--color-surface) / <alpha-value>)",
        accent: "rgb(var(--app-lime-dark, 150 190 53) / <alpha-value>)",
        violet: "#52745b",
        ink: "rgb(var(--color-ink) / <alpha-value>)",
        muted: "rgb(var(--color-muted) / <alpha-value>)",
        subtle: "rgb(var(--color-subtle) / <alpha-value>)",
        high: "#b94a48",
        medium: "#b8893d",
        low: "#94A3B8",
        success: "#5d8b54",
        border: "rgb(var(--color-border) / <alpha-value>)",
        meeting: "rgb(var(--color-meeting) / <alpha-value>)",
      },
      fontFamily: { sans: ["var(--font-inter)", "Arial", "sans-serif"] },
    },
  },
  plugins: [],
};

export default config;
