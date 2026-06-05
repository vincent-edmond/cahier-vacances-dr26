"use client";

import { useMemo, useState } from "react";
import type { Capsule, ExerciceField, ExerciceReponses } from "@/lib/types";
import { submitExercice, generatePlan } from "@/lib/session";

interface ExerciceFormProps {
  capsule: Capsule;
  sessionId: string;
  initialReponses?: ExerciceReponses | null;
  initialFeedback?: string | null;
  /** "feedback" (défaut) = retour Claude par capsule. "plan" = synthèse H2 (C9). */
  mode?: "feedback" | "plan";
  onSaved?: () => void;
}

function computePercent(field: ExerciceField, reponses: ExerciceReponses): number | null {
  if (!field.computeFrom) return null;
  const [aId, bId] = field.computeFrom;
  const a = Number(reponses[aId]);
  const b = Number(reponses[bId]);
  if (!b || Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.round((a / b) * 100);
}

export function ExerciceForm({
  capsule,
  sessionId,
  initialReponses,
  initialFeedback,
  mode = "feedback",
  onSaved,
}: ExerciceFormProps) {
  const [reponses, setReponses] = useState<ExerciceReponses>(initialReponses ?? {});
  const [feedback, setFeedback] = useState<string | null>(initialFeedback ?? null);
  const [editing, setEditing] = useState(!initialFeedback);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const champs = capsule.exercice.champs;

  const missing = useMemo(
    () =>
      champs
        .filter((c) => c.required && c.type !== "computed")
        .some((c) => {
          const v = reponses[c.id];
          return v === undefined || v === null || `${v}`.trim() === "";
        }),
    [champs, reponses]
  );

  function update(id: string, value: string | number) {
    setReponses((prev) => ({ ...prev, [id]: value }));
  }

  async function handleSubmit() {
    if (missing || loading) return;
    setLoading(true);
    setError(null);

    // Injecte les valeurs calculées avant l'envoi (pour le feedback IA).
    const enriched: ExerciceReponses = { ...reponses };
    for (const c of champs) {
      if (c.type === "computed") {
        const pct = computePercent(c, reponses);
        if (pct !== null) enriched[c.id] = pct;
      }
    }
    setReponses(enriched);

    // ── Mode plan (C9) : on persiste les réponses puis on compile tout le cahier ──
    if (mode === "plan") {
      await submitExercice(sessionId, capsule.num, enriched, { skipFeedback: true });
      const plan = await generatePlan(sessionId);
      setLoading(false);
      setEditing(false);
      if (plan) {
        setFeedback(plan);
      } else {
        setError("Vos réponses sont enregistrées. La génération du plan est momentanément indisponible — réessayez plus tard.");
      }
      onSaved?.();
      return;
    }

    const { feedbackIA } = await submitExercice(sessionId, capsule.num, enriched);
    setLoading(false);

    if (feedbackIA) {
      setFeedback(feedbackIA);
      setEditing(false);
      onSaved?.();
    } else {
      // Réponses sauvées localement, mais l'IA n'a pas répondu.
      setFeedback(null);
      setEditing(false);
      setError("Vos réponses sont enregistrées. Le retour de Max est momentanément indisponible — réessayez plus tard.");
      onSaved?.();
    }
  }

  // ─── Vue résultat (exercice déjà rempli) ──────────────────────────────────
  if (!editing) {
    return (
      <div className="space-y-5">
        {feedback && (
          mode === "plan" ? (
            <div className="rounded-2xl border border-[#0046FF]/25 bg-gradient-to-br from-[#0046FF]/[0.06] to-[#00194C]/[0.03] p-6 sm:p-7">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">📋</span>
                <h4 className="font-display font-bold text-[#00194C] text-lg">Votre plan d&apos;action H2</h4>
              </div>
              <p className="text-[#2A2D35] leading-relaxed whitespace-pre-line">{feedback}</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-[#0046FF]/20 bg-[#0046FF]/[0.04] p-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">💬</span>
                <h4 className="font-bold text-[#00194C]">Le retour de Max</h4>
              </div>
              <p className="text-[#2A2D35] leading-relaxed whitespace-pre-line">{feedback}</p>
            </div>
          )
        )}
        {error && <p className="text-sm text-[#555B6E]">{error}</p>}
        <RecapReponses capsule={capsule} reponses={reponses} />
        <button
          onClick={() => setEditing(true)}
          className="text-sm font-semibold text-[#0046FF] hover:text-[#0033CC]"
        >
          {mode === "plan" ? "✎ Modifier et régénérer mon plan" : "✎ Modifier mes réponses"}
        </button>
      </div>
    );
  }

  // ─── Vue formulaire ────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {capsule.exercice.intro && (
        <p className="text-[#555B6E] text-sm leading-relaxed">{capsule.exercice.intro}</p>
      )}

      <div className="space-y-4">
        {champs.map((c) => (
          <Field key={c.id} field={c} reponses={reponses} onChange={update} />
        ))}
      </div>

      <button
        onClick={handleSubmit}
        disabled={missing || loading}
        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#0046FF] hover:bg-[#0033CC] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold px-7 py-3.5 transition-all"
      >
        {mode === "plan"
          ? (loading ? "Max compile votre plan d'été…" : "Générer mon plan d'action H2 →")
          : (loading ? "Max analyse votre bilan…" : "Obtenir le retour de Max →")}
      </button>
      {missing && (
        <p className="text-xs text-[#9096A5]">Complétez les champs obligatoires pour continuer.</p>
      )}
    </div>
  );
}

