# Demo runbook

## Before you present

```bash
npm run seed:reset     # clean 22 kW state in the Ambiguous workspace
npm run dev
```

- Open `http://localhost:3000?fixture=0` in one tab and `?fixture=1` in another.
  **Know which tab you are in.** If the pipeline dies, switch tabs and keep talking.
- Slack `#project-atlas` open, the Atlas message already posted, not yet reacted to.
- Zoom/screen share on the browser, not the IDE.

## The 90 seconds

1. **"Every company has one source of truth and hundreds of copies of yesterday's truth."**
   Show the Slack message: motor is now 18.5 kW, not 22 kW.
2. **React 🩹.** *"React bandage when reality changes."* — the gesture is the pitch.
3. PATCH's card appears: subject, previous value, new value, confidence. **Confirm.**
   Say: *"It asked first. It doesn't rewrite your CRM because someone typed something."*
4. Exa verifies — supplier bulletin, **live** source badge, and one **contradicting**
   archived catalogue shown rather than hidden.
5. Thread reply: *the old value appears in six connected items.* **Open Contagion View.**
6. The map unfolds, infection spreading outward. Six nodes, two axes of colour.
7. **Click the sent email.** PATCH refuses to edit it — offers a corrective message.
   *"It knows it can't rewrite history."*
8. **Click the Orion as-built.** PATCH refuses again — preserve and annotate.
   *"It was true in 2024. Blind find-and-replace would falsify an installation record."*
9. **Click the low-confidence doc.** *"This may be a different 22 kW motor."* Human review.
10. **Lasso the two safe nodes. Approve.** Watch them go green.
11. Back in Slack: the audit card. Announcement → verification → impact → decision →
    action → audit, all in one thread.

## Say these three lines

- *"The interface is generated around the remediation, not decorated by AI."*
- *"Five artefacts, five different repair interfaces, because repairing a draft and
  repairing a sent email are not the same problem."*
- *"It never starts on its own and never writes without approval."*

## If something breaks

| Breaks | Do this |
| --- | --- |
| Agent pipeline | Switch to the `?fixture=1` tab. Keep talking. Nobody can tell. |
| Slack | Open Contagion View directly. Narrate the reaction instead of showing it. |
| Ambiguous writes | Show the approved Repair Plan and the audit card; say writes are queued. |
| Exa | `sourceStatus: cached` is already a designed state — present it as the safeguard it is. |
| Everything | `?fixture=1`, no network needed. This is why ADR-0002 exists. |

## Do not

- Do not open the IDE. Do not read the trace panel aloud line by line.
- Do not apologise for anything not built. Show the six nodes and stop.
