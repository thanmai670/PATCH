/**
 * Seed the Ambiguous workspace with the six Project Atlas artefacts, all carrying 22 kW.
 * WORKSTREAM A — issue #6.
 *
 *   npm run seed          idempotent: creates what's missing, restores 22 kW on what exists
 *   npm run seed:reset    deletes the seeded docs/task/deal and recreates them
 *
 * These mirror fixtures/atlas-infection.json so a live run and the fixture tell the
 * same story on stage.
 *
 * The sent email is deliberately NOT deleted by --reset. It is the irreversible
 * artefact: if the seed could delete it, the demo would be lying about what
 * irreversible means.
 */
import {
  listDocs, createDoc, updateDoc, deleteDoc,
  listTasks, createTask, deleteTask,
  listDeals, createDeal, updateDeal, deleteDeal,
  listSent, sendMail,
  search, AmbiguousError,
} from "../src/adapters/ambiguous";

const RESET = process.argv.includes("--reset");
const OLD = "22 kW";

/** Recipient on the workspace's own domain — routes internally, never bounces externally. */
const CUSTOMER = "procurement@meridian-rail.ambi.cc";

const DOCS = [
  {
    key: "proposal",
    title: "Project Atlas — Commercial Proposal (Draft v3)",
    content: [
      "# Project Atlas — Commercial Proposal",
      "",
      "_Draft v3 — not yet issued to the customer._",
      "",
      "## 4.2 Equipment Schedule",
      "",
      `Drive motor: ${OLD}, 400 V, IE3 efficiency class.`,
      "",
      `The drive package is rated at ${OLD} continuous duty and is supplied under`,
      "contract 44-119.",
      "",
      "## 4.3 Commercial Terms",
      "",
      "Delivery 14 weeks from order. Payment 30/60/10.",
    ].join("\n"),
  },
  {
    key: "orion",
    title: "Project Orion — As-Built Documentation (2024)",
    content: [
      "# Project Orion — As-Built Documentation",
      "",
      "_Issued 2024-11-08. Records the configuration as actually installed._",
      "",
      "## Drivetrain",
      "",
      `Installed drive motor: ${OLD} (ATX-series).`,
      "",
      "Commissioned 2024-10-30 and accepted by the customer without deviation.",
    ].join("\n"),
  },
  {
    key: "techspec",
    title: "Atlas Drivetrain — Technical Specification",
    content: [
      "# Atlas Drivetrain — Technical Specification",
      "",
      "## 2.1 Drivetrain Overview",
      "",
      "Primary drive: ATX-series, see equipment schedule.",
      `Auxiliary drive: ${OLD} continuous.`,
      "",
      "The auxiliary unit drives the compressor set and is independent of the",
      "primary traction package.",
    ].join("\n"),
  },
];

/** Exposed, not infected: depends on the motor rating without naming it. */
const TASK = {
  title: "Electrical preparation — Atlas motor mount",
  description: [
    "Prepare the electrical installation for the Atlas drive motor mount.",
    "",
    "Cable sizing has been derived from the approved motor load in the equipment",
    "schedule; 4 mm2 selected accordingly. Confirm terminal box orientation before",
    "the cable pull.",
  ].join("\n"),
  priority: "high" as const,
};

const DEAL = {
  title: "Atlas Drive Package",
  amount: 184000,
  currency: "EUR",
  custom_properties: { motor_rating: OLD, project: "Project Atlas", contract: "44-119" },
};

const MAIL = {
  to: [CUSTOMER],
  subject: "Atlas specification confirmation",
  body_markdown: [
    "Hello,",
    "",
    `Confirming the drive motor at ${OLD} as specified in the equipment schedule`,
    "for Project Atlas. Please proceed with the interface design on that basis.",
    "",
    "Kind regards,",
    "Meridian Rail Systems",
  ].join("\n"),
};

const log = (s: string) => console.log(s);

async function main() {
  if (!process.env.AMBIGUOUS_API_KEY) {
    console.error("AMBIGUOUS_API_KEY not set. Copy .env.example to .env.local and fill it in.");
    process.exit(1);
  }

  log(RESET ? "Resetting Project Atlas seed data…\n" : "Seeding Project Atlas artefacts…\n");

  /* ── Documents ─────────────────────────────────────────────────────────── */
  const existingDocs = (await listDocs()).data ?? [];
  for (const spec of DOCS) {
    const hit = existingDocs.find((d) => d.title === spec.title);
    if (hit && RESET) {
      await deleteDoc(hit.id);
      const made = await createDoc({ type: "doc", title: spec.title, content: spec.content });
      log(`  recreated doc   ${made.id}  ${spec.title}`);
    } else if (hit) {
      await updateDoc(hit.id, { content: spec.content });
      log(`  restored doc    ${hit.id}  ${spec.title}`);
    } else {
      const made = await createDoc({ type: "doc", title: spec.title, content: spec.content });
      log(`  created doc     ${made.id}  ${spec.title}`);
    }
  }

  /* ── Task ──────────────────────────────────────────────────────────────── */
  const existingTasks = (await listTasks()).data ?? [];
  const taskHit = existingTasks.find((t) => t.title === TASK.title);
  if (taskHit && RESET) {
    await deleteTask(taskHit.id);
    const made = await createTask(TASK);
    log(`  recreated task  ${made.id}  ${TASK.title}`);
  } else if (taskHit) {
    log(`  task exists     ${taskHit.id}  ${TASK.title}`);
  } else {
    const made = await createTask(TASK);
    log(`  created task    ${made.id}  ${TASK.title}`);
  }

  /* ── CRM deal ──────────────────────────────────────────────────────────── */
  const existingDeals = (await listDeals()).data ?? [];
  const dealHit = existingDeals.find((d) => d.title === DEAL.title);
  if (dealHit && RESET) {
    await deleteDeal(dealHit.id);
    const made = await createDeal(DEAL);
    log(`  recreated deal  ${made.id}  ${DEAL.title}`);
  } else if (dealHit) {
    await updateDeal(dealHit.id, { custom_properties: DEAL.custom_properties });
    log(`  restored deal   ${dealHit.id}  ${DEAL.title}  (motor_rating -> ${OLD})`);
  } else {
    const made = await createDeal(DEAL);
    log(`  created deal    ${made.id}  ${DEAL.title}`);
  }

  /* ── Sent mail — never deleted, only created if absent ─────────────────── */
  const sent = (await listSent()).data ?? [];
  const mailHit = sent.find((m) => m.subject === MAIL.subject);
  if (mailHit) {
    log(`  mail exists     ${mailHit.id}  ${MAIL.subject}  (never reset — irreversible by design)`);
  } else {
    try {
      const made = await sendMail(MAIL);
      log(`  sent mail       ${made.id}  ${MAIL.subject}`);
    } catch (e) {
      const msg = e instanceof AmbiguousError ? `${e.status} ${e.body.slice(0, 200)}` : String(e);
      log(`  ! mail send failed: ${msg}`);
      log(`    The other five artefacts are fine. Fix the recipient and re-run.`);
    }
  }

  /* ── Prove the tracer will find them ───────────────────────────────────── */
  log("\nVerifying via cross-module search…");
  const found = await search(OLD);
  log(`  search("${OLD}") -> ${found.total} hit(s)`);
  for (const h of found.data.slice(0, 10)) {
    log(`    [${h.module}] ${h.title ?? h.id}`);
  }
  if (found.total === 0) {
    log("  ! search returned nothing — indexing may lag; re-run in a few seconds.");
  }
  log("\nDone.");
}

main().catch((e) => {
  console.error(e instanceof AmbiguousError ? e.message : e);
  process.exit(1);
});
