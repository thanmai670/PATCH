"use client";

import { useState } from "react";
import { DISPOSITION_RING, REVIEW_COLOR } from "./tokens";

/**
 * The ring is the one mark that cannot explain itself, because `editable` deliberately
 * draws nothing and absence has no label (ADR-0008). Everything else on the map now
 * says what it is in words, so this is a short note rather than a decoder.
 */
export function MapLegend() {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex items-center gap-3 text-[12.5px]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="rounded-md border border-rule bg-surface px-2.5 py-1 text-ink-2 hover:bg-sunk"
        aria-expanded={open}
      >
        {open ? "Hide" : "What do the circles mean?"}
      </button>

      {open && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-ink-2">
          <span className="flex items-center gap-2">
            <span
              className="h-3.5 w-3.5 shrink-0 rounded-full border-[2.5px] bg-surface"
              style={{ borderColor: DISPOSITION_RING.historical! }}
            />
            a purple outline means it must stay as it is
          </span>
          <span className="flex items-center gap-2">
            <span
              className="h-3.5 w-3.5 shrink-0 rounded-full border-[2.5px] bg-surface"
              style={{ borderColor: DISPOSITION_RING.irreversible! }}
            />
            a pink outline means someone outside already has it
          </span>
          <span className="flex items-center gap-2">
            <span
              className="grid h-4 w-4 shrink-0 place-items-center rounded-full border-2 bg-surface text-[9px] font-bold"
              style={{ borderColor: REVIEW_COLOR, color: "rgb(var(--c-exposed-deep))" }}
            >
              !
            </span>
            a warning dot means PATCH wants you to decide
          </span>
          <span className="text-ink-3">
            no outline means PATCH can fix it on its own
          </span>
        </div>
      )}
    </div>
  );
}
