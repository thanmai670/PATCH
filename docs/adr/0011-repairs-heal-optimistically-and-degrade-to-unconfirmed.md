# Approved repairs heal optimistically and degrade to "unconfirmed", never to an error

On approve, nodes turn green **immediately**, before any request resolves. If the
`POST /api/repair` call then fails — or there is no network at all — the nodes keep their
green and each gains a small grey "not yet written to workspace" marker, with one quiet
line in the footer. Nothing turns red, nothing blocks, nothing disappears.

## Considered options

Waiting for the response and colouring green-or-red on the result is the honest UI, and it
was rejected on purpose: it makes the heal animation — the demo's closing moment — depend
on conference wifi and on Workstream A's route being live. ADR-0002 already committed to a
demo that runs with the network cable unplugged; a heal that needs the network contradicts it.

Never calling the network at all was rejected as the opposite failure: the plan must really
be `POST`ed so that A's executor works the moment it exists.

## Consequences

The green state means "approved", not "written". That distinction has to stay visible, which
is why the unconfirmed marker exists and why the term is in `CONTEXT.md` — a green node with
no marker is a genuinely different claim from a green node with one. A `501` from A's route
is an expected, non-alarming outcome and must stay that way.
