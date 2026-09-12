/**
 * Seed the Meridian Rail Systems workspace. WORKSTREAM A — issue #6.
 *
 *   npm run seed          idempotent: create what's missing, restore stale values
 *   npm run seed:reset    delete and recreate the editable artefacts
 *
 * Content lives in scripts/seed/company.ts, which carries five independent
 * truth-change scenarios so a demo is never tied to one fact.
 *
 * Sent mail is never deleted by --reset. An irreversible artefact the seed can
 * delete would make the demo dishonest about what irreversible means.
 */
import {
  listDocs, createDoc, updateDoc, deleteDoc,
  listTasks, createTask, deleteTask,
  listDeals, createDeal, updateDeal, deleteDeal,
  listSent, sendMail, listDrafts, createDraft,
  listContacts, createContact,
  listWikiSpaces, createWikiSpace, createWikiPage,
  setDocVisibility, createSheet,
  search, idOf, AmbiguousError,
} from "../src/adapters/ambiguous";
import {
  OLD, DOCS, TASKS, COMPANIES, PEOPLE, DEALS, SENT_MAIL, DRAFT_MAIL,
  WIKI_SPACE, WIKI_PAGES, SHEETS,
} from "./seed/company";

const RESET = process.argv.includes("--reset");
const log = (s: string) => console.log(s);
const ok = (label: string, id: string, name: string) =>
  log(`  ${label.padEnd(16)} ${(id || "—").slice(0, 8).padEnd(9)} ${name}`);

/** Never let one failing module abort the rest of the seed. */
async function attempt<T>(what: string, fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch (e) {
    const msg = e instanceof AmbiguousError ? `${e.status} ${e.body.slice(0, 120)}` : String(e);
    log(`  ! ${what}: ${msg}`);
    return null;
  }
}

