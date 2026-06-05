"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getCapsule, isUnlocked, formatDateFr } from "@/lib/capsules";
import {
  getOrCreateSessionId,
  syncProgressFromServer,
  getCapsuleProgressLocal,
  isPreview,
  markVu,
} from "@/lib/session";
import { VideoEmbed } from "@/components/VideoEmbed";
import { ExerciceForm } from "@/components/ExerciceForm";
import { CommentsSection } from "@/components/CommentsSection";
import { CtaDR } from "@/components/CtaDR";
import type { CapsuleProgress } from "@/lib/types";

export default function CapsulePage() {
  const params = useParams<{ num: string }>();
  const num = Number(params.num);
  const capsule = getCapsule(num);

  const [mounted, setMounted] = useState(false);
  const [sid, setSid] = useState("");
  const [preview, setPreview] = useState(false);
  const [progress, setProgress] = useState<CapsuleProgress | null>(null);

  useEffect(() => {
    const s = getOrCreateSessionId();
    setSid(s);
    setPreview(isPreview());
    setProgress(getCapsuleProgressLocal(s, num));
    syncProgressFromServer(s).then((all) => {
      setProgress(all.find((p) => p.capsuleNum === num) ?? null);
    });
    setMounted(true);
  }, [num]);

  if (!capsule) {
    return (
      <CenteredMessage
        title="Capsule introuvable"
        text="Cette capsule n'existe pas."
      />
    );
  }

  const unlocked = isUnlocked(capsule, { preview });

  if (mounted && !unlocked) {
    return (
      <CenteredMessage
        title={`🔒 ${capsule.titre}`}
        text={`Cette capsule se débloque le ${formatDateFr(capsule.dateUnlock)}. Revenez à cette date pour la découvrir.`}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      <header className="bg-[#000D2B] text-white sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-5 py-4 flex items-center justify-between">
          <Link href="/espace" className="text-sm font-semibold text-white/80 hover:text-white">
            ← Mon cahier
          </Link>
          <span className="text-xs text-white/50">Module {capsule.num} / 9</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 py-8 space-y-10">
        {/* Titre */}
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#0046FF] mb-2">
            Module {capsule.num} · {capsule.dureeMin} min · {capsule.levier}
          </p>
          <h1 className="font-display font-extrabold text-[#00194C] text-3xl leading-tight mb-2">
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

        {/* Exercice + feedback IA */}
        <section>
          <SectionTitle icon="✍️" label="Votre exercice" />
          <div className="rounded-2xl bg-white border border-[#E2E4EA] p-6 sm:p-8">
            <div className="mb-5 rounded-xl bg-[#0046FF]/[0.05] border border-[#0046FF]/15 px-4 py-3">
              <span className="text-xs font-bold uppercase tracking-wide text-[#0046FF]">Le défi</span>
              <p className="text-[#00194C] font-medium mt-1">{capsule.defi}</p>
            </div>
            {mounted && sid && (
              <ExerciceForm
                capsule={capsule}
                sessionId={sid}
                initialReponses={progress?.reponses}
                initialFeedback={progress?.feedbackIA}
              />
            )}
          </div>
        </section>

        {/* CTA Destination Réussite */}
        <CtaDR cta={capsule.cta} strong={capsule.num === 9} />

        {/* Commentaires */}
        <section>
          <SectionTitle icon="💬" label="La communauté" />
          {mounted && sid && <CommentsSection capsuleNum={capsule.num} sessionId={sid} />}
        </section>
      </main>
    </div>
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
        <span>✓</span> Capsule regardée
      </div>
    );
  }
  return (
    <button
      onClick={onClick}
      className="mt-3 inline-flex items-center gap-2 rounded-xl border border-[#E2E4EA] bg-white hover:border-[#0046FF] text-[#00194C] font-semibold text-sm px-5 py-2.5 transition-all"
    >
      ✓ J&apos;ai regardé la capsule
    </button>
  );
}

function CenteredMessage({ title, text }: { title: string; text: string }) {
  return (
    <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center px-5">
      <div className="text-center max-w-md">
        <h1 className="font-display font-extrabold text-[#00194C] text-2xl mb-3">{title}</h1>
        <p className="text-[#555B6E] mb-6">{text}</p>
        <Link
          href="/espace"
          className="inline-flex items-center gap-2 rounded-xl bg-[#0046FF] hover:bg-[#0033CC] text-white font-bold px-6 py-3 transition-all"
        >
          ← Retour au cahier
        </Link>
      </div>
    </div>
  );
}
