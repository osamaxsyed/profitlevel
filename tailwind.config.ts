import type { Config } from "tailwindcss";

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        'safety-orange': '#FF6600',
        'dark-gray': '#1a1a1a',
        'medium-gray': '#2d2d2d',
        'light-gray': '#404040',
      },
    },
  },
  plugins: [],
} satisfies Config;
