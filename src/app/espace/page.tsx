"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { getCapsules, isUnlocked, formatDateFr, TOTAL_CAPSULES } from "@/lib/capsules";
import {
  getOrCreateSessionId,
  syncProgressFromServer,
  getAllProgressLocal,
  isPreview,
  setPreview,
} from "@/lib/session";
import type { Capsule, CapsuleProgress } from "@/lib/types";

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

  const doneCount = progress.filter((p) => p.reponses).length;
  const pct = Math.round((doneCount / TOTAL_CAPSULES) * 100);

  return (
    <AppShell active={0}>
      <div className="max-w-3xl mx-auto px-5 py-8 sm:py-10">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#0046FF] mb-2">
          Le contre-pied de l&apos;été
        </p>
        <h1 className="font-display font-extrabold text-[#00194C] text-2xl sm:text-3xl mb-3">
          Votre cahier de l&apos;été
        </h1>
        <p className="text-[#555B6E] mb-7 max-w-xl">
          Neuf leviers à auditer et corriger, du bilan de mi-année au plan d&apos;action. Une
          capsule se débloque chaque semaine. Avancez à votre rythme.
        </p>

        {/* Progression */}
        <div className="rounded-2xl bg-white border border-[#E2E4EA] p-5 mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-[#9096A5]">
              Votre progression
            </span>
            <span className="text-sm font-bold text-[#0046FF]">
              {doneCount}/{TOTAL_CAPSULES} exercices
            </span>
          </div>
          <div className="h-2.5 bg-[#E2E4EA] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#0046FF] rounded-full transition-all duration-700"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Liste des capsules */}
        <div className="space-y-3">
          {capsules.map((c) =>
            mounted ? (
              <CapsuleRow
                key={c.num}
                capsule={c}
                unlocked={isUnlocked(c, { preview })}
                progress={progressFor(c.num)}
              />
            ) : (
              <div key={c.num} className="h-[88px] rounded-2xl bg-white border border-[#E2E4EA] animate-pulse" />
            )
          )}
        </div>
      </div>
    </AppShell>
  );
}

function CapsuleRow({
  capsule,
  unlocked,
  progress,
}: {
  capsule: Capsule;
  unlocked: boolean;
  progress?: CapsuleProgress;
}) {
  const done = !!progress?.reponses;
  const seen = !!progress?.vu;

  const statusBadge = done
    ? { label: "Terminé", cls: "bg-green-100 text-green-700" }
    : seen
      ? { label: "En cours", cls: "bg-amber-100 text-amber-700" }
      : { label: "À découvrir", cls: "bg-[#0046FF]/10 text-[#0046FF]" };

  const inner = (
    <div
      className={`flex items-center gap-4 rounded-2xl border p-4 transition-all ${
        unlocked
          ? "bg-white border-[#E2E4EA] hover:border-[#0046FF] hover:shadow-[0_10px_30px_rgba(0,70,255,0.08)] cursor-pointer"
          : "bg-[#F0F1F5] border-[#E2E4EA] opacity-80"
      }`}
    >
      <div
        className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center font-display font-extrabold ${
          unlocked ? "bg-[#0046FF] text-white" : "bg-[#E2E4EA] text-[#9096A5]"
        }`}
      >
        {unlocked ? capsule.num : "🔒"}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-bold text-[#00194C] truncate">{capsule.titre}</h3>
          {unlocked && (
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${statusBadge.cls}`}>
              {statusBadge.label}
            </span>
          )}
        </div>
        <p className="text-sm text-[#555B6E] truncate">
          {unlocked ? capsule.accroche : `Disponible le ${formatDateFr(capsule.dateUnlock)}`}
        </p>
      </div>

      {unlocked && <span className="flex-shrink-0 text-[#0046FF] text-xl">→</span>}
    </div>
  );

  if (!unlocked) return inner;
  return <Link href={`/espace/capsule/${capsule.num}`}>{inner}</Link>;
}
