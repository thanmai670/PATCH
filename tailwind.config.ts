import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        infected: "#ef4444",
        exposed: "#f59e0b",
        immune: "#10b981",
        historical: "#8b5cf6",
        irreversible: "#ec4899",
      },
    },
  },
  plugins: [],
} satisfies Config;
