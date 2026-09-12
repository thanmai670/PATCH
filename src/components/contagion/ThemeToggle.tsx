"use client";

import { useEffect, useState } from "react";

export type Theme = "light" | "dark";

const STORAGE_KEY = "patch-theme";

function systemTheme(): Theme {
  return typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

/**
 * Reads what the no-flash script in the document head already applied, so the button
 * never disagrees with the page it is sitting on.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const applied = document.documentElement.dataset.theme as Theme | undefined;
    setTheme(applied ?? systemTheme());
    setReady(true);
  }, []);

  function choose(next: Theme) {
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // A blocked storage API costs the preference, never the page.
    }
  }

  return (
    <div
      className="flex items-center gap-0.5 rounded-full border border-rule bg-surface p-0.5"
      role="group"
      aria-label="Page brightness"
    >
      {(["light", "dark"] as const).map((option) => {
        const on = ready && theme === option;
        return (
          <button
            key={option}
            type="button"
            onClick={() => choose(option)}
            aria-pressed={on}
            title={option === "light" ? "Light background" : "Dark background"}
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] transition-colors ${
              on ? "bg-ink text-paper" : "text-ink-3 hover:text-ink"
            }`}
          >
            {option === "light" ? <SunIcon /> : <MoonIcon />}
            {option === "light" ? "Light" : "Dark"}
          </button>
        );
      })}
    </div>
  );
}

function SunIcon() {
  return (
    <svg width={13} height={13} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="2" />
      <path
        d="M12 2v2.5M12 19.5V22M22 12h-2.5M4.5 12H2M19.07 4.93l-1.77 1.77M6.7 17.3l-1.77 1.77M19.07 19.07l-1.77-1.77M6.7 6.7L4.93 4.93"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width={13} height={13} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M20 14.2A8.2 8.2 0 119.8 4a6.6 6.6 0 1010.2 10.2z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}
