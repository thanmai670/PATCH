/** ADR-0004 regression test. No SDK import, so it always runs. */
import { shouldNominate } from "../src/channels/nomination";

const cases: [string, string, boolean, boolean][] = [
  ["adhesive_bandage", "adhesive_bandage", true, true],
  ["adhesive_bandage", "adhesive_bandage", false, false],
  ["eyes", "eyes", true, false],
  ["thumbs_up", "thumbs_up", true, false],
  ["🩹", "🩹", true, true],
  ["bandage", "bandage", true, true],
];
let ok = true;
for (const [emoji, rawEmoji, added, want] of cases) {
  const got = shouldNominate({ emoji, rawEmoji, added, messageId: "m" });
  console.log(`  ${got === want ? "✓" : "✗"} ${rawEmoji.padEnd(18)} added=${String(added).padEnd(5)} -> ${got}`);
  if (got !== want) ok = false;
}
console.log(ok ? "\nnomination predicate: PASS" : "\nnomination predicate: FAIL");
process.exit(ok ? 0 : 1);
