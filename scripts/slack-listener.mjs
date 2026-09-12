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
import { execFile, spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { promisify } from "node:util";
import { confirmationCard, summaryCard, auditCard } from "../src/channels/cards.mjs";

const run = promisify(execFile);

/**
 * The agent pipeline is TypeScript; this listener is ESM .mjs. Rather than fight
 * the interop, run it as a child process and read the report it saves. Slower than
 * an in-process call, and completely robust.
 */
/** Interpret the nominated message so the card shows what was actually said. */
async function interpretMessage(text, author, channel) {
  const { stdout } = await run(
    "npx",
    ["tsx", "--env-file=.env.local", "scripts/interpret-once.ts", text, author, channel],
    { cwd: process.cwd(), maxBuffer: 1024 * 1024 * 8 },
  );
  return JSON.parse(stdout.trim().split("\n").pop());
}

const AGENT_LABEL = {
  interpreter: "Reading the message",
  evidence:    "Checking external evidence (Exa)",
  tracer:      "Searching the workspace (Ambiguous)",
  classifier:  "Classifying each artefact",
  planner:     "Generating repair interfaces",
};

/**
 * Stream the pipeline so Slack can show the six agents working, rather than
 * going quiet for 45 seconds. Each `@@AGENT` marker on stdout is one finished
 * agent; `onAgent` renders it by editing a single message in place.
 */
function runPipelineStreaming(onAgent) {
  return new Promise((resolve, reject) => {
    const child = spawn("npx", ["tsx", "--env-file=.env.local", "scripts/run-pipeline.ts", "--save"], {
      cwd: process.cwd(),
    });
    let buf = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      buf += chunk.toString();
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("@@AGENT ")) continue;
        try { onAgent(JSON.parse(line.slice(8))); } catch { /* ignore a partial line */ }
      }
    });
    child.stderr.on("data", (c) => { stderr += c.toString(); });
    child.on("close", (code) => {
      if (code !== 0) return reject(new Error(stderr.slice(-500) || `pipeline exited ${code}`));
      resolve(JSON.parse(readFileSync("fixtures/live-report.json", "utf8")));
    });
  });
}

const VIEW_URL = `${process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"}/?fixture=0`;
import { createCopilotNodeListener } from "@copilotkit/runtime/v2/node";

// Slack workspaces name this emoji differently by locale: :plaster: (en-GB),
// :adhesive_bandage: (en-US), :band-aid: on some clients. Match them all, plus the
// raw character. A too-narrow set here silently rejects a delivered reaction.
const BANDAGE = new Set([
  "adhesive_bandage", "bandage", "plaster", "band-aid", "bandaid", "band_aid", "🩹",
]);
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
  // "platform" leaves evt.user null, so every card read "Announced by: someone".
  // ChannelIdentityContext exposes lookupProfile() for the provider's real profile;
  // fall back through handle then id so a card never shows a blank author.
  identifyUser: async (ctx) => {
    let profile;
    try { profile = await ctx.lookupProfile?.(); } catch { /* keep the fallbacks */ }
    const actor = profile ?? ctx.actor;
    return {
      id: String(ctx.actor?.id ?? "unknown"),
      name: String(actor?.name ?? actor?.handle ?? ctx.actor?.id ?? "someone"),
    };
  },
});

/**
 * The nomination flow. Shared by both triggers (ADR-0004): the 🩹 reaction is the
 * hero gesture, an @patch mention is the fallback. Mentions are what actually
 * deliver today, so the mention path is not a second-class citizen here.
 */
