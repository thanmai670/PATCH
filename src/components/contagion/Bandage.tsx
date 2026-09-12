"use client";

/**
 * The 🩹 reaction is the nomination gesture (ADR-0004) and therefore the product's
 * hero mark — but the system emoji renders as a flat grey lozenge on most machines,
 * which is not a thing anyone recognises. Drawn instead so it is always legible.
 */
export function BandageGlyph({
  size = 24,
  tone = "rgb(var(--c-infected))",
  pad = "rgb(var(--surface))",
}: {
  size?: number;
  tone?: string;
  pad?: string;
}) {
  const s = size / 24;
  return (
    <g transform={`scale(${s}) rotate(-40)`}>
      <rect x={-11} y={-5.6} width={22} height={11.2} rx={5.6} fill={tone} />
      <rect
        x={-4.4}
        y={-4.4}
        width={8.8}
        height={8.8}
        rx={2.2}
        fill={pad}
        opacity={0.92}
      />
      {[
        [-2.1, -2.1],
        [2.1, -2.1],
        [-2.1, 2.1],
        [2.1, 2.1],
      ].map(([cx, cy]) => (
        <circle key={`${cx},${cy}`} cx={cx} cy={cy} r={0.85} fill={tone} opacity={0.55} />
      ))}
    </g>
  );
}

/** The same mark for HTML contexts, where it needs its own viewport. */
export function Bandage({
  size = 18,
  tone,
  pad,
}: {
  size?: number;
  tone?: string;
  pad?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={`${-size / 2} ${-size / 2} ${size} ${size}`}
      aria-hidden
      className="shrink-0 overflow-visible"
    >
      <BandageGlyph size={size} tone={tone} pad={pad} />
    </svg>
  );
}
