"use client";

import type { CapsuleCTA } from "@/lib/types";

interface CtaDRProps {
  cta: CapsuleCTA;
  /** Variante renforcée (capsule finale / synthèse). */
  strong?: boolean;
}

export function CtaDR({ cta, strong = false }: CtaDRProps) {
  return (
    <section
      className="relative overflow-hidden rounded-2xl text-center"
      style={{
        background: "linear-gradient(135deg, #00194C 0%, #000D2B 100%)",
        padding: strong ? "44px 28px" : "32px 28px",
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(ellipse 70% 60% at 50% 0%, rgba(0,70,255,0.28) 0%, transparent 70%)" }}
      />
      <div className="relative z-10 flex flex-col items-center gap-5">
        <p
          className="text-xs font-bold uppercase tracking-[0.14em]"
          style={{ color: "#6B9FFF" }}
        >
          Destination Réussite · 25-27 septembre
        </p>
        <p
          className="text-white font-semibold max-w-xl"
          style={{ fontSize: strong ? 22 : 18, lineHeight: 1.4 }}
        >
          {cta.texte}
        </p>
        <a
          href={cta.url}
          target="_blank"
          rel="noopener noreferrer"
          data-cta="destination-reussite"
          className="cta-glow inline-flex items-center gap-2 rounded-full bg-[#0046FF] hover:bg-[#0033CC] text-white font-bold"
          style={{ padding: strong ? "18px 40px" : "15px 32px", fontSize: strong ? 18 : 16 }}
        >
          {cta.bouton} <span className="arrow">→</span>
        </a>
      </div>
    </section>
  );
}
