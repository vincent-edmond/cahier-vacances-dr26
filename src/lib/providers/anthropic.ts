import type { Capsule, ExerciceReponses, CapsuleProgress } from "@/lib/types";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-6";

/** Supprime les tirets cadratins que Claude génère parfois malgré la consigne. */
function sanitise(text: string): string {
  return (text || "").replace(/—/g, ":").replace(/–/g, "-").trim();
}

/** Met en forme les réponses d'un exercice pour les injecter dans le prompt. */
function formatReponses(capsule: Capsule, reponses: ExerciceReponses): string {
  return capsule.exercice.champs
    .filter((champ) => champ.type !== "computed" || reponses[champ.id] != null)
    .map((champ) => {
      const val = reponses[champ.id];
      const suffix = champ.suffix ? ` ${champ.suffix}` : "";
      return `- ${champ.label} : ${val === undefined || val === "" ? "(non renseigné)" : `${val}${suffix}`}`;
    })
    .join("\n");
}

async function callClaude(system: string, user: string, maxTokens = 600): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: maxTokens,
        system,
        messages: [{ role: "user", content: user }],
      }),
      signal: AbortSignal.timeout(25000),
    });
    if (!res.ok) {
      console.error("Anthropic error:", res.status, await res.text());
      return null;
    }
    const data = (await res.json()) as { content?: { type: string; text: string }[] };
    const text = (data.content ?? [])
      .filter((c) => c.type === "text")
      .map((c) => c.text)
      .join("")
      .trim();
    return text ? sanitise(text) : null;
  } catch (err) {
    console.error("Anthropic fetch error:", err);
    return null;
  }
}

/** Feedback IA personnalisé sur l'exercice d'une capsule. */
export async function generateExerciceFeedback(
  capsule: Capsule,
  reponses: ExerciceReponses
): Promise<string | null> {
  const user = `Réponses de l'exercice « ${capsule.titre} » :\n${formatReponses(capsule, reponses)}`;
  return callClaude(capsule.feedbackPrompt, user, 600);
}

/**
 * Synthèse finale (C9) : compile les exercices des capsules en un plan H2.
 * Utilisé par la page /espace/plan en Phase 3.
 */
export async function generatePlanFinal(
  capsules: Capsule[],
  progress: CapsuleProgress[]
): Promise<string | null> {
  const byNum = new Map(progress.map((p) => [p.capsuleNum, p]));
  const bilan = capsules
    .map((c) => {
      const p = byNum.get(c.num);
      if (!p?.reponses) return null;
      return `### ${c.titre}\n${formatReponses(c, p.reponses)}`;
    })
    .filter(Boolean)
    .join("\n\n");

  if (!bilan) return null;

  const system = `Tu es Max Piccinini, coach business pour chefs d'entreprise établis. Nous sommes à la mi-2026 : le plan couvre le second semestre 2026 (de juillet à décembre 2026). N'évoque jamais une autre année. À partir des exercices remplis tout l'été par un chef d'entreprise (un par levier business), rédige un plan d'action du second semestre, personnel et actionnable. Structure : 1) un diagnostic d'ensemble en 3 ou 4 phrases ; 2) les 2 ou 3 chantiers prioritaires à mener d'ici décembre, chacun avec une première action concrète ; 3) une bascule claire vers Destination Réussite (du 25 au 27 septembre) pour exécuter ce plan. Vouvoiement, ton direct et motivant, phrases courtes, pas de tirets cadratins, pas de jargon.`;

  return callClaude(system, `Bilan de l'été du chef d'entreprise :\n\n${bilan}`, 1500);
}
