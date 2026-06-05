// ─── Cahier de Vacances DR26 — types ────────────────────────────────────────

/** Type de champ d'un exercice (le « défi » d'une capsule). */
export type ExerciceFieldType = "number" | "select" | "textarea" | "text" | "computed";

export interface ExerciceField {
  id: string;
  label: string;
  type: ExerciceFieldType;
  /** Options pour un champ `select`. */
  options?: string[];
  placeholder?: string;
  help?: string;
  /** Suffixe affiché (ex. « € », « % »). */
  suffix?: string;
  /** Pour un champ `computed` : [idNumerateur, idDenominateur] → pourcentage. */
  computeFrom?: [string, string];
  required?: boolean;
}

export interface CapsuleCTA {
  texte: string;
  bouton: string;
  url: string;
}

/** Une capsule = un module du cahier. Contenu statique (src/data/capsules.json). */
export interface Capsule {
  num: number;
  slug: string;
  titre: string;
  accroche: string;
  levier: string;
  /** Date de déblocage (drip), format ISO `YYYY-MM-DD`. */
  dateUnlock: string;
  dureeMin: number;
  /** URL d'embed (YouTube / Vimeo / mp4). `null` si pas encore tournée. */
  videoUrl: string | null;
  /** Fiche distillée, en HTML, affichée dans l'app. */
  ficheHtml: string;
  exercice: {
    intro?: string;
    champs: ExerciceField[];
  };
  /** Prompt système Claude pour le feedback de l'exercice. */
  feedbackPrompt: string;
  defi: string;
  cta: CapsuleCTA;
}

/** Réponses d'un exercice : clé = id du champ. */
export type ExerciceReponses = Record<string, string | number>;

/** Progression d'une session sur une capsule. */
export interface CapsuleProgress {
  capsuleNum: number;
  vu: boolean;
  reponses: ExerciceReponses | null;
  feedbackIA: string | null;
  doneAt: string | null;
  updatedAt: string;
}

export type CommentStatus = "approved" | "pending" | "rejected";

export interface Comment {
  id: string;
  capsuleNum: number;
  sessionId: string;
  prenom: string;
  texte: string;
  createdAt: string;
  status: CommentStatus;
}
