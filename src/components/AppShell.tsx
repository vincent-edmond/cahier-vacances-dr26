"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getCapsules, isUnlocked, formatDateFr, TOTAL_CAPSULES } from "@/lib/capsules";
import {
  getOrCreateSessionId,
  getAllProgressLocal,
  syncProgressFromServer,
  isPreview,
  setPreview,
} from "@/lib/session";
import { Footer } from "./Footer";
import type { Capsule, CapsuleProgress } from "@/lib/types";

/**
 * Coquille de l'espace (style SaaS) : sidebar gauche sur desktop, drawer sur mobile,
 * footer. Les pages passent leur contenu en `children` et la capsule active.
 */
export function AppShell({ active, children }: { active?: number; children: React.ReactNode }) {
  const capsules = getCapsules();
  const [mounted, setMounted] = useState(false);
  const [progress, setProgress] = useState<CapsuleProgress[]>([]);
  const [preview, setPreviewState] = useState(false);
  const [drawer, setDrawer] = useState(false);

  useEffect(() => {
    const sid = getOrCreateSessionId();
    setPreviewState(isPreview());
    setProgress(getAllProgressLocal(sid));
    syncProgressFromServer(sid).then(setProgress);
    setMounted(true);
  }, []);

  const done = progress.filter((p) => p.reponses).length;
  const pct = Math.round((done / TOTAL_CAPSULES) * 100);

  function togglePreview() {
    setPreview(!preview);
    window.location.reload();
  }

  const sidebar = (
    <SidebarContent
      capsules={capsules}
      progress={progress}
      preview={preview}
      mounted={mounted}
      active={active}
      done={done}
      pct={pct}
      onTogglePreview={togglePreview}
      onNavigate={() => setDrawer(false)}
    />
  );

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      {/* Sidebar desktop */}
      <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 bg-[#000D2B] text-white">
        {sidebar}
      </aside>

      {/* Barre du haut — mobile */}
      <header className="lg:hidden sticky top-0 z-40 flex items-center justify-between h-14 px-4 bg-[#000D2B] text-white">
        <button onClick={() => setDrawer(true)} aria-label="Ouvrir le menu" className="p-1 -ml-1">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <Link href="/" className="font-display font-extrabold text-sm tracking-wide">
          SUMMER <span className="text-[#6B9FFF]">BUSINESS</span>
        </Link>
        <span className="w-6" />
      </header>

      {/* Drawer mobile */}
      {drawer && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDrawer(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85%] bg-[#000D2B] text-white flex flex-col overflow-y-auto">
            <button
              onClick={() => setDrawer(false)}
              aria-label="Fermer le menu"
              className="absolute top-3 right-3 text-white/60 hover:text-white text-xl"
            >
              ×
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      {/* Contenu + footer */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
    </div>
  );
}

function SidebarContent({
  capsules,
  progress,
  preview,
  mounted,
  active,
  done,
  pct,
  onTogglePreview,
  onNavigate,
}: {
  capsules: Capsule[];
  progress: CapsuleProgress[];
  preview: boolean;
  mounted: boolean;
  active?: number;
  done: number;
  pct: number;
  onTogglePreview: () => void;
  onNavigate: () => void;
}) {
  function progressFor(num: number) {
    return progress.find((p) => p.capsuleNum === num);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 h-16 flex items-center border-b border-white/[0.08]">
        <Link href="/" onClick={onNavigate} className="font-display font-extrabold text-sm tracking-wide">
          SUMMER <span className="text-[#6B9FFF]">BUSINESS</span>
        </Link>
      </div>

      {/* Progression */}
      <div className="px-5 py-4 border-b border-white/[0.08]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-white/45">Progression</span>
          <span className="text-xs font-bold text-[#6B9FFF]">{done}/{TOTAL_CAPSULES}</span>
        </div>
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full bg-[#0046FF] rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Nav capsules */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        <Link
          href="/espace"
          onClick={onNavigate}
          className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            active === 0 ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/5 hover:text-white"
          }`}
        >
          <span>🏠</span> Mon espace
        </Link>

        <div className="pt-3 pb-1 px-3 text-[10px] font-bold uppercase tracking-wider text-white/35">
          Les 9 leviers
        </div>

        {capsules.map((c) => {
          const unlocked = isUnlocked(c, { preview });
          const p = progressFor(c.num);
          const isActive = active === c.num;
          const dot = !mounted
            ? "bg-white/20"
            : p?.reponses
              ? "bg-green-400"
              : p?.vu
                ? "bg-amber-400"
                : "bg-white/25";

          const body = (
            <>
              <span
                className={`flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-bold ${
                  unlocked ? "bg-white/10 text-white" : "bg-white/[0.04] text-white/35"
                }`}
              >
                {mounted && !unlocked ? "🔒" : c.num}
              </span>
              <span className="min-w-0 flex-1 truncate">{c.titre}</span>
              {mounted && unlocked && <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />}
            </>
          );

          const base = "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors";

          if (mounted && !unlocked) {
            return (
              <div key={c.num} className={`${base} text-white/35`} title={`Disponible le ${formatDateFr(c.dateUnlock)}`}>
                {body}
              </div>
            );
          }
          return (
            <Link
              key={c.num}
              href={`/espace/capsule/${c.num}`}
              onClick={onNavigate}
              className={`${base} ${isActive ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/5 hover:text-white"}`}
            >
              {body}
            </Link>
          );
        })}
      </nav>

      {/* Bas : démo + DR */}
      <div className="px-3 py-3 border-t border-white/[0.08] space-y-2">
        <a
          href="https://www.maxpiccinini.com/destination-reussite/"
          target="_blank"
          rel="noopener noreferrer"
          className="block text-center rounded-lg bg-[#0046FF] hover:bg-[#0033CC] text-white text-xs font-bold py-2.5 transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,70,255,0.5)]"
        >
          Destination Réussite →
        </a>
        <button
          onClick={onTogglePreview}
          className={`w-full text-center rounded-lg text-[11px] font-semibold py-2 border transition-colors ${
            preview ? "bg-white/10 border-white/20 text-white" : "border-white/15 text-white/45 hover:text-white/80"
          }`}
          title="Mode démo : débloque toutes les capsules (avant le drip réel)"
        >
          {mounted && preview ? "Mode démo : ON" : "Mode démo : OFF"}
        </button>
      </div>
    </div>
  );
}
