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
import {
  confirmationCard, summaryCard, auditCard, modelPickerCard, modelSetCard,
  workspaceChangeCard, deniedCard, roleCard,
} from "../src/channels/cards.mjs";
import { can, describeRole, adminsFor, identityOf, loadConfig } from "../src/channels/authz.mjs";
import { writeFileSync } from "node:fs";

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

const PENDING_PATH = ".patch-pending.json";
const WATCH_INTERVAL_MS = Number(process.env.WORKSPACE_POLL_MS ?? 30_000);

const readPending = () => {
  try { return JSON.parse(readFileSync(PENDING_PATH, "utf8")); } catch { return []; }
};
const writePending = (v) => writeFileSync(PENDING_PATH, JSON.stringify(v, null, 2));

/**
 * Ambiguous as a SOURCE: poll the workspace for edited documents. The detector
 * only NOMINATES - it writes candidates and announces them in workspace chat.
 * A human still confirms in Slack before anything is searched or written
 * (ADR-0006), which is what keeps this from being an agent that rewrites your
 * CRM because someone fixed a typo.
 */
function startWorkspaceWatch() {
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      const { stdout } = await run(
        "npx", ["tsx", "--env-file=.env.local", "scripts/detect-edits.ts"],
        { cwd: process.cwd(), maxBuffer: 1024 * 1024 * 8 },
      );
      const found = stdout.split("\n").filter((l) => l.includes("-> truth change"));
      if (found.length) console.log(`[workspace] ${found.length} detection(s); say "@patch changes" in Slack`);
    } catch (e) {
      console.error("[workspace] detect failed:", String(e?.message ?? e).slice(0, 160));
    } finally {
      running = false;
    }
  };
  setInterval(tick, WATCH_INTERVAL_MS);
  console.log(`workspace watch: polling every ${WATCH_INTERVAL_MS / 1000}s`);
}

const OVERRIDE_PATH = ".patch-models.json";
const DEFAULT_MODELS = {
  interpreter: "anthropic/claude-sonnet-4.5",
  evidence: "openai/gpt-4o-mini",
  tracer: "n/a",
  classifier: "anthropic/claude-sonnet-4.5",
  planner: "anthropic/claude-sonnet-4.5",
  executor: "openai/gpt-4o-mini",
};

const readOverrides = () => {
  try { return JSON.parse(readFileSync(OVERRIDE_PATH, "utf8")); } catch { return {}; }
};
const currentModels = () => ({ ...DEFAULT_MODELS, ...readOverrides() });

