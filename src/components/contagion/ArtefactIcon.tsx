"use client";

import type { ArtefactKind } from "@/contract";

/**
 * A glyph per kind, drawn rather than emoji so it sits on the disc at a predictable
 * weight. The icon is what tells a reader "that one is an email" before any colour or
 * legend does.
 */
export function ArtefactIcon({
  kind,
  size = 20,
  color = "rgb(var(--map-disc-ink))",
}: {
  kind: ArtefactKind;
  size?: number;
  color?: string;
}) {
  const s = size / 24;
  const common = {
    fill: "none",
    stroke: color,
    strokeWidth: 1.9,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  return (
    <g transform={`translate(${-size / 2},${-size / 2}) scale(${s})`}>
      <g {...common}>{PATHS[kind]}</g>
    </g>
  );
}

const PATHS: Record<ArtefactKind, React.ReactNode> = {
  document: (
    <>
      <path d="M6 3h8l4 4v14H6z" />
      <path d="M14 3v4h4" />
      <path d="M9 12h6M9 16h6" />
    </>
  ),
  crm_record: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 10h18M9 10v9" />
    </>
  ),
  task: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="2.5" />
      <path d="M8.5 12.5l2.5 2.5 4.5-5" />
    </>
  ),
  email_sent: (
    <>
      <rect x="3" y="6" width="14" height="12" rx="2" />
      <path d="M3.5 7.5L10 12.5 16.5 7.5" />
      <path d="M17 15h5M19.5 12.5L22 15l-2.5 2.5" />
    </>
  ),
  email_draft: (
    <>
      <rect x="3" y="6" width="14" height="12" rx="2" />
      <path d="M3.5 7.5L10 12.5 16.5 7.5" />
      <path d="M17.5 18.5l4.5-4.5-1.5-1.5-4.5 4.5v1.5z" />
    </>
  ),
  historical_document: (
    <>
      <rect x="3" y="4" width="18" height="4.5" rx="1" />
      <path d="M5 8.5v10a1.5 1.5 0 001.5 1.5h11a1.5 1.5 0 001.5-1.5v-10" />
      <path d="M10 13h4" />
    </>
  ),
};