async function handleNomination(evt, { nominator, text, trigger }) {
  console.log(`\n🩹 NOMINATION via ${trigger}`);
  console.log(`   from: ${nominator}`);
  console.log(`   text: ${text.slice(0, 120)}`);

  // The SDK gives us only the mention's own text - MessageRef is opaque and Thread
  // exposes no history - so a bare "@patch it" in a thread carries nothing to read.
  // Say so plainly instead of letting the interpreter fail confusingly.
  if (text.replace(/\s+/g, " ").trim().length < 15) {
    await evt.thread.post(
      "I can only read the message that mentions me, not the one above it. " +
      "Include the change in the mention, for example:\n" +
      "`@patch the approved motor for Project Atlas is now 18.5 kW, not 22 kW`",
    );
    console.log("   text too thin to interpret; asked for the values");
    return;
  }

  try {
    const result = await interpretMessage(text, nominator, "#project-atlas");

    if (result.error) {
      console.log(`   interpreter declined: ${result.error}`);
      await evt.thread.post(
        result.notAChange
          ? "That does not look like a durable fact change, so I have not searched or changed anything."
          : `I could not read a truth change from that message: ${result.error}`,
      );
      return;
    }

    const c = result.change;
    console.log(`   interpreted: ${c.subject} ${c.previousValue} → ${c.newValue} (${c.confidence})`);

    await evt.thread.post(
      confirmationCard({
        change: {
          subject: c.subject,
          previousValue: c.previousValue,
          newValue: c.newValue,
          confidence: c.confidence,
          announcedBy: c.announcedBy ?? nominator,
        },
        onConfirm: async (ctx) => {
          // One message, edited as each agent lands — the guide's pattern for slow
          // work, and it makes the six agents visible instead of a silent 45s gap.
          const done = [];
          const render = () => [
            "*Working…*",
            ...done.map((d) => `✓ ${AGENT_LABEL[d.agent] ?? d.agent} — _${d.summary}_  \`${d.model}\` ${d.ms}ms`),
          ].join("\n");

          const ref = await ctx.thread.post("*Working…*\n_Starting the agents…_");
          let pending = Promise.resolve();

          const report = await runPipelineStreaming((a) => {
            done.push(a);
            console.log(`   [${a.agent}] ${a.ms}ms ${a.model}`);
            // Serialise edits so two fast agents can't race the same message.
            pending = pending.then(() => ctx.thread.update(ref, render()).catch(() => {}));
          });
          await pending;
          await ctx.thread.update(ref, render() + "\n\n*Done.*").catch(() => {});

          await ctx.thread.post(summaryCard({ report, viewUrl: VIEW_URL }));
          console.log(`   pipeline done: ${report.nodes.length} artefacts`);
        },
        onEdit: async (ctx) => {
          await ctx.thread.post("Tell me the corrected previous and new values and I will re-read it.");
        },
        onReject: async (ctx) => {
          await ctx.thread.post("Understood — not treating this as a truth change. Nothing was searched or changed.");
        },
      }),
    );
  } catch (e) {
    console.error("   nomination failed:", e?.message ?? e);
    try { await evt.thread.post(`Something went wrong reading that: ${e?.message ?? e}`); } catch {}
  }
}

const who = (evt) => evt.user?.name ?? evt.actor?.id ?? "someone";
const textOf = (evt) => String(evt.message?.text ?? evt.text ?? "");

channel.onMessage(async (evt) => {
  console.log(`[message] from=${who(evt)} text=${textOf(evt).slice(0, 90)}`);
});

channel.onMention(async (evt) => {
  const text = textOf(evt).replace(/<@[^>]+>/g, "").trim();
  console.log(`[mention] from=${who(evt)} text=${text.slice(0, 90)}`);
  await handleNomination(evt, { nominator: who(evt), text, trigger: "@patch mention" });
});

// The hero gesture, kept registered. ADR-0004: unfiltered handler, rawEmoji match.
channel.onReaction(async (evt) => {
  console.log(`[reaction] emoji=${evt.emoji} raw=${evt.rawEmoji} added=${evt.added}`);
  if (!evt.added) return;
  if (!isNomination(evt.emoji, evt.rawEmoji)) return;
  const text = evt.messageRef?.text ?? textOf(evt) ?? "";
  await handleNomination(evt, { nominator: who(evt), text, trigger: "🩹 reaction" });
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
