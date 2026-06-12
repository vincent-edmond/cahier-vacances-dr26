import type { Capsule, ExerciceReponses, CapsuleProgress } from "@/lib/types";
import { formatEuro, type CostFigures } from "@/lib/cost";
import { MAX_VOICE, COACH_KNOWLEDGE } from "@/lib/coachKnowledge";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-opus-4-8";

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

/** Profil du chef d'entreprise (issu de l'opt-in) — calibre le retour. */
export interface ProfilFeedback {
  ca?: string;
  secteur?: string;
}

/**
 * Bloc de contexte injecté avant les réponses, pour calibrer le retour à l'échelle
 * et au métier. Cas « Autre » (ou secteur absent) : on N'INJECTE PAS de secteur et
 * on consigne à l'IA de rester générique (jamais de « votre secteur Autre… »).
 */
function profilContext(profil?: ProfilFeedback): string {
  if (!profil) return "";
  const realSecteur = profil.secteur && profil.secteur !== "Autre" ? profil.secteur : null;
  const bits: string[] = [];
  if (realSecteur) bits.push(`secteur : ${realSecteur}`);
  if (profil.ca) bits.push(`CA : ${profil.ca}`);
  if (bits.length === 0) return "";
  const guard = realSecteur
    ? ""
    : " Le secteur n'est pas précisé : reste générique, ne nomme ou n'invente aucun secteur (n'écris jamais « votre secteur »).";
  return `Contexte du chef d'entreprise, pour calibrer ton retour à son échelle (sans le citer mot pour mot) : ${bits.join(" ; ")}.${guard}\n\n`;
}

/** Feedback IA personnalisé sur l'exercice d'une capsule. `cout` (déterministe,
 * calculé en amont) est injecté tel quel : Max IA l'emballe en punchline sans
 * inventer de chiffre. */
export async function generateExerciceFeedback(
  capsule: Capsule,
  reponses: ExerciceReponses,
  profil?: ProfilFeedback,
  cout?: CostFigures | null
): Promise<string | null> {
  const knowledge = COACH_KNOWLEDGE[capsule.num]
    ? `Matière de Max sur ce levier — c'est ta CULTURE pour répondre juste, crédible et dans son style, PAS un cours à réciter :\n${COACH_KNOWLEDGE[capsule.num]}\n\nGARDE-FOUS IMPORTANTS : le destinataire est un PROSPECT (pas un client de formation payante). Reste accessible, zéro jargon technique. Ne déballe NI les listes/frameworks complets NI toute la méthode (c'est la valeur de l'accompagnement). Inspire-toi de ces repères sans les recracher ; au plus UN exemple, seulement s'il éclaire vraiment. Donne un constat lucide, UNE action simple et à sa portée, et une question qui pique. Tu peux laisser entrevoir qu'il y a plus de profondeur à creuser (avec un accompagnement), sans rien livrer de plus.`
    : "";
  const system = [MAX_VOICE, capsule.feedbackPrompt, knowledge, buildFeedbackFormat(cout)].filter(Boolean).join("\n\n");
  const user = `${profilContext(profil)}Réponses de l'exercice « ${capsule.titre} » :\n${formatReponses(capsule, reponses)}`;
  return callClaude(system, user, 900);
}

/**
 * Consigne de forme : retour balisé en 3 ou 4 sections (la section COÛT n'apparaît
 * que si un montant déterministe est fourni). Voix de Max, sans code interne.
 */
function buildFeedbackFormat(cout?: CostFigures | null): string {
  const coutSection = cout
    ? `\n##COUT## Une punchline percutante, dans la voix de Max, sur le coût de l'inaction (la « taxe stupide » qu'il paie tant qu'il ne corrige pas ce point). Tu DOIS reprendre EXACTEMENT ces montants, sans les modifier ni en inventer d'autres : environ ${formatEuro(cout.annualLow)} à ${formatEuro(cout.annualHigh)} par an, soit ${formatEuro(cout.fiveLow)} à ${formatEuro(cout.fiveHigh)} sur 5 ans. Relie ce coût à SA situation concrète (ses réponses), pour que ça fasse mal tout en restant crédible. 1 à 2 phrases.`
    : "";
  return (
    "Structure ta réponse avec ces balises EXACTES, chacune en début de ligne, suivie de son texte. " +
    "N'écris aucun autre titre ni numéro.\n" +
    "##CONSTAT## un constat franc et concret sur ses réponses (2 phrases).\n" +
    "##ACTION## UNE action précise à lancer cette semaine, une seule (1 à 2 phrases)." +
    coutSection +
    "\n##QUESTION## une question qui dérange ou un repère chiffré qui le fait avancer (1 phrase).\n" +
    "N'emploie QUE ces balises, aucune autre (surtout pas de ##CONTRE-PIED## ni autre titre) : toute touche " +
    "« contre-pied de l'été » se glisse dans la QUESTION, sans nouvelle balise. " +
    "Parle à la 2e personne (vous), ton direct et bienveillant de Max. Ne cite jamais de code interne " +
    "(pas de « C1 », « capsule 7 ») : nomme l'étape par son nom. Pas de tirets cadratins, pas de jargon."
  );
}

/**
 * Synthèse finale (C9) : compile les exercices des capsules en un plan H2.
 * Utilisé par la page /espace/plan en Phase 3.
 */
export async function generatePlanFinal(
  capsules: Capsule[],
  progress: CapsuleProgress[],
  profil?: ProfilFeedback
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

  const system = [
    MAX_VOICE,
    "Nous sommes à la mi-2026 : le plan couvre le second semestre 2026 (de juillet à décembre 2026). N'évoque jamais une autre année. À partir des exercices remplis tout l'été par un chef d'entreprise (un par levier business), rédige un plan d'action du second semestre, personnel et actionnable. Structure : 1) un diagnostic d'ensemble en 3 ou 4 phrases ; 2) les 2 ou 3 chantiers prioritaires à mener d'ici décembre, chacun avec une première action concrète ; 3) une bascule claire vers Destination Réussite (du 25 au 27 septembre) pour exécuter ce plan. Phrases courtes, pas de tirets cadratins, pas de jargon. Ne cite jamais de code interne (« C1 », « capsule 7 ») : nomme chaque levier par son nom.",
    `Grille de Max pour structurer (les 9 piliers) — inspiration, pas un cours à réciter :\n${COACH_KNOWLEDGE[9]}`,
    "Le destinataire est un prospect, pas un client de formation : reste accessible, sans jargon ni méthode complète déballée. Le plan synthétise SES réponses et lui donne envie d'exécuter ; l'accompagnement (Destination Réussite) reste la marche d'après.",
  ].join("\n\n");

  return callClaude(system, `${profilContext(profil)}Bilan de l'été du chef d'entreprise :\n\n${bilan}`, 1800);
}