/** Cache the catalogue — 445 models is a slow fetch to repeat per card. */
let modelCache = null;
async function jsonCapableModels() {
  if (modelCache) return modelCache;
  const res = await fetch("https://openrouter.ai/api/v1/models", {
    headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}` },
  });
  const { data } = await res.json();
  const majors = ["openai/", "anthropic/", "google/", "meta-llama/", "mistralai/", "deepseek/", "qwen/", "x-ai/"];
  // Buttons can only show a handful, so the order decides what people actually
  // see. Alphabetical put an arbitrary slice in front; this leads with models
  // worth routing an agent to, then everything else alphabetically.
  const PREFERRED = [
    "anthropic/claude-sonnet-4.5",
    "anthropic/claude-haiku-4.5",
    "openai/gpt-4o-mini",
    "openai/gpt-4o",
    "google/gemini-2.5-flash",
    "deepseek/deepseek-chat",
    "qwen/qwen-2.5-72b-instruct",
    "x-ai/grok-2-1212",
    "mistralai/mistral-large",
    "meta-llama/llama-3.3-70b-instruct",
  ];
  const rank = (id) => {
    const i = PREFERRED.indexOf(id);
    return i === -1 ? PREFERRED.length : i;
  };
  modelCache = data
    // Agents demand JSON and validate with Zod; a model without JSON mode fails
    // schema validation twice and aborts the run, so never offer one.
    .filter((m) => (m.supported_parameters ?? []).includes("response_format"))
    .filter((m) => majors.some((x) => m.id.startsWith(x)) && !m.id.startsWith("~"))
    .sort((a, b) => rank(a.id) - rank(b.id) || a.id.localeCompare(b.id));
  return modelCache;
}

const AGENT_NAMES = ["interpreter", "evidence", "classifier", "planner", "executor"];

/** Set one agent, or all of them, and report it. Shared by the card and the text command. */
async function applyModel(target, model, post) {
  const models = await jsonCapableModels();
  const meta = models.find((m) => m.id === model);
  if (!meta) {
    const near = models.filter((m) => m.id.includes(model.split("/").pop() ?? model)).slice(0, 8);
    await post(
      `I do not have \`${model}\` in the JSON-capable list.` +
      (near.length ? `\n\nDid you mean:\n${near.map((m) => `• \`${m.id}\``).join("\n")}` : ""),
    );
    return false;
  }
  const overrides = readOverrides();
  if (target === "__all__") for (const a of AGENT_NAMES) overrides[a] = model;
  else overrides[target] = model;
  writeFileSync(OVERRIDE_PATH, JSON.stringify(overrides, null, 2));
  console.log(`   model set: ${target} -> ${model}`);
  await post(modelSetCard({ agent: target, model, pricing: meta.pricing }));
  return true;
}

/** Which agent a subsequent model pick applies to. Per Slack thread. */
const pickScope = new Map();

async function showModelPicker(evt, threadKey) {
  const models = await jsonCapableModels();
  const agent = pickScope.get(threadKey) ?? "__all__";
  await evt.thread.post(
    modelPickerCard({
      current: currentModels(),
      models,
      agent: agent === "__all__" ? null : agent,
      onPickAgent: async (ctx) => {
        const chosen = String(ctx.action.value);
        pickScope.set(threadKey, chosen);
        await ctx.thread.post(
          chosen === "__all__"
            ? "Next model pick applies to *all agents*."
            : `Next model pick applies to *${chosen}*.`,
        );
      },
      onPick: async (ctx) => {
        if (!(await requires(ctx, "change_models", "Changing model routing"))) return;
        await applyModel(pickScope.get(threadKey) ?? "__all__", String(ctx.action.value), (m) => ctx.thread.post(m));
      },
    }),
  );
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
function runPipelineStreaming(onAgent, { text, author } = {}) {
  return new Promise((resolve, reject) => {
    const args = ["tsx", "--env-file=.env.local", "scripts/run-pipeline.ts", "--save"];
    if (text) args.push("--text", text);
    if (author) args.push("--author", author);
    const child = spawn("npx", args, { cwd: process.cwd() });
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
  if (!(await requires(evt, "nominate", "Nominating a truth change"))) return;
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
          if (!(await requires(ctx, "confirm", "Confirming a truth change"))) return;
          // One message, edited as each agent lands — the guide's pattern for slow
          // work, and it makes the six agents visible instead of a silent 45s gap.
          const done = [];
          const render = () => [
            "*Working…*",
            ...done.map((d) => `✓ ${AGENT_LABEL[d.agent] ?? d.agent} — _${d.summary}_  \`${d.model}\` ${d.ms}ms`),
          ].join("\n");

          const ref = await ctx.thread.post("*Working…*\n_Starting the agents…_");
          let pending = Promise.resolve();

          // Run the pipeline on what the human actually nominated, not a fixture.
          const report = await runPipelineStreaming((a) => {
            done.push(a);
            console.log(`   [${a.agent}] ${a.ms}ms ${a.model}`);
            // Serialise edits so two fast agents can't race the same message.
            pending = pending.then(() => ctx.thread.update(ref, render()).catch(() => {}));
          }, { text, author: c.announcedBy ?? nominator });
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

const who = (evt) => {
  const i = identityOf(evt);
  return i.name ?? i.id ?? "someone";
};

/**
 * Gate one action. Viewing is never gated - the whole point is that the team can
 * see where a stale fact spread. Acting is gated, because starting a search or
 * causing a write should not follow from merely being in the channel.
 */
async function requires(evt, perm, label) {
  const id = identityOf(evt);
  if (can(id, perm)) return true;
  console.log(`   denied: ${who(evt)} (${describeRole(id)}) tried ${perm}`);
  await evt.thread.post(deniedCard({ action: label, role: describeRole(id), admins: adminsFor(perm) }));
  return false;
}
const textOf = (evt) => String(evt.message?.text ?? evt.text ?? "");

channel.onMessage(async (evt) => {
  console.log(`[message] from=${who(evt)} text=${textOf(evt).slice(0, 90)}`);
});

