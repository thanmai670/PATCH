# PATCH — Domain Glossary

The shared language for this project. If a term is in here, use it exactly — in code,
in issue titles, in the UI, and on stage. If you need a concept that isn't here, add it.

This file is a glossary and nothing else. No implementation details.

---

## Truth Change

A confirmed change to a canonical fact. Has a **subject**, a **previous value**, a
**new value**, and a confidence score.

A Truth Change is *not* every correction someone types in chat. "Let's meet at 10
instead of 11" is not a Truth Change. It becomes one only when a human explicitly
nominates it — see **Nomination**.

## Nomination

The human gesture that promotes a message to a candidate Truth Change. In PATCH the
canonical gesture is the 🩹 reaction; mentioning the bot is the fallback.

Nomination matters because it is what keeps PATCH from being an agent that reacts
noisily to every disagreement. **PATCH never begins repairs autonomously.**

## Patient Zero

The artefact where the Truth Change was announced — for us, the nominated Slack
message. It is the centre node of the Contagion View. It is an origin, not a target:
Patient Zero is never repaired.

## Artefact

Any workspace object that may carry or depend on a fact: a document, a CRM record, a
task, a sent email, a draft email, a historical document.

## Infection Status

**Axis 1 — does this artefact carry the stale fact?** Exactly one of:

- **Infected** — contains the stale value *literally*.
- **Exposed** — depends on the fact semantically, without containing it literally.
  A cable-sizing task that never says "22 kW" but was calculated from it is Exposed.
- **Immune** — checked and still correct.

Infection Status decides whether a node lights up in the map.

## Repair Disposition

**Axis 2 — what are we permitted to do about it?** Exactly one of:

- **Editable** — safe to modify in place.
- **Historical** — was accurate when written; preserve it and annotate. Never edit.
- **Irreversible** — already sent or published. Cannot be silently repaired; requires
  a corrective action instead.

Repair Disposition decides which Repair Surface is generated.

> **These two axes are independent.** A sent customer email is Infected *and*
> Irreversible. A 2024 as-built document is Infected *and* Historical. Collapsing
> them into one enum loses information — see ADR-0001.

## Match Kind

How the Tracer linked an artefact to the Truth Change, and therefore how much to
trust it: **exact** (literal string hit), **semantic** (meaning match, no literal),
**inferred** (agent reasoning only — lowest trust, always shown as such).

## Repair Surface

The generated interface for repairing one artefact. Not a generic modal — the surface
is chosen from the artefact's kind and disposition. Five exist:

| Surface | Generated when |
| --- | --- |
| **Document Diff** | Editable prose containing the stale literal |
| **Field Change** | A structured record field (CRM) |
| **Dependency Decision** | Exposed artefact whose downstream work may break |
| **Corrective Message** | Irreversible artefact already delivered to someone |
| **Preservation Notice** | Historical artefact that must not change |

## Repair Plan

The set of repairs a human has approved, awaiting execution. Nothing is written to the
workspace without an approved Repair Plan.

## Safe Set

The subset of a report's artefacts that may be repaired as one batch without individual
human judgement: **Editable** and not flagged for human review. The Safe Set is what a
lasso selection resolves to; everything outside it is repaired one artefact at a time.

## Unconfirmed Repair

A repair the human has approved but which has not yet been written to the workspace —
because the executor has not run, or could not be reached. It is approved, not applied.
The distinction is permanent vocabulary, not a loading state: an approved Repair Plan and
a completed one are different claims and the interface must never blur them.

## Evidence

External or internal support for a Truth Change, carrying a **source status** of
**live**, **cached**, or **unverified**. Evidence *informs*; it never decides.
Evidence may also **contradict** a change — a contradicting source is displayed, not
hidden.

## Contagion View

The interactive infection map. The interface where a human understands the spread and
approves repairs. Contagion View is the name of the interface; PATCH is the product.

## Audit Record

What changed, why, on which evidence, approved by whom. Written back to the Slack
thread where the Truth Change was nominated, so the conversation holds the full
lifecycle: announcement → verification → impact → decision → action → audit.
