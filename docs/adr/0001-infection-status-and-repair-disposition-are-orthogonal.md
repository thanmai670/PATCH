# Infection status and repair disposition are two axes, not one enum

The original concept listed `Infected | Exposed | Immune | Historical | Irreversible`
as a single classification. It isn't one: a sent customer email is *infected* (it
literally contains "22 kW") **and** *irreversible* (we cannot edit it), and the Orion
as-built document is *infected* **and** *historical*. We split it into
**infection status** (`infected | exposed | immune`) and **repair disposition**
(`editable | historical | irreversible`).

## Consequences

This is what makes "the interface is generated around the remediation" mechanical
rather than hand-waved. Status decides whether a node lights up in the map;
disposition selects the Repair Surface. Both dimensions appear in `InfectionNode`
and the Classifier agent must emit both.

Hard to reverse: the pair is baked into the contract schema, the fixture, the map
colouring, and the surface-selection logic on both sides of the split.