async function main() {
  if (!process.env.AMBIGUOUS_API_KEY) {
    console.error("AMBIGUOUS_API_KEY not set. Copy .env.example to .env.local and fill it in.");
    process.exit(1);
  }

  log(RESET ? "Resetting Meridian Rail Systems workspace…\n" : "Seeding Meridian Rail Systems workspace…\n");

  /* ── Documents ───────────────────────────────────────────────────────────── */
  log("Documents");
  const existingDocs = (await listDocs()).data ?? [];
  for (const spec of DOCS) {
    const hit = existingDocs.find((d) => d.title === spec.title);
    if (hit && RESET) {
      await attempt("delete doc", () => deleteDoc(hit.id));
      const made = await attempt("create doc", () => createDoc({ type: "doc", title: spec.title, content: spec.content }));
      if (made) ok("recreated", made.id, spec.title);
    } else if (hit) {
      await attempt("restore doc", () => updateDoc(hit.id, { content: spec.content }));
      ok("restored", hit.id, spec.title);
    } else {
      const made = await attempt("create doc", () => createDoc({ type: "doc", title: spec.title, content: spec.content }));
      if (made) ok("created", made.id, spec.title);
    }
  }

  /* ── Sheets ──────────────────────────────────────────────────────────────── */
  log("\nSheets");
  const afterDocs = (await listDocs()).data ?? [];
  for (const sh of SHEETS) {
    const hit = afterDocs.find((d) => d.title === sh.title);
    if (hit && !RESET) { ok("exists", hit.id, sh.title); continue; }
    if (hit && RESET) await attempt("delete sheet", () => deleteDoc(hit.id));
    const [header, ...body] = sh.rows;
    const made = await attempt("create sheet", () => createSheet({
      title: sh.title,
      tabs: [{
        name: "Sheet1",
        columns: header.map((h, i) => ({ id: String.fromCharCode(65 + i), name: h })),
        rows: body.map((r) =>
          Object.fromEntries(r.map((cell, i) => [String.fromCharCode(65 + i), cell])),
        ),
      }],
    }));
    if (made) ok(hit ? "recreated" : "created", made.id, sh.title);
  }

  /* ── Visibility ──────────────────────────────────────────────────────────── */
  // Documents default to `restricted`, owned by their creator. Seeded by the
  // agent, that means a human opening Docs sees an empty workspace.
  log("\nVisibility");
  const all = (await listDocs()).data ?? [];
  // Re-applied every run: `workspace` alone is read-only, and a document seeded
  // before the editor role existed keeps the old grant.
  const mine = all.filter((d: any) => d.owner_username === "patch");
  for (const d of mine) {
    const done = await attempt("set visibility", () => setDocVisibility(d.id, "workspace", "editor"));
    if (done !== null) ok("editable", d.id, d.title);
  }
  if (mine.length === 0) log("  no agent-owned documents found");

  /* ── Tasks ───────────────────────────────────────────────────────────────── */
  log("\nTasks");
  const existingTasks = (await listTasks()).data ?? [];
  for (const t of TASKS) {
    const hit = existingTasks.find((x) => x.title === t.title);
    if (hit && RESET) {
      await attempt("delete task", () => deleteTask(hit.id));
      const made = await attempt("create task", () => createTask(t));
      if (made) ok("recreated", made.id, t.title);
    } else if (hit) {
      ok("exists", hit.id, t.title);
    } else {
      const made = await attempt("create task", () => createTask(t));
      if (made) ok("created", made.id, t.title);
    }
  }

  /* ── CRM ─────────────────────────────────────────────────────────────────── */
  log("\nCRM");
  const existingContacts = (await listContacts()).data ?? [];
  const companyIds = new Map<string, string>();
  for (const c of COMPANIES) {
    const hit = existingContacts.find((x) => x.name === c.name);
    if (hit) { companyIds.set(c.name, hit.id); ok("company exists", hit.id, c.name); continue; }
    const made = await attempt("create company", () => createContact({ type: "company", ...c }));
    if (made) { const id = idOf(made); companyIds.set(c.name, id); ok("company", id, c.name); }
  }
  for (const p of PEOPLE) {
    const hit = existingContacts.find((x) => x.name === p.name);
    if (hit) { ok("person exists", hit.id, p.name); continue; }
    const made = await attempt("create person", () => createContact({
      type: "person", name: p.name, email: p.email, title: p.title,
      company_id: companyIds.get(p.company),
    }));
    if (made) ok("person", idOf(made), p.name);
  }

  const existingDeals = (await listDeals()).data ?? [];
  for (const d of DEALS) {
    const hit = existingDeals.find((x) => x.title === d.title);
    if (hit && RESET) {
      await attempt("delete deal", () => deleteDeal(hit.id));
      const made = await attempt("create deal", () => createDeal(d));
      if (made) ok("recreated deal", made.id, d.title);
    } else if (hit) {
      await attempt("restore deal", () => updateDeal(hit.id, { custom_properties: d.custom_properties }));
      ok("restored deal", hit.id, d.title);
    } else {
      const made = await attempt("create deal", () => createDeal(d));
      if (made) ok("created deal", made.id, d.title);
    }
  }

  /* ── Wiki ────────────────────────────────────────────────────────────────── */
  log("\nWiki");
  const spaces = (await attempt("list spaces", () => listWikiSpaces()))?.data ?? [];
  let spaceId = spaces.find((s) => s.name === WIKI_SPACE.name)?.id;
  if (!spaceId) {
    const made = await attempt("create space", () => createWikiSpace(WIKI_SPACE));
    spaceId = made ? idOf(made) : undefined;
    if (spaceId) ok("space", spaceId, WIKI_SPACE.name);
  } else {
    ok("space exists", spaceId, WIKI_SPACE.name);
  }
  if (spaceId) {
    for (const page of WIKI_PAGES) {
      const made = await attempt("create page", () => createWikiPage(spaceId!, page));
      if (made) ok("page", idOf(made), page.title);
    }
  }

  /* ── Mail ────────────────────────────────────────────────────────────────── */
  log("\nMail");
  const sent = (await listSent()).data ?? [];
  for (const m of SENT_MAIL) {
    const hit = sent.find((x) => x.subject === m.subject);
    if (hit) { ok("sent exists", hit.id, `${m.subject}  (never reset — irreversible)`); continue; }
    const made = await attempt("send mail", () => sendMail(m));
    if (made) ok("sent", made.id, m.subject);
  }
  const drafts = (await attempt("list drafts", () => listDrafts()))?.data ?? [];
  for (const m of DRAFT_MAIL) {
    const hit = drafts.find((x) => x.subject === m.subject);
    if (hit) { ok("draft exists", hit.id, m.subject); continue; }
    const made = await attempt("create draft", () => createDraft(m));
    if (made) ok("draft", idOf(made), m.subject);
  }

  /* ── Prove each scenario is findable ─────────────────────────────────────── */
  log("\nScenario coverage (what the tracer will find)");
  for (const [name, value] of Object.entries(OLD)) {
    const r = await attempt(`search ${value}`, () => search(value));
    log(`  ${name.padEnd(10)} "${value}"`.padEnd(34) + `-> ${r?.total ?? 0} hit(s)`);
  }
  log("\nDone.");
}

main().catch((e) => {
  console.error(e instanceof AmbiguousError ? e.message : e);
  process.exit(1);
});
