/**
 * Meridian Rail Systems — a realistic workspace for PATCH to work against.
 *
 * FIVE independent truth-change scenarios are embedded, so a demo is never tied
 * to one fact. Each appears across several artefact types with DIFFERENT repair
 * dispositions, which is what makes the Contagion View interesting:
 *
 *   1. MOTOR    22 kW      -> 18.5 kW        (spec change)
 *   2. LEADTIME 14 weeks   -> 22 weeks       (supply chain)
 *   3. STANDARD EN 50155:2017 -> EN 50155:2021 (certification)
 *   4. PRICE    EUR 184,000 -> EUR 197,500   (commercial)
 *   5. LEAD     Priya Raman -> Daniel Okafor (people)
 *
 * Each is planted in: an editable draft, a historical as-built, a sent email, a
 * dependent task, and a structured CRM field — so every repair surface fires.
 */

export const OLD = {
  motor: "22 kW",
  leadTime: "14 weeks",
  standard: "EN 50155:2017",
  price: "EUR 184,000",
  lead: "Priya Raman",
};

export const NEW = {
  motor: "18.5 kW",
  leadTime: "22 weeks",
  standard: "EN 50155:2021",
  price: "EUR 197,500",
  lead: "Daniel Okafor",
};

const md = (...lines: string[]) => lines.join("\n");

/* ── Documents ─────────────────────────────────────────────────────────────── */

