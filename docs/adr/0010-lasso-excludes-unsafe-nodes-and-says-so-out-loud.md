# Lasso selection excludes nodes needing review, and announces the exclusion

Dragging a lasso over the map selects only nodes that are `disposition === "editable"`
**and** `requiresHumanReview === false`. Everything else visibly drops out of the
selection and the view states the count: "2 safe · 4 excluded — review individually".
Excluded nodes remain individually selectable by clicking them deliberately.

## Considered options

Selecting everything and requiring a per-node tick to confirm was rejected: it turns the
safety check into four clicks that a presenter will speed-run on stage, which is the
opposite of the guarantee.

Making unsafe nodes silently inert was rejected because the exclusion is the point. ADR-0006
says the restraint *is* the trust argument; restraint nobody is told about scores nothing.

## Consequences

The batch-approve path can never touch an irreversible or historical artefact, which
means `RepairPlan` built from a lasso is safe by construction rather than by validation.