// ─── Champ unitaire ───────────────────────────────────────────────────────────

function Field({
  field,
  reponses,
  onChange,
}: {
  field: ExerciceField;
  reponses: ExerciceReponses;
  onChange: (id: string, value: string | number) => void;
}) {
  const label = (
    <label htmlFor={field.id} className="block text-sm font-semibold text-[#00194C] mb-1.5">
      {field.label}
      {field.required && <span className="text-[#0046FF]"> *</span>}
    </label>
  );

  if (field.type === "computed") {
    const pct = computePercent(field, reponses);
    return (
      <div>
        {label}
        <div className="flex items-baseline gap-2 rounded-xl border border-[#E2E4EA] bg-[#F8F9FB] px-4 py-3">
          <span className="text-2xl font-extrabold text-[#0046FF]">
            {pct === null ? "—" : pct}
          </span>
          {pct !== null && field.suffix && <span className="text-[#9096A5]">{field.suffix}</span>}
        </div>
      </div>
    );
  }

  if (field.type === "select") {
    return (
      <div>
        {label}
        <select
          id={field.id}
          value={(reponses[field.id] as string) ?? ""}
          onChange={(e) => onChange(field.id, e.target.value)}
          className="w-full rounded-xl border border-[#E2E4EA] bg-white px-4 py-3 text-[#2A2D35] focus:border-[#0046FF] focus:outline-none focus:ring-2 focus:ring-[#0046FF]/20"
        >
          <option value="" disabled>Choisir…</option>
          {field.options?.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>
    );
  }

  if (field.type === "textarea") {
    return (
      <div>
        {label}
        <textarea
          id={field.id}
          value={(reponses[field.id] as string) ?? ""}
          onChange={(e) => onChange(field.id, e.target.value)}
          placeholder={field.placeholder}
          rows={3}
          className="w-full rounded-xl border border-[#E2E4EA] bg-white px-4 py-3 text-[#2A2D35] focus:border-[#0046FF] focus:outline-none focus:ring-2 focus:ring-[#0046FF]/20 resize-y"
        />
      </div>
    );
  }

  // number | text
  return (
    <div>
      {label}
      <div className="relative">
        <input
          id={field.id}
          type={field.type === "number" ? "number" : "text"}
          inputMode={field.type === "number" ? "numeric" : undefined}
          value={(reponses[field.id] as string | number) ?? ""}
          onChange={(e) =>
            onChange(field.id, field.type === "number" ? e.target.value : e.target.value)
          }
          placeholder={field.placeholder}
          className="w-full rounded-xl border border-[#E2E4EA] bg-white px-4 py-3 pr-10 text-[#2A2D35] focus:border-[#0046FF] focus:outline-none focus:ring-2 focus:ring-[#0046FF]/20"
        />
        {field.suffix && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#9096A5] text-sm">
            {field.suffix}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Récap des réponses (vue résultat) ─────────────────────────────────────────

function RecapReponses({ capsule, reponses }: { capsule: Capsule; reponses: ExerciceReponses }) {
  return (
    <div className="rounded-2xl border border-[#E2E4EA] bg-[#F8F9FB] p-5">
      <h5 className="text-xs font-bold uppercase tracking-wide text-[#9096A5] mb-3">Vos réponses</h5>
      <dl className="space-y-2">
        {capsule.exercice.champs.map((c) => {
          const v = reponses[c.id];
          if (v === undefined || v === "") return null;
          return (
            <div key={c.id} className="flex flex-col sm:flex-row sm:gap-2">
              <dt className="text-sm text-[#555B6E] sm:w-2/3">{c.label}</dt>
              <dd className="text-sm font-semibold text-[#00194C] sm:w-1/3">
                {v}{c.suffix ? ` ${c.suffix}` : ""}
              </dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}