export const DOCS: { title: string; content: string; historical?: boolean }[] = [
  {
    title: "Project Atlas — Commercial Proposal (Draft v3)",
    content: md(
      "# Project Atlas — Commercial Proposal",
      "",
      "_Draft v3 — not yet issued to the customer._",
      "",
      "**Prepared by:** " + OLD.lead + "  ",
      "**Contract reference:** 44-119",
      "",
      "## 1. Scope",
      "",
      "Supply and commissioning of six traction drive packages for the Atlas fleet",
      "refurbishment, including factory acceptance testing and on-site support.",
      "",
      "## 4.2 Equipment Schedule",
      "",
      `Drive motor: ${OLD.motor}, 400 V, IE3 efficiency class.`,
      `Auxiliary compressor drive: 7.5 kW.`,
      `Control system: certified to ${OLD.standard}.`,
      "",
      "## 5. Commercial Terms",
      "",
      `Package price: ${OLD.price} per unit, ex works.`,
      `Delivery: ${OLD.leadTime} from order confirmation.`,
      "Payment: 30 / 60 / 10 against milestones.",
      "",
      "## 6. Warranty",
      "",
      "24 months from commissioning or 30 months from delivery, whichever is earlier.",
    ),
  },
  {
    title: "Atlas Drivetrain — Technical Specification",
    content: md(
      "# Atlas Drivetrain — Technical Specification",
      "",
      "**Revision:** C  ",
      "**Owner:** Engineering",
      "",
      "## 2.1 Drivetrain Overview",
      "",
      "Primary traction drive: ATX-series, see equipment schedule.",
      `Auxiliary drive: ${OLD.motor} continuous.`,
      "",
      "The auxiliary unit drives the compressor set and is independent of the",
      "primary traction package.",
      "",
      "## 2.4 Compliance",
      "",
      `All electronic equipment shall comply with ${OLD.standard} for rolling stock`,
      "applications, including shock and vibration category B.",
      "",
      "## 3.1 Interfaces",
      "",
      "Motor terminal box orientation to be confirmed against the cable schedule",
      "before the cable pull.",
    ),
  },
  {
    title: "Project Orion — As-Built Documentation (2024)",
    historical: true,
    content: md(
      "# Project Orion — As-Built Documentation",
      "",
      "_Issued 2024-11-08. Records the configuration as actually installed._",
      "",
      "## Drivetrain",
      "",
      `Installed drive motor: ${OLD.motor} (ATX-series).`,
      `Certified to ${OLD.standard}.`,
      "",
      "Commissioned 2024-10-30 and accepted by the customer without deviation.",
      "",
      "## Sign-off",
      "",
      `Project lead: ${OLD.lead}  `,
      "Customer representative: H. Lindqvist",
    ),
  },
  {
    title: "Project Orion — Commissioning Report (2024)",
    historical: true,
    content: md(
      "# Project Orion — Commissioning Report",
      "",
      "_Final, issued 2024-11-02._",
      "",
      `Six drive packages rated ${OLD.motor} were energised and tested to full load.`,
      "No deviations were recorded. Handover accepted on site.",
      "",
      `Delivered ${OLD.leadTime} from order, in line with the contract.`,
    ),
  },
  {
    title: "Project Vega — Tender Response (Draft)",
    content: md(
      "# Project Vega — Tender Response",
      "",
      "_Draft — submission deadline 2026-10-09._",
      "",
      "## Commercial",
      "",
      `Indicative package price: ${OLD.price} per unit.`,
      `Lead time: ${OLD.leadTime} from order confirmation.`,
      "",
      "## Technical",
      "",
      `Equipment certified to ${OLD.standard}.`,
      "Reference project: Atlas (in delivery), Orion (delivered 2024).",
    ),
  },
  {
    title: "Supplier Agreement — ATX Drives (Contract 44-119)",
    content: md(
      "# Supplier Agreement — ATX Drives",
      "",
      "**Contract:** 44-119  ",
      "**Counterparty:** ATX Drive Systems GmbH",
      "",
      "## 3. Delivery",
      "",
      `Standard lead time for series drive packages is ${OLD.leadTime} from order`,
      "confirmation. Expedited delivery is available at a surcharge.",
      "",
      "## 4. Specification",
      "",
      `Series drive package nominal rating: ${OLD.motor}.`,
      `Equipment shall be certified to ${OLD.standard}.`,
      "",
      "## 7. Price",
      "",
      `Unit price: ${OLD.price}, fixed for the contract term.`,
    ),
  },
  {
    title: "Quality Manual — Rolling Stock Compliance",
    content: md(
      "# Quality Manual — Rolling Stock Compliance",
      "",
      "## 4. Applicable Standards",
      "",
      `Electronic equipment for rolling stock: ${OLD.standard}.`,
      "Fire behaviour: EN 45545-2.",
      "Welding: EN 15085-2 CL1.",
      "",
      "## 5. Evidence",
      "",
      "Type test certificates shall be retained for the life of the fleet plus",
      "ten years.",
    ),
  },
  {
    title: "Atlas — Cable Schedule and Sizing Calculations",
    content: md(
      "# Atlas — Cable Schedule and Sizing Calculations",
      "",
      "## Method",
      "",
      "Conductor sizing derived from the approved motor load in the equipment",
      "schedule, with a 1.25 service factor and 40 °C ambient derating.",
      "",
      "## Result",
      "",
      "Traction feed: 4 mm² selected.",
      "Auxiliary feed: 2.5 mm² selected.",
      "",
      "Terminal box orientation to be confirmed before the cable pull.",
    ),
  },
  {
    title: "Atlas — Factory Acceptance Test Plan",
    content: md(
      "# Atlas — Factory Acceptance Test Plan",
      "",
      "## Scope",
      "",
      "Full-load run, insulation resistance, temperature rise, and EMC pre-scan on",
      "each drive package before shipment.",
      "",
      "## Acceptance",
      "",
      `Equipment shall demonstrate compliance with ${OLD.standard}.`,
      "Witnessed by the customer's representative.",
    ),
  },
  {
    title: "Meridian Engineering Standards — Drive Systems",
    content: md(
      "# Meridian Engineering Standards — Drive Systems",
      "",
      "## Selection",
      "",
      "Drive packages shall be selected from the approved supplier list. The",
      `current series rating for refurbishment projects is ${OLD.motor}.`,
      "",
      "## Certification",
      "",
      `All drive electronics shall be certified to ${OLD.standard}.`,
    ),
  },
  {
    title: "Atlas — Risk Register",
    content: md(
      "# Atlas — Risk Register",
      "",
      "| ID | Risk | Owner | Mitigation |",
      "| --- | --- | --- | --- |",
      `| R-01 | Supplier delivery slips beyond ${OLD.leadTime} | ${OLD.lead} | Weekly supplier call |`,
      "| R-02 | Cable schedule invalidated by a late spec change | Electrical lead | Freeze spec at design review |",
      `| R-03 | Certification revision during delivery (${OLD.standard}) | Quality | Monitor standards register |`,
    ),
  },
  {
    title: "Atlas — Project Charter",
    content: md(
      "# Atlas — Project Charter",
      "",
      `**Project lead:** ${OLD.lead}  `,
      "**Sponsor:** Commercial Director  ",
      "**Contract:** 44-119",
      "",
      "## Objective",
      "",
      "Deliver six traction drive packages for the Atlas fleet refurbishment,",
      `within ${OLD.leadTime} of order and at ${OLD.price} per unit.`,
    ),
  },
];

