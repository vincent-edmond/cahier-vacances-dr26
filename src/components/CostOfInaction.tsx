"use client";

import { useEffect, useState } from "react";
import { getQualif } from "@/lib/session";
import { TOTAL_CAPSULES } from "@/lib/capsules";
import { leverCost, totalCost, formatEuro, LEVER_COST } from "@/lib/cost";

/**
 * « Le coût de l'inaction » (taxe stupide) : carte d'électrochoc affichant le
 * manque à gagner estimé du levier, calé sur la taille de l'entreprise (CA opt-in).
 * Sur la C9 : le cumul des 9 leviers. Sans CA connu : teaser qui invite à l'opt-in.
 */
export function CostOfInaction({ num }: { num: number }) {
  const [ca, setCa] = useState<string | undefined>(undefined);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const read = () => setCa(getQualif()?.ca);
    read();
    setReady(true);
    const handler = () => read();
    window.addEventListener("cdv:qualif", handler);
    return () => window.removeEventListener("cdv:qualif", handler);
  }, []);

  if (!ready) return null;

  const isTotal = num === TOTAL_CAPSULES;
  const figures = isTotal ? totalCost(ca) : leverCost(num, ca);

  // Pas de CA exploitable (pas encore opt-in, ou « pas encore d'entreprise ») → teaser.
  if (!figures) {
    return (
      <Card>
        <Eyebrow>💸 Le coût de l&apos;inaction</Eyebrow>
        <p className="text-[#7C2D12] text-[15px] leading-relaxed mt-1">
          {isTotal
            ? "Renseignez votre profil (en lançant un exercice) pour découvrir ce que ces 9 leviers laissés en l'état coûtent à une entreprise de votre taille."
            : "Renseignez votre profil (en lançant l'exercice) pour révéler ce que ce point coûte, chiffré à votre échelle."}
        </p>
      </Card>
    );
  }

  if (isTotal) {
    return (
      <Card>
        <Eyebrow>🔥 Le cumul de l&apos;inaction</Eyebrow>
        <p className="text-[#7C2D12] text-[15px] leading-relaxed mt-1">
          Laissés en l&apos;état, ces 9 leviers représentent, pour une entreprise de votre taille :
        </p>
        <BigFigure>
          {formatEuro(figures.fiveLow)} à {formatEuro(figures.fiveHigh)}
          <span className="block text-sm font-semibold text-[#9A3412] mt-0.5">de manque à gagner cumulé sur 5 ans</span>
        </BigFigure>
        <p className="text-[#7C2D12] text-[15px] leading-relaxed font-medium">
          Appliqués, ces 9 leviers, c&apos;est <strong>autant que vous récupérez</strong>. Le plan ci-dessous en
          est le point de départ. Pour l&apos;exécuter vraiment, c&apos;est à Destination Réussite que ça se joue.
        </p>
        <Fineprint />
      </Card>
    );
  }

  const lever = LEVER_COST[num];
  return (
    <Card>
      <Eyebrow>💸 Le coût de l&apos;inaction</Eyebrow>
      {lever?.probleme && (
        <p className="text-[#9A3412] font-semibold text-sm mt-1">{lever.probleme}</p>
      )}
      <BigFigure>
        {formatEuro(figures.annualLow)} à {formatEuro(figures.annualHigh)}
        <span className="block text-sm font-semibold text-[#9A3412] mt-0.5">par an, à votre échelle</span>
      </BigFigure>
      <p className="text-[#7C2D12] text-[15px] leading-relaxed">
        Sur 5 ans, c&apos;est <strong>{formatEuro(figures.fiveLow)} à {formatEuro(figures.fiveHigh)}</strong> qui
        partent en fumée. {lever?.douleur}
      </p>
      <Fineprint />
    </Card>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl border border-[#FECACA] p-6 sm:p-7 space-y-2"
      style={{ background: "linear-gradient(135deg, #FFF7ED 0%, #FEF2F2 100%)" }}
    >
      {children}
    </div>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <span className="text-[11px] font-bold uppercase tracking-wider text-[#DC2626]">{children}</span>;
}

function BigFigure({ children }: { children: React.ReactNode }) {
  return <p className="font-display font-extrabold text-[#B91C1C] text-2xl sm:text-[28px] leading-tight py-1">{children}</p>;
}

function Fineprint() {
  return (
    <p className="text-[11px] text-[#9A3412]/70 pt-1">
      Estimation indicative, calée sur votre tranche de chiffre d&apos;affaires. À affiner avec vos chiffres réels.
    </p>
  );
}
