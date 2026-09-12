/**
 * Seed the Ambiguous workspace with the six Project Atlas artefacts, all carrying 22 kW.
 * WORKSTREAM A — issue #6.
 *
 *   npm run seed          create if absent
 *   npm run seed:reset    delete and recreate — you WILL need this at minute 165
 *
 * Mirror fixtures/atlas-infection.json exactly: draft proposal, CRM deal, electrical
 * task, sent customer email, Orion as-built (historical), Atlas drivetrain spec.
 */
const RESET = process.argv.includes("--reset");

async function main() {
  if (!process.env.AMBIGUOUS_API_KEY) {
    console.error("AMBIGUOUS_API_KEY not set — copy .env.example to .env.local and fill it in.");
    process.exit(1);
  }
  console.log(RESET ? "Resetting workspace…" : "Seeding workspace…");
  // TODO(#6): implement against src/adapters/ambiguous.ts
  console.error("Not implemented yet — see issue #6.");
  process.exit(1);
}

main();
