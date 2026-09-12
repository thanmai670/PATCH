# The Contagion View map is hand-rolled SVG laid out on dependency-depth rings

`reactflow` is in `package.json`, so a future reader will assume the map is built on it.
It isn't. The map is plain SVG: a node's **radius** is its depth in the `dependsOn`
graph from Patient Zero, and its **angle** is spread evenly among the siblings in that
ring. The spread animation is a wave outward — each ring ignites ~450ms after the one
inside it, with the edge drawing itself (`stroke-dashoffset`) just before the node it
feeds lights up.

## Considered options

A single ring with all six nodes at equal angles was rejected: `dependsOn` edges then
cross the middle as chords and the picture stops reading as spread *from a centre*,
which is the whole metaphor.

`reactflow` was rejected for the ignite wave specifically. Pan/zoom and edge routing
come free, but the 1.5-second outward wave is the moment the demo is built around and
it fights reactflow's render model. Hand-rolled SVG gives that moment directly.

## Consequences

We give up pan/zoom and node dragging. With six nodes on a fixed 1440×900 stage layout
that costs nothing. If the node count ever grows past ~15 this decision should be
revisited, because depth-ring layout degenerates into overlapping siblings.
