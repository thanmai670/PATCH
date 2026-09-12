import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-plex-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-plex-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      // Every colour comes from a CSS variable so the theme switch is a single
      // attribute flip — see globals.css.
      colors: {
        paper: "rgb(var(--paper) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        sunk: "rgb(var(--sunk) / <alpha-value>)",
        rule: "rgb(var(--rule) / <alpha-value>)",
        ink: "rgb(var(--ink) / <alpha-value>)",
        "ink-2": "rgb(var(--ink-2) / <alpha-value>)",
        "ink-3": "rgb(var(--ink-3) / <alpha-value>)",

        // Semantic, fixed by ADR-0001. `fill` reads on the page; `deep` reads as text.
        infected: "rgb(var(--c-infected) / <alpha-value>)",
        "infected-deep": "rgb(var(--c-infected-deep) / <alpha-value>)",
        exposed: "rgb(var(--c-exposed) / <alpha-value>)",
        "exposed-deep": "rgb(var(--c-exposed-deep) / <alpha-value>)",
        immune: "rgb(var(--c-immune) / <alpha-value>)",
        "immune-deep": "rgb(var(--c-immune-deep) / <alpha-value>)",
        historical: "rgb(var(--c-historical) / <alpha-value>)",
        "historical-deep": "rgb(var(--c-historical-deep) / <alpha-value>)",
        irreversible: "rgb(var(--c-irreversible) / <alpha-value>)",
        "irreversible-deep": "rgb(var(--c-irreversible-deep) / <alpha-value>)",
      },
      boxShadow: {
        panel:
          "0 1px 2px rgb(var(--shadow-ink) / 0.07), 0 8px 24px -12px rgb(var(--shadow-ink) / 0.28)",
      },
    },
  },
  plugins: [],
} satisfies Config;
