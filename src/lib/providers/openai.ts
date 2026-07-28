import type { ClaudeMessages } from "@/lib/providers/anthropic";
import { sanitise } from "@/lib/providers/anthropic";

/**
 * BACKUP OpenAI — ne sort QUE si Anthropic est totalement indisponible (stream +
 * réessai + repli non streamé tous en échec). Claude reste le primaire : 99 % des
 * retours passent par lui, OpenAI n'intervient que pendant une panne Anthropic.
 *
 * On réutilise EXACTEMENT le même prompt (system + user) que Claude → un retour
 * « quasi-Max ». Non streamé (plus simple/robuste pour un secours) : la route
 * renvoie alors un JSON `{ feedbackIA }`, que le client sait déjà lire.
 *
 * Modèle par défaut : GPT-4o (le phare, équivalent Opus). Surchargeable sans
 * toucher au code via `OPENAI_MODEL`.
 */
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o";

export async function openaiComplete(m: ClaudeMessages): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const body = JSON.stringify({
    model: OPENAI_MODEL,
    max_tokens: m.maxTokens,
    messages: [
      { role: "system", content: m.systemStatic },
      { role: "user", content: m.user },
    ],
  });

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(OPENAI_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body,
        signal: AbortSignal.timeout(45000),
      });
      if (res.ok) {
        const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
        const text = data.choices?.[0]?.message?.content?.trim();
        return text ? sanitise(text) : null;
      }
      const transient = res.status === 429 || res.status >= 500;
      console.error("OpenAI error:", res.status, (await res.text()).slice(0, 200));
      if (!(transient && attempt === 0)) return null;
    } catch (e) {
      console.error("OpenAI fetch error:", (e as Error).message);
      if (attempt === 1) return null;
    }
    await new Promise((r) => setTimeout(r, 700));
  }
  return null;
}
