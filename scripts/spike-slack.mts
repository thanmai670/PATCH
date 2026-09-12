/**
 * #9 TRANSPORT SPIKE. One question: does a 🩹 reaction in Slack reach this process?
 */
import { createChannel } from "@copilotkit/channels-core";
import { shouldNominate } from "../src/channels/nomination.js";

const cases: [string, string, boolean, boolean][] = [
  ["adhesive_bandage", "adhesive_bandage", true, true],
  ["adhesive_bandage", "adhesive_bandage", false, false],  // un-reacting
  ["eyes", "eyes", true, false],
  ["🩹", "🩹", true, true],
];
let ok = true;
for (const [emoji, rawEmoji, added, want] of cases) {
  const got = shouldNominate({ emoji, rawEmoji, added, messageId: "m" });
  if (got !== want) { ok = false; console.error(`  ✗ ${rawEmoji} added=${added}: got ${got}, want ${want}`); }
  else console.log(`  ✓ ${rawEmoji} added=${added} -> ${got}`);
}
if (!ok) process.exit(1);
console.log("\npredicate OK (ADR-0004 trap covered)\n");

console.log(`CPK_INTELLIGENCE_API_KEY: ${process.env.CPK_INTELLIGENCE_API_KEY ? "set" : "MISSING"}`);

const channel = createChannel({
  name: "patch",
  identifyUser: ({ actor }: any) => ({
    id: String(actor?.id ?? "unknown"),
    name: String(actor?.displayName ?? actor?.id ?? "unknown"),
  }),
});

// UNFILTERED handler — the whole point of the spike.
(channel as any).onReaction(async (evt: any) => {
  if (!shouldNominate(evt)) return;
  console.log("\n🩹 NOMINATION RECEIVED");
  console.log(`   from:      ${evt.user?.name ?? evt.actor?.id}`);
  console.log(`   messageId: ${evt.messageId}`);
  console.log(`   rawEmoji:  ${evt.rawEmoji}`);
  console.log("\nTRANSPORT WORKS.\n");
});

console.log("channel declared, reaction handler registered\n");
console.log("React 🩹 on a message in #project-atlas now. Ctrl-C to stop.\n");
