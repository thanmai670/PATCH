/**
 * Run ONLY the interpreter on a nominated Slack message and print the TruthChange
 * as JSON. Used by the Slack listener so the confirmation card shows what the
 * message actually said, rather than hardcoded demo values.
 */
import { interpreter } from "../src/agents/interpreter";

const text = process.argv[2] ?? "";
const author = process.argv[3] ?? "someone";
const channel = process.argv[4] ?? "#project-atlas";

(async () => {
  const { change, extras } = await interpreter({
    channel,
    messageTs: `${Math.floor(Date.now() / 1000)}.000100`,
    text,
    threadText: [],
    author,
    attachments: [],
    permalink: null,
  });
  process.stdout.write(JSON.stringify({ change, extras }));
})().catch((e) => {
  process.stdout.write(JSON.stringify({ error: String(e?.message ?? e), notAChange: !!e?.notAChange }));
  process.exit(0);
});
