"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getOrCreateSessionId, getAllProgressLocal, getQualif, getPrenom } from "@/lib/session";
import { DR_URL } from "@/lib/capsules";

/**
 * Relance Destination Réussite, UNE SEULE FOIS, au bon moment.
 *
 * Déclencheur : 3 exercices terminés. C'est exactement la définition de « lead
 * chaud » retenue avec l'équipe (1 = curiosité, 2 = intérêt, 3 = il joue le jeu),
 * donc une seule notion de « chaud » partout : site, email, WhatsApp.
 * Déclencheur COMPORTEMENTAL et non calendaire : celui qui s'inscrit tard n'est
 * pas pénalisé.
 *
 * Garde-fous : jamais deux fois (drapeau local), jamais bloquante, et jamais
 * affichée à quelqu'un qui n'a pas d'entreprise (même règle d'exclusion que
 * Camille sur WhatsApp).
 */
const SEEN_KEY = "cdv_dr_popup";
const SEUIL = 3;
const SANS_ENTREPRISE = "Je n'ai pas encore d'entreprise";

export function DrPopup() {
  const [open, setOpen] = useState(false);
  const [prenom, setPrenom] = useState("");
  const [faits, setFaits] = useState(0);
  const timer = useRef<number | null>(null);

  const evaluer = useCallback(() => {
    if (typeof window === "undefined") return;
    if (timer.current !== null) return;                   // affichage déjà programmé
    if (localStorage.getItem(SEEN_KEY)) return;           // déjà vue
    if (getQualif()?.ca === SANS_ENTREPRISE) return;      // hors cible

    const done = getAllProgressLocal(getOrCreateSessionId()).filter((p) => p.reponses).length;
    if (done < SEUIL) return;

    setFaits(done);
    setPrenom(getPrenom());
    // Petit délai : on laisse le prospect lire son retour Max IA avant d'apparaître.
    timer.current = window.setTimeout(() => {
      timer.current = null;
      // Re-vérif : si la popup a été fermée pendant le délai, on n'insiste pas.
      if (!localStorage.getItem(SEEN_KEY)) setOpen(true);
    }, 2500);
  }, []);

  useEffect(() => {
    evaluer();
    window.addEventListener("cdv:progress", evaluer);
    return () => window.removeEventListener("cdv:progress", evaluer);
  }, [evaluer]);

  // Échap pour fermer + blocage du scroll de fond (cohérent avec les autres modales).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") fermer(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function fermer() {
    try { localStorage.setItem(SEEN_KEY, "1"); } catch { /* non bloquant */ }
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-[#000D2B]/75 backdrop-blur-sm" onClick={fermer} />
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 overflow-hidden">
        <div
          className="px-6 pt-6 pb-5 text-white relative"
          style={{
            backgroundColor: "#000D2B",
            backgroundImage: "url('/dr-seminar.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{ background: "linear-gradient(135deg, rgba(0,25,76,0.80) 0%, rgba(0,13,43,0.88) 100%)" }}
          />
          <div className="relative">
            <div className="flex items-start justify-between gap-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B9FFF]">
                Destination Réussite · 25-27 septembre
              </span>
              <button onClick={fermer} aria-label="Fermer" className="text-white/50 hover:text-white text-xl leading-none">
                ×
              </button>
            </div>
            <h3 className="font-display font-extrabold text-xl mt-2 leading-tight">
              {prenom ? `${prenom}, vous avez déjà fait le plus dur.` : "Vous avez déjà fait le plus dur."}
            </h3>
          </div>
        </div>

        <div className="px-6 py-5 space-y-4">
          <p className="text-[#2A2D35] leading-relaxed">
            {faits} leviers de votre entreprise passés au crible, noir sur blanc. Vous savez
            maintenant où ça coince et ce que ça vous coûte.
          </p>
          <p className="text-[#2A2D35] leading-relaxed">
            Le plus dur n&apos;est pas de le voir, c&apos;est de <strong>l&apos;exécuter</strong>.
            C&apos;est exactement ce qu&apos;on fait pendant trois jours à Destination Réussite,
            avec Max et une salle de chefs d&apos;entreprise qui avancent.
          </p>
          <a
            href={DR_URL}
            target="_blank"
            rel="noopener noreferrer"
            data-cta="destination-reussite"
            onClick={fermer}
            className="cta-glow flex items-center justify-center gap-2 rounded-xl bg-[#0046FF] hover:bg-[#0033CC] text-white font-bold px-6 py-3.5 transition-all"
          >
            Découvrir Destination Réussite <span className="arrow">→</span>
          </a>
          <button onClick={fermer} className="block w-full text-center text-sm text-[#9096A5] hover:text-[#555B6E]">
            Plus tard, je continue mon parcours
          </button>
        </div>
      </div>
    </div>
  );
}
