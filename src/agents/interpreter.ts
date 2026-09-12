import { z } from "zod";
import { runAgent } from "@/lib/openrouter";
import type { TruthChange, AgentTraceEntry } from "@/contract";

export type SlackNomination = {
  channel: string;
  messageTs: string;
  text: string;
  threadText: string[];
  author: string;
  attachments: { name: string; url: string }[];
  permalink?: string | null;
};

const Out = z.object({
  subject: z.string(),
  previousValue: z.string(),
  newValue: z.string(),
  confidence: z.number().min(0).max(1),
  project: z.string().nullable(),
  isFactualChange: z.boolean(),
  reason: z.string(),
  /** What the message cites as its source, e.g. "supplier technical bulletin TB-2026-114". */
  sourceHint: z.string().nullable(),
  /** The thing the value describes, without brand-ambiguous words. e.g. "rail drivetrain traction motor". */
  subjectDomain: z.string().nullable(),
});

const SYSTEM = `You extract a single canonical TRUTH CHANGE from a nominated chat message.

A truth change is a durable change to an organisational fact: a specification, a price, a
date, a contact, a policy. It is NOT a truth change when someone reschedules a meeting,
states an opinion, asks a question, or corrects a typo with no downstream consequence.

Set isFactualChange false when the message is not a durable fact change. Say why in reason.

previousValue and newValue must be the literal strings as a person would write them
(for example "22 kW" and "18.5 kW"), because downstream agents do literal matching on them.

confidence reflects how clearly the message states the change, not how much you like it.

sourceHint: quote what the message cites as authority — a bulletin number, a document
name, an attachment, a supplier. null if it cites nothing.

subjectDomain: what the value actually describes, in words that will not collide with an
unrelated brand when searched. "Project Atlas" is a codename and matches the wrong
manufacturer; "rail drivetrain traction motor" does not. Be concrete about the equipment.

Return ONLY JSON: {subject, previousValue, newValue, confidence, project, isFactualChange,
reason, sourceHint, subjectDomain}`;

export type InterpretedExtras = { sourceHint: string | null; subjectDomain: string | null };

export async function interpreter(
  input: SlackNomination,
): Promise<{ change: TruthChange; extras: InterpretedExtras; trace: AgentTraceEntry }> {
  const user = [
    `Channel: ${input.channel}`,
    `Author: ${input.author}`,
    `Nominated message: ${input.text}`,
    input.threadText.length ? `Thread context:\n- ${input.threadText.join("\n- ")}` : "",
    input.attachments.length
      ? `Attachments: ${input.attachments.map((a) => a.name).join(", ")}`
      : "",
  ].filter(Boolean).join("\n");

  const { data, trace } = await runAgent({
    agent: "interpreter",
    system: SYSTEM,
    user,
    schema: Out,
    summarise: (d) =>
      d.isFactualChange
        ? `Extracted truth change: ${d.subject} ${d.previousValue} → ${d.newValue}, confidence ${d.confidence}`
        : `Not a factual change: ${d.reason}`,
  });

  if (!data.isFactualChange) {
    throw Object.assign(new Error(`Not a truth change: ${data.reason}`), { notAChange: true, trace });
  }

  return {
    trace,
    extras: { sourceHint: data.sourceHint, subjectDomain: data.subjectDomain },
    change: {
      id: `chg_${input.messageTs.replace(".", "")}`,
      subject: data.subject,
      previousValue: data.previousValue,
      newValue: data.newValue,
      confidence: data.confidence,
      announcedBy: input.author,
      announcedAt: new Date(Number(input.messageTs.split(".")[0]) * 1000).toISOString(),
      project: data.project,
      patientZero: {
        channel: input.channel,
        messageTs: input.messageTs,
        text: input.text,
        permalink: input.permalink ?? null,
      },
    },
  };
}
