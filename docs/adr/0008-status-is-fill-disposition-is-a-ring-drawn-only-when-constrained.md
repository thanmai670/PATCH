# Infection status is the node's fill; repair disposition is a ring drawn only when constrained

ADR-0001 made status and disposition two independent axes. This decides how they are
*seen*. **Infection status is the node's fill and glow** (infected red, exposed amber,
immune green) because status is what decides whether a node lights up at all. **Repair
disposition is a ring outside the node, and `editable` draws no ring** — only
`historical` (violet) and `irreversible` (pink) mark themselves.

`matchKind` is carried by the **edge** stroke (exact solid, semantic dashed, inferred
dotted), never by the node. `requiresHumanReview` is a single amber dot on the node's
upper-right.

## Considered options

Giving every node a disposition icon — pencil / padlock / paper-plane — was rejected.
Four of the six fixture nodes are `editable`, so four pencils would say "nothing special
here" in ink, and the two nodes that actually carry a constraint would stop standing out.
Silence is the correct encoding for the unconstrained majority.

Encoding disposition as node *shape* was rejected: shape is coarse at small sizes and
the uniform circles are what make the map read as cells spreading an infection.

## Consequences

Absence of a ring is meaningful, which is only legible with a legend. The Contagion View
must always show one. A future reader who adds an `editable` ring "for consistency"
destroys the signal — don't.