/* ── Tasks ─────────────────────────────────────────────────────────────────── */

export const TASKS = [
  {
    title: "Electrical preparation — Atlas motor mount",
    description: md(
      "Prepare the electrical installation for the Atlas drive motor mount.",
      "",
      "Cable sizing has been derived from the approved motor load in the equipment",
      "schedule; 4 mm2 selected accordingly. Confirm terminal box orientation",
      "before the cable pull.",
    ),
    priority: "high" as const,
  },
  {
    title: "Confirm supplier delivery slot for Atlas drive packages",
    description: md(
      `Supplier agreement 44-119 commits to ${OLD.leadTime} from order confirmation.`,
      "Confirm the slot against the production plan and flag any slippage to the",
      "commercial team.",
    ),
    priority: "high" as const,
  },
  {
    title: "Compliance audit — rolling stock electronics",
    description: md(
      `Verify that all Atlas drive electronics carry a valid ${OLD.standard} type`,
      "test certificate and that evidence is filed against the quality manual.",
    ),
    priority: "medium" as const,
  },
  {
    title: "Submit Vega tender response",
    description: md(
      "Finalise pricing and technical annexes for the Vega tender.",
      `Current indicative price is ${OLD.price} per unit at ${OLD.leadTime} lead time.`,
    ),
    priority: "urgent" as const,
  },
  {
    title: "Schedule Atlas factory acceptance test",
    description: "Agree a witnessed FAT date with the customer once units are on the line.",
    priority: "medium" as const,
  },
  {
    title: "Update cable schedule after design freeze",
    description: md(
      "Re-check conductor sizing against the frozen equipment schedule.",
      "Sizing depends on the approved motor load; any change to the rating",
      "invalidates the current selection.",
    ),
    priority: "medium" as const,
  },
];

/* ── CRM ───────────────────────────────────────────────────────────────────── */

export const COMPANIES = [
  { name: "Nordvik Transit Authority", industry: "Public transport", website: "https://example-nordvik.test" },
  { name: "ATX Drive Systems GmbH", industry: "Drive manufacturing", website: "https://example-atx.test" },
  { name: "Lindqvist Rolling Stock", industry: "Rail operations", website: "https://example-lindqvist.test" },
];

export const PEOPLE = [
  { name: "Hanna Lindqvist", email: "h.lindqvist@customer.example", title: "Head of Fleet Engineering", company: "Nordvik Transit Authority" },
  { name: "Marcus Ebert", email: "m.ebert@supplier.example", title: "Key Account Manager", company: "ATX Drive Systems GmbH" },
  { name: "Priya Raman", email: "p.raman@meridian.example", title: "Project Lead — Atlas", company: "Lindqvist Rolling Stock" },
  { name: "Daniel Okafor", email: "d.okafor@meridian.example", title: "Senior Project Lead", company: "Lindqvist Rolling Stock" },
];

