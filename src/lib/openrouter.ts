/**
 * The single LLM gateway. Every agent calls OpenRouter through here (ADR-0005).
 *
 * Returns the parsed, Zod-validated payload AND an AgentTraceEntry recording the
 * model that actually ran — the trace panel shows that on stage, so it must be the
 * real model id, never a hardcoded label.
 */
import { z } from "zod";
import { AGENT_MODELS, type AgentName } from "./models";
import type { AgentTraceEntry } from "@/contract";

const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

/** Models wrap JSON in prose or fences often enough that this is not optional. */
function extractJson(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  const first = raw.search(/[[{]/);
  if (first === -1) return raw.trim();
  const open = raw[first];
  const close = open === "{" ? "}" : "]";
  const last = raw.lastIndexOf(close);
  return last > first ? raw.slice(first, last + 1) : raw.slice(first).trim();
}

async function chat(model: string, messages: { role: string; content: string }[]) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY is not set (see .env.local)");

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "X-Title": "PATCH",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0,
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${(await res.text()).slice(0, 400)}`);

  const json = (await res.json()) as {
    choices: { message: { content: string } }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number };
    model?: string;
  };
  return {
    content: json.choices?.[0]?.message?.content ?? "",
    tokensIn: json.usage?.prompt_tokens ?? null,
    tokensOut: json.usage?.completion_tokens ?? null,
    model: json.model ?? model,
  };
}

export async function runAgent<T extends z.ZodTypeAny>(opts: {
  agent: AgentName;
  system: string;
  user: string;
  schema: T;
  summarise: (data: z.infer<T>) => string;
}): Promise<{ data: z.infer<T>; trace: AgentTraceEntry }> {
  const model = AGENT_MODELS[opts.agent];
  const startedAt = new Date().toISOString();
  const t0 = Date.now();

  const messages = [
    { role: "system", content: opts.system },
    { role: "user", content: opts.user },
  ];

  let lastErr = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await chat(model, messages);
    try {
      const parsed = opts.schema.parse(JSON.parse(extractJson(res.content)));
      return {
        data: parsed,
        trace: {
          agent: opts.agent,
          model: res.model,
          startedAt,
          durationMs: Date.now() - t0,
          summary: opts.summarise(parsed),
          tokensIn: res.tokensIn,
          tokensOut: res.tokensOut,
        },
      };
    } catch (e) {
      lastErr = e instanceof Error ? e.message : String(e);
      // Feed the failure back once — cheaper and more reliable than a second prompt.
      messages.push({ role: "assistant", content: res.content });
      messages.push({
        role: "user",
        content: `That did not match the required schema. Error:\n${lastErr}\n\nReturn ONLY corrected JSON.`,
      });
    }
  }
  throw new Error(`agent "${opts.agent}" failed schema validation twice: ${lastErr}`);
}
