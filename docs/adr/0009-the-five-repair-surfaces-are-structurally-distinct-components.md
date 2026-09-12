# The five Repair Surfaces are structurally distinct components, and two of them refuse

This is the thesis of the product, so it is recorded as a decision rather than left to
taste: the five Repair Surfaces do not share a layout frame. Each is its own component
with its own structure and its own controls — not one modal parameterised by text.

`corrective_message` and `preservation_notice` **visibly refuse to do the normal thing**.
Neither renders an apply-the-change control *at all*, because that control does not exist
for them: an irreversible artefact opens with "cannot be repaired silently" above its
recipient list and offers only a drafted correction; a historical artefact shows its text
greyed and locked and offers only an annotation.

## Considered options

A shared frame with per-surface button sets was rejected despite being much faster to
build. It produces exactly the "one modal with different text" that makes the generated-UI
claim hand-waving, and a judge cannot tell the difference between that and a switch
statement over labels.

Per-surface background tints were rejected as gaudy next to the dark map.

## Consequences

Five components means five things to style and no shared layout to fix a bug in once.
That duplication is deliberate — a future reader who DRYs these into one component with a
`variant` prop deletes the product's argument. The refusal in the two constrained surfaces
is also the third of the three safeguards judges are told to look for (ADR-0002 fixture,
`docs/ARCHITECTURE.md`), so it must survive any refactor.
