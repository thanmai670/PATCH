/**
 * PATCH's Slack listener (#9). Plain .mjs so Node runs it natively as ESM —
 * @copilotkit/channels-core is ESM-only and tsx mis-resolves its transitive
 * fast-json-patch as CJS.
 *
 * Run:  node --env-file=.env --env-file=.env.local scripts/slack-listener.mjs
 *
 * ADR-0004: the UNFILTERED onReaction handler is registered and rawEmoji matched
 * here. onReaction("adhesive_bandage", h) does NOT fire — the filtered overload
 * only accepts the eight portable emoji names. Do not "clean this up".
 */
import { createServer } from "node:http";
import { createChannel } from "@copilotkit/channels";
import { CopilotKitIntelligence, CopilotRuntime } from "@copilotkit/runtime/v2";
import { createCopilotNodeListener } from "@copilotkit/runtime/v2/node";

const BANDAGE = new Set(["adhesive_bandage", "bandage", "🩹"]);
const isNomination = (emoji, rawEmoji) => BANDAGE.has(rawEmoji) || BANDAGE.has(emoji);

// createChannel wants the project-unique lowercase kebab-case channel NAME
// ("patch"), NOT the immutable CHANNEL_CODE id ("channel_01a0…"). The Realtime
// Gateway rejects the id with "requires a lowercase kebab-case channelName".
// `copilotkit channels list` prints the name.
const CHANNEL_NAME = process.env.CHANNEL_NAME ?? "patch";
const CHANNEL_CODE = process.env.CHANNEL_CODE;
const API_KEY = process.env.CPK_INTELLIGENCE_API_KEY;
const PORT = Number(process.env.CHANNEL_PORT ?? 3100);

if (!CHANNEL_CODE || !API_KEY) {
  console.error("Missing CHANNEL_CODE or CPK_INTELLIGENCE_API_KEY");
  process.exit(1);
}

const channel = createChannel({
  name: CHANNEL_NAME,
  identifyUser: "platform",
});

channel.onReaction(async (evt) => {
  console.log(`[reaction] emoji=${evt.emoji} raw=${evt.rawEmoji} added=${evt.added}`);
  if (!evt.added) return;
  if (!isNomination(evt.emoji, evt.rawEmoji)) return;

  console.log("\n🩹 NOMINATION RECEIVED");
  console.log(`   from:      ${evt.user?.name ?? evt.actor?.id}`);
  console.log(`   messageId: ${evt.messageId}`);
  console.log("\nTRANSPORT WORKS.\n");

  try {
    await evt.thread.send(
      "🩹 Nomination received — reading the thread and checking the workspace.",
    );
  } catch (e) {
    console.error("   (reply failed:", e?.message ?? e, ")");
  }
});

channel.onMention?.(async (evt) => {
  console.log(`[mention] from ${evt.user?.name ?? "?"}`);
});

const intelligence = new CopilotKitIntelligence({ apiKey: API_KEY });
const runtime = new CopilotRuntime({ agents: {}, intelligence, channels: [channel] });
const listener = createCopilotNodeListener({ runtime, basePath: "/api/copilotkit" });

const server = createServer(listener);
server.listen(PORT, () => console.log(`listener http on :${PORT}`));

console.log(`channel "${CHANNEL_NAME}" declared; waiting for activation…`);
await listener.channels.ready({ timeoutMs: 30_000 });
console.log("✓ channel ONLINE — react 🩹 on a message in #project-atlas now\n");
