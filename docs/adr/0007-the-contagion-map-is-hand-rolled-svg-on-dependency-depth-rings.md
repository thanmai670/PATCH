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

We give up pan and zoom. With six artefacts on a fixed 1440×900 stage that costs nothing.
If the count ever grows past ~15 this decision should be revisited, because ring layout
degenerates into overlapping siblings.

**Amended:** this originally gave up node dragging too. Dragging turned out to cost
nothing to add on top of hand-rolled SVG — a per-artefact offset applied to the computed
position — and it is how people expect to untangle a graph, so it is now supported. A
dragged artefact is clamped to the visible canvas so one can never be lost off an edge,
and "Put them back" restores the computed layout. The layout algorithm remains the
source of truth; dragging only offsets from it.
