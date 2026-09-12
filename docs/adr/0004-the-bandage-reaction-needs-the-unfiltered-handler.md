# 🩹 must be caught with an unfiltered onReaction handler and matched on rawEmoji

CopilotKit's Channels SDK `channel.onReaction(emoji, handler)` only accepts eight
*portable* emoji names: `thumbs_up`, `thumbs_down`, `heart`, `fire`, `eyes`, `refresh`,
`thinking`, `tada`. `adhesive_bandage` is not among them, so
`onReaction("adhesive_bandage", ...)` never fires. We register the **unfiltered**
handler and match on `rawEmoji` ourselves.

## Consequences

A future reader will try to "clean this up" into the filtered form and silently break
the hero gesture. Don't.

Related constraint, recorded here because it bit the same design: managed Slack does
**not** register slash commands — `/patch this` arrives as ordinary message text. Our
triggers are therefore the 🩹 reaction (hero) and an `@PATCH` mention (fallback) only.
