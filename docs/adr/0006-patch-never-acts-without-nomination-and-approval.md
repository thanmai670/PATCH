# PATCH never starts on its own and never writes without human approval

Two gates are deliberate product constraints, not unimplemented features. **Nomination:**
PATCH only treats a message as a candidate Truth Change when a human nominates it with
the 🩹 reaction (or an `@PATCH` mention). **Approval:** no write reaches the Ambiguous
workspace without a human-approved Repair Plan.

## Consequences

We explicitly rejected passive monitoring of channels. It demos as "clever" for about
ten seconds and then reads as an agent that will rewrite your CRM because somebody said
"actually, let's meet at 10". The two gates are what let PATCH search and write across a
workspace at all without being alarming.

Say this out loud during the demo — the restraint is the trust argument, and judges
score "agentic experience" on whether the human stays in control, not on how much the
agent does unasked.
