"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { getCapsules, isUnlocked, formatDateFr } from "@/lib/capsules";
import {
  getOrCreateSessionId,
  syncProgressFromServer,
  getAllProgressLocal,
  isPreview,
  setPreview,
} from "@/lib/session";
import type { CSSProperties } from "react";
import type { Capsule, CapsuleProgress } from "@/lib/types";

// Palette douce et moderne : une teinte par levier (parcours frais et coloré).
const ACCENTS = [
  "#0046FF", // 1 · bleu
  "#6366F1", // 2 · indigo
  "#8B5CF6", // 3 · violet
  "#0EA5B7", // 4 · cyan
  "#0D9488", // 5 · teal
  "#10B981", // 6 · émeraude
  "#F59E0B", // 7 · ambre
  "#FB7185", // 8 · corail
  "#EC4899", // 9 · rose
];

export default function HubPage() {
  const capsules = getCapsules();
  const [mounted, setMounted] = useState(false);
  const [preview, setPreviewState] = useState(false);
  const [progress, setProgress] = useState<CapsuleProgress[]>([]);

  useEffect(() => {
    const sid = getOrCreateSessionId();
    const params = new URLSearchParams(window.location.search);
    if (params.get("preview") === "1") setPreview(true);
    if (params.get("preview") === "0") setPreview(false);
    setPreviewState(isPreview());

    setProgress(getAllProgressLocal(sid));
    syncProgressFromServer(sid).then(setProgress);
    setMounted(true);
  }, []);

  function progressFor(num: number): CapsuleProgress | undefined {
    return progress.find((p) => p.capsuleNum === num);
  }

  return (
    <AppShell active={0}>
      <div className="max-w-5xl mx-auto px-5 py-8">
        <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[#0046FF] mb-2">
          <span aria-hidden className="w-1.5 h-1.5 rounded-full bg-[#FFB020] shadow-[0_0_8px_rgba(255,176,32,0.8)]" />
          Summer Business · Été 2026
        </p>
        <h1 className="font-display font-extrabold text-[#00194C] text-2xl sm:text-3xl mb-2">
          Reprenez la main sur votre second semestre
        </h1>
        <p className="text-[#555B6E] mb-6 max-w-2xl">
          Neuf leviers à auditer et corriger cet été, du bilan de mi-année au plan d&apos;action.
          Avancez à votre rythme.
        </p>

        {/* Les 9 leviers — grille (tout visible sans scroll sur laptop) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {capsules.map((c) =>
            mounted ? (
              <CapsuleCard
                key={c.num}
                capsule={c}
                unlocked={isUnlocked(c, { preview })}
                progress={progressFor(c.num)}
                accent={ACCENTS[(c.num - 1) % ACCENTS.length]}
              />
            ) : (
              <div key={c.num} className="h-[136px] rounded-2xl bg-white border border-[#E2E4EA] animate-pulse" />
            )
          )}
        </div>

        {/* Pont DR — le goulot, c'est vous (après les 9 leviers) */}
        <div className="mt-8 rounded-2xl bg-white border border-[#E6E9F0] border-l-4 border-l-[#FFB020] p-5 shadow-[0_2px_8px_rgba(0,25,76,0.05)]">
          <p className="font-display font-bold text-[#00194C] text-[15px] mb-1.5">
            Le plus gros goulot d&apos;étranglement de votre entreprise, c&apos;est souvent vous.
          </p>
          <p className="text-sm text-[#555B6E] leading-relaxed">
            Pas par manque de travail : par manque de recul. Ces 9 étapes vous le redonnent, sans
            complaisance. Et pour transformer ce recul en résultats, en profondeur, il y a{" "}
            <a
              href="https://www.maxpiccinini.com/destination-reussite/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-[#0046FF] hover:text-[#0033CC]"
            >
              Destination Réussite →
            </a>
          </p>
        </div>
      </div>
    </AppShell>
  );
}

function CapsuleCard({
  capsule,
  unlocked,
  progress,
  accent,
}: {
  capsule: Capsule;
  unlocked: boolean;
  progress?: CapsuleProgress;
  accent: string;
}) {
  const done = !!progress?.reponses;
  const seen = !!progress?.vu;

  const statusBadge = done
    ? { label: "Terminé", cls: "bg-green-100 text-green-700" }
    : seen
      ? { label: "En cours", cls: "bg-amber-100 text-amber-700" }
      : { label: "À découvrir", cls: "bg-[#00194C]/[0.06] text-[#555B6E]" };

  const inner = (
    <div
      style={unlocked ? ({ "--accent": accent } as CSSProperties) : undefined}
      className={`group flex flex-col h-full gap-2.5 rounded-2xl border p-4 ${
        unlocked
          ? "lever-card bg-white border-[#E2E4EA] cursor-pointer"
          : "bg-[#F0F1F5] border-[#E2E4EA] opacity-80"
      }`}
    >
      <div className="flex items-center justify-between">
        <div
          className={`w-9 h-9 rounded-lg flex items-center justify-center font-display font-extrabold text-sm ${
            unlocked ? "lever-chip" : "bg-[#EEF0F4] text-[#9096A5]"
          }`}
        >
          {unlocked ? capsule.num : "🔒"}
        </div>
        {unlocked && (
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusBadge.cls}`}>
            {statusBadge.label}
          </span>
        )}
      </div>
      <h3 className="font-bold text-[#00194C] leading-snug text-[15px]">{capsule.titre}</h3>
      <p className="text-xs text-[#555B6E] leading-snug line-clamp-2">
        {unlocked ? capsule.accroche : `Disponible le ${formatDateFr(capsule.dateUnlock)}`}
      </p>
    </div>
  );

  if (!unlocked) return inner;
  return (
    <Link href={`/espace/capsule/${capsule.num}`} className="h-full">
      {inner}
    </Link>
  );
}