channel.onMention(async (evt) => {
  const text = textOf(evt).replace(/<@[^>]+>/g, "").trim();
  console.log(`[mention] from=${who(evt)} text=${text.slice(0, 90)}`);

  if (/^(whoami|who am i|my role|permissions?|roles?)/i.test(text)) {
    const id = identityOf(evt);
    const role = describeRole(id);
    const perms = Object.fromEntries(
      ["nominate", "confirm", "approve_repairs", "change_models", "dismiss"].map((p) => [p, can(id, p)]),
    );
    const cfg = loadConfig();
    const roster = Object.entries(cfg.roles ?? {}).map(([r, v]) => ({ role: r, members: v.members ?? [] }));
    console.log(`   -> whoami: ${who(evt)} is ${role}`);
    await evt.thread.post(
      roleCard({ identity: id, role, permissions: perms, roster, isAdmin: role.includes("admin") }),
    );
    return;
  }

  if (/^(changes?|workspace|what.?s changed|pending)/i.test(text)) {
    const pending = readPending();
    console.log(`   -> workspace changes (${pending.length} pending)`);
    if (pending.length === 0) {
      await evt.thread.post("No workspace edits are waiting. I am watching Ambiguous and will flag one when it looks like a truth change.");
      return;
    }
    await evt.thread.post(
      workspaceChangeCard({
        detections: pending,
        onDismiss: async (ctx) => {
          if (!(await requires(ctx, "dismiss", "Dismissing workspace detections"))) return;
          writePending([]);
          await ctx.thread.post("Dismissed. Nothing was searched or changed.");
        },
        onNominate: async (ctx) => {
          const id = String(ctx.action.value);
          if (!(await requires(ctx, "nominate", "Nominating a workspace edit"))) return;
          const d = readPending().find((x) => x.id === id);
          if (!d) { await ctx.thread.post("That detection is no longer pending."); return; }
          writePending(readPending().filter((x) => x.id !== id));
          await handleNomination(ctx, {
            nominator: who(ctx),
            text: `The document "${d.docTitle}" was edited: ${d.subject} changed from ${d.previousValue} to ${d.newValue}.`,
            trigger: "Ambiguous workspace edit",
          });
        },
      }),
    );
    return;
  }

  const use = text.match(/^use\s+(\S+)(?:\s+(\S+))?/i);
  if (use) {
    if (!(await requires(evt, "change_models", "Changing model routing"))) return;
    const [, a, b] = use;
    const target = b && AGENT_NAMES.includes(a.toLowerCase()) ? a.toLowerCase() : "__all__";
    const model = b && AGENT_NAMES.includes(a.toLowerCase()) ? b : a;
    console.log(`   -> use ${target} ${model}`);
    await applyModel(target, model, (m) => evt.thread.post(m));
    return;
  }

  if (/^(models?|model routing|which model)/i.test(text)) {
    console.log("   -> model picker");
    if (!(await requires(evt, "change_models", "Changing model routing"))) return;
    try {
      await showModelPicker(evt, evt.messageId ?? "default");
      const picks = await jsonCapableModels();
      const shortlist = [
        "anthropic/claude-sonnet-4.5", "anthropic/claude-haiku-4.5",
        "openai/gpt-4o", "openai/gpt-4o-mini",
        "google/gemini-2.5-flash", "deepseek/deepseek-chat",
        "qwen/qwen-2.5-72b-instruct", "x-ai/grok-2-1212",
      ].filter((id) => picks.some((m) => m.id === id));
      await evt.thread.post(
        "*Or just type it* — the dropdown above may not be interactive on every Slack surface.\n\n" +
        "`@patch use <model>` for all agents, or `@patch use <agent> <model>` for one.\n\n" +
        shortlist.map((id) => `• \`@patch use ${id}\``).join("\n") +
        `\n\n_Agents: ${AGENT_NAMES.join(", ")}. ${picks.length} models available._`,
      );
    } catch (e) {
      console.error("   picker failed:", e?.message ?? e);
      await evt.thread.post(`Could not load the model list: ${e?.message ?? e}`);
    }
    return;
  }

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

startWorkspaceWatch();
console.log(`channel "${CHANNEL_NAME}" declared; waiting for activation…`);
await listener.channels.ready({ timeoutMs: 30_000 });
console.log("✓ channel ONLINE — react 🩹 on a message in #project-atlas now\n");
