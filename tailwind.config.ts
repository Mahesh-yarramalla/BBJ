import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        oat: "#F6F0E6",
        white: "#FFFFFF",
        sage: "#68765A",
        terracotta: "#B86F50",
        espresso: "#49382D",
        sandstone: "#E5D8C7",
      },
      fontFamily: {
        display: ["var(--font-dm-serif)", "Georgia", "serif"],
        sans: ["var(--font-inter)", "Arial", "sans-serif"],
      },
      boxShadow: {
        soft: "0 12px 36px rgba(73, 56, 45, 0.08)",
      },
      borderRadius: {
        "4xl": "2rem",
      },
    },
  },
  plugins: [],
};

export default config;
