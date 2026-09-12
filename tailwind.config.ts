import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-plex-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-plex-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      colors: {
        // Drafting paper, not warm cream.
        paper: "#EFF2F5",
        surface: "#FFFFFF",
        sunk: "#E4E9EF",
        rule: "#D8DEE5",
        ink: "#16202B",
        "ink-2": "#4A5763",
        "ink-3": "#828E9B",

        // Semantic, fixed by ADR-0001. `fill` reads on paper; `deep` reads as text.
        infected: "#E0413F",
        "infected-deep": "#B02020",
        exposed: "#E08A11",
        "exposed-deep": "#9A5B06",
        immune: "#0E9F6E",
        "immune-deep": "#06724E",
        historical: "#7C4DDB",
        "historical-deep": "#5B2FB0",
        irreversible: "#DB3C8A",
        "irreversible-deep": "#A81F63",
      },
      boxShadow: {
        panel: "0 1px 2px rgba(22,32,43,0.06), 0 8px 24px -12px rgba(22,32,43,0.18)",
      },
    },
  },
  plugins: [],
} satisfies Config;
