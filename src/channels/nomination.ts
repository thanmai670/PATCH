/**
 * The 🩹 nomination predicate (#9). Deliberately free of any SDK import so it is
 * testable without the ESM-only Channels packages, and usable from Next routes.
 *
 * ADR-0004: channel.onReaction("adhesive_bandage", h) DOES NOT FIRE. The filtered
 * overload accepts only CopilotKit's eight portable emoji names (thumbs_up,
 * thumbs_down, heart, fire, eyes, refresh, thinking, tada). 🩹 is not one, so the
 * UNFILTERED handler is registered and rawEmoji matched here.
 *
 * Do not "clean this up" into the filtered form — it silently breaks the demo.
 */
const BANDAGE = new Set(["adhesive_bandage", "bandage", "🩹"]);

export function isNomination(emoji: string, rawEmoji: string): boolean {
  return BANDAGE.has(rawEmoji) || BANDAGE.has(emoji);
}

export type NominationEvent = {
  added: boolean;
  emoji: string;
  rawEmoji: string;
  messageId: string;
  user?: { name?: string } | null;
  actor?: { id?: string } | null;
};

/** True only for a 🩹 being ADDED. Un-reacting must not re-trigger a repair run. */
export function shouldNominate(evt: NominationEvent): boolean {
  return evt.added === true && isNomination(evt.emoji, evt.rawEmoji);
}