export const DEALS = [
  {
    title: "Atlas Drive Package",
    amount: 184000,
    currency: "EUR",
    custom_properties: {
      motor_rating: OLD.motor,
      lead_time: OLD.leadTime,
      certification: OLD.standard,
      unit_price: OLD.price,
      project_lead: OLD.lead,
      project: "Project Atlas",
      contract: "44-119",
    },
  },
  {
    title: "Orion Drive Package (delivered)",
    amount: 172000,
    currency: "EUR",
    status: "won" as const,
    custom_properties: {
      motor_rating: OLD.motor,
      certification: OLD.standard,
      project: "Project Orion",
      delivered: "2024-10-30",
    },
  },
  {
    title: "Vega Fleet Refurbishment (tender)",
    amount: 1104000,
    currency: "EUR",
    custom_properties: {
      lead_time: OLD.leadTime,
      unit_price: OLD.price,
      certification: OLD.standard,
      project: "Project Vega",
    },
  },
];

/* ── Mail ──────────────────────────────────────────────────────────────────── */

const CUSTOMER = "procurement@meridian-rail.ambi.cc";

export const SENT_MAIL = [
  {
    to: [CUSTOMER],
    subject: "Atlas specification confirmation",
    body_markdown: md(
      "Hello,",
      "",
      `Confirming the drive motor at ${OLD.motor} as specified in the equipment`,
      "schedule for Project Atlas. Please proceed with the interface design on",
      "that basis.",
      "",
      `The equipment is certified to ${OLD.standard}.`,
      "",
      "Kind regards,",
      `${OLD.lead}`,
      "Meridian Rail Systems",
    ),
  },
  {
    to: [CUSTOMER],
    subject: "Atlas delivery commitment and pricing",
    body_markdown: md(
      "Hello,",
      "",
      `Confirming delivery at ${OLD.leadTime} from order confirmation, at`,
      `${OLD.price} per unit as quoted.`,
      "",
      "We will confirm the factory acceptance test date once the units are on the",
      "line.",
      "",
      "Kind regards,",
      `${OLD.lead}`,
      "Meridian Rail Systems",
    ),
  },
];

export const DRAFT_MAIL = [
  {
    to: [CUSTOMER],
    subject: "Atlas — factory acceptance test scheduling",
    body_markdown: md(
      "Hello,",
      "",
      "We would like to propose a witnessed factory acceptance test for the Atlas",
      `drive packages, rated ${OLD.motor}, in the week commencing 2026-10-19.`,
      "",
      "Kind regards,",
      `${OLD.lead}`,
    ),
  },
];

/* ── Wiki ──────────────────────────────────────────────────────────────────── */

export const WIKI_SPACE = {
  name: "Engineering",
  description: "Standards, supplier directory and drive-system guidance.",
};

export const WIKI_PAGES = [
  {
    title: "Drive Systems — Selection Guidance",
    content_markdown: md(
      "# Drive Systems — Selection Guidance",
      "",
      `The current series rating for refurbishment projects is **${OLD.motor}**.`,
      "Deviations require sign-off from the engineering lead.",
      "",
      `Drive electronics must be certified to **${OLD.standard}**.`,
    ),
  },
  {
    title: "Compliance Standards Register",
    content_markdown: md(
      "# Compliance Standards Register",
      "",
      "| Domain | Standard | Status |",
      "| --- | --- | --- |",
      `| Rolling stock electronics | ${OLD.standard} | Current |`,
      "| Fire behaviour | EN 45545-2 | Current |",
      "| Welding | EN 15085-2 CL1 | Current |",
    ),
  },
  {
    title: "Supplier Directory",
    content_markdown: md(
      "# Supplier Directory",
      "",
      "## ATX Drive Systems GmbH",
      "",
      "Contract 44-119. Key account: Marcus Ebert.  ",
      `Standard lead time: ${OLD.leadTime}. Series rating: ${OLD.motor}.`,
    ),
  },
  {
    title: "Project Directory",
    content_markdown: md(
      "# Project Directory",
      "",
      `| Project | Status | Lead |`,
      "| --- | --- | --- |",
      `| Atlas | In delivery | ${OLD.lead} |`,
      `| Orion | Delivered 2024 | ${OLD.lead} |`,
      "| Vega | Tender | Commercial |",
    ),
  },
];
