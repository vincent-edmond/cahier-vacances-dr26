"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { getCapsule, isUnlocked, formatDateFr, TOTAL_CAPSULES } from "@/lib/capsules";
import {
  getOrCreateSessionId,
  syncProgressFromServer,
  getCapsuleProgressLocal,
  getPlanLocal,
  isPreview,
  markVu,
} from "@/lib/session";
import { VideoEmbed } from "@/components/VideoEmbed";
import { ExerciceForm } from "@/components/ExerciceForm";
import { CtaDR } from "@/components/CtaDR";
import type { CapsuleProgress } from "@/lib/types";

export default function CapsulePage() {
  const params = useParams<{ num: string }>();
  const num = Number(params.num);
  const capsule = getCapsule(num);
  const isFinal = num === TOTAL_CAPSULES;

  const [mounted, setMounted] = useState(false);
  const [sid, setSid] = useState("");
  const [preview, setPreview] = useState(false);
  const [progress, setProgress] = useState<CapsuleProgress | null>(null);
  const [planLocal, setPlanLocal] = useState<string | null>(null);

  useEffect(() => {
    const s = getOrCreateSessionId();
    setSid(s);
    setPreview(isPreview());
    setProgress(getCapsuleProgressLocal(s, num));
    setPlanLocal(getPlanLocal(s));
    syncProgressFromServer(s).then((all) => {
      setProgress(all.find((p) => p.capsuleNum === num) ?? null);
    });
    setMounted(true);
  }, [num]);

  if (!capsule) {
    return (
      <AppShell>
        <CenteredMessage title="Étape introuvable" text="Cette étape n'existe pas." />
      </AppShell>
    );
  }

  const unlocked = isUnlocked(capsule, { preview });

  return (
    <AppShell active={num}>
      {mounted && !unlocked ? (
        <CenteredMessage
          title={`🔒 ${capsule.titre}`}
          text={`Cette étape se débloque le ${formatDateFr(capsule.dateUnlock)}. Revenez à cette date pour la découvrir.`}
        />
      ) : (
        <div className="max-w-3xl mx-auto px-5 py-8 space-y-10">
          {/* Titre */}
          <div>
            <Link href="/espace" className="inline-flex items-center gap-1 text-sm font-semibold text-[#0046FF] hover:text-[#0033CC] mb-4">
              ← Mon espace
            </Link>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#0046FF] mb-2">
              Étape {capsule.num} / {TOTAL_CAPSULES} · {capsule.dureeMin} min · {capsule.levier}
            </p>
            <h1 className="font-display font-extrabold text-[#00194C] text-2xl sm:text-3xl leading-tight mb-2">
              {capsule.titre}
            </h1>
            <p className="text-lg text-[#555B6E] italic">« {capsule.accroche} »</p>
          </div>

          {/* Vidéo */}
          <section>
            <VideoEmbed url={capsule.videoUrl} titre={capsule.titre} />
            {mounted && sid && (
              <VuButton
                vu={!!progress?.vu}
                onClick={() => {
                  markVu(sid, capsule.num);
                  setProgress((p) =>
                    p ? { ...p, vu: true } : { capsuleNum: num, vu: true, reponses: null, feedbackIA: null, doneAt: null, updatedAt: new Date().toISOString() }
                  );
                }}
              />
            )}
          </section>

          {/* Fiche */}
          <section>
            <SectionTitle icon="📄" label="La fiche" />
            <div className="rounded-2xl bg-white border border-[#E2E4EA] p-6 sm:p-8">
              <div className="fiche" dangerouslySetInnerHTML={{ __html: capsule.ficheHtml }} />
            </div>
          </section>

          {/* Exercice + feedback IA (ou synthèse du plan en C9) */}
          <section>
            <SectionTitle icon={isFinal ? "📋" : "✍️"} label={isFinal ? "Votre plan d'action H2" : "Votre exercice"} />
            <div className="rounded-2xl bg-white border border-[#E2E4EA] p-6 sm:p-8">
              <div className="mb-5 rounded-xl bg-[#FFB020]/[0.10] border border-[#FFB020]/35 px-4 py-3">
                <span className="text-xs font-bold uppercase tracking-wide text-[#B45309]">🎯 Le défi</span>
                <p className="text-[#00194C] font-medium mt-1">{capsule.defi}</p>
              </div>
              {isFinal && (
                <p className="text-sm text-[#555B6E] mb-5">
                  Cet exercice reprend tout votre parcours : vos réponses des étapes précédentes sont
                  compilées avec ce que vous notez ici pour générer votre plan personnalisé.
                </p>
              )}
              {mounted && sid && (
                <ExerciceForm
                  capsule={capsule}
                  sessionId={sid}
                  mode={isFinal ? "plan" : "feedback"}
                  initialReponses={progress?.reponses}
                  initialFeedback={isFinal ? planLocal : progress?.feedbackIA}
                />
              )}
            </div>
          </section>

          {/* CTA Destination Réussite */}
          <CtaDR cta={capsule.cta} strong={isFinal} />
        </div>
      )}
    </AppShell>
  );
}

function SectionTitle({ icon, label }: { icon: string; label: string }) {
  return (
    <h2 className="flex items-center gap-2 font-display font-bold text-[#00194C] text-xl mb-4">
      <span>{icon}</span> {label}
    </h2>
  );
}

function VuButton({ vu, onClick }: { vu: boolean; onClick: () => void }) {
  if (vu) {
    return (
      <div className="mt-3 flex items-center gap-2 text-sm text-green-600 font-semibold">
        <span>✓</span> Vidéo regardée
      </div>
    );
  }
  return (
    <button
      onClick={onClick}
      className="mt-3 inline-flex items-center gap-2 rounded-xl border border-[#E2E4EA] bg-white hover:border-[#0046FF] text-[#00194C] font-semibold text-sm px-5 py-2.5 transition-all"
    >
      ✓ J&apos;ai regardé la vidéo
    </button>
  );
}

function CenteredMessage({ title, text }: { title: string; text: string }) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-5">
      <div className="text-center max-w-md">
        <h1 className="font-display font-extrabold text-[#00194C] text-2xl mb-3">{title}</h1>
        <p className="text-[#555B6E] mb-6">{text}</p>
        <Link
          href="/espace"
          className="inline-flex items-center gap-2 rounded-xl bg-[#0046FF] hover:bg-[#0033CC] text-white font-bold px-6 py-3 transition-all"
        >
          ← Retour à mon espace
        </Link>
      </div>
    </div>
  );
}
