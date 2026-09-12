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
import { CopilotKitIntelligence, CopilotRuntime, BuiltInAgent } from "@copilotkit/runtime/v2";
import { execFile } from "node:child_process";
import { readFileSync } from "node:fs";
import { promisify } from "node:util";
import { confirmationCard, summaryCard, auditCard } from "../src/channels/cards.mjs";

const run = promisify(execFile);

/**
 * The agent pipeline is TypeScript; this listener is ESM .mjs. Rather than fight
 * the interop, run it as a child process and read the report it saves. Slower than
 * an in-process call, and completely robust.
 */
async function runPipeline() {
  await run("npx", ["tsx", "--env-file=.env.local", "scripts/run-pipeline.ts", "--save"], {
    cwd: process.cwd(),
    maxBuffer: 1024 * 1024 * 16,
  });
  return JSON.parse(readFileSync("fixtures/live-report.json", "utf8"));
}

const VIEW_URL = `${process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"}/?fixture=0`;
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

  const who = evt.user?.name ?? evt.actor?.id ?? "someone";
  console.log("\n🩹 NOMINATION RECEIVED");
  console.log(`   from:      ${who}`);
  console.log(`   messageId: ${evt.messageId}`);

  try {
    // Card 1 — the gate. Nothing is searched or written until a human confirms.
    await evt.thread.send(
      confirmationCard({
        change: {
          subject: "Drive motor specification — Project Atlas",
          previousValue: "22 kW",
          newValue: "18.5 kW",
          confidence: 0.95,
          announcedBy: who,
        },
        onConfirm: async (ctx) => {
          await ctx.thread.send("Confirmed. Checking external evidence and searching the workspace…");
          const report = await runPipeline();
          await ctx.thread.send(summaryCard({ report, viewUrl: VIEW_URL }));
          console.log(`   pipeline done: ${report.nodes.length} artefacts`);
        },
        onEdit: async (ctx) => {
          await ctx.thread.send("Tell me the corrected previous and new values and I will re-read it.");
        },
        onReject: async (ctx) => {
          await ctx.thread.send("Understood — not treating this as a truth change. Nothing was searched or changed.");
        },
      }),
    );
  } catch (e) {
    console.error("   card send failed:", e?.message ?? e);
  }
});

// Every handler registered, so "nothing arrives" is distinguishable from
// "reactions specifically do not arrive".
channel.onMessage(async (evt) => {
  console.log(`[message] from=${evt.user?.name ?? evt.actor?.id ?? "?"} text=${String(evt.text ?? "").slice(0, 80)}`);
});

channel.onMention(async (evt) => {
  console.log(`[mention] from=${evt.user?.name ?? evt.actor?.id ?? "?"} text=${String(evt.text ?? "").slice(0, 80)}`);
  try { await evt.thread.send("PATCH is listening. React 🩹 on a message to nominate it."); }
  catch (e) { console.error("  reply failed:", e?.message ?? e); }
});

channel.onThreadStarted?.(async () => console.log("[threadStarted]"));

const intelligence = new CopilotKitIntelligence({ apiKey: API_KEY });

// identifyUser is REQUIRED on the runtime, not only on the channel.
// Without it the runtime still starts, still reports a valid license, and still
// answers /info — but it wires NO gateway and serves no thread routes, so Slack
// events never arrive and nothing errors. `copilotkit verify` names this exact
// signature: "no agents and no gateway URL while still reporting a license".
const runtime = new CopilotRuntime({
  // `copilotkit verify` fails on an empty agents map. The Channel needs an agent to
  // hand a turn to even when our own handlers do the real work.
  agents: { default: new BuiltInAgent({ model: "openai/gpt-4o-mini" }) },
  intelligence,
  channels: [channel],
  identifyUser: (request) => {
    const id = request?.headers?.get?.("x-copilotkit-user-id") ?? "patch-demo-user";
    return { id: String(id), name: "PATCH demo user" };
  },
});
const listener = createCopilotNodeListener({ runtime, basePath: "/api/copilotkit" });

const server = createServer(listener);
server.listen(PORT, () => console.log(`listener http on :${PORT}`));

console.log(`channel "${CHANNEL_NAME}" declared; waiting for activation…`);
await listener.channels.ready({ timeoutMs: 30_000 });
console.log("✓ channel ONLINE — react 🩹 on a message in #project-atlas now\n");
