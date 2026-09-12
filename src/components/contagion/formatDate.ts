const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/**
 * Deterministic, locale-independent. `toLocaleDateString` renders differently on the
 * server and in the viewer's browser, which is a hydration mismatch — and on stage it
 * would blank the rail it appears in.
 */
export function formatDate(iso: string | null, fallback = "undated"): string {
  if (!iso) return fallback;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}
